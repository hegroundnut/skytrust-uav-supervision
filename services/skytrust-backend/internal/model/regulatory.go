package model

import "time"

type SecurityEvent struct {
	AlertID      string `gorm:"primaryKey;size:64" json:"alert_id"`
	MissionID    string `gorm:"size:64;index" json:"mission_id"`
	UAVPseudonym string `gorm:"size:64;index" json:"uav_pseudonym"`
	EventType    string `gorm:"size:48;index" json:"event_type"`
	RiskLevel    string `gorm:"size:16" json:"risk_level"` // LOW|MEDIUM|HIGH
	EvidenceHash string `gorm:"size:64" json:"evidence_hash"`
	SourceSystem string `gorm:"size:32" json:"source_system"` // SYSTEM1|SYSTEM2|SYSTEM3|MANUAL
	Status       string `gorm:"size:32;default:OPEN;index" json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type IdentityMapping struct {
	MappingID      string `gorm:"primaryKey;size:64" json:"mapping_id"`
	Pseudo         string `gorm:"size:64;uniqueIndex" json:"pseudo"`
	DeviceAddress  string `gorm:"size:128;index" json:"device_address"`
	PassID         string `gorm:"size:64" json:"pass_id"`
	SM9Identity    string `gorm:"size:128" json:"sm9_identity"`
	UAVID          string `gorm:"size:64" json:"uav_id"`
	OperatorID     string `gorm:"size:64" json:"operator_id"`
	ManufacturerID string `gorm:"size:64" json:"manufacturer_id"`
	SourceChain    string `gorm:"size:32" json:"source_chain"`
	CreatedAt      time.Time `json:"created_at"`
}

type RegulatoryAuth struct {
	AuthorizationID string `gorm:"primaryKey;size:64" json:"authorization_id"`
	RegulatorID     string `gorm:"size:64;index" json:"regulator_id"`
	Scope           string `gorm:"size:128" json:"scope"` // JSON数组: ["MISSION","ROUTE"]
	TargetType      string `gorm:"size:32" json:"target_type"` // MISSION|UAV|ALERT
	TargetID        string `gorm:"size:64;index" json:"target_id"`
	Reason          string `gorm:"type:text" json:"reason"`
	ValidFrom       time.Time `json:"valid_from"`
	ValidTo         time.Time `json:"valid_to"`
	Status          string `gorm:"size:32;default:PENDING" json:"status"` // PENDING|AUTHORIZED|DENIED|EXPIRED
	AuditHash       string `gorm:"size:64" json:"audit_hash"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type RegulatoryAudit struct {
	AuditID         string `gorm:"primaryKey;size:64" json:"audit_id"`
	AlertID         string `gorm:"size:64;index" json:"alert_id"`
	AuthorizationID string `gorm:"size:64;index" json:"authorization_id"`
	Action          string `gorm:"size:48" json:"action"`
	OperatorID      string `gorm:"size:64" json:"operator_id"`
	Target          string `gorm:"size:128" json:"target"`
	Result          string `gorm:"type:text" json:"result"` // JSON
	AuditHash       string `gorm:"size:64" json:"audit_hash"`
	ChainTxID       string `gorm:"size:128" json:"chain_tx_id"`
	CreatedAt       time.Time `json:"created_at"`
}
