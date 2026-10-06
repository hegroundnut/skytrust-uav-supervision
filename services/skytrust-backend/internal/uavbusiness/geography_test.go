package uavbusiness

import (
	"context"
	"testing"
)

func TestParsePointCoords(t *testing.T) {
	cases := []struct {
		in       string
		lat, lon float64
		ok       bool
	}{
		{"A-ENTRY(30.510,114.310)", 30.510, 114.310, true},
		{"B-GATE(30.572, 114.372)", 30.572, 114.372, true}, // 逗号后空格合法
		{"(30.1,114.2)", 30.1, 114.2, true},                // 无名纯坐标
		{"S9", 0, 0, false},                                // 无括号
		{"A(30.5)", 0, 0, false},                           // 缺第二值
		{"A(xx,yy)", 0, 0, false},                          // 非数字
		{"A()", 0, 0, false},                               // 空括号
		{"A-ENTRY(NaN,114.310)", 0, 0, false},              // NaN 拼写判为解析失败（非有限值）
		{"A-ENTRY(Inf,114.310)", 0, 0, false},              // +Inf 拼写判为解析失败
		{"A-ENTRY(30.510,-Inf)", 0, 0, false},              // -Inf 拼写判为解析失败
	}
	for _, c := range cases {
		lat, lon, ok := parsePointCoords(c.in)
		if ok != c.ok || lat != c.lat || lon != c.lon {
			t.Errorf("parsePointCoords(%q) = (%v,%v,%v), want (%v,%v,%v)", c.in, lat, lon, ok, c.lat, c.lon, c.ok)
		}
	}
}

func TestCreateRouteCoordinateBackfill(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()

	// 1) 内嵌 "NAME(lat,lon)" 自动解析
	r, err := svc.CreateRoute(ctx, "TRACE-GEO-1", RouteInput{
		RouteID: "R-GEO-1", Zone: "Zone-A",
		StartPoint: "A-ENTRY(30.510,114.310)", EndPoint: "A-EXIT(30.540,114.340)",
		AltitudeMin: 60, AltitudeMax: 120,
	})
	if err != nil {
		t.Fatalf("CreateRoute: %v", err)
	}
	if r.StartLat != 30.510 || r.StartLon != 114.310 || r.EndLat != 30.540 || r.EndLon != 114.340 {
		t.Errorf("backfill = (%v,%v,%v,%v), want (30.51,114.31,30.54,114.34)", r.StartLat, r.StartLon, r.EndLat, r.EndLon)
	}

	// 2) 显式字段优先，不被内嵌解析覆盖
	r2, err := svc.CreateRoute(ctx, "TRACE-GEO-2", RouteInput{
		RouteID: "R-GEO-2", Zone: "Zone-A",
		StartPoint: "A-ENTRY(30.510,114.310)", EndPoint: "A-EXIT(30.540,114.340)",
		StartLat: 1.5, StartLon: 2.5, EndLat: 3.5, EndLon: 4.5,
		AltitudeMin: 60, AltitudeMax: 120,
	})
	if err != nil {
		t.Fatalf("CreateRoute explicit: %v", err)
	}
	if r2.StartLat != 1.5 || r2.StartLon != 2.5 || r2.EndLat != 3.5 || r2.EndLon != 4.5 {
		t.Errorf("explicit coords = (%v,%v,%v,%v), want (1.5,2.5,3.5,4.5)", r2.StartLat, r2.StartLon, r2.EndLat, r2.EndLon)
	}

	// 3) 解析失败 → 保持 0 且不报错（spec §3.1）
	r3, err := svc.CreateRoute(ctx, "TRACE-GEO-3", RouteInput{
		RouteID: "R-GEO-3", Zone: "Zone-A",
		StartPoint: "S9", EndPoint: "E9",
		AltitudeMin: 60, AltitudeMax: 120,
	})
	if err != nil {
		t.Fatalf("CreateRoute no-coords: %v", err)
	}
	if r3.StartLat != 0 || r3.StartLon != 0 || r3.EndLat != 0 || r3.EndLon != 0 {
		t.Errorf("unparseable route should keep zero coords, got (%v,%v,%v,%v)", r3.StartLat, r3.StartLon, r3.EndLat, r3.EndLon)
	}
}
