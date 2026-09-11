package uavbusiness

import (
	"context"
	"encoding/json"
	"math"
	"strings"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// missionOverlap 三维重叠判定（实施文档 §9.3）：时间 ∧ 航路 ∧ 高度同时重叠才算冲突。
// 返回重叠航段列表与是否冲突。纯函数，可单测。
func missionOverlap(a, b *model.Mission) ([]string, bool) {
	if !a.StartTime.Before(b.EndTime) || !b.StartTime.Before(a.EndTime) {
		return nil, false
	}
	var segA, segB []string
	if err := json.Unmarshal([]byte(a.RouteSegments), &segA); err != nil {
		return nil, false
	}
	if err := json.Unmarshal([]byte(b.RouteSegments), &segB); err != nil {
		return nil, false
	}
	setB := make(map[string]bool, len(segB))
	for _, id := range segB {
		setB[id] = true
	}
	overlaps := []string{}
	for _, id := range segA {
		if setB[id] {
			overlaps = append(overlaps, id)
		}
	}
	if len(overlaps) == 0 {
		return nil, false
	}
	if math.Max(a.AltitudeMin, b.AltitudeMin) > math.Min(a.AltitudeMax, b.AltitudeMax) {
		return nil, false
	}
	return overlaps, true
}

// toCoordinating 冲突迁移：SUBMITTED 经 REVIEWING 两跳、REVIEWING 一跳 → COORDINATING；
// COORDINATING 幂等；其余（APPROVED 等）只标记不迁移（强制：审批结果不被协调流程回滚）。
func (s *Service) toCoordinating(traceID, actor string, m *model.Mission) {
	switch m.Status {
	case "COORDINATING":
		return
	case "SUBMITTED":
		if err := s.transitionMission(traceID, actor, m, "REVIEWING", "CONFLICT_PRE"); err != nil {
			return
		}
		_ = s.transitionMission(traceID, actor, m, "COORDINATING", "CONFLICT")
	case "REVIEWING":
		_ = s.transitionMission(traceID, actor, m, "COORDINATING", "CONFLICT")
	default:
		s.logAudit(traceID, actor, "CONFLICT_FLAGGED", "MISSION", m.MissionID,
			map[string]any{"status": m.Status, "note": "APPROVED/终态任务只标记冲突，不迁移"})
	}
}

// DetectConflict 以 missionID 为主动方检测冲突。已有 OPEN 冲突（双向）复用返回。
func (s *Service) DetectConflict(ctx context.Context, traceID, missionID string) ([]model.ConflictRecord, error) {
	m, err := s.QueryMission(ctx, traceID, missionID)
	if err != nil {
		return nil, err
	}
	var candidates []model.Mission
	if err := s.db.Where("mission_id <> ? AND status IN ?", m.MissionID,
		[]string{"SUBMITTED", "REVIEWING", "COORDINATING", "APPROVED"}).Find(&candidates).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "candidates: %v", err)
	}
	out := []model.ConflictRecord{}
	for i := range candidates {
		c := &candidates[i]
		overlaps, ok := missionOverlap(m, c)
		if !ok {
			continue
		}
		var existing model.ConflictRecord
		err := s.db.Where("status = ? AND ((mission_id_a = ? AND mission_id_b = ?) OR (mission_id_a = ? AND mission_id_b = ?))",
			"OPEN", m.MissionID, c.MissionID, c.MissionID, m.MissionID).First(&existing).Error
		if err == nil {
			out = append(out, existing)
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return nil, crosschain.NewError(errcode.Internal, "existing conflict lookup: %v", err)
		}
		suggJSON, err := json.Marshal(map[string]string{
			"adjust_time":     "时间窗后移30分钟",
			"adjust_route":    "改走邻近走廊，避开冲突段 " + strings.Join(overlaps, ","),
			"adjust_altitude": "调整至与对方任务不重叠的高度层",
		})
		if err != nil {
			return nil, crosschain.NewError(errcode.Internal, "marshal suggestion: %v", err)
		}
		rec := model.ConflictRecord{
			ConflictID: model.GenConflictID(), MissionIDA: m.MissionID, MissionIDB: c.MissionID,
			ConflictType: "ROUTE", Suggestion: string(suggJSON), Status: "OPEN",
		}
		if err := s.db.Create(&rec).Error; err != nil {
			return nil, crosschain.NewError(errcode.Internal, "create conflict: %v", err)
		}
		out = append(out, rec)
		s.toCoordinating(traceID, "SYSTEM", m)
		s.toCoordinating(traceID, "SYSTEM", c)
		s.logAudit(traceID, "SYSTEM", "CONFLICT_DETECT", "CONFLICT", rec.ConflictID,
			map[string]any{"mission_id_a": rec.MissionIDA, "mission_id_b": rec.MissionIDB,
				"overlap_segments": overlaps, "suggestion": string(suggJSON)})
	}
	return out, nil
}

// ResolveConflict 解决冲突：OPEN→RESOLVED；missionID 空 = 双方 COORDINATING→REVIEWING，
// 非空 = 仅该方迁移。不存在/不属于该冲突 → 6002；非 OPEN → 3004。
func (s *Service) ResolveConflict(ctx context.Context, traceID, conflictID, resolution, operator, missionID string) (*model.ConflictRecord, error) {
	if conflictID == "" || resolution == "" || operator == "" {
		return nil, crosschain.NewError(errcode.Param, "conflict_id/resolution/operator 必填")
	}
	var rec model.ConflictRecord
	err := s.db.Where("conflict_id = ?", conflictID).First(&rec).Error
	if err == gorm.ErrRecordNotFound {
		return nil, crosschain.NewError(errcode.Param, "conflict_id %q 不存在", conflictID)
	}
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "conflict lookup: %v", err)
	}
	if rec.Status != "OPEN" {
		return nil, crosschain.NewError(errcode.MissionState, "冲突 %q 状态 %q 不可重复解决", conflictID, rec.Status)
	}
	targets := []string{rec.MissionIDA, rec.MissionIDB}
	if missionID != "" {
		if missionID != rec.MissionIDA && missionID != rec.MissionIDB {
			return nil, crosschain.NewError(errcode.Param, "mission_id %q 不属于冲突 %q", missionID, conflictID)
		}
		targets = []string{missionID}
	}
	rec.Resolution = resolution
	rec.Operator = operator
	rec.Status = "RESOLVED"
	if err := s.db.Model(&rec).Updates(map[string]any{
		"resolution": resolution, "operator": operator, "status": "RESOLVED",
	}).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "persist resolution: %v", err)
	}
	for _, id := range targets {
		var m model.Mission
		if err := s.db.Where("mission_id = ?", id).First(&m).Error; err != nil {
			continue
		}
		if m.Status == "COORDINATING" {
			_ = s.transitionMission(traceID, operator, &m, "REVIEWING", "CONFLICT_RESOLVED")
		}
	}
	s.logAudit(traceID, operator, "CONFLICT_RESOLVE", "CONFLICT", rec.ConflictID,
		map[string]any{"resolution": resolution, "mission_id_a": rec.MissionIDA,
			"mission_id_b": rec.MissionIDB, "targets": targets})
	return &rec, nil
}
