package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/uavbusiness"
)

type uavRegisterReq struct {
	UAVID          string `json:"uav_id"` // 可选，缺省自动生成
	ManufacturerID string `json:"manufacturer_id" binding:"required"`
	OperatorID     string `json:"operator_id" binding:"required"`
	Model          string `json:"model"`
	SerialNo       string `json:"serial_no" binding:"required"`
}

// uavRegisterHandler POST /api/uav/register —— data={uav,crosschain}；
// 跨链失败时 uav 停留 REGISTERED，FailData 同样携带 {uav,crosschain}（VERIFY 可重试）。
func uavRegisterHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req uavRegisterReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		uav, tx, err := deps.Business.RegisterUAV(c.Request.Context(), TraceIDFrom(c), uavbusiness.UAVInput{
			UAVID: req.UAVID, ManufacturerID: req.ManufacturerID, OperatorID: req.OperatorID,
			Model: req.Model, SerialNo: req.SerialNo,
		})
		if err != nil {
			FailData(c, crosschainErrCode(err), err.Error(), gin.H{"uav": uav, "crosschain": tx})
			return
		}
		OK(c, gin.H{"uav": uav, "crosschain": tx})
	}
}

type uavQueryReq struct {
	UAVID string `json:"uav_id" binding:"required"`
}

func uavQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req uavQueryReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		uav, err := deps.Business.QueryUAV(c.Request.Context(), TraceIDFrom(c), req.UAVID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, uav)
	}
}

type uavListReq struct {
	OperatorID     string `json:"operator_id"`
	ManufacturerID string `json:"manufacturer_id"`
	Status         string `json:"status"`
	Page           int    `json:"page"`
	PageSize       int    `json:"page_size"`
}

func uavListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req uavListReq
		if !bindOptionalBody(c, &req) { // 全字段可选：空体合法；格式错→6002
			return
		}
		f := uavbusiness.UAVListFilter{
			OperatorID: req.OperatorID, ManufacturerID: req.ManufacturerID, Status: req.Status,
			Page: req.Page, PageSize: req.PageSize,
		}
		// 归一化后回显（与 ListUAV 内部规则一致）
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		records, total, err := deps.Business.ListUAV(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}

type uavStatusReq struct {
	UAVID  string `json:"uav_id" binding:"required"`
	Action string `json:"action" binding:"required"` // VERIFY|ACTIVATE|SUSPEND|RESUME
}

func uavStatusHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req uavStatusReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		uav, tx, err := deps.Business.StatusUAV(c.Request.Context(), TraceIDFrom(c), req.UAVID, req.Action)
		if err != nil {
			FailData(c, crosschainErrCode(err), err.Error(), gin.H{"uav": uav, "crosschain": tx})
			return
		}
		OK(c, gin.H{"uav": uav, "crosschain": tx})
	}
}

type uavRevokeReq struct {
	UAVID    string `json:"uav_id" binding:"required"`
	Reason   string `json:"reason"`
	Operator string `json:"operator"`
}

func uavRevokeHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req uavRevokeReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		uav, err := deps.Business.RevokeUAV(c.Request.Context(), TraceIDFrom(c), req.UAVID, req.Reason, req.Operator)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, uav)
	}
}
