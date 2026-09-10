package api

import "github.com/gin-gonic/gin"

func NewRouter(deps *Deps) *gin.Engine {
	r := gin.New()
	r.Use(TraceMiddleware(), LogMiddleware(), RecoveryMiddleware())
	api := r.Group("/api")
	{
		api.POST("/health/ping", func(c *gin.Context) { OK(c, gin.H{"ping": "pong"}) })
		api.POST("/health/check", healthCheck(deps))
		api.POST("/chain/status", chainStatus(deps))
	}
	return r
}
