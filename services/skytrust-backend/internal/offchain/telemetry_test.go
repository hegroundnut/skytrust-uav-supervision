package offchain

import (
	"context"
	"math"
	"testing"
	"time"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

func TestReportTelemetryLifecycle(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc) // ACTIVE 会话（UAV-A-001）

	// 上报两条：seq 服务端自增 1、2，Source=MANUAL
	tlm1, err := svc.ReportTelemetry(ctx, "TRACE-TLM-1", &TelemetryReportRequest{
		SessionID: sid, Lat: 30.52, Lon: 114.32, Alt: 85, Speed: 12, Heading: 45,
	})
	if err != nil {
		t.Fatalf("ReportTelemetry: %v", err)
	}
	if tlm1.Seq != 1 || tlm1.Source != "MANUAL" || tlm1.UAVID != "UAV-A-001" || tlm1.Lat != 30.52 {
		t.Errorf("tlm1 = %+v", tlm1)
	}
	if tlm1.TelemetryID[:4] != "TLM-" {
		t.Errorf("telemetry_id = %q, want TLM- 前缀", tlm1.TelemetryID)
	}
	if tlm1.ReportedAt.Before(timex.Now().Add(-time.Minute)) {
		t.Errorf("reported_at = %v, 应为当前时间", tlm1.ReportedAt)
	}
	tlm2, err := svc.ReportTelemetry(ctx, "TRACE-TLM-2", &TelemetryReportRequest{SessionID: sid, Lat: 30.53, Lon: 114.33})
	if err != nil {
		t.Fatalf("ReportTelemetry 2: %v", err)
	}
	if tlm2.Seq != 2 {
		t.Errorf("seq = %d, want 2（服务端自增）", tlm2.Seq)
	}

	// 不存在会话 → 6002（复用 loadSession）
	_, err = svc.ReportTelemetry(ctx, "TRACE-TLM-3", &TelemetryReportRequest{SessionID: "SESS-NOPE-001"})
	if errCodeOf(err) != errcode.Param {
		t.Errorf("unknown session err = %v, want 6002", err)
	}

	// 非 ACTIVE 会话 → 7003
	svc.db.Model(&model.OffchainSession{}).Where("session_id = ?", sid).Update("status", "CLOSED")
	_, err = svc.ReportTelemetry(ctx, "TRACE-TLM-4", &TelemetryReportRequest{SessionID: sid})
	if errCodeOf(err) != errcode.TelemetrySession {
		t.Errorf("closed session err = %v, want 7003", err)
	}
}

func TestTelemetryListAndLatest(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	for i := 0; i < 3; i++ {
		if _, err := svc.ReportTelemetry(ctx, "TRACE-TLM-L", &TelemetryReportRequest{
			SessionID: sid, Lat: 30.5 + float64(i)*0.01, Lon: 114.3,
		}); err != nil {
			t.Fatalf("report %d: %v", i, err)
		}
	}

	// 列表：session 过滤 + 分页归一化
	q := &TelemetryQuery{SessionID: sid, Page: 0, PageSize: 0}
	q.Normalize()
	rows, total, err := svc.TelemetryList(ctx, "TRACE-TLM-L", q)
	if err != nil {
		t.Fatalf("TelemetryList: %v", err)
	}
	if total != 3 || len(rows) != 3 || q.Page != 1 || q.PageSize != 20 {
		t.Errorf("list total=%d len=%d page=%d size=%d", total, len(rows), q.Page, q.PageSize)
	}
	// uav_id 过滤
	q2 := &TelemetryQuery{UAVID: "UAV-A-001"}
	q2.Normalize()
	_, total2, err := svc.TelemetryList(ctx, "TRACE-TLM-L", q2)
	if err != nil || total2 != 3 {
		t.Errorf("uav filter total=%d err=%v", total2, err)
	}

	// latest：按 session → seq 最大那条
	latest, err := svc.LatestTelemetry(ctx, "TRACE-TLM-L", &TelemetryLatestRequest{SessionID: sid})
	if err != nil {
		t.Fatalf("LatestTelemetry: %v", err)
	}
	if latest == nil || latest.Seq != 3 {
		t.Errorf("latest = %+v, want seq 3", latest)
	}
	// 无记录 → (nil, nil)（API 层 code=0 + telemetry:null）
	none, err := svc.LatestTelemetry(ctx, "TRACE-TLM-L", &TelemetryLatestRequest{UAVID: "UAV-NOPE"})
	if err != nil || none != nil {
		t.Errorf("no-record latest = (%v, %v), want (nil, nil)", none, err)
	}
	// 两个过滤都空 → 6002
	_, err = svc.LatestTelemetry(ctx, "TRACE-TLM-L", &TelemetryLatestRequest{})
	if errCodeOf(err) != errcode.Param {
		t.Errorf("empty latest err = %v, want 6002", err)
	}
}

func TestCorridorOf(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	svc.db.Create(&model.RouteSegment{
		RouteID: "R-C1", Zone: "Zone-T", StartPoint: "C1(30.500,114.300)", EndPoint: "C2(30.510,114.310)",
		StartLat: 30.500, StartLon: 114.300, EndLat: 30.510, EndLon: 114.310,
		AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN",
	})
	svc.db.Create(&model.RouteSegment{
		RouteID: "R-C2", Zone: "Zone-T", StartPoint: "C2(30.510,114.310)", EndPoint: "C3(30.520,114.320)",
		StartLat: 30.510, StartLon: 114.310, EndLat: 30.520, EndLon: 114.320,
		AltitudeMin: 100, AltitudeMax: 140, CorridorStatus: "OPEN",
	})
	svc.db.Create(&model.Mission{MissionID: "MISSION-C1", RouteSegments: `["R-C1","R-C2"]`, Status: "APPROVED"})

	wps, ok := svc.corridorOf(ctx, "MISSION-C1")
	if !ok {
		t.Fatal("corridorOf 应成功")
	}
	if len(wps) != 3 {
		t.Fatalf("waypoints = %d, want 3（相邻段共享点去重）", len(wps))
	}
	if wps[0].Alt != 90 || wps[1].Alt != 120 || wps[2].Alt != 120 {
		t.Errorf("高度带中值 = (%v,%v,%v), want (90,120,120)（共享点取后段）", wps[0].Alt, wps[1].Alt, wps[2].Alt)
	}
	// 任务不存在 → false
	if _, ok := svc.corridorOf(ctx, "MISSION-NOPE"); ok {
		t.Error("未知任务应 ok=false")
	}
	// 航段缺结构化坐标 → false（不造假）
	svc.db.Create(&model.RouteSegment{RouteID: "R-C0", Zone: "Zone-T", StartPoint: "S9", EndPoint: "E9", AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN"})
	svc.db.Create(&model.Mission{MissionID: "MISSION-C0", RouteSegments: `["R-C0"]`, Status: "APPROVED"})
	if _, ok := svc.corridorOf(ctx, "MISSION-C0"); ok {
		t.Error("缺坐标任务应 ok=false（跳过不造假）")
	}
}

func TestAdvanceOne(t *testing.T) {
	// 正北段 ~111m：(30.000,114.000) → (30.001,114.000)
	segLen := haversineM(30.000, 114.000, 30.001, 114.000)
	wps := []tlmWaypoint{{Lat: 30.000, Lon: 114.000, Alt: 80}, {Lat: 30.001, Lon: 114.000, Alt: 100}}

	// 半步 → 段中点，航向 ~0（正北）
	p := &tlmProgress{}
	lat, lon, alt, hd := advanceOne(p, wps, segLen/2)
	if math.Abs(lat-30.0005) > 1e-6 || math.Abs(lon-114.000) > 1e-9 {
		t.Errorf("中点 = (%v,%v), want (30.0005,114.000)", lat, lon)
	}
	if math.Abs(alt-90) > 1e-6 {
		t.Errorf("alt = %v, want 90（高度带插值）", alt)
	}
	if math.Abs(hd) > 0.5 && math.Abs(hd-360) > 0.5 {
		t.Errorf("正北 heading = %v, want ~0", hd)
	}

	// 步长超全程（单段）→ 循环回起点
	p2 := &tlmProgress{}
	lat2, _, _, _ := advanceOne(p2, wps, segLen*1.5)
	if p2.SegIdx != 0 || p2.Frac != 0 || lat2 != wps[0].Lat {
		t.Errorf("wrap = (%v, %+v), want 回到起点", lat2, p2)
	}

	// 两段等长各 ~111m，步长 1.5 段 → 落在第二段 frac≈0.5（跨段结转）
	wps3 := []tlmWaypoint{{Lat: 30.000, Lon: 114.000, Alt: 80}, {Lat: 30.001, Lon: 114.000, Alt: 80}, {Lat: 30.002, Lon: 114.000, Alt: 80}}
	p3 := &tlmProgress{}
	lat3, _, _, _ := advanceOne(p3, wps3, segLen*1.5)
	if p3.SegIdx != 1 {
		t.Errorf("segIdx = %d, want 1", p3.SegIdx)
	}
	if math.Abs(lat3-30.0015) > 1e-6 {
		t.Errorf("lat3 = %v, want ~30.0015", lat3)
	}
}

func TestTelemetryAutopilotTick(t *testing.T) {
	svc := newTestSvc(t)
	sid := openTestSession(t, svc)
	// 走廊 R-T1：(30.500,114.300)→(30.510,114.310)，高度带 60–120（中值 90）
	svc.db.Create(&model.RouteSegment{
		RouteID: "R-T1", Zone: "Zone-T", StartPoint: "T-START(30.500,114.300)", EndPoint: "T-END(30.510,114.310)",
		StartLat: 30.500, StartLon: 114.300, EndLat: 30.510, EndLon: 114.310,
		AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN",
	})
	svc.db.Create(&model.Mission{MissionID: "MISSION-T1", OperatorID: "Operator-A", UAVID: "UAV-A-001", MissionType: "POWER_INSPECTION", RouteSegments: `["R-T1"]`, AltitudeMin: 60, AltitudeMax: 120, Status: "APPROVED"})
	svc.db.Model(&model.OffchainSession{}).Where("session_id = ?", sid).Update("mission_id", "MISSION-T1")

	ap := NewTelemetryAutopilot(svc, 1000) // 1s 间隔 → 每 tick 步长 12m
	ap.tick()
	var rows []model.TelemetryReport
	svc.db.Where("session_id = ?", sid).Order("seq ASC").Find(&rows)
	if len(rows) != 1 {
		t.Fatalf("tick 后行数 = %d, want 1", len(rows))
	}
	if rows[0].Seq != 1 || rows[0].Source != "SIM" || rows[0].MissionID != "MISSION-T1" || rows[0].UAVID != "UAV-A-001" {
		t.Errorf("row = %+v", rows[0])
	}
	if rows[0].Alt != 90 {
		t.Errorf("alt = %v, want 90（高度带中值）", rows[0].Alt)
	}
	if rows[0].Lat < 30.500 || rows[0].Lat > 30.510 {
		t.Errorf("lat = %v 不在走廊内", rows[0].Lat)
	}
	// 第二次 tick：seq 单调递增且向东北推进
	ap.tick()
	svc.db.Where("session_id = ?", sid).Order("seq ASC").Find(&rows)
	if len(rows) != 2 || rows[1].Seq != 2 {
		t.Fatalf("二次 tick 后 = %+v", rows)
	}
	if rows[1].Lat <= rows[0].Lat {
		t.Errorf("未推进: %v -> %v", rows[0].Lat, rows[1].Lat)
	}
	// 会话 CLOSED → 停止推进 + progress 清理
	svc.db.Model(&model.OffchainSession{}).Where("session_id = ?", sid).Update("status", "CLOSED")
	ap.tick()
	var cnt int64
	svc.db.Model(&model.TelemetryReport{}).Where("session_id = ?", sid).Count(&cnt)
	if cnt != 2 {
		t.Errorf("CLOSED 后仍推进: %d 行, want 2", cnt)
	}
	ap.mu.Lock()
	n := len(ap.progress)
	ap.mu.Unlock()
	if n != 0 {
		t.Errorf("progress 未清理: %d 项", n)
	}
}

func TestTelemetryAutopilotSkipsMissionWithoutCoords(t *testing.T) {
	svc := newTestSvc(t)
	sid := openTestSession(t, svc)
	svc.db.Create(&model.RouteSegment{RouteID: "R-T0", Zone: "Zone-T", StartPoint: "S9", EndPoint: "E9", AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN"})
	svc.db.Create(&model.Mission{MissionID: "MISSION-T0", RouteSegments: `["R-T0"]`, Status: "APPROVED"})
	svc.db.Model(&model.OffchainSession{}).Where("session_id = ?", sid).Update("mission_id", "MISSION-T0")

	ap := NewTelemetryAutopilot(svc, 1000)
	ap.tick()
	var cnt int64
	svc.db.Model(&model.TelemetryReport{}).Where("session_id = ?", sid).Count(&cnt)
	if cnt != 0 {
		t.Errorf("缺坐标任务不得生成假遥测, got %d 行", cnt)
	}
}

func TestNewTelemetryAutopilotNilSafety(t *testing.T) {
	svc := newTestSvc(t)
	if NewTelemetryAutopilot(nil, 1000) != nil {
		t.Error("svc=nil 应返回 nil")
	}
	if NewTelemetryAutopilot(svc, 0) != nil {
		t.Error("intervalMs=0 应返回 nil（测试恒关闭）")
	}
	if NewTelemetryAutopilot(svc, -5) != nil {
		t.Error("负值应返回 nil（显式关闭）")
	}
	var ap *TelemetryAutopilot
	ap.Start() // nil-receiver 不得 panic
	ap.Stop()
}
