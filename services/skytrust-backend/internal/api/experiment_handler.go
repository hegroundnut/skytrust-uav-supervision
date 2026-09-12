package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/experiment"
)

// experimentRunHandler POST /api/experiment/run — 实验运行唯一入口（P5-R3）。
// setup 失败：service 返回 FAILED run 行 + 6001 → FailData 带行回传（留痕语义，
// 与 crosschain/send 失败带记录回传同规）；校验失败 run==nil → 普通 Fail。
func experimentRunHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req experiment.RunRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		run, err := deps.Experiment.Run(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			if run != nil {
				FailData(c, crosschainErrCode(err), err.Error(), run)
				return
			}
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, run)
	}
}

// experimentResultHandler POST /api/experiment/result — 只读查询（Finding-2 豁免：无审计）。
func experimentResultHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RunID string `json:"run_id" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		run, err := deps.Experiment.Result(c.Request.Context(), req.RunID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, run)
	}
}

// experimentListHandler POST /api/experiment/list — 列表契约 records/total/page/page_size。
func experimentListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q experiment.ExperimentQuery
		if !bindOptionalBody(c, &q) { // 全字段可选：空体合法；格式错→6002
			return
		}
		records, total, err := deps.Experiment.List(c.Request.Context(), &q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": q.Page, "page_size": q.PageSize})
	}
}

// experimentExportHandler POST /api/experiment/export — CSV 文本内联回传（与
// regulatory/audit/export 同构：format/content/rows）。
func experimentExportHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q experiment.ExperimentQuery
		if !bindOptionalBody(c, &q) {
			return
		}
		content, rows, err := deps.Experiment.ExportCSV(c.Request.Context(), &q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"format": "csv", "content": string(content), "rows": rows})
	}
}
