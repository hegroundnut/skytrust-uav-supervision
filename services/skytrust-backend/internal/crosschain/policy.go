package crosschain

import "skytrust-backend/internal/errcode"

// routeSpec 每种消息类型的固定路由：源链 →（监管链 chainmaker）→ 最终目标链。
// 路由表是强制原则 2 的代码化：业务链之间不存在声明之外的路径。
type routeSpec struct {
	Source string
	Target string
}

var routingTable = map[string]routeSpec{
	MsgUAVRegisterProof:    {Source: "fabric", Target: RegChainName}, // 运营→监管
	MsgMissionApplication:  {Source: "fabric", Target: "fisco-bcos"}, // 运营→监管→管理
	MsgMissionReviewResult: {Source: "fisco-bcos", Target: "fabric"}, // 管理→监管→运营
	MsgFlightPass:          {Source: "fisco-bcos", Target: "fabric"}, // 管理→监管→运营
	MsgPassRevoke:          {Source: "fisco-bcos", Target: "fabric"}, // 管理→监管→运营
}

// ExpectedRoute 返回消息类型的固定路由；ok=false 表示未知类型。
func ExpectedRoute(msgType string) (source, target string, ok bool) {
	r, found := routingTable[msgType]
	if !found {
		return "", "", false
	}
	return r.Source, r.Target, true
}

// CheckRoute 校验声明的源/目标链与固定路由一致（spec §6.1 第 2 步）。
func CheckRoute(msgType, source, target string) *Error {
	if !IsValidMessageType(msgType) {
		return NewError(errcode.Param, "unknown message_type %q", msgType)
	}
	wantS, wantT, _ := ExpectedRoute(msgType)
	if source != wantS || target != wantT {
		return NewError(errcode.RegVerify, "route mismatch for %s: declared %s->%s, required %s->%s",
			msgType, source, target, wantS, wantT)
	}
	return nil
}

// requiredFields 每种消息类型的必备 payload 字段（spec §6.1 第 2 步：字段完整性）。
var requiredFields = map[string][]string{
	MsgUAVRegisterProof:    {"uav_id", "manufacturer_id", "operator_id", "serial_no", "sm9_identity"},
	MsgMissionApplication:  {"mission_id", "application_id", "operator_id", "uav_id", "mission_type", "start_time", "end_time", "route_segments", "sm3_hash"},
	MsgMissionReviewResult: {"review_id", "application_id", "mission_id", "result", "reviewer"},
	MsgFlightPass:          {"pass_id", "mission_id", "uav_id", "route", "valid_from", "valid_to", "sm3_hash"},
	MsgPassRevoke:          {"pass_id", "mission_id", "reason", "operator"},
}

// CheckPayload 校验 payload 字段完整性：缺失/nil/空串 → 6002，文案含字段名。
func CheckPayload(msgType string, payload map[string]any) *Error {
	fields, ok := requiredFields[msgType]
	if !ok {
		return NewError(errcode.Param, "unknown message_type %q", msgType)
	}
	for _, f := range fields {
		v, exists := payload[f]
		if !exists || v == nil || v == "" {
			return NewError(errcode.Param, "payload missing required field %q for %s", f, msgType)
		}
	}
	return nil
}

// 链上合约/方法命名（与实施文档 §6 合约设计对齐；sim 适配器仅将其作为 TxID 派生素材，
// Plan 6 真实 SDK 按同名合约调用）。
const (
	ContractFabricOperator = "operator_business" // Fabric 运营方链码聚合名
	ContractFiscoManage    = "uav_management"    // FISCO 管理方合约聚合名
	ContractRegRecord      = "regulatory_record" // ChainMaker 监管登记合约
	ContractRegTrace       = "crosschain_trace"  // ChainMaker 跨链存证合约
	ContractRegIdentity    = "identity_mapping"  // ChainMaker 身份索引合约
	SourceSubmitMethod     = "CrosschainSubmit"  // 网关代提交源链交易的方法名
)

// targetContractMethod 消息类型 → 目标链合约与方法（13 步第 10 步）。
func targetContractMethod(msgType string) (contract, method string) {
	switch msgType {
	case MsgUAVRegisterProof:
		return ContractRegIdentity, "RegisterIndex"
	case MsgMissionApplication:
		return ContractFiscoManage, "SubmitApplication"
	case MsgMissionReviewResult:
		return ContractFabricOperator, "RecordReview"
	case MsgFlightPass:
		return ContractFabricOperator, "RecordPass"
	case MsgPassRevoke:
		return ContractFabricOperator, "RecordPassRevoke"
	}
	return "", ""
}

// sourceContract 源链 → 合约名（13 步第 3/12 步：代提交与 ACK）。
func sourceContract(chainName string) string {
	switch chainName {
	case "fabric":
		return ContractFabricOperator
	case "fisco-bcos":
		return ContractFiscoManage
	default:
		return ContractRegRecord
	}
}
