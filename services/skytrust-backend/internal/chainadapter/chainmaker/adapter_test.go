package chainmaker

import (
	"context"
	"strings"
	"testing"

	"skytrust-backend/internal/chainadapter"
)

type recTransport struct {
	contract, method string
	calls            int
}

func (r *recTransport) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	r.contract, r.method, r.calls = contract, method, r.calls+1
	return &chainadapter.TxReceipt{TxID: "CHAINMAKER-T1", Status: 0}, nil
}
func (r *recTransport) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	return &chainadapter.TxReceipt{TxID: txID, Status: 0}, nil
}
func (r *recTransport) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	return []byte(contract + "/" + key), nil
}
func (r *recTransport) Health() error { return nil }

func TestAdapterChainNameAndDelegation(t *testing.T) {
	tr := &recTransport{}
	a := New(tr)
	var _ chainadapter.ChainAdapter = a
	if a.ChainName() != "chainmaker" {
		t.Fatalf("chain name: %s", a.ChainName())
	}
	rc, err := a.SubmitTx(context.Background(), "regulatory_record", "RegisterReceive", map[string]any{"k": "v"})
	if err != nil || rc.TxID != "CHAINMAKER-T1" || tr.calls != 1 || tr.method != "RegisterReceive" {
		t.Fatalf("delegation broken: %+v %v calls=%d", rc, err, tr.calls)
	}
	if err := a.Health(); err != nil {
		t.Fatalf("health: %v", err)
	}
	if _, err := a.QueryTx(context.Background(), "X"); err != nil {
		t.Fatalf("querytx: %v", err)
	}
	v, err := a.QueryState(context.Background(), "any_contract", "k")
	if err != nil || string(v) != "any_contract/k" {
		t.Fatalf("querystate must passthrough (P6-R3): %s %v", v, err)
	}
}

func TestAdapterRejectsUnregisteredContract(t *testing.T) {
	tr := &recTransport{}
	a := New(tr)
	_, err := a.SubmitTx(context.Background(), "not_a_contract", "M", nil)
	if err == nil {
		t.Fatal("unregistered contract must be rejected")
	}
	if !strings.Contains(err.Error(), "not registered") || !strings.Contains(err.Error(), "contracts/chainmaker/") {
		t.Errorf("error must name the allowlist source: %v", err)
	}
	if tr.calls != 0 {
		t.Error("rejected call must not reach transport")
	}
}

func TestRegisteredContractsMatchCodifiedConstants(t *testing.T) {
	for _, c := range []string{"regulatory_record", "crosschain_trace", "identity_mapping", "regulatory_authorization", "audit_record"} {
		if !RegisteredContracts[c] {
			t.Errorf("missing registered contract %q", c)
		}
	}
}
