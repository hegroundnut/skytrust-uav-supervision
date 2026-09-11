package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/offchain"
)

func topologyGetHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		view, err := deps.Offchain.TopologyGet(c.Request.Context(), TraceIDFrom(c))
		if err != nil {
			FailErr(c, err)
			return
		}
		OK(c, view)
	}
}

func nodeRegisterHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.NodeRegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		node, err := deps.Offchain.NodeRegister(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, node)
	}
}

func nodeListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q offchain.NodeQuery
		if !bindOptionalBody(c, &q) { // 全字段可选：空体合法；格式错→6002
			return
		}
		q.Normalize() // 双重归一化之 handler 侧
		records, total, err := deps.Offchain.NodeList(c.Request.Context(), TraceIDFrom(c), q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": q.Page, "page_size": q.PageSize})
	}
}

func sessionOpenHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.SessionOpenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		res, err := deps.Offchain.SessionOpen(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, res)
	}
}

func sessionCloseHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.SessionCloseRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		sess, err := deps.Offchain.SessionClose(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, sess)
	}
}

func sessionListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q offchain.SessionQuery
		if !bindOptionalBody(c, &q) {
			return
		}
		q.Normalize()
		records, total, err := deps.Offchain.SessionList(c.Request.Context(), TraceIDFrom(c), q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": q.Page, "page_size": q.PageSize})
	}
}

func messageSendHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.MessageSendRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		res, err := deps.Offchain.MessageSend(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			if res != nil { // FAILED 留痕行透传（与网关失败留痕同构；crosschain.Error 即 errcode.Error 别名，crosschainErrCode 对 offchain 业务错误同样适用）
				FailData(c, crosschainErrCode(err), err.Error(), res)
				return
			}
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, res)
	}
}

func messageListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q offchain.MessageQuery
		if !bindOptionalBody(c, &q) {
			return
		}
		q.Normalize()
		records, total, stats, err := deps.Offchain.MessageList(c.Request.Context(), TraceIDFrom(c), q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": q.Page, "page_size": q.PageSize, "stats": stats})
	}
}

func wormholeToggleHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.WormholeToggleRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		res, err := deps.Offchain.WormholeToggle(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, res)
	}
}

func riskEvaluateHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.RiskEvaluateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		res, err := deps.Offchain.RiskEvaluate(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, res)
	}
}

func pathSwitchHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.PathSwitchRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		res, err := deps.Offchain.PathSwitch(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, res)
	}
}

func eventListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q offchain.EventQuery
		if !bindOptionalBody(c, &q) {
			return
		}
		q.Normalize()
		records, total, err := deps.Offchain.EventList(c.Request.Context(), TraceIDFrom(c), q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": q.Page, "page_size": q.PageSize})
	}
}
