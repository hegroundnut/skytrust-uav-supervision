package offchain

import (
	"context"
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

func TestSessionOpenAuthenticatesAndActivates(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	seedFixtureNodes(t, svc)
	res, err := svc.SessionOpen(ctx, "TRACE-T", &SessionOpenRequest{UAVID: "UAV-A-001"})
	if err != nil {
		t.Fatal(err)
	}
	if res.Session.Status != "ACTIVE" || res.Session.SessionID == "" {
		t.Fatalf("session = %+v", res.Session)
	}
	want := []string{"UAV-A-001-NODE", "N1", "N2", "N3", "N4", "MGR"}
	if len(res.Path) != len(want) {
		t.Fatalf("path = %v", res.Path)
	}
	for i := range want {
		if res.Path[i] != want[i] {
			t.Fatalf("path = %v", res.Path)
		}
	}
	if !res.Auth.Verified || res.Auth.Signature == "" || res.Auth.Nonce == "" ||
		res.Auth.SM9Identity != "SM9-ID-UAV-A-001-NODE" {
		t.Fatalf("auth = %+v", res.Auth)
	}
	// CurrentPath 持久化
	var reloaded model.OffchainSession
	if err := svc.db.First(&reloaded, "session_id = ?", res.Session.SessionID).Error; err != nil {
		t.Fatal(err)
	}
	if reloaded.CurrentPath == "" || reloaded.Status != "ACTIVE" {
		t.Fatalf("reloaded = %+v", reloaded)
	}
}

func TestSessionOpenFailures(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	seedFixtureNodes(t, svc)
	// source 默认 <uav_id>-NODE 不存在 → 4003
	if _, err := svc.SessionOpen(ctx, "TRACE-T", &SessionOpenRequest{UAVID: "UAV-NOPE"}); errCodeOf(err) != errcode.NodeIdentity {
		t.Fatalf("src err = %v", err)
	}
	// target 不存在 → 4003
	if _, err := svc.SessionOpen(ctx, "TRACE-T", &SessionOpenRequest{UAVID: "UAV-A-001", TargetNode: "NOWHERE"}); errCodeOf(err) != errcode.NodeIdentity {
		t.Fatalf("tgt err = %v", err)
	}
	// N3 隔离 → 不可达 4004
	if err := svc.db.Model(&model.NetworkNode{}).Where("node_id = ?", "N3").Update("status", "ISOLATED").Error; err != nil {
		t.Fatal(err)
	}
	if _, err := svc.SessionOpen(ctx, "TRACE-T", &SessionOpenRequest{UAVID: "UAV-A-001"}); errCodeOf(err) != errcode.PathUnreachable {
		t.Fatalf("unreach err = %v", err)
	}
	if err := svc.db.Model(&model.NetworkNode{}).Where("node_id = ?", "N3").Update("status", "ONLINE").Error; err != nil {
		t.Fatal(err)
	}
	// 客户端签名无法通过 nonce 验签 → 4002
	if _, err := svc.SessionOpen(ctx, "TRACE-T", &SessionOpenRequest{UAVID: "UAV-A-001", Signature: "bogus"}); errCodeOf(err) != errcode.SessionAuth {
		t.Fatalf("sig err = %v", err)
	}
}

func TestSessionCloseStateMachine(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	seedFixtureNodes(t, svc)
	res, err := svc.SessionOpen(ctx, "TRACE-T", &SessionOpenRequest{UAVID: "UAV-A-001"})
	if err != nil {
		t.Fatal(err)
	}
	sess, err := svc.SessionClose(ctx, "TRACE-T", &SessionCloseRequest{SessionID: res.Session.SessionID, Operator: "OP-1", Reason: "mission end"})
	if err != nil || sess.Status != "CLOSED" {
		t.Fatalf("close = %+v err = %v", sess, err)
	}
	// 重复关闭 → 4002
	if _, err := svc.SessionClose(ctx, "TRACE-T", &SessionCloseRequest{SessionID: res.Session.SessionID, Operator: "OP-1"}); errCodeOf(err) != errcode.SessionAuth {
		t.Fatalf("reclose err = %v", err)
	}
	// 不存在 → 6002
	if _, err := svc.SessionClose(ctx, "TRACE-T", &SessionCloseRequest{SessionID: "SESS-deadbeef", Operator: "OP-1"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("missing err = %v", err)
	}
}

func TestSessionListFiltersAndPaging(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	seedFixtureNodes(t, svc)
	if _, err := svc.SessionOpen(ctx, "TRACE-T", &SessionOpenRequest{UAVID: "UAV-A-001", MissionID: "MISSION-2026-001"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.SessionOpen(ctx, "TRACE-T", &SessionOpenRequest{UAVID: "UAV-A-001", MissionID: "MISSION-X"}); err != nil {
		t.Fatal(err)
	}
	_, total, err := svc.SessionList(ctx, "TRACE-T", SessionQuery{})
	if err != nil || total != 2 {
		t.Fatalf("total = %d err = %v", total, err)
	}
	_, total, _ = svc.SessionList(ctx, "TRACE-T", SessionQuery{MissionID: "MISSION-X"})
	if total != 1 {
		t.Fatalf("mission filter total = %d", total)
	}
	recs, total, _ := svc.SessionList(ctx, "TRACE-T", SessionQuery{UAVID: "UAV-A-001", Status: "ACTIVE", Page: 1, PageSize: 1})
	if total != 2 || len(recs) != 1 {
		t.Fatalf("paged = %d/%d", len(recs), total)
	}
	if _, _, err := svc.SessionList(ctx, "TRACE-T", SessionQuery{Status: "BOGUS"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("bad status filter err = %v", err)
	}
}
