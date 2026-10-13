package sim

import (
	"context"
	"fmt"

	"skytrust-backend/internal/chainadapter"
)

// sim.Chain 结构上满足 BlockQuerier（可选能力，explorer 数据源）。
// 数据全部来自 SubmitTx 落下的块记录——如实反映 sim 链真实发生过的交易，绝不拼造。
var _ chainadapter.BlockQuerier = (*Chain)(nil)

// GetBlockHeight 当前块高（= 累计提交交易数；sim 一笔交易一个块）。
func (c *Chain) GetBlockHeight(ctx context.Context) (uint64, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.blockNum, nil
}

// GetBlockByHeight 按高度取块（1 ≤ height ≤ 当前高度），越界如实报错。
func (c *Chain) GetBlockByHeight(ctx context.Context, height uint64) (*chainadapter.BlockInfo, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if height == 0 || height > uint64(len(c.blocks)) {
		return nil, fmt.Errorf("block not found: %s height %d (current %d)", c.name, height, len(c.blocks))
	}
	b := c.blocks[height-1] // 值拷贝，TxIDs 深拷贝防调用方改写内部状态
	b.TxIDs = append([]string(nil), b.TxIDs...)
	return &b, nil
}

// ListRecentBlocks 最近块，新→旧。limit 由调用方钳制（端点契约 ≤0→20、>200→200）；
// 此处防御性收敛到现有块数，返回非 nil 切片（JSON 渲染 []）。
func (c *Chain) ListRecentBlocks(ctx context.Context, limit int) ([]chainadapter.BlockInfo, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]chainadapter.BlockInfo, 0, len(c.blocks))
	if limit <= 0 {
		return out, nil
	}
	if limit > len(c.blocks) {
		limit = len(c.blocks)
	}
	for i := len(c.blocks) - 1; i >= len(c.blocks)-limit; i-- {
		b := c.blocks[i]
		b.TxIDs = append([]string(nil), b.TxIDs...)
		out = append(out, b)
	}
	return out, nil
}

// ListNodes sim 链单节点，source=sim 如实标注（绝不冒充链原生 RPC 结果）。
func (c *Chain) ListNodes(ctx context.Context) ([]chainadapter.NodeInfo, error) {
	return []chainadapter.NodeInfo{{
		Name:    c.name + "-sim-node0",
		Role:    "sim",
		Address: "in-process",
		Online:  true,
		Source:  "sim",
	}}, nil
}
