//go:build realchains

// Package real 的运维延迟探针（docs/real-chain-migration.md §6.5-⑤ 度量工具）。
// 仅在 -tags realchains 下编译——hermetic 测试门（315/0）不受影响；不进 CI。
// 用途：对 CROSSCHAIN_LOOP 的 7 个链上写跳逐一计时（与 gateway.go 步 3-12 的
// 合约/方法/参数逐字一致），定位 p95 主导项，指导链侧调优（出块间隔/连接池）。
// 运行：set -a; source .env; set +a; go test -tags realchains -run TestRealHopLatency \
//   ./internal/chainadapter/real/ -v -count=1 -timeout 30m
package real

import (
	"context"
	"fmt"
	"testing"
	"time"

	realchainmaker "skytrust-backend/internal/chainadapter/real/chainmaker"
	realfabric "skytrust-backend/internal/chainadapter/real/fabric"
	realfisco "skytrust-backend/internal/chainadapter/real/fisco"
)

// TestRealHopLatency 逐跳计时：每跳 iters 次（唯一 ID 避幂等/重复冲突），报告每次毫秒数。
func TestRealHopLatency(t *testing.T) {
	const iters = 5
	ctx := context.Background()

	fabT, err := realfabric.NewFactory()
	if err != nil {
		t.Fatalf("fabric factory: %v", err)
	}
	cmT, err := realchainmaker.NewFactory()
	if err != nil {
		t.Fatalf("chainmaker factory: %v", err)
	}
	fisT, err := realfisco.NewFactory()
	if err != nil {
		t.Fatalf("fisco factory: %v", err)
	}

	stamp := time.Now().UnixNano()
	uid := func(i int) string { return fmt.Sprintf("PROBE-%d-%d", stamp, i) }

	type hop struct {
		name   string
		submit func(i int) error
	}
	hops := []hop{
		{"fabric.CrosschainSubmit(源链步3)", func(i int) error {
			_, err := fabT.SubmitTx(ctx, "operator_business", "CrosschainSubmit", map[string]any{
				"cross_tx_id": uid(i), "message_type": "MISSION_APPLICATION", "business_id": uid(i),
			})
			return err
		}},
		{"chainmaker.RegisterReceive(步7)", func(i int) error {
			_, err := cmT.SubmitTx(ctx, "regulatory_record", "RegisterReceive", map[string]any{
				"cross_tx_id": uid(100 + i), "message_type": "MISSION_APPLICATION", "business_id": uid(100 + i),
				"source_chain": "fabric", "source_chain_tx_id": "probe-src", "sm3_hash": "probe-hash",
			})
			return err
		}},
		{"chainmaker.VerifyCredential(步8)", func(i int) error {
			_, err := cmT.SubmitTx(ctx, "regulatory_record", "VerifyCredential", map[string]any{
				"reg_record_id": uid(200 + i), "cross_tx_id": uid(200 + i),
				"verify_result": "PASS", "policy_result": "PASS",
				"sm9_identity": "SM9-ID-UAV-A-001", "sm3_hash": "probe-hash",
			})
			return err
		}},
		{"chainmaker.RegisterRelay(步9)", func(i int) error {
			_, err := cmT.SubmitTx(ctx, "crosschain_trace", "RegisterRelay", map[string]any{
				"cross_tx_id": uid(300 + i), "reg_record_id": uid(300 + i),
				"final_target_chain": "fisco-bcos", "business_id": uid(300 + i),
			})
			return err
		}},
		{"fisco.SubmitApplication(步10)", func(i int) error {
			_, err := fisT.SubmitTx(ctx, "uav_management", "SubmitApplication", map[string]any{
				"mission_id": uid(400 + i), "application_id": uid(400 + i),
				"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
				"start_time": "2026-09-18 09:00:00", "end_time": "2026-09-18 11:00:00",
				"route_segments": []string{"R101"}, "sm3_hash": "probe-hash",
			})
			return err
		}},
		{"chainmaker.RegisterReceipt(步11)", func(i int) error {
			_, err := cmT.SubmitTx(ctx, "crosschain_trace", "RegisterReceipt", map[string]any{
				"cross_tx_id": uid(500 + i), "reg_record_id": uid(500 + i),
				"target_chain": "fisco-bcos", "target_chain_tx_id": "probe-target",
			})
			return err
		}},
		{"fabric.CrosschainAck(步12)", func(i int) error {
			_, err := fabT.SubmitTx(ctx, "operator_business", "CrosschainAck", map[string]any{
				"cross_tx_id": uid(600 + i), "reg_record_id": uid(600 + i),
				"target_chain_tx_id": "probe-target", "status": "SUCCESS",
			})
			return err
		}},
	}

	var total time.Duration
	for _, h := range hops {
		var sum time.Duration
		for i := 0; i < iters; i++ {
			t0 := time.Now()
			if err := h.submit(i); err != nil {
				t.Fatalf("%s iter %d: %v", h.name, i, err)
			}
			d := time.Since(t0)
			sum += d
			t.Logf("%s iter%d = %dms", h.name, i, d.Milliseconds())
		}
		avg := sum / iters
		total += avg
		t.Logf(">>> %s avg = %dms", h.name, avg.Milliseconds())
	}
	t.Logf(">>> 7 跳 avg 合计 = %dms（≈ 单次 Send 期望时延）", total.Milliseconds())
}

// TestRealNegativePaths 语义契约负例（transport.go:12）：链上业务失败必须表现为
// Status!=0 且 error=nil（确定性失败，网关不重试、绝不 SUCCESS）；传输失败才是
// 非 nil error。FISCO 真·空串 revert 无法经 console 表达（参数解析吞空串），
// 只能经真实传输验证——本用例即部署清单遗留的负例核验项。
func TestRealNegativePaths(t *testing.T) {
	ctx := context.Background()
	stamp := time.Now().UnixNano()

	// FISCO：SubmitApplication mission_id 空串 → require revert（回执 status 16）。
	fisT, err := realfisco.NewFactory()
	if err != nil {
		t.Fatalf("fisco factory: %v", err)
	}
	rc, err := fisT.SubmitTx(ctx, "uav_management", "SubmitApplication", map[string]any{
		"mission_id": "", "application_id": fmt.Sprintf("NEG-%d", stamp),
		"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-18 09:00:00", "end_time": "2026-09-18 11:00:00",
		"route_segments": []string{"R101"}, "sm3_hash": "neg-hash",
	})
	if err != nil {
		t.Fatalf("fisco negative: want nil error (business failure), got %v", err)
	}
	if rc.Status == 0 {
		t.Fatalf("fisco negative: want Status!=0 (revert), got 0 (tx %s)", rc.TxID)
	}
	t.Logf(">>> fisco revert: Status=%d tx=%s（契约：Status!=0、error=nil）", rc.Status, rc.TxID)

	// FISCO：QueryState 无值键 → revert → 非 nil error（读路径约定）。
	if _, err := fisT.QueryState(ctx, "uav_management", "APP/NEG-ABSENT"); err == nil {
		t.Fatalf("fisco QueryState absent: want error, got nil")
	} else {
		t.Logf(">>> fisco QueryState absent → error ✓")
	}

	// ChainMaker：RegisterReceive cross_tx_id 空串 → sdk.Error → contract_result.code!=0。
	cmT, err := realchainmaker.NewFactory()
	if err != nil {
		t.Fatalf("chainmaker factory: %v", err)
	}
	rc2, err := cmT.SubmitTx(ctx, "regulatory_record", "RegisterReceive", map[string]any{
		"cross_tx_id": "", "message_type": "MISSION_APPLICATION", "business_id": fmt.Sprintf("NEG-%d", stamp),
		"source_chain": "fabric", "source_chain_tx_id": "neg-src", "sm3_hash": "neg-hash",
	})
	if err != nil {
		t.Fatalf("chainmaker negative: want nil error (business failure), got %v", err)
	}
	if rc2.Status == 0 {
		t.Fatalf("chainmaker negative: want Status!=0, got 0 (tx %s)", rc2.TxID)
	}
	t.Logf(">>> chainmaker business fail: Status=%d tx=%s", rc2.Status, rc2.TxID)

	// ChainMaker：QueryState 无值键 → 合约 error → 非 nil error。
	if _, err := cmT.QueryState(ctx, "regulatory_record", "REG/NEG-ABSENT"); err == nil {
		t.Fatalf("chainmaker QueryState absent: want error, got nil")
	} else {
		t.Logf(">>> chainmaker QueryState absent → error ✓")
	}
}
