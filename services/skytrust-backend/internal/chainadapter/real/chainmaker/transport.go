//go:build realchains

// Package realchainmaker 提供 ChainMaker 监管链真实 SDK 传输（docs/real-chain-migration.md §5-②）。
// SDK：chainmaker.org/chainmaker/sdk-go/v2 v2.4.0（与 platforms/gchain-back/go.mod 锁定线一致）。
// 指南 §5-② 注记的 CreateTxRequest 在本 SDK 版本中的实际 API 名为 GetTxRequest（部署期核对，
// 语义一致：构造 *common.TxRequest 后经 SendTxRequest 提交）。
package realchainmaker

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"chainmaker.org/chainmaker/pb-go/v2/common"
	sdk "chainmaker.org/chainmaker/sdk-go/v2"

	"skytrust-backend/internal/chainadapter"
)

// registeredContracts 监管链合约白名单，与 internal/chainadapter/chainmaker/adapter.go:17
// RegisteredContracts 逐字一致（contracts/chainmaker/ 5 目录）。
var registeredContracts = map[string]bool{
	"regulatory_record":        true,
	"crosschain_trace":         true,
	"identity_mapping":         true,
	"regulatory_authorization": true,
	"audit_record":             true,
}

const (
	submitTimeoutSec = 60 // SendTxRequest 同步等待秒数
	queryTimeoutSec  = 20 // QueryContract 秒数
)

// Transport 以 chainmaker-sdk-go/v2 ChainClient 实现 chainadapter.ChainTransport。
// 真实传输不实现 Resettable——Seeder 绝不重置真实链（P6-R6）。
type Transport struct {
	cc *sdk.ChainClient
}

// NewFactory 即 chainadapter.TransportFactory（transport.go:25）。
// env（§5-④）：CHAINMAKER_RPC_URL / CHAINMAKER_CHAIN_ID / CHAINMAKER_ORG_ID /
// CHAINMAKER_USER_KEY_FILE / CHAINMAKER_USER_CERT_FILE / CHAINMAKER_CA_CERT_FILE /
// CHAINMAKER_TLS_HOST_NAME。CA_CERT_FILE 为信任根**目录**（SDK conn_pool 对路径做
// readdir 装载全部 .crt；传单个文件报 not a directory——部署实况
// /opt/chains/chainmaker/trust-roots-solo）。证书模式双证书对（部署实况，偏差记录于
// docs/version-matrix.md）：
// USER_KEY/CERT 为 TLS 对（对应 sdk.yml user_key_file_path/user_crt_file_path），
// 可选 CHAINMAKER_USER_SIGN_KEY_FILE / CHAINMAKER_USER_SIGN_CERT_FILE 为签名对
// （对应 user_sign_key_file_path/user_sign_crt_file_path）；未提供签名对时 SDK 以
// TLS 对兼作签名（单证书场景）。
func NewFactory() (chainadapter.ChainTransport, error) {
	rpcURL := os.Getenv("CHAINMAKER_RPC_URL")
	if rpcURL == "" {
		return nil, fmt.Errorf("chainmaker: CHAINMAKER_RPC_URL required")
	}
	orgID := os.Getenv("CHAINMAKER_ORG_ID")
	if orgID == "" {
		return nil, fmt.Errorf("chainmaker: CHAINMAKER_ORG_ID required")
	}
	chainID := os.Getenv("CHAINMAKER_CHAIN_ID")
	if chainID == "" {
		chainID = "chain1"
	}
	userKeyFile := os.Getenv("CHAINMAKER_USER_KEY_FILE")
	userCrtFile := os.Getenv("CHAINMAKER_USER_CERT_FILE")
	if userKeyFile == "" || userCrtFile == "" {
		return nil, fmt.Errorf("chainmaker: CHAINMAKER_USER_KEY_FILE / CHAINMAKER_USER_CERT_FILE required")
	}
	caCertFile := os.Getenv("CHAINMAKER_CA_CERT_FILE")
	if caCertFile == "" {
		return nil, fmt.Errorf("chainmaker: CHAINMAKER_CA_CERT_FILE required")
	}
	tlsHostName := os.Getenv("CHAINMAKER_TLS_HOST_NAME")
	if tlsHostName == "" {
		tlsHostName = "chainmaker.org"
	}

	nodeCfg := sdk.NewNodeConfig(
		sdk.WithNodeAddr(rpcURL),
		sdk.WithNodeConnCnt(2),
		sdk.WithNodeUseTLS(true),
		sdk.WithNodeCAPaths([]string{caCertFile}),
		sdk.WithNodeTLSHostName(tlsHostName),
	)
	opts := []sdk.ChainClientOption{
		sdk.WithChainClientOrgId(orgID),
		sdk.WithChainClientChainId(chainID),
		sdk.WithUserKeyFilePath(userKeyFile),
		sdk.WithUserCrtFilePath(userCrtFile),
		sdk.AddChainClientNodeConfig(nodeCfg),
		sdk.WithRetryLimit(5),
		sdk.WithRetryInterval(500),
	}
	if signKeyFile := os.Getenv("CHAINMAKER_USER_SIGN_KEY_FILE"); signKeyFile != "" {
		opts = append(opts, sdk.WithUserSignKeyFilePath(signKeyFile))
	}
	if signCrtFile := os.Getenv("CHAINMAKER_USER_SIGN_CERT_FILE"); signCrtFile != "" {
		opts = append(opts, sdk.WithUserSignCrtFilePath(signCrtFile))
	}
	cc, err := sdk.NewChainClient(opts...)
	if err != nil {
		return nil, fmt.Errorf("chainmaker: new chain client (%s, chain %s): %w", rpcURL, chainID, err)
	}
	return &Transport{cc: cc}, nil
}

// SubmitTx 提交交易（指南 §5-②：GetTxRequest 构造 + SendTxRequest 同步提交；
// 回执 contract_result.code → Status，contract_result.result → Ret）。
func (t *Transport) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	if !registeredContracts[contract] {
		return nil, fmt.Errorf("chainmaker: contract %q not registered", contract)
	}
	kvs, err := toKVs(params)
	if err != nil {
		return nil, fmt.Errorf("chainmaker: encode params: %w", err)
	}
	txReq, err := t.cc.GetTxRequest(contract, method, "", kvs)
	if err != nil {
		return nil, fmt.Errorf("chainmaker: build tx request %s.%s: %w", contract, method, err)
	}
	resp, err := t.cc.SendTxRequest(txReq, submitTimeoutSec, true)
	if err != nil {
		return nil, fmt.Errorf("chainmaker: send tx %s.%s: %w", contract, method, err) // 传输级错误 → withRetry
	}
	return receiptFromResponse(resp)
}

// receiptFromResponse 将 *common.TxResponse 映射为 TxReceipt。
// 语义契约（transport.go:12）：链上业务失败（contract_result.code != 0，TxStatusCode 通常为
// CONTRACT_FAIL）→ Status!=0、error 为 nil；SUCCESS → Status=0；其余 TxStatusCode
// （TIMEOUT/SYSTEM_BUSY 等，无合约结果）→ 传输级错误（触发 withRetry）。
func receiptFromResponse(resp *common.TxResponse) (*chainadapter.TxReceipt, error) {
	if resp == nil {
		return nil, fmt.Errorf("chainmaker: nil tx response")
	}
	cr := resp.GetContractResult()
	switch {
	case resp.Code == common.TxStatusCode_SUCCESS:
		// 成功路径（contract_result.code 必为 0）
	case cr != nil && cr.Code != 0:
		// 链上业务失败 → Status!=0、error=nil（不重试：业务性拒绝）
	default:
		return nil, fmt.Errorf("chainmaker: tx %s transport-level failure: code=%s message=%s",
			resp.TxId, resp.Code, resp.Message)
	}
	status := 0
	var ret []byte
	if cr != nil {
		status = int(cr.Code)
		ret = cr.Result
	}
	ts := time.Now()
	if resp.TxTimestamp > 0 {
		ts = time.UnixMilli(resp.TxTimestamp) // 同步模式下为 TxRequest.Payload.Timestamp（毫秒）
	}
	return &chainadapter.TxReceipt{
		TxID:      resp.TxId,
		BlockNum:  resp.TxBlockHeight,
		Status:    status,
		Ret:       ret,
		Timestamp: ts,
	}, nil
}

// QueryTx 经系统合约 GET_TX_BY_TX_ID（SDK GetTxByTxId）取回交易与执行结果。
func (t *Transport) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	info, err := t.cc.GetTxByTxId(txID)
	if err != nil {
		return nil, fmt.Errorf("chainmaker: get tx %s: %w", txID, err)
	}
	res := info.GetTransaction().GetResult()
	cr := res.GetContractResult()
	status := 0
	var ret []byte
	if cr != nil {
		status = int(cr.Code)
		ret = cr.Result
	} else if res.GetCode() != common.TxStatusCode_SUCCESS {
		status = int(res.GetCode())
	}
	ts := time.Time{}
	if bt := info.GetBlockTimestamp(); bt > 0 {
		if bt > 1e12 {
			ts = time.UnixMilli(bt) // 块头时间戳（毫秒）
		} else {
			ts = time.Unix(bt, 0)
		}
	}
	return &chainadapter.TxReceipt{
		TxID:      txID,
		BlockNum:  info.GetBlockHeight(),
		Status:    status,
		Ret:       ret,
		Timestamp: ts,
	}, nil
}

// QueryState 按状态键读链上状态。部署期已为 5 合约补充通用读方法
// QueryState(state_key)（contracts/chainmaker/*/contract.go v1.0.2，依据
// docs/real-chain-migration.md §5-②——补充读方法属部署期合约演进，不触碰后端调用面；
// 入参单段键按与写路径一致的 stateKey 规则消毒，如 "REG/CX-x" → "REG_CX_x"）。
// 链上无值 → 合约返回 error → 此处映射为非 nil error。
func (t *Transport) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	if !registeredContracts[contract] {
		return nil, fmt.Errorf("chainmaker: contract %q not registered", contract)
	}
	resp, err := t.cc.QueryContract(contract, "QueryState", []*common.KeyValuePair{
		{Key: "state_key", Value: []byte(key)},
	}, queryTimeoutSec)
	if err != nil {
		return nil, fmt.Errorf("chainmaker: query state %s/%s: %w", contract, key, err)
	}
	if resp.Code != common.TxStatusCode_SUCCESS {
		return nil, fmt.Errorf("chainmaker: query state %s/%s failed: code=%s message=%s",
			contract, key, resp.Code, resp.Message)
	}
	cr := resp.GetContractResult()
	if cr.Code != 0 {
		return nil, fmt.Errorf("chainmaker: query state %s/%s rejected: code=%d message=%s",
			contract, key, cr.Code, cr.Message)
	}
	return cr.Result, nil
}

// Health 节点 RPC 探活（取当前块高；/api/chain/status 数据来源，§6.5）。
func (t *Transport) Health() error {
	if _, err := t.cc.GetCurrentBlockHeight(); err != nil {
		return fmt.Errorf("chainmaker: health GetCurrentBlockHeight: %w", err)
	}
	return nil
}

// Close 释放 SDK 连接池（进程退出钩子调用）。
func (t *Transport) Close() {
	_ = t.cc.Stop()
}

// toKVs params map → []*common.KeyValuePair。值序列化约定（§5-②/contracts/fisco 同例）：
// string 原样；其余（含列表/时间戳类）json.Marshal 为字符串——合约侧 GetArgs()
// 得 map[string][]byte，与 docker-go 合约写路径逐字兼容。
func toKVs(params map[string]any) ([]*common.KeyValuePair, error) {
	kvs := make([]*common.KeyValuePair, 0, len(params))
	for k, v := range params {
		var b []byte
		switch s := v.(type) {
		case string:
			b = []byte(s)
		case nil:
			return nil, fmt.Errorf("param %q is nil", k)
		default:
			enc, err := json.Marshal(v)
			if err != nil {
				return nil, fmt.Errorf("param %q: %w", k, err)
			}
			b = enc
		}
		kvs = append(kvs, &common.KeyValuePair{Key: k, Value: b})
	}
	return kvs, nil
}

var _ chainadapter.ChainTransport = (*Transport)(nil)
