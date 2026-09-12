package experiment

import (
	"encoding/json"
	"errors"
	"sort"
	"strconv"
	"sync"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/offchain"
	"skytrust-backend/internal/timex"
)

// recorder 迭代记录器：worker 池并发安全（互斥保护），收集全部迭代的时延与
// 失败原因（P5-R2：统计覆盖所有迭代，不只成功样本）。
type recorder struct {
	mu        sync.Mutex
	latencies []int64
	success   int
	reasons   map[string]int
}

func newRecorder() *recorder { return &recorder{reasons: map[string]int{}} }

// record 单次迭代落账：err == nil 记成功；否则按错误码归入 failure_reasons。
func (r *recorder) record(latencyMs int64, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.latencies = append(r.latencies, latencyMs)
	if err == nil {
		r.success++
		return
	}
	r.reasons[failReason(err)]++
}

// failReason 失败原因键（P5-R2）：业务错误 → strconv.Itoa(errcode)（errors.As
// 解包 wrap）；其余（含纯内部错误）→ "INTERNAL"。
func failReason(err error) string {
	var e *errcode.Error
	if errors.As(err, &e) {
		return strconv.Itoa(e.Code)
	}
	return "INTERNAL"
}

// fill 统计填充（P5-R2）：success_rate 为原始浮点 0..1；P50/P95 复用
// offchain.Percentile（nearest-rank，p 为分数）；failure_reasons 序列化为 JSON map。
// 置 Status=DONE + CompletedAt。
func (r *recorder) fill(run *model.ExperimentRun) {
	r.mu.Lock()
	defer r.mu.Unlock()
	run.SuccessCount = r.success
	run.FailedCount = run.Count - r.success
	if run.Count > 0 {
		run.SuccessRate = float64(r.success) / float64(run.Count)
	}
	sorted := append([]int64(nil), r.latencies...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
	if len(sorted) > 0 {
		var sum int64
		for _, v := range sorted {
			sum += v
		}
		run.AvgLatencyMs = float64(sum) / float64(len(sorted))
		run.P50LatencyMs = float64(offchain.Percentile(sorted, 0.5))
		run.P95LatencyMs = float64(offchain.Percentile(sorted, 0.95))
		run.MaxLatencyMs = float64(sorted[len(sorted)-1])
	}
	b, err := json.Marshal(r.reasons)
	if err != nil {
		b = []byte("{}")
	}
	run.FailureReasons = string(b)
	run.Status = "DONE"
	run.CompletedAt = timex.NowT()
}
