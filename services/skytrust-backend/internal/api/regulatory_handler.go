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

func traceIdentityHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req regulatory.TraceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		res, err := deps.Regulatory.TraceIdentity(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			if res != nil { // 5001 断链透传部分结果（P4-2）
				FailData(c, crosschainErrCode(err), err.Error(), res)
				return
			}
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, res)
	}
}

func authorizeApplyHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req regulatory.AuthApplyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		auth, err := deps.Regulatory.ApplyAuthorization(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, auth)
	}
}

func authorizeReviewHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req regulatory.AuthReviewRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		res, err := deps.Regulatory.ReviewAuthorization(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, res)
	}
}

func inspectCiphertextHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req regulatory.InspectRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		res, err := deps.Regulatory.InspectCiphertext(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			if res != nil { // 5002/5003/5004/2001 sealed 透传（P4-6）
				FailData(c, crosschainErrCode(err), err.Error(), res)
				return
			}
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, res)
	}
}

func regAuditListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q regulatory.RegAuditQuery
		if !bindOptionalBody(c, &q) {
			return
		}
		records, total, err := deps.Regulatory.RegAuditList(c.Request.Context(), &q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": q.Page, "page_size": q.PageSize})
	}
}

func regAuditExportHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q regulatory.RegAuditQuery
		if !bindOptionalBody(c, &q) {
			return
		}
		content, rows, err := deps.Regulatory.RegAuditExport(c.Request.Context(), &q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"format": "csv", "content": string(content), "rows": rows})
	}
}
