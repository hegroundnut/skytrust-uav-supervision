package model

import "skytrust-backend/internal/timex"

// AuditLog — 统一操作日志（/api/audit/query 数据源）
type AuditLog struct {
	ID         uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	TraceID    string     `gorm:"size:64;index" json:"trace_id"`
	Actor      string     `gorm:"size:64;index" json:"actor"`
	Action     string     `gorm:"size:64;index" json:"action"`
	TargetType string     `gorm:"size:32" json:"target_type"`
	TargetID   string     `gorm:"size:64;index" json:"target_id"`
	Detail     string     `gorm:"type:text" json:"detail"` // JSON
	CreatedAt  timex.Time `gorm:"index" json:"created_at"`
}
