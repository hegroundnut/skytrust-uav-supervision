// Package uavbusiness 系统一业务服务：主数据、无人机注册、任务全生命周期、
// 审核/冲突协调、飞行许可。全部状态迁移必须经 statemachine.Assert 并审计留痕
// （Global Constraint 7）；全部跨链调用必须经 sendCrosschain → 网关（强制原则 1/2）。
package uavbusiness

import (
	"context"

	"gorm.io/gorm"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/model"
)

type Service struct {
	db    *gorm.DB
	cs    *crypto.Service
	gw    *crosschain.Gateway
	audit *audit.Service
}

func New(db *gorm.DB, cs *crypto.Service, gw *crosschain.Gateway, auditSvc *audit.Service) *Service {
	return &Service{db: db, cs: cs, gw: gw, audit: auditSvc}
}

// logAudit 业务审计统一留痕；审计失败不阻断业务（与网关约定一致）。
func (s *Service) logAudit(traceID, actor, action, targetType, targetID string, detail any) {
	if s.audit == nil {
		return
	}
	_ = s.audit.Log(actor, action, targetType, targetID, traceID, detail)
}

// sendCrosschain 统一跨链出口：构规范化信封 → uid SM9 签名 → 网关 Send。
// 返回的 tx 在失败时同样非 nil（网关留痕记录），调用方应透传给 FailData。
func (s *Service) sendCrosschain(ctx context.Context, traceID, msgType, businessID, sourceChain, targetChain string, payload map[string]any, uid string, sourceTxID string) (*model.CrosschainTx, error) {
	env := crosschain.BuildEnvelope(msgType, businessID, sourceChain, targetChain, payload)
	sig, sm3, err := crosschain.SignEnvelope(s.cs, uid, env)
	if err != nil {
		return nil, err
	}
	return s.gw.Send(ctx, traceID, &crosschain.SendRequest{
		MessageType: msgType, BusinessID: businessID,
		SourceChain: sourceChain, FinalTargetChain: targetChain,
		Payload: payload, SM9Identity: uid, Signature: sig, SM3Hash: sm3,
		SourceChainTxID: sourceTxID,
	})
}
