package api

import (
	"fmt"
	"reflect"
	"testing"

	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/model"
)

// goalsTx 构造一行跨链台账（只填口径相关字段；幂等键逐行相异——uniqueIndex）。
// retryOf 非空即 #rN 重试行（P5-R8 语义），业务留痕口径下各算一条、不去重。
func goalsTx(crossTxID, bizID, verifyResult, retryOf string) *model.CrosschainTx {
	return &model.CrosschainTx{
		CrossTxID: crossTxID, BusinessID: bizID, VerifyResult: verifyResult,
		MessageType: "FLIGHT_PASS", SourceChain: "irita", FinalTargetChain: "fabric",
		Status: "SUCCESS", RetryOf: retryOf, IdempotencyKey: "K-GOALS-" + crossTxID,
	}
}

// TestExplorerGoalsEmptyDB 全新库：code 0；计数为真实 0 时输出 0（实测值，非 null）；
// 率/中位数测不到 → null（诚实红线，绝不报 0%/0ms）；chains 与 overview 响应
// reflect.DeepEqual（共享 explorerChainsSnapshot，同构同值）；
// wormhole_detected_total 键整个省略（无独立检出字段，不编造）。
func TestExplorerGoalsEmptyDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/goals", map[string]any{})
	if resp["code"].(float64) != 0 {
		t.Fatalf("goals: %v", resp)
	}
	data := resp["data"].(map[string]any)

	// goal1：台账真实 0 → 计数 0；pass+fail==0 → 率 null；sim 四链全 ONLINE
	goal1 := data["goal1"].(map[string]any)
	for _, k := range []string{"crosschain_total", "verify_pass", "verify_fail"} {
		if goal1[k].(float64) != 0 {
			t.Fatalf("goal1.%s = %v, want 0（真实 0 输出 0）", k, goal1[k])
		}
	}
	if goal1["verify_pass_rate_pct"] != nil {
		t.Fatalf("verify_pass_rate_pct = %v, want null（pass+fail==0 测不到率）", goal1["verify_pass_rate_pct"])
	}
	if goal1["chains_total"].(float64) != 4 {
		t.Fatalf("chains_total = %v, want 4（sim 四链）", goal1["chains_total"])
	}
	if goal1["chains_online"].(float64) != 4 {
		t.Fatalf("chains_online = %v, want 4（sim 全 ONLINE）", goal1["chains_online"])
	}

	// chains 与 overview 同构同值（共享函数；两端点只读，先后调用状态一致）
	ov := postJSON(t, r, "/api/explorer/overview", map[string]any{})
	if ov["code"].(float64) != 0 {
		t.Fatalf("overview: %v", ov)
	}
	if !reflect.DeepEqual(goal1["chains"], ov["data"].(map[string]any)["chains"]) {
		t.Fatalf("goal1.chains 与 overview.chains 不一致:\n%v\n%v",
			goal1["chains"], ov["data"].(map[string]any)["chains"])
	}

	// goal2：计数真实 0；两中位数 null；wormhole_detected_total 键必须整个省略
	goal2 := data["goal2"].(map[string]any)
	for _, k := range []string{"sessions_total", "messages_total", "wormhole_events_total"} {
		if goal2[k].(float64) != 0 {
			t.Fatalf("goal2.%s = %v, want 0（真实 0 输出 0）", k, goal2[k])
		}
	}
	for _, k := range []string{"message_latency_median_ms", "recovery_latency_median_ms"} {
		if goal2[k] != nil {
			t.Fatalf("goal2.%s = %v, want null（无读数测不到中位数）", k, goal2[k])
		}
	}
	if _, bad := goal2["wormhole_detected_total"]; bad {
		t.Fatalf("wormhole_detected_total 必须整个省略（无独立检出字段，测不到不编造）: %v", goal2)
	}

	// goal3：四计数真实 0
	goal3 := data["goal3"].(map[string]any)
	for _, k := range []string{"alerts_total", "trace_total", "inspect_total", "auth_total"} {
		if goal3[k].(float64) != 0 {
			t.Fatalf("goal3.%s = %v, want 0（真实 0 输出 0）", k, goal3[k])
		}
	}
}

// TestExplorerGoalsBusinessScope 芯片①业务留痕口径：EXP-% 压测流量排除、
// #rN 重试行各算一条不去重；verify_pass/fail 同口径；
// rate = math.Round(pass*10000/(pass+fail))/100 → 2/3 = 66.67。
func TestExplorerGoalsBusinessScope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	journeySeed(t, deps, goalsTx("CX-G-201", "PASS-2026-201", "PASS", ""))
	journeySeed(t, deps, goalsTx("CX-G-201#r2", "PASS-2026-201", "PASS", "CX-G-201")) // 重试行各算一条
	journeySeed(t, deps, goalsTx("CX-G-EXP", "EXP-STRESS-1", "PASS", ""))             // 压测流量排除
	journeySeed(t, deps, goalsTx("CX-G-202", "PASS-2026-202", "FAIL_SM9", ""))
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/goals", map[string]any{})
	if resp["code"].(float64) != 0 {
		t.Fatalf("goals: %v", resp)
	}
	goal1 := resp["data"].(map[string]any)["goal1"].(map[string]any)
	if goal1["crosschain_total"].(float64) != 3 {
		t.Fatalf("crosschain_total = %v, want 3（EXP 排除、重试各算一条）", goal1["crosschain_total"])
	}
	if goal1["verify_pass"].(float64) != 2 {
		t.Fatalf("verify_pass = %v, want 2", goal1["verify_pass"])
	}
	if goal1["verify_fail"].(float64) != 1 {
		t.Fatalf("verify_fail = %v, want 1", goal1["verify_fail"])
	}
	if goal1["verify_pass_rate_pct"].(float64) != 66.67 {
		t.Fatalf("verify_pass_rate_pct = %v, want 66.67（Round(2*10000/3)/100）", goal1["verify_pass_rate_pct"])
	}
}

// TestExplorerGoalsMedians 中位数内存法：只取 >0 读数；n 奇 → v[n/2]；
// n 偶 → (v[n/2-1]+v[n/2])/2 整数除法。消息 {10,20,30,0} → 20（0 滤除，n=3 奇）；
// 追加 40 → {10,20,30,40} → (20+30)/2 = 25；恢复时延 {800,0,1200} → (800+1200)/2 = 1000。
func TestExplorerGoalsMedians(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	for i, ms := range []int64{10, 20, 30, 0} {
		journeySeed(t, deps, &model.OffchainMessage{
			MessageID: fmt.Sprintf("MSG-G-%03d", i+1), SessionID: "SESS-G-1",
			MsgType: "HEARTBEAT", SourceNode: "UAV-G-NODE", TargetNode: "MGR",
			Seq: int64(i + 1), LatencyMs: ms, Status: "SUCCESS",
		})
	}
	for i, ms := range []int64{800, 0, 1200} {
		journeySeed(t, deps, &model.WormholeEvent{
			EventID: fmt.Sprintf("WH-G-%03d", i+1), SessionID: "SESS-G-1",
			NodeX: "NODE-G-X", NodeY: "NODE-G-Y", Action: "DETECT", RecoveryLatencyMs: ms,
		})
	}
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/goals", map[string]any{})
	if resp["code"].(float64) != 0 {
		t.Fatalf("goals: %v", resp)
	}
	goal2 := resp["data"].(map[string]any)["goal2"].(map[string]any)
	if goal2["message_latency_median_ms"].(float64) != 20 {
		t.Fatalf("message_latency_median_ms = %v, want 20（0 滤除后 {10,20,30} n=3 奇取中）",
			goal2["message_latency_median_ms"])
	}
	if goal2["recovery_latency_median_ms"].(float64) != 1000 {
		t.Fatalf("recovery_latency_median_ms = %v, want 1000（{800,1200} n=2 偶 (800+1200)/2）",
			goal2["recovery_latency_median_ms"])
	}
	if goal2["wormhole_events_total"].(float64) != 3 {
		t.Fatalf("wormhole_events_total = %v, want 3（含 0 读数行，计数不滤）", goal2["wormhole_events_total"])
	}
	if goal2["messages_total"].(float64) != 4 {
		t.Fatalf("messages_total = %v, want 4（计数不滤 0 读数）", goal2["messages_total"])
	}

	// 追加一条 40ms → 滤后 {10,20,30,40}，n=4 偶 → (20+30)/2 = 25
	journeySeed(t, deps, &model.OffchainMessage{
		MessageID: "MSG-G-005", SessionID: "SESS-G-1", MsgType: "POSITION_UPDATE",
		SourceNode: "UAV-G-NODE", TargetNode: "MGR", Seq: 5, LatencyMs: 40, Status: "SUCCESS",
	})
	resp2 := postJSON(t, r, "/api/explorer/goals", map[string]any{})
	if resp2["code"].(float64) != 0 {
		t.Fatalf("goals(2): %v", resp2)
	}
	goal2b := resp2["data"].(map[string]any)["goal2"].(map[string]any)
	if goal2b["message_latency_median_ms"].(float64) != 25 {
		t.Fatalf("message_latency_median_ms = %v, want 25（{10,20,30,40} n=4 偶 (20+30)/2）",
			goal2b["message_latency_median_ms"])
	}
	if goal2b["messages_total"].(float64) != 5 {
		t.Fatalf("messages_total = %v, want 5", goal2b["messages_total"])
	}
}

// TestExplorerGoalsGoal3Counts goal3 计数源钉死：alerts=COUNT(SecurityEvent)；
// trace=AuditLog action IN (TRACE_IDENTITY, TRACE_IDENTITY_BROKEN)；
// inspect=AuditLog action IN (INSPECT, INSPECT_CHAIN_FAILED)；auth=COUNT(RegulatoryAuth)。
// AUTH_APPLY / 其他 action 不计入任何 goal3 字段。
func TestExplorerGoalsGoal3Counts(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	for i := 1; i <= 2; i++ {
		journeySeed(t, deps, &model.SecurityEvent{
			AlertID: fmt.Sprintf("ALERT-G-%03d", i), EventType: "GEOFENCE_BREACH",
			RiskLevel: "HIGH", SourceSystem: "SYSTEM1", Status: "OPEN",
		})
	}
	for i, action := range []string{
		"TRACE_IDENTITY", "TRACE_IDENTITY_BROKEN", // trace_total = 2
		"INSPECT", "INSPECT_CHAIN_FAILED", // inspect_total = 2
		"AUTH_APPLY", "MISSION_REVIEW", // 不计入任何 goal3 字段
	} {
		journeySeed(t, deps, &model.AuditLog{
			TraceID: fmt.Sprintf("TRACE-G-%03d", i), Actor: "REG-G", Action: action,
			TargetType: "MISSION", TargetID: "MISSION-2026-201",
		})
	}
	journeySeed(t, deps, &model.RegulatoryAuth{
		AuthorizationID: "AUTH-G-001", RegulatorID: "REG-G", Scope: `["MISSION"]`,
		TargetType: "MISSION", TargetID: "MISSION-2026-201", Status: "AUTHORIZED",
	})
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/goals", map[string]any{})
	if resp["code"].(float64) != 0 {
		t.Fatalf("goals: %v", resp)
	}
	goal3 := resp["data"].(map[string]any)["goal3"].(map[string]any)
	for k, want := range map[string]float64{
		"alerts_total": 2, "trace_total": 2, "inspect_total": 2, "auth_total": 1,
	} {
		if goal3[k].(float64) != want {
			t.Fatalf("goal3.%s = %v, want %v", k, goal3[k], want)
		}
	}
}

// TestExplorerOverviewUnchangedAfterExtract 抽取共享函数后 overview 行为零变化：
// 既有固定显示字符串（照抄 explorer_handler_test.go 断言值）仍逐字存在，
// count/mode/status 与确定性排序（链名升序）不变。
func TestExplorerOverviewUnchangedAfterExtract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/overview", map[string]any{})
	if resp["code"].(float64) != 0 {
		t.Fatalf("overview: %v", resp)
	}
	data := resp["data"].(map[string]any)
	if data["count"].(float64) != 4 {
		t.Fatalf("count = %v, want 4", data["count"])
	}
	chains := data["chains"].([]any)
	if len(chains) != 4 {
		t.Fatalf("chains len = %d, want 4", len(chains))
	}
	want := map[string][2]string{
		"chainmaker": {"ChainMaker 监管链", "TBFT（4 节点）"},
		"fabric":     {"Fabric 运营链", "SMARTBFT（4 orderer）"},
		"fisco-bcos": {"FISCO BCOS 管理链", "PBFT（4 sealer）"},
		"irita":      {"IRITA 证照链", "Tendermint BFT（4 验证人）"},
	}
	order := []string{"chainmaker", "fabric", "fisco-bcos", "irita"} // 确定性输出：链名升序
	for i, item := range chains {
		ch := item.(map[string]any)
		key, _ := ch["chain"].(string)
		if key != order[i] {
			t.Fatalf("chains[%d].chain = %q, want %q（排序确定性不变）", i, key, order[i])
		}
		w := want[key]
		if ch["name"] != w[0] {
			t.Fatalf("%s name = %v, want %q", key, ch["name"], w[0])
		}
		if ch["consensus"] != w[1] {
			t.Fatalf("%s consensus = %v, want %q", key, ch["consensus"], w[1])
		}
		if ch["mode"] != "sim" {
			t.Fatalf("%s mode = %v, want sim", key, ch["mode"])
		}
		if ch["status"] != "ONLINE" {
			t.Fatalf("%s status = %v, want ONLINE", key, ch["status"])
		}
		if ch["node_count"].(float64) != 1 {
			t.Fatalf("%s node_count = %v, want 1（sim 单节点）", key, ch["node_count"])
		}
	}
}
