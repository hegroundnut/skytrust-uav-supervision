//go:build realchains

// Package realirita 提供 IRITA 证照链真实传输（2026-10-13 pass 迁移新增的第 4 链，
// docs/superpowers/plans/2026-10-13-fourth-chain-license-explorer.md）。
//
// 写路径 = irita CLI shell-out（PoC 实证方案，Task 1 Step 7 真链校准全文见计划
// 「实施偏差记录」节——本实现以校准为准，而非 brief 的推测形态）：
//
//	irita tx record create <SM3hex(contentsJSON)> SM3 \
//	  --uri "skytrust://license_registry/<METHOD>/<key>" --meta '<contentsJSON>' \
//	  --from <IRITA_KEY_NAME> --chain-id <IRITA_CHAIN_ID> --node tcp://<host:port> \
//	  --keyring-backend test -y --output json        （env HOME=<IRITA_CLI_HOME>）
//
// 读路径 = 裸 Tendermint RPC（stdlib net/http + encoding/json，零新外部依赖——
// 不引 irita-sdk-go/cosmos-sdk；内部仅复用 chainadapter/crypto(SM3)/timex）：
//   - QueryTx  → GET /tx?hash=0x<UPPER>（RPC 事件 type 明文、attribute key/value 均 base64）；
//   - QueryState → JSON-RPC POST abci_query {path:"/store/record/key", data:"01<recordIDhex>",
//     prove:true, height:"0"}（int64 参数必须 JSON 字符串；height=0→latest，height≥1+prove
//     被 SDK guard 拒绝 code=18；响应证明字段为 camelCase proofOps）；
//   - Health → GET /status（sync_info.catching_up=false）。
//
// IRITA 无「合约部署」概念——逻辑合约 license_registry 由内置 record 模块承载
// （contracts/irita/README.md）：业务键 → Content.URI（stateKey 规则消毒）、
// contents JSON → Content.Meta、digest = SM3(contents JSON)。**record-id 链上派生
// （hash(record字节||intraTxCounter)），客户端不可指定**——只能从 create_record 事件
// 属性 record_id（64-hex）取回。record 模块无二级索引 → 业务键无法反查（见 QueryState）。
//
// 真实传输不实现 Resettable——Seeder 绝不重置真实链（P6-R6）。
package realirita

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"time"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/timex"
)

// contractName 与后端固化常量逐字一致（internal/crosschain/policy.go:71
// ContractLicenseRegistry；白名单 internal/chainadapter/irita/adapter.go:18）。
const contractName = "license_registry"

// writeMethods 后端 SubmitTx 调用面（13 步协议源链步 3/12：FLIGHT_PASS / PASS_REVOKE
// 经网关代提交与 ACK，gateway.go:219/370——irita 是这两类消息的源链，policy.go:16-17）。
var writeMethods = map[string]bool{
	"CrosschainSubmit": true,
	"CrosschainAck":    true,
}

const (
	submitInclusionTimeout = 30 * time.Second // CLI 广播 code=0 → /tx inclusion 轮询上限（brief 接口）
	submitPollInterval     = 500 * time.Millisecond
	rpcTimeout             = 15 * time.Second // 单次 RPC 超时
	rpcBodyLimit           = 64 << 20         // RPC 响应体读取上限（大块防御）
	digestAlgo             = "SM3"            // 国密合规（P6-R4）；record 模块无算法白名单（Task 1 校准）
	recordStoreKeyPrefix   = "01"             // record 模块 store key 前缀：data = 0x01||recordID（Task 1 校准）
	cliOutputLimit         = 4096             // 错误文案中 CLI 输出截断长度
)

// Transport 以 CLI shell-out（写）+ 裸 TM RPC（读）实现 chainadapter.ChainTransport，
// 并结构上满足 chainadapter.BlockQuerier（explorer 数据源，Task 5）。
type Transport struct {
	rpcBase string // http://host:port（IRITA_RPC，读路径）
	tcpNode string // tcp://host:port（由 IRITA_RPC 派生，CLI --node）
	chainID string
	cliBin  string
	cliHome string
	keyName string
	http    *http.Client
}

// NewFactory 即 chainadapter.TransportFactory（transport.go:25）。
// env（缺失即 fail-fast，显式点名）：IRITA_RPC / IRITA_CHAIN_ID / IRITA_CLI_BIN /
// IRITA_CLI_HOME / IRITA_KEY_NAME。构造完全离线（不触链、不探 CLI 二进制——
// CLI 缺失在 SubmitTx 时如实报错，零伪造）。
func NewFactory() (chainadapter.ChainTransport, error) {
	rpc := os.Getenv("IRITA_RPC")
	chainID := os.Getenv("IRITA_CHAIN_ID")
	cliBin := os.Getenv("IRITA_CLI_BIN")
	cliHome := os.Getenv("IRITA_CLI_HOME")
	keyName := os.Getenv("IRITA_KEY_NAME")
	var missing []string
	for name, v := range map[string]string{
		"IRITA_RPC": rpc, "IRITA_CHAIN_ID": chainID, "IRITA_CLI_BIN": cliBin,
		"IRITA_CLI_HOME": cliHome, "IRITA_KEY_NAME": keyName,
	} {
		if strings.TrimSpace(v) == "" {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing) // 排序保证错误文案确定性（map 遍历无序）
		return nil, fmt.Errorf("irita: required env missing: %s (write path = CLI shell-out, read path = raw TM RPC; see contracts/irita/README.md)", strings.Join(missing, ", "))
	}
	u, err := url.Parse(rpc)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return nil, fmt.Errorf("irita: IRITA_RPC %q must be a full http(s) URL (e.g. http://127.0.0.1:26657)", rpc)
	}
	return &Transport{
		rpcBase: strings.TrimRight(rpc, "/"),
		tcpNode: "tcp://" + u.Host, // CLI --node 形态（Task 1 校准：tcp://host:port）
		chainID: chainID,
		cliBin:  cliBin,
		cliHome: cliHome,
		keyName: keyName,
		http:    &http.Client{Timeout: rpcTimeout},
	}, nil
}

// SubmitTx 写路径：contents JSON = params（Go map JSON 编码按键排序 → digest 确定）；
// digest = SM3(contents)；业务键（cross_tx_id → business_id → record_key 依序取首个非空）
// 消毒后进 Content.URI；record-id 链上派生不可指定——提交成功后从 create_record 事件
// 取回并放入回执 Ret（64-hex 字符串）。成功判据（brief 接口）= CLI exit 0 且输出 JSON
// code==0，txhash 大写为 TxID，随后轮询 /tx 至 inclusion（超时 30s → 传输级 error，
// 触发网关 withRetry）。
func (t *Transport) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	if contract != contractName {
		return nil, fmt.Errorf("irita: contract %q not registered (allowed: %s; record 模块承载，见 contracts/irita/README.md)", contract, contractName)
	}
	if !writeMethods[method] {
		return nil, fmt.Errorf("irita: method %q not in backend call surface (allowed: CrosschainSubmit/CrosschainAck)", method)
	}
	contents, err := json.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("irita: encode contents JSON for %s: %w", method, err)
	}
	key := businessKey(params)
	if key == "" {
		return nil, fmt.Errorf("irita: %s: no business key in params (need cross_tx_id / business_id / record_key) — record URI cannot be built", method)
	}
	uri := buildRecordURI(method, key)
	digest := crypto.SM3Hex(contents) // SM3(contents JSON)，与 --meta 内容严格对应

	args := []string{
		"tx", "record", "create", digest, digestAlgo, // 位置参数 = digest + digest-algo（Task 1 校准：子命令是 create，非 create-record）
		"--uri", uri,
		"--meta", string(contents),
		"--from", t.keyName,
		"--chain-id", t.chainID,
		"--node", t.tcpNode,
		"--keyring-backend", "test",
		"-y", "--output", "json",
		// 零 fee 可上链、默认 gas 200000 够用（Task 1 校准实证）——不加 --fees/--gas。
	}
	cmd := exec.CommandContext(ctx, t.cliBin, args...)
	cmd.Env = append(os.Environ(), "HOME="+t.cliHome) // keyring-test 家目录注入（PoC 实证方案）
	var stdout, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &stdout, &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("irita: cli tx record create (%s): %w | stderr: %s", uri, err, truncate(stderr.String(), cliOutputLimit))
	}
	var bc struct {
		Code   int    `json:"code"`
		TxHash string `json:"txhash"`
		RawLog string `json:"raw_log"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &bc); err != nil {
		return nil, fmt.Errorf("irita: cli output is not JSON (%s): %w", truncate(stdout.String(), cliOutputLimit), err)
	}
	if bc.Code != 0 || strings.TrimSpace(bc.TxHash) == "" {
		return nil, fmt.Errorf("irita: cli broadcast rejected (%s): code=%d raw_log=%s", uri, bc.Code, truncate(bc.RawLog, cliOutputLimit))
	}
	txID := strings.ToUpper(bc.TxHash)

	// 轮询 /tx 至 inclusion：CLI code=0 仅表示 CheckTx 通过，入块以 /tx 命中为准。
	deadline := time.Now().Add(submitInclusionTimeout)
	for {
		rc, qerr := t.QueryTx(ctx, txID)
		if qerr == nil {
			return rc, nil
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("irita: tx %s broadcast ok (code=0) but not included within %s: %w", txID, submitInclusionTimeout, qerr)
		}
		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("irita: await inclusion of %s: %w", txID, ctx.Err())
		case <-time.After(submitPollInterval):
		}
	}
}

// QueryTx 读路径：GET /tx?hash=0x<UPPER>。链上业务失败（tx_result.code!=0）→
// Status!=0、error=nil（语义契约 transport.go:12）；未命中/传输失败 → 非 nil error。
// Ret = create_record 事件 record_id（64-hex；非 record 写交易则 nil，如实）。
// Timestamp = 块头时间（best-effort 经 /block?height=；取不到退查询时刻——与 real
// fisco 传输同例，链上时间可经块头核对）。
func (t *Transport) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	id := strings.ToUpper(strings.TrimPrefix(strings.TrimSpace(txID), "0x"))
	if !is64Hex(id) {
		return nil, fmt.Errorf("irita: tx id %q is not a 64-hex txhash", txID)
	}
	raw, err := t.rpcGet(ctx, "/tx", url.Values{"hash": {"0x" + id}})
	if err != nil {
		return nil, fmt.Errorf("irita: query tx %s: %w", id, err)
	}
	var tr tmTxResult
	if err := json.Unmarshal(raw, &tr); err != nil {
		return nil, fmt.Errorf("irita: decode /tx result for %s: %w", id, err)
	}
	height, _ := strconv.ParseUint(tr.Height, 10, 64)
	rc := &chainadapter.TxReceipt{
		TxID:      strings.ToUpper(tr.Hash),
		BlockNum:  height,
		Status:    tr.TxResult.Code, // 0 = 成功
		Timestamp: t.blockTime(ctx, height),
	}
	if rid := recordIDFromEvents(tr.TxResult.Events); rid != "" {
		rc.Ret = []byte(rid)
	}
	return rc, nil
}

// QueryState 读路径（Task 1 Step 7 真链校准，覆盖 brief 的推测形态）：
// record 模块**无二级索引——业务键反查不可实现**；且 QueryState 在全代码库零业务
// 调用点（grep 证据：仅接口定义 + 各 adapter 透传，gateway/uavbusiness/regulatory
// 均不调用），故本传输将 key 形态收敛为（计划偏差记录 §12 已登记）：
//   - 64-hex record-id → abci_query /store/record/key（data=0x01||recordID，prove=true，
//     height="0"→latest；返回 value = protobuf Record{tx_hash, contents[]{digest,
//     digest_algo, uri, meta}, creator} 原始字节，如实返回不二次编码；prove=true 的
//     ics23 双段 Merkle 证明在响应 proofOps 中真实可用——本接口形态只回 value）；
//   - 64-hex txhash → 先按 record-id 查，未命中再经 /tx 提取 create_record 事件的
//     record_id 后查 store（record-id 与 txhash 同为 64-hex，先 store 后 /tx 的次序
//     对两形态均确定性收敛，碰撞概率可忽略）；
//   - 其余任何形态（含一切业务键）→ 明示错误，绝不静默、绝不拼造。
func (t *Transport) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	if contract != contractName {
		return nil, fmt.Errorf("irita: contract %q not registered (allowed: %s)", contract, contractName)
	}
	k := strings.ToLower(strings.TrimPrefix(strings.TrimSpace(key), "0x"))
	if !is64Hex(k) {
		return nil, fmt.Errorf("irita: record 模块不支持业务键反查（无二级索引，Task 1 真链校准）——QueryState key 必须是 64-hex record-id 或 txhash，收到 %q（业务键存于 Content.URI: skytrust://%s/<METHOD>/<key>，见 contracts/irita/README.md）", key, contractName)
	}
	if val, found, err := t.queryRecordStore(ctx, k); err != nil {
		return nil, err
	} else if found {
		return val, nil // key 即 record-id
	}
	// store 未命中 → 按 txhash 形态：/tx 提取 create_record.record_id 再查。
	rc, err := t.QueryTx(ctx, k)
	if err != nil {
		return nil, fmt.Errorf("irita: key %s is neither a record-id in the record store nor a tx retrievable via /tx: %w", k, err)
	}
	rid := string(rc.Ret)
	if !is64Hex(rid) {
		return nil, fmt.Errorf("irita: tx %s carries no create_record event (not a record write) — cannot resolve state", k)
	}
	val, found, err := t.queryRecordStore(ctx, rid)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, fmt.Errorf("irita: record %s (from tx %s) not found in record store", rid, k)
	}
	return val, nil
}

// Health GET /status：HTTP 可达 + JSON-RPC 无错 + sync_info.catching_up=false
// + latest_block_height 可解析（/api/chain/status 数据来源，§6.5）。
func (t *Transport) Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
	defer cancel()
	st, err := t.status(ctx)
	if err != nil {
		return fmt.Errorf("irita: health /status: %w", err)
	}
	if st.SyncInfo.CatchingUp {
		return fmt.Errorf("irita: node still catching up (height %s) — not healthy", st.SyncInfo.LatestBlockHeight)
	}
	if _, err := strconv.ParseUint(st.SyncInfo.LatestBlockHeight, 10, 64); err != nil {
		return fmt.Errorf("irita: bad latest_block_height %q: %w", st.SyncInfo.LatestBlockHeight, err)
	}
	return nil
}

// ---- BlockQuerier（explorer 数据源，Task 5）：数据全部来自链原生 RPC（source=rpc
// 如实标注），绝不拼造。/blockchain 与 /status 高度信息重复——统一走 /status；
// /validators 的共识地址与 /net_info 的 p2p node_id 之间 RPC 无映射，节点角色按
// /status validator_info（self）与 /net_info peers（对端）如实报告，绝不猜测。 ----

var _ chainadapter.BlockQuerier = (*Transport)(nil)

// GetBlockHeight 当前块高（/status sync_info.latest_block_height）。
func (t *Transport) GetBlockHeight(ctx context.Context) (uint64, error) {
	st, err := t.status(ctx)
	if err != nil {
		return 0, fmt.Errorf("irita: block height /status: %w", err)
	}
	h, err := strconv.ParseUint(st.SyncInfo.LatestBlockHeight, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("irita: bad latest_block_height %q: %w", st.SyncInfo.LatestBlockHeight, err)
	}
	return h, nil
}

// GetBlockByHeight 按高度取块（GET /block?height=）。TxIDs = SHA256(原始 tx 字节)
// 大写 hex（TM tx hash 定义，锚点交易实测核验）；越界高度由 RPC 如实报错。
func (t *Transport) GetBlockByHeight(ctx context.Context, height uint64) (*chainadapter.BlockInfo, error) {
	if height == 0 {
		return nil, fmt.Errorf("irita: block height 0 does not exist (heights start at 1)")
	}
	br, err := t.block(ctx, height)
	if err != nil {
		return nil, fmt.Errorf("irita: get block %d: %w", height, err)
	}
	info := &chainadapter.BlockInfo{
		Height:   height,
		Hash:     br.BlockID.Hash,
		TxCount:  len(br.Block.Data.Txs),
		Proposer: br.Block.Header.ProposerAddress, // 共识地址 hex，RPC 原样
		TxIDs:    make([]string, 0, len(br.Block.Data.Txs)),
	}
	if ts, err := time.Parse(time.RFC3339Nano, br.Block.Header.Time); err == nil {
		info.Time = timex.FormatTime(ts) // 链上原始时间归一为 timex 格式（BlockInfo 契约）
	} // 解析失败 → Time 如实留空，绝不猜测
	for _, b64tx := range br.Block.Data.Txs {
		raw, err := base64.StdEncoding.DecodeString(b64tx)
		if err != nil {
			continue // 不可解码的 tx 不计入 TxIDs（TxCount 仍按链上原样）
		}
		sum := sha256.Sum256(raw)
		info.TxIDs = append(info.TxIDs, strings.ToUpper(hex.EncodeToString(sum[:])))
	}
	return info, nil
}

// ListRecentBlocks 最近块，新→旧（逐高 /block；limit 由调用方按端点契约钳制，
// 此处防御性执行）。空链（height=0）→ 空列表。
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

// ListNodes self（/status：node_info + validator_info，voting_power>0 → validator）
// + 已连接对端（/net_info peers，在列即 p2p 在线）。source=rpc 如实。
func (t *Transport) ListNodes(ctx context.Context) ([]chainadapter.NodeInfo, error) {
	st, err := t.status(ctx)
	if err != nil {
		return nil, fmt.Errorf("irita: list nodes /status: %w", err)
	}
	selfName := st.NodeInfo.Moniker
	if selfName == "" {
		selfName = "node@" + shortID(st.NodeInfo.ID)
	}
	role := "node"
	if p, err := strconv.ParseInt(st.ValidatorInfo.VotingPower, 10, 64); err == nil && p > 0 {
		role = "validator"
	}
	nodes := []chainadapter.NodeInfo{{
		Name: selfName, Role: role, Address: st.NodeInfo.ListenAddr, Online: true, Source: "rpc",
	}}
	raw, err := t.rpcGet(ctx, "/net_info", nil)
	if err != nil {
		return nil, fmt.Errorf("irita: list nodes /net_info: %w", err)
	}
	var ni tmNetInfoResult
	if err := json.Unmarshal(raw, &ni); err != nil {
		return nil, fmt.Errorf("irita: decode /net_info: %w", err)
	}
	for _, p := range ni.Peers {
		name := p.NodeInfo.Moniker
		if name == "" {
			name = "node@" + shortID(p.NodeInfo.ID)
		}
		nodes = append(nodes, chainadapter.NodeInfo{
			Name: name, Role: "peer", // p2p 对端角色如实；是否为验证人 RPC 无 node_id↔地址映射，不猜测
			Address: p.NodeInfo.ListenAddr, Online: true, Source: "rpc",
		})
	}
	return nodes, nil
}

// ---- 内部：RPC 通道与 TM JSON 形态 ----

// queryRecordStore abci_query /store/record/key：data=0x01||recordID（hex），
// prove=true，height="0"（int64 参数必须 JSON 字符串——GET 形态 data 不做 hex 解码
// 不可用；height≥1+prove 被 SDK guard 拒绝 code=18：Task 1 Step 7 校准三点）。
// found=false 表示链上如实无值（value=null，不存在证明照常返回）。
func (t *Transport) queryRecordStore(ctx context.Context, recordIDHex string) ([]byte, bool, error) {
	body, err := json.Marshal(map[string]any{
		"jsonrpc": "2.0", "id": 1, "method": "abci_query",
		"params": map[string]any{
			"path":   "/store/record/key",
			"data":   recordStoreKeyPrefix + recordIDHex,
			"prove":  true,
			"height": "0",
		},
	})
	if err != nil {
		return nil, false, fmt.Errorf("irita: encode abci_query: %w", err)
	}
	raw, err := t.rpcPost(ctx, body)
	if err != nil {
		return nil, false, fmt.Errorf("irita: abci_query record %s: %w", recordIDHex, err)
	}
	var q tmAbciQueryResult
	if err := json.Unmarshal(raw, &q); err != nil {
		return nil, false, fmt.Errorf("irita: decode abci_query result: %w", err)
	}
	if q.Response.Code != 0 {
		return nil, false, fmt.Errorf("irita: abci_query record %s: app code %d log %s", recordIDHex, q.Response.Code, q.Response.Log)
	}
	if q.Response.Value == "" {
		return nil, false, nil // 不存在（proofOps 携带非存在证明，如实不拼造值）
	}
	val, err := base64.StdEncoding.DecodeString(q.Response.Value)
	if err != nil {
		return nil, false, fmt.Errorf("irita: abci_query record %s: decode value: %w", recordIDHex, err)
	}
	return val, true, nil
}

func (t *Transport) status(ctx context.Context) (*tmStatusResult, error) {
	raw, err := t.rpcGet(ctx, "/status", nil)
	if err != nil {
		return nil, err
	}
	var st tmStatusResult
	if err := json.Unmarshal(raw, &st); err != nil {
		return nil, fmt.Errorf("irita: decode /status: %w", err)
	}
	return &st, nil
}

func (t *Transport) block(ctx context.Context, height uint64) (*tmBlockResult, error) {
	raw, err := t.rpcGet(ctx, "/block", url.Values{"height": {strconv.FormatUint(height, 10)}})
	if err != nil {
		return nil, err
	}
	var br tmBlockResult
	if err := json.Unmarshal(raw, &br); err != nil {
		return nil, fmt.Errorf("irita: decode /block height=%d: %w", height, err)
	}
	return &br, nil
}

// blockTime best-effort 块头时间；任何失败退当前时刻（与 real fisco 传输约定一致：
// 链上精确时间可经区块头核对，此处不让时间戳获取失败拖垮交易查询）。
func (t *Transport) blockTime(ctx context.Context, height uint64) time.Time {
	if height == 0 {
		return time.Now()
	}
	br, err := t.block(ctx, height)
	if err == nil {
		if ts, err := time.Parse(time.RFC3339Nano, br.Block.Header.Time); err == nil {
			return ts
		}
	}
	return time.Now()
}

// rpcGet / rpcPost —— TM JSON-RPC 通道：HTTP 非 200、JSON-RPC error 对象、
// 传输失败均为非 nil error（绝不静默）。
func (t *Transport) rpcGet(ctx context.Context, path string, q url.Values) (json.RawMessage, error) {
	u := t.rpcBase + path
	if len(q) > 0 {
		u += "?" + q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	return t.doRPC(req)
}

func (t *Transport) rpcPost(ctx context.Context, body []byte) (json.RawMessage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, t.rpcBase+"/", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	return t.doRPC(req)
}

func (t *Transport) doRPC(req *http.Request) (json.RawMessage, error) {
	resp, err := t.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("rpc %s: %w", req.URL.Path, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, rpcBodyLimit))
	if err != nil {
		return nil, fmt.Errorf("rpc %s: read body: %w", req.URL.Path, err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("rpc %s: http %d: %s", req.URL.Path, resp.StatusCode, truncate(string(raw), 512))
	}
	var env struct {
		Result json.RawMessage `json:"result"`
		Error  *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
			Data    string `json:"data"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &env); err != nil {
		return nil, fmt.Errorf("rpc %s: decode envelope: %w", req.URL.Path, err)
	}
	if env.Error != nil {
		return nil, fmt.Errorf("rpc %s: jsonrpc error %d: %s (%s)", req.URL.Path, env.Error.Code, env.Error.Message, env.Error.Data)
	}
	return env.Result, nil
}

// ---- 内部：TM RPC JSON 形态（实测核验 2026-10-13，node0 :26657 v0.34.12）----

type tmStatusResult struct {
	NodeInfo struct {
		ID         string `json:"id"`
		ListenAddr string `json:"listen_addr"`
		Network    string `json:"network"`
		Moniker    string `json:"moniker"`
	} `json:"node_info"`
	SyncInfo struct {
		LatestBlockHash   string `json:"latest_block_hash"`
		LatestBlockHeight string `json:"latest_block_height"` // JSON 字符串形态
		LatestBlockTime   string `json:"latest_block_time"`
		CatchingUp        bool   `json:"catching_up"`
	} `json:"sync_info"`
	ValidatorInfo struct {
		Address     string `json:"address"`
		VotingPower string `json:"voting_power"` // JSON 字符串形态
	} `json:"validator_info"`
}

type tmTxResult struct {
	Hash   string `json:"hash"`
	Height string `json:"height"` // JSON 字符串形态
	Index  int    `json:"index"`
	// tx_result：RPC 事件 type 明文、attribute key/value 均 base64（Task 1 校准）；
	// 属性 value 可为 null（如零 fee 交易的 fee 事件——实测）→ 指针承接。
	TxResult struct {
		Code   int       `json:"code"`
		Log    string    `json:"log"`
		Data   string    `json:"data"`
		Events []tmEvent `json:"events"`
	} `json:"tx_result"`
	Tx string `json:"tx"` // base64 原始交易字节（SHA256 = txhash，实测核验）
}

// tmEvent ABCI 事件（/tx tx_result.events 元素）：type 明文，attribute key/value base64。
type tmEvent struct {
	Type       string `json:"type"`
	Attributes []struct {
		Key   *string `json:"key"`
		Value *string `json:"value"`
	} `json:"attributes"`
}

type tmBlockResult struct {
	BlockID struct {
		Hash string `json:"hash"`
	} `json:"block_id"`
	Block struct {
		Header struct {
			ChainID         string `json:"chain_id"`
			Height          string `json:"height"` // JSON 字符串形态
			Time            string `json:"time"`   // RFC3339Nano UTC
			ProposerAddress string `json:"proposer_address"`
		} `json:"header"`
		Data struct {
			Txs []string `json:"txs"` // base64；空块为 [] 或 null
		} `json:"data"`
	} `json:"block"`
}

type tmNetInfoResult struct {
	Listening bool   `json:"listening"`
	NPeers    string `json:"n_peers"`
	Peers     []struct {
		NodeInfo struct {
			ID         string `json:"id"`
			ListenAddr string `json:"listen_addr"`
			Moniker    string `json:"moniker"`
		} `json:"node_info"`
		IsOutbound bool `json:"is_outbound"`
	} `json:"peers"`
}

type tmAbciQueryResult struct {
	Response struct {
		Code   int    `json:"code"`
		Log    string `json:"log"`
		Height string `json:"height"`
		Key    string `json:"key"`
		Value  string `json:"value"` // base64(protobuf Record)；不存在 → null
		// 证明字段为 camelCase proofOps（非 proof_ops——Task 1 校准实证）；
		// prove=true 返回完整 ics23 双段证明。当前 QueryState 接口只回 value，
		// 证明体如实保留在链上响应中（Merkle 证明 bonus 真实可用）。
		ProofOps json.RawMessage `json:"proofOps"`
	} `json:"response"`
}

// ---- 内部：纯函数 ----

// recordIDFromEvents 从 create_record 事件取 record_id（64-hex；Task 1 校准：
// record-id 链上派生的唯一取回通道）。attribute key/value 均 base64，value 可 null。
func recordIDFromEvents(events []tmEvent) string {
	for _, e := range events {
		if e.Type != "create_record" {
			continue
		}
		for _, a := range e.Attributes {
			if a.Key == nil || a.Value == nil {
				continue
			}
			k, err := base64.StdEncoding.DecodeString(*a.Key)
			if err != nil || string(k) != "record_id" {
				continue
			}
			v, err := base64.StdEncoding.DecodeString(*a.Value)
			if err != nil {
				continue
			}
			return string(v)
		}
	}
	return ""
}

// businessKey 业务键提取（brief 接口：<METHOD>/<cross_tx_id 或 business 键>）：
// cross_tx_id 优先（网关源链步 3/12 恒携带），business_id / record_key 兜底。
func businessKey(params map[string]any) string {
	for _, k := range []string{"cross_tx_id", "business_id", "record_key"} {
		if s, ok := params[k].(string); ok && strings.TrimSpace(s) != "" {
			return s
		}
	}
	return ""
}

// buildRecordURI 业务键 → Content.URI（Task 1 校准形态，消毒后拼接）：
// skytrust://license_registry/<METHOD>/<key>。
func buildRecordURI(method, key string) string {
	return "skytrust://" + contractName + "/" + sanitizeKey(method) + "/" + sanitizeKey(key)
}

// sanitizeKey 与写路径 stateKey 规则逐字一致（contracts/chainmaker/*/contract.go:108）：
// [0-9a-zA-Z_.] 保留，其余字符 → '_'（如 "SMOKE/task5-1" → "SMOKE_task5_1"）。
func sanitizeKey(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || r == '_' || r == '.' {
			b.WriteRune(r)
		} else {
			b.WriteByte('_')
		}
	}
	return b.String()
}

func is64Hex(s string) bool {
	if len(s) != 64 {
		return false
	}
	_, err := hex.DecodeString(s)
	return err == nil
}

func shortID(id string) string {
	if len(id) > 12 {
		return id[:12]
	}
	return id
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

var (
	_ chainadapter.ChainTransport = (*Transport)(nil)
	_ chainadapter.BlockQuerier   = (*Transport)(nil)
	// P6-R6：真实传输绝不实现 chainadapter.Resettable（无 ResetState 方法即结构性不满足）。
)
