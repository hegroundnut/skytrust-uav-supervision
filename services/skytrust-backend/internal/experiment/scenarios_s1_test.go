package experiment

import (
	"context"
	"testing"

	"skytrust-backend/internal/model"
)

// TestRunSM3Integrity S1-2：8 次迭代 4 并发全成 → DONE、rate=1、审计恰 1。
func TestRunSM3Integrity(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "SM3_INTEGRITY", Count: 8, Concurrency: 4})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 8 || run.SuccessRate != 1 || run.FailureReasons != "{}" {
		t.Fatalf("run = %+v", run)
	}
	if run.ExperimentID == "" || run.RunID == "" || run.StartedAt.IsZero() || run.CompletedAt.IsZero() {
		t.Errorf("row identity/time incomplete: %+v", run)
	}
	if run.MaxLatencyMs < run.P50LatencyMs {
		t.Errorf("max %v < p50 %v", run.MaxLatencyMs, run.P50LatencyMs)
	}
	var audCnt int64
	svc.db.Model(&model.AuditLog{}).Where("action = ?", "EXPERIMENT_RUN").Count(&audCnt)
	if audCnt != 1 {
		t.Errorf("EXPERIMENT_RUN audit = %d, want 1", audCnt)
	}
}

// TestRunSM9Verify S1-3：签验往返 5 次全成。
func TestRunSM9Verify(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "SM9_VERIFY", Count: 5, Concurrency: 2})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 5 || run.SuccessRate != 1 {
		t.Fatalf("run = %+v", run)
	}
}

// TestRunCrosschainLoop S1-1：3 次完整 13 步跨链（业务 ID 以 RunID 去重）全部 SUCCESS。
func TestRunCrosschainLoop(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "CROSSCHAIN_LOOP", Count: 3, Concurrency: 2})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 3 || run.SuccessRate != 1 {
		t.Fatalf("run = %+v", run)
	}
	var txCnt, okCnt int64
	svc.db.Model(&model.CrosschainTx{}).Where("business_id LIKE ?", "EXP-"+run.RunID+"-%").Count(&txCnt)
	svc.db.Model(&model.CrosschainTx{}).Where("business_id LIKE ? AND status = ?", "EXP-"+run.RunID+"-%", "SUCCESS").Count(&okCnt)
	if txCnt != 3 || okCnt != 3 {
		t.Fatalf("crosschain rows = %d (success %d), want 3/3", txCnt, okCnt)
	}
}

// TestRunConflictDetect S1-4：铺设两个三维重叠 SUBMITTED 任务后重复检测——
// 冲突幂等复用（OPEN 恰 1 条），主动方进入 COORDINATING。
func TestRunConflictDetect(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "CONFLICT_DETECT", Count: 4})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 4 || run.SuccessRate != 1 {
		t.Fatalf("run = %+v", run)
	}
	var openCnt int64
	svc.db.Model(&model.ConflictRecord{}).Where("status = ?", "OPEN").Count(&openCnt)
	if openCnt != 1 {
		t.Errorf("OPEN conflicts = %d, want 1 (idempotent reuse)", openCnt)
	}
	var m model.Mission
	if err := svc.db.Where("mission_id = ?", "MISSION-EXP-"+run.RunID+"-B").First(&m).Error; err != nil {
		t.Fatalf("mission B: %v", err)
	}
	if m.Status != "COORDINATING" {
		t.Errorf("mission B status = %q, want COORDINATING", m.Status)
	}
}
