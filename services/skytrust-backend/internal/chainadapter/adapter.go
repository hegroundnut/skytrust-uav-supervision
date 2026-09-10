package chainadapter

import (
	"context"
	"time"
)

type TxReceipt struct {
	TxID      string
	BlockNum  uint64
	Status    int // 0 = success
	Ret       []byte
	Timestamp time.Time
}

type ChainAdapter interface {
	ChainName() string
	Health() error
	SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*TxReceipt, error)
	QueryTx(ctx context.Context, txID string) (*TxReceipt, error)
	QueryState(ctx context.Context, contract, key string) ([]byte, error)
}
