// Package chainmaker 监管链（ChainMaker）适配器：迁移稳定层——薄委托 ChainTransport，
// 附加链身份与已注册合约白名单校验（P6-R3）。合约名对齐 internal/crosschain/policy.go
// 与 internal/regulatory/service.go 固化常量；链码源在 contracts/chainmaker/（部署期校验）。
package chainmaker

import (
	"context"
	"fmt"

	"skytrust-backend/internal/chainadapter"
)

// ChainName 监管链链名（与 crosschain/message.go RegChainName 固化常量一致）。
const ChainName = "chainmaker"

// RegisteredContracts 监管链已注册合约白名单（对应 contracts/chainmaker/ 各目录）。
var RegisteredContracts = map[string]bool{
	"regulatory_record":        true,
	"crosschain_trace":         true,
	"identity_mapping":         true,
	"regulatory_authorization": true,
	"audit_record":             true,
}

// Adapter 监管链适配器：sim 模式包 inproc 传输，real 模式包 SDK 传输（迁移缝）。
type Adapter struct{ t chainadapter.ChainTransport }

func New(t chainadapter.ChainTransport) *Adapter { return &Adapter{t: t} }

func (a *Adapter) ChainName() string { return ChainName }
func (a *Adapter) Health() error     { return a.t.Health() }

func (a *Adapter) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	if !RegisteredContracts[contract] {
		return nil, fmt.Errorf("chainmaker: contract %q not registered (allowed: regulatory_record, crosschain_trace, identity_mapping, regulatory_authorization, audit_record; see contracts/chainmaker/)", contract)
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
