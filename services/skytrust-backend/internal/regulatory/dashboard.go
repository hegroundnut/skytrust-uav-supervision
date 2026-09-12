package regulatory

import (
	"context"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

type AlertStats struct {
	Total      int64            `json:"total"`
	Open       int64            `json:"open"`
	Identified int64            `json:"identified"`
	Traced     int64            `json:"traced"`
	Reviewed   int64            `json:"reviewed"`
	Resolved   int64            `json:"resolved"`
	Archived   int64            `json:"archived"`
	HighOpen   int64            `json:"high_open"` // HIGH ∧ 未结案（OPEN/IDENTIFIED/TRACED）
	ByType     map[string]int64 `json:"by_type"`
}

type AuthStats struct {
	Total      int64 `json:"total"`
	Pending    int64 `json:"pending"`
	Authorized int64 `json:"authorized"`
	Denied     int64 `json:"denied"`
	Expired    int64 `json:"expired"` // EXPIRED ∪ (AUTHORIZED ∧ valid_to<now)，惰性只读（P4-9）
}

type SessionStats struct {
	Total         int64 `json:"total"`
	Init          int64 `json:"init"`
	Authenticated int64 `json:"authenticated"`
	Active        int64 `json:"active"`
	Degraded      int64 `json:"degraded"`
	Recovered     int64 `json:"recovered"`
	Closed        int64 `json:"closed"`
}

type WormholeStats struct {
	Total   int64 `json:"total"`
	Detect  int64 `json:"detect"`
	Isolate int64 `json:"isolate"`
	Recover int64 `json:"recover"`
}

type DashboardSummary struct {
	Alerts         AlertStats            `json:"alerts"`
	Authorizations AuthStats             `json:"authorizations"`
	Sessions       SessionStats          `json:"sessions"`
	WormholeEvents WormholeStats         `json:"wormhole_events"`
	RecentAlerts   []model.SecurityEvent `json:"recent_alerts"` // 最新 5 条
	GeneratedAt    string                `json:"generated_at"`
}

// DashboardSummary 监管驾驶舱聚合（P4-9：纯模型只读统计，不改写任何行）。
func (s *Service) DashboardSummary(ctx context.Context) (*DashboardSummary, error) {
	sum := &DashboardSummary{
		GeneratedAt:  timex.FormatTime(timex.Now()),
		Alerts:       AlertStats{ByType: map[string]int64{}},
		RecentAlerts: []model.SecurityEvent{},
	}
	var acc error
	set := func(dst *int64, m any, where string, args ...any) {
		if acc != nil {
			return
		}
		var n int64
		db := s.db.WithContext(ctx).Model(m)
		if where != "" {
			db = db.Where(where, args...)
		}
		if err := db.Count(&n).Error; err != nil {
			acc = err
			return
		}
		*dst = n
	}
	ev := &model.SecurityEvent{}
	set(&sum.Alerts.Total, ev, "")
	set(&sum.Alerts.Open, ev, "status = ?", "OPEN")
	set(&sum.Alerts.Identified, ev, "status = ?", "IDENTIFIED")
	set(&sum.Alerts.Traced, ev, "status = ?", "TRACED")
	set(&sum.Alerts.Reviewed, ev, "status = ?", "REVIEWED")
	set(&sum.Alerts.Resolved, ev, "status = ?", "RESOLVED")
	set(&sum.Alerts.Archived, ev, "status = ?", "ARCHIVED")
	set(&sum.Alerts.HighOpen, ev, "risk_level = ? AND status IN ?", "HIGH",
		[]string{"OPEN", "IDENTIFIED", "TRACED"})
	au := &model.RegulatoryAuth{}
	set(&sum.Authorizations.Total, au, "")
	set(&sum.Authorizations.Pending, au, "status = ?", "PENDING")
	set(&sum.Authorizations.Authorized, au, "status = ?", "AUTHORIZED")
	set(&sum.Authorizations.Denied, au, "status = ?", "DENIED")
	set(&sum.Authorizations.Expired, au, "status = ? OR (status = ? AND valid_to < ?)",
		"EXPIRED", "AUTHORIZED", timex.Now())
	se := &model.OffchainSession{}
	set(&sum.Sessions.Total, se, "")
	set(&sum.Sessions.Init, se, "status = ?", "INIT")
	set(&sum.Sessions.Authenticated, se, "status = ?", "AUTHENTICATED")
	set(&sum.Sessions.Active, se, "status = ?", "ACTIVE")
	set(&sum.Sessions.Degraded, se, "status = ?", "DEGRADED")
	set(&sum.Sessions.Recovered, se, "status = ?", "RECOVERED")
	set(&sum.Sessions.Closed, se, "status = ?", "CLOSED")
	wh := &model.WormholeEvent{}
	set(&sum.WormholeEvents.Total, wh, "")
	set(&sum.WormholeEvents.Detect, wh, "action = ?", "DETECT")
	set(&sum.WormholeEvents.Isolate, wh, "action = ?", "ISOLATE")
	set(&sum.WormholeEvents.Recover, wh, "action = ?", "RECOVER")
	if acc == nil {
		rows := []struct {
			EventType string
			N         int64
		}{}
		if err := s.db.WithContext(ctx).Model(&model.SecurityEvent{}).
			Select("event_type", "COUNT(*) as n").Group("event_type").Scan(&rows).Error; err != nil {
			acc = err
		}
		for _, r := range rows {
			sum.Alerts.ByType[r.EventType] = r.N
		}
	}
	if acc != nil {
		return nil, errcode.NewError(errcode.Internal, "dashboard count: %v", acc)
	}
	if err := s.db.WithContext(ctx).Order("created_at DESC, alert_id DESC").Limit(5).
		Find(&sum.RecentAlerts).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "recent alerts: %v", err)
	}
	return sum, nil
}
