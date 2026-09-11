package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/uavbusiness"
)

type reviewSubmitReq struct {
	ApplicationID string   `json:"application_id" binding:"required"`
	Result        string   `json:"result" binding:"required"` // APPROVED|REJECTED|NEED_COORDINATION
	Reviewer      string   `json:"reviewer" binding:"required"`
	Comment       string   `json:"comment"`
	RulesHit      []string `json:"rules_hit"`
}

// reviewSubmitHandler POST /api/review/submit —— data={review,mission,crosschain}；
// 跨链失败时任务停留 REVIEWING，FailData 携带三元留痕，可重试。
func reviewSubmitHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req reviewSubmitReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		rev, m, tx, err := deps.Business.SubmitReview(c.Request.Context(), TraceIDFrom(c), uavbusiness.ReviewInput{
			ApplicationID: req.ApplicationID, Result: req.Result, Reviewer: req.Reviewer,
			Comment: req.Comment, RulesHit: req.RulesHit,
		})
		if err != nil {
			FailData(c, crosschainErrCode(err), err.Error(), gin.H{"review": rev, "mission": m, "crosschain": tx})
			return
		}
		OK(c, gin.H{"review": rev, "mission": m, "crosschain": tx})
	}
}

type reviewQueryReq struct {
	ReviewID      string `json:"review_id"`
	ApplicationID string `json:"application_id"`
}

func reviewQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req reviewQueryReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		single, list, err := deps.Business.QueryReview(c.Request.Context(), TraceIDFrom(c), req.ReviewID, req.ApplicationID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		if single != nil {
			OK(c, single)
			return
		}
		OK(c, gin.H{"records": list, "total": len(list)})
	}
}
