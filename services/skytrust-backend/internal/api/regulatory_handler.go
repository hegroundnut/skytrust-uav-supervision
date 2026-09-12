package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/regulatory"
)

func alertRaiseHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req regulatory.AlertRaiseRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		ev, err := deps.Regulatory.RaiseAlert(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, ev)
	}
}

func alertListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q regulatory.AlertQuery
		if !bindOptionalBody(c, &q) { // 全字段可选：空体合法；格式错→6002
			return
		}
		q.Normalize() // 双重归一化之 handler 侧
		records, total, err := deps.Regulatory.AlertList(c.Request.Context(), TraceIDFrom(c), q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": q.Page, "page_size": q.PageSize})
	}
}

func alertStatusHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req regulatory.AlertStatusRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		ev, err := deps.Regulatory.AlertStatus(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, ev)
	}
}
