package api

import (
	"testing"
)

func TestAlertRaiseHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	resp := postJSON(t, r, "/api/alert/raise", map[string]any{
		"alert_id": "ALERT-2026-001", "uav_pseudonym": "PSEUDO-UAV-83921",
		"event_type": "ROUTE_DEVIATION", "risk_level": "HIGH",
		"source_system": "MANUAL", "operator": "REG-01", "mission_id": "MISSION-2026-001",
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("raise: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["alert_id"] != "ALERT-2026-001" || d["status"] != "OPEN" || d["evidence_hash"] == "" {
		t.Fatalf("raise data = %v", d)
	}
	// 绑定失败 → 6002 "参数错误: " 前缀
	bad := postJSON(t, r, "/api/alert/raise", map[string]any{"event_type": "ROUTE_DEVIATION"})
	if bad["code"].(float64) != 6002 || len(bad["message"].(string)) < 4 {
		t.Fatalf("bad raise: %v", bad)
	}
	// 枚举违规（绑定通过、service 拒绝）→ 6002
	enum := postJSON(t, r, "/api/alert/raise", map[string]any{
		"uav_pseudonym": "P", "event_type": "NOPE", "risk_level": "HIGH",
		"source_system": "MANUAL", "operator": "REG-01",
	})
	if enum["code"].(float64) != 6002 {
		t.Fatalf("enum: %v", enum)
	}
}

func TestAlertListHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/alert/raise", map[string]any{
		"uav_pseudonym": "PSEUDO-UAV-83921", "event_type": "WORMHOLE_ALERT",
		"risk_level": "HIGH", "source_system": "SYSTEM2", "operator": "REG-01",
	})
	// 空 body 合法
	resp := postJSON(t, r, "/api/alert/list", nil)
	if resp["code"].(float64) != 0 {
		t.Fatalf("list: %v", resp)
	}
	d := resp["data"].(map[string]any)
	for _, k := range []string{"records", "total", "page", "page_size"} {
		if _, ok := d[k]; !ok {
			t.Fatalf("envelope missing %s: %v", k, d)
		}
	}
	if d["total"].(float64) != 1 || d["page"].(float64) != 1 || d["page_size"].(float64) != 20 {
		t.Fatalf("envelope = %v", d)
	}
	f := postJSON(t, r, "/api/alert/list", map[string]any{"event_type": "ROUTE_DEVIATION"})
	if f["data"].(map[string]any)["total"].(float64) != 0 {
		t.Fatalf("filter = %v", f)
	}
}

func TestAlertStatusHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/alert/raise", map[string]any{
		"alert_id": "ALERT-2026-001", "uav_pseudonym": "PSEUDO-UAV-83921",
		"event_type": "ROUTE_DEVIATION", "risk_level": "HIGH",
		"source_system": "MANUAL", "operator": "REG-01",
	})
	ok := postJSON(t, r, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "IDENTIFIED", "operator": "REG-01",
	})
	if ok["code"].(float64) != 0 || ok["data"].(map[string]any)["status"] != "IDENTIFIED" {
		t.Fatalf("transition: %v", ok)
	}
	bad := postJSON(t, r, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "ARCHIVED", "operator": "REG-01",
	})
	if bad["code"].(float64) != 6002 {
		t.Fatalf("illegal jump: %v", bad)
	}
}
