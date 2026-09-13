package chainadapter

import (
	"context"
	"strings"
	"testing"
)

type stubTransport struct{ healthErr error }

func (s stubTransport) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*TxReceipt, error) {
	return &TxReceipt{TxID: "STUB-1", Status: 0}, nil
}
func (s stubTransport) QueryTx(ctx context.Context, txID string) (*TxReceipt, error) {
	return &TxReceipt{TxID: txID}, nil
}
func (s stubTransport) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	return []byte("v"), nil
}
func (s stubTransport) Health() error { return s.healthErr }

func TestNewRealTransportUnregisteredFailsFast(t *testing.T) {
	_, err := NewRealTransport("chainmaker")
	if err == nil {
		t.Fatal("unregistered real transport must fail fast")
	}
	if !strings.Contains(err.Error(), "docs/real-chain-migration.md") {
		t.Errorf("error must point to migration guide, got: %v", err)
	}
	if !strings.Contains(err.Error(), "chainmaker") {
		t.Errorf("error must name the chain, got: %v", err)
	}
}

func TestRegisterRealTransportRoundTrip(t *testing.T) {
	name := "test-chain-roundtrip"
	RegisterRealTransport(name, func() (ChainTransport, error) { return stubTransport{}, nil })
	tr, err := NewRealTransport(name)
	if err != nil || tr == nil {
		t.Fatalf("registered transport must resolve: %v", err)
	}
	rc, err := tr.SubmitTx(context.Background(), "c", "m", nil)
	if err != nil || rc.TxID != "STUB-1" {
		t.Fatalf("delegation broken: %+v %v", rc, err)
	}
}

func TestResettableIsNarrow(t *testing.T) {
	var r Resettable = resetStub{}
	r.ResetState()
}

type resetStub struct{ called bool }

func (r resetStub) ResetState() {}
