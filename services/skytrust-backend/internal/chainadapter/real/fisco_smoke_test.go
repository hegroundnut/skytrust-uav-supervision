//go:build realchains

package real

import (
	"context"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/chainadapter"
	realfisco "skytrust-backend/internal/chainadapter/real/fisco"
)

// TestFiscoRealBlockSmoke —— FISCO 块浏览真链冒烟（**只读，零链上写入**）。
// 背景（version-matrix §12.11）：§11.4-① 登记的 getBlockByNumber 怪癖仅为 JSON-RPC
// curl 面缺陷（该面甚至缺 getTransactionByHash 方法）；后端一直使用的 go-sdk v3
// websocket 通道上块查询完全可用（块 100/181 按号回真实数据、收据可查）。
// 本冒烟钉死：SDK 通道块详情/块列表真实、高度回显、创世块 0 拒绝（节点对 0 号
// 返回合成应答——哈希与块 1 parentInfo 链上承诺的父哈希不符，非账本数据，绝不透出）。
//
// 运行（模块根 services/skytrust-backend，真链就绪时）：
//
//	set -a; source .env; source ../../scripts/env.sh; set +a
//	CGO_ENABLED=1 go test -tags realchains ./internal/chainadapter/real/ -run TestFiscoRealBlockSmoke -v
func TestFiscoRealBlockSmoke(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live fisco chain (skipped in -short)")
	}
	tr, err := realfisco.NewFactory()
	if err != nil {
		t.Skipf("fisco real transport not configured: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	bq, ok := tr.(chainadapter.BlockQuerier)
	if !ok {
		t.Fatal("fisco transport must implement BlockQuerier")
	}

	height, err := bq.GetBlockHeight(ctx)
	if err != nil {
		t.Fatalf("GetBlockHeight: %v", err)
	}
	if height < 1 {
		t.Fatalf("chain height %d < 1 (deploy tx lives in block 1)", height)
	}
	t.Logf(">>> height = %d", height)

	// 1) 块详情：高度必须回显请求高度（钉死「恒返块 1」怪癖不复存在于 SDK 通道）。
	blk, err := bq.GetBlockByHeight(ctx, height)
	if err != nil {
		t.Fatalf("GetBlockByHeight(%d): %v", height, err)
	}
	if blk.Height != height {
		t.Fatalf("GetBlockByHeight(%d) echoed height %d — blockNumber must be honored", height, blk.Height)
	}
	if len(blk.Hash) != 66 || !strings.HasPrefix(blk.Hash, "0x") {
		t.Fatalf("block %d hash malformed: %q", height, blk.Hash)
	}
	if _, perr := time.Parse("2006-01-02 15:04:05.000", blk.Time); perr != nil {
		t.Fatalf("block %d time %q not timex format: %v", height, blk.Time, perr)
	}
	if blk.Proposer == "" {
		t.Fatalf("block %d proposer empty (sealer nodeID expected)", height)
	}
	if blk.TxCount != len(blk.TxIDs) {
		t.Fatalf("block %d tx_count %d != len(tx_ids) %d", height, blk.TxCount, len(blk.TxIDs))
	}
	for _, id := range blk.TxIDs {
		if len(id) != 66 || !strings.HasPrefix(id, "0x") {
			t.Fatalf("block %d tx id malformed: %q", height, id)
		}
	}
	t.Logf(">>> block(%d) hash=%s… time=%s proposer=%.16s… txs=%d PASS",
		height, blk.Hash[:12], blk.Time, blk.Proposer, blk.TxCount)

	// 2) 块 1 永含部署交易（账本不可变，§11 部署实录）→ TxCount ≥ 1。
	b1, err := bq.GetBlockByHeight(ctx, 1)
	if err != nil {
		t.Fatalf("GetBlockByHeight(1): %v", err)
	}
	if b1.Height != 1 || b1.TxCount < 1 || len(b1.TxIDs) < 1 {
		t.Fatalf("block 1 must carry the deploy tx (immutable ledger): height=%d txs=%d", b1.Height, b1.TxCount)
	}
	t.Logf(">>> block(1) txs=%d first=%s… PASS", b1.TxCount, b1.TxIDs[0][:12])

	// 3) 创世块 0 拒绝：节点对 0 号返回合成应答（哈希 ≠ 块 1 parentInfo 承诺的父哈希），
	//    非账本数据 —— 绝不透出（无假数据红线）。
	if _, err := bq.GetBlockByHeight(ctx, 0); err == nil {
		t.Fatal("height 0 must be rejected: node synthesizes a non-ledger block-0 response")
	}

	// 4) 最近块列表：新→旧严格降序、首元素 = 当前高度、绝不含 0 号。
	list, err := bq.ListRecentBlocks(ctx, 5)
	if err != nil {
		t.Fatalf("ListRecentBlocks(5): %v", err)
	}
	if len(list) == 0 {
		t.Fatal("ListRecentBlocks on a height>=1 chain must return blocks")
	}
	for i, b := range list {
		if want := height - uint64(i); b.Height != want {
			t.Fatalf("list[%d].Height = %d, want %d (new→old, contiguous)", i, b.Height, want)
		}
		if b.Height < 1 {
			t.Fatalf("list[%d] contains synthesized block 0", i)
		}
		if b.Hash == "" || b.Time == "" {
			t.Fatalf("list[%d] (h=%d) missing hash/time", i, b.Height)
		}
	}
	t.Logf(">>> ListRecentBlocks(5) → %d blocks, %d→%d PASS", len(list), list[0].Height, list[len(list)-1].Height)

	// 5) limit ≤ 0 防御 → 空列表（端点契约钳制在调用方，此处防御性一致）。
	if l0, err := bq.ListRecentBlocks(ctx, 0); err != nil || len(l0) != 0 {
		t.Fatalf("ListRecentBlocks(0) = %d blocks, %v; want empty, nil", len(l0), err)
	}
}
