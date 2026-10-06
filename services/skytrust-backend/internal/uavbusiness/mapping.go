package uavbusiness

import (
	"context"
	"strings"

	"skytrust-backend/internal/model"
)

// createIdentityMapping 追踪映射根治（spec §3.5）：UAV 注册跨链证明成功（VERIFIED）后
// 自动创建 IdentityMapping，使 7 级追踪 L2（伪名→真实身份）有真数据可溯。
// best-effort：任何失败只记审计留痕，绝不阻塞注册主流程；
// 同 uav_id 已有映射则不重复创建（幂等）；pseudo 撞 uniqueIndex 则重生成（至多 5 次）。
func (s *Service) createIdentityMapping(ctx context.Context, traceID string, uav *model.UAV) {
	var cnt int64
	if err := s.db.WithContext(ctx).Model(&model.IdentityMapping{}).
		Where("uav_id = ?", uav.UAVID).Count(&cnt).Error; err == nil && cnt > 0 {
		return // 已有映射（正常流程不应发生）：幂等不重复
	}
	for i := 0; i < 5; i++ {
		m := &model.IdentityMapping{
			MappingID:      model.GenMappingID(),
			Pseudo:         model.GenPseudo(),
			DeviceAddress:  model.GenDeviceAddress(),
			SM9Identity:    uav.SM9Identity,
			UAVID:          uav.UAVID,
			OperatorID:     uav.OperatorID,
			ManufacturerID: uav.ManufacturerID,
			SourceChain:    "chainmaker",
			PassID:         "", // pass/issue 成功后回填（backfillMappingPassID）
		}
		err := s.db.WithContext(ctx).Create(m).Error
		if err == nil {
			s.logAudit(traceID, uav.UAVID, "IDENTITY_MAPPING_CREATE", "IDENTITY_MAPPING", m.MappingID,
				map[string]any{"uav_id": uav.UAVID, "pseudo": m.Pseudo, "device_address": m.DeviceAddress})
			return
		}
		if msg := err.Error(); strings.Contains(msg, "UNIQUE constraint failed") && strings.Contains(msg, "pseudo") {
			continue // pseudo 碰撞：重生成
		}
		s.logAudit(traceID, uav.UAVID, "IDENTITY_MAPPING_FAILED", "IDENTITY_MAPPING", uav.UAVID,
			map[string]any{"error": err.Error()})
		return
	}
	s.logAudit(traceID, uav.UAVID, "IDENTITY_MAPPING_FAILED", "IDENTITY_MAPPING", uav.UAVID,
		map[string]any{"error": "pseudo space exhausted (5 collisions)"})
}

// backfillMappingPassID 追踪映射根治（spec §3.5）：pass/issue 成功后 best-effort 回填
// 该 UAV 最新映射的 pass_id——否则 7 级追踪 L3 判据 m.PassID=="" 恒断链。
// 规则：无映射→静默（断点留痕是监管层语义，这里禁止拼造）；已有 pass_id 不覆盖
// （保护 seed IDM-DEMO-0001 的冻结字面量 PASS-2026-001，C17 裁定）。
func (s *Service) backfillMappingPassID(ctx context.Context, traceID, uavID, passID, actor string) {
	var m model.IdentityMapping
	if err := s.db.WithContext(ctx).Where("uav_id = ?", uavID).
		Order("created_at DESC").First(&m).Error; err != nil {
		return
	}
	if m.PassID != "" {
		return
	}
	if err := s.db.WithContext(ctx).Model(&m).Update("pass_id", passID).Error; err != nil {
		s.logAudit(traceID, actor, "MAPPING_PASS_BACKFILL_FAILED", "IDENTITY_MAPPING", m.MappingID,
			map[string]any{"uav_id": uavID, "error": err.Error()})
		return
	}
	s.logAudit(traceID, actor, "MAPPING_PASS_BACKFILL", "IDENTITY_MAPPING", m.MappingID,
		map[string]any{"uav_id": uavID, "pass_id": passID})
}
