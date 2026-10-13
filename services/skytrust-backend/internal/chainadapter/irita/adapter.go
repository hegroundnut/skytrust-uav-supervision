// Package irita 证照链（IRITA）适配器：迁移稳定层——薄委托 ChainTransport，
// 附加链身份与已注册合约白名单校验（P6-R3）。IRITA 无「合约部署」概念——
// 逻辑合约 license_registry 由内置 record 模块承载（设计 §6.4，映射说明见
// contracts/irita/）。
package irita

import (
	"context"
	"fmt"

	"skytrust-backend/internal/chainadapter"
)

// ChainName 证照链链名。
const ChainName = "irita"

// RegisteredContracts 证照链已注册合约白名单（license_registry 由 record 模块承载，无独立合约工件）。
var RegisteredContracts = map[string]bool{"license_registry": true}

// Adapter 证照链适配器：sim 模式包 inproc 传输，real 模式包 SDK 传输（迁移缝）。
type Adapter struct{ t chainadapter.ChainTransport }

func New(t chainadapter.ChainTransport) *Adapter { return &Adapter{t: t} }

func (a *Adapter) ChainName() string { return ChainName }
func (a *Adapter) Health() error     { return a.t.Health() }

func (a *Adapter) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	if !RegisteredContracts[contract] {
		return nil, fmt.Errorf("irita: contract %q not registered (allowed: license_registry; see contracts/irita/)", contract)
	}
	return a.t.SubmitTx(ctx, contract, method, params)
}

func (a *Adapter) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	return a.t.QueryTx(ctx, txID)
}

func (a *Adapter) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	return a.t.QueryState(ctx, contract, key)
}

var _ chainadapter.ChainAdapter = (*Adapter)(nil)
