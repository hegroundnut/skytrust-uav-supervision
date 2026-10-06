package offchain

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// TelemetryReportRequest 人工遥测上报请求（spec §3.2）：seq 服务端自增，客户端不传。
type TelemetryReportRequest struct {
	SessionID string  `json:"session_id" binding:"required"`
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	Alt       float64 `json:"alt"`
	Speed     float64 `json:"speed"`
	Heading   float64 `json:"heading"`
}

// ReportTelemetry 人工遥测上报：会话不存在→6002（复用 loadSession）；非 ACTIVE→7003；
// Source=MANUAL，落库后写审计（SIM 推进不写审计，避免高频刷屏）。
func (s *Service) ReportTelemetry(ctx context.Context, traceID string, req *TelemetryReportRequest) (*model.TelemetryReport, error) {
	sess, err := s.loadSession(ctx, req.SessionID)
	if err != nil {
		return nil, err
	}
	if sess.Status != "ACTIVE" {
		return nil, errcode.NewError(errcode.TelemetrySession, "会话 %s 状态 %q 不可上报遥测（需 ACTIVE）", sess.SessionID, sess.Status)
	}
	tlm, err := s.insertTelemetry(ctx, sess, req.Lat, req.Lon, req.Alt, req.Speed, req.Heading, "MANUAL")
	if err != nil {
		return nil, err
	}
	s.logAudit(traceID, sess.UAVID, "TELEMETRY_REPORT", "TELEMETRY", tlm.TelemetryID, map[string]any{
		"session_id": sess.SessionID, "seq": tlm.Seq, "source": tlm.Source,
		"position": []float64{tlm.Lat, tlm.Lon, tlm.Alt},
	})
	return tlm, nil
}

// insertTelemetry 人工上报与 SIM 推进共用的落库出口：seq 按会话自增（首条=1）。
func (s *Service) insertTelemetry(ctx context.Context, sess *model.OffchainSession, lat, lon, alt, speed, heading float64, source string) (*model.TelemetryReport, error) {
	var last model.TelemetryReport
	seq := int64(1)
	err := s.db.WithContext(ctx).Where("session_id = ?", sess.SessionID).Order("seq DESC").First(&last).Error
	switch {
	case err == nil:
		seq = last.Seq + 1
	case errors.Is(err, gorm.ErrRecordNotFound):
		// 首条：seq=1
	default:
		return nil, errcode.NewError(errcode.Internal, "telemetry seq lookup: %v", err)
	}
	tlm := &model.TelemetryReport{
		TelemetryID: model.GenTelemetryID(), SessionID: sess.SessionID,
		MissionID: sess.MissionID, UAVID: sess.UAVID, Seq: seq,
		Lat: lat, Lon: lon, Alt: alt, Speed: speed, Heading: heading,
		ReportedAt: timex.NowT(), Source: source,
	}
	if err := s.db.WithContext(ctx).Create(tlm).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "create telemetry: %v", err)
	}
	return tlm, nil
}

// TelemetryQuery 遥测列表过滤 + 分页（同 SessionQuery 形状）。
type TelemetryQuery struct {
	SessionID string `json:"session_id"`
	UAVID     string `json:"uav_id"`
	Page      int    `json:"page"`
	PageSize  int    `json:"page_size"`
}

// Normalize 分页归一化（Constraint 10 同款）。
func (q *TelemetryQuery) Normalize() {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 {
		q.PageSize = 20
	}
	if q.PageSize > 200 {
		q.PageSize = 200
	}
}

// TelemetryList 按 session_id/uav_id 过滤分页，reported_at 降序。
func (s *Service) TelemetryList(ctx context.Context, traceID string, q *TelemetryQuery) ([]model.TelemetryReport, int64, error) {
	db := s.db.WithContext(ctx).Model(&model.TelemetryReport{})
	if q.SessionID != "" {
		db = db.Where("session_id = ?", q.SessionID)
	}
	if q.UAVID != "" {
		db = db.Where("uav_id = ?", q.UAVID)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.TelemetryReport
	if err := db.Order("reported_at DESC, seq DESC").
		Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&out).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}

// TelemetryLatestRequest 最新遥测查询：session_id / uav_id 至少提供一个。
type TelemetryLatestRequest struct {
	SessionID string `json:"session_id"`
	UAVID     string `json:"uav_id"`
}

// LatestTelemetry 返回最新一条遥测；无记录 → (nil, nil)（API 层回 code=0 + telemetry:null，spec §3.2）。
func (s *Service) LatestTelemetry(ctx context.Context, traceID string, req *TelemetryLatestRequest) (*model.TelemetryReport, error) {
	if req.SessionID == "" && req.UAVID == "" {
		return nil, errcode.NewError(errcode.Param, "session_id/uav_id 至少提供一个")
	}
	db := s.db.WithContext(ctx).Model(&model.TelemetryReport{})
	if req.SessionID != "" {
		db = db.Where("session_id = ?", req.SessionID)
	}
	if req.UAVID != "" {
		db = db.Where("uav_id = ?", req.UAVID)
	}
	var tlm model.TelemetryReport
	err := db.Order("reported_at DESC, seq DESC").First(&tlm).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "latest telemetry: %v", err)
	}
	return &tlm, nil
}
