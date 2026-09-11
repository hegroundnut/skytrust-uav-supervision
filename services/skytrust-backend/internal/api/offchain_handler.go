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
