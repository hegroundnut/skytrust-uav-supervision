package regulatory

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

func baseRaise() *AlertRaiseRequest {
	return &AlertRaiseRequest{
		UAVPseudonym: "PSEUDO-UAV-83921", EventType: AlertRouteDeviation,
		RiskLevel: "HIGH", SourceSystem: "MANUAL", Operator: "REG-01",
	}
}

func TestAlertRaiseValidation(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	ctx := context.Background()
	cases := []struct {
		name string
		mut  func(r *AlertRaiseRequest)
	}{
		{"bad event_type", func(r *AlertRaiseRequest) { r.EventType = "SOMETHING" }},
		{"empty event_type", func(r *AlertRaiseRequest) { r.EventType = "" }},
		{"bad risk_level", func(r *AlertRaiseRequest) { r.RiskLevel = "URGENT" }},
		{"bad source_system", func(r *AlertRaiseRequest) { r.SourceSystem = "SYSTEM9" }},
		{"empty pseudonym", func(r *AlertRaiseRequest) { r.UAVPseudonym = "" }},
		{"empty operator", func(r *AlertRaiseRequest) { r.Operator = "" }},
	}
	for _, c := range cases {
		r := baseRaise()
		c.mut(r)
		_, err := svc.RaiseAlert(ctx, "TRACE-T", r)
		if err == nil || errCodeOf(t, err) != errcode.Param {
			t.Fatalf("%s: want 6002, got %v", c.name, err)
		}
	}
	// 合法 6 类全通过
	for _, et := range []string{AlertRouteDeviation, AlertInvalidPass, AlertUnknownNode, AlertMissionMismatch, AlertWormhole, AlertIdentityAnomaly} {
		r := baseRaise()
		r.EventType = et
		ev, err := svc.RaiseAlert(ctx, "TRACE-T", r)
		if err != nil {
			t.Fatalf("%s: %v", et, err)
		}
		if ev.Status != "OPEN" || !model.ValidateID("ALERT", ev.AlertID) {
			t.Fatalf("%s: ev = %+v", et, ev)
		}
	}
}

func TestAlertRaiseEvidenceHash(t *testing.T) {
	svc, _, _, cs := newTestSvc(t)
	ctx := context.Background()
	// 缺省派生：SM3(canonical{alert_id,event_type,mission_id,risk_level,source_system,uav_pseudonym})
	r := baseRaise()
	r.MissionID = "MISSION-2026-001"
	ev, err := svc.RaiseAlert(ctx, "TRACE-T", r)
	if err != nil {
		t.Fatal(err)
	}
	want, err := cs.HashCanonical(map[string]any{
		"alert_id": ev.AlertID, "event_type": ev.EventType, "mission_id": ev.MissionID,
		"risk_level": ev.RiskLevel, "source_system": ev.SourceSystem, "uav_pseudonym": ev.UAVPseudonym,
	})
	if err != nil {
		t.Fatal(err)
	}
	if ev.EvidenceHash != want || len(want) != 64 {
		t.Fatalf("evidence = %s want %s", ev.EvidenceHash, want)
	}
	// 显式 evidence_hash 原样保留
	r2 := baseRaise()
	r2.EvidenceHash = "abc123"
	ev2, err := svc.RaiseAlert(ctx, "TRACE-T", r2)
	if err != nil || ev2.EvidenceHash != "abc123" {
		t.Fatalf("explicit evidence: %+v err=%v", ev2, err)
	}
	// 审计留痕 ALERT_RAISE
	_, total, err := svc.audit.Query(auditQueryAction("ALERT_RAISE"))
	if err != nil || total != 2 {
		t.Fatalf("audit total = %d err = %v", total, err)
	}
}

func TestAlertRaiseExplicitIDDup(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	ctx := context.Background()
	r := baseRaise()
	r.AlertID = "ALERT-2026-001"
	ev, err := svc.RaiseAlert(ctx, "TRACE-T", r)
	if err != nil || ev.AlertID != "ALERT-2026-001" {
		t.Fatalf("explicit id: %+v err=%v", ev, err)
	}
	_, err = svc.RaiseAlert(ctx, "TRACE-T", baseRaiseWith(func(r *AlertRaiseRequest) { r.AlertID = "ALERT-2026-001" }))
	if err == nil || errCodeOf(t, err) != errcode.Param || !strings.Contains(err.Error(), "已存在") {
		t.Fatalf("dup: %v", err)
	}
	_, err = svc.RaiseAlert(ctx, "TRACE-T", baseRaiseWith(func(r *AlertRaiseRequest) { r.AlertID = "XX-1" }))
	if err == nil || errCodeOf(t, err) != errcode.Param {
		t.Fatalf("bad format: %v", err)
	}
}

func TestAlertRaiseWormholeLink(t *testing.T) {
	svc, _, db, cs := newTestSvc(t)
	ctx := context.Background()
	wh := model.WormholeEvent{
		EventID: "WH-TEST-0001", SessionID: "SESS-T", NodeX: "NODE-X", NodeY: "NODE-Y",
		RiskScore: 0.9, Action: "DETECT", OriginalPath: `["N1","NODE-X"]`, NewPath: "",
	}
	if err := db.Create(&wh).Error; err != nil {
		t.Fatal(err)
	}
	// 从库回读（created_at 经落库精度截断后才是服务端计算的权威值）
	var stored model.WormholeEvent
	if err := db.Where("event_id = ?", "WH-TEST-0001").First(&stored).Error; err != nil {
		t.Fatal(err)
	}
	want, err := cs.HashCanonical(map[string]any{
		"event_id": stored.EventID, "session_id": stored.SessionID, "node_x": stored.NodeX, "node_y": stored.NodeY,
		"risk_score": stored.RiskScore, "action": stored.Action, "created_at": timex.FormatTime(stored.CreatedAt.Time),
	})
	if err != nil {
		t.Fatal(err)
	}
	r := baseRaise()
	r.EventType = AlertWormhole
	r.SourceSystem = "SYSTEM2"
	r.WormholeEventID = "WH-TEST-0001"
	ev, err := svc.RaiseAlert(ctx, "TRACE-T", r)
	if err != nil || ev.EvidenceHash != want {
		t.Fatalf("wormhole link: %+v err=%v want=%s", ev, err, want)
	}
	// 事件不存在 → 6002
	r2 := baseRaise()
	r2.EventType = AlertWormhole
	r2.WormholeEventID = "WH-NOPE"
	if _, err := svc.RaiseAlert(ctx, "TRACE-T", r2); err == nil || errCodeOf(t, err) != errcode.Param {
		t.Fatalf("unknown wormhole event: %v", err)
	}
	// 非 WORMHOLE_ALERT 携带 wormhole_event_id → 6002
	r3 := baseRaise()
	r3.WormholeEventID = "WH-TEST-0001"
	if _, err := svc.RaiseAlert(ctx, "TRACE-T", r3); err == nil || errCodeOf(t, err) != errcode.Param {
		t.Fatalf("mismatched link: %v", err)
	}
}

func TestAlertListFilterPaging(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	ctx := context.Background()
	for i, et := range []string{AlertRouteDeviation, AlertInvalidPass, AlertRouteDeviation} {
		r := baseRaise()
		r.EventType = et
		r.AlertID = fmt.Sprintf("ALERT-T2-%03d", i+1) // 001,002,003
		r.RiskLevel = []string{"HIGH", "LOW", "MEDIUM"}[i]
		if _, err := svc.RaiseAlert(ctx, "TRACE-T", r); err != nil {
			t.Fatal(err)
		}
	}
	recs, total, err := svc.AlertList(ctx, "TRACE-T", AlertQuery{})
	if err != nil || total != 3 || len(recs) != 3 {
		t.Fatalf("all: total=%d err=%v", total, err)
	}
	// 顺序断言不依赖时钟分辨率：逐对校验 created_at DESC, alert_id DESC 比较器
	for i := 1; i < len(recs); i++ {
		prev, cur := recs[i-1], recs[i]
		if prev.CreatedAt.Before(cur.CreatedAt.Time) ||
			(prev.CreatedAt.Equal(cur.CreatedAt.Time) && prev.AlertID < cur.AlertID) {
			t.Fatalf("order violation at %d: %s(%s) before %s(%s)",
				i, prev.AlertID, timex.FormatTime(prev.CreatedAt.Time), cur.AlertID, timex.FormatTime(cur.CreatedAt.Time))
		}
	}
	_, total, _ = svc.AlertList(ctx, "TRACE-T", AlertQuery{EventType: AlertRouteDeviation})
	if total != 2 {
		t.Fatalf("event_type filter: %d", total)
	}
	_, total, _ = svc.AlertList(ctx, "TRACE-T", AlertQuery{RiskLevel: "LOW"})
	if total != 1 {
		t.Fatalf("risk filter: %d", total)
	}
	recs, total, _ = svc.AlertList(ctx, "TRACE-T", AlertQuery{Page: 2, PageSize: 2})
	if total != 3 || len(recs) != 1 {
		t.Fatalf("paging: total=%d len=%d", total, len(recs))
	}
	q := AlertQuery{PageSize: 9999}
	q.Normalize()
	if q.Page != 1 || q.PageSize != 200 {
		t.Fatalf("normalize: %+v", q)
	}
}

func TestAlertStatusMachine(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	ctx := context.Background()
	ev, err := svc.RaiseAlert(ctx, "TRACE-T", baseRaiseWith(func(r *AlertRaiseRequest) { r.AlertID = "ALERT-T2-100" }))
	if err != nil {
		t.Fatal(err)
	}
	if ev.Status != "OPEN" {
		t.Fatalf("init status = %s", ev.Status)
	}
	upd, err := svc.AlertStatus(ctx, "TRACE-T", &AlertStatusRequest{AlertID: "ALERT-T2-100", ToStatus: "IDENTIFIED", Operator: "REG-01", Reason: "已定位主体"})
	if err != nil || upd.Status != "IDENTIFIED" {
		t.Fatalf("OPEN→IDENTIFIED: %+v err=%v", upd, err)
	}
	// 非法跳跃 IDENTIFIED→RESOLVED → 6002
	_, err = svc.AlertStatus(ctx, "TRACE-T", &AlertStatusRequest{AlertID: "ALERT-T2-100", ToStatus: "RESOLVED", Operator: "REG-01"})
	if err == nil || errCodeOf(t, err) != errcode.Param || !strings.Contains(err.Error(), "illegal transition") {
		t.Fatalf("jump: %v", err)
	}
	// 告警不存在 → 6002
	_, err = svc.AlertStatus(ctx, "TRACE-T", &AlertStatusRequest{AlertID: "ALERT-NOPE", ToStatus: "IDENTIFIED", Operator: "REG-01"})
	if err == nil || errCodeOf(t, err) != errcode.Param {
		t.Fatalf("unknown alert: %v", err)
	}
	// 线性走完全程
	for _, to := range []string{"TRACED", "REVIEWED", "RESOLVED", "ARCHIVED"} {
		if _, err := svc.AlertStatus(ctx, "TRACE-T", &AlertStatusRequest{AlertID: "ALERT-T2-100", ToStatus: to, Operator: "REG-01"}); err != nil {
			t.Fatalf("→%s: %v", to, err)
		}
	}
	// 审计留痕：1 次 ALERT_RAISE + 5 次 ALERT_STATUS
	_, raiseTotal, _ := svc.audit.Query(auditQueryAction("ALERT_RAISE"))
	_, stTotal, _ := svc.audit.Query(auditQueryAction("ALERT_STATUS"))
	if raiseTotal != 1 || stTotal != 5 {
		t.Fatalf("audit raise=%d status=%d", raiseTotal, stTotal)
	}
}

// ---- 测试辅助 ----

func baseRaiseWith(mut func(r *AlertRaiseRequest)) *AlertRaiseRequest {
	r := baseRaise()
	mut(r)
	return r
}

func auditQueryAction(action string) audit.QueryFilter {
	return audit.QueryFilter{Action: action}
}
