package uavbusiness

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/statemachine"
)

type UAVInput struct {
	UAVID          string // 可选，缺省自动生成
	ManufacturerID string
	OperatorID     string
	Model          string
	SerialNo       string
}

// genUAVID 自动生成 UAV-<operator 末段大写>-%03d，序号从该 operator 名下数量+1 起
// 递增探测直至无冲突；operator_id 无 "-" 分段时用 X。
func (s *Service) genUAVID(operatorID string) (string, error) {
	seg := "X"
	if i := strings.LastIndex(operatorID, "-"); i >= 0 && i < len(operatorID)-1 {
		seg = operatorID[i+1:]
	}
	var cnt int64
	if err := s.db.Model(&model.UAV{}).Where("operator_id = ?", operatorID).Count(&cnt).Error; err != nil {
		return "", err
	}
	for n := int(cnt) + 1; n < 1000; n++ {
		cand := fmt.Sprintf("UAV-%s-%03d", strings.ToUpper(seg), n)
		var dup int64
		if err := s.db.Model(&model.UAV{}).Where("uav_id = ?", cand).Count(&dup).Error; err != nil {
			return "", err
		}
		if dup == 0 {
			return cand, nil
		}
	}
	return "", fmt.Errorf("uav_id space exhausted for operator %s", operatorID)
}

// transitionUAV UAV 状态迁移统一出口（Global Constraint 7）：Assert → 落库 → 审计。
func (s *Service) transitionUAV(traceID, actor string, uav *model.UAV, to, trigger string) error {
	from := uav.Status
	if err := statemachine.UAVMachine.Assert(from, to); err != nil {
		return crosschain.NewError(errcode.UAVState, "%v", err)
	}
	if err := s.db.Model(uav).Update("status", to).Error; err != nil {
		return crosschain.NewError(errcode.Internal, "persist status: %v", err)
	}
	uav.Status = to
	s.logAudit(traceID, actor, "STATE_TRANSITION", "UAV", uav.UAVID,
		map[string]any{"from": from, "to": to, "trigger": trigger})
	return nil
}

// prevFailedSourceTxID 查该业务最近一条 FAILED 跨链记录已确认的源链 TxID。
// 重试入口用它复用源链交易：语义正确（源链交易客观已存在）且幂等键第三元素
// 变化 → 新键放行新尝试（Ruling：FAILED 重试不走网关幂等拦截）。
func (s *Service) prevFailedSourceTxID(msgType, businessID string) string {
	var prev model.CrosschainTx
	err := s.db.Where("message_type = ? AND business_id = ? AND status = ? AND source_chain_tx_id <> ''",
		msgType, businessID, "FAILED").Order("created_at DESC").First(&prev).Error
	if err != nil {
		return ""
	}
	return prev.SourceChainTxID
}

// sendUAVProof 发起 UAV_REGISTER_PROOF 跨链（fabric→chainmaker，以 uav 的 SM9 身份签名）。
func (s *Service) sendUAVProof(ctx context.Context, traceID string, uav *model.UAV) (*model.CrosschainTx, error) {
	payload := map[string]any{
		"uav_id": uav.UAVID, "manufacturer_id": uav.ManufacturerID,
		"operator_id": uav.OperatorID, "serial_no": uav.SerialNo,
		"model": uav.Model, "sm9_identity": uav.SM9Identity,
	}
	sourceTxID := s.prevFailedSourceTxID(crosschain.MsgUAVRegisterProof, uav.UAVID)
	return s.sendCrosschain(ctx, traceID, crosschain.MsgUAVRegisterProof, uav.UAVID,
		"fabric", crosschain.RegChainName, payload, uav.SM9Identity, sourceTxID)
}

// RegisterUAV 无人机注册（实施文档 §9.2 步骤1）。跨链失败停留 REGISTERED，
// 返回的 tx 为网关留痕记录（非 nil），可经 StatusUAV VERIFY 重试。
func (s *Service) RegisterUAV(ctx context.Context, traceID string, in UAVInput) (*model.UAV, *model.CrosschainTx, error) {
	if in.ManufacturerID == "" || in.OperatorID == "" || in.SerialNo == "" {
		return nil, nil, crosschain.NewError(errcode.Param, "manufacturer_id/operator_id/serial_no 必填")
	}
	var cnt int64
	if err := s.db.WithContext(ctx).Model(&model.Manufacturer{}).Where("manufacturer_id = ?", in.ManufacturerID).Count(&cnt).Error; err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "manufacturer lookup: %v", err)
	}
	if cnt == 0 {
		return nil, nil, crosschain.NewError(errcode.InvalidUAV, "manufacturer_id %q 不存在", in.ManufacturerID)
	}
	if err := s.db.WithContext(ctx).Model(&model.Operator{}).Where("operator_id = ?", in.OperatorID).Count(&cnt).Error; err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "operator lookup: %v", err)
	}
	if cnt == 0 {
		return nil, nil, crosschain.NewError(errcode.InvalidUAV, "operator_id %q 不存在", in.OperatorID)
	}
	if err := s.db.WithContext(ctx).Model(&model.UAV{}).Where("serial_no = ?", in.SerialNo).Count(&cnt).Error; err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "serial lookup: %v", err)
	}
	if cnt > 0 {
		return nil, nil, crosschain.NewError(errcode.Param, "serial_no %q 已存在", in.SerialNo)
	}
	uavID := in.UAVID
	if uavID == "" {
		gen, err := s.genUAVID(in.OperatorID)
		if err != nil {
			return nil, nil, crosschain.NewError(errcode.Internal, "gen uav_id: %v", err)
		}
		uavID = gen
	} else if err := s.db.WithContext(ctx).Model(&model.UAV{}).Where("uav_id = ?", uavID).Count(&cnt).Error; err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "uav_id lookup: %v", err)
	} else if cnt > 0 {
		return nil, nil, crosschain.NewError(errcode.Param, "uav_id %q 已存在", uavID)
	}
	uav := &model.UAV{
		UAVID: uavID, ManufacturerID: in.ManufacturerID, OperatorID: in.OperatorID,
		Model: in.Model, SerialNo: in.SerialNo,
		SM9Identity: crypto.SM9IdentityOf(uavID), Status: "UNREGISTERED",
	}
	if err := s.db.WithContext(ctx).Create(uav).Error; err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "create uav: %v", err)
	}
	if err := s.transitionUAV(traceID, in.OperatorID, uav, "REGISTERED", "REGISTER"); err != nil {
		return uav, nil, err
	}
	tx, err := s.sendUAVProof(ctx, traceID, uav)
	if err != nil {
		return uav, tx, err // 停留 REGISTERED，tx 为 FAILED 留痕
	}
	if err := s.transitionUAV(traceID, in.OperatorID, uav, "VERIFIED", "REGISTER_PROOF_OK"); err != nil {
		return uav, tx, err
	}
	return uav, tx, nil
}

// QueryUAV 单机查询；不存在 → 1001。
func (s *Service) QueryUAV(ctx context.Context, traceID, uavID string) (*model.UAV, error) {
	var uav model.UAV
	err := s.db.WithContext(ctx).Where("uav_id = ?", uavID).First(&uav).Error
	if err == gorm.ErrRecordNotFound {
		return nil, crosschain.NewError(errcode.InvalidUAV, "uav_id %q 不存在", uavID)
	}
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "query uav: %v", err)
	}
	return &uav, nil
}

// UAVListFilter 无人机列表过滤（分页约定同 ListMission）。
type UAVListFilter struct {
	OperatorID     string
	ManufacturerID string
	Status         string
	Page           int
	PageSize       int
}

// ListUAV 按 operator/manufacturer/status 过滤（空串 = 不过滤），uav_id 升序分页。
func (s *Service) ListUAV(ctx context.Context, traceID string, f UAVListFilter) ([]model.UAV, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.WithContext(ctx).Model(&model.UAV{})
	if f.OperatorID != "" {
		q = q.Where("operator_id = ?", f.OperatorID)
	}
	if f.ManufacturerID != "" {
		q = q.Where("manufacturer_id = ?", f.ManufacturerID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.UAV
	if err := q.Order("uav_id ASC").Offset((f.Page - 1) * f.PageSize).Limit(f.PageSize).Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}

var uavActionTarget = map[string]string{
	"VERIFY": "VERIFIED", "ACTIVATE": "ACTIVE", "SUSPEND": "SUSPENDED", "RESUME": "ACTIVE",
}

// StatusUAV 执行 VERIFY|ACTIVATE|SUSPEND|RESUME。VERIFY 仅允许 REGISTERED 起点，
// 重跑注册证明跨链（注册失败后的重试入口）；其余为纯状态迁移。
// 未知 action → 6002；非法迁移 → 1004；未知 uav → 1001。
func (s *Service) StatusUAV(ctx context.Context, traceID, uavID, action string) (*model.UAV, *model.CrosschainTx, error) {
	uav, err := s.QueryUAV(ctx, traceID, uavID)
	if err != nil {
		return nil, nil, err
	}
	to, ok := uavActionTarget[action]
	if !ok {
		return uav, nil, crosschain.NewError(errcode.Param, "action 仅允许 VERIFY|ACTIVATE|SUSPEND|RESUME，收到 %q", action)
	}
	if action == "VERIFY" {
		if err := statemachine.UAVMachine.Assert(uav.Status, to); err != nil {
			return uav, nil, crosschain.NewError(errcode.UAVState, "%v", err)
		}
		tx, err := s.sendUAVProof(ctx, traceID, uav)
		if err != nil {
			return uav, tx, err
		}
		if err := s.transitionUAV(traceID, uav.OperatorID, uav, to, "VERIFY"); err != nil {
			return uav, tx, err
		}
		return uav, tx, nil
	}
	if err := s.transitionUAV(traceID, uav.OperatorID, uav, to, action); err != nil {
		return uav, nil, err
	}
	return uav, nil, nil
}

// RevokeUAV 注销：任何非 REVOKED 态 → REVOKED（终态；再注销 → 1004）。
func (s *Service) RevokeUAV(ctx context.Context, traceID, uavID, reason, operator string) (*model.UAV, error) {
	uav, err := s.QueryUAV(ctx, traceID, uavID)
	if err != nil {
		return nil, err
	}
	actor := operator
	if actor == "" {
		actor = "SYSTEM"
	}
	if err := s.transitionUAV(traceID, actor, uav, "REVOKED", "REVOKE"); err != nil {
		return uav, err
	}
	s.logAudit(traceID, actor, "UAV_REVOKE", "UAV", uav.UAVID, map[string]any{"reason": reason})
	return uav, nil
}
