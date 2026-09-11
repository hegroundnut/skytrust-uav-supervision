package offchain

import (
	"context"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

var validEventActions = map[string]bool{"DETECT": true, "ISOLATE": true, "RECOVER": true, "": true}

type EventQuery struct {
	SessionID string `json:"session_id"`
	Action    string `json:"action"`
	Page      int    `json:"page"`
	PageSize  int    `json:"page_size"`
}

func (q *EventQuery) Normalize() {
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

func (s *Service) EventList(ctx context.Context, traceID string, q EventQuery) ([]model.WormholeEvent, int64, error) {
	q.Normalize()
	if !validEventActions[q.Action] {
		return nil, 0, errcode.NewError(errcode.Param, "action %s invalid (DETECT|ISOLATE|RECOVER)", q.Action)
	}
	db := s.db.WithContext(ctx).Model(&model.WormholeEvent{})
	if q.SessionID != "" {
		db = db.Where("session_id = ?", q.SessionID)
	}
	if q.Action != "" {
		db = db.Where("action = ?", q.Action)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "count events: %v", err)
	}
	records := []model.WormholeEvent{}
	if err := db.Order("created_at DESC, event_id DESC").
		Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&records).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "list events: %v", err)
	}
	return records, total, nil
}
