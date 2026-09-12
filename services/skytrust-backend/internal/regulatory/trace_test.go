package regulatory

import (
	"context"
	"testing"

	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// seedIdentityChain 直插全链身份数据（监管域测试不走业务服务，P4-4 model 只读）。
func seedIdentityChain(t *testing.T, svc *Service, suffix string) model.IdentityMapping {
	t.Helper()
	uavID := "UAV-T3" + suffix
	opID := "Operator-T3" + suffix
	mfgID := "Manufacturer-T3" + suffix
	passID := "PASS-T3" + suffix
	rows := []any{
		&model.Manufacturer{ManufacturerID: mfgID, Name: "T3厂商", Status: "ACTIVE"},
		&model.Operator{OperatorID: opID, Name: "T3运营商", Status: "ACTIVE"},
		&model.UAV{UAVID: uavID, ManufacturerID: mfgID, OperatorID: opID, Model: "T3",
			SerialNo: "SN-T3" + suffix, SM9Identity: crypto.SM9IdentityOf(uavID), Status: "VERIFIED"},
		&model.FlightPass{PassID: passID, MissionID: "MISSION-T3", UAVID: uavID, Route: `["R101"]`, Status: "VALID"},
	}
	for _, r := range rows {
		if err := svc.db.Create(r).Error; err != nil {
			t.Fatal(err)
		}
	}
	m := model.IdentityMapping{
		MappingID: "IDM-T3" + suffix, Pseudo: "PSEUDO-T3" + suffix, DeviceAddress: "0xT3" + suffix,
		PassID: passID, SM9Identity: crypto.SM9IdentityOf(uavID), UAVID: uavID,
		OperatorID: opID, ManufacturerID: mfgID, SourceChain: "chainmaker",
	}
	if err := svc.db.Create(&m).Error; err != nil {
		t.Fatal(err)
	}
	return m
}

func assertLevelsShape(t *testing.T, res *TraceResult) {
	t.Helper()
	if len(res.Levels) != 7 {
		t.Fatalf("levels = %d, want 7", len(res.Levels))
	}
	var prev int64
	for i, l := range res.Levels {
		if l.Level != i+1 || l.Name != TraceLevelNames[i] {
			t.Fatalf("level %d shape: %+v", i, l)
		}
		if l.LatencyMs < 0 || l.LatencyMs < prev {
			t.Fatalf("level %d latency %d (prev %d): must be >=0 and non-decreasing", i, l.LatencyMs, prev)
		}
		prev = l.LatencyMs
	}
	if res.TraceLatencyMs < 0 || res.TraceLatencyMs >= 1000 {
		t.Fatalf("trace_latency_ms = %d, want [0,1000) (sub-second contract)", res.TraceLatencyMs)
	}
}

func TestTraceFullChainByPseudo(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	m := seedIdentityChain(t, svc, "-A")
	res, err := svc.TraceIdentity(context.Background(), "TRACE-T", &TraceRequest{Pseudo: m.Pseudo, Operator: "REG-01"})
	if err != nil {
		t.Fatal(err)
	}
	if !res.Resolved || res.BreakLevel != 0 || res.EntryType != "PSEUDO" || res.Pseudonym != m.Pseudo {
		t.Fatalf("res = %+v", res)
	}
	assertLevelsShape(t, res)
	wantVals := []string{m.Pseudo, m.DeviceAddress, m.PassID, m.SM9Identity, m.UAVID, m.OperatorID, m.ManufacturerID}
	wantSrc := []string{SourceChainmakerIndex, SourceChainmakerIndex, SourceChainmakerIndex, SourceChainmakerIndex,
		SourceFabricDetail, SourceFabricDetail, SourceFiscoDetail}
	for i, l := range res.Levels {
		if l.Status != "RESOLVED" || l.Value != wantVals[i] || l.Source != wantSrc[i] {
			t.Fatalf("level %d = %+v want value %s source %s", i, l, wantVals[i], wantSrc[i])
		}
	}
	// 成功审计含实测耗时
	_, total, _ := svc.audit.Query(auditQueryAction("TRACE_IDENTITY"))
	if total != 1 {
		t.Fatalf("TRACE_IDENTITY audit total = %d", total)
	}
}

func TestTraceByAlertIDEntry(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	m := seedIdentityChain(t, svc, "-B")
	ev := model.SecurityEvent{AlertID: "ALERT-T3-001", UAVPseudonym: m.Pseudo, EventType: AlertRouteDeviation,
		RiskLevel: "HIGH", SourceSystem: "MANUAL", Status: "OPEN"}
	if err := svc.db.Create(&ev).Error; err != nil {
		t.Fatal(err)
	}
	res, err := svc.TraceIdentity(context.Background(), "TRACE-T", &TraceRequest{AlertID: "ALERT-T3-001", Operator: "REG-01"})
	if err != nil || !res.Resolved || res.EntryType != "ALERT_ID" || res.Pseudonym != m.Pseudo {
		t.Fatalf("alert entry: %+v err=%v", res, err)
	}
	assertLevelsShape(t, res)
	// 告警不存在 → 6002（不是 5001）
	_, err = svc.TraceIdentity(context.Background(), "TRACE-T", &TraceRequest{AlertID: "ALERT-NOPE", Operator: "REG-01"})
	if err == nil || errCodeOf(t, err) != errcode.Param {
		t.Fatalf("unknown alert: %v", err)
	}
}

func TestTraceByDeviceAddress(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	m := seedIdentityChain(t, svc, "-C")
	res, err := svc.TraceIdentity(context.Background(), "TRACE-T", &TraceRequest{DeviceAddress: m.DeviceAddress, Operator: "REG-01"})
	if err != nil || !res.Resolved || res.EntryType != "DEVICE_ADDRESS" || res.Pseudonym != m.Pseudo {
		t.Fatalf("device entry: %+v err=%v", res, err)
	}
	assertLevelsShape(t, res)
	// 入口全缺 → 6002
	_, err = svc.TraceIdentity(context.Background(), "TRACE-T", &TraceRequest{Operator: "REG-01"})
	if err == nil || errCodeOf(t, err) != errcode.Param {
		t.Fatalf("no entry: %v", err)
	}
}

func TestTraceBrokenNoMapping(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	res, err := svc.TraceIdentity(context.Background(), "TRACE-T", &TraceRequest{Pseudo: "PSEUDO-UNKNOWN", Operator: "REG-01"})
	if err == nil || errCodeOf(t, err) != errcode.TraceBroken {
		t.Fatalf("want 5001, got %v", err)
	}
	if res == nil || res.Resolved || res.BreakLevel != 1 {
		t.Fatalf("res = %+v", res)
	}
	assertLevelsShape(t, res)
	if res.Levels[0].Status != "BROKEN" || res.Levels[0].Value != "" || res.Levels[0].Reason == "" {
		t.Fatalf("L1 = %+v (value must stay empty — no fabrication)", res.Levels[0])
	}
	for i := 1; i < 7; i++ {
		if res.Levels[i].Status != "BROKEN" || res.Levels[i].Value != "" || res.Levels[i].Reason != "skipped: break at level 1" {
			t.Fatalf("L%d = %+v", i+1, res.Levels[i])
		}
	}
	_, total, _ := svc.audit.Query(auditQueryAction("TRACE_IDENTITY_BROKEN"))
	if total != 1 {
		t.Fatalf("broken audit total = %d", total)
	}
}

func TestTraceBrokenCrossChecks(t *testing.T) {
	ctx := context.Background()
	// (a) 许可缺失 → break at level 3
	svc, _, _, _ := newTestSvc(t)
	m := seedIdentityChain(t, svc, "-D")
	if err := svc.db.Where("pass_id = ?", m.PassID).Delete(&model.FlightPass{}).Error; err != nil {
		t.Fatal(err)
	}
	res, err := svc.TraceIdentity(ctx, "TRACE-T", &TraceRequest{Pseudo: m.Pseudo, Operator: "REG-01"})
	if err == nil || errCodeOf(t, err) != errcode.TraceBroken || res.BreakLevel != 3 {
		t.Fatalf("pass missing: break=%d err=%v", res.BreakLevel, err)
	}
	// (b) SM9 身份与 UAV 不匹配 → break at level 4
	svc2, _, _, _ := newTestSvc(t)
	m2 := seedIdentityChain(t, svc2, "-E")
	if err := svc2.db.Model(&model.IdentityMapping{}).Where("mapping_id = ?", m2.MappingID).
		Update("sm9_identity", "SM9-ID-WRONG").Error; err != nil {
		t.Fatal(err)
	}
	res2, err2 := svc2.TraceIdentity(ctx, "TRACE-T", &TraceRequest{Pseudo: m2.Pseudo, Operator: "REG-01"})
	if err2 == nil || errCodeOf(t, err2) != errcode.TraceBroken || res2.BreakLevel != 4 {
		t.Fatalf("sm9 mismatch: break=%d err=%v", res2.BreakLevel, err2)
	}
	// (c) 运营链归属与索引不一致 → break at level 6（禁止拼造）
	svc3, _, _, _ := newTestSvc(t)
	m3 := seedIdentityChain(t, svc3, "-F")
	if err := svc3.db.Model(&model.UAV{}).Where("uav_id = ?", m3.UAVID).
		Update("operator_id", "Operator-OTHER").Error; err != nil {
		t.Fatal(err)
	}
	res3, err3 := svc3.TraceIdentity(ctx, "TRACE-T", &TraceRequest{Pseudo: m3.Pseudo, Operator: "REG-01"})
	if err3 == nil || errCodeOf(t, err3) != errcode.TraceBroken || res3.BreakLevel != 6 {
		t.Fatalf("operator mismatch: break=%d err=%v", res3.BreakLevel, err3)
	}
}
