// Package demo 提供演示数据 Seeder：幂等种子写入（Init）、全量清库重置（Reset），
// 以及供后续 Plan 使用的轨迹常量与冲突任务模板。
package demo

import (
	"gorm.io/gorm"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/model"
)

// SeedReport 种子写入报告：按对象类别统计创建/跳过数量。
type SeedReport struct {
	Created map[string]int `json:"created"`
	Skipped map[string]int `json:"skipped"`
}

// Seeder 演示数据种子器（含模拟链状态重置）。
type Seeder struct {
	db     *gorm.DB
	cs     *crypto.Service
	chains map[string]chainadapter.Resettable
}

func NewSeeder(db *gorm.DB, cs *crypto.Service, chains map[string]chainadapter.Resettable) *Seeder {
	return &Seeder{db: db, cs: cs, chains: chains}
}

// upsert 幂等写入：主键已存在则 Skipped+1，否则 Create 且 Created+1。
func (s *Seeder) upsert(rep *SeedReport, kind string, pkField string, rec any, pkVal string) error {
	var cnt int64
	s.db.Model(rec).Where(pkField+" = ?", pkVal).Count(&cnt)
	if cnt > 0 {
		rep.Skipped[kind]++
		return nil
	}
	if err := s.db.Create(rec).Error; err != nil {
		return err
	}
	rep.Created[kind]++
	return nil
}

// Init 按清单幂等写入全部演示数据。
// 顺序：manufacturer → operator → uav → route_segment → network_node → identity_mapping → audit_log。
func (s *Seeder) Init() (*SeedReport, error) {
	rep := &SeedReport{Created: map[string]int{}, Skipped: map[string]int{}}

	// 1. 厂商
	manufacturers := []model.Manufacturer{
		{ManufacturerID: "Manufacturer-A", Name: "演示厂商A", Status: "ACTIVE", AdapterType: "DJI-ADAPTER"},
		{ManufacturerID: "Manufacturer-B", Name: "演示厂商B", Status: "ACTIVE", AdapterType: "XAG-ADAPTER"},
		{ManufacturerID: "Manufacturer-C", Name: "演示厂商C", Status: "ACTIVE", AdapterType: "FIMI-ADAPTER"},
	}
	for i := range manufacturers {
		rec := manufacturers[i]
		if err := s.upsert(rep, "manufacturer", "manufacturer_id", &rec, rec.ManufacturerID); err != nil {
			return nil, err
		}
	}

	// 2. 运营商
	operators := []model.Operator{
		{OperatorID: "Operator-A", Name: "演示运营商A", Status: "ACTIVE", QualificationStatus: "QUALIFIED", ChainOrgID: "org-operator-a", Contact: "ops-a@skytrust.demo"},
		{OperatorID: "Operator-B", Name: "演示运营商B", Status: "ACTIVE", QualificationStatus: "QUALIFIED", ChainOrgID: "org-operator-b", Contact: "ops-b@skytrust.demo"},
		{OperatorID: "Operator-C", Name: "演示运营商C", Status: "ACTIVE", QualificationStatus: "QUALIFIED", ChainOrgID: "org-operator-c", Contact: "ops-c@skytrust.demo"},
	}
	for i := range operators {
		rec := operators[i]
		if err := s.upsert(rep, "operator", "operator_id", &rec, rec.OperatorID); err != nil {
			return nil, err
		}
	}

	// 3. 无人机（7 架，status=VERIFIED，sm9_identity=SM9-ID-<uav_id>）
	uavs := []model.UAV{
		{UAVID: "UAV-A-001", ManufacturerID: "Manufacturer-B", OperatorID: "Operator-A", Model: "XAG-P40", SerialNo: "SN-A001", SM9Identity: crypto.SM9IdentityOf("UAV-A-001"), Status: "VERIFIED"},
		{UAVID: "UAV-A-002", ManufacturerID: "Manufacturer-A", OperatorID: "Operator-A", Model: "DJI-M300", SerialNo: "SN-A002", SM9Identity: crypto.SM9IdentityOf("UAV-A-002"), Status: "VERIFIED"},
		{UAVID: "UAV-B-001", ManufacturerID: "Manufacturer-A", OperatorID: "Operator-B", Model: "DJI-M30T", SerialNo: "SN-B001", SM9Identity: crypto.SM9IdentityOf("UAV-B-001"), Status: "VERIFIED"},
		{UAVID: "UAV-B-002", ManufacturerID: "Manufacturer-B", OperatorID: "Operator-B", Model: "XAG-V40", SerialNo: "SN-B002", SM9Identity: crypto.SM9IdentityOf("UAV-B-002"), Status: "VERIFIED"},
		{UAVID: "UAV-C-001", ManufacturerID: "Manufacturer-C", OperatorID: "Operator-C", Model: "FIMI-F8", SerialNo: "SN-C001", SM9Identity: crypto.SM9IdentityOf("UAV-C-001"), Status: "VERIFIED"},
		{UAVID: "UAV-C-002", ManufacturerID: "Manufacturer-C", OperatorID: "Operator-C", Model: "FIMI-F8X", SerialNo: "SN-C002", SM9Identity: crypto.SM9IdentityOf("UAV-C-002"), Status: "VERIFIED"},
		{UAVID: "UAV-C-003", ManufacturerID: "Manufacturer-C", OperatorID: "Operator-C", Model: "FIMI-F8Pro", SerialNo: "SN-C003", SM9Identity: crypto.SM9IdentityOf("UAV-C-003"), Status: "VERIFIED"},
	}
	for i := range uavs {
		rec := uavs[i]
		if err := s.upsert(rep, "uav", "uav_id", &rec, rec.UAVID); err != nil {
			return nil, err
		}
	}
	// UAV-A-001 预生成签名缓存（可选预热，失败不阻塞 Init）
	if s.cs != nil {
		_, _ = s.cs.SM9SignUserID(crypto.SM9IdentityOf("UAV-A-001"), []byte("demo-seed-warmup"))
	}

	// 4. 航路（altitude 60–150，corridor_status=OPEN）
	routes := []model.RouteSegment{
		{RouteID: "R101", Zone: "Zone-A", StartPoint: "A-ENTRY(30.510,114.310)", EndPoint: "A-EXIT(30.540,114.340)", AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN"},
		{RouteID: "R205", Zone: "Zone-A", StartPoint: "A-EXIT(30.540,114.340)", EndPoint: "B-GATE(30.572,114.372)", AltitudeMin: 80, AltitudeMax: 120, CorridorStatus: "OPEN"},
		{RouteID: "R208", Zone: "Zone-B", StartPoint: "B-WEST(30.570,114.370)", EndPoint: "B-EAST(30.590,114.390)", AltitudeMin: 60, AltitudeMax: 100, CorridorStatus: "OPEN"},
		{RouteID: "R209", Zone: "Zone-B", StartPoint: "B-GATE(30.555,114.365)", EndPoint: "B-NORTH(30.600,114.410)", AltitudeMin: 90, AltitudeMax: 150, CorridorStatus: "OPEN"},
		{RouteID: "R306", Zone: "Zone-B", StartPoint: "B-EAST(30.585,114.385)", EndPoint: "B-LAND(30.620,114.420)", AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN"},
	}
	for i := range routes {
		rec := routes[i]
		if err := s.upsert(rep, "route_segment", "route_id", &rec, rec.RouteID); err != nil {
			return nil, err
		}
	}

	// 5. 网络节点（Neighbors/Position 为 JSON 文本；NODE-X/NODE-Y 为虫洞攻击节点，默认 OFFLINE）
	nodes := []model.NetworkNode{
		{NodeID: "UAV-A-001-NODE", NodeType: "UAV", SM9Identity: crypto.SM9IdentityOf("UAV-A-001-NODE"), Neighbors: `["N1"]`, Position: `{"x":0,"y":0}`, Status: "ONLINE"},
		{NodeID: "N1", NodeType: "EDGE", SM9Identity: crypto.SM9IdentityOf("N1"), Neighbors: `["UAV-A-001-NODE","N2"]`, Position: `{"x":10,"y":10}`, Status: "ONLINE"},
		{NodeID: "N2", NodeType: "EDGE", SM9Identity: crypto.SM9IdentityOf("N2"), Neighbors: `["N1","N3"]`, Position: `{"x":20,"y":20}`, Status: "ONLINE"},
		{NodeID: "N3", NodeType: "EDGE", SM9Identity: crypto.SM9IdentityOf("N3"), Neighbors: `["N2","N4"]`, Position: `{"x":30,"y":30}`, Status: "ONLINE"},
		{NodeID: "N4", NodeType: "EDGE", SM9Identity: crypto.SM9IdentityOf("N4"), Neighbors: `["N3","MGR"]`, Position: `{"x":40,"y":40}`, Status: "ONLINE"},
		{NodeID: "MGR", NodeType: "MANAGEMENT", SM9Identity: crypto.SM9IdentityOf("MGR"), Neighbors: `["N4"]`, Position: `{"x":50,"y":50}`, Status: "ONLINE"},
		{NodeID: "NODE-X", NodeType: "ATTACKER", SM9Identity: crypto.SM9IdentityOf("NODE-X"), Neighbors: `[]`, Position: `{"x":1,"y":50}`, Status: "OFFLINE"},
		{NodeID: "NODE-Y", NodeType: "ATTACKER", SM9Identity: crypto.SM9IdentityOf("NODE-Y"), Neighbors: `[]`, Position: `{"x":99,"y":51}`, Status: "OFFLINE"},
	}
	for i := range nodes {
		rec := nodes[i]
		if err := s.upsert(rep, "network_node", "node_id", &rec, rec.NodeID); err != nil {
			return nil, err
		}
	}

	// 6. 身份映射
	// 演示数据 ID 冻结于 2026 系列，属静态数据非生成路径（C17 裁定：年份不随当前年
	// 滚动；experiment/scenarios_s3 黄金线 goldenPassID 与本冻结值对齐）。
	mapping := model.IdentityMapping{
		MappingID:      "IDM-DEMO-0001",
		Pseudo:         "PSEUDO-UAV-83921",
		DeviceAddress:  "0xADDR83921",
		PassID:         "PASS-2026-001",
		SM9Identity:    crypto.SM9IdentityOf("UAV-A-001"),
		UAVID:          "UAV-A-001",
		OperatorID:     "Operator-A",
		ManufacturerID: "Manufacturer-B",
		SourceChain:    "chainmaker",
	}
	if err := s.upsert(rep, "identity_mapping", "mapping_id", &mapping, mapping.MappingID); err != nil {
		return nil, err
	}

	// 7. 监管员 REG-01 初始化审计记录。
	// 直接写 model.AuditLog（不依赖 audit 包），以固定 target_id 走同款 count-then-create
	// 幂等逻辑：第二次 Init 命中已存在记录 → Skipped，保证 rep.Created 为空。
	auditSeed := model.AuditLog{
		TraceID:    "SEED-REG-01-INIT",
		Actor:      "REG-01",
		Action:     "SEED_INIT",
		TargetType: "SYSTEM",
		TargetID:   "REG-01-INIT",
		Detail:     `{"regulator_id":"REG-01","event":"demo_data_initialized"}`,
	}
	if err := s.upsert(rep, "audit_log", "target_id", &auditSeed, auditSeed.TargetID); err != nil {
		return nil, err
	}

	return rep, nil
}

// Reset 清空全部业务表（保留表结构）并重置所有模拟链状态，返回清空表数。
func (s *Seeder) Reset() (int, error) {
	cleared := 0
	for _, m := range model.AllModels() {
		stmt := &gorm.Statement{DB: s.db}
		if err := stmt.Parse(m); err != nil {
			return cleared, err
		}
		if err := s.db.Exec("DELETE FROM " + stmt.Schema.Table).Error; err != nil {
			return cleared, err
		}
		cleared++
	}
	for _, c := range s.chains { // nil map 安全：range nil 为 no-op；real 链不在表中（P6-R6）
		if c != nil {
			c.ResetState()
		}
	}
	return cleared, nil
}

// NormalTrajectory 正常轨迹（R101→R205→R306，12 点），供 Plan 3/4 使用。
var NormalTrajectory = []map[string]any{
	{"seq": 1, "route_segment": "R101", "lat": 30.510, "lon": 114.310, "alt": 80.0, "speed": 12.0},
	{"seq": 2, "route_segment": "R101", "lat": 30.520, "lon": 114.320, "alt": 80.0, "speed": 12.0},
	{"seq": 3, "route_segment": "R101", "lat": 30.530, "lon": 114.330, "alt": 85.0, "speed": 12.5},
	{"seq": 4, "route_segment": "R101", "lat": 30.540, "lon": 114.340, "alt": 85.0, "speed": 12.5},
	{"seq": 5, "route_segment": "R205", "lat": 30.548, "lon": 114.348, "alt": 90.0, "speed": 13.0},
	{"seq": 6, "route_segment": "R205", "lat": 30.556, "lon": 114.356, "alt": 95.0, "speed": 13.0},
	{"seq": 7, "route_segment": "R205", "lat": 30.564, "lon": 114.364, "alt": 95.0, "speed": 13.5},
	{"seq": 8, "route_segment": "R205", "lat": 30.572, "lon": 114.372, "alt": 100.0, "speed": 13.5},
	{"seq": 9, "route_segment": "R306", "lat": 30.585, "lon": 114.385, "alt": 90.0, "speed": 12.0},
	{"seq": 10, "route_segment": "R306", "lat": 30.598, "lon": 114.398, "alt": 85.0, "speed": 12.0},
	{"seq": 11, "route_segment": "R306", "lat": 30.610, "lon": 114.410, "alt": 75.0, "speed": 11.0},
	{"seq": 12, "route_segment": "R306", "lat": 30.620, "lon": 114.420, "alt": 60.0, "speed": 10.0},
}

// DeviationTrajectory 偏航轨迹（R101→R209→R306，12 点）：第 5–8 点切入 R209 且坐标偏移。
var DeviationTrajectory = []map[string]any{
	{"seq": 1, "route_segment": "R101", "lat": 30.510, "lon": 114.310, "alt": 80.0, "speed": 12.0},
	{"seq": 2, "route_segment": "R101", "lat": 30.520, "lon": 114.320, "alt": 80.0, "speed": 12.0},
	{"seq": 3, "route_segment": "R101", "lat": 30.530, "lon": 114.330, "alt": 85.0, "speed": 12.5},
	{"seq": 4, "route_segment": "R101", "lat": 30.540, "lon": 114.340, "alt": 85.0, "speed": 12.5},
	{"seq": 5, "route_segment": "R209", "lat": 30.561, "lon": 114.372, "alt": 95.0, "speed": 15.0},
	{"seq": 6, "route_segment": "R209", "lat": 30.574, "lon": 114.383, "alt": 105.0, "speed": 15.5},
	{"seq": 7, "route_segment": "R209", "lat": 30.586, "lon": 114.395, "alt": 115.0, "speed": 15.5},
	{"seq": 8, "route_segment": "R209", "lat": 30.598, "lon": 114.407, "alt": 120.0, "speed": 16.0},
	{"seq": 9, "route_segment": "R306", "lat": 30.585, "lon": 114.385, "alt": 90.0, "speed": 12.0},
	{"seq": 10, "route_segment": "R306", "lat": 30.598, "lon": 114.398, "alt": 85.0, "speed": 12.0},
	{"seq": 11, "route_segment": "R306", "lat": 30.610, "lon": 114.410, "alt": 75.0, "speed": 11.0},
	{"seq": 12, "route_segment": "R306", "lat": 30.620, "lon": 114.420, "alt": 60.0, "speed": 10.0},
}

// MissionB002Template 冲突任务模板（不落库），供 Plan 2 测试/API 使用。
var MissionB002Template = map[string]any{
	"mission_id":     "MISSION-B-002",
	"operator_id":    "Operator-B",
	"uav_id":         "UAV-B-001",
	"route_segments": []string{"R205"},
	"mission_type":   "POWER_INSPECTION",
}
