// Package main 监管链存证合约 regulatory_authorization（ChainMaker Docker-Go 形态）。
// 方法与参数键和后端固化常量逐字对应（internal/regulatory/service.go ContractRegAuth /
// MethodRecordAuth；params 键转录自 internal/regulatory/authorization.go 的
// RecordAuthorization SubmitTx 调用点）。
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

type RegulatoryAuthorizationContract struct{}

// InitContract 合约部署时由 sandbox 回调。
func (c *RegulatoryAuthorizationContract) InitContract() protogo.Response {
	return sdk.Success([]byte("regulatory_authorization init ok"))
}

// UpgradeContract 合约升级时由 sandbox 回调。
func (c *RegulatoryAuthorizationContract) UpgradeContract() protogo.Response {
	return sdk.Success([]byte("regulatory_authorization upgrade ok"))
}

// InvokeContract 交易方法分发（方法名与后端固化常量逐字一致）。
func (c *RegulatoryAuthorizationContract) InvokeContract(method string) protogo.Response {
	switch method {
	case "RecordAuthorization":
		return recordAuthorization()
	case "QueryAuthorization":
		return queryAuthorization()
	case "QueryState":
		return queryState()
	default:
		return sdk.Error("unknown method: " + method)
	}
}

func main() {
	if err := sandbox.Start(new(RegulatoryAuthorizationContract)); err != nil {
		log.Fatal(err)
	}
}

// recordAuthorization 授权批准存证（authorization.go ReviewAuthorization APPROVE 分支）：
// 以 authorization_id 为主键存证监管授权。状态键 AUTH_<authorization_id>。
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
	if err := sdk.Instance.PutStateFromKeyByte(stateKey("AUTH", id), payload); err != nil {
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
	v, err := sdk.Instance.GetStateFromKeyByte(stateKey("AUTH", id))
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
