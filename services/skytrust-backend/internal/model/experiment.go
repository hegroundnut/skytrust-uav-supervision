package model

import "time"

type ExperimentRun struct {
	ExperimentID   string `gorm:"primaryKey;size:64" json:"experiment_id"`
	RunID          string `gorm:"primaryKey;size:64" json:"run_id"`
	ExperimentType string `gorm:"size:48;index" json:"experiment_type"`
	Scenario       string `gorm:"size:48" json:"scenario"`
	Config         string `gorm:"type:text" json:"config"` // JSON
	Status         string `gorm:"size:32" json:"status"`   // RUNNING|DONE|FAILED
	Count          int    `json:"count"`
	SuccessCount   int    `json:"success_count"`
	SuccessRate    float64 `json:"success_rate"`
	AvgLatencyMs   float64 `json:"avg_latency_ms"`
	P50LatencyMs   float64 `json:"p50_latency_ms"`
	P95LatencyMs   float64 `json:"p95_latency_ms"`
	MaxLatencyMs   float64 `json:"max_latency_ms"`
	FailedCount    int    `json:"failed_count"`
	FailureReasons string `gorm:"type:text" json:"failure_reasons"` // JSON
	StartedAt      time.Time `json:"started_at"`
	CompletedAt    time.Time `json:"completed_at"`
}
