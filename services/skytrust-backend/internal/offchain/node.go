package offchain

import (
	"context"
	"encoding/json"
	"strings"

	"gorm.io/gorm"

	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

var validNodeTypes = map[string]bool{"UAV": true, "EDGE": true, "MANAGEMENT": true, "ATTACKER": true}

type NodeRegisterRequest struct {
	NodeID      string    `json:"node_id" binding:"required"`
	NodeType    string    `json:"node_type" binding:"required"`
	Position    *Position `json:"position" binding:"required"`
	Neighbors   []string  `json:"neighbors"`
	SM9Identity string    `json:"sm9_identity"`
	Status      string    `json:"status"`
}

func (s *Service) NodeRegister(ctx context.Context, traceID string, req *NodeRegisterRequest) (*model.NetworkNode, error) {
	if !validNodeTypes[req.NodeType] {
		return nil, errcode.NewError(errcode.NodeIdentity, "node_type %s invalid", req.NodeType)
	}
	status := req.Status
	if status == "" {
		status = "ONLINE"
	}
	if status != "ONLINE" && status != "OFFLINE" {
		return nil, errcode.NewError(errcode.Param, "status %s invalid (ONLINE|OFFLINE)", req.Status)
	}
	sm9 := req.SM9Identity
	if sm9 == "" {
		sm9 = crypto.SM9IdentityOf(req.NodeID) // Constraint 6：未提供自动派生
	} else if !strings.HasPrefix(sm9, "SM9-ID-") {
		return nil, errcode.NewError(errcode.NodeIdentity, "sm9_identity %s invalid format", sm9)
	}
	var dup model.NetworkNode
	if err := s.db.WithContext(ctx).Where("node_id = ?", req.NodeID).First(&dup).Error; err == nil {
		return nil, errcode.NewError(errcode.Param, "node %s already registered", req.NodeID)
	}
	nbrs := req.Neighbors
	if nbrs == nil {
		nbrs = []string{}
	}
	nbrsJSON, err := json.Marshal(nbrs)
	if err != nil {
		return nil, errcode.NewError(errcode.Param, "neighbors: %v", err)
	}
	posJSON, err := json.Marshal(req.Position)
	if err != nil {
		return nil, errcode.NewError(errcode.Param, "position: %v", err)
	}
	node := model.NetworkNode{
		NodeID: req.NodeID, NodeType: req.NodeType, SM9Identity: sm9,
		Neighbors: string(nbrsJSON), Position: string(posJSON), Status: status,
	}
	if err := s.db.WithContext(ctx).Create(&node).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "create node: %v", err)
	}
	s.logAudit(traceID, "PLATFORM", "NODE_REGISTER", "NODE", node.NodeID, map[string]any{
		"node_type": node.NodeType, "status": node.Status, "sm9_identity": node.SM9Identity,
	})
	return &node, nil
}

type NodeQuery struct {
	NodeType string `json:"node_type"`
	Status   string `json:"status"`
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
}

// Normalize 双重归一化之 service 侧（Constraint 10）。
func (q *NodeQuery) Normalize() {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 {
		q.PageSize = 20
	}
	if q.PageSize > 200 {
		q.PageSize = 200
	}
}

func (s *Service) NodeList(ctx context.Context, traceID string, q NodeQuery) ([]model.NetworkNode, int64, error) {
	q.Normalize()
	db := s.db.WithContext(ctx).Model(&model.NetworkNode{})
	if q.NodeType != "" {
		db = db.Where("node_type = ?", q.NodeType)
	}
	if q.Status != "" {
		db = db.Where("status = ?", q.Status)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "count nodes: %v", err)
	}
	records := []model.NetworkNode{}
	if err := db.Order("node_id ASC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&records).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "list nodes: %v", err)
	}
	return records, total, nil
}

// loadNode 包内共用（Task 6/7/9）：节点必须存在，否则 4003。
func (s *Service) loadNode(ctx context.Context, id string) (*model.NetworkNode, error) {
	var n model.NetworkNode
	if err := s.db.WithContext(ctx).Where("node_id = ?", id).First(&n).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errcode.NewError(errcode.NodeIdentity, "node %s not found", id)
		}
		return nil, errcode.NewError(errcode.Internal, "load node %s: %v", id, err)
	}
	return &n, nil
}
