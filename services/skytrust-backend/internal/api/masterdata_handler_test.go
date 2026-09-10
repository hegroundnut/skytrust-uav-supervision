package api

import "testing"

func TestMasterdataEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	// 厂商注册 + 重复 + 列表
	ok1 := postJSON(t, r, "/api/manufacturer/register", map[string]any{"manufacturer_id": "Manufacturer-Z", "name": "厂商Z", "adapter_type": "fabric"})
	if ok1["code"].(float64) != 0 {
		t.Fatalf("manufacturer register: %v", ok1)
	}
	dup := postJSON(t, r, "/api/manufacturer/register", map[string]any{"manufacturer_id": "Manufacturer-Z", "name": "重复"})
	if dup["code"].(float64) != 6002 {
		t.Fatalf("manufacturer dup: want 6002, got %v", dup["code"])
	}
	ml := postJSON(t, r, "/api/manufacturer/list", map[string]any{})
	if ml["code"].(float64) != 0 || ml["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("manufacturer list: %v", ml)
	}
	// 运营方注册（默认值）+ 列表
	o := postJSON(t, r, "/api/operator/register", map[string]any{"operator_id": "Operator-Z", "name": "运营Z"})
	if o["code"].(float64) != 0 {
		t.Fatalf("operator register: %v", o)
	}
	od := o["data"].(map[string]any)
	if od["status"] != "ACTIVE" || od["qualification_status"] != "QUALIFIED" {
		t.Fatalf("operator defaults: %v", od)
	}
	ol := postJSON(t, r, "/api/operator/list", map[string]any{})
	if ol["code"].(float64) != 0 || ol["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("operator list: %v", ol)
	}
	// 航线创建 + 非法高度 + 过滤列表
	rt := postJSON(t, r, "/api/route/create", map[string]any{"route_id": "R900", "zone": "Zone-A", "start_point": "P1", "end_point": "P2", "altitude_min": 60, "altitude_max": 120})
	if rt["code"].(float64) != 0 || rt["data"].(map[string]any)["corridor_status"] != "OPEN" {
		t.Fatalf("route create: %v", rt)
	}
	bad := postJSON(t, r, "/api/route/create", map[string]any{"route_id": "R901", "zone": "Zone-A", "start_point": "P1", "end_point": "P2", "altitude_min": 120, "altitude_max": 60})
	if bad["code"].(float64) != 6002 {
		t.Fatalf("route bad altitude: want 6002, got %v", bad["code"])
	}
	rl := postJSON(t, r, "/api/route/list", map[string]any{"zone": "Zone-A", "corridor_status": "OPEN"})
	if rl["code"].(float64) != 0 || rl["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("route list: %v", rl)
	}
	empty := postJSON(t, r, "/api/route/list", map[string]any{})
	if empty["code"].(float64) != 0 {
		t.Fatalf("route list empty body: %v", empty)
	}
}
