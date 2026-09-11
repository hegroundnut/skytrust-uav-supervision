// Package offchain 系统二：抗虫洞的秒级链下交易网络。
// 节点/拓扑/会话/消息引擎/虫洞仿真/5维检测/隔离恢复/性能统计。
// 域隔离（P3-3）：禁止 import internal/crosschain 与 internal/uavbusiness；
// 会话状态一律经 statemachine.SessionMachine.Assert（Global Constraint 7）。
package offchain

import (
	"gorm.io/gorm"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/crypto"
)

type Service struct {
	db    *gorm.DB
	cs    *crypto.Service
	audit *audit.Service
}

func New(db *gorm.DB, cs *crypto.Service, auditSvc *audit.Service) *Service {
	return &Service{db: db, cs: cs, audit: auditSvc}
}

// logAudit 业务审计统一留痕；审计失败不阻断业务（与 uavbusiness/网关约定一致）。
func (s *Service) logAudit(traceID, actor, action, targetType, targetID string, detail any) {
	if s.audit == nil {
		return
	}
	_ = s.audit.Log(actor, action, targetType, targetID, traceID, detail)
}
