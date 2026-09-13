package main

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/config"
)

func TestBuildChainsSimDefault(t *testing.T) {
	cfg := &config.Config{ChainMode: "sim"}
	adapters, resets, err := buildChains(cfg)
	if err != nil {
		t.Fatalf("sim build: %v", err)
	}
	for _, name := range []string{"fabric", "chainmaker", "fisco-bcos"} {
		a, ok := adapters[name]
		if !ok || a.ChainName() != name {
			t.Fatalf("adapter %s missing or wrong name", name)
		}
		if err := a.Health(); err != nil {
			t.Fatalf("health %s: %v", name, err)
		}
		if _, ok := resets[name]; !ok {
			t.Errorf("sim transport %s must be Resettable", name)
		}
		// 白名单内合约可提交，TxID 前缀契约保持（大写链名）
		contract := map[string]string{"fabric": "operator_business", "chainmaker": "regulatory_record", "fisco-bcos": "uav_management"}[name]
		rc, err := a.SubmitTx(context.Background(), contract, "M", map[string]any{"k": "v"})
		if err != nil || rc.Status != 0 {
			t.Fatalf("submit %s: %v %+v", name, err, rc)
		}
		wantPrefix := strings.ToUpper(name) + "-"
		if !strings.HasPrefix(rc.TxID, wantPrefix) {
			t.Errorf("txid prefix %s: %s", wantPrefix, rc.TxID)
		}
	}
}

func TestBuildChainsRealFailsFastWithoutSDK(t *testing.T) {
	cfg := &config.Config{ChainMode: "real"}
	_, _, err := buildChains(cfg)
	if err == nil {
		t.Fatal("real mode without registered transport must fail fast")
	}
	if !strings.Contains(err.Error(), "docs/real-chain-migration.md") {
		t.Errorf("error must point to migration guide: %v", err)
	}
}

func TestBuildChainsPerChainOverride(t *testing.T) {
	// 注册表无注销 API，-count>1 时首轮注册会驻留：每轮开始统一解除武装，
	// 保证各轮观察到的行为一致（先 fail-fast 报错，武装后构建成功）。
	fabricRealArmed = false
	cfg := &config.Config{ChainMode: "sim", FabricMode: "real"}
	_, _, err := buildChains(cfg)
	if err == nil || !strings.Contains(err.Error(), `"fabric"`) {
		t.Fatalf("only fabric should fail fast: %v", err)
	}
	// 注册 fake real 传输后，同一 cfg 构建成功且该链不再 Resettable（P6-R6）
	chainadapter.RegisterRealTransport("fabric", fabricRealFactory)
	fabricRealArmed = true
	adapters, resets, err := buildChains(cfg)
	if err != nil {
		t.Fatalf("with registered transport: %v", err)
	}
	if adapters["fabric"] == nil || adapters["fabric"].ChainName() != "fabric" {
		t.Fatal("fabric adapter missing")
	}
	if _, ok := resets["fabric"]; ok {
		t.Error("real transport must NOT be Resettable")
	}
	if _, ok := resets["chainmaker"]; !ok {
		t.Error("sim chains stay Resettable")
	}
}

func TestBuildChainsUnknownMode(t *testing.T) {
	cfg := &config.Config{ChainMode: "sim", FiscoMode: "bogus"}
	_, _, err := buildChains(cfg)
	if err == nil || !strings.Contains(err.Error(), "unknown mode") {
		t.Fatalf("want unknown mode error: %v", err)
	}
}

type fakeReal struct{}

func (fakeReal) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	return &chainadapter.TxReceipt{TxID: "FABRIC-REAL1", Status: 0}, nil
}
func (fakeReal) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	return &chainadapter.TxReceipt{TxID: txID}, nil
}
func (fakeReal) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	return nil, nil
}
func (fakeReal) Health() error { return nil }

// fabricRealArmed 切换 fabricRealFactory 行为：解除武装时返回错误（含 "fabric"
// 并指向迁移指南，与 NewRealTransport 的 fail-fast 契约一致）；武装时返回 fakeReal。
// -count>1 下注册无法撤销，用本开关让每轮测试语义一致（首轮首断言仍走真实的
// 未注册 fail-fast 路径——注册发生在该断言之后）。
var fabricRealArmed bool

func fabricRealFactory() (chainadapter.ChainTransport, error) {
	if !fabricRealArmed {
		return nil, fmt.Errorf("chain %q: no armed real SDK transport in this test phase — see docs/real-chain-migration.md", "fabric")
	}
	return fakeReal{}, nil
}
