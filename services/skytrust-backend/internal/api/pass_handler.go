package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/uavbusiness"
)

type passIssueReq struct {
	PassID    string `json:"pass_id"`
	MissionID string `json:"mission_id" binding:"required"`
	ValidFrom string `json:"valid_from"`
	ValidTo   string `json:"valid_to"`
	Issuer    string `json:"issuer" binding:"required"`
}

// passIssueHandler POST /api/pass/issue —— data={pass,crosschain}；
// 跨链失败时许可停留 GENERATING，FailData 携带 {pass,crosschain} 留痕。
func passIssueHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req passIssueReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		p, tx, err := deps.Business.IssuePass(c.Request.Context(), TraceIDFrom(c), uavbusiness.PassIssueInput{
			PassID: req.PassID, MissionID: req.MissionID, ValidFrom: req.ValidFrom,
			ValidTo: req.ValidTo, Issuer: req.Issuer,
		})
		if err != nil {
			FailData(c, crosschainErrCode(err), err.Error(), gin.H{"pass": p, "crosschain": tx})
			return
		}
		OK(c, gin.H{"pass": p, "crosschain": tx})
	}
}

type passIDReq struct {
	PassID string `json:"pass_id" binding:"required"`
}

func passQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req passIDReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		p, err := deps.Business.QueryPass(c.Request.Context(), TraceIDFrom(c), req.PassID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, p)
	}
}

// passVerifyHandler 验证结果永远 code 0（无效是数据不是错误）；仅不存在 → 6002。
func passVerifyHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req passIDReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		valid, reasons, p, err := deps.Business.VerifyPass(c.Request.Context(), TraceIDFrom(c), req.PassID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"valid": valid, "reasons": reasons, "status": p.Status, "pass_id": p.PassID})
	}
}

type passListReq struct {
	MissionID string `json:"mission_id"`
	UAVID     string `json:"uav_id"`
	Status    string `json:"status"`
	Page      int    `json:"page"`
	PageSize  int    `json:"page_size"`
}

func passListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req passListReq
		if !bindOptionalBody(c, &req) { // 全字段可选：空体合法；格式错→6002
			return
		}
		f := uavbusiness.PassListFilter{
			MissionID: req.MissionID, UAVID: req.UAVID, Status: req.Status,
			Page: req.Page, PageSize: req.PageSize,
		}
		// 归一化后回显（与 ListPass 内部规则一致）
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		records, total, err := deps.Business.ListPass(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}

type passRevokeReq struct {
	PassID   string `json:"pass_id" binding:"required"`
	Reason   string `json:"reason" binding:"required"`
	Operator string `json:"operator" binding:"required"`
}

// passRevokeHandler 本地先行：code 0 + crosschain_status=FAILED 表示本地已吊销、
// 链上降级（响应仍携带 crosschain 留痕）。仅本地不可吊销（3002/6002）才非 0。
func passRevokeHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req passRevokeReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		p, csStatus, tx, err := deps.Business.RevokePass(c.Request.Context(), TraceIDFrom(c),
			req.PassID, req.Reason, req.Operator)
		if err != nil {
			FailData(c, crosschainErrCode(err), err.Error(), gin.H{"pass": p, "crosschain": tx})
			return
		}
		OK(c, gin.H{"pass": p, "crosschain_status": csStatus, "crosschain": tx})
	}
}
