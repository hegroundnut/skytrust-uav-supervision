package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/uavbusiness"
)

type missionCreateReq struct {
	MissionID     string   `json:"mission_id"` // 可选，缺省自动生成
	OperatorID    string   `json:"operator_id" binding:"required"`
	UAVID         string   `json:"uav_id" binding:"required"`
	MissionType   string   `json:"mission_type" binding:"required"`
	StartTime     string   `json:"start_time" binding:"required"`
	EndTime       string   `json:"end_time" binding:"required"`
	RouteSegments []string `json:"route_segments" binding:"required,min=1"`
	AltitudeMin   float64  `json:"altitude_min"` // 0 合法，不用 binding required
	AltitudeMax   float64  `json:"altitude_max" binding:"required"`
	PayloadType   string   `json:"payload_type" binding:"required"`
	Description   string   `json:"description"`
}

func missionCreateHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req missionCreateReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		m, err := deps.Business.CreateMission(c.Request.Context(), TraceIDFrom(c), uavbusiness.MissionInput{
			MissionID: req.MissionID, OperatorID: req.OperatorID, UAVID: req.UAVID,
			MissionType: req.MissionType, StartTime: req.StartTime, EndTime: req.EndTime,
			RouteSegments: req.RouteSegments, AltitudeMin: req.AltitudeMin, AltitudeMax: req.AltitudeMax,
			PayloadType: req.PayloadType, Description: req.Description,
		})
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, m)
	}
}

type missionQueryReq struct {
	MissionID string `json:"mission_id" binding:"required"`
}

func missionQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req missionQueryReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		m, err := deps.Business.QueryMission(c.Request.Context(), TraceIDFrom(c), req.MissionID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, m)
	}
}

type missionListReq struct {
	OperatorID string `json:"operator_id"`
	UAVID      string `json:"uav_id"`
	Status     string `json:"status"`
	Page       int    `json:"page"`
	PageSize   int    `json:"page_size"`
}

func missionListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req missionListReq
		if !bindOptionalBody(c, &req) { // 全字段可选：空体合法；格式错→6002
			return
		}
		f := uavbusiness.MissionListFilter{
			OperatorID: req.OperatorID, UAVID: req.UAVID, Status: req.Status,
			Page: req.Page, PageSize: req.PageSize,
		}
		// 归一化后回显（与 ListMission 内部规则一致）
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		records, total, err := deps.Business.ListMission(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}

type missionSubmitReq struct {
	MissionID string `json:"mission_id" binding:"required"`
	Operator  string `json:"operator" binding:"required"`
}

// missionSubmitHandler POST /api/mission/submit —— data={application,crosschain}；
// 跨链失败时任务已撤回 DRAFT，FailData 携带 {application,crosschain} 留痕。
func missionSubmitHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req missionSubmitReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		app, tx, err := deps.Business.SubmitMission(c.Request.Context(), TraceIDFrom(c), req.MissionID, req.Operator)
		if err != nil {
			FailData(c, crosschainErrCode(err), err.Error(), gin.H{"application": app, "crosschain": tx})
			return
		}
		OK(c, gin.H{"application": app, "crosschain": tx})
	}
}
