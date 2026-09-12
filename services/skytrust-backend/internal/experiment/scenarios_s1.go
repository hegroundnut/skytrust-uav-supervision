package experiment

import (
	"context"
	"fmt"
	"time"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
	"skytrust-backend/internal/uavbusiness"
)

// expWindow 实验用时间窗：now+20h 起 2h（避开演示数据与验收用例的窗口，保证
// 冲突检测/任务铺设可重复且互不干扰）。
func expWindow() (time.Time, time.Time) {
	w0 := timex.Now().Add(20 * time.Hour)
	return w0, w0.Add(2 * time.Hour)
}

// newCrosschainLoop S1-1 跨链全链路压测：每次迭代一条独立 MISSION_APPLICATION
// （business_id = EXP-<RunID>-<i> 唯一 → 幂等键互不冲突），走完整 13 步协议。
// 成功 = err==nil 且回执 SUCCESS（两者都要查——失败回执可能是 (receipt, nil)）。
func newCrosschainLoop() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			return &RunContext{}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			uid := crypto.SM9IdentityOf("UAV-A-001")
			bid := fmt.Sprintf("EXP-%s-%d", run.RunID, i)
			w0, w1 := expWindow()
			payload := map[string]any{
				"mission_id": "MISSION-" + bid, "application_id": "APP-" + bid,
				"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
				"start_time": timex.FormatTime(w0), "end_time": timex.FormatTime(w1),
				"route_segments": []string{"R101"}, "sm3_hash": crypto.SM3Hex([]byte(bid)),
			}
			env := crosschain.BuildEnvelope(crosschain.MsgMissionApplication, bid, "fabric", "fisco-bcos", payload)
			sig, sm3, err := crosschain.SignEnvelope(s.cs, uid, env)
			if err != nil {
				return errcode.NewError(errcode.Internal, "sign envelope: %v", err)
			}
			tx, err := s.gw.Send(ctx, traceOf(run), &crosschain.SendRequest{
				MessageType: crosschain.MsgMissionApplication, BusinessID: bid,
				SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
				Payload: payload, SM9Identity: uid, Signature: sig, SM3Hash: sm3,
			})
			if err != nil {
				return err // *errcode.Error → 错误码进 failure_reasons
			}
			if tx == nil || tx.Status != "SUCCESS" {
				return errcode.NewError(errcode.Experiment, "loop tx not SUCCESS: %+v", tx)
			}
			return nil
		},
	}
}

// newSM3Integrity S1-2 SM3 完整性：同文重算一致 + 单字段篡改必变（两性质一次迭代内验证）。
func newSM3Integrity() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			return &RunContext{}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			doc := map[string]any{
				"business_id": fmt.Sprintf("EXP-%s-%d", run.RunID, i),
				"seq":         i,
				"experiment":  "SM3_INTEGRITY",
			}
			h1, err := s.cs.HashCanonical(doc)
			if err != nil {
				return errcode.NewError(errcode.Internal, "hash: %v", err)
			}
			h2, err := s.cs.HashCanonical(doc)
			if err != nil {
				return errcode.NewError(errcode.Internal, "rehash: %v", err)
			}
			if h1 != h2 || len(h1) != 64 {
				return errcode.NewError(errcode.SM3Integrity, "recompute mismatch: %s vs %s", h1, h2)
			}
			doc["seq"] = i + 1 // 篡改一字段 → 摘要必变
			h3, err := s.cs.HashCanonical(doc)
			if err != nil {
				return errcode.NewError(errcode.Internal, "tamper hash: %v", err)
			}
			if h3 == h1 {
				return errcode.NewError(errcode.SM3Integrity, "tampered doc produced identical digest")
			}
			return nil
		},
	}
}

// newSM9Verify S1-3 SM9 签验：真签名必过 + 篡改载荷必拒（拒签表现为 (false,nil) 或 error，两者皆合格）。
func newSM9Verify() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			return &RunContext{}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			uid := crypto.SM9IdentityOf("UAV-A-001")
			payload := []byte(fmt.Sprintf("EXP-%s-%d", run.RunID, i))
			sig, err := s.cs.SM9SignUserID(uid, payload)
			if err != nil {
				return errcode.NewError(errcode.Internal, "sign: %v", err)
			}
			ok, err := s.cs.SM9VerifyUserID(uid, payload, sig)
			if err != nil {
				return errcode.NewError(errcode.Internal, "verify: %v", err)
			}
			if !ok {
				return errcode.NewError(errcode.SM9Verify, "valid signature rejected")
			}
			bad := append(append([]byte(nil), payload...), 'X')
			tamperedOK, terr := s.cs.SM9VerifyUserID(uid, bad, sig)
			if terr == nil && tamperedOK {
				return errcode.NewError(errcode.SM9Verify, "tampered payload accepted")
			}
			return nil
		},
	}
}

// newConflictDetect S1-4 冲突检测：Setup 铺两个三维重叠的 SUBMITTED 任务（显式 ID
// 含 RunID → 多轮实验互不干扰；窗口 now+20h）；迭代重复调用 DetectConflict——
// 幂等：已有 OPEN 冲突复用返回，不新增、不重复迁移。
func newConflictDetect() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			w0, w1 := expWindow()
			mk := func(id, operatorID, uavID string, routes []string, altMin, altMax float64, start, end time.Time) error {
				if _, err := s.biz.CreateMission(ctx, traceOf(run), uavbusiness.MissionInput{
					MissionID: id, OperatorID: operatorID, UAVID: uavID, MissionType: "POWER_INSPECTION",
					StartTime: timex.FormatTime(start), EndTime: timex.FormatTime(end),
					RouteSegments: routes, AltitudeMin: altMin, AltitudeMax: altMax,
					PayloadType: "CAMERA", Description: "冲突检测实验样本任务",
				}); err != nil {
					return err
				}
				_, _, err := s.biz.SubmitMission(ctx, traceOf(run), id, operatorID)
				return err
			}
			idA := "MISSION-EXP-" + run.RunID + "-A"
			idB := "MISSION-EXP-" + run.RunID + "-B"
			if err := mk(idA, "Operator-A", "UAV-A-001", []string{"R101", "R205"}, 60, 120, w0, w1); err != nil {
				return nil, err
			}
			// B 与 A 时间重叠 1h、共 R205 航段、高度层 80-120 交叠 → 三维重叠成立
			if err := mk(idB, "Operator-B", "UAV-B-001", []string{"R205"}, 80, 120, w0.Add(time.Hour), w1.Add(time.Hour)); err != nil {
				return nil, err
			}
			return &RunContext{MissionID: idB}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			conflicts, err := s.biz.DetectConflict(ctx, traceOf(run), rc.MissionID)
			if err != nil {
				return err
			}
			if len(conflicts) < 1 {
				return errcode.NewError(errcode.Experiment, "expected >= 1 conflict, got %d", len(conflicts))
			}
			return nil
		},
	}
}
