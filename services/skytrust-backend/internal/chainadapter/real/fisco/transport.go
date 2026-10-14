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
	"skytrust-backend/internal/timex"
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

// ---- BlockQuerier（explorer 数据源）：块高/块详情/块列表/节点全部走链原生 SDK
// （source=rpc）。§11.4-① 登记的 getBlockByNumber/getTransactionReceipt 怪癖经复核
// **仅存在于 JSON-RPC curl 面**（该面甚至缺 getTransactionByHash 方法）；后端一直
// 使用的 go-sdk websocket 通道按块号正确回真实数据（version-matrix §12.11 实证）。
// 唯一坚持的诚实边界：0 号块为节点合成应答，非账本数据，拒绝透出。 ----

var _ chainadapter.BlockQuerier = (*Transport)(nil)

// GetBlockHeight 当前块号（SDK GetBlockNumber）。
func (t *Transport) GetBlockHeight(ctx context.Context) (uint64, error) {
	n, err := t.c.GetBlockNumber(ctx)
	if err != nil {
		return 0, fmt.Errorf("fisco-bcos: get block number: %w", err)
	}
	if n < 0 {
		return 0, fmt.Errorf("fisco-bcos: negative block number %d", n)
	}
	return uint64(n), nil
}

// GetBlockByHeight 块详情（SDK GetBlockByNumber，onlyHeader=false + onlyTxHash=true：
// 完整头 + 交易哈希列表）。块 0 拒绝：节点对 0 号返回合成应答——其哈希与块 1
// parentInfo 链上承诺的父哈希不符（非账本数据，无假数据红线）。
func (t *Transport) GetBlockByHeight(ctx context.Context, height uint64) (*chainadapter.BlockInfo, error) {
	if height == 0 {
		return nil, fmt.Errorf("fisco-bcos: block height 0 rejected — node synthesizes a non-ledger genesis response (hash mismatches block-1 parentInfo); stored heights start at 1")
	}
	b, err := t.c.GetBlockByNumber(ctx, int64(height), false, true)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: get block %d: %w", height, err)
	}
	if b == nil {
		return nil, fmt.Errorf("fisco-bcos: get block %d: empty response", height)
	}
	info := &chainadapter.BlockInfo{
		Height:  b.Number,
		Hash:    b.Hash,
		TxCount: len(b.Transactions),
		TxIDs:   make([]string, 0, len(b.Transactions)),
	}
	if b.Timestamp > 0 {
		info.Time = timex.FormatTime(time.UnixMilli(int64(b.Timestamp))) // 链上毫秒时间戳归一 timex
	} // Timestamp 缺失 → Time 如实留空，绝不猜测
	if int(b.Sealer) < len(b.SealerList) {
		info.Proposer = b.SealerList[b.Sealer] // 出块节点 nodeID（链上 sealerList 原样）
	} // 索引越界 → Proposer 如实留空，绝不猜测
	for _, tx := range b.Transactions {
		switch v := tx.(type) {
		case string: // onlyTxHash=true：交易哈希直取
			info.TxIDs = append(info.TxIDs, v)
		case map[string]interface{}: // 防御：完整交易体形态时取 hash 字段
			if h, ok := v["hash"].(string); ok && h != "" {
				info.TxIDs = append(info.TxIDs, h)
			}
		}
	}
	return info, nil
}

// ListRecentBlocks 最近块，新→旧（逐高 SDK 查询；limit 由调用方按端点契约钳制，
// 此处防御性执行）。0 号块永不入列（合成应答，见 GetBlockByHeight）。
func (t *Transport) ListRecentBlocks(ctx context.Context, limit int) ([]chainadapter.BlockInfo, error) {
	out := make([]chainadapter.BlockInfo, 0)
	if limit <= 0 {
		return out, nil
	}
	cur, err := t.GetBlockHeight(ctx)
	if err != nil {
		return nil, err
	}
	for h := cur; h >= 1 && len(out) < limit; h-- {
		b, err := t.GetBlockByHeight(ctx, h)
		if err != nil {
			return nil, err
		}
		out = append(out, *b)
	}
	return out, nil
}

// ListNodes 共识节点列表（source=rpc）：getSealerList（v3.16 正常可用，§11.4-①
// 怪癖清单外）+ getSyncStatus（self nodeId + 已连接 peers）判定在线。v3 RPC 仅报
// nodeID（无 ip:port）——Address 如实承载 nodeID，绝不拼造地址。
func (t *Transport) ListNodes(ctx context.Context) ([]chainadapter.NodeInfo, error) {
	sealers, err := t.c.GetSealerList(ctx)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: getSealerList: %w", err)
	}
	sync, err := t.c.GetSyncStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("fisco-bcos: getSyncStatus: %w", err)
	}
	connected := map[string]bool{}
	if sync != nil {
		if sync.NodeId != "" {
			connected[sync.NodeId] = true // self（应答本 RPC 的节点必然在线）
		}
		for _, p := range sync.Peers {
			connected[p.NodeId] = true
		}
	}
	out := make([]chainadapter.NodeInfo, 0, len(sealers))
	for i, s := range sealers {
		name := s.ID
		if len(name) > 12 {
			name = name[:12]
		}
		out = append(out, chainadapter.NodeInfo{
			Name:    fmt.Sprintf("sealer-%d-%s", i, name),
			Role:    "sealer",
			Address: s.ID,
			Online:  connected[s.ID],
			Source:  "rpc",
		})
	}
	return out, nil
}
