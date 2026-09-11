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
