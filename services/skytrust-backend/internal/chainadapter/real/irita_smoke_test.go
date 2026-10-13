//go:build realchains

package real

import (
	"context"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/chainadapter"
	realirita "skytrust-backend/internal/chainadapter/real/irita"
)

// TestIritaRealSmoke —— Task 5 Step 4 真链冒烟（隔离：不触生产 :8080/:15001，只读
// 浸泡链 RPC + **一次性**授权写）。写段仅在显式 IRITA_SMOKE_WRITE=1 时执行——用户
// 对 Task 5 授权恰好一条冒烟 record（业务键 SMOKE/task5-<ts>），本开关防止任何误重跑
// 重复落账。浸泡链节点绝不重启/重配（P6-R6 同源红线）。
//
// 运行（模块根 services/skytrust-backend）：
//
//	set -a; source .env; source ../../scripts/env.sh; set +a
//	export IRITA_CLI_BIN="$IRITA_BIN"          # env.sh 导出 IRITA_BIN（.env 命名归 Task 12）
//	export IRITA_ANCHOR_TXID=$(cat /opt/irita/net/ANCHOR_TXID.txt)
//	go test -tags realchains ./internal/chainadapter/real/ -run TestIrita -v
//	# 一次性写（仅此一次）：IRITA_SMOKE_WRITE=1 go test …（同上）
func TestIritaRealSmoke(t *testing.T) {
	if testing.Short() {
		t.Skip("requires live irita chain (skipped in -short)")
	}
	tr, err := realirita.NewFactory()
	if err != nil {
		t.Skipf("irita real transport not configured: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	bq, ok := tr.(chainadapter.BlockQuerier)
	if !ok {
		t.Fatal("irita transport must implement BlockQuerier (Task 5 C-2)")
	}
	lat := func(name string, fn func() error) {
		t.Helper()
		t0 := time.Now()
		if err := fn(); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		t.Logf(">>> %-28s = %6dms  PASS", name, time.Since(t0).Milliseconds())
	}

	// 0) 浸泡链健康快照（before）——绝不干预节点，只读 /status 高度。
	hBefore, err := bq.GetBlockHeight(ctx)
	if err != nil {
		t.Fatalf("soak height before: %v", err)
	}
	t.Logf("soak height BEFORE = %d", hBefore)

	// 1) Health（/status catching_up=false）
	lat("Health", func() error { return tr.Health() })

	// 2) QueryTx（启用锚点交易，/opt/irita/net/ANCHOR_TXID.txt）
	anchor := strings.TrimSpace(os.Getenv("IRITA_ANCHOR_TXID"))
	if anchor == "" {
		if b, rerr := os.ReadFile("/opt/irita/net/ANCHOR_TXID.txt"); rerr == nil {
			anchor = strings.TrimSpace(string(b))
		}
	}
	if anchor == "" {
		t.Fatal("anchor txid unavailable (set IRITA_ANCHOR_TXID or /opt/irita/net/ANCHOR_TXID.txt)")
	}
	var anchorReceipt *chainadapter.TxReceipt
	lat("QueryTx(anchor)", func() error {
		rc, qerr := tr.QueryTx(ctx, anchor)
		if qerr != nil {
			return qerr
		}
		if rc.Status != 0 {
			return fmt.Errorf("anchor tx status=%d (want 0)", rc.Status)
		}
		if rc.BlockNum == 0 || strings.ToUpper(rc.TxID) != strings.ToUpper(anchor) {
			return fmt.Errorf("anchor receipt mismatch: %+v", rc)
		}
		anchorReceipt = rc
		t.Logf("    anchor: height=%d status=0 record_id=%s ts=%s",
			rc.BlockNum, rc.Ret, rc.Timestamp.Format(time.RFC3339))
		return nil
	})

	// 3) QueryState：record-id（锚点 record）/ txhash（同值收敛）/ 业务键（明示负例）
	recordID := string(anchorReceipt.Ret)
	if len(recordID) != 64 {
		t.Fatalf("anchor create_record event must yield 64-hex record_id, got %q", recordID)
	}
	var byRecordID, byTxHash []byte
	lat("QueryState(record-id)", func() error {
		v, qerr := tr.QueryState(ctx, "license_registry", recordID)
		if qerr != nil {
			return qerr
		}
		if len(v) == 0 {
			return fmt.Errorf("record %s: empty value", recordID)
		}
		byRecordID = v
		return nil
	})
	if !strings.Contains(string(byRecordID), strings.ToUpper(anchor)) {
		t.Errorf("record protobuf must embed the writing txhash %s, got %q", anchor, string(byRecordID))
	}
	if !strings.Contains(string(byRecordID), "skytrust://license_registry/") {
		t.Errorf("record must carry the Content.URI, got %q", string(byRecordID))
	}
	lat("QueryState(txhash)", func() error {
		v, qerr := tr.QueryState(ctx, "license_registry", anchor)
		if qerr != nil {
			return qerr
		}
		byTxHash = v
		return nil
	})
	if string(byRecordID) != string(byTxHash) {
		t.Error("record-id path and txhash path must converge to the same Record bytes")
	}
	// 业务键形态 → 明示错误（record 模块无二级索引，Task 1 校准 §4；绝不静默）
	if _, qerr := tr.QueryState(ctx, "license_registry", "LICENSE_CHAIN_ANCHOR/skytrust-license"); qerr == nil ||
		!strings.Contains(qerr.Error(), "业务键反查") {
		t.Fatalf("business-key QueryState must fail explicitly, got %v", qerr)
	} else {
		t.Logf(">>> %-28s         PASS  (%v)", "QueryState(业务键负例)", qerr)
	}

	// 4) BlockQuerier 读冒烟（explorer 数据源）
	var latest chainadapter.BlockInfo
	lat("GetBlockByHeight(latest)", func() error {
		b, qerr := bq.GetBlockByHeight(ctx, hBefore)
		if qerr != nil {
			return qerr
		}
		if b.Height != hBefore || len(b.Hash) != 64 {
			return fmt.Errorf("block mismatch: %+v", b)
		}
		latest = *b
		return nil
	})
	t.Logf("    latest block: hash=%s time=%s txs=%d proposer=%s",
		latest.Hash, latest.Time, latest.TxCount, latest.Proposer)
	lat("ListRecentBlocks(5)", func() error {
		bs, qerr := bq.ListRecentBlocks(ctx, 5)
		if qerr != nil {
			return qerr
		}
		if len(bs) == 0 {
			return fmt.Errorf("empty recent blocks at height %d", hBefore)
		}
		for i := 1; i < len(bs); i++ {
			if bs[i-1].Height <= bs[i].Height {
				return fmt.Errorf("blocks not new→old: %d then %d", bs[i-1].Height, bs[i].Height)
			}
		}
		return nil
	})
	var nodes []chainadapter.NodeInfo
	lat("ListNodes", func() error {
		ns, qerr := bq.ListNodes(ctx)
		if qerr != nil {
			return qerr
		}
		if len(ns) == 0 {
			return fmt.Errorf("no nodes reported")
		}
		nodes = ns
		return nil
	})
	for _, n := range nodes {
		t.Logf("    node: name=%s role=%s addr=%s online=%v source=%s", n.Name, n.Role, n.Address, n.Online, n.Source)
		if n.Source != "rpc" {
			t.Errorf("irita nodes must be source=rpc (got %q)", n.Source)
		}
	}

	// 5) 一次性授权写（IRITA_SMOKE_WRITE=1 显式门；写后链上读回闭环）
	if os.Getenv("IRITA_SMOKE_WRITE") == "1" {
		bizKey := fmt.Sprintf("SMOKE/task5-%d", time.Now().Unix())
		var smoke *chainadapter.TxReceipt
		lat("SubmitTx(smoke record)", func() error {
			rc, serr := tr.SubmitTx(ctx, "license_registry", "CrosschainSubmit", map[string]any{
				"cross_tx_id": bizKey, "message_type": "SMOKE_TASK5", "business_id": bizKey,
			})
			if serr != nil {
				return serr
			}
			if rc.Status != 0 {
				return fmt.Errorf("smoke tx status=%d (want 0)", rc.Status)
			}
			if _, herr := hex.DecodeString(rc.TxID); herr != nil || len(rc.TxID) != 64 {
				return fmt.Errorf("smoke txid not 64-hex: %q", rc.TxID)
			}
			smoke = rc
			t.Logf("    smoke: biz_key=%s txhash=%s height=%d record_id=%s", bizKey, rc.TxID, rc.BlockNum, rc.Ret)
			return nil
		})
		lat("QueryState(smoke record-id)", func() error {
			v, qerr := tr.QueryState(ctx, "license_registry", string(smoke.Ret))
			if qerr != nil {
				return qerr
			}
			if !strings.Contains(string(v), strings.ToUpper(smoke.TxID)) {
				return fmt.Errorf("smoke record must embed txhash %s", smoke.TxID)
			}
			if !strings.Contains(string(v), "SMOKE_task5_") {
				return fmt.Errorf("smoke record URI must carry sanitized business key, got %q", string(v))
			}
			return nil
		})
	} else {
		t.Log("IRITA_SMOKE_WRITE != 1 → 写段跳过（用户授权恰好一条冒烟 record；已执行过一次即不再重跑）")
	}

	// 6) 浸泡链健康快照（after）
	hAfter, err := bq.GetBlockHeight(ctx)
	if err != nil {
		t.Fatalf("soak height after: %v", err)
	}
	if err := tr.Health(); err != nil {
		t.Fatalf("soak health after: %v", err)
	}
	t.Logf("soak heights: BEFORE=%d AFTER=%d (Δ=%d, 浸泡出块 ~1.5s/块自然增长)", hBefore, hAfter, hAfter-hBefore)
}
