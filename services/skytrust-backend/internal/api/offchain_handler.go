package api

import (
	"github.com/gin-gonic/gin"
)

func topologyGetHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		view, err := deps.Offchain.TopologyGet(c.Request.Context(), TraceIDFrom(c))
		if err != nil {
			FailErr(c, err)
			return
		}
		OK(c, view)
	}
}
