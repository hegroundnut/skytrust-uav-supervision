package chainadapter

import (
	"context"
	"fmt"
	"sync"
)

// ChainTransport 抽象链后端的网络 I/O——Plan 6 迁移缝（spec §3.1/R1）。
// sim.Chain 结构上满足本接口（inproc 传输）；真实三链迁移时按链实现 SDK 传输
// 并经 RegisterRealTransport 注册。业务代码、13 步协议、状态机零改动。
// 语义契约：回执 Status==0 表示成功；传输级错误返回非 nil error（触发 withRetry）。
type ChainTransport interface {
	SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*TxReceipt, error)
	QueryTx(ctx context.Context, txID string) (*TxReceipt, error)
	QueryState(ctx context.Context, contract, key string) ([]byte, error)
	Health() error
}

// Resettable 为 inproc 传输专属能力：清空运行时状态（demo/reset 用）。
// 真实链后端不实现本接口——Seeder 绝不重置真实链（P6-R6）。
type Resettable interface{ ResetState() }

// TransportFactory 构造某链的真实传输（迁移期按 docs/real-chain-migration.md 注册）。
type TransportFactory func() (ChainTransport, error)

var (
	realMu         sync.RWMutex
	realTransports = map[string]TransportFactory{}
)

// RegisterRealTransport 注册链的真实 SDK 传输工厂。
// hermetic 构建不注册任何工厂（零链 SDK 依赖）。
func RegisterRealTransport(chain string, f TransportFactory) {
	realMu.Lock()
	defer realMu.Unlock()
	realTransports[chain] = f
}

// NewRealTransport 返回已注册的真实传输；未注册 → fail-fast 显式错误。
// 验收诚实性（R0'）：绝不静默仿真冒充真实链；错误文案指向迁移指南。
func NewRealTransport(chain string) (ChainTransport, error) {
	realMu.RLock()
	f, ok := realTransports[chain]
	realMu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("chain %q: CHAIN_MODE=real but no real SDK transport is registered in this build; hermetic builds carry no chain SDKs — see docs/real-chain-migration.md", chain)
	}
	return f()
}
