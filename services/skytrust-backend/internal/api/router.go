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
		api.POST("/crosschain/send", crosschainSendHandler(deps))
		api.POST("/crosschain/query", crosschainQueryHandler(deps))
		api.POST("/crosschain/list", crosschainListHandler(deps))
		api.POST("/manufacturer/register", manufacturerRegisterHandler(deps))
		api.POST("/manufacturer/list", manufacturerListHandler(deps))
		api.POST("/operator/register", operatorRegisterHandler(deps))
		api.POST("/operator/list", operatorListHandler(deps))
		api.POST("/route/create", routeCreateHandler(deps))
		api.POST("/route/list", routeListHandler(deps))
		api.POST("/uav/register", uavRegisterHandler(deps))
		api.POST("/uav/query", uavQueryHandler(deps))
		api.POST("/uav/list", uavListHandler(deps))
		api.POST("/uav/status", uavStatusHandler(deps))
		api.POST("/uav/revoke", uavRevokeHandler(deps))
		api.POST("/mission/create", missionCreateHandler(deps))
		api.POST("/mission/query", missionQueryHandler(deps))
		api.POST("/mission/list", missionListHandler(deps))
		api.POST("/mission/submit", missionSubmitHandler(deps))
		api.POST("/review/submit", reviewSubmitHandler(deps))
		api.POST("/review/query", reviewQueryHandler(deps))
		api.POST("/conflict/detect", conflictDetectHandler(deps))
		api.POST("/conflict/resolve", conflictResolveHandler(deps))
		api.POST("/pass/issue", passIssueHandler(deps))
		api.POST("/pass/query", passQueryHandler(deps))
		api.POST("/pass/list", passListHandler(deps))
		api.POST("/pass/verify", passVerifyHandler(deps))
		api.POST("/pass/revoke", passRevokeHandler(deps))
		api.POST("/topology/get", topologyGetHandler(deps))
		api.POST("/node/register", nodeRegisterHandler(deps))
		api.POST("/node/list", nodeListHandler(deps))
		api.POST("/session/open", sessionOpenHandler(deps))
		api.POST("/session/close", sessionCloseHandler(deps))
		api.POST("/session/list", sessionListHandler(deps))
		api.POST("/message/send", messageSendHandler(deps))
		api.POST("/message/list", messageListHandler(deps))
		api.POST("/wormhole/toggle", wormholeToggleHandler(deps))
		api.POST("/risk/evaluate", riskEvaluateHandler(deps))
	}
	return r, nil
}
