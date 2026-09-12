package experiment

import (
	"context"
	"errors"
	"time"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/regulatory"
	"skytrust-backend/internal/timex"
	"skytrust-backend/internal/uavbusiness"
)

// setupGoldenThread 条件式黄金线铺设：追踪 L3 要求 PASS-2026-001 在 flight_passes
// 真实存在（seeder 只铺身份映射，不铺许可）。已存在 → 直接复用（幂等，多轮 Run
// 不重复建线）；缺失 → create（自动 MISSION-<year>-001）→ submit → review APPROVED
// → issue（显式 PASS-2026-001，窗口 now∓1h 保证 VALID）。任务窗口 now+1h..now+3h，
// 与冲突实验（now+20h）及验收用例窗口互不干扰。
// 注：PASS-2026-001 字面量的年份腐烂 = 既有裁定 C17，移交 Plan 6 统一显式化。
func setupGoldenThread(ctx context.Context, s *Service, run *model.ExperimentRun) error {
	if _, err := s.biz.QueryPass(ctx, traceOf(run), "PASS-2026-001"); err == nil {
		return nil
	}
	w0 := timex.Now().Add(time.Hour)
	w1 := w0.Add(2 * time.Hour)
	m, err := s.biz.CreateMission(ctx, traceOf(run), uavbusiness.MissionInput{
		OperatorID: "Operator-A", UAVID: "UAV-A-001", MissionType: "POWER_INSPECTION",
		StartTime: timex.FormatTime(w0), EndTime: timex.FormatTime(w1),
		RouteSegments: []string{"R101", "R205", "R306"},
		AltitudeMin:   60, AltitudeMax: 120, PayloadType: "CAMERA",
		Description: "追踪实验黄金线任务",
	})
	if err != nil {
		return err
	}
	app, _, err := s.biz.SubmitMission(ctx, traceOf(run), m.MissionID, "Operator-A")
	if err != nil {
		return err
	}
	if _, _, _, err := s.biz.SubmitReview(ctx, traceOf(run), uavbusiness.ReviewInput{
		ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN",
		Comment: "同意执行", RulesHit: []string{"R-ALT-001"},
	}); err != nil {
		return err
	}
	vf := timex.Now().Add(-time.Hour)
	vt := timex.Now().Add(time.Hour)
	_, _, err = s.biz.IssuePass(ctx, traceOf(run), uavbusiness.PassIssueInput{
		PassID: "PASS-2026-001", MissionID: m.MissionID,
		ValidFrom: timex.FormatTime(vf), ValidTo: timex.FormatTime(vt), Issuer: "FISCO-ADMIN",
	})
	return err
}

// newTraceBatch S3-1 批量身份追踪：迭代以演示伪名 PSEUDO-UAV-83921 走 7 级跨链追踪。
// 成功 = 无错误且 Resolved（断链 5001 或半解析都如实记失败）。只读 + 审计插入 → 并发安全。
func newTraceBatch() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			if err := setupGoldenThread(ctx, s, run); err != nil {
				return nil, err
			}
			return &RunContext{}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			res, err := s.reg.TraceIdentity(ctx, traceOf(run), &regulatory.TraceRequest{
				Pseudo: "PSEUDO-UAV-83921", Operator: "REG-01",
			})
			if err != nil {
				return err
			}
			if !res.Resolved {
				return errcode.NewError(errcode.Experiment, "trace unresolved, break_level=%d", res.BreakLevel)
			}
			return nil
		},
	}
}

// expSampleMission 铺设独立样本任务（窗口 now+10h..now+12h，避开黄金线与 S1 实验窗口）。
func expSampleMission(ctx context.Context, s *Service, run *model.ExperimentRun, description string) (string, error) {
	w0 := timex.Now().Add(10 * time.Hour)
	w1 := w0.Add(2 * time.Hour)
	m, err := s.biz.CreateMission(ctx, traceOf(run), uavbusiness.MissionInput{
		OperatorID: "Operator-A", UAVID: "UAV-A-001", MissionType: "POWER_INSPECTION",
		StartTime: timex.FormatTime(w0), EndTime: timex.FormatTime(w1),
		RouteSegments: []string{"R101"}, AltitudeMin: 60, AltitudeMax: 120,
		PayloadType: "CAMERA", Description: description,
	})
	if err != nil {
		return "", err
	}
	return m.MissionID, nil
}

// newInspectUnauthorized S3-2 未授权核验：成功语义 = 收到 5002 封缄拒绝（度量
// "拒绝 + 留痕"吞吐，不是度量通过）；err==nil 反而记失败——未授权若放行即安全回归。
func newInspectUnauthorized() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			mid, err := expSampleMission(ctx, s, run, "未授权核验实验样本任务")
			if err != nil {
				return nil, err
			}
			return &RunContext{MissionID: mid}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			_, err := s.reg.InspectCiphertext(ctx, traceOf(run), &regulatory.InspectRequest{
				MissionID: rc.MissionID, RegulatorID: "REG-01",
			})
			if err == nil {
				return errcode.NewError(errcode.Experiment, "unauthorized inspect must be rejected")
			}
			var e *errcode.Error
			if errors.As(err, &e) && e.Code == errcode.NoAuth {
				return nil // 5002 封缄拒绝 = 预期行为，记成功
			}
			return err
		},
	}
}

// newInspectAuthorized S3-3 授权核验：铺设样本任务 + 授权闭环（apply → APPROVE 上链，
// 窗口默认 now..now+24h 覆盖当前时刻）；迭代 = 完整授权核验（SM9 解密临时视图 +
// SM3/SM9 双验证 + 结论上链 + RegAudit 落痕）。NORMAL 轨迹 + CAMERA 载荷与任务申报
// 一致 → 不触发告警/去重路径，可安全并发。
func newInspectAuthorized() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			mid, err := expSampleMission(ctx, s, run, "授权核验实验样本任务")
			if err != nil {
				return nil, err
			}
			auth, err := s.reg.ApplyAuthorization(ctx, traceOf(run), &regulatory.AuthApplyRequest{
				RegulatorID: "REG-01", Scope: []string{"MISSION", "ROUTE", "PAYLOAD"},
				TargetType: "MISSION", TargetID: mid, Reason: "实验：授权密文核验",
			})
			if err != nil {
				return nil, err
			}
			if _, err := s.reg.ReviewAuthorization(ctx, traceOf(run), &regulatory.AuthReviewRequest{
				AuthorizationID: auth.AuthorizationID, Decision: "APPROVE",
				ReviewerID: "REG-ADMIN", Comment: "同意",
			}); err != nil {
				return nil, err
			}
			return &RunContext{MissionID: mid, AuthorizationID: auth.AuthorizationID}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			res, err := s.reg.InspectCiphertext(ctx, traceOf(run), &regulatory.InspectRequest{
				MissionID: rc.MissionID, AuthorizationID: rc.AuthorizationID,
				RegulatorID: "REG-01", Trajectory: "NORMAL", PayloadType: "CAMERA",
			})
			if err != nil {
				return err
			}
			if !res.Authorized {
				return errcode.NewError(errcode.Experiment, "authorized inspect returned Authorized=false")
			}
			return nil
		},
	}
}

// newAlertBatch S3-4 批量告警登记：自动 alert_id（随机 hex）→ 并发无碰撞；
// 伪名用演示映射 PSEUDO-UAV-83921、来源一律 MANUAL（封闭枚举裁定）。
func newAlertBatch() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			return &RunContext{}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			ev, err := s.reg.RaiseAlert(ctx, traceOf(run), &regulatory.AlertRaiseRequest{
				UAVPseudonym: "PSEUDO-UAV-83921", EventType: "IDENTITY_ANOMALY", RiskLevel: "MEDIUM",
				SourceSystem: "MANUAL", Operator: "REG-01",
			})
			if err != nil {
				return err
			}
			if ev.AlertID == "" || ev.Status != "OPEN" {
				return errcode.NewError(errcode.Experiment, "alert %s status %s, want OPEN", ev.AlertID, ev.Status)
			}
			return nil
		},
	}
}
