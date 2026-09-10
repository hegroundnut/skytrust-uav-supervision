package model

import "time"

type NetworkNode struct {
	NodeID      string    `gorm:"primaryKey;size:64" json:"node_id"`
	NodeType    string    `gorm:"size:32" json:"node_type"` // UAV|EDGE|MANAGEMENT|ATTACKER
	SM9Identity string    `gorm:"size:128" json:"sm9_identity"`
	Neighbors   string    `gorm:"type:text" json:"neighbors"`           // JSON数组
	Position    string    `gorm:"size:128" json:"position"`             // JSON {"x":..,"y":..}
	Status      string    `gorm:"size:32;default:ONLINE" json:"status"` // ONLINE|ISOLATED|OFFLINE
	RiskScore   float64   `json:"risk_score"`
	CreatedAt   time.Time `json:"created_at"`
}

type OffchainSession struct {
	SessionID   string    `gorm:"primaryKey;size:64" json:"session_id"`
	MissionID   string    `gorm:"size:64;index" json:"mission_id"`
	UAVID       string    `gorm:"size:64;index" json:"uav_id"`
	PassID      string    `gorm:"size:64" json:"pass_id"`
	Status      string    `gorm:"size:32;default:INIT" json:"status"`
	CurrentPath string    `gorm:"type:text" json:"current_path"` // JSON数组
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type OffchainMessage struct {
	MessageID  string    `gorm:"primaryKey;size:64" json:"message_id"`
	SessionID  string    `gorm:"size:64;index" json:"session_id"`
	MsgType    string    `gorm:"size:32;index" json:"msg_type"`
	SourceNode string    `gorm:"size:64" json:"source_node"`
	TargetNode string    `gorm:"size:64" json:"target_node"`
	Seq        int64     `json:"seq"`
	Timestamp  time.Time `json:"timestamp"`
	SM3Hash    string    `gorm:"size:64" json:"sm3_hash"`
	LatencyMs  int64     `json:"latency_ms"`
	Status     string    `gorm:"size:32" json:"status"`     // SUCCESS|FAILED
	Path       string    `gorm:"type:text" json:"path"`     // JSON数组（实际经过节点）
	Evidence   string    `gorm:"type:text" json:"evidence"` // JSON
	CreatedAt  time.Time `json:"created_at"`
}

type WormholeEvent struct {
	EventID             string    `gorm:"primaryKey;size:64" json:"event_id"`
	SessionID           string    `gorm:"size:64;index" json:"session_id"`
	NodeX               string    `gorm:"size:64" json:"node_x"`
	NodeY               string    `gorm:"size:64" json:"node_y"`
	RiskScore           float64   `json:"risk_score"`
	DetectionDimensions string    `gorm:"type:text" json:"detection_dimensions"` // JSON 5维评分
	Action              string    `gorm:"size:32" json:"action"`                 // DETECT|ISOLATE|RECOVER
	OriginalPath        string    `gorm:"type:text" json:"original_path"`
	NewPath             string    `gorm:"type:text" json:"new_path"`
	RecoveryLatencyMs   int64     `json:"recovery_latency_ms"`
	CreatedAt           time.Time `json:"created_at"`
}
