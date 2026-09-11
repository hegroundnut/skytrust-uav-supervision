package offchain

import (
	"context"
	"encoding/json"
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

func boolPtr(b bool) *bool { return &b }

func loadTestNode(t *testing.T, svc *Service, id string) model.NetworkNode {
	t.Helper()
	var n model.NetworkNode
	if err := svc.db.First(&n, "node_id = ?", id).Error; err != nil {
		t.Fatal(err)
	}
	return n
}

func hasNeighbor(t *testing.T, svc *Service, id, nbr string) bool {
	t.Helper()
	n := loadTestNode(t, svc, id)
	list, err := ParseNeighbors(n.Neighbors)
	if err != nil {
		t.Fatal(err)
	}
	for _, x := range list {
		if x == nbr {
			return true
		}
	}
	return false
}

func TestWormholeToggleOnWritesFakeAdjacency(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	seedFixtureNodes(t, svc)
	res, err := svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(true), Operator: "ATTACKER-SIM"})
	if err != nil {
		t.Fatal(err)
	}
	if !res.WormholeEnabled || len(res.NodesAffected) != 4 {
		t.Fatalf("res = %+v", res)
	}
	x := loadTestNode(t, svc, NodeXID)
	y := loadTestNode(t, svc, NodeYID)
	if x.Status != "ONLINE" || y.Status != "ONLINE" {
		t.Fatalf("x=%s y=%s", x.Status, y.Status)
	}
	var xn, yn []string
	json.Unmarshal([]byte(x.Neighbors), &xn)
	json.Unmarshal([]byte(y.Neighbors), &yn)
	if len(xn) != 2 || xn[0] != "N1" || xn[1] != NodeYID || len(yn) != 2 || yn[0] != NodeXID || yn[1] != "N4" {
		t.Fatalf("xn=%v yn=%v", xn, yn)
	}
	if !hasNeighbor(t, svc, "N1", NodeXID) || !hasNeighbor(t, svc, "N4", NodeYID) {
		t.Fatal("anchors missing fake refs")
	}
	// 幂等：再次 ON 不重复追加
	if _, err := svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(true)}); err != nil {
		t.Fatal(err)
	}
	n1 := loadTestNode(t, svc, "N1")
	cnt := 0
	list, _ := ParseNeighbors(n1.Neighbors)
	for _, v := range list {
		if v == NodeXID {
			cnt++
		}
	}
	if cnt != 1 {
		t.Fatalf("N1 neighbors = %v", n1.Neighbors)
	}
}

func TestWormholeToggleOffAndIsolatedConflict(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	seedFixtureNodes(t, svc)
	if _, err := svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(true)}); err != nil {
		t.Fatal(err)
	}
	// OFF：恢复原状
	res, err := svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(false), Operator: "OP-1"})
	if err != nil || res.WormholeEnabled {
		t.Fatalf("res = %+v err = %v", res, err)
	}
	x := loadTestNode(t, svc, NodeXID)
	if x.Status != "OFFLINE" || x.Neighbors != "[]" {
		t.Fatalf("x = %+v", x)
	}
	if hasNeighbor(t, svc, "N1", NodeXID) || hasNeighbor(t, svc, "N4", NodeYID) {
		t.Fatal("anchor refs not purged")
	}
	// 幂等 OFF
	if _, err := svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(false)}); err != nil {
		t.Fatal(err)
	}
	// ON 后模拟检测结果：X/Y ISOLATED → toggle ON 必须 4001
	if _, err := svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(true)}); err != nil {
		t.Fatal(err)
	}
	if err := svc.db.Model(&model.NetworkNode{}).Where("node_id IN ?", []string{NodeXID, NodeYID}).
		Updates(map[string]any{"status": "ISOLATED", "neighbors": "[]"}).Error; err != nil {
		t.Fatal(err)
	}
	if _, err := svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(true)}); errCodeOf(err) != errcode.WormholeRisk {
		t.Fatalf("isolated re-enable err = %v", err)
	}
	// OFF 不触碰 ISOLATED（保持隔离）
	res, err = svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(false)})
	if err != nil || res.WormholeEnabled || len(res.NodesAffected) != 0 {
		t.Fatalf("res = %+v err = %v", res, err)
	}
	if n := loadTestNode(t, svc, NodeXID); n.Status != "ISOLATED" {
		t.Fatalf("x = %s", n.Status)
	}
	// 未 seed X/Y 的库 → ON 6002
	svc2 := newTestSvc(t)
	if _, err := svc2.WormholeToggle(context.Background(), "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(true)}); errCodeOf(err) != errcode.Param {
		t.Fatalf("unseeded err = %v", err)
	}
}
