package regulatory

import (
	"bytes"
	"context"
	"encoding/csv"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

type RegAuditQuery struct {
	AlertID         string `json:"alert_id"`
	AuthorizationID string `json:"authorization_id"`
	Action          string `json:"action"`
	OperatorID      string `json:"operator_id"`
	Page            int    `json:"page"`
	PageSize        int    `json:"page_size"`
}

func (q *RegAuditQuery) Normalize() {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 200 {
		q.PageSize = 20
	}
}

// RegAuditList 监管审计分页查询（列表契约 records/total/page/page_size）。
func (s *Service) RegAuditList(ctx context.Context, q *RegAuditQuery) ([]model.RegulatoryAudit, int64, error) {
	q.Normalize()
	db := s.db.WithContext(ctx).Model(&model.RegulatoryAudit{})
	if q.AlertID != "" {
		db = db.Where("alert_id = ?", q.AlertID)
	}
	if q.AuthorizationID != "" {
		db = db.Where("authorization_id = ?", q.AuthorizationID)
	}
	if q.Action != "" {
		db = db.Where("action = ?", q.Action)
	}
	if q.OperatorID != "" {
		db = db.Where("operator_id = ?", q.OperatorID)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "count regulatory_audit: %v", err)
	}
	var records []model.RegulatoryAudit
	if err := db.Order("created_at DESC, audit_id DESC").
		Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&records).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "list regulatory_audit: %v", err)
	}
	return records, total, nil
}

// RegAuditExport 导出 CSV（复用 RegAuditList 过滤，单次上限 PageSize=200）。
func (s *Service) RegAuditExport(ctx context.Context, q *RegAuditQuery) ([]byte, int, error) {
	records, _, err := s.RegAuditList(ctx, &RegAuditQuery{
		AlertID: q.AlertID, AuthorizationID: q.AuthorizationID,
		Action: q.Action, OperatorID: q.OperatorID, Page: 1, PageSize: 200,
	})
	if err != nil {
		return nil, 0, err
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	if err := w.Write([]string{"audit_id", "alert_id", "authorization_id", "action", "operator_id",
		"target", "result", "audit_hash", "chain_tx_id", "created_at"}); err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "csv header: %v", err)
	}
	for _, r := range records {
		row := []string{r.AuditID, r.AlertID, r.AuthorizationID, r.Action, r.OperatorID,
			r.Target, r.Result, r.AuditHash, r.ChainTxID, timex.FormatTime(r.CreatedAt.Time)}
		if err := w.Write(row); err != nil {
			return nil, 0, errcode.NewError(errcode.Internal, "csv row: %v", err)
		}
	}
	w.Flush()
	return buf.Bytes(), len(records), nil
}
