package uavbusiness

import (
	"context"
	"strings"
	"testing"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/model"
)

func TestRegisterUAVCreatesIdentityMapping(t *testing.T) {
	svc, db := testSvcFull(t)
	ctx := context.Background()
	db.Create(&model.Manufacturer{ManufacturerID: "MFR-MP", Name: "映射厂商", Status: "ACTIVE"})
	db.Create(&model.Operator{OperatorID: "OP-MP", Name: "映射运营方", Status: "ACTIVE"})

	uav, _, err := svc.RegisterUAV(ctx, "TRACE-MP-1", UAVInput{
		ManufacturerID: "MFR-MP", OperatorID: "OP-MP", Model: "DJI-M30", SerialNo: "SN-MP-1",
	})
	if err != nil {
		t.Fatalf("RegisterUAV: %v", err)
	}
	if uav.Status != "VERIFIED" {
		t.Fatalf("status = %q, want VERIFIED", uav.Status)
	}
	var m model.IdentityMapping
	if err := db.Where("uav_id = ?", uav.UAVID).First(&m).Error; err != nil {
		t.Fatalf("注册成功后应自动建 IdentityMapping, got err: %v", err)
	}
	if !strings.HasPrefix(m.Pseudo, "PSEUDO-UAV-") || len(m.Pseudo) != 16 {
		t.Errorf("pseudo = %q, want PSEUDO-UAV-<5位>（全长 16）", m.Pseudo)
	}
	if !strings.HasPrefix(m.DeviceAddress, "0xADDR") {
		t.Errorf("device_address = %q, want 0xADDR 前缀", m.DeviceAddress)
	}
	if m.PassID != "" {
		t.Errorf("创建时 pass_id 应为空（签发时回填）= %q", m.PassID)
	}
	if m.SM9Identity != crypto.SM9IdentityOf(uav.UAVID) || m.OperatorID != "OP-MP" ||
		m.ManufacturerID != "MFR-MP" || m.SourceChain != "chainmaker" {
		t.Errorf("mapping = %+v", m)
	}
}

func TestNoMappingOnCrosschainFailure(t *testing.T) {
	// 空 adapter map = 每跳跨链必败：注册应停留 REGISTERED 且**不**建映射
	//（链上无凭据，追踪就该断——禁止拼造红线）。
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
	auditSvc := audit.New(db)
	gw := crosschain.NewGateway(db, cs, map[string]chainadapter.ChainAdapter{}, auditSvc)
	svc := New(db, cs, gw, auditSvc)
	ctx := context.Background()
	db.Create(&model.Manufacturer{ManufacturerID: "MFR-MF", Name: "失败厂商", Status: "ACTIVE"})
	db.Create(&model.Operator{OperatorID: "OP-MF", Name: "失败运营方", Status: "ACTIVE"})

	uav, _, err := svc.RegisterUAV(ctx, "TRACE-MP-2", UAVInput{
		ManufacturerID: "MFR-MF", OperatorID: "OP-MF", SerialNo: "SN-MF-1",
	})
	if err == nil {
		t.Fatal("空 adapter map 下 RegisterUAV 应失败")
	}
	if uav == nil || uav.Status != "REGISTERED" {
		t.Fatalf("uav = %+v, want REGISTERED 停留留痕", uav)
	}
	var cnt int64
	db.Model(&model.IdentityMapping{}).Count(&cnt)
	if cnt != 0 {
		t.Errorf("mapping count = %d, want 0（跨链失败不建映射）", cnt)
	}
}

func TestBackfillMappingPassID(t *testing.T) {
	svc, db := testSvc(t)
	ctx := context.Background()
	db.Create(&model.IdentityMapping{
		MappingID: "IDM-BF-1", Pseudo: "PSEUDO-UAV-BF001", DeviceAddress: "0xADDRBF001",
		UAVID: "UAV-BF-1", OperatorID: "OP-1", ManufacturerID: "MFR-1", SourceChain: "chainmaker",
	})
	svc.backfillMappingPassID(ctx, "TRACE-MP-3", "UAV-BF-1", "PASS-BF-1", "FISCO-ADMIN")
	var m model.IdentityMapping
	db.Where("mapping_id = ?", "IDM-BF-1").First(&m)
	if m.PassID != "PASS-BF-1" {
		t.Errorf("pass_id = %q, want PASS-BF-1", m.PassID)
	}
	// 已有 pass_id 不得覆盖（保护 seed IDM-DEMO-0001 的冻结字面量 PASS-2026-001）
	svc.backfillMappingPassID(ctx, "TRACE-MP-4", "UAV-BF-1", "PASS-BF-2", "FISCO-ADMIN")
	db.Where("mapping_id = ?", "IDM-BF-1").First(&m)
	if m.PassID != "PASS-BF-1" {
		t.Errorf("pass_id 被覆盖 = %q, want PASS-BF-1", m.PassID)
	}
	// 无映射 UAV：静默返回不 panic（追踪断点由监管层留痕，这里不拼造）
	svc.backfillMappingPassID(ctx, "TRACE-MP-5", "UAV-NOPE", "PASS-X", "FISCO-ADMIN")
}
