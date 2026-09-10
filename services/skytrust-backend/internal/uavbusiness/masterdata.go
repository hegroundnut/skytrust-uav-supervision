package uavbusiness

import (
	"context"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// ---------- 厂商 ----------

type ManufacturerInput struct {
	ManufacturerID string
	Name           string
	AdapterType    string
	Status         string
}

// RegisterManufacturer 厂商注册；ID 重复 → 6002。
func (s *Service) RegisterManufacturer(ctx context.Context, traceID string, in ManufacturerInput) (*model.Manufacturer, error) {
	if in.ManufacturerID == "" || in.Name == "" {
		return nil, crosschain.NewError(errcode.Param, "manufacturer_id 与 name 必填")
	}
	var cnt int64
	if err := s.db.Model(&model.Manufacturer{}).Where("manufacturer_id = ?", in.ManufacturerID).Count(&cnt).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	if cnt > 0 {
		return nil, crosschain.NewError(errcode.Param, "manufacturer_id %q 已存在", in.ManufacturerID)
	}
	m := &model.Manufacturer{
		ManufacturerID: in.ManufacturerID, Name: in.Name,
		AdapterType: in.AdapterType, Status: in.Status,
	}
	if m.Status == "" {
		m.Status = "ACTIVE"
	}
	if err := s.db.Create(m).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create: %v", err)
	}
	s.logAudit(traceID, in.ManufacturerID, "MANUFACTURER_REGISTER", "MANUFACTURER", m.ManufacturerID,
		map[string]any{"name": m.Name, "adapter_type": m.AdapterType, "status": m.Status})
	return m, nil
}

// ListManufacturers 按 ID 升序返回全部厂商。
func (s *Service) ListManufacturers(ctx context.Context, traceID string) ([]model.Manufacturer, error) {
	var out []model.Manufacturer
	if err := s.db.Order("manufacturer_id ASC").Find(&out).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, nil
}

// ---------- 运营方 ----------

type OperatorInput struct {
	OperatorID          string
	Name                string
	Status              string
	QualificationStatus string
	ChainOrgID          string
	Contact             string
}

// RegisterOperator 运营方注册；ID 重复 → 6002。
func (s *Service) RegisterOperator(ctx context.Context, traceID string, in OperatorInput) (*model.Operator, error) {
	if in.OperatorID == "" || in.Name == "" {
		return nil, crosschain.NewError(errcode.Param, "operator_id 与 name 必填")
	}
	var cnt int64
	if err := s.db.Model(&model.Operator{}).Where("operator_id = ?", in.OperatorID).Count(&cnt).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	if cnt > 0 {
		return nil, crosschain.NewError(errcode.Param, "operator_id %q 已存在", in.OperatorID)
	}
	o := &model.Operator{
		OperatorID: in.OperatorID, Name: in.Name, Status: in.Status,
		QualificationStatus: in.QualificationStatus, ChainOrgID: in.ChainOrgID, Contact: in.Contact,
	}
	if o.Status == "" {
		o.Status = "ACTIVE"
	}
	if o.QualificationStatus == "" {
		o.QualificationStatus = "QUALIFIED"
	}
	if err := s.db.Create(o).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create: %v", err)
	}
	s.logAudit(traceID, in.OperatorID, "OPERATOR_REGISTER", "OPERATOR", o.OperatorID,
		map[string]any{"name": o.Name, "qualification_status": o.QualificationStatus, "chain_org_id": o.ChainOrgID})
	return o, nil
}

// ListOperators 按 ID 升序返回全部运营方。
func (s *Service) ListOperators(ctx context.Context, traceID string) ([]model.Operator, error) {
	var out []model.Operator
	if err := s.db.Order("operator_id ASC").Find(&out).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, nil
}

// ---------- 航线 ----------

type RouteInput struct {
	RouteID        string
	Zone           string
	StartPoint     string
	EndPoint       string
	AltitudeMin    float64
	AltitudeMax    float64
	CorridorStatus string
}

var validCorridorStatus = map[string]bool{"OPEN": true, "RESTRICTED": true, "CLOSED": true}

// CreateRoute 航线创建；ID 重复 → 6002；altitude_min >= altitude_max → 6002；
// corridor_status 仅允许 OPEN|RESTRICTED|CLOSED（空 → OPEN）。
func (s *Service) CreateRoute(ctx context.Context, traceID string, in RouteInput) (*model.RouteSegment, error) {
	if in.RouteID == "" || in.Zone == "" || in.StartPoint == "" || in.EndPoint == "" {
		return nil, crosschain.NewError(errcode.Param, "route_id/zone/start_point/end_point 必填")
	}
	if in.AltitudeMin >= in.AltitudeMax {
		return nil, crosschain.NewError(errcode.Param, "altitude_min(%v) 必须小于 altitude_max(%v)", in.AltitudeMin, in.AltitudeMax)
	}
	if in.CorridorStatus == "" {
		in.CorridorStatus = "OPEN"
	}
	if !validCorridorStatus[in.CorridorStatus] {
		return nil, crosschain.NewError(errcode.Param, "corridor_status 仅允许 OPEN|RESTRICTED|CLOSED，收到 %q", in.CorridorStatus)
	}
	var cnt int64
	if err := s.db.Model(&model.RouteSegment{}).Where("route_id = ?", in.RouteID).Count(&cnt).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	if cnt > 0 {
		return nil, crosschain.NewError(errcode.Param, "route_id %q 已存在", in.RouteID)
	}
	r := &model.RouteSegment{
		RouteID: in.RouteID, Zone: in.Zone, StartPoint: in.StartPoint, EndPoint: in.EndPoint,
		AltitudeMin: in.AltitudeMin, AltitudeMax: in.AltitudeMax, CorridorStatus: in.CorridorStatus,
	}
	if err := s.db.Create(r).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create: %v", err)
	}
	s.logAudit(traceID, "SYSTEM", "ROUTE_CREATE", "ROUTE", r.RouteID,
		map[string]any{"zone": r.Zone, "altitude": []float64{r.AltitudeMin, r.AltitudeMax}, "corridor_status": r.CorridorStatus})
	return r, nil
}

// ListRoutes 按 zone/corridor_status 过滤（空串 = 不过滤），route_id 升序。
func (s *Service) ListRoutes(ctx context.Context, traceID string, zone, corridorStatus string) ([]model.RouteSegment, error) {
	q := s.db.Model(&model.RouteSegment{})
	if zone != "" {
		q = q.Where("zone = ?", zone)
	}
	if corridorStatus != "" {
		q = q.Where("corridor_status = ?", corridorStatus)
	}
	var out []model.RouteSegment
	if err := q.Order("route_id ASC").Find(&out).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, nil
}
