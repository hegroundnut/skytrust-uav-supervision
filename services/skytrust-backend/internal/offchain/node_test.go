package offchain

import (
	"context"
	"testing"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// newTestSvc 包级 DB 夹具：:memory: + 全部迁移 + 真实 SM9 服务。
func newTestSvc(t *testing.T) *Service {
	t.Helper()
	db, err := model.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	if err := model.Migrate(db); err != nil {
		t.Fatal(err)
	}
	cs, err := crypto.NewService(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	svc := New(db, cs, audit.New(db))
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	return svc
}

// seedFixtureNodes 将 nodeFixture()（topology_test.go）写入 DB，返回节点数。
func seedFixtureNodes(t *testing.T, svc *Service) {
	t.Helper()
	for _, n := range nodeFixture() {
		n.SM9Identity = crypto.SM9IdentityOf(n.NodeID)
		if err := svc.db.Create(&n).Error; err != nil {
			t.Fatal(err)
		}
	}
}

func errCodeOf(err error) int {
	if e, ok := err.(*errcode.Error); ok {
		return e.Code
	}
	return -1
}

func TestNodeRegisterValidation(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	pos := Position{X: 5, Y: 6}
	// 合法注册：SM9 自动派生、状态默认 ONLINE、neighbors 默认 []
	n, err := svc.NodeRegister(ctx, "TRACE-T", &NodeRegisterRequest{
		NodeID: "T-REG-1", NodeType: "EDGE", Position: &pos,
	})
	if err != nil {
		t.Fatal(err)
	}
	if n.SM9Identity != "SM9-ID-T-REG-1" || n.Status != "ONLINE" || n.Neighbors != "[]" {
		t.Fatalf("node = %+v", n)
	}
	if n.Position == "" {
		t.Fatal("position not persisted")
	}
	if p, err := ParsePosition(n.Position); err != nil || p.X != 5 || p.Y != 6 {
		t.Fatalf("position roundtrip: %v %v", p, err)
	}
	// 重复 → 6002
	if _, err := svc.NodeRegister(ctx, "TRACE-T", &NodeRegisterRequest{NodeID: "T-REG-1", NodeType: "EDGE", Position: &pos}); errCodeOf(err) != errcode.Param {
		t.Fatalf("dup err = %v", err)
	}
	// 非法 node_type → 4003
	if _, err := svc.NodeRegister(ctx, "TRACE-T", &NodeRegisterRequest{NodeID: "T-REG-2", NodeType: "ROUTER", Position: &pos}); errCodeOf(err) != errcode.NodeIdentity {
		t.Fatalf("type err = %v", err)
	}
	// 非法 SM9 身份格式 → 4003
	if _, err := svc.NodeRegister(ctx, "TRACE-T", &NodeRegisterRequest{NodeID: "T-REG-3", NodeType: "EDGE", Position: &pos, SM9Identity: "FAKE-1"}); errCodeOf(err) != errcode.NodeIdentity {
		t.Fatalf("sm9 err = %v", err)
	}
	// 非法 status（含 ISOLATED）→ 6002
	if _, err := svc.NodeRegister(ctx, "TRACE-T", &NodeRegisterRequest{NodeID: "T-REG-4", NodeType: "EDGE", Position: &pos, Status: "ISOLATED"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("status err = %v", err)
	}
	// 显式 OFFLINE + neighbors 持久化
	n2, err := svc.NodeRegister(ctx, "TRACE-T", &NodeRegisterRequest{NodeID: "T-REG-5", NodeType: "ATTACKER", Position: &pos, Status: "OFFLINE", Neighbors: []string{"T-REG-1"}})
	if err != nil || n2.Status != "OFFLINE" || n2.Neighbors != `["T-REG-1"]` {
		t.Fatalf("n2 = %+v err = %v", n2, err)
	}
}

func TestNodeListFilterAndPagination(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	seedFixtureNodes(t, svc)
	// 全量
	all, total, err := svc.NodeList(ctx, "TRACE-T", NodeQuery{})
	if err != nil || total != 8 || len(all) != 8 {
		t.Fatalf("all = %d total = %d err = %v", len(all), total, err)
	}
	// node_type 过滤
	_, total, err = svc.NodeList(ctx, "TRACE-T", NodeQuery{NodeType: "ATTACKER"})
	if err != nil || total != 2 {
		t.Fatalf("attacker total = %d err = %v", total, err)
	}
	// status 过滤
	_, total, err = svc.NodeList(ctx, "TRACE-T", NodeQuery{Status: "OFFLINE"})
	if err != nil || total != 2 {
		t.Fatalf("offline total = %d err = %v", total, err)
	}
	// 分页 + Normalize（双重归一化之 service 侧）
	q := NodeQuery{Page: 0, PageSize: 999}
	q.Normalize()
	if q.Page != 1 || q.PageSize != 200 {
		t.Fatalf("normalize = %+v", q)
	}
	page1, total, err := svc.NodeList(ctx, "TRACE-T", NodeQuery{Page: 1, PageSize: 3})
	if err != nil || total != 8 || len(page1) != 3 {
		t.Fatalf("page1 = %d total = %d", len(page1), total)
	}
	page2, _, err := svc.NodeList(ctx, "TRACE-T", NodeQuery{Page: 2, PageSize: 3})
	if err != nil || len(page2) != 3 || page2[0].NodeID == page1[0].NodeID {
		t.Fatalf("page2 = %v", page2)
	}
	// 排序确定性：node_id ASC
	if all[0].NodeID != "MGR" {
		t.Fatalf("order = %v", all[0].NodeID)
	}
}
