package experiment

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// TestRecorderFillStats 并发记录 400 次迭代（时延 1..400 各恰一次）：
// 统计口径 = P5-R2（全量时延、原始浮点成功率、错误码 JSON 直方图、nearest-rank 分位）。
func TestRecorderFillStats(t *testing.T) {
	rec := newRecorder()
	run := &model.ExperimentRun{Count: 400}
	var wg sync.WaitGroup
	for w := 0; w < 8; w++ {
		wg.Add(1)
		go func(w int) {
			defer wg.Done()
			for k := 0; k < 50; k++ {
				i := w*50 + k
				var err error
				switch {
				case i%2 == 0:
					err = errcode.NewError(errcode.Param, "synthetic failure %d", i)
				case i == 399:
					err = errors.New("boom")
				}
				rec.record(int64(i+1), err)
			}
		}(w)
	}
	wg.Wait()
	rec.fill(run)

	if run.Status != "DONE" || run.CompletedAt.IsZero() {
		t.Fatalf("fill must close the run: %+v", run)
	}
	if run.SuccessCount != 199 || run.FailedCount != 201 {
		t.Errorf("counts = %d/%d, want 199/201", run.SuccessCount, run.FailedCount)
	}
	if run.SuccessRate != 199.0/400.0 {
		t.Errorf("success_rate = %v, want %v", run.SuccessRate, 199.0/400.0)
	}
	if run.AvgLatencyMs != 200.5 || run.MaxLatencyMs != 400 {
		t.Errorf("avg/max = %v/%v, want 200.5/400", run.AvgLatencyMs, run.MaxLatencyMs)
	}
	// nearest-rank：P50 = sorted[ceil(0.5*400)-1] = 200；P95 = sorted[ceil(0.95*400)-1] = 380
	if run.P50LatencyMs != 200 || run.P95LatencyMs != 380 {
		t.Errorf("p50/p95 = %v/%v, want 200/380", run.P50LatencyMs, run.P95LatencyMs)
	}
	var reasons map[string]int
	if err := json.Unmarshal([]byte(run.FailureReasons), &reasons); err != nil {
		t.Fatalf("failure_reasons %q: %v", run.FailureReasons, err)
	}
	if reasons["6002"] != 200 || reasons["INTERNAL"] != 1 {
		t.Errorf("reasons = %v, want 6002:200 INTERNAL:1", reasons)
	}
}

// TestFailReasonMapping P5-R2 键规则：业务错误码字符串（含 wrap 解包）；其余 INTERNAL。
func TestFailReasonMapping(t *testing.T) {
	if got := failReason(errcode.NewError(errcode.WormholeRisk, "x")); got != "4001" {
		t.Errorf("wormhole = %q, want 4001", got)
	}
	if got := failReason(fmt.Errorf("wrapped: %w", errcode.NewError(errcode.NoAuth, "x"))); got != "5002" {
		t.Errorf("wrapped = %q, want 5002", got)
	}
	if got := failReason(errors.New("plain")); got != "INTERNAL" {
		t.Errorf("plain = %q, want INTERNAL", got)
	}
}
