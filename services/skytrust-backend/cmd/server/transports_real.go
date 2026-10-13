//go:build realchains

package main

import (
	"skytrust-backend/internal/chainadapter"
	realchainmaker "skytrust-backend/internal/chainadapter/real/chainmaker"
	realfabric "skytrust-backend/internal/chainadapter/real/fabric"
	realfisco "skytrust-backend/internal/chainadapter/real/fisco"
)

// 链键与 buildChains（chains.go:32）的字面量逐字一致：
// "fabric" / "chainmaker" / "fisco-bcos" / "irita"（注意 fisco 键含连字符，不是 "fisco"）。
// Task 5 在此追加注册行：chainadapter.RegisterRealTransport("irita", realirita.NewFactory)。
// 在此之前 irita 配 real 模式时保持 NewRealTransport 的 fail-fast（未注册即显式报错，
// 绝不静默仿真冒充真实链）——见 docs/real-chain-migration.md。
func init() {
	chainadapter.RegisterRealTransport("fabric", realfabric.NewFactory)
	chainadapter.RegisterRealTransport("chainmaker", realchainmaker.NewFactory)
	chainadapter.RegisterRealTransport("fisco-bcos", realfisco.NewFactory)
}
