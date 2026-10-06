package model

import "skytrust-backend/internal/timex"

// 本文件承载 UOM（民用无人驾驶航空器综合管理平台）扩展域模型（spec §3.2-§3.4）：
// 遥测上报、实名登记主体、操控员执照。全部为纯加法新表，注册进 AllModels()。

// TelemetryReport 遥测上报记录（spec §3.2）：人工上报（Source=MANUAL）或 SIM 自动驾驶推进（Source=SIM）。
// (session_id, seq) 组合唯一——seq 由服务端按会话自增，客户端不传。
type TelemetryReport struct {
	TelemetryID string     `gorm:"primaryKey;size:64" json:"telemetry_id"` // TLM- 前缀
	SessionID   string     `gorm:"size:64;index;uniqueIndex:idx_tlm_session_seq" json:"session_id"`
	MissionID   string     `gorm:"size:64;index" json:"mission_id"`
	UAVID       string     `gorm:"size:64;index" json:"uav_id"`
	Seq         int64      `gorm:"uniqueIndex:idx_tlm_session_seq" json:"seq"`
	Lat         float64    `json:"lat"`
	Lon         float64    `json:"lon"`
	Alt         float64    `json:"alt"`
	Speed       float64    `json:"speed"`
	Heading     float64    `json:"heading"` // 度，正北顺时针 [0,360)
	ReportedAt  timex.Time `json:"reported_at"`
	Source      string     `gorm:"size:16" json:"source"` // SIM | MANUAL
	CreatedAt   timex.Time `json:"created_at"`
}

// RealnameSubject UOM 实名登记主体（spec §3.3）：个人/企业，模拟证件号（不存真实证件）。
type RealnameSubject struct {
	SubjectID   string     `gorm:"primaryKey;size:64" json:"subject_id"` // RNS- 前缀
	SubjectType string     `gorm:"size:32" json:"subject_type"`          // INDIVIDUAL | ENTERPRISE
	Name        string     `gorm:"size:128" json:"name"`
	IdNumber    string     `gorm:"size:64;index" json:"id_number"` // 模拟身份证号/统一社会信用代码
	Contact     string     `gorm:"size:128" json:"contact"`
	Status      string     `gorm:"size:32;default:REGISTERED" json:"status"`
	CreatedAt   timex.Time `json:"created_at"`
	UpdatedAt   timex.Time `json:"updated_at"`
}
