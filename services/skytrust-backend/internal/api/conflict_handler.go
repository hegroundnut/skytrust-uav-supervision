package api

import (
	"github.com/gin-gonic/gin"
)

type conflictDetectReq struct {
	MissionID string `json:"mission_id" binding:"required"`
}

func conflictDetectHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req conflictDetectReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		list, err := deps.Business.DetectConflict(c.Request.Context(), TraceIDFrom(c), req.MissionID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"conflicts": list, "count": len(list)})
	}
}

type conflictResolveReq struct {
	ConflictID string `json:"conflict_id" binding:"required"`
	Resolution string `json:"resolution" binding:"required"`
	Operator   string `json:"operator" binding:"required"`
	MissionID  string `json:"mission_id"` // 空 = 双方回 REVIEWING
}

func conflictResolveHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req conflictResolveReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		rec, err := deps.Business.ResolveConflict(c.Request.Context(), TraceIDFrom(c),
			req.ConflictID, req.Resolution, req.Operator, req.MissionID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, rec)
	}
}
