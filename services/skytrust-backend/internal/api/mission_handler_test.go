package api

import (
	"fmt"
	"testing"

	"skytrust-backend/internal/timex"
)

// seqID 重构自动生成序列 ID，仅用于 PASS 侧（C17：genPassID 年份显式取自
// timex.Now().Year()，随当前年滚动）。MISSION 侧（C17 范围裁定）：年份随任务 start_time
// 年滚动——夹具窗口均冻结于 2026，断言直接写 MISSION-2026-001 等冻结字面量（年翻稳定）。
func seqID(prefix string, n int) string {
	return fmt.Sprintf("%s-%d-%03d", prefix, timex.Now().Year(), n)
}

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

func TestMissionSubmitEndpoint(t *testing.T) {
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
		"payload_type": "CAMERA",
	})
	if create["code"].(float64) != 0 {
		t.Fatalf("create: %v", create)
	}
	sub := post("/api/mission/submit", map[string]any{"mission_id": "MISSION-2026-001", "operator": "Operator-O1"})
	if sub["code"].(float64) != 0 {
		t.Fatalf("submit: %v", sub)
	}
	d := sub["data"].(map[string]any)
	app := d["application"].(map[string]any)
	cx := d["crosschain"].(map[string]any)
	if app["status"] != "RELAYED" || cx["status"] != "SUCCESS" {
		t.Fatalf("app=%v cx=%v", app["status"], cx["status"])
	}
	if cx["source_chain_tx_id"] != app["source_tx_id"] {
		t.Errorf("source tx mismatch: %v vs %v", cx["source_chain_tx_id"], app["source_tx_id"])
	}
	again := post("/api/mission/submit", map[string]any{"mission_id": "MISSION-2026-001", "operator": "Operator-O1"})
	if again["code"].(float64) != 3004 {
		t.Fatalf("resubmit: want 3004, got %v", again["code"])
	}
	q := post("/api/mission/query", map[string]any{"mission_id": "MISSION-2026-001"})
	if q["data"].(map[string]any)["status"] != "SUBMITTED" {
		t.Fatalf("mission status = %v", q["data"].(map[string]any)["status"])
	}
}
