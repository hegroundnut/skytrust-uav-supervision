package uavbusiness

import (
	"context"
	"strings"
	"testing"

	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// submittedMission 铺设一台 VERIFIED UAV + OPEN 航路 + SUBMITTED 任务，返回任务与申请。
func submittedMission(t *testing.T, svc *Service) (*model.Mission, *model.MissionApplication) {
	t.Helper()
	ctx := context.Background()
	seedMissionEnv(t, svc)
	m, err := svc.CreateMission(ctx, "TRACE-T", baseMissionInput())
	if err != nil {
		t.Fatalf("create mission: %v", err)
	}
	app, _, err := svc.SubmitMission(ctx, "TRACE-T", m.MissionID, "Operator-O1")
	if err != nil {
		t.Fatalf("submit mission: %v", err)
	}
	return m, app
}

func TestSubmitReviewApproveFlow(t *testing.T) {
	svc, db := testSvcFull(t)
	m, app := submittedMission(t, svc)
	ctx := context.Background()
	rev, gotM, tx, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{
		ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN",
		Comment: "同意执行", RulesHit: []string{"R-ALT-001", "R-ZONE-002"},
	})
	if err != nil {
		t.Fatalf("review: %v", err)
	}
	if rev.ReviewID == "" || rev.Result != "APPROVED" || rev.RulesHit != `["R-ALT-001","R-ZONE-002"]` {
		t.Fatalf("review = %+v", rev)
	}
	if gotM.Status != "APPROVED" {
		t.Fatalf("mission = %q", gotM.Status)
	}
	if tx.Status != "SUCCESS" || tx.MessageType != crosschain.MsgMissionReviewResult {
		t.Fatalf("tx = %+v", tx)
	}
	if !strings.HasPrefix(tx.SourceChainTxID, "FISCO-BCOS-") {
		t.Errorf("gateway must auto-submit source tx on fisco-bcos: %q", tx.SourceChainTxID)
	}
	var appReload model.MissionApplication
	if err := db.Where("application_id = ?", app.ApplicationID).First(&appReload).Error; err != nil {
		t.Fatal(err)
	}
	if appReload.Status != "APPROVED" {
		t.Errorf("application status = %q", appReload.Status)
	}
	var mReload model.Mission
	db.Where("mission_id = ?", m.MissionID).First(&mReload)
	if mReload.Status != "APPROVED" {
		t.Errorf("persisted mission = %q", mReload.Status)
	}
}

func TestSubmitReviewValidation(t *testing.T) {
	svc, db := testSvcFull(t)
	_, app := submittedMission(t, svc)
	ctx := context.Background()
	// 申请不存在 → 3003
	if _, _, _, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: "APP-NOPE", Result: "APPROVED", Reviewer: "FISCO-ADMIN"}); codeOf(err) != errcode.ReviewRule {
		t.Errorf("unknown app: want 3003, got %v", err)
	}
	// result 非法 → 3003
	if _, _, _, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "MAYBE", Reviewer: "FISCO-ADMIN"}); codeOf(err) != errcode.ReviewRule {
		t.Errorf("bad result: want 3003, got %v", err)
	}
	// 缺参 → 6002
	if _, _, _, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "APPROVED"}); codeOf(err) != errcode.Param {
		t.Errorf("missing reviewer: want 6002, got %v", err)
	}
	// FAILED 申请不可审核 → 3003
	db.Model(&model.MissionApplication{}).Where("application_id = ?", app.ApplicationID).Update("status", "FAILED")
	if _, _, _, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN"}); codeOf(err) != errcode.ReviewRule {
		t.Errorf("failed app: want 3003, got %v", err)
	}
	db.Model(&model.MissionApplication{}).Where("application_id = ?", app.ApplicationID).Update("status", "RELAYED")
	// 正常通过后再审 → 3004（任务已 APPROVED）
	if _, _, _, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN"}); err != nil {
		t.Fatalf("first review: %v", err)
	}
	// 简报测试构造缺陷修正（断言逐字保留）：首次审核成功后申请状态已被置为 APPROVED，
	// 按业务规则"申请状态非 PENDING|SENT|RELAYED → 3003"，该检查先于任务状态检查命中，
	// 返回 3003 而非本断言目标的 3004。将申请复位 RELAYED（与上方 FAILED→RELAYED 复位
	// 同法），隔离出"任务状态非 SUBMITTED|REVIEWING → 3004（任务已 APPROVED）"被测路径。
	db.Model(&model.MissionApplication{}).Where("application_id = ?", app.ApplicationID).Update("status", "RELAYED")
	if _, _, _, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "REJECTED", Reviewer: "FISCO-ADMIN"}); codeOf(err) != errcode.MissionState {
		t.Errorf("re-review approved mission: want 3004, got %v", err)
	}
}

func TestSubmitReviewRejectAndCoordination(t *testing.T) {
	ctx := context.Background()
	// REJECTED → 任务 REJECTED
	svc1, _ := testSvcFull(t)
	_, app1 := submittedMission(t, svc1)
	_, m1, _, err := svc1.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app1.ApplicationID, Result: "REJECTED", Reviewer: "FISCO-ADMIN", Comment: "窗口与管制冲突"})
	if err != nil || m1.Status != "REJECTED" {
		t.Fatalf("reject: mission=%v err=%v", m1.Status, err)
	}
	// NEED_COORDINATION → 任务 COORDINATING
	svc2, _ := testSvcFull(t)
	_, app2 := submittedMission(t, svc2)
	_, m2, _, err := svc2.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app2.ApplicationID, Result: "NEED_COORDINATION", Reviewer: "FISCO-ADMIN"})
	if err != nil || m2.Status != "COORDINATING" {
		t.Fatalf("coordination: mission=%v err=%v", m2.Status, err)
	}
}

func TestSubmitReviewCrosschainFailureRetryable(t *testing.T) {
	sims := defaultTestSims()
	// 目标链 fabric 的 RecordReview 首调必败（不影响注册/申请路径）
	sims["fabric"] = sim.New("fabric", sim.WithFailNext("RecordReview", 1))
	svc, db := testSvcWith(t, sims)
	_, app := submittedMission(t, svc)
	ctx := context.Background()
	rev, m, tx, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN"})
	if codeOf(err) != errcode.TargetChain {
		t.Fatalf("want 2002, got %v", err)
	}
	if m.Status != "REVIEWING" { // 失败不得迁移终态（强制原则 4）
		t.Fatalf("mission = %q, want REVIEWING", m.Status)
	}
	if tx == nil || tx.Status != "FAILED" || rev == nil || rev.ReviewID == "" {
		t.Fatalf("rev=%+v tx=%+v", rev, tx)
	}
	// 重试：链已恢复，新 review_id
	rev2, m2, tx2, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN"})
	if err != nil {
		t.Fatalf("retry: %v", err)
	}
	if rev2.ReviewID == rev.ReviewID {
		t.Error("retry must create a new review_id")
	}
	if m2.Status != "APPROVED" || tx2.Status != "SUCCESS" {
		t.Fatalf("after retry: mission=%s tx=%s", m2.Status, tx2.Status)
	}
	var cnt int64
	db.Model(&model.ReviewRecord{}).Where("application_id = ?", app.ApplicationID).Count(&cnt)
	if cnt != 2 { // 两次裁决均留痕
		t.Errorf("want 2 review rows, got %d", cnt)
	}
}

func TestQueryReview(t *testing.T) {
	svc, _ := testSvcFull(t)
	_, app := submittedMission(t, svc)
	ctx := context.Background()
	rev, _, _, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN"})
	if err != nil {
		t.Fatalf("review: %v", err)
	}
	single, list, err := svc.QueryReview(ctx, "TRACE-T", rev.ReviewID, "")
	if err != nil || single == nil || single.ReviewID != rev.ReviewID || list != nil {
		t.Fatalf("query by id: %+v %v err=%v", single, list, err)
	}
	single, list, err = svc.QueryReview(ctx, "TRACE-T", "", app.ApplicationID)
	if err != nil || single != nil || len(list) != 1 {
		t.Fatalf("query by app: %+v %d err=%v", single, len(list), err)
	}
	if _, _, err := svc.QueryReview(ctx, "TRACE-T", "", ""); codeOf(err) != errcode.Param {
		t.Fatalf("neither: want 6002, got %v", err)
	}
	if _, _, err := svc.QueryReview(ctx, "TRACE-T", "REV-NOPE", ""); codeOf(err) != errcode.Param {
		t.Fatalf("unknown id: want 6002, got %v", err)
	}
}
