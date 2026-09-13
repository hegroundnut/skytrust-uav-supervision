package api

import "testing"

func TestDemoInitEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	resp := post(r, "/api/demo/init", map[string]any{})
	if resp.Code != 0 {
		t.Fatalf("init failed: %+v", resp)
	}
	d := dataMap(resp)
	created := d["created"].(map[string]any)
	if created["uav"].(float64) != 7 {
		t.Errorf("created uav = %v", created["uav"])
	}
	// 幂等：第二次 skipped
	resp2 := post(r, "/api/demo/init", map[string]any{})
	d2 := dataMap(resp2)
	if d2["skipped"].(map[string]any)["uav"].(float64) != 7 {
		t.Errorf("second init not idempotent: %+v", d2)
	}
}

func TestDemoResetEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	post(r, "/api/demo/init", map[string]any{})
	resp := post(r, "/api/demo/reset", map[string]any{})
	if resp.Code != 0 {
		t.Fatalf("reset failed: %+v", resp)
	}
	d := dataMap(resp)
	if d["tables_cleared"].(float64) < 10 {
		t.Errorf("tables_cleared = %v", d["tables_cleared"])
	}
	if _, ok := d["reset_at"]; !ok {
		t.Error("missing reset_at")
	}
}

func TestChainStatusWithChains(t *testing.T) {
	r := setupFullTestRouter(t)
	resp := post(r, "/api/chain/status", map[string]any{})
	if resp.Code != 0 {
		t.Fatal(resp.Message)
	}
	chains := dataMap(resp)["chains"].(map[string]any)
	for _, name := range []string{"fabric", "chainmaker", "fisco-bcos"} {
		if chains[name] != "ONLINE" {
			t.Errorf("%s = %v", name, chains[name])
		}
	}
}
