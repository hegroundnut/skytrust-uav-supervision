package acceptance

import (
	"net/http/httptest"
	"strings"
	"testing"
)

// attackSession 攻防前置链（P5-R11 固定顺序）：开洞→建会话（SessionOpen 持久化
// 隧道路径，顺序不可颠倒）→诱饵消息（riding tunnel）→风险评估断言 DETECT。
// 返回 session_id。载荷与 tests/system2_e2e_test.go 逐字段一致。
func attackSession(t *testing.T, srv *httptest.Server) string {
	t.Helper()
	must0(t, "wormhole/toggle", call(t, srv, "/api/wormhole/toggle", map[string]any{"enabled": true, "operator": "ATTACKER-SIM"}))
	open := must0(t, "session/open", call(t, srv, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"}))
	sid := open["session"].(map[string]any)["session_id"].(string)
	atk := must0(t, "lure message", call(t, srv, "/api/message/send", map[string]any{
		"session_id": sid, "msg_type": "POSITION_UPDATE",
		"source_node": "UAV-A-001-NODE", "target_node": "MGR",
	}))
	if pathStr := atk["message"].(map[string]any)["path"].(string); !strings.Contains(pathStr, "NODE-X") {
		t.Fatalf("lure must ride tunnel: %v", pathStr)
	}
	eval := must0(t, "risk/evaluate", call(t, srv, "/api/risk/evaluate", map[string]any{"session_id": sid}))
	if eval["verdict"] != "DETECT" || eval["risk_score"].(float64) < 0.7 || eval["session_status"] != "DEGRADED" {
		t.Fatalf("evaluate = %v", eval)
	}
	return sid
}

// TestTC2_01SessionEstablish TC2-01 会话建立：有效身份 → SM9 挑战认证通过，
// AUTHENTICATED→ACTIVE + 初始可信路径 6 节点。
// （原型判定：session/open 认证为 SM9 挑战-应答；PASS 门禁见 TC2-02/P5-R10。）
func TestTC2_01SessionEstablish(t *testing.T) {
	srv := bootTC(t)
	open := must0(t, "session/open", call(t, srv, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"}))
	sess := open["session"].(map[string]any)
	if sess["status"] != "ACTIVE" || !open["auth"].(map[string]any)["verified"].(bool) {
		t.Fatalf("open = %v", open)
	}
	path := open["path"].([]any)
	if len(path) != 6 || path[0] != "UAV-A-001-NODE" || path[5] != "MGR" {
		t.Fatalf("path = %v", path)
	}
}

// TestTC2_02InvalidPassRejected TC2-02 无效许可（P5-R10 判定）：吊销许可 →
// pass/verify 拒绝（valid=false + REVOKED + reasons 非空说明拒绝原因）。
func TestTC2_02InvalidPassRejected(t *testing.T) {
	srv := bootTC(t)
	mainlineA(t, srv)
	issuePassA(t, srv)
	rvk := must0(t, "pass/revoke", call(t, srv, "/api/pass/revoke", map[string]any{
		"pass_id": seqID("PASS", 1), "reason": "任务结束", "operator": "FISCO-ADMIN",
	}))
	if rvk["pass"].(map[string]any)["status"] != "REVOKED" || rvk["crosschain_status"] != "SUCCESS" {
		t.Fatalf("revoke = %v", rvk)
	}
	ver := must0(t, "pass/verify revoked", call(t, srv, "/api/pass/verify", map[string]any{"pass_id": seqID("PASS", 1)}))
	if ver["valid"] != false || ver["status"] != "REVOKED" {
		t.Fatalf("verify = %v", ver)
	}
	if len(ver["reasons"].([]any)) == 0 {
		t.Fatalf("reasons must explain rejection: %v", ver)
	}
}

// TestTC2_03NormalInteraction TC2-03 正常交互（P5-R11 判定：30 秒持续交互的
// 自动化等价 = 6 连发）：消息持续成功，实测秒级内时延（>0 且 <1000ms）。
func TestTC2_03NormalInteraction(t *testing.T) {
	srv := bootTC(t)
	open := must0(t, "session/open", call(t, srv, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"}))
	sid := open["session"].(map[string]any)["session_id"].(string)
	for i := 0; i < 6; i++ {
		msg := must0(t, "message/send", call(t, srv, "/api/message/send", map[string]any{
			"session_id": sid, "msg_type": "HEARTBEAT",
			"source_node": "UAV-A-001-NODE", "target_node": "MGR",
		}))["message"].(map[string]any)
		lat := msg["latency_ms"].(float64)
		if msg["status"] != "SUCCESS" || lat <= 0 || lat >= 1000 {
			t.Fatalf("msg %d = %v (latency %v)", i, msg, lat)
		}
	}
	stats := must0(t, "message/list", call(t, srv, "/api/message/list", map[string]any{"session_id": sid}))["stats"].(map[string]any)
	if stats["count"].(float64) != 6 || stats["success_rate"].(float64) != 1 {
		t.Fatalf("stats = %v", stats)
	}
}

// TestTC2_04WormholeEnabled TC2-04 开启虫洞：X/Y 隧道启动 → 拓扑出现虫洞链路
// （5 边 → 8 边，nodes_affected 4：X/Y 上线 + N1/N4 邻接被伪造）。
func TestTC2_04WormholeEnabled(t *testing.T) {
	srv := bootTC(t)
	topo := must0(t, "topology/get", call(t, srv, "/api/topology/get", map[string]any{}))
	if topo["wormhole_enabled"].(bool) || len(topo["edges"].([]any)) != 5 {
		t.Fatalf("initial topo = %v", topo)
	}
	tog := must0(t, "wormhole/toggle", call(t, srv, "/api/wormhole/toggle", map[string]any{"enabled": true, "operator": "ATTACKER-SIM"}))
	if !tog["wormhole_enabled"].(bool) || len(tog["nodes_affected"].([]any)) != 4 {
		t.Fatalf("toggle = %v", tog)
	}
	topo2 := must0(t, "topology/get", call(t, srv, "/api/topology/get", map[string]any{}))
	if !topo2["wormhole_enabled"].(bool) || len(topo2["edges"].([]any)) != 8 {
		t.Fatalf("wormhole topo = %v", topo2)
	}
}

// TestTC2_05WormholeDetected TC2-05 检测虫洞：路径经过 X/Y → 风险达阈值，
// 生成虫洞告警（P5-R11 判定 = DETECT+ISOLATE 事件留痕 + X/Y ISOLATED + 会话 DEGRADED）。
func TestTC2_05WormholeDetected(t *testing.T) {
	srv := bootTC(t)
	sid := attackSession(t, srv) // toggle→open→诱饵→evaluate 断言在助手内完成
	nodes := must0(t, "node/list", call(t, srv, "/api/node/list", map[string]any{"node_type": "ATTACKER"}))
	if nodes["total"].(float64) != 2 {
		t.Fatalf("attackers = %v", nodes)
	}
	for _, rec := range nodes["records"].([]any) {
		if n := rec.(map[string]any); n["status"] != "ISOLATED" || n["risk_score"].(float64) <= 0 {
			t.Fatalf("attacker node = %v", n)
		}
	}
	deg := must0(t, "session/list DEGRADED", call(t, srv, "/api/session/list", map[string]any{"status": "DEGRADED"}))
	if deg["total"].(float64) != 1 {
		t.Fatalf("degraded sessions = %v", deg)
	}
	evs := must0(t, "event/list", call(t, srv, "/api/event/list", map[string]any{"session_id": sid}))
	seen := map[string]bool{}
	for _, rec := range evs["records"].([]any) {
		seen[rec.(map[string]any)["action"].(string)] = true
	}
	if !seen["DETECT"] || !seen["ISOLATE"] {
		t.Fatalf("events = %v, want DETECT+ISOLATE", evs["records"])
	}
}

// TestTC2_06AutoAvoidance TC2-06 自动规避：执行防御 → 禁用异常边（X/Y 已隔离），
// 重算可信路径（新路径不含 NODE-X/NODE-Y），会话 RECOVERED + RECOVER 事件。
func TestTC2_06AutoAvoidance(t *testing.T) {
	srv := bootTC(t)
	sid := attackSession(t, srv)
	sw := must0(t, "path/switch", call(t, srv, "/api/path/switch", map[string]any{"session_id": sid, "operator": "OP-1"}))
	if sw["session"].(map[string]any)["status"] != "RECOVERED" {
		t.Fatalf("switch = %v", sw)
	}
	ev := sw["event"].(map[string]any)
	if ev["action"] != "RECOVER" || strings.Contains(ev["new_path"].(string), "NODE-X") ||
		strings.Contains(ev["new_path"].(string), "NODE-Y") {
		t.Fatalf("recover event = %v", ev)
	}
	if !strings.Contains(ev["original_path"].(string), "NODE-X") {
		t.Fatalf("original path must contain tunnel: %v", ev)
	}
}

// TestTC2_07InteractionResumed TC2-07 恢复交互：切换后状态同步恢复
// （消息成功且不再经过隧道），会话回归 ACTIVE，恢复耗时为实测值 >0。
func TestTC2_07InteractionResumed(t *testing.T) {
	srv := bootTC(t)
	sid := attackSession(t, srv)
	sw := must0(t, "path/switch", call(t, srv, "/api/path/switch", map[string]any{"session_id": sid, "operator": "OP-1"}))
	if sw["recovery_latency_ms"].(float64) <= 0 {
		t.Fatalf("recovery latency = %v, want > 0", sw["recovery_latency_ms"])
	}
	msg := must0(t, "message/send after switch", call(t, srv, "/api/message/send", map[string]any{
		"session_id": sid, "msg_type": "ROUTE_STATUS",
		"source_node": "UAV-A-001-NODE", "target_node": "MGR",
	}))["message"].(map[string]any)
	if msg["status"] != "SUCCESS" || strings.Contains(msg["path"].(string), "NODE-X") {
		t.Fatalf("resumed msg = %v", msg)
	}
	act := must0(t, "session/list ACTIVE", call(t, srv, "/api/session/list", map[string]any{"status": "ACTIVE"}))
	if act["total"].(float64) != 1 {
		t.Fatalf("active sessions = %v", act)
	}
}

// TestTC2_08ComparisonExperiment TC2-08 对比实验：正常/攻击/防御各 100 笔 →
// 导出成功率、时延和检测结果（P5-R6 经 /api/experiment/* 驱动）。
// 顺序裁定：NORMAL→ATTACK→DEFENSE——DEFENSE 会隔离 X/Y（攻击拓扑一次性消耗，
// P5-R4），ATTACK 必须排在隔离之前；每次 run 内部 seeder.Init 重建前置数据。
func TestTC2_08ComparisonExperiment(t *testing.T) {
	srv := bootTC(t)
	for _, sc := range []string{"NORMAL", "ATTACK", "DEFENSE"} {
		out := must0(t, "experiment/run "+sc, call(t, srv, "/api/experiment/run", map[string]any{
			"experiment_type": "MESSAGE_FLOW", "scenario": sc, "count": 100,
		}))
		if out["status"] != "DONE" || out["success_count"].(float64) != 100 ||
			out["success_rate"].(float64) != 1 || out["failed_count"].(float64) != 0 {
			t.Fatalf("%s run = %v", sc, out)
		}
		if out["p95_latency_ms"].(float64) >= 1000 {
			t.Fatalf("%s p95 = %v ms, want < 1000", sc, out["p95_latency_ms"])
		}
	}
	lst := must0(t, "experiment/list", call(t, srv, "/api/experiment/list", map[string]any{"experiment_type": "MESSAGE_FLOW"}))
	if lst["total"].(float64) != 3 {
		t.Fatalf("list = %v, want 3 runs", lst)
	}
	exp := must0(t, "experiment/export", call(t, srv, "/api/experiment/export", map[string]any{}))
	if exp["format"] != "csv" || exp["rows"].(float64) != 3 {
		t.Fatalf("export = %v", exp)
	}
}
