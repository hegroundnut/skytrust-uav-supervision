package uavbusiness

import (
	"context"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// approvedMission 铺设 SUBMITTED 任务并裁决 APPROVED（复用 Task 11 helper）。
func approvedMission(t *testing.T, svc *Service) *model.Mission {
	t.Helper()
	m, app := submittedMission(t, svc)
	if _, _, _, err := svc.SubmitReview(context.Background(), "TRACE-T", ReviewInput{
		ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN",
	}); err != nil {
		t.Fatalf("approve mission: %v", err)
	}
	return m
}

// nowWindow 覆盖当前时刻的生效窗口（now±1h）。baseMissionInput 的固定窗口在未来，
// 直接签发会 verify 出"未到生效时间"，故验证/吊销类测试用本窗口。
func nowWindow() (string, string) {
	return timex.FormatTime(timex.Now().Add(-time.Hour)), timex.FormatTime(timex.Now().Add(time.Hour))
}

func TestIssuePassSuccess(t *testing.T) {
	svc, db := testSvcFull(t)
	m := approvedMission(t, svc)
	ctx := context.Background()
	p, tx, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN"})
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if p.PassID != "PASS-2026-001" || p.Status != "VALID" {
		t.Fatalf("pass = %+v", p)
	}
	if p.MissionID != m.MissionID || p.UAVID != m.UAVID || p.Route != m.RouteSegments {
		t.Errorf("pass fields not copied from mission: %+v", p)
	}
	if !p.ValidFrom.Equal(m.StartTime) || !p.ValidTo.Equal(m.EndTime) {
		t.Errorf("window should default to mission window: %v ~ %v", p.ValidFrom, p.ValidTo)
	}
	if len(p.SM3Hash) != 64 || p.Signature == "" {
		t.Errorf("crypto material missing: sm3=%q sig_len=%d", p.SM3Hash, len(p.Signature))
	}
	if tx.Status != "SUCCESS" || tx.MessageType != "FLIGHT_PASS" {
		t.Fatalf("tx = %+v", tx)
	}
	for name, v := range map[string]string{
		"source": tx.SourceChainTxID, "reg_receive": tx.RegReceiveTxID,
		"reg_relay": tx.RegRelayTxID, "target": tx.TargetChainTxID,
	} {
		if v == "" {
			t.Errorf("%s tx id empty", name)
		}
	}
	if !strings.HasPrefix(tx.SourceChainTxID, "FISCO-BCOS-") || !strings.HasPrefix(tx.TargetChainTxID, "FABRIC-") {
		t.Errorf("route prefixes: %q -> %q", tx.SourceChainTxID, tx.TargetChainTxID)
	}
	var got model.FlightPass
	if err := db.Where("pass_id = ?", p.PassID).First(&got).Error; err != nil || got.Status != "VALID" {
		t.Errorf("persisted = %+v err=%v", got, err)
	}
	var auditCnt int64
	db.Model(&model.AuditLog{}).Where("action = ?", "PASS_ISSUE").Count(&auditCnt)
	if auditCnt != 1 {
		t.Errorf("want 1 PASS_ISSUE audit, got %d", auditCnt)
	}
}

func TestIssuePassGuards(t *testing.T) {
	svc, _ := testSvcFull(t)
	m, app := submittedMission(t, svc)
	ctx := context.Background()
	// 非 APPROVED → 3004
	if _, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN"}); codeOf(err) != errcode.MissionState {
		t.Fatalf("unapproved: want 3004, got %v", err)
	}
	// 缺参 / 任务不存在 → 6002
	if _, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID}); codeOf(err) != errcode.Param {
		t.Fatalf("missing issuer: want 6002, got %v", err)
	}
	if _, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: "MISSION-NOPE", Issuer: "FISCO-ADMIN"}); codeOf(err) != errcode.Param {
		t.Fatalf("unknown mission: want 6002, got %v", err)
	}
	if _, _, _, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN"}); err != nil {
		t.Fatalf("approve: %v", err)
	}
	// 窗口非法 → 6002
	if _, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN",
		ValidFrom: "bogus"}); codeOf(err) != errcode.Param {
		t.Fatalf("bad format: want 6002, got %v", err)
	}
	if _, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN",
		ValidFrom: "2026-09-12 10:00:00", ValidTo: "2026-09-12 09:00:00"}); codeOf(err) != errcode.Param {
		t.Fatalf("inverted window: want 6002, got %v", err)
	}
	// 自定义窗口生效
	p, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN",
		ValidFrom: "2026-09-12 09:30:00", ValidTo: "2026-09-12 10:30:00"})
	if err != nil {
		t.Fatalf("custom window: %v", err)
	}
	if timex.FormatTime(p.ValidFrom) != "2026-09-12 09:30:00.000" {
		t.Errorf("valid_from = %q", timex.FormatTime(p.ValidFrom))
	}
	// 同 pass_id 再签发（已 VALID）→ 3002
	if _, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{PassID: p.PassID, MissionID: m.MissionID, Issuer: "FISCO-ADMIN"}); codeOf(err) != errcode.PassInvalid {
		t.Fatalf("re-issue: want 3002, got %v", err)
	}
	// 显式新 pass_id 合法（同任务多许可）
	p2, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{PassID: "PASS-2026-077", MissionID: m.MissionID, Issuer: "FISCO-ADMIN"})
	if err != nil || p2.PassID != "PASS-2026-077" || p2.Status != "VALID" {
		t.Fatalf("explicit id: %+v err=%v", p2, err)
	}
}

func TestIssuePassFailureRetry(t *testing.T) {
	sims := defaultTestSims()
	sims["fabric"] = sim.New("fabric", sim.WithFailNext("RecordPass", 1)) // 仅 pass 目标步使用
	svc, db := testSvcWith(t, sims)
	m := approvedMission(t, svc)
	ctx := context.Background()
	p, tx, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN"})
	if codeOf(err) != errcode.TargetChain {
		t.Fatalf("want 2002, got %v", err)
	}
	if p == nil || p.Status != "GENERATING" {
		t.Fatalf("failed issue must stay GENERATING: %+v", p)
	}
	if tx == nil || tx.Status != "FAILED" || tx.TargetChainTxID != "" {
		t.Fatalf("tx = %+v", tx)
	}
	// 重试：同 pass_id → 复用 FAILED 记录已确认的源链 TxID → 成功
	p2, tx2, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{PassID: p.PassID, MissionID: m.MissionID, Issuer: "FISCO-ADMIN"})
	if err != nil {
		t.Fatalf("retry: %v", err)
	}
	if p2.Status != "VALID" || tx2.Status != "SUCCESS" {
		t.Fatalf("retry result: pass=%+v tx=%+v", p2, tx2)
	}
	if tx2.SourceChainTxID != tx.SourceChainTxID {
		t.Errorf("retry must reuse source tx: %q vs %q", tx2.SourceChainTxID, tx.SourceChainTxID)
	}
	var cnt int64
	db.Model(&model.CrosschainTx{}).Where("message_type = ? AND business_id = ?", "FLIGHT_PASS", p.PassID).Count(&cnt)
	if cnt != 2 {
		t.Errorf("want FAILED+SUCCESS rows, got %d", cnt)
	}
}

func TestVerifyPassLifecycle(t *testing.T) {
	svc, db := testSvcFull(t)
	m := approvedMission(t, svc)
	ctx := context.Background()
	vf, vt := nowWindow()
	p, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN", ValidFrom: vf, ValidTo: vt})
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	// 有效
	valid, reasons, got, err := svc.VerifyPass(ctx, "TRACE-T", p.PassID)
	if err != nil || !valid || len(reasons) != 0 || got.Status != "VALID" {
		t.Fatalf("verify = %v %v %+v err=%v", valid, reasons, got, err)
	}
	// 篡改 route → SM3/SM9 失配，code 0 + valid=false
	db.Model(&model.FlightPass{}).Where("pass_id = ?", p.PassID).Update("route", `["R999"]`)
	valid, reasons, _, err = svc.VerifyPass(ctx, "TRACE-T", p.PassID)
	if err != nil || valid {
		t.Fatalf("tampered must be invalid: %v %v err=%v", valid, reasons, err)
	}
	if !strings.Contains(strings.Join(reasons, ";"), "SM3") {
		t.Errorf("reasons must include SM3: %v", reasons)
	}
	// 还原 → 重新有效（重算一致性）
	db.Model(&model.FlightPass{}).Where("pass_id = ?", p.PassID).Update("route", p.Route)
	if valid, reasons, _, err = svc.VerifyPass(ctx, "TRACE-T", p.PassID); err != nil || !valid {
		t.Fatalf("restored: %v %v err=%v", valid, reasons, err)
	}
	// 过期窗口 → 签发后自动 EXPIRED
	past := PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN",
		ValidFrom: timex.FormatTime(timex.Now().Add(-2 * time.Hour)), ValidTo: timex.FormatTime(timex.Now().Add(-time.Hour))}
	pe, _, err := svc.IssuePass(ctx, "TRACE-T", past)
	if err != nil {
		t.Fatalf("issue past-window: %v", err)
	}
	valid, reasons, got, err = svc.VerifyPass(ctx, "TRACE-T", pe.PassID)
	if err != nil || valid || got.Status != "EXPIRED" {
		t.Fatalf("expired: %v %v %+v err=%v", valid, reasons, got, err)
	}
	if !strings.Contains(strings.Join(reasons, ";"), "过期") {
		t.Errorf("reasons must mention expiry: %v", reasons)
	}
	// 未来窗口 → VALID 但"未到生效时间"
	fut := PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN",
		ValidFrom: timex.FormatTime(timex.Now().Add(time.Hour)), ValidTo: timex.FormatTime(timex.Now().Add(2 * time.Hour))}
	pf, _, err := svc.IssuePass(ctx, "TRACE-T", fut)
	if err != nil {
		t.Fatalf("issue future-window: %v", err)
	}
	valid, reasons, got, err = svc.VerifyPass(ctx, "TRACE-T", pf.PassID)
	if err != nil || valid || got.Status != "VALID" || !strings.Contains(strings.Join(reasons, ";"), "未到生效时间") {
		t.Fatalf("future: %v %v %+v err=%v", valid, reasons, got, err)
	}
	// 裸 GENERATING 记录 → 未生效 reason
	raw := model.FlightPass{PassID: "PASS-2026-099", MissionID: m.MissionID, UAVID: m.UAVID,
		Route: m.RouteSegments, ValidFrom: timex.Now(), ValidTo: timex.Now().Add(time.Hour), Status: "GENERATING"}
	if err := db.Create(&raw).Error; err != nil {
		t.Fatal(err)
	}
	valid, reasons, got, err = svc.VerifyPass(ctx, "TRACE-T", raw.PassID)
	if err != nil || valid || got.Status != "GENERATING" || len(reasons) != 1 {
		t.Fatalf("generating: %v %v %+v err=%v", valid, reasons, got, err)
	}
	// 不存在 / 空 → 6002
	if _, _, _, err := svc.VerifyPass(ctx, "TRACE-T", "PASS-NOPE"); codeOf(err) != errcode.Param {
		t.Fatalf("unknown: want 6002, got %v", err)
	}
	if _, _, _, err := svc.VerifyPass(ctx, "TRACE-T", ""); codeOf(err) != errcode.Param {
		t.Fatalf("empty: want 6002, got %v", err)
	}
}

func TestRevokePassLocalFirst(t *testing.T) {
	ctx := context.Background()
	// 成功路径
	svc, _ := testSvcFull(t)
	m := approvedMission(t, svc)
	vf, vt := nowWindow()
	p, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN", ValidFrom: vf, ValidTo: vt})
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	got, csStatus, tx, err := svc.RevokePass(ctx, "TRACE-T", p.PassID, "气象突变", "FISCO-ADMIN")
	if err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if got.Status != "REVOKED" || csStatus != "SUCCESS" {
		t.Fatalf("revoke = %+v %q", got, csStatus)
	}
	if tx.Status != "SUCCESS" || tx.MessageType != "PASS_REVOKE" || !strings.HasPrefix(tx.TargetChainTxID, "FABRIC-") {
		t.Fatalf("tx = %+v", tx)
	}
	// 重复吊销 / 不存在 / 缺参
	if _, _, _, err := svc.RevokePass(ctx, "TRACE-T", p.PassID, "again", "FISCO-ADMIN"); codeOf(err) != errcode.PassInvalid {
		t.Fatalf("re-revoke: want 3002, got %v", err)
	}
	if _, _, _, err := svc.RevokePass(ctx, "TRACE-T", "PASS-NOPE", "x", "FISCO-ADMIN"); codeOf(err) != errcode.Param {
		t.Fatalf("unknown: want 6002, got %v", err)
	}
	if _, _, _, err := svc.RevokePass(ctx, "TRACE-T", p.PassID, "", "FISCO-ADMIN"); codeOf(err) != errcode.Param {
		t.Fatalf("missing reason: want 6002, got %v", err)
	}
	// 跨链失败 → 本地吊销仍生效（安全优先），code 0 + FAILED
	sims := defaultTestSims()
	sims["fabric"] = sim.New("fabric", sim.WithFailNext("RecordPassRevoke", 1))
	svc2, _ := testSvcWith(t, sims)
	m2 := approvedMission(t, svc2)
	p2, _, err := svc2.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m2.MissionID, Issuer: "FISCO-ADMIN", ValidFrom: vf, ValidTo: vt})
	if err != nil {
		t.Fatalf("issue2: %v", err)
	}
	got2, csStatus2, tx2, err := svc2.RevokePass(ctx, "TRACE-T", p2.PassID, "空域临时管制", "FISCO-ADMIN")
	if err != nil {
		t.Fatalf("revoke must not fail locally: %v", err)
	}
	if got2.Status != "REVOKED" || csStatus2 != "FAILED" || tx2 == nil || tx2.Status != "FAILED" {
		t.Fatalf("degraded revoke = %+v %q %+v", got2, csStatus2, tx2)
	}
}

func TestQueryAndListPass(t *testing.T) {
	svc, _ := testSvcFull(t)
	m := approvedMission(t, svc)
	ctx := context.Background()
	p1, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{MissionID: m.MissionID, Issuer: "FISCO-ADMIN"})
	if err != nil {
		t.Fatalf("issue p1: %v", err)
	}
	p2, _, err := svc.IssuePass(ctx, "TRACE-T", PassIssueInput{PassID: "PASS-2026-077", MissionID: m.MissionID, Issuer: "FISCO-ADMIN"})
	if err != nil {
		t.Fatalf("issue p2: %v", err)
	}
	if _, _, _, err := svc.RevokePass(ctx, "TRACE-T", p2.PassID, "计划变更", "FISCO-ADMIN"); err != nil {
		t.Fatalf("revoke p2: %v", err)
	}
	got, err := svc.QueryPass(ctx, "TRACE-T", p1.PassID)
	if err != nil || got.PassID != p1.PassID || got.Status != "VALID" {
		t.Fatalf("query = %+v err=%v", got, err)
	}
	if _, err := svc.QueryPass(ctx, "TRACE-T", "PASS-NOPE"); codeOf(err) != errcode.Param {
		t.Fatalf("query unknown: want 6002, got %v", err)
	}
	list, total, err := svc.ListPass(ctx, "TRACE-T", PassListFilter{})
	if err != nil || total != 2 || len(list) != 2 {
		t.Fatalf("list all = %d/%d err=%v", len(list), total, err)
	}
	if list[0].PassID != p2.PassID { // created_at DESC → 后建在前
		t.Errorf("order = %q then %q", list[0].PassID, list[1].PassID)
	}
	if _, total, _ := svc.ListPass(ctx, "TRACE-T", PassListFilter{MissionID: m.MissionID}); total != 2 {
		t.Errorf("mission filter total = %d", total)
	}
	if _, total, _ := svc.ListPass(ctx, "TRACE-T", PassListFilter{UAVID: m.UAVID}); total != 2 {
		t.Errorf("uav filter total = %d", total)
	}
	if _, total, _ := svc.ListPass(ctx, "TRACE-T", PassListFilter{Status: "VALID"}); total != 1 {
		t.Errorf("VALID total = %d", total)
	}
	if _, total, _ := svc.ListPass(ctx, "TRACE-T", PassListFilter{Status: "REVOKED"}); total != 1 {
		t.Errorf("REVOKED total = %d", total)
	}
	page, total, err := svc.ListPass(ctx, "TRACE-T", PassListFilter{Page: 2, PageSize: 1})
	if err != nil || total != 2 || len(page) != 1 || page[0].PassID != p1.PassID {
		t.Fatalf("page2 = %+v/%d err=%v", page, total, err)
	}
	if d, _, _ := svc.ListPass(ctx, "TRACE-T", PassListFilter{Page: 0, PageSize: 0}); len(d) != 2 {
		t.Errorf("defaults must normalize: %d", len(d))
	}
}
