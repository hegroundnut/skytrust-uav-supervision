package uavbusiness

import (
	"context"
	"math"
	"strconv"
	"strings"

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

// validPartyStatus manufacturer/operator status 枚举（B3：对齐 route corridor_status
// 枚举校验房规；空串走默认 ACTIVE，不经枚举拒绝）。
var validPartyStatus = map[string]bool{"ACTIVE": true, "SUSPENDED": true}

// RegisterManufacturer 厂商注册；ID 重复 → 6002；status 仅允许 ACTIVE|SUSPENDED（空 → ACTIVE）→ 6002。
func (s *Service) RegisterManufacturer(ctx context.Context, traceID string, in ManufacturerInput) (*model.Manufacturer, error) {
	if in.ManufacturerID == "" || in.Name == "" {
		return nil, crosschain.NewError(errcode.Param, "manufacturer_id 与 name 必填")
	}
	if in.Status != "" && !validPartyStatus[in.Status] {
		return nil, crosschain.NewError(errcode.Param, "status 仅允许 ACTIVE|SUSPENDED，收到 %q", in.Status)
	}
	var cnt int64
	if err := s.db.WithContext(ctx).Model(&model.Manufacturer{}).Where("manufacturer_id = ?", in.ManufacturerID).Count(&cnt).Error; err != nil {
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
	if err := s.db.WithContext(ctx).Create(m).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create: %v", err)
	}
	s.logAudit(traceID, in.ManufacturerID, "MANUFACTURER_REGISTER", "MANUFACTURER", m.ManufacturerID,
		map[string]any{"name": m.Name, "adapter_type": m.AdapterType, "status": m.Status})
	return m, nil
}

// ManufacturerListFilter 厂商列表过滤 + 分页参数。
type ManufacturerListFilter struct {
	Status   string
	Page     int
	PageSize int
}

// ListManufacturers 按 status 过滤（空串 = 不过滤），manufacturer_id 升序分页，返回记录与命中总数。
func (s *Service) ListManufacturers(ctx context.Context, traceID string, f ManufacturerListFilter) ([]model.Manufacturer, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.WithContext(ctx).Model(&model.Manufacturer{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.Manufacturer
	if err := q.Order("manufacturer_id ASC").
		Offset((f.Page - 1) * f.PageSize).
		Limit(f.PageSize).
		Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
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

// RegisterOperator 运营方注册；ID 重复 → 6002；status 仅允许 ACTIVE|SUSPENDED（空 → ACTIVE）→ 6002。
func (s *Service) RegisterOperator(ctx context.Context, traceID string, in OperatorInput) (*model.Operator, error) {
	if in.OperatorID == "" || in.Name == "" {
		return nil, crosschain.NewError(errcode.Param, "operator_id 与 name 必填")
	}
	if in.Status != "" && !validPartyStatus[in.Status] {
		return nil, crosschain.NewError(errcode.Param, "status 仅允许 ACTIVE|SUSPENDED，收到 %q", in.Status)
	}
	var cnt int64
	if err := s.db.WithContext(ctx).Model(&model.Operator{}).Where("operator_id = ?", in.OperatorID).Count(&cnt).Error; err != nil {
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
	if err := s.db.WithContext(ctx).Create(o).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create: %v", err)
	}
	s.logAudit(traceID, in.OperatorID, "OPERATOR_REGISTER", "OPERATOR", o.OperatorID,
		map[string]any{"name": o.Name, "qualification_status": o.QualificationStatus, "chain_org_id": o.ChainOrgID})
	return o, nil
}

// OperatorListFilter 运营方列表过滤 + 分页参数。
type OperatorListFilter struct {
	Status   string
	Page     int
	PageSize int
}

// ListOperators 按 status 过滤（空串 = 不过滤），operator_id 升序分页，返回记录与命中总数。
func (s *Service) ListOperators(ctx context.Context, traceID string, f OperatorListFilter) ([]model.Operator, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.WithContext(ctx).Model(&model.Operator{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.Operator
	if err := q.Order("operator_id ASC").
		Offset((f.Page - 1) * f.PageSize).
		Limit(f.PageSize).
		Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
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
	StartLat       float64 // 可选：结构化起点坐标（lat/lon 同设时优先于内嵌解析；半套视为缺失）
	StartLon       float64
	EndLat         float64
	EndLon         float64
}

var validCorridorStatus = map[string]bool{"OPEN": true, "RESTRICTED": true, "CLOSED": true}

// parsePointCoords 解析 "NAME(lat,lon)" 内嵌坐标。任何畸形（无括号/缺值/非数字）返回 ok=false——
// 永不报错（spec §3.1：解析失败保持 0 即可）。
func parsePointCoords(s string) (lat, lon float64, ok bool) {
	l := strings.LastIndex(s, "(")
	r := strings.LastIndex(s, ")")
	if l < 0 || r <= l+1 {
		return 0, 0, false
	}
	parts := strings.Split(s[l+1:r], ",")
	if len(parts) != 2 {
		return 0, 0, false
	}
	latV, err1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	lonV, err2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	if err1 != nil || err2 != nil {
		return 0, 0, false
	}
	// ParseFloat 放行 NaN/±Inf/Infinity 拼写——非有限值一律判为解析失败（spec §3.1），
	// 杜绝 NaN 行入库导致信封 JSON 渲染 panic（恒 200 铁律）。
	if math.IsNaN(latV) || math.IsNaN(lonV) || math.IsInf(latV, 0) || math.IsInf(lonV, 0) {
		return 0, 0, false
	}
	return latV, lonV, true
}

// CreateRoute 航线创建；ID 重复 → 6002；altitude_min 负值或 >= altitude_max → 6002；
// corridor_status 仅允许 OPEN|RESTRICTED|CLOSED（空 → OPEN）。
func (s *Service) CreateRoute(ctx context.Context, traceID string, in RouteInput) (*model.RouteSegment, error) {
	if in.RouteID == "" || in.Zone == "" || in.StartPoint == "" || in.EndPoint == "" {
		return nil, crosschain.NewError(errcode.Param, "route_id/zone/start_point/end_point 必填")
	}
	if in.AltitudeMin < 0 || in.AltitudeMin >= in.AltitudeMax {
		return nil, crosschain.NewError(errcode.Param, "altitude_min(%v) 必须非负且小于 altitude_max(%v)", in.AltitudeMin, in.AltitudeMax)
	}
	if in.CorridorStatus == "" {
		in.CorridorStatus = "OPEN"
	}
	if !validCorridorStatus[in.CorridorStatus] {
		return nil, crosschain.NewError(errcode.Param, "corridor_status 仅允许 OPEN|RESTRICTED|CLOSED，收到 %q", in.CorridorStatus)
	}
	var cnt int64
	if err := s.db.WithContext(ctx).Model(&model.RouteSegment{}).Where("route_id = ?", in.RouteID).Count(&cnt).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	if cnt > 0 {
		return nil, crosschain.NewError(errcode.Param, "route_id %q 已存在", in.RouteID)
	}
	// 结构化坐标回填（spec §3.1）：显式入参优先；未设时解析内嵌 "NAME(lat,lon)"，解析失败保持 0 不报错。
	// 配对规则：lat/lon 必须同设或同缺——半套显式坐标（恰一非零）视为缺失，先归一为双零再进回填：
	// 解析成功则回填解析值，否则端点保持 (0,0)。与「端点缺失=双零」全仓约定及走廊守卫原子性对齐，
	// 杜绝 (30.5,0) 之类不造假坐标红线漏洞；同设/同缺的合法调用行为不变。
	startLat, startLon, endLat, endLon := in.StartLat, in.StartLon, in.EndLat, in.EndLon
	if (startLat == 0) != (startLon == 0) { // 起点半套 → 视为缺失
		startLat, startLon = 0, 0
	}
	if (endLat == 0) != (endLon == 0) { // 终点半套 → 视为缺失
		endLat, endLon = 0, 0
	}
	if startLat == 0 && startLon == 0 {
		if la, lo, ok := parsePointCoords(in.StartPoint); ok {
			startLat, startLon = la, lo
		}
	}
	if endLat == 0 && endLon == 0 {
		if la, lo, ok := parsePointCoords(in.EndPoint); ok {
			endLat, endLon = la, lo
		}
	}
	r := &model.RouteSegment{
		RouteID: in.RouteID, Zone: in.Zone, StartPoint: in.StartPoint, EndPoint: in.EndPoint,
		StartLat: startLat, StartLon: startLon, EndLat: endLat, EndLon: endLon,
		AltitudeMin: in.AltitudeMin, AltitudeMax: in.AltitudeMax, CorridorStatus: in.CorridorStatus,
	}
	if err := s.db.WithContext(ctx).Create(r).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create: %v", err)
	}
	s.logAudit(traceID, "SYSTEM", "ROUTE_CREATE", "ROUTE", r.RouteID,
		map[string]any{"zone": r.Zone, "altitude": []float64{r.AltitudeMin, r.AltitudeMax}, "corridor_status": r.CorridorStatus})
	return r, nil
}

// RouteListFilter 航线列表过滤 + 分页参数。
type RouteListFilter struct {
	Zone           string
	CorridorStatus string
	Page           int
	PageSize       int
}

// ListRoutes 按 zone/corridor_status 过滤（空串 = 不过滤），route_id 升序分页，返回记录与命中总数。
func (s *Service) ListRoutes(ctx context.Context, traceID string, f RouteListFilter) ([]model.RouteSegment, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.WithContext(ctx).Model(&model.RouteSegment{})
	if f.Zone != "" {
		q = q.Where("zone = ?", f.Zone)
	}
	if f.CorridorStatus != "" {
		q = q.Where("corridor_status = ?", f.CorridorStatus)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.RouteSegment
	if err := q.Order("route_id ASC").
		Offset((f.Page - 1) * f.PageSize).
		Limit(f.PageSize).
		Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}
