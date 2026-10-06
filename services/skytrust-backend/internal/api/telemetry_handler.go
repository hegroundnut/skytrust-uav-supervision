package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/offchain"
)

// telemetryReportHandler POST /api/telemetry/report —— data={telemetry}；
// 会话不存在→6002；非 ACTIVE→7003（spec §3.2）。
func telemetryReportHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.TelemetryReportRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		tlm, err := deps.Offchain.ReportTelemetry(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"telemetry": tlm})
	}
}

// telemetryListHandler POST /api/telemetry/list —— data={records,total,page,page_size}。
func telemetryListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q offchain.TelemetryQuery
		if !bindOptionalBody(c, &q) { // 全字段可选：空体合法；格式错→6002
			return
		}
		q.Normalize()
		records, total, err := deps.Offchain.TelemetryList(c.Request.Context(), TraceIDFrom(c), &q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": q.Page, "page_size": q.PageSize})
	}
}

// telemetryLatestHandler POST /api/telemetry/latest —— data={telemetry}；
// 无记录 → code=0 + telemetry:null（spec §3.2）。
func telemetryLatestHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.TelemetryLatestRequest
		if !bindOptionalBody(c, &req) {
			return
		}
		tlm, err := deps.Offchain.LatestTelemetry(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"telemetry": tlm})
	}
}
