package api

import "testing"

func TestAuditQueryEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	// demo/init 会写一条 REG-01 审计
	post(r, "/api/demo/init", map[string]any{})
	resp := post(r, "/api/audit/query", map[string]any{"page": 1, "page_size": 10})
	if resp.Code != 0 {
		t.Fatalf("code=%d", resp.Code)
	}
	d := dataMap(resp)
	if d["total"].(float64) < 1 {
		t.Error("expected at least one audit record")
	}
}

func TestAuditExportEndpoint(t *testing.T) {
	r := setupFullTestRouter(t)
	post(r, "/api/demo/init", map[string]any{})
	resp := post(r, "/api/audit/export", map[string]any{})
	if resp.Code != 0 {
		t.Fatalf("code=%d", resp.Code)
	}
	d := dataMap(resp)
	if d["format"] != "csv" || d["rows"].(float64) < 1 {
		t.Errorf("bad export: %+v", d)
	}
}
