package api

import "testing"

func TestConflictEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	post := func(path string, body map[string]any) map[string]any { return postJSON(t, r, path, body) }
	seedUAVEnvHTTP(t, post)
	// 第二运营方 + UAV
	if resp := post("/api/operator/register", map[string]any{"operator_id": "Operator-O2", "name": "O2"}); resp["code"].(float64) != 0 {
		t.Fatalf("seed operator2: %v", resp)
	}
	if resp := post("/api/uav/register", map[string]any{"manufacturer_id": "Manufacturer-M1", "operator_id": "Operator-O2", "serial_no": "SN-H-202"}); resp["code"].(float64) != 0 {
		t.Fatalf("seed uav2: %v", resp)
	}
	// 任务A + 任务B（§9.3 场景）
	mk := func(operator, uav string, segments []string, start, end string, altMin, altMax int) map[string]any {
		return post("/api/mission/create", map[string]any{
			"operator_id": operator, "uav_id": uav, "mission_type": "POWER_INSPECTION",
			"start_time": start, "end_time": end, "route_segments": segments,
			"altitude_min": altMin, "altitude_max": altMax, "payload_type": "CAMERA",
		})
	}
	a := mk("Operator-O1", "UAV-O1-001", []string{"R101", "R205"}, "2026-09-12 09:00:00", "2026-09-12 11:00:00", 60, 120)
	if a["code"].(float64) != 0 {
		t.Fatalf("create A: %v", a)
	}
	b := mk("Operator-O2", "UAV-O2-001", []string{"R205"}, "2026-09-12 10:00:00", "2026-09-12 12:00:00", 80, 120)
	if b["code"].(float64) != 0 || b["data"].(map[string]any)["mission_id"] != "MISSION-2026-002" {
		t.Fatalf("create B: %v", b)
	}
	for _, pair := range []struct{ id, op string }{{"MISSION-2026-001", "Operator-O1"}, {"MISSION-2026-002", "Operator-O2"}} {
		if resp := post("/api/mission/submit", map[string]any{"mission_id": pair.id, "operator": pair.op}); resp["code"].(float64) != 0 {
			t.Fatalf("submit %s: %v", pair.id, resp)
		}
	}
	det := post("/api/conflict/detect", map[string]any{"mission_id": "MISSION-2026-001"})
	if det["code"].(float64) != 0 || det["data"].(map[string]any)["count"].(float64) != 1 {
		t.Fatalf("detect: %v", det)
	}
	rec := det["data"].(map[string]any)["conflicts"].([]any)[0].(map[string]any)
	if rec["conflict_type"] != "ROUTE" || rec["status"] != "OPEN" {
		t.Fatalf("rec = %v", rec)
	}
	cid := rec["conflict_id"].(string)
	res := post("/api/conflict/resolve", map[string]any{"conflict_id": cid, "resolution": "时间窗后移30分钟", "operator": "Operator-O2"})
	if res["code"].(float64) != 0 || res["data"].(map[string]any)["status"] != "RESOLVED" {
		t.Fatalf("resolve: %v", res)
	}
	for _, id := range []string{"MISSION-2026-001", "MISSION-2026-002"} {
		q := post("/api/mission/query", map[string]any{"mission_id": id})
		if q["data"].(map[string]any)["status"] != "REVIEWING" {
			t.Fatalf("%s status = %v, want REVIEWING", id, q["data"].(map[string]any)["status"])
		}
	}
	miss := post("/api/conflict/detect", map[string]any{"mission_id": "MISSION-NOPE"})
	if miss["code"].(float64) != 6002 {
		t.Fatalf("detect unknown: want 6002, got %v", miss["code"])
	}
}
