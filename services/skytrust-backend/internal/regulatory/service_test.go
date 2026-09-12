package regulatory

import (
	"errors"
	"testing"

	"gorm.io/gorm"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// newTestSvc 监管域公共 fixture：:memory: DB + 三模拟链（零延迟）+ 网关 + 审计。
// Task 2-7 测试全部复用；chains 供故障注入（WithFailNext），db 供直插跨域行。
func newTestSvc(t *testing.T) (*Service, map[string]*sim.Chain, *gorm.DB, *crypto.Service) {
	t.Helper()
	db, err := model.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if sqlDB, derr := db.DB(); derr == nil {
			sqlDB.Close()
		}
	})
	if err := model.Migrate(db); err != nil {
		t.Fatal(err)
	}
	cs, err := crypto.NewService(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	chains := map[string]*sim.Chain{
		"fabric": sim.New("fabric"), "chainmaker": sim.New("chainmaker"), "fisco-bcos": sim.New("fisco-bcos"),
	}
	adapters := make(map[string]chainadapter.ChainAdapter, len(chains))
	for name, c := range chains {
		adapters[name] = c
	}
	auditSvc := audit.New(db)
	gw := crosschain.NewGateway(db, cs, adapters, auditSvc)
	return New(db, cs, gw, auditSvc), chains, db, cs
}

func errCodeOf(t *testing.T, err error) int {
	t.Helper()
	var e *errcode.Error
	if !errors.As(err, &e) {
		t.Fatalf("want *errcode.Error, got %v", err)
	}
	return e.Code
}

func TestServiceNewAndLogAudit(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	if svc == nil || svc.db == nil || svc.cs == nil || svc.gw == nil || svc.audit == nil {
		t.Fatal("New must wire all four deps")
	}
	// nil-audit 不得 panic（best-effort 约定）
	(&Service{}).logAudit("TRACE-T", "REG-01", "X", "Y", "Z", nil)
	// 正常路径落审计行
	svc.logAudit("TRACE-T", "REG-01", "TEST_ACTION", "ALERT", "ALERT-T", map[string]any{"k": "v"})
	var cnt int64
	if err := svc.db.Model(&model.AuditLog{}).Where("action = ?", "TEST_ACTION").Count(&cnt).Error; err != nil || cnt != 1 {
		t.Fatalf("audit row: cnt=%d err=%v", cnt, err)
	}
}
