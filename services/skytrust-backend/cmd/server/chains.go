package main

import (
	"fmt"
	"time"

	"skytrust-backend/internal/chainadapter"
	adpchainmaker "skytrust-backend/internal/chainadapter/chainmaker"
	adpfabric "skytrust-backend/internal/chainadapter/fabric"
	adpfisco "skytrust-backend/internal/chainadapter/fisco"
	adirita "skytrust-backend/internal/chainadapter/irita"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/config"
)

// simLatencies 保持 Plan 2-5 固化的 inproc 时延契约（验收 p95<1000ms 依赖低延迟模拟链）。
var simLatencies = map[string]time.Duration{
	"fabric":     10 * time.Millisecond,
	"chainmaker": 5 * time.Millisecond,
	"fisco-bcos": 10 * time.Millisecond,
	"irita":      10 * time.Millisecond,
}

// buildChains 按 CHAIN_MODE 与分链覆盖（P6-R*）构建四链适配器与可重置表。
// sim 模式：inproc 传输（sim.Chain）包按链适配器，传输进 resets（demo/reset 用）。
// real 模式：取注册表中的真实 SDK 传输；未注册 → fail-fast 显式错误（指向
// docs/real-chain-migration.md），绝不静默仿真冒充真实链（验收诚实性 R0'）。
// 真实链不进 resets——Seeder 绝不重置真实链（P6-R6）。
func buildChains(cfg *config.Config) (map[string]chainadapter.ChainAdapter, map[string]chainadapter.Resettable, error) {
	adapters := make(map[string]chainadapter.ChainAdapter, 4)
	resets := make(map[string]chainadapter.Resettable, 4)
	for _, name := range []string{"fabric", "chainmaker", "fisco-bcos", "irita"} {
		mode := cfg.ChainModeFor(name)
		switch mode {
		case "sim":
			s := sim.New(name, sim.WithLatency(simLatencies[name]))
			a, err := wrapAdapter(name, s)
			if err != nil {
				return nil, nil, err
			}
			adapters[name] = a
			resets[name] = s
		case "real":
			t, err := chainadapter.NewRealTransport(name)
			if err != nil {
				return nil, nil, err
			}
			a, werr := wrapAdapter(name, t)
			if werr != nil {
				return nil, nil, werr
			}
			adapters[name] = a
		default:
			return nil, nil, fmt.Errorf("chain %s: unknown mode %q (want sim|real)", name, mode)
		}
	}
	return adapters, resets, nil
}

// wrapAdapter 按链名套对应的迁移稳定层适配器（P6-R3 白名单在此生效）。
// 未知链名显式报错——绝不静默兜底到任一链适配器。
func wrapAdapter(name string, t chainadapter.ChainTransport) (chainadapter.ChainAdapter, error) {
	switch name {
	case "chainmaker":
		return adpchainmaker.New(t), nil
	case "fabric":
		return adpfabric.New(t), nil
	case "fisco-bcos":
		return adpfisco.New(t), nil
	case "irita":
		return adirita.New(t), nil
	default:
		return nil, fmt.Errorf("unknown chain %q", name)
	}
}
