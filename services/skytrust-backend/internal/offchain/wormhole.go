package offchain

import (
	"context"
	"encoding/json"

	"gorm.io/gorm"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

type WormholeToggleRequest struct {
	Enabled  *bool  `json:"enabled" binding:"required"` // *bool：required 对 false 不生效是 gin 陷阱
	Operator string `json:"operator"`
}

type WormholeToggleResult struct {
	WormholeEnabled bool     `json:"wormhole_enabled"`
	NodesAffected   []string `json:"nodes_affected"`
}

func (s *Service) setNodeNeighbors(ctx context.Context, nodeID string, nbrs []string) error {
	if nbrs == nil {
		nbrs = []string{}
	}
	b, err := json.Marshal(nbrs)
	if err != nil {
		return errcode.NewError(errcode.Internal, "neighbors json: %v", err)
	}
	return s.db.WithContext(ctx).Model(&model.NetworkNode{}).
		Where("node_id = ?", nodeID).Update("neighbors", string(b)).Error
}

func (s *Service) addNeighborRef(ctx context.Context, nodeID, nbr string) error {
	var n model.NetworkNode
	if err := s.db.WithContext(ctx).Where("node_id = ?", nodeID).First(&n).Error; err != nil {
		return errcode.NewError(errcode.Param, "wormhole anchor %s missing", nodeID)
	}
	list, err := ParseNeighbors(n.Neighbors)
	if err != nil {
		return errcode.NewError(errcode.Param, "anchor %s neighbors corrupt: %v", nodeID, err)
	}
	for _, v := range list {
		if v == nbr {
			return nil // 幂等
		}
	}
	return s.setNodeNeighbors(ctx, nodeID, append(list, nbr))
}

// purgeNeighborRefs 清理全部节点邻接表中对 ids 的引用（尽力而为，坏行跳过）。
func (s *Service) purgeNeighborRefs(ctx context.Context, ids ...string) error {
	drop := map[string]bool{}
	for _, id := range ids {
		drop[id] = true
	}
	var nodes []model.NetworkNode
	if err := s.db.WithContext(ctx).Find(&nodes).Error; err != nil {
		return errcode.NewError(errcode.Internal, "load nodes: %v", err)
	}
	for _, n := range nodes {
		list, err := ParseNeighbors(n.Neighbors)
		if err != nil {
			continue
		}
		kept := []string{}
		changed := false
		for _, v := range list {
			if drop[v] {
				changed = true
				continue
			}
			kept = append(kept, v)
		}
		if changed {
			if err := s.setNodeNeighbors(ctx, n.NodeID, kept); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Service) WormholeToggle(ctx context.Context, traceID string, req *WormholeToggleRequest) (*WormholeToggleResult, error) {
	operator := req.Operator
	if operator == "" {
		operator = "PLATFORM"
	}
	x, y, err := s.loadWormholePair(ctx)
	if err != nil {
		return nil, err
	}
	affected := []string{}
	if *req.Enabled {
		if x.Status == "ISOLATED" || y.Status == "ISOLATED" {
			return nil, errcode.NewError(errcode.WormholeRisk,
				"node %s/%s is ISOLATED and cannot be re-enabled by toggle (use path/switch recovery)", x.NodeID, y.NodeID)
		}
		if x.Status != "ONLINE" || y.Status != "ONLINE" {
			// 开启攻击：上线 + 写入隐藏隧道与虚假邻接（P3-4）
			if err := s.setWormholeNode(ctx, x, `["N1","NODE-Y"]`); err != nil {
				return nil, err
			}
			if err := s.setWormholeNode(ctx, y, `["NODE-X","N4"]`); err != nil {
				return nil, err
			}
			if err := s.addNeighborRef(ctx, "N1", NodeXID); err != nil {
				return nil, err
			}
			if err := s.addNeighborRef(ctx, "N4", NodeYID); err != nil {
				return nil, err
			}
			affected = []string{NodeXID, NodeYID, "N1", "N4"}
			s.logAudit(traceID, operator, "WORMHOLE_ENABLE", "NODE", NodeXID+"+"+NodeYID,
				map[string]any{"fake_adjacency": map[string][]string{NodeXID: {"N1", NodeYID}, NodeYID: {NodeXID, "N4"}}})
		}
	} else {
		for _, n := range []*model.NetworkNode{x, y} {
			if n.Status == "ONLINE" {
				if err := s.db.WithContext(ctx).Model(n).Updates(map[string]any{"status": "OFFLINE", "neighbors": "[]"}).Error; err != nil {
					return nil, errcode.NewError(errcode.Internal, "disable %s: %v", n.NodeID, err)
				}
				n.Status, n.Neighbors = "OFFLINE", "[]"
				affected = append(affected, n.NodeID)
			}
			// ISOLATED 不动：隔离态优先于攻击开关（裁定）
		}
		if len(affected) > 0 {
			if err := s.purgeNeighborRefs(ctx, NodeXID, NodeYID); err != nil {
				return nil, err
			}
			s.logAudit(traceID, operator, "WORMHOLE_DISABLE", "NODE", NodeXID+"+"+NodeYID,
				map[string]any{"nodes_affected": affected})
		}
	}
	var nodes []model.NetworkNode
	if err := s.db.WithContext(ctx).Find(&nodes).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "load nodes: %v", err)
	}
	return &WormholeToggleResult{WormholeEnabled: WormholeEnabled(nodes), NodesAffected: affected}, nil
}

func (s *Service) loadWormholePair(ctx context.Context) (*model.NetworkNode, *model.NetworkNode, error) {
	var x, y model.NetworkNode
	errX := s.db.WithContext(ctx).Where("node_id = ?", NodeXID).First(&x).Error
	errY := s.db.WithContext(ctx).Where("node_id = ?", NodeYID).First(&y).Error
	if errX == gorm.ErrRecordNotFound || errY == gorm.ErrRecordNotFound {
		return nil, nil, errcode.NewError(errcode.Param, "wormhole attacker nodes not seeded (run demo/init)")
	}
	if errX != nil {
		return nil, nil, errcode.NewError(errcode.Internal, "load NODE-X: %v", errX)
	}
	if errY != nil {
		return nil, nil, errcode.NewError(errcode.Internal, "load NODE-Y: %v", errY)
	}
	return &x, &y, nil
}

func (s *Service) setWormholeNode(ctx context.Context, n *model.NetworkNode, neighbors string) error {
	if err := s.db.WithContext(ctx).Model(n).Updates(map[string]any{"status": "ONLINE", "neighbors": neighbors}).Error; err != nil {
		return errcode.NewError(errcode.Internal, "enable %s: %v", n.NodeID, err)
	}
	n.Status, n.Neighbors = "ONLINE", neighbors
	return nil
}
