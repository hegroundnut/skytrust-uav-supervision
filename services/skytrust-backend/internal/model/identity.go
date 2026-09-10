package model

import "time"

type Manufacturer struct {
	ManufacturerID string `gorm:"primaryKey;size:64" json:"manufacturer_id"`
	Name           string `gorm:"size:128" json:"name"`
	Status         string `gorm:"size:32;default:ACTIVE" json:"status"`
	AdapterType    string `gorm:"size:64" json:"adapter_type"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Operator struct {
	OperatorID          string `gorm:"primaryKey;size:64" json:"operator_id"`
	Name                string `gorm:"size:128" json:"name"`
	Status              string `gorm:"size:32;default:ACTIVE" json:"status"`
	QualificationStatus string `gorm:"size:32;default:QUALIFIED" json:"qualification_status"`
	ChainOrgID          string `gorm:"size:64" json:"chain_org_id"`
	Contact             string `gorm:"size:128" json:"contact"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type UAV struct {
	UAVID          string `gorm:"primaryKey;size:64" json:"uav_id"`
	ManufacturerID string `gorm:"size:64;index" json:"manufacturer_id"`
	OperatorID     string `gorm:"size:64;index" json:"operator_id"`
	Model          string `gorm:"size:64" json:"model"`
	SerialNo       string `gorm:"size:64;uniqueIndex" json:"serial_no"`
	SM9Identity    string `gorm:"size:128" json:"sm9_identity"`
	Status         string `gorm:"size:32;default:UNREGISTERED" json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
