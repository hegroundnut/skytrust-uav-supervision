// Package regulatory 系统三：监管链身份追踪 + 密文监管 + 授权审计。
// 域隔离（P4-4）：允许 model/timex/errcode/crypto/audit/statemachine/crosschain（仅 Gateway.Chain）
// 与 demo（inspection.go 仅取轨迹变量）；禁止 import internal/offchain 与 internal/uavbusiness。
// 密文三分离（spec §5）：ciphertext 落库不出库；masked_value 脱敏展示；decrypted_view 仅授权响应临时生成。
package regulatory

import (
	"gorm.io/gorm"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
)

type Service struct {
	db    *gorm.DB
	cs    *crypto.Service
	gw    *crosschain.Gateway
	audit *audit.Service
}

func New(db *gorm.DB, cs *crypto.Service, gw *crosschain.Gateway, auditSvc *audit.Service) *Service {
	return &Service{db: db, cs: cs, gw: gw, audit: auditSvc}
}

// logAudit 业务审计统一留痕；审计失败不阻断业务（与 uavbusiness/网关约定一致）。
func (s *Service) logAudit(traceID, actor, action, targetType, targetID string, detail any) {
	if s.audit == nil {
		return
	}
	_ = s.audit.Log(actor, action, targetType, targetID, traceID, detail)
}

// 告警事件类型（spec §9.4，6 类封闭枚举，P4-1）
const (
	AlertRouteDeviation  = "ROUTE_DEVIATION"
	AlertInvalidPass     = "INVALID_PASS"
	AlertUnknownNode     = "UNKNOWN_NODE_ACCESS"
	AlertMissionMismatch = "MISSION_MISMATCH"
	AlertWormhole        = "WORMHOLE_ALERT"
	AlertIdentityAnomaly = "IDENTITY_ANOMALY"
)

var alertEventTypes = map[string]bool{
	AlertRouteDeviation: true, AlertInvalidPass: true, AlertUnknownNode: true,
	AlertMissionMismatch: true, AlertWormhole: true, AlertIdentityAnomaly: true,
}

var riskLevels = map[string]bool{"LOW": true, "MEDIUM": true, "HIGH": true}

var sourceSystems = map[string]bool{"SYSTEM1": true, "SYSTEM2": true, "SYSTEM3": true, "MANUAL": true}

// 授权 scope（spec §9.2，封闭枚举）
var authScopes = map[string]bool{"MISSION": true, "ROUTE": true, "PAYLOAD": true, "IDENTITY": true, "EVIDENCE": true}

// 授权目标类型（spec §9.2）
var authTargetTypes = map[string]bool{"MISSION": true, "UAV": true, "ALERT": true}

// 监管链登记合约与方法（spec §6.1；经 Gateway.Chain("chainmaker") 直连提交）
const (
	ContractRegAuth  = "regulatory_authorization"
	ContractAuditRec = "audit_record"
	MethodRecordAuth = "RecordAuthorization"
	MethodRecordInsp = "RecordInspection"
)

// 追踪级别名（spec §9.1，7 级固定顺序）与来源链标注（P4-3）
var TraceLevelNames = [7]string{
	"PSEUDO", "DEVICE_ADDRESS", "PASS_ID", "SM9_IDENTITY", "UAV_ID", "OPERATOR_ID", "MANUFACTURER_ID",
}

const (
	SourceChainmakerIndex = "CHAINMAKER_INDEX"
	SourceFabricDetail    = "FABRIC_DETAIL"
	SourceFiscoDetail     = "FISCO_BCOS_DETAIL"
)
