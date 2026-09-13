package experiment

import (
	"context"
	"testing"

	"skytrust-backend/internal/model"
)

// TestRunTraceBatch 两轮：首轮条件式铺设黄金线（create→submit→review→issue 显式
// goldenPassID，冻结演示 ID 与 demo seed 身份映射对齐），次轮 QueryPass 命中直接
// 复用——线不重复建，7 级追踪全解析。
func TestRunTraceBatch(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	run1, err := svc.Run(ctx, "TRACE-T", &RunRequest{ExperimentType: "TRACE_BATCH", Count: 5})
	if err != nil {
		t.Fatalf("run1: %v", err)
	}
	if run1.Status != "DONE" || run1.SuccessCount != 5 || run1.SuccessRate != 1 {
		t.Fatalf("run1 = %+v", run1)
	}
	var pass model.FlightPass
	if err := svc.db.Where("pass_id = ?", goldenPassID).First(&pass).Error; err != nil {
		t.Fatalf("golden pass: %v", err)
	}
	if pass.Status != "VALID" {
		t.Errorf("pass status = %s, want VALID", pass.Status)
	}
	run2, err := svc.Run(ctx, "TRACE-T", &RunRequest{ExperimentType: "TRACE_BATCH", Count: 3})
	if err != nil {
		t.Fatalf("run2: %v", err)
	}
	if run2.Status != "DONE" || run2.SuccessRate != 1 {
		t.Fatalf("run2 = %+v", run2)
	}
	var passCnt, missionCnt int64
	svc.db.Model(&model.FlightPass{}).Where("pass_id = ?", goldenPassID).Count(&passCnt)
	svc.db.Model(&model.Mission{}).Where("mission_id = ?", pass.MissionID).Count(&missionCnt)
	if passCnt != 1 || missionCnt != 1 {
		t.Errorf("golden thread duplicated: pass=%d mission=%d, want 1/1", passCnt, missionCnt)
	}
	var traceAud int64
	svc.db.Model(&model.AuditLog{}).Where("action = ?", "TRACE_IDENTITY").Count(&traceAud)
	if traceAud != 8 {
		t.Errorf("TRACE_IDENTITY audits = %d, want 8 (5+3)", traceAud)
	}
}

// TestRunInspectUnauthorized 5 次未授权核验全部 5002 封缄拒绝（= 成功）且逐次留痕。
func TestRunInspectUnauthorized(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "INSPECT_UNAUTHORIZED", Count: 5})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 5 || run.SuccessRate != 1 || run.FailureReasons != "{}" {
		t.Fatalf("run = %+v", run)
	}
	var audCnt int64
	svc.db.Model(&model.AuditLog{}).Where("action = ?", "INSPECT_UNAUTHORIZED").Count(&audCnt)
	if audCnt != 5 {
		t.Errorf("INSPECT_UNAUTHORIZED audits = %d, want 5", audCnt)
	}
	var regInsCnt int64
	svc.db.Model(&model.RegulatoryAudit{}).Where("action = ?", "INSPECT").Count(&regInsCnt)
	if regInsCnt != 0 {
		t.Errorf("unauthorized attempts must not write RegAudit INSPECT, got %d", regInsCnt)
	}
}

// TestRunInspectAuthorized 授权闭环（apply→APPROVE 上链）后 3 次授权核验全通过，
// RegAudit 落 3 条 INSPECT。
func TestRunInspectAuthorized(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "INSPECT_AUTHORIZED", Count: 3})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 3 || run.SuccessRate != 1 {
		t.Fatalf("run = %+v", run)
	}
	var authCnt int64
	svc.db.Model(&model.RegulatoryAuth{}).Where("status = ?", "AUTHORIZED").Count(&authCnt)
	if authCnt != 1 {
		t.Errorf("AUTHORIZED auths = %d, want 1", authCnt)
	}
	var insCnt int64
	svc.db.Model(&model.RegulatoryAudit{}).Where("action = ?", "INSPECT").Count(&insCnt)
	if insCnt != 3 {
		t.Errorf("RegAudit INSPECT = %d, want 3", insCnt)
	}
}

// TestRunAlertBatch 8 次并发告警登记：自动 ID 无碰撞、全部 OPEN、枚举字段如实落库。
func TestRunAlertBatch(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "ALERT_BATCH", Count: 8, Concurrency: 2})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 8 || run.SuccessRate != 1 {
		t.Fatalf("run = %+v", run)
	}
	var openCnt int64
	svc.db.Model(&model.SecurityEvent{}).
		Where("status = ? AND event_type = ? AND source_system = ?", "OPEN", "IDENTITY_ANOMALY", "MANUAL").
		Count(&openCnt)
	if openCnt != 8 {
		t.Errorf("OPEN IDENTITY_ANOMALY/MANUAL alerts = %d, want 8", openCnt)
	}
	var distinct int64
	svc.db.Model(&model.SecurityEvent{}).Distinct("alert_id").Count(&distinct)
	if distinct != 8 {
		t.Errorf("distinct alert_ids = %d, want 8", distinct)
	}
}
