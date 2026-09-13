package main

import (
	"context"
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
	cfg := &config.Config{ChainMode: "sim", FabricMode: "real"}
	_, _, err := buildChains(cfg)
	if err == nil || !strings.Contains(err.Error(), `"fabric"`) {
		t.Fatalf("only fabric should fail fast: %v", err)
	}
	// 注册 fake real 传输后，同一 cfg 构建成功且该链不再 Resettable（P6-R6）
	chainadapter.RegisterRealTransport("fabric", func() (chainadapter.ChainTransport, error) {
		return fakeReal{}, nil
	})
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
