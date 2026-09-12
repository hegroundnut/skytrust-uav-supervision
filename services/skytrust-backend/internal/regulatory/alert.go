package regulatory

import (
	"context"

	"gorm.io/gorm"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/statemachine"
	"skytrust-backend/internal/timex"
)

type AlertRaiseRequest struct {
	AlertID         string `json:"alert_id"` // 可选显式 ID（P4-10；演示用 ALERT-2026-001）
	MissionID       string `json:"mission_id"`
	UAVPseudonym    string `json:"uav_pseudonym" binding:"required"`
	EventType       string `json:"event_type" binding:"required"`
	RiskLevel       string `json:"risk_level" binding:"required"`
	EvidenceHash    string `json:"evidence_hash"`
	SourceSystem    string `json:"source_system" binding:"required"`
	Operator        string `json:"operator" binding:"required"`
	WormholeEventID string `json:"wormhole_event_id"` // 仅 WORMHOLE_ALERT：关联系统二事件，证据哈希取其规范化 SM3
}

// RaiseAlert 告警登记：枚举校验（P4-1）→ ID 生成/去重（P4-10）→ 证据哈希派生 → OPEN 落库 → 审计。
func (s *Service) RaiseAlert(ctx context.Context, traceID string, req *AlertRaiseRequest) (*model.SecurityEvent, error) {
	if req.UAVPseudonym == "" || req.Operator == "" {
		return nil, errcode.NewError(errcode.Param, "uav_pseudonym/operator 必填")
	}
	if !alertEventTypes[req.EventType] {
		return nil, errcode.NewError(errcode.Param, "event_type %q 非法（6 类封闭枚举）", req.EventType)
	}
	if !riskLevels[req.RiskLevel] {
		return nil, errcode.NewError(errcode.Param, "risk_level %q 非法（LOW|MEDIUM|HIGH）", req.RiskLevel)
	}
	if !sourceSystems[req.SourceSystem] {
		return nil, errcode.NewError(errcode.Param, "source_system %q 非法（SYSTEM1|SYSTEM2|SYSTEM3|MANUAL）", req.SourceSystem)
	}
	alertID := req.AlertID
	if alertID == "" {
		alertID = model.GenAlertID()
	} else {
		if !model.ValidateID("ALERT", alertID) {
			return nil, errcode.NewError(errcode.Param, "alert_id %q 格式非法（ALERT-<非空无空格>）", alertID)
		}
		var dup int64
		if err := s.db.WithContext(ctx).Model(&model.SecurityEvent{}).Where("alert_id = ?", alertID).Count(&dup).Error; err != nil {
			return nil, errcode.NewError(errcode.Internal, "alert_id 查重: %v", err)
		}
		if dup > 0 {
			return nil, errcode.NewError(errcode.Param, "alert_id %q 已存在", alertID)
		}
	}
	evidence := req.EvidenceHash
	if req.WormholeEventID != "" {
		if req.EventType != AlertWormhole {
			return nil, errcode.NewError(errcode.Param, "wormhole_event_id 仅可用于 WORMHOLE_ALERT")
		}
		var wh model.WormholeEvent
		if err := s.db.WithContext(ctx).Where("event_id = ?", req.WormholeEventID).First(&wh).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errcode.NewError(errcode.Param, "wormhole_event_id %q 不存在", req.WormholeEventID)
			}
			return nil, errcode.NewError(errcode.Internal, "wormhole event lookup: %v", err)
		}
		h, err := s.cs.HashCanonical(map[string]any{
			"event_id": wh.EventID, "session_id": wh.SessionID, "node_x": wh.NodeX, "node_y": wh.NodeY,
			"risk_score": wh.RiskScore, "action": wh.Action, "created_at": timex.FormatTime(wh.CreatedAt.Time),
		})
		if err != nil {
			return nil, errcode.NewError(errcode.Internal, "wormhole evidence hash: %v", err)
		}
		evidence = h
	} else if evidence == "" {
		h, err := s.cs.HashCanonical(map[string]any{
			"alert_id": alertID, "event_type": req.EventType, "mission_id": req.MissionID,
			"risk_level": req.RiskLevel, "source_system": req.SourceSystem, "uav_pseudonym": req.UAVPseudonym,
		})
		if err != nil {
			return nil, errcode.NewError(errcode.Internal, "evidence hash: %v", err)
		}
		evidence = h
	}
	ev := &model.SecurityEvent{
		AlertID: alertID, MissionID: req.MissionID, UAVPseudonym: req.UAVPseudonym,
		EventType: req.EventType, RiskLevel: req.RiskLevel, EvidenceHash: evidence,
		SourceSystem: req.SourceSystem, Status: "OPEN",
	}
	if err := s.db.WithContext(ctx).Create(ev).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "create security_event: %v", err)
	}
	s.logAudit(traceID, req.Operator, "ALERT_RAISE", "ALERT", ev.AlertID, map[string]any{
		"event_type": ev.EventType, "risk_level": ev.RiskLevel, "source_system": ev.SourceSystem,
		"uav_pseudonym": ev.UAVPseudonym, "mission_id": ev.MissionID, "evidence_hash": ev.EvidenceHash,
		"wormhole_event_id": req.WormholeEventID,
	})
	return ev, nil
}

type AlertQuery struct {
	EventType    string `json:"event_type"`
	Status       string `json:"status"`
	RiskLevel    string `json:"risk_level"`
	SourceSystem string `json:"source_system"`
	MissionID    string `json:"mission_id"`
	Page         int    `json:"page"`
	PageSize     int    `json:"page_size"`
}

// Normalize 双重归一化之 service 侧（Constraint 10，与 NodeQuery 同构）。
func (q *AlertQuery) Normalize() {
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

func (s *Service) AlertList(ctx context.Context, traceID string, q AlertQuery) ([]model.SecurityEvent, int64, error) {
	q.Normalize()
	db := s.db.WithContext(ctx).Model(&model.SecurityEvent{})
	if q.EventType != "" {
		db = db.Where("event_type = ?", q.EventType)
	}
	if q.Status != "" {
		db = db.Where("status = ?", q.Status)
	}
	if q.RiskLevel != "" {
		db = db.Where("risk_level = ?", q.RiskLevel)
	}
	if q.SourceSystem != "" {
		db = db.Where("source_system = ?", q.SourceSystem)
	}
	if q.MissionID != "" {
		db = db.Where("mission_id = ?", q.MissionID)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "count security_event: %v", err)
	}
	var recs []model.SecurityEvent
	if err := db.Order("created_at DESC, alert_id DESC").
		Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&recs).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "list security_event: %v", err)
	}
	return recs, total, nil
}

type AlertStatusRequest struct {
	AlertID  string `json:"alert_id" binding:"required"`
	ToStatus string `json:"to_status" binding:"required"`
	Operator string `json:"operator" binding:"required"`
	Reason   string `json:"reason"`
}

// AlertStatus 告警状态迁移：AlertMachine 线性强制（P4-1，非法迁移 6002）+ 审计。
func (s *Service) AlertStatus(ctx context.Context, traceID string, req *AlertStatusRequest) (*model.SecurityEvent, error) {
	if req.Operator == "" {
		return nil, errcode.NewError(errcode.Param, "operator 必填")
	}
	var ev model.SecurityEvent
	if err := s.db.WithContext(ctx).Where("alert_id = ?", req.AlertID).First(&ev).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errcode.NewError(errcode.Param, "告警 %s 不存在", req.AlertID)
		}
		return nil, errcode.NewError(errcode.Internal, "load security_event: %v", err)
	}
	if err := statemachine.AlertMachine.Assert(ev.Status, req.ToStatus); err != nil {
		return nil, errcode.NewError(errcode.Param, "%v", err)
	}
	from := ev.Status
	if err := s.db.WithContext(ctx).Model(&ev).Update("status", req.ToStatus).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "update security_event: %v", err)
	}
	ev.Status = req.ToStatus
	s.logAudit(traceID, req.Operator, "ALERT_STATUS", "ALERT", ev.AlertID, map[string]any{
		"from": from, "to": req.ToStatus, "reason": req.Reason,
	})
	return &ev, nil
}
