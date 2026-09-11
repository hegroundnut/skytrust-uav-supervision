package offchain

import (
	"context"
	"encoding/json"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

type PathSwitchRequest struct {
	SessionID string   `json:"session_id" binding:"required"`
	Operator  string   `json:"operator" binding:"required"`
	NewPath   []string `json:"new_path"`
}

type PathSwitchResult struct {
	Session           model.OffchainSession `json:"session"`
	OriginalPath      []string              `json:"original_path"`
	NewPath           []string              `json:"new_path"`
	RecoveryLatencyMs int64                 `json:"recovery_latency_ms"`
	Event             model.WormholeEvent   `json:"event"`
}

func (s *Service) PathSwitch(ctx context.Context, traceID string, req *PathSwitchRequest) (*PathSwitchResult, error) {
	sess, err := s.loadSession(ctx, req.SessionID)
	if err != nil {
		return nil, err // 6002
	}
	if sess.Status != "DEGRADED" {
		return nil, errcode.NewError(errcode.SessionAuth,
			"session %s status %s: only DEGRADED can switch path", sess.SessionID, sess.Status)
	}
	// P3-15：original_path（受损路径）与 risk_score 继承最近一次 DETECT 事件——该事件在检测时刻
	// 快照了当时的 CurrentPath。DEGRADED 期间发送消息会按实时拓扑重算并覆盖 CurrentPath（天然绕过
	// ISOLATED 的 X/Y），故 CurrentPath 不再是受损路径的可靠来源；以其为准会让 RECOVER 事件丢失受损
	// 路径证据。无 DETECT 事件（如人工降级）时回退当前 CurrentPath。
	originalJSON := sess.CurrentPath
	var riskScore float64
	var lastDetect model.WormholeEvent
	if err := s.db.WithContext(ctx).Where("session_id = ? AND action = ?", sess.SessionID, "DETECT").
		Order("created_at DESC, event_id DESC").First(&lastDetect).Error; err == nil {
		riskScore = lastDetect.RiskScore
		if lastDetect.OriginalPath != "" {
			originalJSON = lastDetect.OriginalPath
		}
	}
	var original []string
	if err := json.Unmarshal([]byte(originalJSON), &original); err != nil || len(original) < 2 {
		return nil, errcode.NewError(errcode.Param, "session %s path corrupt: %q", sess.SessionID, originalJSON)
	}
	var nodes []model.NetworkNode
	if err := s.db.WithContext(ctx).Find(&nodes).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "load nodes: %v", err)
	}
	// 可信拓扑重算：BuildGraph 只收录 ONLINE——ISOLATED 的 X/Y 天然被排除（P3-7）
	adj, err := BuildGraph(nodes, WormholeEnabled(nodes))
	if err != nil {
		return nil, errcode.NewError(errcode.Param, "bad node data: %v", err)
	}
	newPath := req.NewPath
	if len(newPath) == 0 {
		newPath, _, err = Dijkstra(adj, original[0], original[len(original)-1])
		if err != nil {
			return nil, err // 4004 透传
		}
	} else {
		if len(newPath) < 2 || newPath[0] != original[0] || newPath[len(newPath)-1] != original[len(original)-1] {
			return nil, errcode.NewError(errcode.Param,
				"new_path endpoints must be %s and %s", original[0], original[len(original)-1])
		}
		for i := 0; i+1 < len(newPath); i++ {
			a, b := newPath[i], newPath[i+1]
			linked := false
			for _, e := range adj[a] {
				if e.To == b {
					linked = true
					break
				}
			}
			if !linked {
				return nil, errcode.NewError(errcode.Param, "new_path hop %s -> %s not traversable", a, b)
			}
		}
	}
	// 恢复时延 = 新路径仿真实测总时延（模型输出，测试只断言 >0 与关系）
	_, recovery, err := PathLatency(adj, newPath, 1)
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "recovery latency: %v", err)
	}
	newJSON, err := json.Marshal(newPath)
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "path json: %v", err)
	}
	if err := s.db.WithContext(ctx).Model(sess).Update("current_path", string(newJSON)).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "save path: %v", err)
	}
	sess.CurrentPath = string(newJSON)
	if err := s.transition(ctx, traceID, sess, "RECOVERED", req.Operator, "path switched"); err != nil {
		return nil, err // 4002
	}
	event := model.WormholeEvent{
		EventID: model.GenEventID(), SessionID: sess.SessionID, NodeX: NodeXID, NodeY: NodeYID,
		RiskScore: riskScore, Action: "RECOVER",
		OriginalPath: originalJSON, NewPath: string(newJSON), RecoveryLatencyMs: recovery,
	}
	if err := s.db.WithContext(ctx).Create(&event).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "save recover event: %v", err)
	}
	s.logAudit(traceID, req.Operator, "PATH_SWITCH", "SESSION", sess.SessionID, map[string]any{
		"original_path": original, "new_path": newPath, "recovery_latency_ms": recovery,
	})
	return &PathSwitchResult{
		Session: *sess, OriginalPath: original, NewPath: newPath,
		RecoveryLatencyMs: recovery, Event: event,
	}, nil
}
