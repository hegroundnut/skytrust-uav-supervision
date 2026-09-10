package uavbusiness

import (
	"context"
	"errors"
	"testing"

	"gorm.io/gorm"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// testSvc 主数据不触链，gw 传 nil 即可（Task 8 起需要 gw 的测试再构造完整环境）。
func testSvc(t *testing.T) (*Service, *gorm.DB) {
	t.Helper()
	db, err := model.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := model.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	cs, err := crypto.NewService(t.TempDir())
	if err != nil {
		t.Fatalf("crypto: %v", err)
	}
	return New(db, cs, nil, audit.New(db)), db
}

func codeOf(err error) int {
	var e *crosschain.Error
	if errors.As(err, &e) {
		return e.Code
	}
	return -1
}

func TestRegisterManufacturerDuplicate(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	m, err := svc.RegisterManufacturer(ctx, "TRACE-T", ManufacturerInput{ManufacturerID: "Manufacturer-Z", Name: "厂商Z", AdapterType: "fabric"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if m.Status != "ACTIVE" {
		t.Errorf("default status = %q, want ACTIVE", m.Status)
	}
	_, err = svc.RegisterManufacturer(ctx, "TRACE-T", ManufacturerInput{ManufacturerID: "Manufacturer-Z", Name: "重复"})
	if codeOf(err) != errcode.Param {
		t.Fatalf("duplicate: want 6002, got %v", err)
	}
	_, err = svc.RegisterManufacturer(ctx, "TRACE-T", ManufacturerInput{ManufacturerID: "Manufacturer-Z"})
	if codeOf(err) != errcode.Param {
		t.Fatalf("missing name: want 6002, got %v", err)
	}
	list, err := svc.ListManufacturers(ctx, "TRACE-T")
	if err != nil || len(list) != 1 {
		t.Fatalf("list: %d err=%v", len(list), err)
	}
}

func TestRegisterOperatorDefaults(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	o, err := svc.RegisterOperator(ctx, "TRACE-T", OperatorInput{OperatorID: "Operator-Z", Name: "运营Z", ChainOrgID: "ORG-Z", Contact: "z@example.com"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if o.Status != "ACTIVE" || o.QualificationStatus != "QUALIFIED" {
		t.Errorf("defaults = %q/%q", o.Status, o.QualificationStatus)
	}
	_, err = svc.RegisterOperator(ctx, "TRACE-T", OperatorInput{OperatorID: "Operator-Z", Name: "重复"})
	if codeOf(err) != errcode.Param {
		t.Fatalf("duplicate: want 6002, got %v", err)
	}
	list, err := svc.ListOperators(ctx, "TRACE-T")
	if err != nil || len(list) != 1 {
		t.Fatalf("list: %d err=%v", len(list), err)
	}
}

func TestCreateRouteValidation(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	// 高度区间非法
	_, err := svc.CreateRoute(ctx, "TRACE-T", RouteInput{RouteID: "R900", Zone: "Zone-A", StartPoint: "P1", EndPoint: "P2", AltitudeMin: 120, AltitudeMax: 60})
	if codeOf(err) != errcode.Param {
		t.Fatalf("altitude: want 6002, got %v", err)
	}
	// 走廊状态非法
	_, err = svc.CreateRoute(ctx, "TRACE-T", RouteInput{RouteID: "R900", Zone: "Zone-A", StartPoint: "P1", EndPoint: "P2", AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "WHATEVER"})
	if codeOf(err) != errcode.Param {
		t.Fatalf("corridor: want 6002, got %v", err)
	}
	// 正常创建（默认 OPEN）
	r, err := svc.CreateRoute(ctx, "TRACE-T", RouteInput{RouteID: "R900", Zone: "Zone-A", StartPoint: "P1", EndPoint: "P2", AltitudeMin: 60, AltitudeMax: 120})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if r.CorridorStatus != "OPEN" {
		t.Errorf("default corridor = %q", r.CorridorStatus)
	}
	// 重复
	_, err = svc.CreateRoute(ctx, "TRACE-T", RouteInput{RouteID: "R900", Zone: "Zone-A", StartPoint: "P1", EndPoint: "P2", AltitudeMin: 60, AltitudeMax: 120})
	if codeOf(err) != errcode.Param {
		t.Fatalf("duplicate: want 6002, got %v", err)
	}
}

func TestListRoutesFilters(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	mk := func(id, zone, st string) {
		_, err := svc.CreateRoute(ctx, "TRACE-T", RouteInput{RouteID: id, Zone: zone, StartPoint: "P1", EndPoint: "P2", AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: st})
		if err != nil {
			t.Fatalf("create %s: %v", id, err)
		}
	}
	mk("R901", "Zone-A", "OPEN")
	mk("R902", "Zone-A", "CLOSED")
	mk("R903", "Zone-B", "OPEN")
	all, err := svc.ListRoutes(ctx, "TRACE-T", "", "")
	if err != nil || len(all) != 3 {
		t.Fatalf("all: %d err=%v", len(all), err)
	}
	za, err := svc.ListRoutes(ctx, "TRACE-T", "Zone-A", "")
	if err != nil || len(za) != 2 {
		t.Fatalf("zone: %d err=%v", len(za), err)
	}
	open, err := svc.ListRoutes(ctx, "TRACE-T", "", "OPEN")
	if err != nil || len(open) != 2 {
		t.Fatalf("status: %d err=%v", len(open), err)
	}
	both, err := svc.ListRoutes(ctx, "TRACE-T", "Zone-A", "CLOSED")
	if err != nil || len(both) != 1 || both[0].RouteID != "R902" {
		t.Fatalf("both: %+v err=%v", both, err)
	}
}
