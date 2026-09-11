package uavbusiness

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

// seedMissionEnv 主数据 + 一台 VERIFIED UAV + R101(OPEN)/R205(OPEN)/R300(CLOSED)。
func seedMissionEnv(t *testing.T, svc *Service) {
	t.Helper()
	ctx := context.Background()
	seedParties(t, svc)
	if _, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", Model: "YX-200", SerialNo: "SN-M-001"}); err != nil {
		t.Fatalf("seed uav: %v", err)
	}
	for _, r := range []RouteInput{
		{RouteID: "R101", Zone: "Zone-A", StartPoint: "P1", EndPoint: "P2", AltitudeMin: 60, AltitudeMax: 150},
		{RouteID: "R205", Zone: "Zone-A", StartPoint: "P2", EndPoint: "P3", AltitudeMin: 60, AltitudeMax: 150},
		{RouteID: "R300", Zone: "Zone-B", StartPoint: "P4", EndPoint: "P5", AltitudeMin: 60, AltitudeMax: 150, CorridorStatus: "CLOSED"},
	} {
		if _, err := svc.CreateRoute(ctx, "TRACE-T", r); err != nil {
			t.Fatalf("seed route %s: %v", r.RouteID, err)
		}
	}
}

func baseMissionInput() MissionInput {
	return MissionInput{
		OperatorID: "Operator-O1", UAVID: "UAV-O1-001", MissionType: "POWER_INSPECTION",
		StartTime: "2026-09-12 09:00:00", EndTime: "2026-09-12 11:00:00",
		RouteSegments: []string{"R101", "R205"}, AltitudeMin: 60, AltitudeMax: 120,
		PayloadType: "CAMERA",
	}
}

func TestCreateMissionFullFlow(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	in := baseMissionInput()
	in.Description = "巡线走廊并拍摄缺陷"
	m, err := svc.CreateMission(context.Background(), "TRACE-T", in)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if m.MissionID != "MISSION-2026-001" {
		t.Errorf("id = %q", m.MissionID)
	}
	if m.Status != "DRAFT" {
		t.Errorf("status = %q", m.Status)
	}
	if m.MaskedValue != "巡线走廊****" {
		t.Errorf("masked = %q", m.MaskedValue)
	}
	if len(m.SM3Hash) != 64 || m.Signature == "" || m.SM9Identity != "SM9-ID-UAV-O1-001" {
		t.Errorf("crypto fields: sm3=%q sig_len=%d sm9=%q", m.SM3Hash, len(m.Signature), m.SM9Identity)
	}
	plain, err := svc.cs.SM9Decrypt(m.MissionCiphertext)
	if err != nil || string(plain) != "巡线走廊并拍摄缺陷" {
		t.Errorf("ciphertext roundtrip: %q err=%v", plain, err)
	}
	if m.Zones != `["Zone-A"]` || m.RouteSegments != `["R101","R205"]` {
		t.Errorf("zones=%s segments=%s", m.Zones, m.RouteSegments)
	}
	b, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(b), "mission_ciphertext") || strings.Contains(string(b), m.MissionCiphertext) {
		t.Error("ciphertext must never be serialized")
	}
}

func TestCreateMissionValidation(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	ctx := context.Background()
	try := func(mut func(*MissionInput), want int, name string) {
		t.Helper()
		in := baseMissionInput()
		mut(&in)
		_, err := svc.CreateMission(ctx, "TRACE-T", in)
		if codeOf(err) != want {
			t.Errorf("%s: want %d, got %v", name, want, err)
		}
	}
	try(func(in *MissionInput) { in.UAVID = "UAV-NOPE" }, 1001, "uav 不存在")
	try(func(in *MissionInput) { in.OperatorID = "Operator-OTHER" }, 1001, "operator 不匹配")
	try(func(in *MissionInput) { in.RouteSegments = []string{"R999"} }, 3001, "航路不存在")
	try(func(in *MissionInput) { in.RouteSegments = []string{"R300"} }, 3001, "航路关闭")
	try(func(in *MissionInput) { in.EndTime = "2026-09-12 08:00:00" }, 6002, "end<=start")
	try(func(in *MissionInput) { in.StartTime = "09/12/2026" }, 6002, "时间格式")
	try(func(in *MissionInput) { in.AltitudeMin, in.AltitudeMax = 120, 60 }, 6002, "高度区间")
	try(func(in *MissionInput) { in.PayloadType = "" }, 6002, "缺 payload_type")
	// REVOKED UAV → 1001
	if _, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-M-002"}); err != nil {
		t.Fatalf("second uav: %v", err)
	}
	if _, err := svc.RevokeUAV(ctx, "TRACE-T", "UAV-O1-002", "退役", "Operator-O1"); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	try(func(in *MissionInput) { in.UAVID = "UAV-O1-002" }, 1001, "REVOKED uav")
	// 显式 ID 重复 → 6002
	first := baseMissionInput()
	first.MissionID = "MISSION-EXPLICIT-1"
	if _, err := svc.CreateMission(ctx, "TRACE-T", first); err != nil {
		t.Fatalf("explicit create: %v", err)
	}
	try(func(in *MissionInput) { in.MissionID = "MISSION-EXPLICIT-1" }, 6002, "显式 ID 重复")
}

func TestQueryListMission(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	ctx := context.Background()
	m1, err := svc.CreateMission(ctx, "TRACE-T", baseMissionInput())
	if err != nil {
		t.Fatalf("create m1: %v", err)
	}
	in2 := baseMissionInput()
	in2.MissionID = "MISSION-X-002"
	if _, err := svc.CreateMission(ctx, "TRACE-T", in2); err != nil {
		t.Fatalf("create m2: %v", err)
	}
	got, err := svc.QueryMission(ctx, "TRACE-T", m1.MissionID)
	if err != nil || got.MissionID != m1.MissionID {
		t.Fatalf("query: %+v err=%v", got, err)
	}
	if _, err := svc.QueryMission(ctx, "TRACE-T", "MISSION-NOPE"); codeOf(err) != 6002 {
		t.Fatalf("query unknown: %v", err)
	}
	all, total, err := svc.ListMission(ctx, "TRACE-T", MissionListFilter{})
	if err != nil || total != 2 || len(all) != 2 {
		t.Fatalf("list all: %d/%d err=%v", len(all), total, err)
	}
	drafts, total, err := svc.ListMission(ctx, "TRACE-T", MissionListFilter{OperatorID: "Operator-O1", Status: "DRAFT"})
	if err != nil || total != 2 || len(drafts) != 2 {
		t.Fatalf("list drafts: %d/%d err=%v", len(drafts), total, err)
	}
	pg, total, err := svc.ListMission(ctx, "TRACE-T", MissionListFilter{Page: 2, PageSize: 1})
	if err != nil || total != 2 || len(pg) != 1 {
		t.Fatalf("list paged: %d/%d err=%v", len(pg), total, err)
	}
}
