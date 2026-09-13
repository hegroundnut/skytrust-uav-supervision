package experiment

import (
	"context"
	"errors"
	"strings"
	"testing"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/demo"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/offchain"
	"skytrust-backend/internal/regulatory"
	"skytrust-backend/internal/uavbusiness"
)

// newTestSvc 全接线夹具（与 tests/bootServerS1 同构：:memory: + 零延迟三模拟链 +
// 网关 + 三业务服务 + seeder；不起 HTTP）。
func newTestSvc(t *testing.T) *Service {
	t.Helper()
	db, err := model.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	if err := model.Migrate(db); err != nil {
		t.Fatal(err)
	}
	cs, err := crypto.NewService(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	chains := map[string]*sim.Chain{
		"fabric": sim.New("fabric"), "chainmaker": sim.New("chainmaker"), "fisco-bcos": sim.New("fisco-bcos"),
	}
	adapters := make(map[string]chainadapter.ChainAdapter, len(chains))
	for name, c := range chains {
		adapters[name] = c
	}
	auditSvc := audit.New(db)
	gw := crosschain.NewGateway(db, cs, adapters, auditSvc)
	biz := uavbusiness.New(db, cs, gw, auditSvc)
	off := offchain.New(db, cs, auditSvc)
	reg := regulatory.New(db, cs, gw, auditSvc)
	resets := make(map[string]chainadapter.Resettable, len(chains))
	for name, c := range chains {
		resets[name] = c
	}
	return New(db, cs, gw, biz, off, reg, auditSvc, demo.NewSeeder(db, cs, resets))
}

func codeOf(err error) int {
	var e *errcode.Error
	if errors.As(err, &e) {
		return e.Code
	}
	return -1
}

// TestRunRequestValidate P5-R1/R5：类型/count/scenario 双向严格/concurrency clamp。
func TestRunRequestValidate(t *testing.T) {
	if err := (&RunRequest{ExperimentType: "SM3_INTEGRITY", Count: 10}).Validate(); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}
	c0 := &RunRequest{ExperimentType: "SM9_VERIFY", Count: 1, Concurrency: 0}
	if err := c0.Validate(); err != nil || c0.Concurrency != 1 {
		t.Errorf("clamp low: conc=%d err=%v", c0.Concurrency, err)
	}
	c9 := &RunRequest{ExperimentType: "SM9_VERIFY", Count: 1, Concurrency: 99}
	if err := c9.Validate(); err != nil || c9.Concurrency != 20 {
		t.Errorf("clamp high: conc=%d err=%v", c9.Concurrency, err)
	}
	c7 := &RunRequest{ExperimentType: "SM9_VERIFY", Count: 1, Concurrency: 7}
	if err := c7.Validate(); err != nil || c7.Concurrency != 7 {
		t.Errorf("in-range conc changed: %d err=%v", c7.Concurrency, err)
	}
	bad := []struct {
		name string
		req  *RunRequest
	}{
		{"unknown type", &RunRequest{ExperimentType: "BOGUS", Count: 5}},
		{"count 0", &RunRequest{ExperimentType: "SM3_INTEGRITY", Count: 0}},
		{"count 1001", &RunRequest{ExperimentType: "SM3_INTEGRITY", Count: 1001}},
		{"scenario on scenario-less", &RunRequest{ExperimentType: "SM3_INTEGRITY", Count: 5, Scenario: "NORMAL"}},
		{"MESSAGE_FLOW empty scenario", &RunRequest{ExperimentType: "MESSAGE_FLOW", Count: 5}},
		{"MESSAGE_FLOW bogus scenario", &RunRequest{ExperimentType: "MESSAGE_FLOW", Count: 5, Scenario: "BOGUS"}},
	}
	for _, tc := range bad {
		if err := tc.req.Validate(); codeOf(err) != errcode.Param {
			t.Errorf("%s: want 6002, got %v", tc.name, err)
		}
	}
	if err := (&RunRequest{ExperimentType: "MESSAGE_FLOW", Count: 5, Scenario: "DEFENSE"}).Validate(); err != nil {
		t.Errorf("MESSAGE_FLOW/DEFENSE must validate: %v", err)
	}
}

// TestRunRejectsAndSetupFailure 校验失败 → 6002 且不落行；Setup 失败 → FAILED 行 +
// {"setup_error":1} + 6001 + EXPERIMENT_RUN 审计（P5-R3；controller 裁定：11 类全部
// 实装后无天然 setup 失败，改由测试专用探针类型 SETUP_FAIL_PROBE 触发）。
func TestRunRejectsAndSetupFailure(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	// controller 裁定（Task 4）：MESSAGE_FLOW 实装后 NORMAL setup 会成功，占位触发失效。
	// 注册测试专用探针（Setup 恒败），用后即删，不影响 ValidTypes 与其他测试。
	registry["SETUP_FAIL_PROBE"] = func() *Executor {
		return &Executor{
			Scenarios: []string{"PROBE"},
			Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
				return nil, errcode.NewError(errcode.Experiment, "probe setup failure")
			},
		}
	}
	defer delete(registry, "SETUP_FAIL_PROBE")
	if _, err := svc.Run(ctx, "TRACE-T", &RunRequest{ExperimentType: "BOGUS", Count: 5}); codeOf(err) != errcode.Param {
		t.Fatalf("bogus type: want 6002, got %v", err)
	}
	if _, err := svc.Run(ctx, "TRACE-T", &RunRequest{ExperimentType: "SM3_INTEGRITY", Count: 0}); codeOf(err) != errcode.Param {
		t.Fatalf("count 0: want 6002, got %v", err)
	}
	var cnt int64
	svc.db.Model(&model.ExperimentRun{}).Count(&cnt)
	if cnt != 0 {
		t.Fatalf("validation failures must not create rows, got %d", cnt)
	}

	run, err := svc.Run(ctx, "TRACE-T", &RunRequest{ExperimentType: "SETUP_FAIL_PROBE", Scenario: "PROBE", Count: 3})
	if codeOf(err) != errcode.Experiment {
		t.Fatalf("setup failure: want 6001, got %v", err)
	}
	if run == nil || run.Status != "FAILED" || run.FailureReasons != `{"setup_error":1}` {
		t.Fatalf("failed row = %+v", run)
	}
	got, rerr := svc.Result(ctx, run.RunID)
	if rerr != nil || got.Status != "FAILED" {
		t.Fatalf("result of failed run = %+v err=%v", got, rerr)
	}
	var audCnt int64
	svc.db.Model(&model.AuditLog{}).Where("action = ?", "EXPERIMENT_RUN").Count(&audCnt)
	if audCnt != 1 {
		t.Fatalf("EXPERIMENT_RUN audit = %d, want 1", audCnt)
	}
}

// TestResultListExport Result 往返 + 6002；List 过滤/契约；ExportCSV 表头与行。
func TestResultListExport(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	run, err := svc.Run(ctx, "TRACE-T", &RunRequest{ExperimentType: "SM3_INTEGRITY", Count: 5})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	got, err := svc.Result(ctx, run.RunID)
	if err != nil || got.Status != "DONE" || got.Count != 5 || got.SuccessCount != 5 || got.SuccessRate != 1 {
		t.Fatalf("result = %+v err=%v", got, err)
	}
	if got.FailureReasons != "{}" {
		t.Errorf("failure_reasons = %q, want {}", got.FailureReasons)
	}
	if _, err := svc.Result(ctx, "RUN-NOPE"); codeOf(err) != errcode.Param {
		t.Errorf("unknown run: want 6002, got %v", err)
	}
	if _, err := svc.Result(ctx, ""); codeOf(err) != errcode.Param {
		t.Errorf("empty run_id: want 6002, got %v", err)
	}

	recs, total, err := svc.List(ctx, &ExperimentQuery{ExperimentType: "SM3_INTEGRITY"})
	if err != nil || total != 1 || len(recs) != 1 || recs[0].RunID != run.RunID {
		t.Fatalf("list by type = %v total=%d err=%v", recs, total, err)
	}
	if _, total, err = svc.List(ctx, &ExperimentQuery{Status: "DONE"}); err != nil || total != 1 {
		t.Errorf("list DONE total = %d err=%v", total, err)
	}
	if _, total, err = svc.List(ctx, &ExperimentQuery{Status: "FAILED"}); err != nil || total != 0 {
		t.Errorf("list FAILED total = %d err=%v", total, err)
	}

	content, rows, err := svc.ExportCSV(ctx, &ExperimentQuery{})
	if err != nil || rows != 1 {
		t.Fatalf("export = rows %d err=%v", rows, err)
	}
	lines := strings.Split(strings.TrimSpace(string(content)), "\n")
	if len(lines) != 2 {
		t.Fatalf("csv lines = %d, want 2", len(lines))
	}
	if lines[0] != strings.Join(exportHeader, ",") {
		t.Errorf("csv header = %q", lines[0])
	}
	if !strings.Contains(lines[1], run.RunID) {
		t.Errorf("csv row must carry run_id: %q", lines[1])
	}
}
