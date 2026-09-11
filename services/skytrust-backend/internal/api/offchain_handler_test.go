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
