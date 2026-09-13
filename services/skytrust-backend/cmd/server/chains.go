package main

import (
	"fmt"
	"time"

	"skytrust-backend/internal/chainadapter"
	adpchainmaker "skytrust-backend/internal/chainadapter/chainmaker"
	adpfabric "skytrust-backend/internal/chainadapter/fabric"
	adpfisco "skytrust-backend/internal/chainadapter/fisco"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/config"
)

// simLatencies 保持 Plan 2-5 固化的 inproc 时延契约（验收 p95<1000ms 依赖低延迟模拟链）。
var simLatencies = map[string]time.Duration{
	"fabric":     10 * time.Millisecond,
	"chainmaker": 5 * time.Millisecond,
	"fisco-bcos": 10 * time.Millisecond,
}

// buildChains 按 CHAIN_MODE 与分链覆盖（P6-R*）构建三链适配器与可重置表。
// sim 模式：inproc 传输（sim.Chain）包按链适配器，传输进 resets（demo/reset 用）。
// real 模式：取注册表中的真实 SDK 传输；未注册 → fail-fast 显式错误（指向
// docs/real-chain-migration.md），绝不静默仿真冒充真实链（验收诚实性 R0'）。
// 真实链不进 resets——Seeder 绝不重置真实链（P6-R6）。
func buildChains(cfg *config.Config) (map[string]chainadapter.ChainAdapter, map[string]chainadapter.Resettable, error) {
	adapters := make(map[string]chainadapter.ChainAdapter, 3)
	resets := make(map[string]chainadapter.Resettable, 3)
	for _, name := range []string{"fabric", "chainmaker", "fisco-bcos"} {
		mode := cfg.ChainModeFor(name)
		switch mode {
		case "sim":
			s := sim.New(name, sim.WithLatency(simLatencies[name]))
			adapters[name] = wrapAdapter(name, s)
			resets[name] = s
		case "real":
			t, err := chainadapter.NewRealTransport(name)
			if err != nil {
				return nil, nil, err
			}
			adapters[name] = wrapAdapter(name, t)
		default:
			return nil, nil, fmt.Errorf("chain %s: unknown mode %q (want sim|real)", name, mode)
		}
	}
	return adapters, resets, nil
}

// wrapAdapter 按链名套对应的迁移稳定层适配器（P6-R3 白名单在此生效）。
func wrapAdapter(name string, t chainadapter.ChainTransport) chainadapter.ChainAdapter {
	switch name {
	case "chainmaker":
		return adpchainmaker.New(t)
	case "fabric":
		return adpfabric.New(t)
	default: // fisco-bcos
		return adpfisco.New(t)
	}
}
