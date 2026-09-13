package sim

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/crypto"
)

func TestSubmitAndQueryTx(t *testing.T) {
	c := New("chainmaker")
	rc, err := c.SubmitTx(context.Background(), "regulatory_record", "RegisterReceive",
		map[string]any{"business_id": "MISSION-2026-001"})
	if err != nil {
		t.Fatal(err)
	}
	if rc.Status != 0 || rc.BlockNum != 1 || rc.TxID == "" {
		t.Errorf("bad receipt: %+v", rc)
	}
	if !strings.HasPrefix(rc.TxID, "CHAINMAKER-") {
		t.Errorf("txid prefix: %s", rc.TxID)
	}
	got, err := c.QueryTx(context.Background(), rc.TxID)
	if err != nil || got.TxID != rc.TxID {
		t.Errorf("query tx failed: %v", err)
	}
	if _, err := c.QueryTx(context.Background(), "UNKNOWN-TX"); err == nil {
		t.Error("unknown tx must error")
	}
	// 第二笔区块号递增
	rc2, _ := c.SubmitTx(context.Background(), "regulatory_record", "RegisterRelay", map[string]any{"x": 1})
	if rc2.BlockNum != 2 {
		t.Errorf("block num = %d", rc2.BlockNum)
	}
}

func TestDeterministicTxID(t *testing.T) {
	c1 := New("fabric")
	c2 := New("fabric")
	p := map[string]any{"a": 1}
	r1, _ := c1.SubmitTx(context.Background(), "cc", "m", p)
	r2, _ := c2.SubmitTx(context.Background(), "cc", "m", p)
	if r1.TxID != r2.TxID {
		t.Error("same input+block should give same simulated txid")
	}
}

func TestFailNext(t *testing.T) {
	c := New("fisco-bcos", WithFailNext("IssuePass", 2))
	for i := 0; i < 2; i++ {
		rc, err := c.SubmitTx(context.Background(), "FlightPass", "IssuePass", nil)
		if err == nil && rc.Status == 0 {
			t.Errorf("call %d should fail", i)
		}
	}
	rc, err := c.SubmitTx(context.Background(), "FlightPass", "IssuePass", nil)
	if err != nil || rc.Status != 0 {
		t.Error("after failures exhausted, must succeed")
	}
}

func TestFailRateAllFail(t *testing.T) {
	c := New("fabric", WithFailRate(1.0))
	_, err := c.SubmitTx(context.Background(), "cc", "m", nil)
	rc2, err2 := c.SubmitTx(context.Background(), "cc", "m", nil)
	// p=1.0: 每笔都失败（error 或 Status!=0）
	if err == nil && (err2 == nil && rc2.Status == 0) {
		t.Error("fail rate 1.0 must fail every tx")
	}
}

func TestLatency(t *testing.T) {
	c := New("chainmaker", WithLatency(30*time.Millisecond))
	start := time.Now()
	c.SubmitTx(context.Background(), "cc", "m", nil)
	if elapsed := time.Since(start); elapsed < 25*time.Millisecond {
		t.Errorf("latency not applied: %v", elapsed)
	}
}

func TestPutQueryState(t *testing.T) {
	c := New("fabric")
	c.PutState("operator-cc", "UAV-A-001", []byte(`{"status":"REGISTERED"}`))
	v, err := c.QueryState(context.Background(), "operator-cc", "UAV-A-001")
	if err != nil || string(v) != `{"status":"REGISTERED"}` {
		t.Errorf("state query: %s %v", v, err)
	}
	if _, err := c.QueryState(context.Background(), "operator-cc", "NOPE"); err == nil {
		t.Error("missing key must error")
	}
}

func TestHealthAndChainName(t *testing.T) {
	c := New("fabric")
	if c.ChainName() != "fabric" || c.Health() != nil {
		t.Error("bad name/health")
	}
}

func TestResetState(t *testing.T) {
	c := New("chainmaker", WithFailNext("IssuePass", 3))
	rc, err := c.SubmitTx(context.Background(), "cc", "m", map[string]any{"a": 1})
	if err != nil {
		t.Fatal(err)
	}
	c.PutState("cc", "k", []byte("v"))

	c.ResetState()

	// 旧回执已清除
	if _, err := c.QueryTx(context.Background(), rc.TxID); err == nil {
		t.Error("receipts must be cleared after ResetState")
	}
	// 旧 KV 已清除
	if _, err := c.QueryState(context.Background(), "cc", "k"); err == nil {
		t.Error("state must be cleared after ResetState")
	}
	// failNext 已清除：故障注入方法立即成功
	rf, err := c.SubmitTx(context.Background(), "FlightPass", "IssuePass", nil)
	if err != nil || rf.Status != 0 {
		t.Errorf("failNext must be cleared: %+v %v", rf, err)
	}
	// 区块高度归零后重新计数：上一笔为 1，下一笔为 2
	rm, err := c.SubmitTx(context.Background(), "cc", "m", map[string]any{"a": 1})
	if err != nil {
		t.Fatal(err)
	}
	if rf.BlockNum != 1 || rm.BlockNum != 2 {
		t.Errorf("blockNum must restart at 1: got %d then %d", rf.BlockNum, rm.BlockNum)
	}
}

func TestFailedReceiptIsStored(t *testing.T) {
	c := New("fabric", WithFailNext("BadMethod", 1))
	rc, err := c.SubmitTx(context.Background(), "cc", "BadMethod", map[string]any{"x": 1})
	if err != nil {
		t.Fatal(err)
	}
	if rc.Status != 1 {
		t.Fatalf("expected failed receipt, got status %d", rc.Status)
	}
	got, err := c.QueryTx(context.Background(), rc.TxID)
	if err != nil {
		t.Fatalf("failed receipt must be queryable: %v", err)
	}
	if got.Status != 1 || got.TxID != rc.TxID {
		t.Errorf("receipt mismatch: %+v", got)
	}
}

func TestTxIDDerivationIsSM3(t *testing.T) {
	c := New("fabric")
	params := map[string]any{"uav_id": "UAV-A-001", "op": "register"}
	rc, err := c.SubmitTx(context.Background(), "operator_business", "RegisterUAV", params)
	if err != nil || rc.Status != 0 {
		t.Fatalf("submit failed: %v %+v", err, rc)
	}
	canonical, _ := crypto.CanonicalJSON(params)
	// 第一笔交易 blockNum=1；派生输入与 txID() 逐字一致（P6-R4）
	want := "FABRIC-" + crypto.SM3Hex([]byte(fmt.Sprintf("%s|%s|%s|%s|%d",
		"fabric", "operator_business", "RegisterUAV", canonical, 1)))[:32]
	if rc.TxID != want {
		t.Errorf("TxID not SM3-derived:\n got %s\nwant %s", rc.TxID, want)
	}
	if !strings.HasPrefix(rc.TxID, "FABRIC-") || len(rc.TxID) != len("FABRIC-")+32 {
		t.Errorf("prefix/length contract broken: %s", rc.TxID)
	}
}

func TestChainSatisfiesChainTransport(t *testing.T) {
	var tr chainadapter.ChainTransport = New("chainmaker")
	if err := tr.Health(); err != nil {
		t.Fatalf("health: %v", err)
	}
}
