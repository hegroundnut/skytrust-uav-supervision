package model

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"
)

func randHex(n int) string {
	b := make([]byte, n/2)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func GenTraceID() string       { return "TRACE-" + time.Now().Format("20060102") + "-" + randHex(6) }
func GenCrossTxID() string     { return "CX-" + randHex(12) }
func GenApplicationID() string { return "APP-" + time.Now().Format("20060102") + "-" + randHex(6) }
func GenReviewID() string      { return "REV-" + randHex(12) }
func GenConflictID() string    { return "CFL-" + randHex(12) }
func GenSessionID() string     { return "SESS-" + randHex(12) }
func GenMessageID() string     { return "MSG-" + randHex(16) }
func GenEventID() string       { return "WH-" + randHex(12) }
func GenMappingID() string     { return "IDM-" + randHex(12) }
func GenAuditID() string       { return "AUD-" + randHex(12) }
func GenExperimentID() string  { return "EXP-" + time.Now().Format("20060102") + "-" + randHex(6) }
func GenRunID() string         { return "RUN-" + randHex(12) }
func GenRegRecordID() string   { return "REGREC-" + randHex(12) }
func GenAlertID() string       { return "ALERT-" + time.Now().Format("20060102") + "-" + randHex(6) }
func GenAuthID() string        { return "AUTH-" + time.Now().Format("20060102") + "-" + randHex(6) }

func IdempotencyKey(msgType, businessID, sourceTxID string) string {
	h := sha256.Sum256([]byte(msgType + "|" + businessID + "|" + sourceTxID))
	return hex.EncodeToString(h[:])
}

// ValidateID 校验 "<PREFIX>-<剩余非空且不含空格>" 格式。
func ValidateID(prefix, id string) bool {
	if !strings.HasPrefix(id, prefix+"-") {
		return false
	}
	rest := strings.TrimPrefix(id, prefix+"-")
	return rest != "" && !strings.Contains(rest, " ")
}
