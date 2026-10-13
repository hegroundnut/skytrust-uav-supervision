package sim

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/timex"
)

// *Chain 结构上满足 ChainTransport（inproc 传输，P6-R1）。
var _ chainadapter.ChainTransport = (*Chain)(nil)
var _ chainadapter.Resettable = (*Chain)(nil)

type Chain struct {
	name     string
	latency  time.Duration
	failRate float64
	failNext map[string]int
	mu       sync.Mutex
	blockNum uint64
	txCount  uint64
	blocks   []chainadapter.BlockInfo // 块记录（BlockQuerier 数据源）：一笔交易一个块，下标 = height-1
	receipts map[string]*chainadapter.TxReceipt
	state    map[string][]byte
}

type Option func(*Chain)

func WithLatency(d time.Duration) Option { return func(c *Chain) { c.latency = d } }
func WithFailRate(p float64) Option      { return func(c *Chain) { c.failRate = p } }
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
		rc := &chainadapter.TxReceipt{
			TxID: c.txID(contract, method, params), BlockNum: c.blockNum,
			Status: 1, Ret: []byte("SIMULATED_FAILURE"), Timestamp: time.Now(),
		}
		c.receipts[rc.TxID] = rc
		c.recordBlock(rc.TxID)
		return rc, nil
	}
	if c.failRate > 0 && float64((c.txCount*2654435761)%1000) < c.failRate*1000 {
		rc := &chainadapter.TxReceipt{
			TxID: c.txID(contract, method, params), BlockNum: c.blockNum,
			Status: 1, Ret: []byte("SIMULATED_FAILURE"), Timestamp: time.Now(),
		}
		c.receipts[rc.TxID] = rc
		c.recordBlock(rc.TxID)
		return rc, nil
	}

	rc := &chainadapter.TxReceipt{
		TxID: c.txID(contract, method, params), BlockNum: c.blockNum,
		Status: 0, Ret: []byte(`{"ok":true}`), Timestamp: time.Now(),
	}
	c.receipts[rc.TxID] = rc
	c.recordBlock(rc.TxID)
	return rc, nil
}

// recordBlock 追加一个 sim 块记录（BlockQuerier 数据源）。调用方须持锁。
// 一笔交易一个块：height=blockNum、hash=SM3("SIM-BLOCK-"+chain+"-"+height)、
// time=timex 格式、proposer=sim 单节点名（与 ListNodes 一致，如实标注仿真来源）。
func (c *Chain) recordBlock(txID string) {
	height := c.blockNum
	// SM3Hex 恒 64 位十六进制——即计划「SM3hex("SIM-BLOCK-"+chain+"-"+height) 前 64 位」的全量输出。
	hash := crypto.SM3Hex([]byte(fmt.Sprintf("SIM-BLOCK-%s-%d", c.name, height)))
	c.blocks = append(c.blocks, chainadapter.BlockInfo{
		Height:   height,
		Hash:     hash,
		Time:     timex.FormatTime(timex.Now()),
		TxCount:  1,
		Proposer: c.name + "-sim-node0",
		TxIDs:    []string{txID},
	})
}

// txID 交易摘要：SM3（商密合规，P6-R4）。前缀契约不变：UPPER(name)-<32 hex>。
func (c *Chain) txID(contract, method string, params map[string]any) string {
	canonical, _ := crypto.CanonicalJSON(params)
	h := crypto.SM3Hex([]byte(fmt.Sprintf("%s|%s|%s|%s|%d",
		c.name, contract, method, canonical, c.blockNum)))
	return strings.ToUpper(c.name) + "-" + h[:32]
}

// ResetState 清空链模拟器全部运行时状态：回执、KV 状态、区块高度、块记录、交易计数与故障注入计数。
func (c *Chain) ResetState() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.receipts = map[string]*chainadapter.TxReceipt{}
	c.state = map[string][]byte{}
	c.blockNum = 0
	c.txCount = 0
	c.blocks = nil
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
