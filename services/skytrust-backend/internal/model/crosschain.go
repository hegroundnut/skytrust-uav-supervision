package model

import "skytrust-backend/internal/timex"

type CrosschainTx struct {
	CrossTxID        string     `gorm:"primaryKey;size:64" json:"cross_tx_id"`
	SourceChain      string     `gorm:"size:32" json:"source_chain"`
	FinalTargetChain string     `gorm:"size:32" json:"final_target_chain"`
	MessageType      string     `gorm:"size:48;index" json:"message_type"`
	BusinessID       string     `gorm:"size:64;index" json:"business_id"`
	SourceChainTxID  string     `gorm:"size:128" json:"source_chain_tx_id"`
	RegReceiveTxID   string     `gorm:"size:128" json:"reg_receive_tx_id"`
	RegRelayTxID     string     `gorm:"size:128" json:"reg_relay_tx_id"`
	TargetChainTxID  string     `gorm:"size:128" json:"target_chain_tx_id"`
	RegRecordID      string     `gorm:"size:64;index" json:"reg_record_id"`
	SM3Hash          string     `gorm:"size:64" json:"sm3_hash"`
	SM9Identity      string     `gorm:"size:128" json:"sm9_identity"`
	Signature        string     `gorm:"type:text" json:"signature"`
	VerifyResult     string     `gorm:"size:32" json:"verify_result"` // PASS|FAIL_SM3|FAIL_SM9
	PolicyResult     string     `gorm:"size:32" json:"policy_result"`
	Status           string     `gorm:"size:32;default:PENDING;index" json:"status"`
	ErrorCode        int        `json:"error_code"`
	LatencyMs        int64      `json:"latency_ms"`
	IdempotencyKey   string     `gorm:"size:128;uniqueIndex" json:"idempotency_key"`
	RetryOf          string     `gorm:"size:64;index" json:"retry_of"` // P5-R8：#rN 重试行指向被重试的 cross_tx_id
	CreatedAt        timex.Time `json:"created_at"`
	UpdatedAt        timex.Time `json:"updated_at"`
}
