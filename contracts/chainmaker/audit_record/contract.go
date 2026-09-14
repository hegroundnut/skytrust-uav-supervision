// Package main 监管链存证合约 audit_record（ChainMaker Docker-Go 形态）。
// 方法与参数键和后端固化常量逐字对应（internal/regulatory/service.go ContractAuditRec /
// MethodRecordInsp；params 键转录自 internal/regulatory/inspection.go 的
// RecordInspection SubmitTx 调用点）。
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
	return sdk.Success([]byte("audit_record init ok"))
}

//export invokeContract
func invokeContract() protogo.Response {
	switch sdk.Instance.GetMethod() {
	case "RecordInspection":
		return recordInspection()
	case "QueryAudit":
		return queryAudit()
	default:
		return sdk.Error("unknown method: " + sdk.Instance.GetMethod())
	}
}

// recordInspection 巡检结论存证（inspection.go P4-6）：以巡检对象 mission_id 为组，
// 按递增序号追加存证。状态键 AUDIT/<mission_id>/<seq>。
func recordInspection() protogo.Response {
	args := sdk.Instance.GetArgs() // 键集 = inspection.go RecordInspection params 逐字转录
	id := string(args["mission_id"])
	if id == "" {
		return sdk.Error("mission_id required")
	}
	seq, err := nextSeq(id)
	if err != nil {
		return sdk.Error(err.Error())
	}
	payload := buildRecordJSON(args, []string{
		"authorization_id", "regulator_id", "mission_id",
		"route_verdict", "payload_verdict", "digest_match",
		"signature_valid", "audit_hash", "inspected_at",
	})
	key := "AUDIT/" + id + "/" + seq
	if err := sdk.Instance.PutStateFromKeyByte([]byte(key), payload); err != nil {
		return sdk.Error(err.Error())
	}
	return sdk.Success([]byte(key))
}

// queryAudit 按 mission_id + seq 读回单条巡检存证。
// 预留（Go 侧暂无调用点）：参数键依据 RecordInspection 的存证主体 mission_id
// （对应 model.RegulatoryAudit.Target 语义）与存证键布局（seq）设计。
func queryAudit() protogo.Response {
	args := sdk.Instance.GetArgs()
	id := string(args["mission_id"])
	if id == "" {
		return sdk.Error("mission_id required")
	}
	seq := string(args["seq"])
	if seq == "" {
		return sdk.Error("seq required")
	}
	v, err := sdk.Instance.GetStateFromKeyByte([]byte("AUDIT/" + id + "/" + seq))
	if err != nil || v == nil {
		return sdk.Error("audit not found: " + id + "/" + seq)
	}
	return sdk.Success(v)
}

// nextSeq 为同一 mission_id 分配递增序号（计数器键 AUDIT/<mission_id>/SEQ）。
func nextSeq(missionID string) (string, error) {
	counterKey := []byte("AUDIT/" + missionID + "/SEQ")
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
