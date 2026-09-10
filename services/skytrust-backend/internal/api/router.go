package api

import "github.com/gin-gonic/gin"

func NewRouter(deps *Deps) (*gin.Engine, error) {
	if err := deps.Validate(); err != nil {
		return nil, err
	}
	r := gin.New()
	r.Use(TraceMiddleware(), LogMiddleware(), RecoveryMiddleware())
	api := r.Group("/api")
	{
		api.POST("/health/ping", func(c *gin.Context) { OK(c, gin.H{"ping": "pong"}) })
		api.POST("/health/check", healthCheck(deps))
		api.POST("/chain/status", chainStatus(deps))
		api.POST("/crypto/sm3", sm3Handler(deps))
		api.POST("/crypto/sm9/keygen", sm9KeygenHandler(deps))
		api.POST("/crypto/sm9/sign", sm9SignHandler(deps))
		api.POST("/crypto/sm9/verify", sm9VerifyHandler(deps))
		api.POST("/demo/init", demoInitHandler(deps))
		api.POST("/demo/reset", demoResetHandler(deps))
		api.POST("/audit/query", auditQueryHandler(deps))
		api.POST("/audit/export", auditExportHandler(deps))
	}
	return r, nil
}
