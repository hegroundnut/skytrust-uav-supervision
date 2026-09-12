package api

import (
	"github.com/gin-gonic/gin"
	"skytrust-backend/internal/audit"
)

// parseAuditFilter 解析审计查询过滤条件（缺省 page=1/page_size=20，
// Query 内部亦会应用默认值，此处为双保险）。
func parseAuditFilter(c *gin.Context) (audit.QueryFilter, bool) {
	var req struct {
		BusinessID string `json:"business_id"`
		Action     string `json:"action"`
		Actor      string `json:"actor"`
		Page       int    `json:"page"`
		PageSize   int    `json:"page_size"`
	}
	if !bindOptionalBody(c, &req) {
		return audit.QueryFilter{}, false
	}
	q := audit.QueryFilter{
		BusinessID: req.BusinessID,
		Action:     req.Action,
		Actor:      req.Actor,
		Page:       req.Page,
		PageSize:   req.PageSize,
	}
	if q.Page <= 0 {
		q.Page = 1
	}
	if q.PageSize <= 0 {
		q.PageSize = 20
	}
	return q, true
}

func auditQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		q, ok := parseAuditFilter(c)
		if !ok {
			return
		}
		records, total, err := deps.Audit.Query(q)
		if err != nil {
			FailErr(c, err)
			return
		}
		OK(c, gin.H{"total": total, "records": records})
	}
}

func auditExportHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		q, ok := parseAuditFilter(c)
		if !ok {
			return
		}
		records, _, err := deps.Audit.Query(q)
		if err != nil {
			FailErr(c, err)
			return
		}
		content, err := deps.Audit.ExportCSV(q)
		if err != nil {
			FailErr(c, err)
			return
		}
		OK(c, gin.H{"format": "csv", "content": string(content), "rows": len(records)})
	}
}
