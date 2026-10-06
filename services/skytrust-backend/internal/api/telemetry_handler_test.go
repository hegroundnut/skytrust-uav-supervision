package api

import (
	"testing"
)

func TestTelemetryEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	open := postJSON(t, r, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"})
	if open["code"].(float64) != 0 {
		t.Fatalf("session/open: %v", open)
	}
	sid := open["data"].(map[string]any)["session"].(map[string]any)["session_id"].(string)

	// report：seq 服务端自增，Source=MANUAL
	rep := postJSON(t, r, "/api/telemetry/report", map[string]any{
		"session_id": sid, "lat": 30.52, "lon": 114.32, "alt": 85, "speed": 12, "heading": 45,
	})
	if rep["code"].(float64) != 0 {
		t.Fatalf("telemetry/report: %v", rep)
	}
	tlm := rep["data"].(map[string]any)["telemetry"].(map[string]any)
	if tlm["seq"].(float64) != 1 || tlm["source"] != "MANUAL" || tlm["uav_id"] != "UAV-A-001" {
		t.Errorf("telemetry = %v", tlm)
	}
	rep2 := postJSON(t, r, "/api/telemetry/report", map[string]any{"session_id": sid, "lat": 30.53, "lon": 114.33})
	if rep2["data"].(map[string]any)["telemetry"].(map[string]any)["seq"].(float64) != 2 {
		t.Errorf("第二条 seq = %v, want 2", rep2["data"])
	}
	// report 缺 session_id → 6002（binding required）
	if resp := postJSON(t, r, "/api/telemetry/report", map[string]any{"lat": 1}); resp["code"].(float64) != 6002 {
		t.Errorf("缺 session_id = %v, want 6002", resp)
	}

	// list：session 过滤 + 分页回显
	lst := postJSON(t, r, "/api/telemetry/list", map[string]any{"session_id": sid})
	d := lst["data"].(map[string]any)
	if d["total"].(float64) != 2 || d["page"].(float64) != 1 || d["page_size"].(float64) != 20 {
		t.Errorf("list = %v", d)
	}

	// latest：按 session → seq 2
	lt := postJSON(t, r, "/api/telemetry/latest", map[string]any{"session_id": sid})
	if lt["data"].(map[string]any)["telemetry"].(map[string]any)["seq"].(float64) != 2 {
		t.Errorf("latest = %v", lt["data"])
	}
	// latest 无记录 → code=0 + telemetry:null
	ln := postJSON(t, r, "/api/telemetry/latest", map[string]any{"uav_id": "UAV-NOPE"})
	if ln["code"].(float64) != 0 || ln["data"].(map[string]any)["telemetry"] != nil {
		t.Errorf("无记录 latest = %v, want code 0 + telemetry null", ln)
	}
	// latest 两个过滤都空 → 6002
	if resp := postJSON(t, r, "/api/telemetry/latest", map[string]any{}); resp["code"].(float64) != 6002 {
		t.Errorf("空过滤 latest = %v, want 6002", resp)
	}

	// 关闭会话后上报 → 7003
	if resp := postJSON(t, r, "/api/session/close", map[string]any{"session_id": sid, "operator": "OP-1", "reason": "测试完毕"}); resp["code"].(float64) != 0 {
		t.Fatalf("session/close: %v", resp)
	}
	if resp := postJSON(t, r, "/api/telemetry/report", map[string]any{"session_id": sid, "lat": 30.54}); resp["code"].(float64) != 7003 {
		t.Errorf("closed session report = %v, want 7003", resp)
	}
}
