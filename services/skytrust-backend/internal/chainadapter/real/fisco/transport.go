//go:build realchains

// Package realfisco 提供 FISCO BCOS 管理链真实 SDK 传输（docs/real-chain-migration.md §5-②）。
// SDK：github.com/FISCO-BCOS/go-sdk/v3（v3.x，需 cgo + libbcos-c-sdk，构建须 CGO_ENABLED=1）。
// 指南 §5-② 注记的 "CNS 名解析"在 v3 形态下的实际机制为 BFS：合约以名字链
// /apps/uav_management 注册（§4.3 注册值的 v3 等价物，部署实录见 docs/version-matrix.md），
// 传输构造时经 precompiled/bfs Readlink 解析地址；BFS 名为稳定句柄，合约重部署仅需重指链接。
package realfisco

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/FISCO-BCOS/go-sdk/v3/abi"
	"github.com/FISCO-BCOS/go-sdk/v3/client"
	"github.com/FISCO-BCOS/go-sdk/v3/precompiled/bfs"
	"github.com/FISCO-BCOS/go-sdk/v3/types"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"

	"skytrust-backend/internal/chainadapter"
)

// contractName 与后端固化常量逐字一致（internal/crosschain/policy.go:70
// ContractFiscoManage；白名单 internal/chainadapter/fisco/adapter.go:17）。
const contractName = "uav_management"

// writeMethods 后端 SubmitTx 调用面（13 步协议固定三方法；QueryState 为只读，走 QueryState）。
var writeMethods = map[string]bool{
	"SubmitApplication": true,
	"CrosschainSubmit":  true,
	"CrosschainAck":     true,
}

// blockLimitSpan 交易可打包的块高窗口（go-sdk v3 官方示例取 +500）。
const blockLimitSpan = 500

// Transport 以 FISCO go-sdk v3 实现 chainadapter.ChainTransport。
// 真实传输不实现 Resettable——Seeder 绝不重置真实链（P6-R6）。
type Transport struct {
	c      *client.Client
	addr   common.Address // BFS /apps/<cnsName> 解析所得合约地址
	parsed abi.ABI        // 链上取回的 ABI（GetABI），用于按形参名序 Pack
	from   common.Address // 签名账户地址（CallMsg.From）
}

// NewFactory 即 chainadapter.TransportFactory（transport.go:25）。
// env（§5-④）：FISCO_RPC_URL / FISCO_GROUP_ID / FISCO_CA_CERT_PATH / FISCO_SDK_CERT_PATH /
// FISCO_SDK_KEY_PATH / FISCO_ACCOUNT_KEYSTORE / FISCO_CONTRACT_CNS_NAME。
// BFS 链接缺失（合约未注册）→ fail-fast 显式错误，绝不静默降级（验收诚实性 R0'）。
func NewFactory() (chainadapter.ChainTransport, error) {
	rpcURL := os.Getenv("FISCO_RPC_URL")
	if rpcURL == "" {
		return nil, fmt.Errorf("fisco-bcos: FISCO_RPC_URL required")
	}
	u, err := url.Parse(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: parse FISCO_RPC_URL %q: %w", rpcURL, err)
	}
	host := u.Hostname()
	port := 20200
	if p := u.Port(); p != "" {
		port, err = strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("fisco-bcos: bad port in FISCO_RPC_URL %q: %w", rpcURL, err)
		}
	}
	groupID := os.Getenv("FISCO_GROUP_ID")
	if groupID == "" {
		groupID = "group0"
	}
	caFile := os.Getenv("FISCO_CA_CERT_PATH")
	sdkCert := os.Getenv("FISCO_SDK_CERT_PATH")
	sdkKey := os.Getenv("FISCO_SDK_KEY_PATH")
	account := os.Getenv("FISCO_ACCOUNT_KEYSTORE")
	if caFile == "" || sdkCert == "" || sdkKey == "" || account == "" {
		return nil, fmt.Errorf("fisco-bcos: FISCO_CA_CERT_PATH / FISCO_SDK_CERT_PATH / FISCO_SDK_KEY_PATH / FISCO_ACCOUNT_KEYSTORE required")
	}
	cnsName := os.Getenv("FISCO_CONTRACT_CNS_NAME")
	if cnsName == "" {
		cnsName = contractName
	}

	// 非国密（部署实况：节点 smCryptoType=false，secp256k1 账户）。
	cfg, err := client.ParseConfigOptions(caFile, sdkKey, sdkCert, account, groupID, host, port, false)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: parse config: %w", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	c, err := client.DialContext(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: dial %s group %s: %w", rpcURL, groupID, err)
	}

	// BFS 名解析（v3 的 CNS 等价物）：/apps/<cnsName> → 合约地址。
	bfsSvc, err := bfs.NewBfsService(c)
	if err != nil {
		c.Close()
		return nil, fmt.Errorf("fisco-bcos: bfs service: %w", err)
	}
	addr, err := bfsSvc.Readlink("/apps/" + cnsName)
	if err != nil {
		c.Close()
		return nil, fmt.Errorf("fisco-bcos: bfs readlink /apps/%s: %w", cnsName, err)
	}
	if addr == (common.Address{}) {
		c.Close()
		return nil, fmt.Errorf("fisco-bcos: bfs /apps/%s not linked (contract not deployed?) — see docs/real-chain-migration.md §4.3", cnsName)
	}

	// ABI 从链上取回（与部署字节码严格一致），按形参名序 Pack。
	abiStr, err := c.GetABI(ctx, addr)
	if err != nil {
		c.Close()
		return nil, fmt.Errorf("fisco-bcos: get abi of %s: %w", addr.Hex(), err)
	}
	// v3 getABI 的 RPC result 为 JSON 字符串字面量（外层多一层引号/转义），
	// 先解一层得到 ABI 数组文本；若本就是裸数组文本则解码失败、原样保留。
	var inner string
	if err := json.Unmarshal([]byte(abiStr), &inner); err == nil {
		abiStr = inner
	}
	parsed, err := abi.JSON(strings.NewReader(abiStr))
	if err != nil {
		c.Close()
		return nil, fmt.Errorf("fisco-bcos: parse abi: %w", err)
	}
	if c.SMCrypto() {
		parsed.SetSMCrypto()
	}
	return &Transport{c: c, addr: addr, parsed: parsed, from: c.GetTransactOpts().From}, nil
}

// SubmitTx 提交交易（go-sdk v3 官方 manual 流程：Pack → CreateEncodedTransactionDataV1 →
// CreateEncodedSignature → CreateEncodedTransaction → SendEncodedTransaction；
// 回执 status → Status（0=成功）、output → Ret）。
// params 按 ABI 形参名逐位映射为 string 实参（§5-② 参数序列化约定：非字符串值
// json.Marshal 为字符串——合约形参全部为 string memory）。
func (t *Transport) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	if contract != contractName {
		return nil, fmt.Errorf("fisco-bcos: contract %q not registered (allowed: %s)", contract, contractName)
	}
	if !writeMethods[method] {
		return nil, fmt.Errorf("fisco-bcos: method %q not in backend call surface (allowed: SubmitApplication/CrosschainSubmit/CrosschainAck)", method)
	}
	args, err := t.packArgs(method, params)
	if err != nil {
		return nil, err
	}
	input, err := t.parsed.Pack(method, args...)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: pack %s: %w", method, err)
	}
	cur, err := t.c.GetBlockNumber(ctx)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: block number for %s: %w", method, err) // 传输级错误 → withRetry
	}
	txData, txHash, err := t.c.CreateEncodedTransactionDataV1(&t.addr, input, cur+blockLimitSpan, "")
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: encode tx %s: %w", method, err)
	}
	signature, err := t.c.CreateEncodedSignature(txHash)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: sign tx %s: %w", method, err)
	}
	encoded, err := t.c.CreateEncodedTransaction(txData, txHash, signature, 0, "")
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: create tx %s: %w", method, err)
	}
	receipt, err := t.c.SendEncodedTransaction(ctx, encoded, true)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: send tx %s: %w", method, err) // 传输级错误 → withRetry
	}
	if receipt == nil {
		return nil, fmt.Errorf("fisco-bcos: nil receipt for %s", method)
	}
	return receiptFromFISCO(receipt), nil
}

// receiptFromFISCO 映射 types.Receipt → TxReceipt（调用方保证 r 非 nil）。
// 链上业务失败（require revert 等）→ Status!=0、error=nil；传输失败在调用点以
// 非 nil error 返回（语义契约 transport.go:12）。v3 回执无时间戳字段——
// Timestamp 取提交确认/查询时刻（链上精确时间可经区块头核对）。
func receiptFromFISCO(r *types.Receipt) *chainadapter.TxReceipt {
	rec := &chainadapter.TxReceipt{
		TxID:      r.TransactionHash,
		BlockNum:  uint64(r.BlockNumber),
		Status:    r.Status, // 0 = 成功
		Timestamp: time.Now(),
	}
	if out := strings.TrimPrefix(r.Output, "0x"); out != "" {
		if b, err := hex.DecodeString(out); err == nil {
			rec.Ret = b
		}
	}
	return rec
}

// QueryTx 按交易哈希取回执（v3 收据无时间戳字段——Timestamp 取查询时刻；
// 链上精确时间可经区块头核对，部署期以 Console getTransactionReceipt 为准）。
func (t *Transport) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	r, err := t.c.TransactionReceipt(ctx, common.HexToHash(txID))
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: receipt for %s: %w", txID, err)
	}
	if r == nil {
		return nil, fmt.Errorf("fisco-bcos: no receipt for tx %s", txID)
	}
	rec := receiptFromFISCO(r)
	if rec.TxID == "" {
		rec.TxID = txID
	}
	return rec, nil
}

// QueryState 按状态键读链上状态（只读 call）。部署期已为合约补充
// QueryState(string key) view（contracts/fisco/uav_management.sol，依据
// docs/real-chain-migration.md §5-②；键形态 APP/<mission_id>、SUBMIT/<cross_tx_id>、
// ACK/<cross_tx_id>）。链上无值 → 合约 revert → CallContract 返回非 nil error。
func (t *Transport) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	if contract != contractName {
		return nil, fmt.Errorf("fisco-bcos: contract %q not registered (allowed: %s)", contract, contractName)
	}
	input, err := t.parsed.Pack("QueryState", key)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: pack QueryState: %w", err)
	}
	out, err := t.c.CallContract(ctx, ethereum.CallMsg{From: t.from, To: &t.addr, Data: input})
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: call QueryState %s/%s: %w", contract, key, err)
	}
	var v string
	if err := t.parsed.Unpack(&v, "QueryState", out); err != nil {
		return nil, fmt.Errorf("fisco-bcos: unpack QueryState %s/%s: %w", contract, key, err)
	}
	return []byte(v), nil
}

// Health 节点探活（取当前块高；/api/chain/status 数据来源，§6.5）。
func (t *Transport) Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := t.c.GetBlockNumber(ctx); err != nil {
		return fmt.Errorf("fisco-bcos: health GetBlockNumber: %w", err)
	}
	return nil
}

// Close 释放 SDK 连接（进程退出钩子调用）。
func (t *Transport) Close() {
	t.c.Close()
}

// packArgs 按 ABI 形参名序组装实参：params[形参名] → string。
// 缺失/nil → 显式错误（后端 CheckPayload 已前置强制键集，此处为传输层最后防线）。
func (t *Transport) packArgs(method string, params map[string]any) ([]interface{}, error) {
	m, ok := t.parsed.Methods[method]
	if !ok {
		return nil, fmt.Errorf("fisco-bcos: method %q not in contract ABI", method)
	}
	args := make([]interface{}, len(m.Inputs))
	for i, in := range m.Inputs {
		v, exists := params[in.Name]
		if !exists || v == nil {
			return nil, fmt.Errorf("fisco-bcos: %s: missing param %q", method, in.Name)
		}
		switch s := v.(type) {
		case string:
			args[i] = s
		default:
			enc, err := json.Marshal(v)
			if err != nil {
				return nil, fmt.Errorf("fisco-bcos: %s: param %q: %w", method, in.Name, err)
			}
			args[i] = string(enc)
		}
	}
	return args, nil
}

var _ chainadapter.ChainTransport = (*Transport)(nil)
