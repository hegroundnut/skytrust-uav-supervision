package api

import "testing"

// seedUAVEnvHTTP 经 HTTP 端点铺设：厂商/运营方/UAV(VERIFIED)/R101+R205(OPEN)。
func seedUAVEnvHTTP(t *testing.T, post func(string, map[string]any) map[string]any) {
	t.Helper()
	for _, body := range []struct {
		path string
		req  map[string]any
	}{
		{"/api/manufacturer/register", map[string]any{"manufacturer_id": "Manufacturer-M1", "name": "M1"}},
		{"/api/operator/register", map[string]any{"operator_id": "Operator-O1", "name": "O1"}},
		{"/api/uav/register", map[string]any{"manufacturer_id": "Manufacturer-M1", "operator_id": "Operator-O1", "serial_no": "SN-H-101"}},
		{"/api/route/create", map[string]any{"route_id": "R101", "zone": "Zone-A", "start_point": "P1", "end_point": "P2", "altitude_min": 60, "altitude_max": 150}},
		{"/api/route/create", map[string]any{"route_id": "R205", "zone": "Zone-A", "start_point": "P2", "end_point": "P3", "altitude_min": 60, "altitude_max": 150}},
	} {
		if resp := post(body.path, body.req); resp["code"].(float64) != 0 {
			t.Fatalf("seed %s: %v", body.path, resp)
		}
	}
}

func TestMissionEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	post := func(path string, body map[string]any) map[string]any { return postJSON(t, r, path, body) }
	seedUAVEnvHTTP(t, post)

	create := post("/api/mission/create", map[string]any{
		"operator_id": "Operator-O1", "uav_id": "UAV-O1-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R101", "R205"}, "altitude_min": 60, "altitude_max": 120,
		"payload_type": "CAMERA", "description": "巡线走廊并拍摄缺陷",
	})
	if create["code"].(float64) != 0 {
		t.Fatalf("create: %v", create)
	}
	m := create["data"].(map[string]any)
	if m["mission_id"] != "MISSION-2026-001" || m["status"] != "DRAFT" || m["masked_value"] != "巡线走廊****" {
		t.Fatalf("mission = %v", m)
	}
	if _, has := m["mission_ciphertext"]; has {
		t.Fatal("ciphertext leaked in response")
	}
	q := post("/api/mission/query", map[string]any{"mission_id": "MISSION-2026-001"})
	if q["code"].(float64) != 0 {
		t.Fatalf("query: %v", q)
	}
	miss := post("/api/mission/query", map[string]any{"mission_id": "MISSION-NOPE"})
	if miss["code"].(float64) != 6002 {
		t.Fatalf("query unknown: want 6002, got %v", miss["code"])
	}
	bad := post("/api/mission/create", map[string]any{
		"operator_id": "Operator-O1", "uav_id": "UAV-O1-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R999"}, "altitude_min": 60, "altitude_max": 120, "payload_type": "CAMERA",
	})
	if bad["code"].(float64) != 3001 {
		t.Fatalf("unknown route: want 3001, got %v", bad["code"])
	}
	l := post("/api/mission/list", map[string]any{"operator_id": "Operator-O1", "status": "DRAFT"})
	if l["code"].(float64) != 0 || l["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("list: %v", l)
	}
}
