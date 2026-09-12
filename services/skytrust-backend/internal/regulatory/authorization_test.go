package regulatory

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// seedAuthTargets 直插三类授权目标各一行（P4-4：model 只读跨域数据）。
func seedAuthTargets(t *testing.T, svc *Service) {
	t.Helper()
	rows := []any{
		&model.Mission{MissionID: "MISSION-T4", OperatorID: "Operator-A", UAVID: "UAV-A-001",
			MissionType: "POWER_INSPECTION", PayloadType: "CAMERA", Status: "APPROVED"},
		&model.UAV{UAVID: "UAV-T4", ManufacturerID: "Manufacturer-B", OperatorID: "Operator-A",
			Model: "T4", SerialNo: "SN-T4", Status: "VERIFIED"},
		&model.SecurityEvent{AlertID: "ALERT-T4", UAVPseudonym: "PSEUDO-UAV-83921",
			EventType: AlertWormhole, RiskLevel: "HIGH", SourceSystem: "SYSTEM2", Status: "OPEN"},
	}
	for _, r := range rows {
		if err := svc.db.Create(r).Error; err != nil {
			t.Fatal(err)
		}
	}
}

func baseApply() *AuthApplyRequest {
	return &AuthApplyRequest{
		RegulatorID: "REG-01", Scope: []string{"MISSION", "ROUTE", "PAYLOAD", "IDENTITY"},
		TargetType: "MISSION", TargetID: "MISSION-T4", Reason: "虫洞告警核查",
	}
}

func TestAuthApplyValidation(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	seedAuthTargets(t, svc)
	ctx := context.Background()
	cases := []struct {
		name string
		mut  func(r *AuthApplyRequest)
	}{
		{"bad scope element", func(r *AuthApplyRequest) { r.Scope = []string{"MISSION", "EVERYTHING"} }},
		{"duplicate scope", func(r *AuthApplyRequest) { r.Scope = []string{"MISSION", "MISSION"} }},
		{"empty scope", func(r *AuthApplyRequest) { r.Scope = nil }},
		{"empty regulator", func(r *AuthApplyRequest) { r.RegulatorID = "" }},
		{"bad target_type", func(r *AuthApplyRequest) { r.TargetType = "OPERATOR" }},
		{"mission missing", func(r *AuthApplyRequest) { r.TargetID = "MISSION-NOPE" }},
		{"uav missing", func(r *AuthApplyRequest) { r.TargetType = "UAV"; r.TargetID = "UAV-NOPE" }},
		{"alert missing", func(r *AuthApplyRequest) { r.TargetType = "ALERT"; r.TargetID = "ALERT-NOPE" }},
		{"reason required", func(r *AuthApplyRequest) { r.Reason = "" }},
		{"bad valid_from", func(r *AuthApplyRequest) { r.ValidFrom = "09/12/2026" }},
		{"bad valid_to", func(r *AuthApplyRequest) { r.ValidTo = "tomorrow" }},
		{"window inverted", func(r *AuthApplyRequest) {
			r.ValidFrom = "2026-09-12 10:00:00"
			r.ValidTo = "2026-09-12 09:00:00"
		}},
	}
	for _, c := range cases {
		r := baseApply()
		c.mut(r)
		_, err := svc.ApplyAuthorization(ctx, "TRACE-T", r)
		if err == nil || errCodeOf(t, err) != errcode.Param {
			t.Fatalf("%s: want 6002, got %v", c.name, err)
		}
	}
	// 三类目标合法路径 + 缺省窗口（now ~ now+24h）
	for _, tt := range []struct{ typ, id string }{{"MISSION", "MISSION-T4"}, {"UAV", "UAV-T4"}, {"ALERT", "ALERT-T4"}} {
		r := baseApply()
		r.TargetType, r.TargetID = tt.typ, tt.id
		if tt.typ == "ALERT" {
			r.Reason = "" // 告警目标可省 reason（自动生成）
		}
		auth, err := svc.ApplyAuthorization(ctx, "TRACE-T", r)
		if err != nil {
			t.Fatalf("%s: %v", tt.typ, err)
		}
		if auth.Status != "PENDING" || !model.ValidateID("AUTH", auth.AuthorizationID) {
			t.Fatalf("%s: %+v", tt.typ, auth)
		}
		if !auth.ValidTo.After(auth.ValidFrom.Time) {
			t.Fatalf("%s: window %s ~ %s", tt.typ, timex.FormatTime(auth.ValidFrom.Time), timex.FormatTime(auth.ValidTo.Time))
		}
	}
}

func TestAuthApplyExplicitID(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	seedAuthTargets(t, svc)
	ctx := context.Background()
	r := baseApply()
	r.AuthorizationID = "AUTH-2026-001"
	auth, err := svc.ApplyAuthorization(ctx, "TRACE-T", r)
	if err != nil || auth.AuthorizationID != "AUTH-2026-001" {
		t.Fatalf("explicit: %+v err=%v", auth, err)
	}
	r2 := baseApply()
	r2.AuthorizationID = "AUTH-2026-001"
	_, err = svc.ApplyAuthorization(ctx, "TRACE-T", r2)
	if err == nil || errCodeOf(t, err) != errcode.Param || !strings.Contains(err.Error(), "已存在") {
		t.Fatalf("dup: %v", err)
	}
	r3 := baseApply()
	r3.AuthorizationID = "XX-1"
	if _, err := svc.ApplyAuthorization(ctx, "TRACE-T", r3); err == nil || errCodeOf(t, err) != errcode.Param {
		t.Fatalf("bad format: %v", err)
	}
}

func TestAuthApplyAuditHash(t *testing.T) {
	svc, _, _, cs := newTestSvc(t)
	seedAuthTargets(t, svc)
	ctx := context.Background()
	auth, err := svc.ApplyAuthorization(ctx, "TRACE-T", baseApply())
	if err != nil {
		t.Fatal(err)
	}
	var scope []string
	if err := json.Unmarshal([]byte(auth.Scope), &scope); err != nil || len(scope) != 4 {
		t.Fatalf("scope json = %s", auth.Scope)
	}
	want, err := cs.HashCanonical(map[string]any{
		"authorization_id": auth.AuthorizationID, "regulator_id": auth.RegulatorID, "scope": scope,
		"target_type": auth.TargetType, "target_id": auth.TargetID, "reason": auth.Reason,
		"valid_from": timex.FormatTime(auth.ValidFrom.Time), "valid_to": timex.FormatTime(auth.ValidTo.Time),
	})
	if err != nil {
		t.Fatal(err)
	}
	if auth.AuditHash != want || len(want) != 64 {
		t.Fatalf("audit_hash = %s want %s", auth.AuditHash, want)
	}
	_, total, _ := svc.audit.Query(auditQueryAction("AUTH_APPLY"))
	if total != 1 {
		t.Fatalf("AUTH_APPLY audit = %d", total)
	}
}

func TestAuthApplyAutoReason(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	seedAuthTargets(t, svc)
	r := baseApply()
	r.TargetType, r.TargetID, r.Reason = "ALERT", "ALERT-T4", ""
	auth, err := svc.ApplyAuthorization(context.Background(), "TRACE-T", r)
	if err != nil || auth.Reason != "监管核查告警 ALERT-T4" {
		t.Fatalf("auto reason: %+v err=%v", auth, err)
	}
}

func TestAuthReviewApprove(t *testing.T) {
	svc, chains, _, _ := newTestSvc(t)
	_ = chains
	seedAuthTargets(t, svc)
	ctx := context.Background()
	auth, err := svc.ApplyAuthorization(ctx, "TRACE-T", baseApply())
	if err != nil {
		t.Fatal(err)
	}
	res, err := svc.ReviewAuthorization(ctx, "TRACE-T", &AuthReviewRequest{
		AuthorizationID: auth.AuthorizationID, Decision: "APPROVE", ReviewerID: "REG-ADMIN", Comment: "同意",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Auth.Status != "AUTHORIZED" || !strings.HasPrefix(res.ChainTxID, "CHAINMAKER-") {
		t.Fatalf("approve: %+v", res)
	}
	if res.Audit.Action != "AUTH_APPROVE" || res.Audit.ChainTxID != res.ChainTxID ||
		res.Audit.AuthorizationID != auth.AuthorizationID || res.Audit.AuditHash != auth.AuditHash {
		t.Fatalf("reg audit: %+v", res.Audit)
	}
	// RegulatoryAudit 已落库
	var cnt int64
	if err := svc.db.Model(&model.RegulatoryAudit{}).Where("action = ?", "AUTH_APPROVE").Count(&cnt).Error; err != nil || cnt != 1 {
		t.Fatalf("reg audit rows = %d err=%v", cnt, err)
	}
	_, total, _ := svc.audit.Query(auditQueryAction("AUTH_REVIEW"))
	if total != 1 {
		t.Fatalf("AUTH_REVIEW audit = %d", total)
	}
}

func TestAuthReviewDeny(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	seedAuthTargets(t, svc)
	ctx := context.Background()
	auth, _ := svc.ApplyAuthorization(ctx, "TRACE-T", baseApply())
	res, err := svc.ReviewAuthorization(ctx, "TRACE-T", &AuthReviewRequest{
		AuthorizationID: auth.AuthorizationID, Decision: "DENY", ReviewerID: "REG-ADMIN", Comment: "证据不足",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Auth.Status != "DENIED" || res.ChainTxID != "" || res.Audit.Action != "AUTH_DENY" {
		t.Fatalf("deny: %+v", res)
	}
}

func TestAuthReviewFailures(t *testing.T) {
	svc, chains, _, _ := newTestSvc(t)
	seedAuthTargets(t, svc)
	ctx := context.Background()
	// 不存在 / decision 非法
	_, err := svc.ReviewAuthorization(ctx, "TRACE-T", &AuthReviewRequest{AuthorizationID: "AUTH-NOPE", Decision: "APPROVE", ReviewerID: "R"})
	if err == nil || errCodeOf(t, err) != errcode.Param {
		t.Fatalf("unknown: %v", err)
	}
	auth, _ := svc.ApplyAuthorization(ctx, "TRACE-T", baseApply())
	_, err = svc.ReviewAuthorization(ctx, "TRACE-T", &AuthReviewRequest{AuthorizationID: auth.AuthorizationID, Decision: "MAYBE", ReviewerID: "R"})
	if err == nil || errCodeOf(t, err) != errcode.Param {
		t.Fatalf("decision: %v", err)
	}
	// 上链失败 → 2001，授权停留 PENDING（P4-5 可重试）
	// 偏差C1（已批准）：WithFailNext 仅为 sim.Option 构造器（无 *Chain 同名方法），
	// 对 newTestSvc 既有链实例后置应用 Option（网关 adapters 持同一 *Chain 指针，故障注入生效）。
	sim.WithFailNext("RecordAuthorization", 1)(chains["chainmaker"])
	_, err = svc.ReviewAuthorization(ctx, "TRACE-T", &AuthReviewRequest{AuthorizationID: auth.AuthorizationID, Decision: "APPROVE", ReviewerID: "R"})
	if err == nil || errCodeOf(t, err) != errcode.CrosschainSend {
		t.Fatalf("chain fail: want 2001, got %v", err)
	}
	var reloaded model.RegulatoryAuth
	if err := svc.db.Where("authorization_id = ?", auth.AuthorizationID).First(&reloaded).Error; err != nil {
		t.Fatal(err)
	}
	if reloaded.Status != "PENDING" {
		t.Fatalf("status after chain failure = %s, want PENDING", reloaded.Status)
	}
	// 重试成功
	res, err := svc.ReviewAuthorization(ctx, "TRACE-T", &AuthReviewRequest{AuthorizationID: auth.AuthorizationID, Decision: "APPROVE", ReviewerID: "R"})
	if err != nil || res.Auth.Status != "AUTHORIZED" {
		t.Fatalf("retry: %+v err=%v", res, err)
	}
	// 非 PENDING 复审 → 6002
	_, err = svc.ReviewAuthorization(ctx, "TRACE-T", &AuthReviewRequest{AuthorizationID: auth.AuthorizationID, Decision: "APPROVE", ReviewerID: "R"})
	if err == nil || errCodeOf(t, err) != errcode.Param || !strings.Contains(err.Error(), "only PENDING") {
		t.Fatalf("re-review: %v", err)
	}
}
