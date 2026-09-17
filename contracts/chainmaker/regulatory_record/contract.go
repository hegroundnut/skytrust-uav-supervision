// Package main 监管链存证合约 regulatory_record（ChainMaker Docker-Go 形态）。
// 方法与参数键和后端固化常量逐字对应（internal/crosschain/policy.go ContractRegRecord；
// params 键转录自 internal/crosschain/gateway.go 的 RegisterReceive/VerifyCredential
// SubmitTx 调用点）。
// 状态：部署期校验（hermetic 构建不编译本文件——见 contracts/README.md 与
// docs/real-chain-migration.md §4）。
package main

import (
	"bytes"
	"log"
	"strconv"
	"strings"

	"chainmaker.org/chainmaker/contract-sdk-go/v2/pb/protogo"
	"chainmaker.org/chainmaker/contract-sdk-go/v2/sandbox"
	"chainmaker.org/chainmaker/contract-sdk-go/v2/sdk"
)

type RegulatoryRecordContract struct{}

// InitContract 合约部署时由 sandbox 回调。
func (c *RegulatoryRecordContract) InitContract() protogo.Response {
	return sdk.Success([]byte("regulatory_record init ok"))
}

// UpgradeContract 合约升级时由 sandbox 回调。
func (c *RegulatoryRecordContract) UpgradeContract() protogo.Response {
	return sdk.Success([]byte("regulatory_record upgrade ok"))
}

// InvokeContract 交易方法分发（方法名与后端固化常量逐字一致）。
func (c *RegulatoryRecordContract) InvokeContract(method string) protogo.Response {
	switch method {
	case "RegisterReceive":
		return registerReceive()
	case "VerifyCredential":
		return verifyCredential()
	case "QueryState":
		return queryState()
	default:
		return sdk.Error("unknown method: " + method)
	}
}

func main() {
	if err := sandbox.Start(new(RegulatoryRecordContract)); err != nil {
		log.Fatal(err)
	}
}

// registerReceive 接收登记（gateway.go 步 7）：以 cross_tx_id 为主键存证跨链消息接收事实。
// 状态键 REG_<cross_tx_id>。
func registerReceive() protogo.Response {
	args := sdk.Instance.GetArgs() // 键集 = gateway.go RegisterReceive params 逐字转录
	id := string(args["cross_tx_id"])
	if id == "" {
		return sdk.Error("cross_tx_id required")
	}
	payload := buildRecordJSON(args, []string{
		"cross_tx_id", "message_type", "business_id",
		"source_chain", "source_chain_tx_id", "sm3_hash",
	})
	if err := sdk.Instance.PutStateFromKeyByte(stateKey("REG", id), payload); err != nil {
		return sdk.Error(err.Error())
	}
	return sdk.Success([]byte(id))
}

// verifyCredential 监管凭证登记（gateway.go 步 8）：以 reg_record_id 为主键存证
// 校验结论与策略结论。状态键 REG_<reg_record_id>。
func verifyCredential() protogo.Response {
	args := sdk.Instance.GetArgs() // 键集 = gateway.go VerifyCredential params 逐字转录
	id := string(args["reg_record_id"])
	if id == "" {
		return sdk.Error("reg_record_id required")
	}
	payload := buildRecordJSON(args, []string{
		"reg_record_id", "cross_tx_id", "verify_result",
		"policy_result", "sm9_identity", "sm3_hash",
	})
	if err := sdk.Instance.PutStateFromKeyByte(stateKey("REG", id), payload); err != nil {
		return sdk.Error(err.Error())
	}
	return sdk.Success([]byte(id))
}

// buildRecordJSON 按固定键序组装存证 JSON（键 = 后端调用点参数键，稳定序，值做字符串转义）。
func buildRecordJSON(args map[string][]byte, keys []string) []byte {
	var buf bytes.Buffer
	buf.WriteByte('{')
	for i, k := range keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		buf.WriteString(strconv.Quote(k))
		buf.WriteByte(':')
		buf.WriteString(strconv.Quote(string(args[k])))
	}
	buf.WriteByte('}')
	return buf.Bytes()
}

// stateKey 生成 ChainMaker 合规状态键：chainmaker-go v2.3.x 底链限制合约状态键仅允许
// 数字、点、字母、下划线（违规报 "key can only consist of numbers, dot, letters and
// underscores"）。各段以 _ 连接，段内非法字符（如后端 ID CX-<hex> 的 -）逐一替换为 _。
// 仅键形态适配；方法名、参数键与存证值（含原始 ID）保持不变。
func stateKey(parts ...string) string {
	var b strings.Builder
	for i, p := range parts {
		if i > 0 {
			b.WriteByte('_')
		}
		for _, r := range p {
			if (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || r == '_' || r == '.' {
				b.WriteRune(r)
			} else {
				b.WriteByte('_')
			}
		}
	}
	return b.String()
}

// queryState 通用状态键读取（部署期补充的读方法，docs/real-chain-migration.md §5-②，
// 与 Fabric 链码 QueryState 同例）：真实传输 QueryState 经
// QueryContract("QueryState", {"state_key": key}) 调用。入参单段键按与写路径一致的
// stateKey 规则消毒（如 "REG/CX-x" → "REG_CX_x"，与写入侧 stateKey("REG", "CX-x")
// 逐字节一致）后 GetStateFromKeyByte 直读；无值返回 error。
// 预留（后端当前无活跃 QueryState 调用点）。
func queryState() protogo.Response {
	args := sdk.Instance.GetArgs()
	key := stateKey(string(args["state_key"]))
	if key == "" {
		return sdk.Error("state_key required")
	}
	v, err := sdk.Instance.GetStateFromKeyByte(key)
	if err != nil || v == nil {
		return sdk.Error("state not found: " + key)
	}
	return sdk.Success(v)
}
