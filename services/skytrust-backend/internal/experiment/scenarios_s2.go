package experiment

import (
	"context"
	"errors"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/offchain"
)

// msgRotation P3-8 六种链下消息类型（固定顺序；MESSAGE_FLOW 以 i%6 轮转全覆盖）。
var msgRotation = []string{"HEARTBEAT", "POSITION_UPDATE", "PASS_VERIFY", "NODE_CHALLENGE", "ROUTE_STATUS", "EVENT_REPORT"}

// expWormholeOff 关闭虫洞（幂等：OFFLINE no-op；ISOLATED 保持——隔离态优先于攻击开关）。
func expWormholeOff(ctx context.Context, s *Service, run *model.ExperimentRun) error {
	off := false
	_, err := s.off.WormholeToggle(ctx, traceOf(run), &offchain.WormholeToggleRequest{Enabled: &off, Operator: "EXPERIMENT"})
	return err
}

// expWormholeOn 开启虫洞攻击拓扑；X/Y 已 ISOLATED 时返回 4001（调用方按场景语义分流）。
func expWormholeOn(ctx context.Context, s *Service, run *model.ExperimentRun) error {
	on := true
	_, err := s.off.WormholeToggle(ctx, traceOf(run), &offchain.WormholeToggleRequest{Enabled: &on, Operator: "EXPERIMENT"})
	return err
}

// isWormholeConsumed 4001 = 攻击拓扑已被前轮防御消耗（X/Y ISOLATED，仅 demo/reset 可复原）。
func isWormholeConsumed(err error) bool {
	var e *errcode.Error
	return errors.As(err, &e) && e.Code == errcode.WormholeRisk
}

// expSessionOpen 开实验会话 UAV-A-001-NODE → MGR（Signature 空 = SM9 代签演示路径）。
func expSessionOpen(ctx context.Context, s *Service, run *model.ExperimentRun) (string, error) {
	res, err := s.off.SessionOpen(ctx, traceOf(run), &offchain.SessionOpenRequest{
		UAVID: "UAV-A-001", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
	})
	if err != nil {
		return "", err
	}
	return res.Session.SessionID, nil
}

// expSend 发送一条消息；成功 = 无错误且消息落库 SUCCESS。
func expSend(ctx context.Context, s *Service, run *model.ExperimentRun, sessionID, msgType string, payload map[string]any) error {
	res, err := s.off.MessageSend(ctx, traceOf(run), &offchain.MessageSendRequest{
		SessionID: sessionID, MsgType: msgType,
		SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
		Payload: payload,
	})
	if err != nil {
		return err
	}
	if res.Message.Status != "SUCCESS" {
		return errcode.NewError(errcode.Experiment, "message %s status %s, want SUCCESS", res.Message.MessageID, res.Message.Status)
	}
	return nil
}

// newMessageFlow S2-1 消息流实验（三场景）：
//   - NORMAL：虫洞关闭 + 干净会话，轮转六类消息（正常吞吐基线）；
//   - ATTACK：虫洞激活 + 会话初始路径即隧道，消息全部成功走隧道且零检测事件——
//     "攻击未被发现"的诚实基线（X/Y 已 ISOLATED → setup 失败并指引 demo/reset，P5-R4）；
//   - DEFENSE：完整攻防闭环（诱饵 → 检测 → 隔离 → 换路恢复），迭代流量走恢复后的干净路径。
func newMessageFlow() *Executor {
	return &Executor{
		Scenarios: []string{"NORMAL", "ATTACK", "DEFENSE"},
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			switch run.Scenario {
			case "NORMAL":
				if err := expWormholeOff(ctx, s, run); err != nil {
					return nil, err
				}
			case "ATTACK":
				if err := expWormholeOn(ctx, s, run); err != nil {
					if isWormholeConsumed(err) {
						return nil, errcode.NewError(errcode.Experiment,
							"ATTACK 场景不可用：NODE-X/NODE-Y 已 ISOLATED（攻击拓扑为一次性消耗品），请先 /api/demo/reset 后重试")
					}
					return nil, err
				}
			case "DEFENSE":
				return setupDefense(ctx, s, run)
			}
			sid, err := expSessionOpen(ctx, s, run)
			if err != nil {
				return nil, err
			}
			return &RunContext{SessionID: sid}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			return expSend(ctx, s, run, rc.SessionID, msgRotation[i%len(msgRotation)],
				map[string]any{"experiment": "MESSAGE_FLOW", "scenario": run.Scenario, "iteration": i})
		},
	}
}

// setupDefense DEFENSE 铺设（顺序不可调换）：先开虫洞、再开会话——SessionOpen 以实时拓扑
// 计算并持久化初始路径，此时即隧道路径（含 NODE-X/NODE-Y）。随后诱饵消息 → RiskEvaluate
// （隧道相邻跳真实距离 98 > 阈值 30 → adjacency 0.35 + latency 0.25 + challenge 0.25 ≥ 0.7，
// 必非 PASS，否则实验前提不成立如实失败）→ X/Y 隔离 + 会话 DEGRADED → PathSwitch 自动
// 重算干净路径（ISOLATED 节点被 BuildGraph 天然排除）→ RECOVERED。
// toggle 返回 4001 = 前轮防御已成功：跳过攻防序列，直接开干净会话继续正常流量。
func setupDefense(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
	if err := expWormholeOn(ctx, s, run); err != nil {
		if !isWormholeConsumed(err) {
			return nil, err
		}
		sid, oerr := expSessionOpen(ctx, s, run)
		if oerr != nil {
			return nil, oerr
		}
		return &RunContext{SessionID: sid}, nil
	}
	sid, err := expSessionOpen(ctx, s, run)
	if err != nil {
		return nil, err
	}
	if err := expSend(ctx, s, run, sid, "HEARTBEAT",
		map[string]any{"experiment": "MESSAGE_FLOW", "scenario": "DEFENSE", "role": "lure"}); err != nil {
		return nil, err
	}
	risk, err := s.off.RiskEvaluate(ctx, traceOf(run), &offchain.RiskEvaluateRequest{SessionID: sid})
	if err != nil {
		return nil, err
	}
	if risk.Verdict == "PASS" {
		return nil, errcode.NewError(errcode.Experiment,
			"隧道路径未被检出（score %.2f），DEFENSE 实验前提不成立", risk.RiskScore)
	}
	if _, err := s.off.PathSwitch(ctx, traceOf(run), &offchain.PathSwitchRequest{
		SessionID: sid, Operator: "EXPERIMENT",
	}); err != nil {
		return nil, err
	}
	return &RunContext{SessionID: sid}, nil
}

// newRiskScan S2-2 风险扫描：虫洞关闭 + 干净会话，迭代 RiskEvaluate。
// 清洁条件下强制 Verdict==PASS——误报即实验失败（回归信号）；PASS 不写库 → 并发安全。
func newRiskScan() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			if err := expWormholeOff(ctx, s, run); err != nil {
				return nil, err
			}
			sid, err := expSessionOpen(ctx, s, run)
			if err != nil {
				return nil, err
			}
			return &RunContext{SessionID: sid}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			res, err := s.off.RiskEvaluate(ctx, traceOf(run), &offchain.RiskEvaluateRequest{SessionID: rc.SessionID})
			if err != nil {
				return err
			}
			if res.Verdict != "PASS" {
				return errcode.NewError(errcode.Experiment, "干净会话被误判 %s（score %.2f）", res.Verdict, res.RiskScore)
			}
			return nil
		},
	}
}

// newStress S2 压力实验：每迭代独立"开会话 + SM9 代签 + 发消息"全链路。
// 不共享会话的原因：并发下共享会话 seq=max+1 会撞 UNIQUE(session_id,seq) 且单次重试
// 不足以保证全成；独立会话无共享竞争，统计结果确定性可复现。
func newStress() *Executor {
	return &Executor{
		Setup: func(ctx context.Context, s *Service, run *model.ExperimentRun) (*RunContext, error) {
			if err := expWormholeOff(ctx, s, run); err != nil {
				return nil, err
			}
			return &RunContext{}, nil
		},
		Iter: func(ctx context.Context, s *Service, run *model.ExperimentRun, rc *RunContext, i int) error {
			sid, err := expSessionOpen(ctx, s, run)
			if err != nil {
				return err
			}
			return expSend(ctx, s, run, sid, "HEARTBEAT",
				map[string]any{"experiment": "STRESS", "iteration": i})
		},
	}
}
