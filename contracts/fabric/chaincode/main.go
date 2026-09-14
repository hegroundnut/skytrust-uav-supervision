// operator_business 运营方业务链码（Fabric）。方法名与参数键和后端固化常量逐字对应
// （internal/crosschain/policy.go ContractFabricOperator / SourceSubmitMethod；调用点
// internal/crosschain/gateway.go 与 internal/uavbusiness/mission.go；target 路径方法键集
// 转录自 policy.go requiredFields）。状态：部署期校验（docs/real-chain-migration.md §4）。
//
// 参数形态裁定：后端 SubmitTx 的 params 为 map[string]any，链码方法签名统一收
// recordJSON string —— 后端 real 传输实现时将 params map JSON 编码后传参（迁移期
// 传输适配约定，见 contracts/fabric/README.md 与 docs/real-chain-migration.md §5）。
package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// OperatorBusiness 运营方业务链码聚合：单链码承载 operator_business 全部方法
// （后端链码白名单 internal/chainadapter/fabric/adapter.go RegisteredContracts 仅此合约）。
type OperatorBusiness struct {
	contractapi.Contract
}

// CrosschainSubmit 跨链提交存证：13 步协议第 3 步，请求无 source_chain_tx_id 时网关
// 代提交源链交易（gateway.go:214-216；方法名固化于 policy.go:74 SourceSubmitMethod，
// 合约经 sourceContract("fabric") policy.go:97-98 = ContractFabricOperator policy.go:69）。
// params 键：cross_tx_id、message_type、business_id。主键 cross_tx_id，状态键 SUBMIT/<cross_tx_id>。
func (c *OperatorBusiness) CrosschainSubmit(ctx contractapi.TransactionContextInterface, recordJSON string) (string, error) {
	var rec map[string]any
	if err := json.Unmarshal([]byte(recordJSON), &rec); err != nil {
		return "", fmt.Errorf("invalid record json: %w", err)
	}
	id, _ := rec["cross_tx_id"].(string)
	if id == "" {
		return "", fmt.Errorf("cross_tx_id required")
	}
	if err := ctx.GetStub().PutState("SUBMIT/"+id, []byte(recordJSON)); err != nil {
		return "", err
	}
	return id, nil
}

// CrosschainAck 跨链回执确认：13 步协议第 12 步，目标链确认后向源链统一回写回执事实
// （gateway.go:365-368）。params 键：cross_tx_id、reg_record_id、target_chain_tx_id、status。
// 主键 cross_tx_id，状态键 ACK/<cross_tx_id>。
func (c *OperatorBusiness) CrosschainAck(ctx contractapi.TransactionContextInterface, recordJSON string) (string, error) {
	var rec map[string]any
	if err := json.Unmarshal([]byte(recordJSON), &rec); err != nil {
		return "", fmt.Errorf("invalid record json: %w", err)
	}
	id, _ := rec["cross_tx_id"].(string)
	if id == "" {
		return "", fmt.Errorf("cross_tx_id required")
	}
	if err := ctx.GetStub().PutState("ACK/"+id, []byte(recordJSON)); err != nil {
		return "", err
	}
	return id, nil
}

// SubmitApplication 任务申请源链业务交易：运营方写入本源链（mission.go:352-354，
// 合约字面量 "operator_business"）。params 键：application_id、mission_id、sm3_hash。
// 主键 application_id，状态键 APP/<application_id>。
func (c *OperatorBusiness) SubmitApplication(ctx contractapi.TransactionContextInterface, recordJSON string) (string, error) {
	var rec map[string]any
	if err := json.Unmarshal([]byte(recordJSON), &rec); err != nil {
		return "", fmt.Errorf("invalid record json: %w", err)
	}
	id, _ := rec["application_id"].(string)
	if id == "" {
		return "", fmt.Errorf("application_id required")
	}
	if err := ctx.GetStub().PutState("APP/"+id, []byte(recordJSON)); err != nil {
		return "", err
	}
	return id, nil
}

// RecordReview 审查结果回执：targetContractMethod(MsgMissionReviewResult)（policy.go:85；
// 经 gateway.go:330 调用，params = req.Payload 透传）。payload 必备键（policy.go:46
// requiredFields，网关 CheckPayload 已强制非空）：review_id、application_id、mission_id、
// result、reviewer。主键 review_id（审查结果唯一标识），状态键 REVIEW/<review_id>。
func (c *OperatorBusiness) RecordReview(ctx contractapi.TransactionContextInterface, recordJSON string) (string, error) {
	var rec map[string]any
	if err := json.Unmarshal([]byte(recordJSON), &rec); err != nil {
		return "", fmt.Errorf("invalid record json: %w", err)
	}
	id, _ := rec["review_id"].(string)
	if id == "" {
		return "", fmt.Errorf("review_id required")
	}
	if err := ctx.GetStub().PutState("REVIEW/"+id, []byte(recordJSON)); err != nil {
		return "", err
	}
	return id, nil
}

// RecordPass 飞行通行证回执：targetContractMethod(MsgFlightPass)（policy.go:87；经
// gateway.go:330 调用，params = req.Payload 透传）。payload 必备键（policy.go:47）：
// pass_id、mission_id、uav_id、route、valid_from、valid_to、sm3_hash。
// 主键 pass_id（通行证唯一标识），状态键 PASS/<pass_id>。
func (c *OperatorBusiness) RecordPass(ctx contractapi.TransactionContextInterface, recordJSON string) (string, error) {
	var rec map[string]any
	if err := json.Unmarshal([]byte(recordJSON), &rec); err != nil {
		return "", fmt.Errorf("invalid record json: %w", err)
	}
	id, _ := rec["pass_id"].(string)
	if id == "" {
		return "", fmt.Errorf("pass_id required")
	}
	if err := ctx.GetStub().PutState("PASS/"+id, []byte(recordJSON)); err != nil {
		return "", err
	}
	return id, nil
}

// RecordPassRevoke 通行证吊销回执：targetContractMethod(MsgPassRevoke)（policy.go:89；经
// gateway.go:330 调用，params = req.Payload 透传）。payload 必备键（policy.go:48）：
// pass_id、mission_id、reason、operator。主键 pass_id（被吊销通行证；吊销为终态、
// 单证至多吊销一次，无键冲突），状态键 REVOKE/<pass_id>。
func (c *OperatorBusiness) RecordPassRevoke(ctx contractapi.TransactionContextInterface, recordJSON string) (string, error) {
	var rec map[string]any
	if err := json.Unmarshal([]byte(recordJSON), &rec); err != nil {
		return "", fmt.Errorf("invalid record json: %w", err)
	}
	id, _ := rec["pass_id"].(string)
	if id == "" {
		return "", fmt.Errorf("pass_id required")
	}
	if err := ctx.GetStub().PutState("REVOKE/"+id, []byte(recordJSON)); err != nil {
		return "", err
	}
	return id, nil
}

func main() {
	cc, err := contractapi.NewChaincode(&OperatorBusiness{})
	if err != nil {
		panic(err)
	}
	if err := cc.Start(); err != nil {
		panic(err)
	}
}
