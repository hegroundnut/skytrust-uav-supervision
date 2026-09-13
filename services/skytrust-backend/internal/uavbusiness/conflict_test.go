package uavbusiness

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// conflictEnv 铺设 §9.3 场景：Operator-O1 任务A(R101+R205, 09-11, 60-120) 与
// Operator-O2 任务B(R205, 10-12, 80-120)，双双 SUBMITTED。返回 (A, B)。
func conflictEnv(t *testing.T, svc *Service) (*model.Mission, *model.Mission) {
	t.Helper()
	ctx := context.Background()
	seedMissionEnv(t, svc)
	if _, err := svc.RegisterOperator(ctx, "TRACE-T", OperatorInput{OperatorID: "Operator-O2", Name: "O2"}); err != nil {
		t.Fatalf("seed operator2: %v", err)
	}
	if _, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O2", SerialNo: "SN-C-002"}); err != nil {
		t.Fatalf("seed uav2: %v", err)
	}
	if _, err := svc.CreateRoute(ctx, "TRACE-T", RouteInput{RouteID: "R209", Zone: "Zone-A", StartPoint: "P3", EndPoint: "P4", AltitudeMin: 60, AltitudeMax: 150}); err != nil {
		t.Fatalf("seed route R209: %v", err)
	}
	ma, err := svc.CreateMission(ctx, "TRACE-T", baseMissionInput())
	if err != nil {
		t.Fatalf("create A: %v", err)
	}
	if _, _, err := svc.SubmitMission(ctx, "TRACE-T", ma.MissionID, "Operator-O1"); err != nil {
		t.Fatalf("submit A: %v", err)
	}
	mb, err := svc.CreateMission(ctx, "TRACE-T", MissionInput{
		OperatorID: "Operator-O2", UAVID: "UAV-O2-001", MissionType: "POWER_INSPECTION",
		StartTime: "2026-09-12 10:00:00", EndTime: "2026-09-12 12:00:00",
		RouteSegments: []string{"R205"}, AltitudeMin: 80, AltitudeMax: 120, PayloadType: "CAMERA",
	})
	if err != nil {
		t.Fatalf("create B: %v", err)
	}
	if _, _, err := svc.SubmitMission(ctx, "TRACE-T", mb.MissionID, "Operator-O2"); err != nil {
		t.Fatalf("submit B: %v", err)
	}
	return ma, mb
}

func TestDetectConflictFull(t *testing.T) {
	svc, db := testSvcFull(t)
	ma, mb := conflictEnv(t, svc)
	ctx := context.Background()
	list, err := svc.DetectConflict(ctx, "TRACE-T", ma.MissionID)
	if err != nil {
		t.Fatalf("detect: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("count = %d", len(list))
	}
	rec := list[0]
	if rec.ConflictType != "ROUTE" || rec.Status != "OPEN" {
		t.Fatalf("rec = %+v", rec)
	}
	if rec.MissionIDA != ma.MissionID || rec.MissionIDB != mb.MissionID {
		t.Fatalf("pair = %q/%q", rec.MissionIDA, rec.MissionIDB)
	}
	var sugg map[string]string
	if err := json.Unmarshal([]byte(rec.Suggestion), &sugg); err != nil {
		t.Fatalf("suggestion json: %v (%q)", err, rec.Suggestion)
	}
	if len(sugg) < 2 {
		t.Errorf("need >= 2 suggestions, got %v", sugg)
	}
	if !strings.Contains(sugg["adjust_route"], "R205") {
		t.Errorf("route suggestion must name overlap: %v", sugg)
	}
	ga, _ := svc.QueryMission(ctx, "TRACE-T", ma.MissionID)
	gb, _ := svc.QueryMission(ctx, "TRACE-T", mb.MissionID)
	if ga.Status != "COORDINATING" || gb.Status != "COORDINATING" {
		t.Fatalf("statuses = %q/%q, want COORDINATING/COORDINATING", ga.Status, gb.Status)
	}
	// 幂等去重：再检测返回同一 conflict_id，不新增行
	list2, err := svc.DetectConflict(ctx, "TRACE-T", ma.MissionID)
	if err != nil || len(list2) != 1 || list2[0].ConflictID != rec.ConflictID {
		t.Fatalf("dedupe: %+v err=%v", list2, err)
	}
	var cnt int64
	db.Model(&model.ConflictRecord{}).Count(&cnt)
	if cnt != 1 {
		t.Errorf("want 1 conflict row, got %d", cnt)
	}
}

func TestDetectConflictNoConflict(t *testing.T) {
	ctx := context.Background()
	// 时间不重叠
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	ma, err := svc.CreateMission(ctx, "TRACE-T", baseMissionInput())
	if err != nil {
		t.Fatalf("create A: %v", err)
	}
	if _, _, err := svc.SubmitMission(ctx, "TRACE-T", ma.MissionID, "Operator-O1"); err != nil {
		t.Fatalf("submit A: %v", err)
	}
	inB := baseMissionInput()
	inB.StartTime, inB.EndTime = "2026-09-12 12:00:00", "2026-09-12 14:00:00"
	mb, err := svc.CreateMission(ctx, "TRACE-T", inB)
	if err != nil {
		t.Fatalf("create B: %v", err)
	}
	if _, _, err := svc.SubmitMission(ctx, "TRACE-T", mb.MissionID, "Operator-O1"); err != nil {
		t.Fatalf("submit B: %v", err)
	}
	if list, err := svc.DetectConflict(ctx, "TRACE-T", ma.MissionID); err != nil || len(list) != 0 {
		t.Fatalf("time disjoint: %d err=%v", len(list), err)
	}
	// 高度不重叠
	inC := baseMissionInput()
	inC.AltitudeMin, inC.AltitudeMax = 130, 150
	mc, err := svc.CreateMission(ctx, "TRACE-T", inC)
	if err != nil {
		t.Fatalf("create C: %v", err)
	}
	if _, _, err := svc.SubmitMission(ctx, "TRACE-T", mc.MissionID, "Operator-O1"); err != nil {
		t.Fatalf("submit C: %v", err)
	}
	if list, err := svc.DetectConflict(ctx, "TRACE-T", ma.MissionID); err != nil || len(list) != 0 {
		t.Fatalf("altitude disjoint: %d err=%v", len(list), err)
	}
	// 航路不重叠
	if _, err := svc.CreateRoute(ctx, "TRACE-T", RouteInput{RouteID: "R209", Zone: "Zone-A", StartPoint: "P3", EndPoint: "P4", AltitudeMin: 60, AltitudeMax: 150}); err != nil {
		t.Fatalf("create R209: %v", err)
	}
	inD := baseMissionInput()
	inD.RouteSegments = []string{"R209"}
	md, err := svc.CreateMission(ctx, "TRACE-T", inD)
	if err != nil {
		t.Fatalf("create D: %v", err)
	}
	if _, _, err := svc.SubmitMission(ctx, "TRACE-T", md.MissionID, "Operator-O1"); err != nil {
		t.Fatalf("submit D: %v", err)
	}
	if list, err := svc.DetectConflict(ctx, "TRACE-T", ma.MissionID); err != nil || len(list) != 0 {
		t.Fatalf("route disjoint: %d err=%v", len(list), err)
	}
	// DRAFT 任务不进候选集：与 ma 完全重叠但不提交 → detect(ma) 仍为 0
	draftM, err := svc.CreateMission(ctx, "TRACE-T", baseMissionInput())
	if err != nil {
		t.Fatalf("create draft: %v", err)
	}
	if draftM.Status != "DRAFT" {
		t.Fatalf("draft status = %q", draftM.Status)
	}
	if list, err := svc.DetectConflict(ctx, "TRACE-T", ma.MissionID); err != nil || len(list) != 0 {
		t.Fatalf("draft not excluded: %d err=%v", len(list), err)
	}
	// 任务不存在 → 6002
	if _, err := svc.DetectConflict(ctx, "TRACE-T", "MISSION-NOPE"); codeOf(err) != errcode.Param {
		t.Fatalf("unknown mission: want 6002, got %v", err)
	}
}

func TestResolveConflict(t *testing.T) {
	svc, _ := testSvcFull(t)
	ma, mb := conflictEnv(t, svc)
	ctx := context.Background()
	list, err := svc.DetectConflict(ctx, "TRACE-T", ma.MissionID)
	if err != nil || len(list) != 1 {
		t.Fatalf("detect: %v", err)
	}
	rec := list[0]
	// mission_id 不属于该冲突 → 6002
	if _, err := svc.ResolveConflict(ctx, "TRACE-T", rec.ConflictID, "时间窗后移", "Operator-O1", "MISSION-NOPE"); codeOf(err) != errcode.Param {
		t.Fatalf("foreign mission: want 6002, got %v", err)
	}
	// 单方解决：仅 A 回 REVIEWING
	got, err := svc.ResolveConflict(ctx, "TRACE-T", rec.ConflictID, "时间窗后移30分钟", "Operator-O1", ma.MissionID)
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if got.Status != "RESOLVED" || got.Resolution != "时间窗后移30分钟" || got.Operator != "Operator-O1" {
		t.Fatalf("rec = %+v", got)
	}
	ga, _ := svc.QueryMission(ctx, "TRACE-T", ma.MissionID)
	gb, _ := svc.QueryMission(ctx, "TRACE-T", mb.MissionID)
	if ga.Status != "REVIEWING" || gb.Status != "COORDINATING" {
		t.Fatalf("statuses = %q/%q", ga.Status, gb.Status)
	}
	// 再解决 → 3004；不存在 → 6002；缺参 → 6002
	if _, err := svc.ResolveConflict(ctx, "TRACE-T", rec.ConflictID, "x", "Operator-O1", ""); codeOf(err) != errcode.MissionState {
		t.Fatalf("re-resolve: want 3004, got %v", err)
	}
	if _, err := svc.ResolveConflict(ctx, "TRACE-T", "CFL-NOPE", "x", "Operator-O1", ""); codeOf(err) != errcode.Param {
		t.Fatalf("unknown: want 6002, got %v", err)
	}
	if _, err := svc.ResolveConflict(ctx, "TRACE-T", rec.ConflictID, "", "Operator-O1", ""); codeOf(err) != errcode.Param {
		t.Fatalf("missing resolution: want 6002, got %v", err)
	}
}

func TestDetectConflictApprovedFlagged(t *testing.T) {
	svc, _ := testSvcFull(t)
	ma, mb := conflictEnv(t, svc)
	ctx := context.Background()
	// A 先获批
	var app model.MissionApplication
	if err := svc.db.Where("mission_id = ?", ma.MissionID).Order("created_at DESC").First(&app).Error; err != nil {
		t.Fatalf("find application: %v", err)
	}
	if _, _, _, err := svc.SubmitReview(ctx, "TRACE-T", ReviewInput{ApplicationID: app.ApplicationID, Result: "APPROVED", Reviewer: "FISCO-ADMIN"}); err != nil {
		t.Fatalf("approve A: %v", err)
	}
	// 从 B 检测：冲突成立，A(APPROVED) 只标记不迁移
	list, err := svc.DetectConflict(ctx, "TRACE-T", mb.MissionID)
	if err != nil || len(list) != 1 {
		t.Fatalf("detect: %d err=%v", len(list), err)
	}
	if list[0].MissionIDA != mb.MissionID || list[0].MissionIDB != ma.MissionID {
		t.Fatalf("pair = %q/%q", list[0].MissionIDA, list[0].MissionIDB)
	}
	ga, _ := svc.QueryMission(ctx, "TRACE-T", ma.MissionID)
	gb, _ := svc.QueryMission(ctx, "TRACE-T", mb.MissionID)
	if ga.Status != "APPROVED" {
		t.Errorf("approved mission must not be transitioned: %q", ga.Status)
	}
	if gb.Status != "COORDINATING" {
		t.Errorf("B = %q, want COORDINATING", gb.Status)
	}
}

// TestDetectConflictConcurrentNoDoubleBooking C12：并发（含双向）检测同一对任务，
// 无双预定——库中 OPEN 冲突记录恰一条，且全部检测调用无错返回。
func TestDetectConflictConcurrentNoDoubleBooking(t *testing.T) {
	svc, db := testSvcFull(t)
	ma, mb := conflictEnv(t, svc)
	const n = 8
	var wg sync.WaitGroup
	start := make(chan struct{})
	errs := make(chan error, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			id := ma.MissionID
			if i%2 == 1 {
				id = mb.MissionID
			}
			if _, err := svc.DetectConflict(context.Background(), "TRACE-C12", id); err != nil {
				errs <- err
			}
		}(i)
	}
	close(start)
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatalf("concurrent detect: %v", err)
	}
	var cnt int64
	db.Model(&model.ConflictRecord{}).Where("status = ?", "OPEN").Count(&cnt)
	if cnt != 1 {
		t.Fatalf("exactly one OPEN conflict row must exist, got %d", cnt)
	}
}
