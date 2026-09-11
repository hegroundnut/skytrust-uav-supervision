package offchain

import (
	"context"
	"encoding/json"
	"math"

	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

const (
	AdjacencyDistThreshold       = 30.0 // 相邻跳真实距离上限（unit）
	LatencyFloorFactor           = 1.0  // P3-6 修正案：实测低于地理下限即物理矛盾
	PathShrinkFactor             = 0.5  // 路径时延骤降因子
	RiskThreshold                = 0.7  // 检测阈值
	ChallengeSyncWindowMs  int64 = 5    // 挑战响应同步窗口
)

type RiskDimensions struct {
	Identity  float64 `json:"identity"`
	Adjacency float64 `json:"adjacency"`
	Latency   float64 `json:"latency"`
	Challenge float64 `json:"challenge"`
	Path      float64 `json:"path"`
}

type RiskEvaluateRequest struct {
	SessionID string `json:"session_id" binding:"required"`
	NodeX     string `json:"node_x"`
	NodeY     string `json:"node_y"`
}

type RiskEvaluateResult struct {
	RiskScore     float64               `json:"risk_score"`
	Threshold     float64               `json:"threshold"`
	Verdict       string                `json:"verdict"` // PASS|DETECT|BLOCK
	Dimensions    RiskDimensions        `json:"dimensions"`
	Events        []model.WormholeEvent `json:"events"`
	SessionStatus string                `json:"session_status"`
}

func (s *Service) RiskEvaluate(ctx context.Context, traceID string, req *RiskEvaluateRequest) (*RiskEvaluateResult, error) {
	xID, yID := req.NodeX, req.NodeY
	if xID == "" {
		xID = NodeXID
	}
	if yID == "" {
		yID = NodeYID
	}
	sess, err := s.loadSession(ctx, req.SessionID)
	if err != nil {
		return nil, err // 6002
	}
	xNode, err := s.loadNode(ctx, xID)
	if err != nil {
		return nil, err // 4003
	}
	yNode, err := s.loadNode(ctx, yID)
	if err != nil {
		return nil, err // 4003
	}
	var path []string
	if err := json.Unmarshal([]byte(sess.CurrentPath), &path); err != nil || len(path) < 2 {
		return nil, errcode.NewError(errcode.Param, "session %s path corrupt: %q", sess.SessionID, sess.CurrentPath)
	}
	var nodes []model.NetworkNode
	if err := s.db.WithContext(ctx).Find(&nodes).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "load nodes: %v", err)
	}
	byID := map[string]model.NetworkNode{}
	for _, n := range nodes {
		byID[n.NodeID] = n
	}
	posOf := func(id string) (Position, bool) {
		n, ok := byID[id]
		if !ok {
			return Position{}, false
		}
		p, err := ParsePosition(n.Position)
		return p, err == nil
	}

	dims := RiskDimensions{}
	veto := false
	// ① identity 一票否决：注册身份必须等于派生身份
	for _, id := range path {
		n, ok := byID[id]
		if !ok {
			continue
		}
		if n.SM9Identity == "" || n.SM9Identity != crypto.SM9IdentityOf(id) {
			veto = true
			dims.Identity = 1.0
			break
		}
	}
	// ② adjacency：任一相邻对真实距离 > 阈值
	for i := 0; i+1 < len(path); i++ {
		a, okA := posOf(path[i])
		b, okB := posOf(path[i+1])
		if okA && okB && Dist(a, b) > AdjacencyDistThreshold {
			dims.Adjacency = 0.35
			break
		}
	}
	// ③ latency：observed（最新 SUCCESS 消息，缺则仿真）< 地理下限
	var observed int64
	var latest model.OffchainMessage
	err = s.db.WithContext(ctx).Where("session_id = ? AND status = ?", sess.SessionID, "SUCCESS").
		Order("seq DESC").First(&latest).Error
	hasMsg := err == nil
	if hasMsg {
		observed = latest.LatencyMs
	} else {
		adj, berr := BuildGraph(nodes, WormholeEnabled(nodes))
		if berr == nil {
			if _, total, perr := PathLatency(adj, path, 1); perr == nil {
				observed = total
			} // 路径边已不在图中（隔离后复评）→ observed 保持 0，必然触发
		}
	}
	geoFloor := 0.0
	if ps, ok1 := posOf(path[0]); ok1 {
		if pe, ok2 := posOf(path[len(path)-1]); ok2 {
			geoFloor = GeoFloorMs(ps, pe)
		}
	}
	if geoFloor > 0 && float64(observed) < geoFloor*LatencyFloorFactor {
		dims.Latency = 0.25
	}
	// ④ challenge：X/Y 均在路径中、真实距离超阈值、仿真响应差恒 0
	inPath := map[string]bool{}
	for _, id := range path {
		inPath[id] = true
	}
	if inPath[xID] && inPath[yID] {
		px, okX := posOf(xID)
		py, okY := posOf(yID)
		if okX && okY && Dist(px, py) > AdjacencyDistThreshold &&
			SimulatedChallengeDeltaMs() < ChallengeSyncWindowMs {
			dims.Challenge = 0.25
		}
	}
	// ⑤ path 历史：baseline（除最新外均值）vs current（最新）
	var baseline float64
	var current int64
	hasHistory := false
	var msgs []model.OffchainMessage
	if err := s.db.WithContext(ctx).Where("session_id = ? AND status = ?", sess.SessionID, "SUCCESS").
		Order("seq ASC").Find(&msgs).Error; err == nil && len(msgs) >= 2 {
		hasHistory = true
		var sum int64
		for _, m := range msgs[:len(msgs)-1] {
			sum += m.LatencyMs
		}
		baseline = float64(sum) / float64(len(msgs)-1)
		current = msgs[len(msgs)-1].LatencyMs
		if baseline > 0 && float64(current) < baseline*PathShrinkFactor {
			dims.Path = 0.15
		}
	}

	score := dims.Identity + dims.Adjacency + dims.Latency + dims.Challenge + dims.Path
	if veto {
		score = 1.0
	}
	score = math.Round(score*100) / 100
	verdict := "PASS"
	if veto {
		verdict = "BLOCK"
	} else if score >= RiskThreshold {
		verdict = "DETECT"
	}

	events := []model.WormholeEvent{}
	if verdict != "PASS" {
		dimsJSON, _ := json.Marshal(map[string]any{
			"dimensions": dims, "veto": veto, "verdict": verdict,
			"observed_latency_ms": observed, "geo_floor_ms": math.Round(geoFloor*1000) / 1000,
			"baseline_ms": baseline, "current_ms": current, "has_history": hasHistory,
		})
		detect := model.WormholeEvent{
			EventID: model.GenEventID(), SessionID: sess.SessionID, NodeX: xID, NodeY: yID,
			RiskScore: score, DetectionDimensions: string(dimsJSON), Action: "DETECT",
			OriginalPath: sess.CurrentPath,
		}
		if err := s.db.WithContext(ctx).Create(&detect).Error; err != nil {
			return nil, errcode.NewError(errcode.Internal, "save detect event: %v", err)
		}
		events = append(events, detect)
		s.logAudit(traceID, "RISK-ENGINE", "RISK_EVALUATE", "SESSION", sess.SessionID, map[string]any{
			"verdict": verdict, "risk_score": score, "dimensions": dims,
		})
		// 隔离（P3-7）：仅 ONLINE → ISOLATED；已 ISOLATED 刷新分数；OFFLINE 不动
		isolatedNow := []string{}
		for _, n := range []*model.NetworkNode{xNode, yNode} {
			switch n.Status {
			case "ONLINE":
				if err := s.db.WithContext(ctx).Model(n).Updates(map[string]any{
					"status": "ISOLATED", "neighbors": "[]", "risk_score": score,
				}).Error; err != nil {
					return nil, errcode.NewError(errcode.Internal, "isolate %s: %v", n.NodeID, err)
				}
				n.Status, n.Neighbors, n.RiskScore = "ISOLATED", "[]", score
				isolatedNow = append(isolatedNow, n.NodeID)
			case "ISOLATED":
				if err := s.db.WithContext(ctx).Model(n).Update("risk_score", score).Error; err != nil {
					return nil, errcode.NewError(errcode.Internal, "refresh risk %s: %v", n.NodeID, err)
				}
				n.RiskScore = score
			}
		}
		if len(isolatedNow) > 0 {
			if err := s.purgeNeighborRefs(ctx, xID, yID); err != nil {
				return nil, err
			}
			isolate := model.WormholeEvent{
				EventID: model.GenEventID(), SessionID: sess.SessionID, NodeX: xID, NodeY: yID,
				RiskScore: score, DetectionDimensions: string(dimsJSON), Action: "ISOLATE",
				OriginalPath: sess.CurrentPath,
			}
			if err := s.db.WithContext(ctx).Create(&isolate).Error; err != nil {
				return nil, errcode.NewError(errcode.Internal, "save isolate event: %v", err)
			}
			events = append(events, isolate)
			s.logAudit(traceID, "RISK-ENGINE", "WORMHOLE_ISOLATE", "NODE", xID+"+"+yID, map[string]any{
				"isolated": isolatedNow, "risk_score": score,
			})
		}
		// 会话降级：仅 ACTIVE 可迁移；DEGRADED 跳过（事件已落）；其余状态机器禁止，跳过
		if sess.Status == "ACTIVE" {
			if err := s.transition(ctx, traceID, sess, "DEGRADED", "RISK-ENGINE", "wormhole risk "+verdict); err != nil {
				return nil, err
			}
		}
	}

	return &RiskEvaluateResult{
		RiskScore: score, Threshold: RiskThreshold, Verdict: verdict, Dimensions: dims,
		Events: events, SessionStatus: sess.Status,
	}, nil
}
