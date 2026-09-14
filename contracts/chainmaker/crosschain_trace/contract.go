// Package main 监管链存证合约 crosschain_trace（ChainMaker Docker-Go 形态）。
// 方法与参数键和后端固化常量逐字对应（internal/crosschain/policy.go ContractRegTrace；
// params 键转录自 internal/crosschain/gateway.go 的 RegisterRelay/RegisterReceipt
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
	return sdk.Success([]byte("crosschain_trace init ok"))
}

//export invokeContract
func invokeContract() protogo.Response {
	switch sdk.Instance.GetMethod() {
	case "RegisterRelay":
		return registerRelay()
	case "RegisterReceipt":
		return registerReceipt()
	case "QueryTrace":
		return queryTrace()
	default:
		return sdk.Error("unknown method: " + sdk.Instance.GetMethod())
	}
}

// registerRelay 转发登记（gateway.go 步 9）：同一 cross_tx_id 下按递增序号追加存证。
// 状态键 TRACE/<cross_tx_id>/<seq>。
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
	key := "TRACE/" + id + "/" + seq
	if err := sdk.Instance.PutStateFromKeyByte([]byte(key), payload); err != nil {
		return sdk.Error(err.Error())
	}
	return sdk.Success([]byte(key))
}

// registerReceipt 回执登记（gateway.go 步 11）：目标链确认后追加回程存证。
// 状态键 TRACE/<cross_tx_id>/<seq>。
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
	key := "TRACE/" + id + "/" + seq
	if err := sdk.Instance.PutStateFromKeyByte([]byte(key), payload); err != nil {
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
	v, err := sdk.Instance.GetStateFromKeyByte([]byte("TRACE/" + id + "/" + seq))
	if err != nil || v == nil {
		return sdk.Error("trace not found: " + id + "/" + seq)
	}
	return sdk.Success(v)
}

// nextSeq 为同一 cross_tx_id 分配递增序号（计数器键 TRACE/<cross_tx_id>/SEQ）。
func nextSeq(crossTxID string) (string, error) {
	counterKey := []byte("TRACE/" + crossTxID + "/SEQ")
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
