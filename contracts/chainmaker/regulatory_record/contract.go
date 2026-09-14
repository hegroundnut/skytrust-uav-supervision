// Package main 监管链存证合约 regulatory_record（ChainMaker Docker-Go 形态）。
// 方法与参数键和后端固化常量逐字对应（internal/crosschain/policy.go ContractRegRecord；
// params 键转录自 internal/crosschain/gateway.go 的 RegisterReceive/VerifyCredential
// SubmitTx 调用点）。
// 状态：部署期校验（hermetic 构建不编译本文件——见 contracts/README.md 与
// docs/real-chain-migration.md §4）。
package main

import (
	"bytes"
	"strconv"

	"chainmaker.org/chainmaker/contract-sdk-go/v2/pb/protogo"
	"chainmaker.org/chainmaker/contract-sdk-go/v2/sdk"
)

func main() {}

//export initContract
func initContract() protogo.Response {
	return sdk.Success([]byte("regulatory_record init ok"))
}

//export invokeContract
func invokeContract() protogo.Response {
	switch sdk.Instance.GetMethod() {
	case "RegisterReceive":
		return registerReceive()
	case "VerifyCredential":
		return verifyCredential()
	default:
		return sdk.Error("unknown method: " + sdk.Instance.GetMethod())
	}
}

// registerReceive 接收登记（gateway.go 步 7）：以 cross_tx_id 为主键存证跨链消息接收事实。
// 状态键 REG/<cross_tx_id>。
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
	if err := sdk.Instance.PutStateFromKeyByte([]byte("REG/"+id), payload); err != nil {
		return sdk.Error(err.Error())
	}
	return sdk.Success([]byte(id))
}

// verifyCredential 监管凭证登记（gateway.go 步 8）：以 reg_record_id 为主键存证
// 校验结论与策略结论。状态键 REG/<reg_record_id>。
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
	if err := sdk.Instance.PutStateFromKeyByte([]byte("REG/"+id), payload); err != nil {
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
