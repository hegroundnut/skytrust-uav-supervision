package model

import "time"

type RouteSegment struct {
	RouteID        string    `gorm:"primaryKey;size:32" json:"route_id"`
	Zone           string    `gorm:"size:32;index" json:"zone"`
	StartPoint     string    `gorm:"size:64" json:"start_point"`
	EndPoint       string    `gorm:"size:64" json:"end_point"`
	AltitudeMin    float64   `json:"altitude_min"`
	AltitudeMax    float64   `json:"altitude_max"`
	CorridorStatus string    `gorm:"size:32;default:OPEN" json:"corridor_status"` // OPEN|RESTRICTED|CLOSED
	CreatedAt      time.Time `json:"created_at"`
}

type Mission struct {
	MissionID         string    `gorm:"primaryKey;size:64" json:"mission_id"`
	OperatorID        string    `gorm:"size:64;index" json:"operator_id"`
	UAVID             string    `gorm:"size:64;index" json:"uav_id"`
	MissionType       string    `gorm:"size:32" json:"mission_type"`
	StartTime         time.Time `json:"start_time"`
	EndTime           time.Time `json:"end_time"`
	RouteSegments     string    `gorm:"type:text" json:"route_segments"` // JSON数组: ["R101","R205","R306"]
	AltitudeMin       float64   `json:"altitude_min"`
	AltitudeMax       float64   `json:"altitude_max"`
	Zones             string    `gorm:"type:text" json:"zones"` // JSON数组
	PayloadType       string    `gorm:"size:32" json:"payload_type"`
	MissionCiphertext string    `gorm:"type:text" json:"-"`           // SM9加密的任务描述，不对外输出
	MaskedValue       string    `gorm:"size:256" json:"masked_value"` // 脱敏展示值
	SM3Hash           string    `gorm:"size:64" json:"sm3_hash"`
	SM9Identity       string    `gorm:"size:128" json:"sm9_identity"`
	Signature         string    `gorm:"type:text" json:"signature"` // Base64
	Status            string    `gorm:"size:32;default:DRAFT;index" json:"status"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type MissionApplication struct {
	ApplicationID string    `gorm:"primaryKey;size:64" json:"application_id"`
	MissionID     string    `gorm:"size:64;index" json:"mission_id"`
	SM3Hash       string    `gorm:"size:64" json:"sm3_hash"`
	Signature     string    `gorm:"type:text" json:"signature"`
	SourceChain   string    `gorm:"size:32" json:"source_chain"`
	SourceTxID    string    `gorm:"size:128" json:"source_tx_id"`
	Status        string    `gorm:"size:32;default:PENDING" json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ReviewRecord struct {
	ReviewID      string    `gorm:"primaryKey;size:64" json:"review_id"`
	ApplicationID string    `gorm:"size:64;index" json:"application_id"`
	Result        string    `gorm:"size:32" json:"result"`      // APPROVED|REJECTED|NEED_COORDINATION
	RulesHit      string    `gorm:"type:text" json:"rules_hit"` // JSON数组
	Comment       string    `gorm:"type:text" json:"comment"`
	Reviewer      string    `gorm:"size:64" json:"reviewer"`
	ReviewTime    time.Time `json:"review_time"`
}

type ConflictRecord struct {
	ConflictID   string    `gorm:"primaryKey;size:64" json:"conflict_id"`
	MissionIDA   string    `gorm:"size:64;index" json:"mission_id_a"`
	MissionIDB   string    `gorm:"size:64;index" json:"mission_id_b"`
	ConflictType string    `gorm:"size:32" json:"conflict_type"` // TIME|ROUTE|ALTITUDE
	Suggestion   string    `gorm:"type:text" json:"suggestion"`  // JSON
	Resolution   string    `gorm:"type:text" json:"resolution"`
	Operator     string    `gorm:"size:64" json:"operator"`
	Status       string    `gorm:"size:32;default:OPEN" json:"status"` // OPEN|RESOLVED
	CreatedAt    time.Time `json:"created_at"`
}

type FlightPass struct {
	PassID    string    `gorm:"primaryKey;size:64" json:"pass_id"`
	MissionID string    `gorm:"size:64;index" json:"mission_id"`
	UAVID     string    `gorm:"size:64;index" json:"uav_id"`
	Route     string    `gorm:"type:text" json:"route"` // JSON数组
	ValidFrom time.Time `json:"valid_from"`
	ValidTo   time.Time `json:"valid_to"`
	Signature string    `gorm:"type:text" json:"signature"`
	SM3Hash   string    `gorm:"size:64" json:"sm3_hash"`
	Status    string    `gorm:"size:32;default:GENERATING;index" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
