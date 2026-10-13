package api

import (
	"fmt"
	"sort"

	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/timex"
)

// 固定显示值（设计钉死——四端浏览器逐字断言，禁止转述；未知链不猜测显示名）。
var explorerChainNames = map[string]string{
	"chainmaker": "ChainMaker 监管链",
	"fabric":     "Fabric 运营链",
	"fisco-bcos": "FISCO BCOS 管理链",
	"irita":      "IRITA 证照链",
}

var explorerConsensus = map[string]string{
	"chainmaker": "TBFT（4 节点）",
	"fabric":     "SMARTBFT（4 orderer）",
	"fisco-bcos": "PBFT（4 sealer）",
	"irita":      "Tendermint BFT（4 验证人）",
}

// explorerCapabilityTarget 能力探测对象：迁移稳定层适配器是薄委托壳，经
// TransportUnwrapper 暴露底层真实传输——BlockQuerier / Resettable 断言必须
// 作用于真实后端对象，壳不吞掉也不冒充能力。
func explorerCapabilityTarget(v any) any {
	if u, ok := v.(chainadapter.TransportUnwrapper); ok {
		return u.UnwrapTransport()
	}
	return v
}

// explorerResolveChain 校验 chain 参数并取适配器：未知链/未接入 → ok=false（调用方回 6002）。
// 键集合以 deps.Chains 为准，适配器经 deps.Gateway.Chain 获取（先例 regulatory/authorization.go）。
func explorerResolveChain(deps *Deps, chain string) (chainadapter.ChainAdapter, bool) {
	if _, known := deps.Chains[chain]; !known {
		return nil, false
	}
	return deps.Gateway.Chain(chain)
}

// explorerQuerier BlockQuerier 能力探测：不实现 → ok=false，调用方回 2005
// 如实降级（「该链 RPC 不支持…」），绝不拼造区块/节点数据。
func explorerQuerier(adt chainadapter.ChainAdapter) (chainadapter.BlockQuerier, bool) {
	bq, ok := explorerCapabilityTarget(adt).(chainadapter.BlockQuerier)
	return bq, ok
}

// explorerOverviewHandler POST /api/explorer/overview —— 链总览（浏览器首屏数据源）。
// mode 判定 = 真实后端实现 Resettable → sim，否则 real（真实传输不实现 Resettable，P6-R6）。
// 能力缺失链：node_count/block_height 如实为 0，绝不拼造。
func explorerOverviewHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		names := make([]string, 0, len(deps.Chains))
		for name := range deps.Chains {
			names = append(names, name)
		}
		sort.Strings(names) // 确定性输出（map 遍历无序；apidoc 回放录制要求稳定）
		chains := make([]gin.H, 0, len(names))
		for _, name := range names {
			prov := deps.Chains[name]
			status := "OFFLINE"
			if prov.Health() == nil {
				status = "ONLINE"
			}
			target := explorerCapabilityTarget(prov)
			mode := "real"
			if _, ok := target.(chainadapter.Resettable); ok {
				mode = "sim"
			}
			nodeCount, blockHeight := 0, uint64(0)
			if bq, ok := target.(chainadapter.BlockQuerier); ok {
				if nodes, err := bq.ListNodes(c.Request.Context()); err == nil {
					nodeCount = len(nodes)
				}
				if h, err := bq.GetBlockHeight(c.Request.Context()); err == nil {
					blockHeight = h
				}
			}
			dispName := explorerChainNames[name]
			if dispName == "" {
				dispName = name // 白名单外链如实使用链 ID（不猜测显示名）
			}
			chains = append(chains, gin.H{
				"chain": name, "name": dispName, "mode": mode, "status": status,
				"consensus": explorerConsensus[name], "node_count": nodeCount, "block_height": blockHeight,
			})
		}
		OK(c, gin.H{"chains": chains, "count": len(chains)})
	}
}

type explorerNodesReq struct {
	Chain string `json:"chain" binding:"required"`
}

// explorerNodesHandler POST /api/explorer/nodes —— 节点列表（source 如实标注 rpc|static+probe|sim）。
func explorerNodesHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req explorerNodesReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		adt, ok := explorerResolveChain(deps, req.Chain)
		if !ok {
			Fail(c, ErrParam, "未知链: "+req.Chain)
			return
		}
		bq, ok := explorerQuerier(adt)
		if !ok {
			Fail(c, ErrChainUnsupportedFeature, "该链 RPC 不支持节点查询: "+req.Chain)
			return
		}
		nodes, err := bq.ListNodes(c.Request.Context())
		if err != nil {
			Fail(c, ErrInternal, "节点查询失败: "+err.Error())
			return
		}
		if nodes == nil {
			nodes = []chainadapter.NodeInfo{}
		}
		OK(c, gin.H{"chain": req.Chain, "nodes": nodes})
	}
}

type explorerBlocksReq struct {
	Chain string `json:"chain" binding:"required"`
	Limit int    `json:"limit"`
}

// explorerBlocksHandler POST /api/explorer/blocks —— 最近块列表（新→旧；limit≤0→20，>200→200）。
func explorerBlocksHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req explorerBlocksReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		adt, ok := explorerResolveChain(deps, req.Chain)
		if !ok {
			Fail(c, ErrParam, "未知链: "+req.Chain)
			return
		}
		bq, ok := explorerQuerier(adt)
		if !ok {
			Fail(c, ErrChainUnsupportedFeature, "该链 RPC 不支持区块查询: "+req.Chain)
			return
		}
		limit := req.Limit
		if limit <= 0 {
			limit = 20
		}
		if limit > 200 {
			limit = 200
		}
		height, err := bq.GetBlockHeight(c.Request.Context())
		if err != nil {
			Fail(c, ErrInternal, "区块高度查询失败: "+err.Error())
			return
		}
		blocks, err := bq.ListRecentBlocks(c.Request.Context(), limit)
		if err != nil {
			Fail(c, ErrInternal, "区块列表查询失败: "+err.Error())
			return
		}
		if blocks == nil {
			blocks = []chainadapter.BlockInfo{}
		}
		OK(c, gin.H{"chain": req.Chain, "height": height, "blocks": blocks})
	}
}

type explorerBlockReq struct {
	Chain  string `json:"chain" binding:"required"`
	Height uint64 `json:"height" binding:"required"`
}

// explorerBlockHandler POST /api/explorer/block —— 按高度查块详情（越界 → 6002，禁止拼造）。
func explorerBlockHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req explorerBlockReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		adt, ok := explorerResolveChain(deps, req.Chain)
		if !ok {
			Fail(c, ErrParam, "未知链: "+req.Chain)
			return
		}
		bq, ok := explorerQuerier(adt)
		if !ok {
			Fail(c, ErrChainUnsupportedFeature, "该链 RPC 不支持块详情查询: "+req.Chain)
			return
		}
		height, err := bq.GetBlockHeight(c.Request.Context())
		if err != nil {
			Fail(c, ErrInternal, "区块高度查询失败: "+err.Error())
			return
		}
		if req.Height > height {
			Fail(c, ErrParam, fmt.Sprintf("区块高度越界: %d（当前高度 %d）", req.Height, height))
			return
		}
		blk, err := bq.GetBlockByHeight(c.Request.Context(), req.Height)
		if err != nil {
			Fail(c, ErrInternal, "块详情查询失败: "+err.Error())
			return
		}
		OK(c, gin.H{"chain": req.Chain, "block": blk})
	}
}

type explorerTxReq struct {
	Chain string `json:"chain" binding:"required"`
	TxID  string `json:"tx_id" binding:"required"`
}

// explorerTxHandler POST /api/explorer/tx —— 按 TxID 链上直查。走既有 ChainAdapter.QueryTx
// （基础能力，不依赖 BlockQuerier）；查询失败/不存在 → 6002（资源不存在）。
func explorerTxHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req explorerTxReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		adt, ok := explorerResolveChain(deps, req.Chain)
		if !ok {
			Fail(c, ErrParam, "未知链: "+req.Chain)
			return
		}
		rc, err := adt.QueryTx(c.Request.Context(), req.TxID)
		if err != nil || rc == nil {
			Fail(c, ErrParam, "交易不存在或查询失败: "+req.TxID)
			return
		}
		OK(c, gin.H{"chain": req.Chain, "tx": gin.H{
			"tx_id": rc.TxID, "block_num": rc.BlockNum, "status": rc.Status,
			"timestamp": timex.FormatTime(rc.Timestamp),
		}})
	}
}
