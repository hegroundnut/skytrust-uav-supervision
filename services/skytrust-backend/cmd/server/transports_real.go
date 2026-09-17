//go:build realchains

package main

import (
	"skytrust-backend/internal/chainadapter"
	realchainmaker "skytrust-backend/internal/chainadapter/real/chainmaker"
	realfabric "skytrust-backend/internal/chainadapter/real/fabric"
	realfisco "skytrust-backend/internal/chainadapter/real/fisco"
)

// 链键与 buildChains（chains.go:30）的字面量逐字一致：
// "fabric" / "chainmaker" / "fisco-bcos"（注意 fisco 键含连字符，不是 "fisco"）。
func init() {
	chainadapter.RegisterRealTransport("fabric", realfabric.NewFactory)
	chainadapter.RegisterRealTransport("chainmaker", realchainmaker.NewFactory)
	chainadapter.RegisterRealTransport("fisco-bcos", realfisco.NewFactory)
}
