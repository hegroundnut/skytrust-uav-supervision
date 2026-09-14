// Package main 监管链存证合约 identity_mapping（ChainMaker Docker-Go 形态）。
// 方法与参数键和后端固化常量逐字对应（internal/crosschain/policy.go ContractRegIdentity；
// 方法名 RegisterIndex 来自 policy.go targetContractMethod(MsgUAVRegisterProof)，经
// gateway.go 步 10 target.SubmitTx 调用，params = 请求 payload，必备键集转录自
// policy.go requiredFields[MsgUAVRegisterProof]）。
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
	return sdk.Success([]byte("identity_mapping init ok"))
}

//export invokeContract
func invokeContract() protogo.Response {
	switch sdk.Instance.GetMethod() {
	case "RegisterIndex":
		return registerIndex()
	case "QueryIdentity":
		return queryIdentity()
	default:
		return sdk.Error("unknown method: " + sdk.Instance.GetMethod())
	}
}

// registerIndex 身份索引登记：以 sm9_identity 为主键存证无人机实名索引。
// 状态键 ID/<sm9_identity>。
func registerIndex() protogo.Response {
	args := sdk.Instance.GetArgs() // 键集 = MsgUAVRegisterProof payload 必备键（policy.go requiredFields）逐字转录
	id := string(args["sm9_identity"])
	if id == "" {
		return sdk.Error("sm9_identity required")
	}
	payload := buildRecordJSON(args, []string{
		"uav_id", "manufacturer_id", "operator_id", "serial_no", "sm9_identity",
	})
	if err := sdk.Instance.PutStateFromKeyByte([]byte("ID/"+id), payload); err != nil {
		return sdk.Error(err.Error())
	}
	return sdk.Success([]byte(id))
}

// queryIdentity 按 sm9_identity 读回身份索引。
// 预留（Go 侧暂无调用点）：参数键依据 model.IdentityMapping（SM9Identity，json 键 sm9_identity）设计。
func queryIdentity() protogo.Response {
	args := sdk.Instance.GetArgs()
	id := string(args["sm9_identity"])
	if id == "" {
		return sdk.Error("sm9_identity required")
	}
	v, err := sdk.Instance.GetStateFromKeyByte([]byte("ID/" + id))
	if err != nil || v == nil {
		return sdk.Error("identity not found: " + id)
	}
	return sdk.Success(v)
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
