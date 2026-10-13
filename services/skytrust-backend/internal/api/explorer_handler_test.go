package api

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/timex"
)

// explorerSeedContracts 四链白名单合约（迁移稳定层 P6-R3 校验；测试交易须走包装适配器）。
var explorerSeedContracts = map[string]string{
	"fabric":     "operator_business",
	"chainmaker": "regulatory_record",
	"fisco-bcos": "uav_management",
	"irita":      "license_registry",
}

// explorerSeedTx 经包装适配器向指定链提交一笔交易 → sim 链追加一个块，返回回执。
func explorerSeedTx(t *testing.T, deps *Deps, chain string) *chainadapter.TxReceipt {
	t.Helper()
	adt, ok := deps.Gateway.Chain(chain)
	if !ok {
		t.Fatalf("chain %s not wired", chain)
	}
	rc, err := adt.SubmitTx(context.Background(), explorerSeedContracts[chain], "ExplorerSeed",
		map[string]any{"chain": chain, "purpose": "explorer-test"})
	if err != nil {
		t.Fatalf("seed tx %s: %v", chain, err)
	}
	if rc == nil || rc.Status != 0 {
		t.Fatalf("seed tx %s: receipt=%v", chain, rc)
	}
	return rc
}

// explorerIsHex64 校验 64 位十六进制（sim 块 hash = SM3 摘要全量输出）。
func explorerIsHex64(s string) bool {
	if len(s) != 64 {
		return false
	}
	for _, r := range s {
		if !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')) {
			return false
		}
	}
	return true
}

// TestExplorerOverviewFourChains sim 四链总览：count=4、每链 height>0（先各播种一笔）、
// mode=sim（包装适配器经 TransportUnwrapper 暴露 sim 传输 → Resettable 判定）、
// name/consensus 固定显示字符串精确匹配（Task 11 前端逐字断言，禁止转述）。
func TestExplorerOverviewFourChains(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	for chain := range explorerSeedContracts {
		explorerSeedTx(t, deps, chain)
	}
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/overview", map[string]any{})
	if resp["code"].(float64) != 0 {
		t.Fatalf("overview: %v", resp)
	}
	data := resp["data"].(map[string]any)
	if data["count"].(float64) != 4 {
		t.Fatalf("count = %v, want 4", data["count"])
	}
	chains := data["chains"].([]any)
	if len(chains) != 4 {
		t.Fatalf("chains len = %d, want 4", len(chains))
	}
	want := map[string][2]string{
		"chainmaker": {"ChainMaker 监管链", "TBFT（4 节点）"},
		"fabric":     {"Fabric 运营链", "SMARTBFT（4 orderer）"},
		"fisco-bcos": {"FISCO BCOS 管理链", "PBFT（4 sealer）"},
		"irita":      {"IRITA 证照链", "Tendermint BFT（4 验证人）"},
	}
	seen := map[string]bool{}
	for _, item := range chains {
		ch := item.(map[string]any)
		key, _ := ch["chain"].(string)
		w, ok := want[key]
		if !ok {
			t.Fatalf("unknown chain %q in overview", key)
		}
		seen[key] = true
		if ch["name"] != w[0] {
			t.Fatalf("%s name = %v, want %q", key, ch["name"], w[0])
		}
		if ch["consensus"] != w[1] {
			t.Fatalf("%s consensus = %v, want %q", key, ch["consensus"], w[1])
		}
		if ch["mode"] != "sim" {
			t.Fatalf("%s mode = %v, want sim（Resettable 判定经包装层必须可达）", key, ch["mode"])
		}
		if ch["status"] != "ONLINE" {
			t.Fatalf("%s status = %v, want ONLINE", key, ch["status"])
		}
		if h := ch["block_height"].(float64); h <= 0 {
			t.Fatalf("%s block_height = %v, want > 0", key, h)
		}
		if nc := ch["node_count"].(float64); nc != 1 {
			t.Fatalf("%s node_count = %v, want 1（sim 单节点）", key, nc)
		}
	}
	for key := range want {
		if !seen[key] {
			t.Fatalf("chain %s missing from overview", key)
		}
	}
}

// TestExplorerBlocksBlockTxRoundTrip sim 提交两笔后：blocks 新→旧、hash 64hex、
// tx_ids 归块；block 按回执块号可查；tx 按 TxID 走既有 QueryTx 可查；
// limit 钳制（≤0→20、>200→200）；越界高度/不存在 TxID → 6002。
func TestExplorerBlocksBlockTxRoundTrip(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	rc1 := explorerSeedTx(t, deps, "fabric")
	rc2 := explorerSeedTx(t, deps, "fabric")
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	// blocks：新→旧
	resp := postJSON(t, r, "/api/explorer/blocks", map[string]any{"chain": "fabric", "limit": 5})
	if resp["code"].(float64) != 0 {
		t.Fatalf("blocks: %v", resp)
	}
	data := resp["data"].(map[string]any)
	if data["chain"] != "fabric" {
		t.Fatalf("blocks chain = %v", data["chain"])
	}
	if data["height"].(float64) != 2 {
		t.Fatalf("blocks height = %v, want 2", data["height"])
	}
	blocks := data["blocks"].([]any)
	if len(blocks) != 2 {
		t.Fatalf("blocks len = %d, want 2", len(blocks))
	}
	b0 := blocks[0].(map[string]any)
	b1 := blocks[1].(map[string]any)
	if b0["height"].(float64) != 2 || b1["height"].(float64) != 1 {
		t.Fatalf("blocks not 新→旧: heights %v / %v", b0["height"], b1["height"])
	}
	if !explorerIsHex64(b0["hash"].(string)) {
		t.Fatalf("block hash not 64hex: %v", b0["hash"])
	}
	if b0["tx_count"].(float64) != 1 {
		t.Fatalf("tx_count = %v, want 1", b0["tx_count"])
	}
	txIDs := b0["tx_ids"].([]any)
	if len(txIDs) != 1 || txIDs[0] != rc2.TxID {
		t.Fatalf("newest block tx_ids = %v, want [%s]", txIDs, rc2.TxID)
	}
	if _, perr := timex.ParseTime(b0["time"].(string)); perr != nil {
		t.Fatalf("block time %q not timex format: %v", b0["time"], perr)
	}
	if b0["proposer"] != "fabric-sim-node0" {
		t.Fatalf("proposer = %v, want fabric-sim-node0", b0["proposer"])
	}

	// block：按第一笔回执块号可查，hash 非空、含该交易
	resp2 := postJSON(t, r, "/api/explorer/block", map[string]any{"chain": "fabric", "height": rc1.BlockNum})
	if resp2["code"].(float64) != 0 {
		t.Fatalf("block: %v", resp2)
	}
	blk := resp2["data"].(map[string]any)["block"].(map[string]any)
	if blk["height"].(float64) != float64(rc1.BlockNum) {
		t.Fatalf("block height = %v, want %d", blk["height"], rc1.BlockNum)
	}
	if !explorerIsHex64(blk["hash"].(string)) {
		t.Fatalf("block hash empty/not hex: %v", blk["hash"])
	}
	blkTxIDs := blk["tx_ids"].([]any)
	if len(blkTxIDs) != 1 || blkTxIDs[0] != rc1.TxID {
		t.Fatalf("block tx_ids = %v, want [%s]", blkTxIDs, rc1.TxID)
	}

	// tx：按 TxID 查（既有 QueryTx，不依赖 BlockQuerier）
	resp3 := postJSON(t, r, "/api/explorer/tx", map[string]any{"chain": "fabric", "tx_id": rc1.TxID})
	if resp3["code"].(float64) != 0 {
		t.Fatalf("tx: %v", resp3)
	}
	tx := resp3["data"].(map[string]any)["tx"].(map[string]any)
	if tx["tx_id"] != rc1.TxID {
		t.Fatalf("tx_id = %v, want %s", tx["tx_id"], rc1.TxID)
	}
	if tx["block_num"].(float64) != float64(rc1.BlockNum) {
		t.Fatalf("block_num = %v, want %d", tx["block_num"], rc1.BlockNum)
	}
	if tx["status"].(float64) != 0 {
		t.Fatalf("status = %v, want 0", tx["status"])
	}
	if _, perr := timex.ParseTime(tx["timestamp"].(string)); perr != nil {
		t.Fatalf("timestamp %q not timex format: %v", tx["timestamp"], perr)
	}

	// limit 钳制：≤0→20、>200→200（现有 2 块全量返回，不报错）
	for _, limit := range []int{0, -3, 999} {
		resp4 := postJSON(t, r, "/api/explorer/blocks", map[string]any{"chain": "fabric", "limit": limit})
		if resp4["code"].(float64) != 0 {
			t.Fatalf("blocks limit=%d: %v", limit, resp4)
		}
		if n := len(resp4["data"].(map[string]any)["blocks"].([]any)); n != 2 {
			t.Fatalf("blocks limit=%d len = %d, want 2", limit, n)
		}
	}

	// 越界高度 → 6002；不存在 TxID → 6002（资源不存在）
	resp5 := postJSON(t, r, "/api/explorer/block", map[string]any{"chain": "fabric", "height": 999})
	if resp5["code"].(float64) != 6002 {
		t.Fatalf("block out-of-range: want 6002, got %v", resp5)
	}
	resp6 := postJSON(t, r, "/api/explorer/tx", map[string]any{"chain": "fabric", "tx_id": "FABRIC-DOESNOTEXIST"})
	if resp6["code"].(float64) != 6002 {
		t.Fatalf("tx unknown: want 6002, got %v", resp6)
	}
}

// TestExplorerNodesSim sim 节点列表：单节点、source=sim 如实标注。
func TestExplorerNodesSim(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/nodes", map[string]any{"chain": "irita"})
	if resp["code"].(float64) != 0 {
		t.Fatalf("nodes: %v", resp)
	}
	data := resp["data"].(map[string]any)
	if data["chain"] != "irita" {
		t.Fatalf("chain = %v", data["chain"])
	}
	nodes := data["nodes"].([]any)
	if len(nodes) != 1 {
		t.Fatalf("nodes len = %d, want 1", len(nodes))
	}
	n0 := nodes[0].(map[string]any)
	if n0["name"] != "irita-sim-node0" {
		t.Fatalf("name = %v, want irita-sim-node0", n0["name"])
	}
	if n0["role"] != "sim" || n0["address"] != "in-process" {
		t.Fatalf("role/address = %v / %v", n0["role"], n0["address"])
	}
	if n0["online"] != true {
		t.Fatalf("online = %v, want true", n0["online"])
	}
	if n0["source"] != "sim" {
		t.Fatalf("source = %v, want sim", n0["source"])
	}
}

// noBlockQuerierAdapter 仅满足 ChainAdapter——不实现 BlockQuerier/Resettable/
// TransportUnwrapper，用于验证能力如实降级（2005 +「该链 RPC 不支持…」，绝不拼造数据）。
type noBlockQuerierAdapter struct{}

var _ chainadapter.ChainAdapter = noBlockQuerierAdapter{}

func (noBlockQuerierAdapter) ChainName() string { return "fisco-bcos" }
func (noBlockQuerierAdapter) Health() error     { return nil }
func (noBlockQuerierAdapter) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	return nil, errors.New("fake adapter: write not supported")
}
func (noBlockQuerierAdapter) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	return nil, errors.New("tx not found: " + txID)
}
func (noBlockQuerierAdapter) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	return nil, errors.New("fake adapter: state not supported")
}

// TestExplorerCapabilityDegradation 能力降级是本任务的心脏：适配器不实现
// BlockQuerier → 2005 且 message 含「该链 RPC 不支持」（如实降级，绝不 fake 数据）；
// 未知链/缺参 → 6002；tx 端点走既有 QueryTx 不依赖 BlockQuerier；
// overview 对降级链如实给 0 值（node_count/block_height），mode 按 Resettable 判定为 real。
func TestExplorerCapabilityDegradation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	base := validTestDeps(t)
	fake := noBlockQuerierAdapter{}
	gw := crosschain.NewGateway(base.DB, base.Crypto,
		map[string]chainadapter.ChainAdapter{"fisco-bcos": fake}, base.Audit)
	deps := *base
	deps.Gateway = gw
	deps.Chains = map[string]ChainStatusProvider{"fisco-bcos": fake}
	r, err := NewRouter(&deps)
	if err != nil {
		t.Fatal(err)
	}

	// 块详情：不实现 BlockQuerier → 2005，message 明确「该链 RPC 不支持」
	blk := postJSON(t, r, "/api/explorer/block", map[string]any{"chain": "fisco-bcos", "height": 1})
	if blk["code"].(float64) != 2005 {
		t.Fatalf("block: want code 2005 (capability degradation), got %v", blk)
	}
	if !strings.Contains(blk["message"].(string), "该链 RPC 不支持") {
		t.Fatalf("block: message must contain 「该链 RPC 不支持」, got %q", blk["message"])
	}

	// 块列表 / 节点列表：同 2005 +「不支持」
	for _, tc := range []struct {
		path string
		body map[string]any
	}{
		{"/api/explorer/blocks", map[string]any{"chain": "fisco-bcos"}},
		{"/api/explorer/nodes", map[string]any{"chain": "fisco-bcos"}},
	} {
		resp := postJSON(t, r, tc.path, tc.body)
		if resp["code"].(float64) != 2005 {
			t.Fatalf("%s: want 2005, got %v", tc.path, resp)
		}
		if !strings.Contains(resp["message"].(string), "不支持") {
			t.Fatalf("%s: message must contain 「不支持」, got %q", tc.path, resp["message"])
		}
	}

	// 未知链 → 6002；缺参 → 6002
	unk := postJSON(t, r, "/api/explorer/block", map[string]any{"chain": "solana", "height": 1})
	if unk["code"].(float64) != 6002 {
		t.Fatalf("unknown chain: want 6002, got %v", unk)
	}
	miss := postJSON(t, r, "/api/explorer/nodes", map[string]any{})
	if miss["code"].(float64) != 6002 {
		t.Fatalf("missing chain param: want 6002, got %v", miss)
	}

	// tx 走既有 QueryTx（ChainAdapter 基础能力）：fake 查无 → 6002 资源不存在，而非 2005
	tx := postJSON(t, r, "/api/explorer/tx", map[string]any{"chain": "fisco-bcos", "tx_id": "FISCO-BCOS-DEAD"})
	if tx["code"].(float64) != 6002 {
		t.Fatalf("tx via QueryTx: want 6002, got %v", tx)
	}

	// overview：降级链如实 0 值（绝不拼造），fake 非 Resettable → mode=real
	ov := postJSON(t, r, "/api/explorer/overview", map[string]any{})
	if ov["code"].(float64) != 0 {
		t.Fatalf("overview: %v", ov)
	}
	ovData := ov["data"].(map[string]any)
	if ovData["count"].(float64) != 1 {
		t.Fatalf("overview count = %v, want 1", ovData["count"])
	}
	ch := ovData["chains"].([]any)[0].(map[string]any)
	if ch["node_count"].(float64) != 0 || ch["block_height"].(float64) != 0 {
		t.Fatalf("degraded chain must report honest zeros, got %v", ch)
	}
	if ch["mode"] != "real" {
		t.Fatalf("mode = %v, want real（非 Resettable）", ch["mode"])
	}
	if ch["status"] != "ONLINE" {
		t.Fatalf("status = %v, want ONLINE", ch["status"])
	}
	if ch["name"] != "FISCO BCOS 管理链" {
		t.Fatalf("name = %v", ch["name"])
	}
}
