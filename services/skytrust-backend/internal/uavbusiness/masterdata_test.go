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
	if _, err := svc.RegisterManufacturer(ctx, "TRACE-T", ManufacturerInput{ManufacturerID: "Manufacturer-S", Name: "厂商S", Status: "SUSPENDED"}); err != nil {
		t.Fatalf("register suspended: %v", err)
	}
	list, total, err := svc.ListManufacturers(ctx, "TRACE-T", ManufacturerListFilter{Status: "ACTIVE"})
	if err != nil || len(list) != 1 || total != 1 {
		t.Fatalf("status filter: %d/%d err=%v", len(list), total, err)
	}
	all, totalAll, err := svc.ListManufacturers(ctx, "TRACE-T", ManufacturerListFilter{})
	if err != nil || len(all) != 2 || totalAll != 2 {
		t.Fatalf("list all: %d/%d err=%v", len(all), totalAll, err)
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
	if _, err := svc.RegisterOperator(ctx, "TRACE-T", OperatorInput{OperatorID: "Operator-S", Name: "运营S", Status: "SUSPENDED"}); err != nil {
		t.Fatalf("register suspended: %v", err)
	}
	list, total, err := svc.ListOperators(ctx, "TRACE-T", OperatorListFilter{Status: "ACTIVE"})
	if err != nil || len(list) != 1 || total != 1 {
		t.Fatalf("status filter: %d/%d err=%v", len(list), total, err)
	}
	all, totalAll, err := svc.ListOperators(ctx, "TRACE-T", OperatorListFilter{})
	if err != nil || len(all) != 2 || totalAll != 2 {
		t.Fatalf("list all: %d/%d err=%v", len(all), totalAll, err)
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
	all, totalAll, err := svc.ListRoutes(ctx, "TRACE-T", RouteListFilter{})
	if err != nil || len(all) != 3 || totalAll != 3 {
		t.Fatalf("all: %d/%d err=%v", len(all), totalAll, err)
	}
	za, totalZA, err := svc.ListRoutes(ctx, "TRACE-T", RouteListFilter{Zone: "Zone-A"})
	if err != nil || len(za) != 2 || totalZA != 2 {
		t.Fatalf("zone: %d/%d err=%v", len(za), totalZA, err)
	}
	open, totalOpen, err := svc.ListRoutes(ctx, "TRACE-T", RouteListFilter{CorridorStatus: "OPEN"})
	if err != nil || len(open) != 2 || totalOpen != 2 {
		t.Fatalf("status: %d/%d err=%v", len(open), totalOpen, err)
	}
	both, totalBoth, err := svc.ListRoutes(ctx, "TRACE-T", RouteListFilter{Zone: "Zone-A", CorridorStatus: "CLOSED"})
	if err != nil || len(both) != 1 || totalBoth != 1 || both[0].RouteID != "R902" {
		t.Fatalf("both: %+v/%d err=%v", both, totalBoth, err)
	}
	// 分页：每页 1 条 → 长度 1、总数仍 2；第 2 页偏移取到 R902
	pg, pgTotal, err := svc.ListRoutes(ctx, "TRACE-T", RouteListFilter{Zone: "Zone-A", Page: 1, PageSize: 1})
	if err != nil || len(pg) != 1 || pgTotal != 2 || pg[0].RouteID != "R901" {
		t.Fatalf("page1: %+v/%d err=%v", pg, pgTotal, err)
	}
	pg2, pg2Total, err := svc.ListRoutes(ctx, "TRACE-T", RouteListFilter{Zone: "Zone-A", Page: 2, PageSize: 1})
	if err != nil || len(pg2) != 1 || pg2Total != 2 || pg2[0].RouteID != "R902" {
		t.Fatalf("page2: %+v/%d err=%v", pg2, pg2Total, err)
	}
	// PageSize 超上限 → 截断至 200，不报错
	capped, cappedTotal, err := svc.ListRoutes(ctx, "TRACE-T", RouteListFilter{Page: 1, PageSize: 500})
	if err != nil || len(capped) != 3 || cappedTotal != 3 {
		t.Fatalf("pagesize cap: %d/%d err=%v", len(capped), cappedTotal, err)
	}
}

// TestRegisterPartyStatusEnumValidation B3：manufacturer/operator status 枚举校验——
// 对齐 CreateRoute corridor_status 枚举房规（收紧缺失侧；空串默认 ACTIVE 不变，
// 枚举内合法值不受影响，不放松任何既有校验）。
func TestRegisterPartyStatusEnumValidation(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	if _, err := svc.RegisterManufacturer(ctx, "TRACE-T", ManufacturerInput{ManufacturerID: "Manufacturer-E1", Name: "厂商E1", Status: "BOGUS"}); codeOf(err) != errcode.Param {
		t.Fatalf("manufacturer bogus status: want 6002, got %v", err)
	}
	if _, err := svc.RegisterOperator(ctx, "TRACE-T", OperatorInput{OperatorID: "Operator-E1", Name: "运营E1", Status: "BOGUS"}); codeOf(err) != errcode.Param {
		t.Fatalf("operator bogus status: want 6002, got %v", err)
	}
	// 枚举内值与空串默认仍合法
	if m, err := svc.RegisterManufacturer(ctx, "TRACE-T", ManufacturerInput{ManufacturerID: "Manufacturer-E2", Name: "厂商E2", Status: "SUSPENDED"}); err != nil || m.Status != "SUSPENDED" {
		t.Fatalf("manufacturer suspended: %+v err=%v", m, err)
	}
	if o, err := svc.RegisterOperator(ctx, "TRACE-T", OperatorInput{OperatorID: "Operator-E2", Name: "运营E2"}); err != nil || o.Status != "ACTIVE" {
		t.Fatalf("operator default: %+v err=%v", o, err)
	}
}

// TestCreateRouteRejectsNegativeAltitude B3：CreateRoute 对齐 CreateMission——
// altitude_min 必须非负（旧实现接受负值；0 为合法边界）。
func TestCreateRouteRejectsNegativeAltitude(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	_, err := svc.CreateRoute(ctx, "TRACE-T", RouteInput{RouteID: "R910", Zone: "Zone-A", StartPoint: "P1", EndPoint: "P2", AltitudeMin: -5, AltitudeMax: 120})
	if codeOf(err) != errcode.Param {
		t.Fatalf("negative altitude_min: want 6002, got %v", err)
	}
	if _, err := svc.CreateRoute(ctx, "TRACE-T", RouteInput{RouteID: "R911", Zone: "Zone-A", StartPoint: "P1", EndPoint: "P2", AltitudeMin: 0, AltitudeMax: 120}); err != nil {
		t.Fatalf("zero altitude_min must stay legal: %v", err)
	}
}
