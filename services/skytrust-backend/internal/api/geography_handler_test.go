package api

import (
	"testing"
)

func TestRouteCreateCoordinates(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	// 1) 内嵌坐标自动解析
	resp := postJSON(t, r, "/api/route/create", map[string]any{
		"route_id": "R-GEO-A", "zone": "Zone-A",
		"start_point": "A-ENTRY(30.510,114.310)", "end_point": "A-EXIT(30.540,114.340)",
		"altitude_min": 60, "altitude_max": 120,
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("route/create: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["start_lat"].(float64) != 30.510 || d["start_lon"].(float64) != 114.310 ||
		d["end_lat"].(float64) != 30.540 || d["end_lon"].(float64) != 114.340 {
		t.Errorf("内嵌坐标解析 = %v", d)
	}
	// 2) 显式字段优先
	resp = postJSON(t, r, "/api/route/create", map[string]any{
		"route_id": "R-GEO-B", "zone": "Zone-A",
		"start_point": "A-ENTRY(30.510,114.310)", "end_point": "A-EXIT(30.540,114.340)",
		"start_lat": 1.5, "start_lon": 2.5, "end_lat": 3.5, "end_lon": 4.5,
		"altitude_min": 60, "altitude_max": 120,
	})
	d = resp["data"].(map[string]any)
	if d["start_lat"].(float64) != 1.5 || d["start_lon"].(float64) != 2.5 ||
		d["end_lat"].(float64) != 3.5 || d["end_lon"].(float64) != 4.5 {
		t.Errorf("显式字段应优先 = %v", d)
	}
	// 3) 无法解析 → 保持 0 不报错
	resp = postJSON(t, r, "/api/route/create", map[string]any{
		"route_id": "R-GEO-C", "zone": "Zone-A", "start_point": "S9", "end_point": "E9",
		"altitude_min": 60, "altitude_max": 120,
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("无坐标航线不应报错: %v", resp)
	}
	d = resp["data"].(map[string]any)
	if d["start_lat"].(float64) != 0 || d["end_lon"].(float64) != 0 {
		t.Errorf("解析失败应保持 0 = %v", d)
	}
}

func TestNodeRegisterLatLon(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	resp := postJSON(t, r, "/api/node/register", map[string]any{
		"node_id": "N-GEO-1", "node_type": "EDGE",
		"position": map[string]any{"X": 1, "Y": 2},
		"lat":      30.5, "lon": 114.3,
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("node/register: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["lat"].(float64) != 30.5 || d["lon"].(float64) != 114.3 {
		t.Errorf("lat/lon = %v", d)
	}
	// 不提供 lat/lon → 保持 0，注册照常成功
	resp = postJSON(t, r, "/api/node/register", map[string]any{
		"node_id": "N-GEO-2", "node_type": "EDGE",
		"position": map[string]any{"X": 3, "Y": 4},
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("node/register without coords: %v", resp)
	}
	if resp["data"].(map[string]any)["lat"].(float64) != 0 {
		t.Errorf("未提供坐标应保持 0 = %v", resp["data"])
	}
}

func TestSeedRoutesAndNodesHaveCoords(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	resp := postJSON(t, r, "/api/route/list", map[string]any{"zone": "Zone-A"})
	recs := resp["data"].(map[string]any)["records"].([]any)
	found := false
	for _, rec := range recs {
		m := rec.(map[string]any)
		if m["route_id"] == "R101" {
			found = true
			if m["start_lat"].(float64) != 30.498 || m["start_lon"].(float64) != 119.980 ||
				m["end_lat"].(float64) != 30.528 || m["end_lon"].(float64) != 120.010 {
				t.Errorf("R101 坐标 = %v", m)
			}
		}
	}
	if !found {
		t.Fatal("seed 未找到 R101")
	}
	resp = postJSON(t, r, "/api/node/list", map[string]any{})
	recs = resp["data"].(map[string]any)["records"].([]any)
	seenMGR := false
	for _, rec := range recs {
		m := rec.(map[string]any)
		if m["node_id"] == "MGR" {
			seenMGR = true
			if m["lat"].(float64) != 30.608 || m["lon"].(float64) != 120.090 {
				t.Errorf("MGR 坐标 = %v", m)
			}
		}
	}
	if !seenMGR {
		t.Fatal("seed 未找到 MGR 节点")
	}
}
