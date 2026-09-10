package api

import (
	"errors"

	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/crosschain"
)

// crosschainErrCode *crosschain.Error 取其 Code，其余归 9001。
func crosschainErrCode(err error) int {
	var e *crosschain.Error
	if errors.As(err, &e) {
		return e.Code
	}
	return ErrInternal
}

type crosschainSendReq struct {
	MessageType      string         `json:"message_type" binding:"required"`
	BusinessID       string         `json:"business_id" binding:"required"`
	SourceChain      string         `json:"source_chain" binding:"required"`
	FinalTargetChain string         `json:"final_target_chain" binding:"required"`
	Payload          map[string]any `json:"payload" binding:"required"`
	SM9Identity      string         `json:"sm9_identity"`
	Signature        string         `json:"signature"`
	SM3Hash          string         `json:"sm3_hash"`
	SourceChainTxID  string         `json:"source_chain_tx_id"`
}

// crosschainSendHandler POST /api/crosschain/send
// 演示便利：signature 为空时由平台按 sm9_identity 代签（README 注明；真实场景调用方自签）。
// 失败与重复提交（2004）均经 FailData 携带网关落库/已有记录，便于前端展示留痕。
func crosschainSendHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req crosschainSendReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		sreq := &crosschain.SendRequest{
			MessageType: req.MessageType, BusinessID: req.BusinessID,
			SourceChain: req.SourceChain, FinalTargetChain: req.FinalTargetChain,
			Payload: req.Payload, SM9Identity: req.SM9Identity,
			Signature: req.Signature, SM3Hash: req.SM3Hash,
			SourceChainTxID: req.SourceChainTxID,
		}
		if sreq.Signature == "" {
			if sreq.SM9Identity == "" {
				Fail(c, ErrParam, "signature 为空时必须提供 sm9_identity（平台代签）")
				return
			}
			env := crosschain.BuildEnvelope(req.MessageType, req.BusinessID, req.SourceChain, req.FinalTargetChain, req.Payload)
			sig, sm3, err := crosschain.SignEnvelope(deps.Crypto, sreq.SM9Identity, env)
			if err != nil {
				Fail(c, ErrSM9Verify, "平台代签失败: "+err.Error())
				return
			}
			sreq.Signature = sig
			if sreq.SM3Hash == "" {
				sreq.SM3Hash = sm3
			}
		}
		tx, err := deps.Gateway.Send(c.Request.Context(), TraceIDFrom(c), sreq)
		if err != nil {
			FailData(c, crosschainErrCode(err), err.Error(), tx)
			return
		}
		OK(c, tx)
	}
}

type crosschainQueryReq struct {
	CrossTxID string `json:"cross_tx_id" binding:"required"`
}

// crosschainQueryHandler POST /api/crosschain/query —— 按 cross_tx_id 查跨链留痕。
func crosschainQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req crosschainQueryReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		tx, err := deps.Gateway.Query(req.CrossTxID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, tx)
	}
}

type crosschainListReq struct {
	Status      string `json:"status"`
	MessageType string `json:"message_type"`
	Page        int    `json:"page"`
	PageSize    int    `json:"page_size"`
}

// crosschainListHandler POST /api/crosschain/list —— 分页过滤（默认 20/上限 200）。
func crosschainListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req crosschainListReq
		if !bindOptionalBody(c, &req) {
			return
		}
		f := crosschain.ListFilter{
			Status: req.Status, MessageType: req.MessageType,
			Page: req.Page, PageSize: req.PageSize,
		}
		// 归一化后回显（与 Gateway.List 内部规则一致）
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		records, total, err := deps.Gateway.List(f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}
