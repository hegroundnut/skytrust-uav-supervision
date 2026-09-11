package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/uavbusiness"
)

type manufacturerRegisterReq struct {
	ManufacturerID string `json:"manufacturer_id" binding:"required"`
	Name           string `json:"name" binding:"required"`
	AdapterType    string `json:"adapter_type"`
	Status         string `json:"status"`
}

func manufacturerRegisterHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req manufacturerRegisterReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		m, err := deps.Business.RegisterManufacturer(c.Request.Context(), TraceIDFrom(c), uavbusiness.ManufacturerInput{
			ManufacturerID: req.ManufacturerID, Name: req.Name,
			AdapterType: req.AdapterType, Status: req.Status,
		})
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, m)
	}
}

type manufacturerListReq struct {
	Status   string `json:"status"`
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
}

func manufacturerListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req manufacturerListReq
		if !bindOptionalBody(c, &req) { // 全字段可选：空体合法；格式错→6002
			return
		}
		f := uavbusiness.ManufacturerListFilter{Status: req.Status, Page: req.Page, PageSize: req.PageSize}
		// 归一化后回显（与 List* 内部规则一致）
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		list, total, err := deps.Business.ListManufacturers(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": list, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}

type operatorRegisterReq struct {
	OperatorID          string `json:"operator_id" binding:"required"`
	Name                string `json:"name" binding:"required"`
	Status              string `json:"status"`
	QualificationStatus string `json:"qualification_status"`
	ChainOrgID          string `json:"chain_org_id"`
	Contact             string `json:"contact"`
}

func operatorRegisterHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req operatorRegisterReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		o, err := deps.Business.RegisterOperator(c.Request.Context(), TraceIDFrom(c), uavbusiness.OperatorInput{
			OperatorID: req.OperatorID, Name: req.Name, Status: req.Status,
			QualificationStatus: req.QualificationStatus, ChainOrgID: req.ChainOrgID, Contact: req.Contact,
		})
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, o)
	}
}

type operatorListReq struct {
	Status   string `json:"status"`
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
}

func operatorListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req operatorListReq
		if !bindOptionalBody(c, &req) { // 全字段可选：空体合法；格式错→6002
			return
		}
		f := uavbusiness.OperatorListFilter{Status: req.Status, Page: req.Page, PageSize: req.PageSize}
		// 归一化后回显（与 List* 内部规则一致）
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		list, total, err := deps.Business.ListOperators(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": list, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}

type routeCreateReq struct {
	RouteID        string  `json:"route_id" binding:"required"`
	Zone           string  `json:"zone" binding:"required"`
	StartPoint     string  `json:"start_point" binding:"required"`
	EndPoint       string  `json:"end_point" binding:"required"`
	AltitudeMin    float64 `json:"altitude_min"` // 0 合法，不用 binding required
	AltitudeMax    float64 `json:"altitude_max"`
	CorridorStatus string  `json:"corridor_status"`
}

func routeCreateHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req routeCreateReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		r, err := deps.Business.CreateRoute(c.Request.Context(), TraceIDFrom(c), uavbusiness.RouteInput{
			RouteID: req.RouteID, Zone: req.Zone, StartPoint: req.StartPoint, EndPoint: req.EndPoint,
			AltitudeMin: req.AltitudeMin, AltitudeMax: req.AltitudeMax, CorridorStatus: req.CorridorStatus,
		})
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, r)
	}
}

type routeListReq struct {
	Zone           string `json:"zone"`
	CorridorStatus string `json:"corridor_status"`
	Page           int    `json:"page"`
	PageSize       int    `json:"page_size"`
}

func routeListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req routeListReq
		if !bindOptionalBody(c, &req) { // 全字段可选：空体合法；格式错→6002
			return
		}
		f := uavbusiness.RouteListFilter{Zone: req.Zone, CorridorStatus: req.CorridorStatus, Page: req.Page, PageSize: req.PageSize}
		// 归一化后回显（与 List* 内部规则一致）
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		list, total, err := deps.Business.ListRoutes(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": list, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}
