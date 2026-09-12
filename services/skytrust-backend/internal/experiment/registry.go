package experiment

import (
	"context"
	"sort"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// RunContext Setup 铺设的共享上下文：迭代 worker 并发只读；未用到的字段留空。
type RunContext struct {
	SessionID       string
	MissionID       string
	AuthorizationID string
}

// Executor 一类实验的执行骨架。Setup 调一次（返回 error → FAILED 行 + 6001，P5-R3）；
// Iter 对每个下标 i（0..Count-1）各调一次，可能并发执行：返回 nil = 该次迭代成功；
// 返回 error = 失败（*errcode.Error 按错误码记入 failure_reasons，其余记 INTERNAL，P5-R2）。
type Executor struct {
	Scenarios []string // 合法 scenario 集合；空 = 该类型不接受 scenario（P5-R5 双向严格）
	Setup     func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error)
	Iter      func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error
}

// registry 11 类实验注册表（唯一真源）。裁定记录：spec 文字"10 组实验"为名义值，
// 以分解 4(系统一)+3(系统二)+1(压力)+4(系统三) = 11 类为准。
// MESSAGE_FLOW/RISK_SCAN/STRESS 由 Task 4 替换、S3 四类由 Task 5 替换（届时删除 newPending）。
var registry = map[string]func() *Executor{
	// 系统一（本任务）
	"CROSSCHAIN_LOOP": newCrosschainLoop,
	"SM3_INTEGRITY":   newSM3Integrity,
	"SM9_VERIFY":      newSM9Verify,
	"CONFLICT_DETECT": newConflictDetect,
	// 系统二（Task 4 替换；占位声明 scenario 集合供 Validate）
	"MESSAGE_FLOW": newPending("NORMAL", "ATTACK", "DEFENSE"),
	"RISK_SCAN":    newPending(),
	"STRESS":       newPending(),
	// 系统三（Task 5 替换）
	"TRACE_BATCH":          newPending(),
	"INSPECT_UNAUTHORIZED": newPending(),
	"INSPECT_AUTHORIZED":   newPending(),
	"ALERT_BATCH":          newPending(),
}

// newPending 未实现类型占位：Setup 即失败 → FAILED 行 + 6001（Validate 已可全量生效）。
func newPending(scenarios ...string) func() *Executor {
	return func() *Executor {
		return &Executor{
			Scenarios: scenarios,
			Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
				return nil, errcode.NewError(errcode.Experiment, "experiment %s not implemented yet", run.ExperimentType)
			},
		}
	}
}

// ValidTypes 11 个合法 experiment_type（排序；供校验文案与 Apifox 文档）。
func ValidTypes() []string {
	out := make([]string, 0, len(registry))
	for k := range registry {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func executorFor(experimentType string) (*Executor, bool) {
	f, ok := registry[experimentType]
	if !ok {
		return nil, false
	}
	return f(), true
}

// traceOf 实验内部调用统一 traceID：审计链路挂同一前缀便于检索。
func traceOf(run *model.ExperimentRun) string { return "TRACE-EXP-" + run.RunID }
