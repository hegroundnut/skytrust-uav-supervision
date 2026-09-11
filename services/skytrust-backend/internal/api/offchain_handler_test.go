package api

import (
	"testing"
)

func TestTopologyGetEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo init: %v", resp)
	}
	resp := postJSON(t, r, "/api/topology/get", map[string]any{})
	if resp["code"].(float64) != 0 {
		t.Fatalf("topology: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["wormhole_enabled"] != false {
		t.Fatalf("wormhole must be off: %v", d["wormhole_enabled"])
	}
	if len(d["nodes"].([]any)) != 8 {
		t.Fatalf("nodes = %v", d["nodes"])
	}
	edges := d["edges"].([]any)
	if len(edges) != 5 { // 链式 UAV-A-001-NODE→N1→N2→N3→N4→MGR（X/Y OFFLINE 无边）
		t.Fatalf("edges = %d", len(edges))
	}
	e0 := edges[0].(map[string]any)
	for _, k := range []string{"from", "to", "distance", "advertised_latency_ms", "wormhole_edge"} {
		if _, ok := e0[k]; !ok {
			t.Fatalf("edge missing %s: %v", k, e0)
		}
	}
}

func TestNodeRegisterEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo init: %v", resp)
	}
	resp := postJSON(t, r, "/api/node/register", map[string]any{
		"node_id": "T-REG-1", "node_type": "EDGE", "position": map[string]any{"x": 5, "y": 5},
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("register: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["node_id"] != "T-REG-1" || d["sm9_identity"] != "SM9-ID-T-REG-1" || d["status"] != "ONLINE" {
		t.Fatalf("data = %v", d)
	}
	// 重复 → 6002
	if resp := postJSON(t, r, "/api/node/register", map[string]any{
		"node_id": "T-REG-1", "node_type": "EDGE", "position": map[string]any{"x": 5, "y": 5},
	}); resp["code"].(float64) != 6002 {
		t.Fatalf("dup = %v", resp)
	}
	// 非法类型 → 4003
	if resp := postJSON(t, r, "/api/node/register", map[string]any{
		"node_id": "T-REG-9", "node_type": "ROUTER", "position": map[string]any{"x": 1, "y": 1},
	}); resp["code"].(float64) != 4003 {
		t.Fatalf("bad type = %v", resp)
	}
	// 缺 position → 6002
	if resp := postJSON(t, r, "/api/node/register", map[string]any{
		"node_id": "T-REG-8", "node_type": "EDGE",
	}); resp["code"].(float64) != 6002 {
		t.Fatalf("missing position = %v", resp)
	}
}

func TestNodeListEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo init: %v", resp)
	}
	resp := postJSON(t, r, "/api/node/list", map[string]any{})
	if resp["code"].(float64) != 0 {
		t.Fatalf("list: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["total"].(float64) != 8 || len(d["records"].([]any)) != 8 {
		t.Fatalf("d = %v", d)
	}
	if d["page"].(float64) != 1 || d["page_size"].(float64) != 20 {
		t.Fatalf("envelope = %v", d)
	}
	resp = postJSON(t, r, "/api/node/list", map[string]any{"node_type": "ATTACKER"})
	if resp["data"].(map[string]any)["total"].(float64) != 2 {
		t.Fatalf("attacker = %v", resp["data"])
	}
	resp = postJSON(t, r, "/api/node/list", map[string]any{"page_size": 3})
	d = resp["data"].(map[string]any)
	if len(d["records"].([]any)) != 3 || d["page_size"].(float64) != 3 || d["total"].(float64) != 8 {
		t.Fatalf("paged = %v", d)
	}
}

func TestSessionOpenEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo init: %v", resp)
	}
	resp := postJSON(t, r, "/api/session/open", map[string]any{"uav_id": "UAV-A-001", "mission_id": "MISSION-2026-001"})
	if resp["code"].(float64) != 0 {
		t.Fatalf("open: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["session"].(map[string]any)["status"] != "ACTIVE" {
		t.Fatalf("session = %v", d["session"])
	}
	if len(d["path"].([]any)) != 6 {
		t.Fatalf("path = %v", d["path"])
	}
	auth := d["auth"].(map[string]any)
	if auth["verified"] != true || auth["nonce"] == "" || auth["signature"] == "" {
		t.Fatalf("auth = %v", auth)
	}
	if lst := postJSON(t, r, "/api/session/list", map[string]any{}); lst["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("list = %v", lst["data"])
	}
	if resp := postJSON(t, r, "/api/session/open", map[string]any{}); resp["code"].(float64) != 6002 {
		t.Fatalf("missing uav = %v", resp)
	}
}

func TestSessionCloseEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/demo/init", map[string]any{})
	open := postJSON(t, r, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"})
	sid := open["data"].(map[string]any)["session"].(map[string]any)["session_id"].(string)
	resp := postJSON(t, r, "/api/session/close", map[string]any{"session_id": sid, "operator": "OP-1", "reason": "done"})
	if resp["code"].(float64) != 0 || resp["data"].(map[string]any)["status"] != "CLOSED" {
		t.Fatalf("close = %v", resp)
	}
	if resp := postJSON(t, r, "/api/session/close", map[string]any{"session_id": sid, "operator": "OP-1"}); resp["code"].(float64) != 4002 {
		t.Fatalf("reclose = %v", resp)
	}
	if resp := postJSON(t, r, "/api/session/close", map[string]any{"session_id": "SESS-none", "operator": "OP-1"}); resp["code"].(float64) != 6002 {
		t.Fatalf("missing = %v", resp)
	}
}

func TestMessageSendEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/demo/init", map[string]any{})
	open := postJSON(t, r, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"})
	sid := open["data"].(map[string]any)["session"].(map[string]any)["session_id"].(string)
	resp := postJSON(t, r, "/api/message/send", map[string]any{
		"session_id": sid, "msg_type": "HEARTBEAT",
		"source_node": "UAV-A-001-NODE", "target_node": "MGR",
		"payload": map[string]any{"alt": 100},
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("send: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["message"].(map[string]any)["seq"].(float64) != 1 {
		t.Fatalf("message = %v", d["message"])
	}
	if len(d["path_detail"].([]any)) != 5 {
		t.Fatalf("path_detail = %v", d["path_detail"])
	}
	// msg_type 非法 → 6002
	if resp := postJSON(t, r, "/api/message/send", map[string]any{
		"session_id": sid, "msg_type": "TELEMETRY", "source_node": "N1", "target_node": "MGR",
	}); resp["code"].(float64) != 6002 {
		t.Fatalf("bad type = %v", resp)
	}
	// 会话不存在 → 6002
	if resp := postJSON(t, r, "/api/message/send", map[string]any{
		"session_id": "SESS-none", "msg_type": "HEARTBEAT", "source_node": "N1", "target_node": "MGR",
	}); resp["code"].(float64) != 6002 {
		t.Fatalf("bad session = %v", resp)
	}
}

func TestMessageListEndpointWithStats(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/demo/init", map[string]any{})
	open := postJSON(t, r, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"})
	sid := open["data"].(map[string]any)["session"].(map[string]any)["session_id"].(string)
	for _, mt := range []string{"HEARTBEAT", "POSITION_UPDATE"} {
		postJSON(t, r, "/api/message/send", map[string]any{
			"session_id": sid, "msg_type": mt, "source_node": "UAV-A-001-NODE", "target_node": "MGR",
		})
	}
	resp := postJSON(t, r, "/api/message/list", map[string]any{"session_id": sid})
	if resp["code"].(float64) != 0 {
		t.Fatalf("list: %v", resp)
	}
	d := resp["data"].(map[string]any)
	for _, k := range []string{"records", "total", "page", "page_size", "stats"} {
		if _, ok := d[k]; !ok {
			t.Fatalf("missing %s: %v", k, d)
		}
	}
	stats := d["stats"].(map[string]any)
	if stats["count"].(float64) != 2 || stats["success_count"].(float64) != 2 || stats["success_rate"].(float64) != 1.0 {
		t.Fatalf("stats = %v", stats)
	}
	if stats["max_latency_ms"].(float64) <= 0 {
		t.Fatalf("max = %v", stats["max_latency_ms"])
	}
	// msg_type 过滤
	resp = postJSON(t, r, "/api/message/list", map[string]any{"msg_type": "HEARTBEAT"})
	if resp["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("filter = %v", resp["data"])
	}
}

func TestWormholeToggleEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/demo/init", map[string]any{})
	// 缺 enabled → 6002
	if resp := postJSON(t, r, "/api/wormhole/toggle", map[string]any{}); resp["code"].(float64) != 6002 {
		t.Fatalf("missing enabled = %v", resp)
	}
	// false 必须能绑定（*bool 陷阱回归）
	if resp := postJSON(t, r, "/api/wormhole/toggle", map[string]any{"enabled": false}); resp["code"].(float64) != 0 {
		t.Fatalf("enabled=false = %v", resp)
	}
	// ON
	resp := postJSON(t, r, "/api/wormhole/toggle", map[string]any{"enabled": true, "operator": "ATTACKER-SIM"})
	if resp["code"].(float64) != 0 {
		t.Fatalf("toggle on: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["wormhole_enabled"] != true || len(d["nodes_affected"].([]any)) != 4 {
		t.Fatalf("data = %v", d)
	}
	// 拓扑可见：wormhole_enabled=true，边 5+3=8
	topo := postJSON(t, r, "/api/topology/get", map[string]any{})
	td := topo["data"].(map[string]any)
	if td["wormhole_enabled"] != true || len(td["edges"].([]any)) != 8 {
		t.Fatalf("topo = %v", td)
	}
	// OFF
	resp = postJSON(t, r, "/api/wormhole/toggle", map[string]any{"enabled": false})
	if resp["code"].(float64) != 0 || resp["data"].(map[string]any)["wormhole_enabled"] != false {
		t.Fatalf("toggle off = %v", resp)
	}
}

func TestRiskEvaluateEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/demo/init", map[string]any{})
	open := postJSON(t, r, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"})
	sid := open["data"].(map[string]any)["session"].(map[string]any)["session_id"].(string)
	// 2 条基线（seq1,2）→ 开虫洞 → 攻击消息 seq3（抖动相位 0，path 维满分）
	for i := 0; i < 2; i++ {
		postJSON(t, r, "/api/message/send", map[string]any{
			"session_id": sid, "msg_type": "HEARTBEAT",
			"source_node": "UAV-A-001-NODE", "target_node": "MGR",
		})
	}
	postJSON(t, r, "/api/wormhole/toggle", map[string]any{"enabled": true})
	postJSON(t, r, "/api/message/send", map[string]any{
		"session_id": sid, "msg_type": "POSITION_UPDATE",
		"source_node": "UAV-A-001-NODE", "target_node": "MGR",
	})
	resp := postJSON(t, r, "/api/risk/evaluate", map[string]any{"session_id": sid})
	if resp["code"].(float64) != 0 {
		t.Fatalf("evaluate: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["verdict"] != "DETECT" || d["threshold"].(float64) != 0.7 || d["risk_score"].(float64) < 0.7 {
		t.Fatalf("d = %v", d)
	}
	if d["session_status"] != "DEGRADED" {
		t.Fatalf("status = %v", d["session_status"])
	}
	dims := d["dimensions"].(map[string]any)
	for _, k := range []string{"identity", "adjacency", "latency", "challenge", "path"} {
		if _, ok := dims[k]; !ok {
			t.Fatalf("dims missing %s: %v", k, dims)
		}
	}
	if len(d["events"].([]any)) != 2 {
		t.Fatalf("events = %v", d["events"])
	}
	// X/Y 已隔离（node/list 可证）
	lst := postJSON(t, r, "/api/node/list", map[string]any{"node_type": "ATTACKER", "status": "ISOLATED"})
	if lst["data"].(map[string]any)["total"].(float64) != 2 {
		t.Fatalf("isolated = %v", lst["data"])
	}
}

func TestRiskEvaluateEndpointErrors(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/demo/init", map[string]any{})
	// 会话不存在 → 6002
	if resp := postJSON(t, r, "/api/risk/evaluate", map[string]any{"session_id": "SESS-none"}); resp["code"].(float64) != 6002 {
		t.Fatalf("missing session = %v", resp)
	}
	// node_x 不存在 → 4003
	open := postJSON(t, r, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"})
	sid := open["data"].(map[string]any)["session"].(map[string]any)["session_id"].(string)
	if resp := postJSON(t, r, "/api/risk/evaluate", map[string]any{"session_id": sid, "node_x": "GHOST"}); resp["code"].(float64) != 4003 {
		t.Fatalf("ghost node = %v", resp)
	}
	// 缺 session_id → 6002
	if resp := postJSON(t, r, "/api/risk/evaluate", map[string]any{}); resp["code"].(float64) != 6002 {
		t.Fatalf("missing sid = %v", resp)
	}
}
