package tests

import (
	"strings"
	"testing"
)

// TestSystem2E2E 系统二虫洞攻防闭环：正常路由 → 开洞抄近 → 5维检测 → 隔离降级
// → 路径重算恢复 → 攻击节点永久出局 → 事件/统计留痕 → 会话关闭。
// 断言全部为关系/结构断言（P3-11），不绑定仿真时延具体值。
func TestSystem2E2E(t *testing.T) {
	srv := bootServerS1(t) // Task 2 已接线 Offchain
	defer srv.Close()
	must0 := func(step string, resp map[string]any) map[string]any {
		t.Helper()
		if resp["code"].(float64) != 0 {
			t.Fatalf("%s: want code 0, got %v", step, resp)
		}
		return resp["data"].(map[string]any)
	}
	mustCode := func(step string, want float64, resp map[string]any) {
		t.Helper()
		if resp["code"].(float64) != want {
			t.Fatalf("%s: want code %v, got %v", step, want, resp)
		}
	}

	// 0. 演示数据（含链下 8 节点；NODE-X/NODE-Y 默认 OFFLINE）
	must0("demo/init", call(t, srv, "/api/demo/init", map[string]any{}))

	// 1. 初始拓扑：虫洞关闭，5 条真实边，无隔离节点
	topo := must0("topology/get", call(t, srv, "/api/topology/get", map[string]any{}))
	if topo["wormhole_enabled"].(bool) {
		t.Fatalf("wormhole must start disabled: %v", topo)
	}
	if len(topo["edges"].([]any)) != 5 || len(topo["isolated"].([]any)) != 0 {
		t.Fatalf("topo = edges %v isolated %v", topo["edges"], topo["isolated"])
	}

	// 2. 会话开启：SM9 挑战认证 + 初始可信路径 UAV→N1..N4→MGR（6 节点）
	open := must0("session/open", call(t, srv, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"}))
	sid := open["session"].(map[string]any)["session_id"].(string)
	if open["session"].(map[string]any)["status"] != "ACTIVE" || !open["auth"].(map[string]any)["verified"].(bool) {
		t.Fatalf("open = %v", open)
	}
	path := open["path"].([]any)
	if len(path) != 6 || path[0] != "UAV-A-001-NODE" || path[5] != "MGR" {
		t.Fatalf("path = %v", path)
	}

	// 3. 两条基线消息（正常路径，实测时延 >0）
	sendMsg := func(msgType string) map[string]any {
		t.Helper()
		return must0("message/send "+msgType, call(t, srv, "/api/message/send", map[string]any{
			"session_id": sid, "msg_type": msgType,
			"source_node": "UAV-A-001-NODE", "target_node": "MGR",
		}))
	}
	b1 := sendMsg("HEARTBEAT")["message"].(map[string]any)["latency_ms"].(float64)
	b2 := sendMsg("HEARTBEAT")["message"].(map[string]any)["latency_ms"].(float64)
	if b1 <= 0 || b2 <= 0 {
		t.Fatalf("baseline latency = %v/%v", b1, b2)
	}

	// 4. 虫洞开启：隐藏隧道 + 虚假短路径，拓扑 5 → 8 条边
	tog := must0("wormhole/toggle", call(t, srv, "/api/wormhole/toggle", map[string]any{"enabled": true, "operator": "ATTACKER-SIM"}))
	if !tog["wormhole_enabled"].(bool) || len(tog["nodes_affected"].([]any)) != 4 {
		t.Fatalf("toggle = %v", tog)
	}
	topo2 := must0("topology/get", call(t, srv, "/api/topology/get", map[string]any{}))
	if !topo2["wormhole_enabled"].(bool) || len(topo2["edges"].([]any)) != 8 {
		t.Fatalf("topo2 = %v", topo2)
	}

	// 5. 新消息被诱导走隧道：路径含 NODE-X/NODE-Y，时延低于全部基线（攻击"收益"）
	atk := sendMsg("POSITION_UPDATE")
	atkPath := atk["message"].(map[string]any)["path"].(string)
	atkLat := atk["message"].(map[string]any)["latency_ms"].(float64)
	if !strings.Contains(atkPath, "NODE-X") || !strings.Contains(atkPath, "NODE-Y") {
		t.Fatalf("attack path = %v", atkPath)
	}
	if atkLat >= b1 || atkLat >= b2 {
		t.Fatalf("attack %v must undercut baselines %v/%v", atkLat, b1, b2)
	}

	// 6. 风险评估：DETECT（score ≥ 0.7）→ X/Y 隔离 → 会话 DEGRADED
	eval := must0("risk/evaluate", call(t, srv, "/api/risk/evaluate", map[string]any{"session_id": sid}))
	if eval["verdict"] != "DETECT" || eval["risk_score"].(float64) < 0.7 {
		t.Fatalf("evaluate = %v", eval)
	}
	if eval["session_status"] != "DEGRADED" || eval["threshold"].(float64) != 0.7 {
		t.Fatalf("evaluate = %v", eval)
	}
	dims := eval["dimensions"].(map[string]any)
	for _, k := range []string{"identity", "adjacency", "latency", "challenge", "path"} {
		if _, ok := dims[k]; !ok {
			t.Fatalf("dims missing %s: %v", k, dims)
		}
	}
	nodes := must0("node/list", call(t, srv, "/api/node/list", map[string]any{"node_type": "ATTACKER"}))
	if nodes["total"].(float64) != 2 {
		t.Fatalf("attackers = %v", nodes)
	}
	for _, rec := range nodes["records"].([]any) {
		n := rec.(map[string]any)
		if n["status"] != "ISOLATED" || n["risk_score"].(float64) <= 0 {
			t.Fatalf("attacker node = %v", n)
		}
	}

	// 7. DEGRADED 会话仍可发消息（降级不断链）
	sendMsg("EVENT_REPORT")

	// 8. 路径重算恢复：新路径排除 X/Y → RECOVERED，恢复时延为实测值 >0
	sw := must0("path/switch", call(t, srv, "/api/path/switch", map[string]any{"session_id": sid, "operator": "OP-1"}))
	if sw["session"].(map[string]any)["status"] != "RECOVERED" || sw["recovery_latency_ms"].(float64) <= 0 {
		t.Fatalf("switch = %v", sw)
	}
	ev := sw["event"].(map[string]any)
	if ev["action"] != "RECOVER" || strings.Contains(ev["new_path"].(string), "NODE-X") || !strings.Contains(ev["original_path"].(string), "NODE-X") {
		t.Fatalf("recover event = %v", ev)
	}

	// 9. 恢复后首条消息 → 会话回归 ACTIVE；ISOLATED 节点不可重新上线（4001）
	sendMsg("ROUTE_STATUS")
	if lst := must0("session/list", call(t, srv, "/api/session/list", map[string]any{"status": "ACTIVE"})); lst["total"].(float64) != 1 {
		t.Fatalf("active sessions = %v", lst)
	}
	mustCode("re-enable isolated", 4001, call(t, srv, "/api/wormhole/toggle", map[string]any{"enabled": true, "operator": "ATTACKER-SIM"}))

	// 10. 事件全链留痕：DETECT + ISOLATE + RECOVER 齐备
	evs := must0("event/list", call(t, srv, "/api/event/list", map[string]any{"session_id": sid}))
	if evs["total"].(float64) < 3 {
		t.Fatalf("events = %v", evs)
	}
	seen := map[string]bool{}
	for _, rec := range evs["records"].([]any) {
		seen[rec.(map[string]any)["action"].(string)] = true
	}
	for _, a := range []string{"DETECT", "ISOLATE", "RECOVER"} {
		if !seen[a] {
			t.Fatalf("missing event %s in %v", a, evs["records"])
		}
	}

	// 11. 消息统计：5 条全成功，成功率 1，均值时延为真实计算值
	ml := must0("message/list", call(t, srv, "/api/message/list", map[string]any{"session_id": sid}))
	stats := ml["stats"].(map[string]any)
	if stats["count"].(float64) < 5 || stats["success_rate"].(float64) != 1 || stats["avg_latency_ms"].(float64) <= 0 {
		t.Fatalf("stats = %v", stats)
	}

	// 12. 会话关闭：CLOSED 后发送被状态机拒绝（4002）
	closed := must0("session/close", call(t, srv, "/api/session/close", map[string]any{
		"session_id": sid, "operator": "OP-1", "reason": "e2e done",
	}))
	if closed["status"] != "CLOSED" {
		t.Fatalf("close = %v", closed)
	}
	mustCode("send after close", 4002, call(t, srv, "/api/message/send", map[string]any{
		"session_id": sid, "msg_type": "HEARTBEAT",
		"source_node": "UAV-A-001-NODE", "target_node": "MGR",
	}))
}
