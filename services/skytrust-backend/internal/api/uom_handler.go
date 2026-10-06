package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/uavbusiness"
)

type realnameRegisterReq struct {
	SubjectType string `json:"subject_type" binding:"required"` // INDIVIDUAL|ENTERPRISE
	Name        string `json:"name" binding:"required"`
	IdNumber    string `json:"id_number" binding:"required"` // 模拟证件号
	Contact     string `json:"contact"`
}

// realnameRegisterHandler POST /api/realname/register —— data={subject}。
func realnameRegisterHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req realnameRegisterReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		sub, err := deps.Business.RegisterRealname(c.Request.Context(), TraceIDFrom(c), uavbusiness.RealnameInput{
			SubjectType: req.SubjectType, Name: req.Name, IdNumber: req.IdNumber, Contact: req.Contact,
		})
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"subject": sub})
	}
}

type realnameListReq struct {
	SubjectType string `json:"subject_type"`
	Page        int    `json:"page"`
	PageSize    int    `json:"page_size"`
}

// realnameListHandler POST /api/realname/list —— data={records,total,page,page_size}。
func realnameListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req realnameListReq
		if !bindOptionalBody(c, &req) { // 全字段可选：空体合法；格式错→6002
			return
		}
		f := uavbusiness.RealnameListFilter{SubjectType: req.SubjectType, Page: req.Page, PageSize: req.PageSize}
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		records, total, err := deps.Business.ListRealname(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}

type realnameQueryReq struct {
	SubjectID string `json:"subject_id" binding:"required"`
}

// realnameQueryHandler POST /api/realname/query —— data=subject 对象；不存在→7001。
func realnameQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req realnameQueryReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		sub, err := deps.Business.QueryRealname(c.Request.Context(), TraceIDFrom(c), req.SubjectID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, sub)
	}
}

type pilotApplyReq struct {
	Name     string `json:"name" binding:"required"`
	IdNumber string `json:"id_number" binding:"required"`
	Category string `json:"category" binding:"required"` // 多旋翼|固定翼|垂直起降
}

// pilotApplyHandler POST /api/pilot/apply —— data={license}（即申即发，SM9 管理方签名）。
func pilotApplyHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req pilotApplyReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		lic, err := deps.Business.ApplyPilotLicense(c.Request.Context(), TraceIDFrom(c), uavbusiness.PilotApplyInput{
			Name: req.Name, IdNumber: req.IdNumber, Category: req.Category,
		})
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"license": lic})
	}
}

type pilotListReq struct {
	Category string `json:"category"`
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
}

// pilotListHandler POST /api/pilot/list —— data={records,total,page,page_size}。
func pilotListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req pilotListReq
		if !bindOptionalBody(c, &req) {
			return
		}
		f := uavbusiness.PilotListFilter{Category: req.Category, Page: req.Page, PageSize: req.PageSize}
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		records, total, err := deps.Business.ListPilotLicenses(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}

type pilotQueryReq struct {
	LicenseID string `json:"license_id" binding:"required"`
}

// pilotQueryHandler POST /api/pilot/query —— data=license 对象；不存在→7002。
func pilotQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req pilotQueryReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		lic, err := deps.Business.QueryPilotLicense(c.Request.Context(), TraceIDFrom(c), req.LicenseID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, lic)
	}
}
