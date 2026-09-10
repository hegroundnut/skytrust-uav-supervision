package sim

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"time"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/crypto"
)

type Chain struct {
	name       string
	latency    time.Duration
	failRate   float64
	failNext   map[string]int
	mu         sync.Mutex
	blockNum   uint64
	txCount    uint64
	receipts   map[string]*chainadapter.TxReceipt
	state      map[string][]byte
}

type Option func(*Chain)

func WithLatency(d time.Duration) Option  { return func(c *Chain) { c.latency = d } }
func WithFailRate(p float64) Option       { return func(c *Chain) { c.failRate = p } }
func WithFailNext(method string, n int) Option {
	return func(c *Chain) { c.failNext[method] = n }
}

func New(name string, opts ...Option) *Chain {
	c := &Chain{
		name:     name,
		failNext: map[string]int{},
		receipts: map[string]*chainadapter.TxReceipt{},
		state:    map[string][]byte{},
	}
	for _, o := range opts {
		o(c)
	}
	return c
}

func (c *Chain) ChainName() string { return c.name }
func (c *Chain) Health() error     { return nil }

func (c *Chain) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.latency > 0 {
		time.Sleep(c.latency)
	}
	c.txCount++
	c.blockNum++

	// 故障判定：FailNext 优先，其次 failRate（确定性：txCount*大质数 % 1000 < p*1000）
	if n, ok := c.failNext[method]; ok && n > 0 {
		c.failNext[method] = n - 1
		return &chainadapter.TxReceipt{
			TxID: c.txID(contract, method, params), BlockNum: c.blockNum,
			Status: 1, Ret: []byte("SIMULATED_FAILURE"), Timestamp: time.Now(),
		}, nil
	}
	if c.failRate > 0 && float64((c.txCount*2654435761)%1000) < c.failRate*1000 {
		return &chainadapter.TxReceipt{
			TxID: c.txID(contract, method, params), BlockNum: c.blockNum,
			Status: 1, Ret: []byte("SIMULATED_FAILURE"), Timestamp: time.Now(),
		}, nil
	}

	rc := &chainadapter.TxReceipt{
		TxID: c.txID(contract, method, params), BlockNum: c.blockNum,
		Status: 0, Ret: []byte(`{"ok":true}`), Timestamp: time.Now(),
	}
	c.receipts[rc.TxID] = rc
	return rc, nil
}

func (c *Chain) txID(contract, method string, params map[string]any) string {
	canonical, _ := crypto.CanonicalJSON(params)
	h := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%s|%s|%d",
		c.name, contract, method, canonical, c.blockNum)))
	return strings.ToUpper(c.name) + "-" + hex.EncodeToString(h[:])[:32]
}

// ResetState 清空链模拟器全部运行时状态：回执、KV 状态、区块高度、交易计数与故障注入计数。
func (c *Chain) ResetState() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.receipts = map[string]*chainadapter.TxReceipt{}
	c.state = map[string][]byte{}
	c.blockNum = 0
	c.txCount = 0
	c.failNext = map[string]int{}
}

func (c *Chain) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	rc, ok := c.receipts[txID]
	if !ok {
		return nil, fmt.Errorf("tx not found: %s", txID)
	}
	return rc, nil
}

func (c *Chain) PutState(contract, key string, val []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.state[contract+"\x00"+key] = val
}

func (c *Chain) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	v, ok := c.state[contract+"\x00"+key]
	if !ok {
		return nil, fmt.Errorf("state not found: %s/%s", contract, key)
	}
	return v, nil
}
