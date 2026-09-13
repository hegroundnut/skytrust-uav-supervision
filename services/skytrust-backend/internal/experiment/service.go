package experiment

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"log"
	"strconv"
	"sync"
	"time"

	"gorm.io/gorm"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/demo"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/offchain"
	"skytrust-backend/internal/regulatory"
	"skytrust-backend/internal/timex"
	"skytrust-backend/internal/uavbusiness"
)

// Service 实验编排服务：Run 驱动 worker 池执行注册表中的 Executor，
// 结果落 experiment_runs（P5-R3 行先行）；Result/List/ExportCSV 为只读查询。
type Service struct {
	db     *gorm.DB
	cs     *crypto.Service
	gw     *crosschain.Gateway
	biz    *uavbusiness.Service
	off    *offchain.Service
	reg    *regulatory.Service
	audit  *audit.Service
	seeder *demo.Seeder
}

func New(db *gorm.DB, cs *crypto.Service, gw *crosschain.Gateway, biz *uavbusiness.Service,
	off *offchain.Service, reg *regulatory.Service, auditSvc *audit.Service, seeder *demo.Seeder) *Service {
	return &Service{db: db, cs: cs, gw: gw, biz: biz, off: off, reg: reg, audit: auditSvc, seeder: seeder}
}

const (
	maxCount       = 1000 // P5-R1：count 必填 1..1000
	maxConcurrency = 20   // P5-R1：concurrency clamp 1..20
)

// statefulExperiments（F-1/P6-R8）：执行器在迭代间共享链上/会话状态，concurrency>1
// 会引发 seq/UNIQUE 竞态并污染 success_rate，Run 对其钳制串行。
// STRESS 每迭代独立 session、S1 密码实验无状态——保持可并发。
// INSPECT_AUTHORIZED 的"可安全并发"声明未经并发验证，保守钳制。
var statefulExperiments = map[string]bool{
	"MESSAGE_FLOW":       true,
	"CONFLICT_DETECT":    true,
	"INSPECT_AUTHORIZED": true,
}

// RunRequest 实验运行请求。Config 透传存行（预留，本计划不解释，P5-R1）。
type RunRequest struct {
	ExperimentType string         `json:"experiment_type"`
	Scenario       string         `json:"scenario"`
	Count          int            `json:"count"`
	Concurrency    int            `json:"concurrency"`
	Config         map[string]any `json:"config"`
}

// Validate P5-R1/R5：类型必须在注册表；count 必填 1..1000 否则 6002；scenario
// 双向严格（有场景集的类型必须取集内值、无场景集的类型必须为空）；concurrency
// 就地 clamp（<1→1，>20→20）。
func (req *RunRequest) Validate() error {
	f, ok := registry[req.ExperimentType]
	if !ok {
		return errcode.NewError(errcode.Param, "experiment_type %q 非法（合法值: %v）", req.ExperimentType, ValidTypes())
	}
	if req.Count < 1 || req.Count > maxCount {
		return errcode.NewError(errcode.Param, "count 必须在 1..%d 内，当前 %d", maxCount, req.Count)
	}
	legal := f().Scenarios
	if len(legal) == 0 {
		if req.Scenario != "" {
			return errcode.NewError(errcode.Param, "实验 %q 不接受 scenario，%q 非法", req.ExperimentType, req.Scenario)
		}
	} else {
		found := false
		for _, sc := range legal {
			if req.Scenario == sc {
				found = true
				break
			}
		}
		if !found {
			return errcode.NewError(errcode.Param, "实验 %q 的 scenario 必须取 %v 之一，当前 %q", req.ExperimentType, legal, req.Scenario)
		}
	}
	if req.Concurrency < 1 {
		req.Concurrency = 1
	}
	if req.Concurrency > maxConcurrency {
		req.Concurrency = maxConcurrency
	}
	return nil
}

// Run 执行一轮实验（P5-R3/R4）：seeder.Init（幂等，永不走 demo/reset）→ RUNNING 行
// 先落库 → Setup（失败 = FAILED 行 + {"setup_error":1} + *Error{6001}）→ worker 池
// 并发执行 Count 次迭代 → 统计填充 → DONE。成败均写 EXPERIMENT_RUN 审计。
func (s *Service) Run(ctx context.Context, traceID string, req *RunRequest) (*model.ExperimentRun, error) {
	if req == nil {
		return nil, errcode.NewError(errcode.Param, "请求体必填")
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}
	if statefulExperiments[req.ExperimentType] {
		req.Concurrency = 1 // F-1：有状态执行器强制串行
	}
	if _, err := s.seeder.Init(); err != nil { // P5-R4：幂等铺设演示数据
		return nil, errcode.NewError(errcode.Internal, "seeder init: %v", err)
	}
	ex, _ := executorFor(req.ExperimentType) // Validate 已保证存在
	run := &model.ExperimentRun{
		ExperimentID:   model.GenExperimentID(),
		RunID:          model.GenRunID(),
		ExperimentType: req.ExperimentType,
		Scenario:       req.Scenario,
		Config:         configJSON(req.Config),
		Status:         "RUNNING",
		Count:          req.Count,
		StartedAt:      timex.NowT(),
	}
	if err := s.db.WithContext(ctx).Create(run).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "create experiment run: %v", err)
	}
	rec := newRecorder()
	rc, err := ex.Setup(ctx, s, run)
	if err != nil {
		s.markSetupFailed(ctx, run)
		s.logRun(traceID, run)
		return run, errcode.NewError(errcode.Experiment, "experiment %s setup failed: %s", req.ExperimentType, err.Error())
	}
	jobs := make(chan int)
	var wg sync.WaitGroup
	for w := 0; w < req.Concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				t0 := time.Now()
				iterErr := ex.Iter(ctx, s, run, rc, i)
				rec.record(time.Since(t0).Milliseconds(), iterErr)
			}
		}()
	}
	for i := 0; i < req.Count; i++ {
		jobs <- i
	}
	close(jobs)
	wg.Wait()
	rec.fill(run)
	if err := s.db.WithContext(ctx).Model(run).Updates(map[string]any{
		"status": run.Status, "success_count": run.SuccessCount, "success_rate": run.SuccessRate,
		"avg_latency_ms": run.AvgLatencyMs, "p50_latency_ms": run.P50LatencyMs,
		"p95_latency_ms": run.P95LatencyMs, "max_latency_ms": run.MaxLatencyMs,
		"failed_count": run.FailedCount, "failure_reasons": run.FailureReasons,
		"completed_at": run.CompletedAt,
	}).Error; err != nil {
		return run, errcode.NewError(errcode.Internal, "persist experiment result: %v", err)
	}
	s.logRun(traceID, run)
	return run, nil
}

// markSetupFailed P5-R3：Setup 失败 → FAILED 行 + 固定 {"setup_error":1}。
func (s *Service) markSetupFailed(ctx context.Context, run *model.ExperimentRun) {
	run.Status = "FAILED"
	run.FailureReasons = `{"setup_error":1}`
	run.CompletedAt = timex.NowT()
	if err := s.db.WithContext(ctx).Model(run).Updates(map[string]any{
		"status": run.Status, "failure_reasons": run.FailureReasons, "completed_at": run.CompletedAt,
	}).Error; err != nil {
		log.Printf("experiment: markSetupFailed run=%s update failed: %v", run.RunID, err)
	}
}

// logRun EXPERIMENT_RUN 审计（P5-R3 成败均记；失败不阻断——留痕不阻断原则）。
func (s *Service) logRun(traceID string, run *model.ExperimentRun) {
	if s.audit == nil {
		return
	}
	_ = s.audit.Log("EXPERIMENT", "EXPERIMENT_RUN", "EXPERIMENT", run.RunID, traceID, map[string]any{
		"experiment_id": run.ExperimentID, "experiment_type": run.ExperimentType, "scenario": run.Scenario,
		"status": run.Status, "count": run.Count, "success_count": run.SuccessCount,
		"success_rate": run.SuccessRate, "failure_reasons": run.FailureReasons,
	})
}

func configJSON(cfg map[string]any) string {
	if len(cfg) == 0 {
		return "{}"
	}
	b, err := json.Marshal(cfg)
	if err != nil {
		return "{}"
	}
	return string(b)
}

// Result 按 run_id 查询（只读，Finding-2 豁免：无审计、无 traceID 参数）。不存在 → 6002。
func (s *Service) Result(ctx context.Context, runID string) (*model.ExperimentRun, error) {
	if runID == "" {
		return nil, errcode.NewError(errcode.Param, "run_id 必填")
	}
	var run model.ExperimentRun
	if err := s.db.WithContext(ctx).Where("run_id = ?", runID).First(&run).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errcode.NewError(errcode.Param, "run_id %q 不存在", runID)
		}
		return nil, errcode.NewError(errcode.Internal, "load experiment run: %v", err)
	}
	return &run, nil
}

// ExperimentQuery 列表过滤（列表契约同 audit：page<1→1；page_size <1→20、>200→封顶 200）。
type ExperimentQuery struct {
	ExperimentType string `json:"experiment_type"`
	Status         string `json:"status"`
	Page           int    `json:"page"`
	PageSize       int    `json:"page_size"`
}

func (q *ExperimentQuery) Normalize() {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 {
		q.PageSize = 20
	}
	if q.PageSize > 200 {
		q.PageSize = 200
	}
}

// List 分页查询。ExperimentRun 无 created_at 列（模型仅 started_at/completed_at）→
// 排序键 started_at DESC, run_id DESC。
func (s *Service) List(ctx context.Context, q *ExperimentQuery) ([]model.ExperimentRun, int64, error) {
	q.Normalize()
	db := s.db.WithContext(ctx).Model(&model.ExperimentRun{})
	if q.ExperimentType != "" {
		db = db.Where("experiment_type = ?", q.ExperimentType)
	}
	if q.Status != "" {
		db = db.Where("status = ?", q.Status)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "count experiment_runs: %v", err)
	}
	var records []model.ExperimentRun
	if err := db.Order("started_at DESC, run_id DESC").
		Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&records).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "list experiment_runs: %v", err)
	}
	return records, total, nil
}

// exportHeader CSV 表头（列序即契约，Apifox 文档与验收共用）。
var exportHeader = []string{"experiment_id", "run_id", "experiment_type", "scenario", "status",
	"count", "success_count", "success_rate", "avg_latency_ms", "p50_latency_ms", "p95_latency_ms",
	"max_latency_ms", "failed_count", "failure_reasons", "started_at", "completed_at"}

// ExportCSV 复用 List 过滤，单次上限 PageSize=200（镜像 RegAuditExport 模式）。
func (s *Service) ExportCSV(ctx context.Context, q *ExperimentQuery) ([]byte, int, error) {
	records, _, err := s.List(ctx, &ExperimentQuery{
		ExperimentType: q.ExperimentType, Status: q.Status, Page: 1, PageSize: 200,
	})
	if err != nil {
		return nil, 0, err
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	if err := w.Write(exportHeader); err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "csv header: %v", err)
	}
	f := func(v float64) string { return strconv.FormatFloat(v, 'f', -1, 64) }
	for _, r := range records {
		row := []string{r.ExperimentID, r.RunID, r.ExperimentType, r.Scenario, r.Status,
			strconv.Itoa(r.Count), strconv.Itoa(r.SuccessCount), f(r.SuccessRate),
			f(r.AvgLatencyMs), f(r.P50LatencyMs), f(r.P95LatencyMs), f(r.MaxLatencyMs),
			strconv.Itoa(r.FailedCount), r.FailureReasons,
			timex.FormatTime(r.StartedAt.Time), timex.FormatTime(r.CompletedAt.Time)}
		if err := w.Write(row); err != nil {
			return nil, 0, errcode.NewError(errcode.Internal, "csv row: %v", err)
		}
	}
	w.Flush()
	return buf.Bytes(), len(records), nil
}
