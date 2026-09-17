// Package main 监管链存证合约 crosschain_trace（ChainMaker Docker-Go 形态）。
// 方法与参数键和后端固化常量逐字对应（internal/crosschain/policy.go ContractRegTrace；
// params 键转录自 internal/crosschain/gateway.go 的 RegisterRelay/RegisterReceipt
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

type CrosschainTraceContract struct{}

// InitContract 合约部署时由 sandbox 回调。
func (c *CrosschainTraceContract) InitContract() protogo.Response {
	return sdk.Success([]byte("crosschain_trace init ok"))
}

// UpgradeContract 合约升级时由 sandbox 回调。
func (c *CrosschainTraceContract) UpgradeContract() protogo.Response {
	return sdk.Success([]byte("crosschain_trace upgrade ok"))
}

// InvokeContract 交易方法分发（方法名与后端固化常量逐字一致）。
func (c *CrosschainTraceContract) InvokeContract(method string) protogo.Response {
	switch method {
	case "RegisterRelay":
		return registerRelay()
	case "RegisterReceipt":
		return registerReceipt()
	case "QueryTrace":
		return queryTrace()
	case "QueryState":
		return queryState()
	default:
		return sdk.Error("unknown method: " + method)
	}
}

func main() {
	if err := sandbox.Start(new(CrosschainTraceContract)); err != nil {
		log.Fatal(err)
	}
}

// registerRelay 转发登记（gateway.go 步 9）：同一 cross_tx_id 下按递增序号追加存证。
// 状态键 TRACE_<cross_tx_id>_<seq>。
func registerRelay() protogo.Response {
	args := sdk.Instance.GetArgs() // 键集 = gateway.go RegisterRelay params 逐字转录
	id := string(args["cross_tx_id"])
	if id == "" {
		return sdk.Error("cross_tx_id required")
	}
	seq, err := nextSeq(id)
	if err != nil {
		return sdk.Error(err.Error())
	}
	payload := buildRecordJSON(args, []string{
		"cross_tx_id", "reg_record_id", "final_target_chain", "business_id",
	})
	key := stateKey("TRACE", id, seq)
	if err := sdk.Instance.PutStateFromKeyByte(key, payload); err != nil {
		return sdk.Error(err.Error())
	}
	return sdk.Success([]byte(key))
}

// registerReceipt 回执登记（gateway.go 步 11）：目标链确认后追加回程存证。
// 状态键 TRACE_<cross_tx_id>_<seq>。
func registerReceipt() protogo.Response {
	args := sdk.Instance.GetArgs() // 键集 = gateway.go RegisterReceipt params 逐字转录
	id := string(args["cross_tx_id"])
	if id == "" {
		return sdk.Error("cross_tx_id required")
	}
	seq, err := nextSeq(id)
	if err != nil {
		return sdk.Error(err.Error())
	}
	payload := buildRecordJSON(args, []string{
		"cross_tx_id", "reg_record_id", "target_chain", "target_chain_tx_id",
	})
	key := stateKey("TRACE", id, seq)
	if err := sdk.Instance.PutStateFromKeyByte(key, payload); err != nil {
		return sdk.Error(err.Error())
	}
	return sdk.Success([]byte(key))
}

// queryTrace 按 cross_tx_id + seq 读回单条存证。
// 预留（Go 侧暂无调用点）：参数键依据 model.CrosschainTx（cross_tx_id）与存证键布局（seq）设计。
func queryTrace() protogo.Response {
	args := sdk.Instance.GetArgs()
	id := string(args["cross_tx_id"])
	if id == "" {
		return sdk.Error("cross_tx_id required")
	}
	seq := string(args["seq"])
	if seq == "" {
		return sdk.Error("seq required")
	}
	v, err := sdk.Instance.GetStateFromKeyByte(stateKey("TRACE", id, seq))
	if err != nil || v == nil {
		return sdk.Error("trace not found: " + id + "/" + seq)
	}
	return sdk.Success(v)
}

// nextSeq 为同一 cross_tx_id 分配递增序号（计数器键 TRACE_<cross_tx_id>_SEQ）。
func nextSeq(crossTxID string) (string, error) {
	counterKey := stateKey("TRACE", crossTxID, "SEQ")
	n := 0
	if v, err := sdk.Instance.GetStateFromKeyByte(counterKey); err == nil && len(v) > 0 {
		parsed, perr := strconv.Atoi(string(v))
		if perr != nil {
			return "", perr
		}
		n = parsed
	}
	n++
	if err := sdk.Instance.PutStateFromKeyByte(counterKey, []byte(strconv.Itoa(n))); err != nil {
		return "", err
	}
	return strconv.Itoa(n), nil
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
