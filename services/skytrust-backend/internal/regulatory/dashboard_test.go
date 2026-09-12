package regulatory

import (
	"context"
	"testing"

	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

func TestDashboardSummaryCounts(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	ctx := context.Background()
	// 3 告警：OPEN/HIGH/ROUTE_DEVIATION、IDENTIFIED/MEDIUM/WORMHOLE_ALERT、RESOLVED/HIGH/ROUTE_DEVIATION
	alerts := []model.SecurityEvent{
		{AlertID: "ALERT-T7-001", MissionID: "M1", EventType: AlertRouteDeviation, RiskLevel: "HIGH", SourceSystem: "SYSTEM3", Status: "OPEN"},
		{AlertID: "ALERT-T7-002", MissionID: "M2", EventType: AlertWormhole, RiskLevel: "MEDIUM", SourceSystem: "SYSTEM2", Status: "IDENTIFIED"},
		{AlertID: "ALERT-T7-003", MissionID: "M3", EventType: AlertRouteDeviation, RiskLevel: "HIGH", SourceSystem: "SYSTEM1", Status: "RESOLVED"},
	}
	for i := range alerts {
		if err := svc.db.Create(&alerts[i]).Error; err != nil {
			t.Fatal(err)
		}
	}
	// 2 授权：PENDING；AUTHORIZED 但 valid_to 已过 → 惰性计入 expired（行不改写，P4-9）
	now := timex.Now()
	pend := &model.RegulatoryAuth{AuthorizationID: "AUTH-T7-001", RegulatorID: "REG-01", Scope: `["MISSION"]`,
		TargetType: "MISSION", TargetID: "M1", Reason: "r", ValidFrom: timex.New(now), ValidTo: timex.New(now), Status: "PENDING"}
	lapsed := &model.RegulatoryAuth{AuthorizationID: "AUTH-T7-002", RegulatorID: "REG-01", Scope: `["ROUTE"]`,
		TargetType: "MISSION", TargetID: "M2", Reason: "r",
		ValidFrom: timex.New(now.Add(-7200e9)), ValidTo: timex.New(now.Add(-3600e9)), Status: "AUTHORIZED"}
	if err := svc.db.Create(pend).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.db.Create(lapsed).Error; err != nil {
		t.Fatal(err)
	}
	// 2 会话 + 2 虫洞事件
	sessions := []model.OffchainSession{
		{SessionID: "SESS-T7-001", MissionID: "M1", UAVID: "UAV-A-001", Status: "ACTIVE", CurrentPath: `["N1","N2"]`},
		{SessionID: "SESS-T7-002", MissionID: "M2", UAVID: "UAV-A-002", Status: "DEGRADED", CurrentPath: `["N1","N3"]`},
	}
	for i := range sessions {
		if err := svc.db.Create(&sessions[i]).Error; err != nil {
			t.Fatal(err)
		}
	}
	events := []model.WormholeEvent{
		{EventID: "WH-T7-001", SessionID: "SESS-T7-002", NodeX: "N1", NodeY: "N3", RiskScore: 0.8, Action: "DETECT"},
		{EventID: "WH-T7-002", SessionID: "SESS-T7-002", NodeX: "N1", NodeY: "N3", RiskScore: 0.8, Action: "ISOLATE"},
	}
	for i := range events {
		if err := svc.db.Create(&events[i]).Error; err != nil {
			t.Fatal(err)
		}
	}

	sum, err := svc.DashboardSummary(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if sum.Alerts.Total != 3 || sum.Alerts.Open != 1 || sum.Alerts.Identified != 1 || sum.Alerts.Resolved != 1 ||
		sum.Alerts.Traced != 0 || sum.Alerts.Reviewed != 0 || sum.Alerts.Archived != 0 {
		t.Fatalf("alert status counts: %+v", sum.Alerts)
	}
	if sum.Alerts.HighOpen != 1 { // HIGH ∧ 未结案（OPEN/IDENTIFIED/TRACED）
		t.Fatalf("high_open = %d, want 1", sum.Alerts.HighOpen)
	}
	if sum.Alerts.ByType[AlertRouteDeviation] != 2 || sum.Alerts.ByType[AlertWormhole] != 1 || len(sum.Alerts.ByType) != 2 {
		t.Fatalf("by_type: %v", sum.Alerts.ByType)
	}
	if sum.Authorizations.Total != 2 || sum.Authorizations.Pending != 1 || sum.Authorizations.Authorized != 1 ||
		sum.Authorizations.Denied != 0 || sum.Authorizations.Expired != 1 {
		t.Fatalf("auth counts: %+v", sum.Authorizations)
	}
	// 惰性过期只读：AUTHORIZED 行不得被 dashboard 改写
	var reloaded model.RegulatoryAuth
	svc.db.Where("authorization_id = ?", lapsed.AuthorizationID).First(&reloaded)
	if reloaded.Status != "AUTHORIZED" {
		t.Fatalf("dashboard must not mutate rows (P4-9): %s", reloaded.Status)
	}
	if sum.Sessions.Total != 2 || sum.Sessions.Active != 1 || sum.Sessions.Degraded != 1 ||
		sum.Sessions.Init != 0 || sum.Sessions.Closed != 0 {
		t.Fatalf("session counts: %+v", sum.Sessions)
	}
	if sum.WormholeEvents.Total != 2 || sum.WormholeEvents.Detect != 1 || sum.WormholeEvents.Isolate != 1 || sum.WormholeEvents.Recover != 0 {
		t.Fatalf("wormhole counts: %+v", sum.WormholeEvents)
	}
	if len(sum.RecentAlerts) != 3 || sum.RecentAlerts[0].CreatedAt.Before(sum.RecentAlerts[2].CreatedAt.Time) {
		t.Fatalf("recent alerts: %d rows, want desc order", len(sum.RecentAlerts))
	}
	if sum.GeneratedAt == "" {
		t.Fatal("generated_at empty")
	}
}

func TestDashboardSummaryEmpty(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	sum, err := svc.DashboardSummary(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if sum.Alerts.Total != 0 || sum.Authorizations.Total != 0 || sum.Sessions.Total != 0 ||
		sum.WormholeEvents.Total != 0 || len(sum.Alerts.ByType) != 0 || len(sum.RecentAlerts) != 0 {
		t.Fatalf("empty db: %+v", sum)
	}
}
