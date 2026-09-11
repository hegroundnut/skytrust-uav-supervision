package api

import "testing"

func TestUAVEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	if resp := postJSON(t, r, "/api/manufacturer/register", map[string]any{"manufacturer_id": "Manufacturer-M1", "name": "M1"}); resp["code"].(float64) != 0 {
		t.Fatalf("seed manufacturer: %v", resp)
	}
	if resp := postJSON(t, r, "/api/operator/register", map[string]any{"operator_id": "Operator-O1", "name": "O1"}); resp["code"].(float64) != 0 {
		t.Fatalf("seed operator: %v", resp)
	}
	reg := postJSON(t, r, "/api/uav/register", map[string]any{
		"manufacturer_id": "Manufacturer-M1", "operator_id": "Operator-O1",
		"model": "YX-200", "serial_no": "SN-H-001",
	})
	if reg["code"].(float64) != 0 {
		t.Fatalf("register: %v", reg)
	}
	data := reg["data"].(map[string]any)
	uav := data["uav"].(map[string]any)
	cx := data["crosschain"].(map[string]any)
	if uav["status"] != "VERIFIED" || uav["uav_id"] != "UAV-O1-001" {
		t.Fatalf("uav = %v", uav)
	}
	if cx["status"] != "SUCCESS" {
		t.Fatalf("crosschain = %v", cx)
	}
	uid := uav["uav_id"].(string)
	q := postJSON(t, r, "/api/uav/query", map[string]any{"uav_id": uid})
	if q["code"].(float64) != 0 || q["data"].(map[string]any)["sm9_identity"] != "SM9-ID-"+uid {
		t.Fatalf("query: %v", q)
	}
	l := postJSON(t, r, "/api/uav/list", map[string]any{"operator_id": "Operator-O1", "page_size": 10})
	if l["code"].(float64) != 0 || l["data"].(map[string]any)["total"].(float64) != 1 || l["data"].(map[string]any)["page_size"].(float64) != 10 {
		t.Fatalf("list: %v", l)
	}
	act := postJSON(t, r, "/api/uav/status", map[string]any{"uav_id": uid, "action": "ACTIVATE"})
	if act["code"].(float64) != 0 || act["data"].(map[string]any)["uav"].(map[string]any)["status"] != "ACTIVE" {
		t.Fatalf("activate: %v", act)
	}
	bad := postJSON(t, r, "/api/uav/status", map[string]any{"uav_id": uid, "action": "BOGUS"})
	if bad["code"].(float64) != 6002 {
		t.Fatalf("bogus action: want 6002, got %v", bad["code"])
	}
	rev := postJSON(t, r, "/api/uav/revoke", map[string]any{"uav_id": uid, "reason": "退役", "operator": "Operator-O1"})
	if rev["code"].(float64) != 0 || rev["data"].(map[string]any)["status"] != "REVOKED" {
		t.Fatalf("revoke: %v", rev)
	}
	rev2 := postJSON(t, r, "/api/uav/revoke", map[string]any{"uav_id": uid})
	if rev2["code"].(float64) != 1004 {
		t.Fatalf("re-revoke: want 1004, got %v", rev2["code"])
	}
	miss := postJSON(t, r, "/api/uav/query", map[string]any{"uav_id": "UAV-NOPE"})
	if miss["code"].(float64) != 1001 {
		t.Fatalf("query unknown: want 1001, got %v", miss["code"])
	}
}
