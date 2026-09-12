package regulatory

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// seedInspectMission 直插带密文/摘要/签名的任务行（与 mission.go 生产方字段一致）。
func seedInspectMission(t *testing.T, svc *Service, cs *crypto.Service, id, mtype, payload, desc string) *model.Mission {
	t.Helper()
	routes := []string{"R101", "R205", "R306"}
	zones := []string{"Zone-A", "Zone-B"}
	start, err := timex.ParseTime("2026-09-12 09:00:00")
	if err != nil {
		t.Fatal(err)
	}
	end, err := timex.ParseTime("2026-09-12 11:00:00")
	if err != nil {
		t.Fatal(err)
	}
	cipher, err := cs.SM9Encrypt([]byte(desc))
	if err != nil {
		t.Fatal(err)
	}
	rs := []rune(desc)
	if len(rs) > 4 {
		rs = rs[:4]
	}
	canon := map[string]any{
		"altitude_max": 120.0, "altitude_min": 60.0,
		"end_time": timex.FormatTime(end), "mission_id": id,
		"mission_type": mtype, "operator_id": "Operator-A",
		"payload_type": payload, "route_segments": routes,
		"start_time": timex.FormatTime(start), "uav_id": "UAV-A-001", "zones": zones,
	}
	cb, err := crypto.CanonicalJSON(canon)
	if err != nil {
		t.Fatal(err)
	}
	sig, err := cs.SM9SignUserID(crypto.SM9IdentityOf("UAV-A-001"), cb)
	if err != nil {
		t.Fatal(err)
	}
	segJSON, _ := json.Marshal(routes)
	zoneJSON, _ := json.Marshal(zones)
	m := &model.Mission{
		MissionID: id, OperatorID: "Operator-A", UAVID: "UAV-A-001", MissionType: mtype,
		StartTime: timex.New(start), EndTime: timex.New(end),
		RouteSegments: string(segJSON), AltitudeMin: 60, AltitudeMax: 120, Zones: string(zoneJSON),
		PayloadType: payload, MissionCiphertext: cipher, MaskedValue: string(rs) + "****",
		SM3Hash: crypto.SM3Hex(cb), SM9Identity: crypto.SM9IdentityOf("UAV-A-001"), Signature: sig,
		Status: "APPROVED",
	}
	if err := svc.db.Create(m).Error; err != nil {
		t.Fatal(err)
	}
	return m
}

// approvedAuth 走真实 Apply+Review(APPROVE) 造 AUTHORIZED 授权行（模拟链默认成功）。
func approvedAuth(t *testing.T, svc *Service, missionID string, scope []string, validFrom, validTo string) *model.RegulatoryAuth {
	t.Helper()
	ctx := context.Background()
	auth, err := svc.ApplyAuthorization(ctx, "TRACE-T", &AuthApplyRequest{
		RegulatorID: "REG-01", Scope: scope, TargetType: "MISSION", TargetID: missionID,
		Reason: "测试授权", ValidFrom: validFrom, ValidTo: validTo,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ReviewAuthorization(ctx, "TRACE-T", &AuthReviewRequest{
		AuthorizationID: auth.AuthorizationID, Decision: "APPROVE", ReviewerID: "REG-ADMIN",
	}); err != nil {
		t.Fatal(err)
	}
	return auth
}

func fullScope() []string { return []string{"MISSION", "ROUTE", "PAYLOAD", "IDENTITY", "EVIDENCE"} }

func TestInspectUnauthorizedSealed(t *testing.T) {
	svc, _, _, cs := newTestSvc(t)
	m := seedInspectMission(t, svc, cs, "MISSION-T5-A", "POWER_INSPECTION", "CAMERA", "巡线走廊全线巡检")
	ctx := context.Background()
	// 无授权号 → 5002 + sealed（TC3-04：尝试必须留痕）
	res, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, RegulatorID: "REG-01"})
	if err == nil || errCodeOf(t, err) != errcode.NoAuth {
		t.Fatalf("want 5002, got %v", err)
	}
	if res == nil || res.Authorized || res.DecryptedView != "" || res.Mission != nil {
		t.Fatalf("sealed-only violation: %+v", res)
	}
	if res.Sealed.CiphertextStatus != "SEALED" || res.Sealed.SM3Hash != m.SM3Hash ||
		res.Sealed.MaskedValue != "巡线走廊****" || !res.Sealed.HasCiphertext {
		t.Fatalf("sealed = %+v", res.Sealed)
	}
	// 授权号不存在 → 同为 5002（不泄露存在性，P4-6）
	res2, err2 := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, AuthorizationID: "AUTH-NOPE", RegulatorID: "REG-01"})
	if err2 == nil || errCodeOf(t, err2) != errcode.NoAuth || res2.Authorized {
		t.Fatalf("unknown auth: %+v err=%v", res2, err2)
	}
	// 任务不存在 → 6002（参数错，不是授权错）
	_, err3 := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: "MISSION-NOPE"})
	if err3 == nil || errCodeOf(t, err3) != errcode.Param {
		t.Fatalf("unknown mission: %v", err3)
	}
	_, total, _ := svc.audit.Query(auditQueryAction("INSPECT_UNAUTHORIZED"))
	if total != 2 {
		t.Fatalf("INSPECT_UNAUTHORIZED audit = %d, want 2", total)
	}
}

func TestInspectPendingDeniedSealed(t *testing.T) {
	svc, _, _, cs := newTestSvc(t)
	m := seedInspectMission(t, svc, cs, "MISSION-T5-B", "POWER_INSPECTION", "CAMERA", "描述B")
	ctx := context.Background()
	pending, err := svc.ApplyAuthorization(ctx, "TRACE-T", &AuthApplyRequest{
		RegulatorID: "REG-01", Scope: fullScope(), TargetType: "MISSION", TargetID: m.MissionID, Reason: "r",
	})
	if err != nil {
		t.Fatal(err)
	}
	res, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, AuthorizationID: pending.AuthorizationID, RegulatorID: "REG-01"})
	if err == nil || errCodeOf(t, err) != errcode.NoAuth || res.Authorized {
		t.Fatalf("PENDING: %+v err=%v", res, err)
	}
	denied, _ := svc.ApplyAuthorization(ctx, "TRACE-T", &AuthApplyRequest{
		RegulatorID: "REG-01", Scope: fullScope(), TargetType: "MISSION", TargetID: m.MissionID, Reason: "r",
	})
	if _, err := svc.ReviewAuthorization(ctx, "TRACE-T", &AuthReviewRequest{
		AuthorizationID: denied.AuthorizationID, Decision: "DENY", ReviewerID: "REG-ADMIN",
	}); err != nil {
		t.Fatal(err)
	}
	res2, err2 := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, AuthorizationID: denied.AuthorizationID, RegulatorID: "REG-01"})
	if err2 == nil || errCodeOf(t, err2) != errcode.NoAuth || res2.Authorized {
		t.Fatalf("DENIED: %+v err=%v", res2, err2)
	}
}

func TestInspectExpiredAndLazy(t *testing.T) {
	svc, _, _, cs := newTestSvc(t)
	m := seedInspectMission(t, svc, cs, "MISSION-T5-C", "POWER_INSPECTION", "CAMERA", "描述C")
	ctx := context.Background()
	now := timex.Now()
	// 已过窗：AUTHORIZED 行 + valid_to 过去 → 5004 + 惰性更新为 EXPIRED（P4-5）
	expired := approvedAuth(t, svc, m.MissionID, fullScope(),
		timex.FormatTime(now.Add(-48*3600e9)), timex.FormatTime(now.Add(-24*3600e9)))
	res, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, AuthorizationID: expired.AuthorizationID, RegulatorID: "REG-01"})
	if err == nil || errCodeOf(t, err) != errcode.AuthExpired || res.Authorized {
		t.Fatalf("expired: %+v err=%v", res, err)
	}
	var reloaded model.RegulatoryAuth
	if err := svc.db.Where("authorization_id = ?", expired.AuthorizationID).First(&reloaded).Error; err != nil {
		t.Fatal(err)
	}
	if reloaded.Status != "EXPIRED" {
		t.Fatalf("lazy expiry not persisted: %s", reloaded.Status)
	}
	// 未生效：valid_from 未来 → 5004，行保持 AUTHORIZED
	future := approvedAuth(t, svc, m.MissionID, fullScope(),
		timex.FormatTime(now.Add(3600e9)), timex.FormatTime(now.Add(7200e9)))
	_, err2 := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, AuthorizationID: future.AuthorizationID, RegulatorID: "REG-01"})
	if err2 == nil || errCodeOf(t, err2) != errcode.AuthExpired {
		t.Fatalf("not yet valid: %v", err2)
	}
	var reloaded2 model.RegulatoryAuth
	svc.db.Where("authorization_id = ?", future.AuthorizationID).First(&reloaded2)
	if reloaded2.Status != "AUTHORIZED" {
		t.Fatalf("future window must not flip status: %s", reloaded2.Status)
	}
	// 状态 EXPIRED 的行 → 直接 5004
	_, err3 := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, AuthorizationID: expired.AuthorizationID, RegulatorID: "REG-01"})
	if err3 == nil || errCodeOf(t, err3) != errcode.AuthExpired {
		t.Fatalf("EXPIRED row: %v", err3)
	}
}

func TestInspectScopeViolation(t *testing.T) {
	svc, _, _, cs := newTestSvc(t)
	m := seedInspectMission(t, svc, cs, "MISSION-T5-D", "POWER_INSPECTION", "CAMERA", "描述D")
	ctx := context.Background()
	// 有 MISSION 无 ROUTE：请求轨迹核偏 → 5003
	a1 := approvedAuth(t, svc, m.MissionID, []string{"MISSION"}, "", "")
	res, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, AuthorizationID: a1.AuthorizationID, RegulatorID: "REG-01", Trajectory: "NORMAL"})
	if err == nil || errCodeOf(t, err) != errcode.AuthScope || res.Authorized || res.DecryptedView != "" {
		t.Fatalf("route scope: %+v err=%v", res, err)
	}
	// 有 MISSION 无 PAYLOAD：请求载荷核验 → 5003
	res2, err2 := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, AuthorizationID: a1.AuthorizationID, RegulatorID: "REG-01", PayloadType: "CAMERA"})
	if err2 == nil || errCodeOf(t, err2) != errcode.AuthScope {
		t.Fatalf("payload scope: %+v err=%v", res2, err2)
	}
	// 授权目标不匹配（P4-8）→ 5003
	other := seedInspectMission(t, svc, cs, "MISSION-T5-E", "SURVEY", "CAMERA", "描述E")
	res3, err3 := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: other.MissionID, AuthorizationID: a1.AuthorizationID, RegulatorID: "REG-01"})
	if err3 == nil || errCodeOf(t, err3) != errcode.AuthScope {
		t.Fatalf("target mismatch: %+v err=%v", res3, err3)
	}
	// trajectory 枚举违规 → 6002
	_, err4 := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{MissionID: m.MissionID, AuthorizationID: a1.AuthorizationID, Trajectory: "RANDOM"})
	if err4 == nil || errCodeOf(t, err4) != errcode.Param {
		t.Fatalf("bad trajectory: %v", err4)
	}
	_, total, _ := svc.audit.Query(auditQueryAction("INSPECT_SCOPE_DENIED"))
	if total != 3 {
		t.Fatalf("INSPECT_SCOPE_DENIED audit = %d, want 3", total)
	}
}

func TestInspectAuthorizedRouteOK(t *testing.T) {
	svc, _, _, cs := newTestSvc(t)
	m := seedInspectMission(t, svc, cs, "MISSION-T5-F", "POWER_INSPECTION", "CAMERA", "巡线走廊全线巡检")
	auth := approvedAuth(t, svc, m.MissionID, fullScope(), "", "")
	res, err := svc.InspectCiphertext(context.Background(), "TRACE-T", &InspectRequest{
		MissionID: m.MissionID, AuthorizationID: auth.AuthorizationID, RegulatorID: "REG-01",
		Trajectory: "NORMAL", PayloadType: "CAMERA",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !res.Authorized || res.DecryptedView != "巡线走廊全线巡检" {
		t.Fatalf("decrypted: %+v", res)
	}
	if res.Verification == nil || !res.Verification.DigestMatch || !res.Verification.SignatureValid || len(res.Verification.AuditHash) != 64 {
		t.Fatalf("verification: %+v", res.Verification)
	}
	if res.Conclusion.RouteVerdict != "ROUTE_OK" || res.Conclusion.PayloadVerdict != "PAYLOAD_OK" || len(res.Conclusion.RaisedAlerts) != 0 {
		t.Fatalf("conclusion: %+v", res.Conclusion)
	}
	if !strings.HasPrefix(res.ChainTxID, "CHAINMAKER-") || !model.ValidateID("AUD", res.RegAuditID) {
		t.Fatalf("chain/audit: %+v", res)
	}
	// RegulatoryAudit INSPECT 行已落库且含链上 TxID
	var ra model.RegulatoryAudit
	if err := svc.db.Where("audit_id = ?", res.RegAuditID).First(&ra).Error; err != nil {
		t.Fatal(err)
	}
	if ra.Action != "INSPECT" || ra.ChainTxID != res.ChainTxID || ra.AuthorizationID != auth.AuthorizationID {
		t.Fatalf("reg audit row: %+v", ra)
	}
	// 密文与明文分离：响应序列化后不得含密文（model json:"-" + 无明文落库）
	b, _ := json.Marshal(res)
	if strings.Contains(string(b), m.MissionCiphertext) {
		t.Fatal("ciphertext leaked in response")
	}
	var decCnt int64
	svc.db.Model(&model.RegulatoryAudit{}).Where("result LIKE ?", "%巡线走廊全线巡检%").Count(&decCnt)
	if decCnt != 0 {
		t.Fatal("plaintext persisted — decrypted_view must be temporary (spec §5)")
	}
}

func TestInspectRouteDeviationAutoAlert(t *testing.T) {
	svc, _, _, cs := newTestSvc(t)
	m := seedInspectMission(t, svc, cs, "MISSION-T5-G", "POWER_INSPECTION", "CAMERA", "描述G")
	auth := approvedAuth(t, svc, m.MissionID, fullScope(), "", "")
	ctx := context.Background()
	res, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{
		MissionID: m.MissionID, AuthorizationID: auth.AuthorizationID, RegulatorID: "REG-01", Trajectory: "DEVIATION",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Conclusion.RouteVerdict != "ROUTE_DEVIATION" || len(res.Conclusion.RaisedAlerts) != 1 {
		t.Fatalf("conclusion: %+v", res.Conclusion)
	}
	var ev model.SecurityEvent
	if err := svc.db.Where("alert_id = ?", res.Conclusion.RaisedAlerts[0]).First(&ev).Error; err != nil {
		t.Fatal(err)
	}
	if ev.EventType != AlertRouteDeviation || ev.RiskLevel != "HIGH" || ev.SourceSystem != "SYSTEM3" ||
		ev.MissionID != m.MissionID || ev.Status != "OPEN" || len(ev.EvidenceHash) != 64 {
		t.Fatalf("auto alert: %+v", ev)
	}
	// 去重（P4-7）：再次偏航核验复用同一告警
	res2, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{
		MissionID: m.MissionID, AuthorizationID: auth.AuthorizationID, RegulatorID: "REG-01", Trajectory: "DEVIATION",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(res2.Conclusion.RaisedAlerts) != 1 || res2.Conclusion.RaisedAlerts[0] != ev.AlertID {
		t.Fatalf("dedup: %+v", res2.Conclusion)
	}
	var cnt int64
	svc.db.Model(&model.SecurityEvent{}).Where("event_type = ?", AlertRouteDeviation).Count(&cnt)
	if cnt != 1 {
		t.Fatalf("alert rows = %d, want 1 (dedup)", cnt)
	}
}

func TestInspectPayloadMismatch(t *testing.T) {
	svc, _, _, cs := newTestSvc(t)
	ctx := context.Background()
	// (a) 申报载荷 ≠ 登记载荷 → MISSION_MISMATCH + MEDIUM 告警
	m := seedInspectMission(t, svc, cs, "MISSION-T5-H", "POWER_INSPECTION", "CAMERA", "描述H")
	auth := approvedAuth(t, svc, m.MissionID, fullScope(), "", "")
	res, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{
		MissionID: m.MissionID, AuthorizationID: auth.AuthorizationID, RegulatorID: "REG-01", PayloadType: "CARGO",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Conclusion.PayloadVerdict != "MISSION_MISMATCH" || len(res.Conclusion.RaisedAlerts) != 1 {
		t.Fatalf("claim mismatch: %+v", res.Conclusion)
	}
	var ev model.SecurityEvent
	svc.db.Where("alert_id = ?", res.Conclusion.RaisedAlerts[0]).First(&ev)
	if ev.EventType != AlertMissionMismatch || ev.RiskLevel != "MEDIUM" || ev.SourceSystem != "SYSTEM3" {
		t.Fatalf("mismatch alert: %+v", ev)
	}
	// (b) 兼容表分支：LOGISTICS 任务登记载荷 CAMERA（申报一致）→ 类型-载荷不兼容 → MISSION_MISMATCH
	m2 := seedInspectMission(t, svc, cs, "MISSION-T5-I", "LOGISTICS", "CAMERA", "描述I")
	auth2 := approvedAuth(t, svc, m2.MissionID, fullScope(), "", "")
	res2, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{
		MissionID: m2.MissionID, AuthorizationID: auth2.AuthorizationID, RegulatorID: "REG-01", PayloadType: "CAMERA",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res2.Conclusion.PayloadVerdict != "MISSION_MISMATCH" {
		t.Fatalf("compat mismatch: %+v", res2.Conclusion)
	}
	// (c) 兼容组合：POWER_INSPECTION + CAMERA 且申报一致 → PAYLOAD_OK（(a) 任务复用，无载荷参数）
	res3, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{
		MissionID: m.MissionID, AuthorizationID: auth.AuthorizationID, RegulatorID: "REG-01", PayloadType: "CAMERA",
	})
	if err != nil || res3.Conclusion.PayloadVerdict != "PAYLOAD_OK" {
		t.Fatalf("compatible: %+v err=%v", res3, err)
	}
}

func TestInspectChainFailureNoPlaintext(t *testing.T) {
	svc, chains, _, cs := newTestSvc(t)
	m := seedInspectMission(t, svc, cs, "MISSION-T5-J", "POWER_INSPECTION", "CAMERA", "描述J机密")
	auth := approvedAuth(t, svc, m.MissionID, fullScope(), "", "")
	ctx := context.Background()
	// 裁定（同 Task 4 C1）：WithFailNext 是构造期 Option，后置应用到同一 *Chain；测试文件须 import sim。
	sim.WithFailNext("RecordInspection", 1)(chains["chainmaker"])
	res, err := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{
		MissionID: m.MissionID, AuthorizationID: auth.AuthorizationID, RegulatorID: "REG-01", Trajectory: "NORMAL",
	})
	if err == nil || errCodeOf(t, err) != errcode.CrosschainSend {
		t.Fatalf("want 2001, got %v", err)
	}
	// P4-6：上链失败的错误信封只带 sealed——明文/任务行绝不透传
	if res == nil || res.Authorized || res.DecryptedView != "" || res.Mission != nil || res.Sealed == nil {
		t.Fatalf("plaintext in error envelope: %+v", res)
	}
	_, total, _ := svc.audit.Query(auditQueryAction("INSPECT_CHAIN_FAILED"))
	if total != 1 {
		t.Fatalf("INSPECT_CHAIN_FAILED audit = %d", total)
	}
	// 重试成功
	res2, err2 := svc.InspectCiphertext(ctx, "TRACE-T", &InspectRequest{
		MissionID: m.MissionID, AuthorizationID: auth.AuthorizationID, RegulatorID: "REG-01", Trajectory: "NORMAL",
	})
	if err2 != nil || !res2.Authorized || res2.DecryptedView != "描述J机密" {
		t.Fatalf("retry: %+v err=%v", res2, err2)
	}
}
