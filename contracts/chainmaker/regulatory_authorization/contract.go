// Package main 监管链存证合约 regulatory_authorization（ChainMaker Docker-Go 形态）。
// 方法与参数键和后端固化常量逐字对应（internal/regulatory/service.go ContractRegAuth /
// MethodRecordAuth；params 键转录自 internal/regulatory/authorization.go 的
// RecordAuthorization SubmitTx 调用点）。
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
	return sdk.Success([]byte("regulatory_authorization init ok"))
}

//export invokeContract
func invokeContract() protogo.Response {
	switch sdk.Instance.GetMethod() {
	case "RecordAuthorization":
		return recordAuthorization()
	case "QueryAuthorization":
		return queryAuthorization()
	default:
		return sdk.Error("unknown method: " + sdk.Instance.GetMethod())
	}
}

// recordAuthorization 授权批准存证（authorization.go ReviewAuthorization APPROVE 分支）：
// 以 authorization_id 为主键存证监管授权。状态键 AUTH/<authorization_id>。
func recordAuthorization() protogo.Response {
	args := sdk.Instance.GetArgs() // 键集 = authorization.go RecordAuthorization params 逐字转录
	id := string(args["authorization_id"])
	if id == "" {
		return sdk.Error("authorization_id required")
	}
	payload := buildRecordJSON(args, []string{
		"authorization_id", "regulator_id", "scope",
		"target_type", "target_id", "reason",
		"valid_from", "valid_to", "audit_hash",
	})
	if err := sdk.Instance.PutStateFromKeyByte([]byte("AUTH/"+id), payload); err != nil {
		return sdk.Error(err.Error())
	}
	return sdk.Success([]byte(id))
}

// queryAuthorization 按 authorization_id 读回授权存证。
// 预留（Go 侧暂无调用点）：参数键依据 model.RegulatoryAuth（AuthorizationID，json 键
// authorization_id）设计。
func queryAuthorization() protogo.Response {
	args := sdk.Instance.GetArgs()
	id := string(args["authorization_id"])
	if id == "" {
		return sdk.Error("authorization_id required")
	}
	v, err := sdk.Instance.GetStateFromKeyByte([]byte("AUTH/" + id))
	if err != nil || v == nil {
		return sdk.Error("authorization not found: " + id)
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
