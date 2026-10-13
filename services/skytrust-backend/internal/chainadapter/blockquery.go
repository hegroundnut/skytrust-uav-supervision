package chainadapter

import "context"

// BlockInfo 区块浏览视图（explorer 端点组数据源）。Time 为 timex 格式
// （2006-01-02 15:04:05.000，Asia/Shanghai）——链上原始时间已在实现侧归一。
type BlockInfo struct {
	Height   uint64   `json:"height"`
	Hash     string   `json:"hash"`
	Time     string   `json:"time"`
	TxCount  int      `json:"tx_count"`
	Proposer string   `json:"proposer"`
	TxIDs    []string `json:"tx_ids"`
}

// NodeInfo 节点视图。Source 如实标注数据来源：rpc | static+probe | sim——
// 绝不以仿真数据冒充链原生 RPC 结果（验收诚实性 R0'）。
type NodeInfo struct {
	Name    string `json:"name"`
	Role    string `json:"role"`
	Address string `json:"address"`
	Online  bool   `json:"online"`
	Source  string `json:"source"`
}

// BlockQuerier 可选能力接口：区块/节点链上查询（区块链浏览器数据源）。
// 传输/适配器不实现本接口 → explorer 端点组如实降级（errcode 2005
// ChainUnsupportedFeature +「该链 RPC 不支持…」），绝不拼造缺失数据。
// ListRecentBlocks 返回新→旧；limit 由调用方按端点契约钳制（≤0→20，>200→200）。
type BlockQuerier interface {
	GetBlockHeight(ctx context.Context) (uint64, error)
	GetBlockByHeight(ctx context.Context, height uint64) (*BlockInfo, error)
	ListRecentBlocks(ctx context.Context, limit int) ([]BlockInfo, error)
	ListNodes(ctx context.Context) ([]NodeInfo, error)
}

// TransportUnwrapper 由迁移稳定层适配器（chainmaker/fabric/fisco/irita.Adapter，
// 薄委托壳）实现：暴露底层真实传输。可选能力断言（BlockQuerier / Resettable）
// 必须作用于真实后端对象而非壳——壳永不吞掉、也永不冒充传输能力。
type TransportUnwrapper interface {
	UnwrapTransport() ChainTransport
}
