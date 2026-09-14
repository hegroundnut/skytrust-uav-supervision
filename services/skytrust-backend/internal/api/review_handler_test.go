package api

import "testing"

func TestReviewEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	post := func(path string, body map[string]any) map[string]any { return postJSON(t, r, path, body) }
	seedUAVEnvHTTP(t, post)
	if resp := post("/api/mission/create", map[string]any{
		"operator_id": "Operator-O1", "uav_id": "UAV-O1-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R101", "R205"}, "altitude_min": 60, "altitude_max": 120,
		"payload_type": "CAMERA",
	}); resp["code"].(float64) != 0 {
		t.Fatalf("create: %v", resp)
	}
	sub := post("/api/mission/submit", map[string]any{"mission_id": "MISSION-2026-001", "operator": "Operator-O1"})
	if sub["code"].(float64) != 0 {
		t.Fatalf("submit: %v", sub)
	}
	appID := sub["data"].(map[string]any)["application"].(map[string]any)["application_id"].(string)

	bad := post("/api/review/submit", map[string]any{"application_id": appID, "result": "MAYBE", "reviewer": "FISCO-ADMIN"})
	if bad["code"].(float64) != 3003 {
		t.Fatalf("bad result: want 3003, got %v", bad["code"])
	}
	rev := post("/api/review/submit", map[string]any{
		"application_id": appID, "result": "APPROVED", "reviewer": "FISCO-ADMIN",
		"comment": "同意", "rules_hit": []string{"R-ALT-001"},
	})
	if rev["code"].(float64) != 0 {
		t.Fatalf("review: %v", rev)
	}
	d := rev["data"].(map[string]any)
	if d["mission"].(map[string]any)["status"] != "APPROVED" || d["crosschain"].(map[string]any)["status"] != "SUCCESS" {
		t.Fatalf("review data = %v", d)
	}
	q := post("/api/review/query", map[string]any{"application_id": appID})
	if q["code"].(float64) != 0 || q["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("query by app: %v", q)
	}
	rid := d["review"].(map[string]any)["review_id"].(string)
	q1 := post("/api/review/query", map[string]any{"review_id": rid})
	if q1["code"].(float64) != 0 || q1["data"].(map[string]any)["result"] != "APPROVED" {
		t.Fatalf("query by id: %v", q1)
	}
	neither := post("/api/review/query", map[string]any{})
	if neither["code"].(float64) != 6002 {
		t.Fatalf("neither: want 6002, got %v", neither["code"])
	}
}
