package uavbusiness

import (
	"context"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

type MissionInput struct {
	MissionID     string // 可选，缺省生成 MISSION-<年>-%03d
	OperatorID    string
	UAVID         string
	MissionType   string
	StartTime     string // "2006-01-02 15:04:05" 或带毫秒
	EndTime       string
	RouteSegments []string
	AltitudeMin   float64
	AltitudeMax   float64
	PayloadType   string
	Description   string // 明文描述 → SM9 加密落库 + 脱敏展示
}

func (s *Service) genMissionID(year int) (string, error) {
	var cnt int64
	if err := s.db.Model(&model.Mission{}).Count(&cnt).Error; err != nil {
		return "", err
	}
	for n := int(cnt) + 1; n < 1000; n++ {
		cand := fmt.Sprintf("MISSION-%d-%03d", year, n)
		var dup int64
		if err := s.db.Model(&model.Mission{}).Where("mission_id = ?", cand).Count(&dup).Error; err != nil {
			return "", err
		}
		if dup == 0 {
			return cand, nil
		}
	}
	return "", fmt.Errorf("mission_id space exhausted for year %d", year)
}

// CreateMission 任务创建（实施文档 §9.2 步骤2）：校验 → 生成 → 加密脱敏 →
// 规范化哈希签名 → DRAFT 落库。响应永不含密文（model json:"-"）。
func (s *Service) CreateMission(ctx context.Context, traceID string, in MissionInput) (*model.Mission, error) {
	if in.OperatorID == "" || in.UAVID == "" || in.MissionType == "" || in.StartTime == "" || in.EndTime == "" || len(in.RouteSegments) == 0 || in.PayloadType == "" {
		return nil, crosschain.NewError(errcode.Param, "operator_id/uav_id/mission_type/start_time/end_time/route_segments/payload_type 必填")
	}
	start, err := timex.ParseTime(in.StartTime)
	if err != nil {
		return nil, crosschain.NewError(errcode.Param, "start_time 格式非法（应为 2006-01-02 15:04:05[.000]）: %v", err)
	}
	end, err := timex.ParseTime(in.EndTime)
	if err != nil {
		return nil, crosschain.NewError(errcode.Param, "end_time 格式非法（应为 2006-01-02 15:04:05[.000]）: %v", err)
	}
	if !end.After(start) {
		return nil, crosschain.NewError(errcode.Param, "end_time 必须晚于 start_time")
	}
	if in.AltitudeMin < 0 || in.AltitudeMin >= in.AltitudeMax {
		return nil, crosschain.NewError(errcode.Param, "altitude_min(%v) 必须非负且小于 altitude_max(%v)", in.AltitudeMin, in.AltitudeMax)
	}
	uav, err := s.QueryUAV(ctx, traceID, in.UAVID)
	if err != nil {
		return nil, err
	}
	if uav.Status != "VERIFIED" && uav.Status != "ACTIVE" {
		return nil, crosschain.NewError(errcode.InvalidUAV, "UAV %s 状态 %q 不可创建任务（需 VERIFIED/ACTIVE）", uav.UAVID, uav.Status)
	}
	if uav.OperatorID != in.OperatorID {
		return nil, crosschain.NewError(errcode.InvalidUAV, "UAV %s 不属于运营方 %s", uav.UAVID, in.OperatorID)
	}
	var routes []model.RouteSegment
	if err := s.db.Where("route_id IN ?", in.RouteSegments).Find(&routes).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "routes lookup: %v", err)
	}
	byID := make(map[string]model.RouteSegment, len(routes))
	for _, r := range routes {
		byID[r.RouteID] = r
	}
	zones := []string{}
	seen := map[string]bool{}
	for _, rid := range in.RouteSegments {
		r, ok := byID[rid]
		if !ok {
			return nil, crosschain.NewError(errcode.RouteConflict, "航路 %q 不存在", rid)
		}
		if r.CorridorStatus != "OPEN" {
			return nil, crosschain.NewError(errcode.RouteConflict, "航路 %q 走廊状态 %q 不可规划（仅 OPEN）", rid, r.CorridorStatus)
		}
		if !seen[r.Zone] {
			seen[r.Zone] = true
			zones = append(zones, r.Zone)
		}
	}
	missionID := in.MissionID
	if missionID == "" {
		gen, err := s.genMissionID(start.Year())
		if err != nil {
			return nil, crosschain.NewError(errcode.Internal, "gen mission_id: %v", err)
		}
		missionID = gen
	} else {
		var cnt int64
		if err := s.db.Model(&model.Mission{}).Where("mission_id = ?", missionID).Count(&cnt).Error; err != nil {
			return nil, crosschain.NewError(errcode.Internal, "mission_id lookup: %v", err)
		}
		if cnt > 0 {
			return nil, crosschain.NewError(errcode.Param, "mission_id %q 已存在", missionID)
		}
	}
	segJSON, err := json.Marshal(in.RouteSegments)
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "marshal segments: %v", err)
	}
	zoneJSON, err := json.Marshal(zones)
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "marshal zones: %v", err)
	}
	cipher, masked := "", ""
	if in.Description != "" {
		c, err := s.cs.SM9Encrypt([]byte(in.Description))
		if err != nil {
			return nil, crosschain.NewError(errcode.Internal, "SM9 encrypt description: %v", err)
		}
		cipher = c
		rs := []rune(in.Description)
		if len(rs) > 4 {
			rs = rs[:4]
		}
		masked = string(rs) + "****"
	}
	canon := map[string]any{
		"altitude_max": in.AltitudeMax, "altitude_min": in.AltitudeMin,
		"end_time": timex.FormatTime(end), "mission_id": missionID,
		"mission_type": in.MissionType, "operator_id": in.OperatorID,
		"payload_type": in.PayloadType, "route_segments": in.RouteSegments,
		"start_time": timex.FormatTime(start), "uav_id": in.UAVID, "zones": zones,
	}
	cb, err := crypto.CanonicalJSON(canon)
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "canonicalize: %v", err)
	}
	sig, err := s.cs.SM9SignUserID(crypto.SM9IdentityOf(in.UAVID), cb)
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "SM9 sign: %v", err)
	}
	m := &model.Mission{
		MissionID: missionID, OperatorID: in.OperatorID, UAVID: in.UAVID,
		MissionType: in.MissionType, StartTime: start, EndTime: end,
		RouteSegments: string(segJSON), AltitudeMin: in.AltitudeMin, AltitudeMax: in.AltitudeMax,
		Zones: string(zoneJSON), PayloadType: in.PayloadType,
		MissionCiphertext: cipher, MaskedValue: masked,
		SM3Hash: crypto.SM3Hex(cb), SM9Identity: crypto.SM9IdentityOf(in.UAVID), Signature: sig,
		Status: "DRAFT",
	}
	if err := s.db.Create(m).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create mission: %v", err)
	}
	s.logAudit(traceID, in.OperatorID, "MISSION_CREATE", "MISSION", m.MissionID,
		map[string]any{"uav_id": m.UAVID, "mission_type": m.MissionType, "route_segments": in.RouteSegments,
			"window": []string{timex.FormatTime(start), timex.FormatTime(end)}, "masked_value": masked})
	return m, nil
}

// QueryMission 单任务查询；不存在 → 6002。
func (s *Service) QueryMission(ctx context.Context, traceID, missionID string) (*model.Mission, error) {
	var m model.Mission
	err := s.db.Where("mission_id = ?", missionID).First(&m).Error
	if err == gorm.ErrRecordNotFound {
		return nil, crosschain.NewError(errcode.Param, "mission_id %q 不存在", missionID)
	}
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "query mission: %v", err)
	}
	return &m, nil
}

// MissionListFilter 任务列表过滤（分页约定同网关 List）。
type MissionListFilter struct {
	OperatorID string
	UAVID      string
	Status     string
	Page       int
	PageSize   int
}

// ListMission created_at 倒序分页。
func (s *Service) ListMission(ctx context.Context, traceID string, f MissionListFilter) ([]model.Mission, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.Model(&model.Mission{})
	if f.OperatorID != "" {
		q = q.Where("operator_id = ?", f.OperatorID)
	}
	if f.UAVID != "" {
		q = q.Where("uav_id = ?", f.UAVID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.Mission
	if err := q.Order("created_at DESC").Offset((f.Page - 1) * f.PageSize).Limit(f.PageSize).Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}
