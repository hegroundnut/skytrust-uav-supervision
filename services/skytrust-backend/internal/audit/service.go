package audit

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"strconv"
	"time"

	"gorm.io/gorm"
	"skytrust-backend/internal/model"
)

// csvTimeFmt 本地时间格式常量。审计包不得导入 api（api 将导入 audit，
// 否则形成 import cycle），故不复用 api.TimeFmt。
const csvTimeFmt = "2006-01-02 15:04:05.000"

// Service 统一审计服务：写入 / 查询 / CSV 导出。
type Service struct {
	db *gorm.DB
}

// New 构造审计服务。
func New(db *gorm.DB) *Service {
	return &Service{db: db}
}

// QueryFilter 审计查询过滤条件。
type QueryFilter struct {
	BusinessID string
	Action     string
	Actor      string
	From       *time.Time
	To         *time.Time
	Page       int
	PageSize   int
}

// Log 写入一条审计记录，detail 以 JSON 序列化存入 Detail 字段。
func (s *Service) Log(actor, action, targetType, targetID, traceID string, detail any) error {
	b, err := json.Marshal(detail)
	if err != nil {
		return err
	}
	rec := model.AuditLog{
		TraceID:    traceID,
		Actor:      actor,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Detail:     string(b),
	}
	return s.db.Create(&rec).Error
}

// Query 按过滤条件分页查询审计记录，返回（当页记录, 命中总数, error）。
// Page 从 1 起，默认 20，上限 200；默认值与上限在此处应用，导出路径共享。
func (s *Service) Query(q QueryFilter) ([]model.AuditLog, int64, error) {
	if q.Page <= 0 {
		q.Page = 1
	}
	if q.PageSize <= 0 {
		q.PageSize = 20
	}
	if q.PageSize > 200 {
		q.PageSize = 200
	}

	tx := s.db.Model(&model.AuditLog{})
	if q.BusinessID != "" {
		tx = tx.Where("target_id = ?", q.BusinessID)
	}
	if q.Action != "" {
		tx = tx.Where("action = ?", q.Action)
	}
	if q.Actor != "" {
		tx = tx.Where("actor = ?", q.Actor)
	}
	if q.From != nil {
		tx = tx.Where("created_at >= ?", *q.From)
	}
	if q.To != nil {
		tx = tx.Where("created_at <= ?", *q.To)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var records []model.AuditLog
	if err := tx.Order("id DESC").
		Offset((q.Page - 1) * q.PageSize).
		Limit(q.PageSize).
		Find(&records).Error; err != nil {
		return nil, 0, err
	}
	return records, total, nil
}

// ExportCSV 导出过滤后的审计记录为 CSV 文本（经 Query 共享过滤+分页）。
func (s *Service) ExportCSV(q QueryFilter) ([]byte, error) {
	records, _, err := s.Query(q)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	if err := w.Write([]string{"id", "trace_id", "actor", "action", "target_type", "target_id", "detail", "created_at"}); err != nil {
		return nil, err
	}
	for _, r := range records {
		row := []string{
			strconv.FormatUint(r.ID, 10),
			r.TraceID,
			r.Actor,
			r.Action,
			r.TargetType,
			r.TargetID,
			r.Detail,
			r.CreatedAt.Format(csvTimeFmt),
		}
		if err := w.Write(row); err != nil {
			return nil, err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
