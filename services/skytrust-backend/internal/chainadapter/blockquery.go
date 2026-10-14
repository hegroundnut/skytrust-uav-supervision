package chainadapter

import (
	"context"
	"errors"
	"net"
	"strings"
	"time"
)

// ErrUnsupportedFeature 能力部分缺失哨兵：传输实现了 BlockQuerier，但其中某项查询
// 在该链 RPC 上不可靠/不受支持（历史例：FISCO JSON-RPC curl 面 getBlockByNumber 怪癖
// §11.4-①——经 §12.11 复核为仅 curl 面缺陷，go-sdk 通道正常，fisco 块查询已实装；
// 哨兵保留供未来任何链能力缺口如实降级）。实现以 %w 包裹本哨兵返回；API 层经 errors.Is
// 识别 → errcode.ChainUnsupportedFeature(2005) 如实降级（Task 4 校准裁决：5003 已被
// AuthScope 占用，能力降级码唯一 = 2005），绝不拼造缺失数据。
var ErrUnsupportedFeature = errors.New("chain RPC does not support this query (capability honestly degraded)")

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

// ProbeNodeList 解析 "name=addr,name2=addr2" 静态节点清单并逐地址 TCP 探活
// （source=static+probe 如实标注——chainmaker/fabric 真实传输无全网节点枚举 RPC，
// 节点清单来自可选 env CHAINMAKER_NODE_LIST / FABRIC_NODE_LIST，Task 5 brief 接口）。
// 条目缺 "name=" 时如实以 addr 报名；未配置的节点绝不拼造。role 由调用方给定
// （静态清单不携带角色信息时如实报 "node"）。
func ProbeNodeList(spec string, timeout time.Duration, role string) []NodeInfo {
	out := make([]NodeInfo, 0)
	for _, item := range strings.Split(spec, ",") {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		name, addr := item, item
		if i := strings.Index(item, "="); i > 0 {
			name, addr = strings.TrimSpace(item[:i]), strings.TrimSpace(item[i+1:])
		}
		online := false
		if conn, err := net.DialTimeout("tcp", addr, timeout); err == nil {
			_ = conn.Close()
			online = true
		}
		out = append(out, NodeInfo{Name: name, Role: role, Address: addr, Online: online, Source: "static+probe"})
	}
	return out
}
