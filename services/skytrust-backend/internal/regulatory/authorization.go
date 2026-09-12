package regulatory

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

type AuthApplyRequest struct {
	AuthorizationID string   `json:"authorization_id"` // 可选显式 ID（P4-10；演示用 AUTH-2026-001）
	RegulatorID     string   `json:"regulator_id" binding:"required"`
	Scope           []string `json:"scope" binding:"required,min=1"` // MISSION|ROUTE|PAYLOAD|IDENTITY|EVIDENCE 多选
	TargetType      string   `json:"target_type" binding:"required"` // MISSION|UAV|ALERT
	TargetID        string   `json:"target_id" binding:"required"`
	Reason          string   `json:"reason"` // 告警目标可省（自动生成）；其余必填
	ValidFrom       string   `json:"valid_from"`
	ValidTo         string   `json:"valid_to"`
}

// ApplyAuthorization 授权申请：枚举/目标存在性/窗口校验 → audit_hash（SM3 规范化）→ PENDING 落库 → 审计。
// 审批前不上链（P4-5：只有 APPROVE 产生 ChainMaker 登记）。
func (s *Service) ApplyAuthorization(ctx context.Context, traceID string, req *AuthApplyRequest) (*model.RegulatoryAuth, error) {
	if req.RegulatorID == "" || req.TargetID == "" || len(req.Scope) == 0 {
		return nil, errcode.NewError(errcode.Param, "regulator_id/target_id/scope 必填")
	}
	seen := make(map[string]bool, len(req.Scope))
	for _, sc := range req.Scope {
		if !authScopes[sc] {
			return nil, errcode.NewError(errcode.Param, "scope %q 非法（MISSION|ROUTE|PAYLOAD|IDENTITY|EVIDENCE）", sc)
		}
		if seen[sc] {
			return nil, errcode.NewError(errcode.Param, "scope 重复 %q", sc)
		}
		seen[sc] = true
	}
	if !authTargetTypes[req.TargetType] {
		return nil, errcode.NewError(errcode.Param, "target_type %q 非法（MISSION|UAV|ALERT）", req.TargetType)
	}
	var cnt int64
	switch req.TargetType {
	case "MISSION":
		cnt = s.count(ctx, &model.Mission{}, "mission_id", req.TargetID)
	case "UAV":
		cnt = s.count(ctx, &model.UAV{}, "uav_id", req.TargetID)
	case "ALERT":
		cnt = s.count(ctx, &model.SecurityEvent{}, "alert_id", req.TargetID)
	}
	if cnt < 0 {
		return nil, errcode.NewError(errcode.Internal, "target lookup failed")
	}
	if cnt == 0 {
		return nil, errcode.NewError(errcode.Param, "%s 目标 %s 不存在", req.TargetType, req.TargetID)
	}
	reason := req.Reason
	if reason == "" {
		if req.TargetType != "ALERT" {
			return nil, errcode.NewError(errcode.Param, "reason 必填（非告警目标必须说明授权事由）")
		}
		reason = fmt.Sprintf("监管核查告警 %s", req.TargetID)
	}
	vf := timex.Now()
	if req.ValidFrom != "" {
		p, err := timex.ParseTime(req.ValidFrom)
		if err != nil {
			return nil, errcode.NewError(errcode.Param, "valid_from 格式非法（应为 2006-01-02 15:04:05[.000]）: %v", err)
		}
		vf = p
	}
	vt := vf.Add(24 * time.Hour)
	if req.ValidTo != "" {
		p, err := timex.ParseTime(req.ValidTo)
		if err != nil {
			return nil, errcode.NewError(errcode.Param, "valid_to 格式非法（应为 2006-01-02 15:04:05[.000]）: %v", err)
		}
		vt = p
	}
	if !vt.After(vf) {
		return nil, errcode.NewError(errcode.Param, "valid_to 必须晚于 valid_from")
	}
	id := req.AuthorizationID
	if id == "" {
		id = model.GenAuthID()
	} else {
		if !model.ValidateID("AUTH", id) {
			return nil, errcode.NewError(errcode.Param, "authorization_id %q 格式非法（AUTH-<非空无空格>）", id)
		}
		var dup int64
		if err := s.db.WithContext(ctx).Model(&model.RegulatoryAuth{}).Where("authorization_id = ?", id).Count(&dup).Error; err != nil {
			return nil, errcode.NewError(errcode.Internal, "authorization_id 查重: %v", err)
		}
		if dup > 0 {
			return nil, errcode.NewError(errcode.Param, "authorization_id %q 已存在", id)
		}
	}
	scopeJSON, err := json.Marshal(req.Scope)
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "scope json: %v", err)
	}
	hash, err := s.cs.HashCanonical(map[string]any{
		"authorization_id": id, "regulator_id": req.RegulatorID, "scope": req.Scope,
		"target_type": req.TargetType, "target_id": req.TargetID, "reason": reason,
		"valid_from": timex.FormatTime(vf), "valid_to": timex.FormatTime(vt),
	})
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "audit hash: %v", err)
	}
	auth := &model.RegulatoryAuth{
		AuthorizationID: id, RegulatorID: req.RegulatorID, Scope: string(scopeJSON),
		TargetType: req.TargetType, TargetID: req.TargetID, Reason: reason,
		ValidFrom: timex.New(vf), ValidTo: timex.New(vt), Status: "PENDING", AuditHash: hash,
	}
	if err := s.db.WithContext(ctx).Create(auth).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "create regulatory_auth: %v", err)
	}
	s.logAudit(traceID, req.RegulatorID, "AUTH_APPLY", "AUTH", auth.AuthorizationID, map[string]any{
		"scope": req.Scope, "target_type": auth.TargetType, "target_id": auth.TargetID,
		"reason": reason, "valid_from": timex.FormatTime(vf), "valid_to": timex.FormatTime(vt),
	})
	return auth, nil
}

// count 目标存在性计数；查询失败返回 -1（调用方转 9001）。
func (s *Service) count(ctx context.Context, m any, col, val string) int64 {
	var cnt int64
	if err := s.db.WithContext(ctx).Model(m).Where(col+" = ?", val).Count(&cnt).Error; err != nil {
		return -1
	}
	return cnt
}

type AuthReviewRequest struct {
	AuthorizationID string `json:"authorization_id" binding:"required"`
	Decision        string `json:"decision" binding:"required"` // APPROVE|DENY
	ReviewerID      string `json:"reviewer_id" binding:"required"`
	Comment         string `json:"comment"`
}

type AuthReviewResult struct {
	Auth      *model.RegulatoryAuth  `json:"auth"`
	Audit     *model.RegulatoryAudit `json:"audit"`
	ChainTxID string                 `json:"chain_tx_id"`
}

// ReviewAuthorization 授权审批（P4-5）：APPROVE → ChainMaker regulatory_authorization 上链成功后
// AUTHORIZED（上链失败 2001，停留 PENDING 可重试）；DENY → 本地 DENIED（拒绝不上链）。两者均落 RegulatoryAudit。
func (s *Service) ReviewAuthorization(ctx context.Context, traceID string, req *AuthReviewRequest) (*AuthReviewResult, error) {
	if req.ReviewerID == "" {
		return nil, errcode.NewError(errcode.Param, "reviewer_id 必填")
	}
	if req.Decision != "APPROVE" && req.Decision != "DENY" {
		return nil, errcode.NewError(errcode.Param, "decision %q 非法（APPROVE|DENY）", req.Decision)
	}
	var auth model.RegulatoryAuth
	if err := s.db.WithContext(ctx).Where("authorization_id = ?", req.AuthorizationID).First(&auth).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errcode.NewError(errcode.Param, "授权 %s 不存在", req.AuthorizationID)
		}
		return nil, errcode.NewError(errcode.Internal, "load regulatory_auth: %v", err)
	}
	if auth.Status != "PENDING" {
		return nil, errcode.NewError(errcode.Param, "授权 %s 状态 %s: only PENDING can be reviewed", auth.AuthorizationID, auth.Status)
	}
	resultJSON, err := json.Marshal(map[string]any{"decision": req.Decision, "comment": req.Comment})
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "result json: %v", err)
	}
	action, chainTxID := "AUTH_DENY", ""
	if req.Decision == "APPROVE" {
		chain, ok := s.gw.Chain(crosschain.RegChainName)
		if !ok {
			return nil, errcode.NewError(errcode.Internal, "监管链 %s 未接入", crosschain.RegChainName)
		}
		receipt, err := chain.SubmitTx(ctx, ContractRegAuth, MethodRecordAuth, map[string]any{
			"authorization_id": auth.AuthorizationID, "regulator_id": auth.RegulatorID, "scope": auth.Scope,
			"target_type": auth.TargetType, "target_id": auth.TargetID, "reason": auth.Reason,
			"valid_from": timex.FormatTime(auth.ValidFrom.Time), "valid_to": timex.FormatTime(auth.ValidTo.Time),
			"audit_hash": auth.AuditHash,
		})
		if err != nil {
			return nil, errcode.NewError(errcode.CrosschainSend, "regulatory_authorization 上链失败（授权停留 PENDING 可重试）: %v", err)
		}
		// 偏差C2（已批准）：模拟链失败注入返回 (receipt{Status:1}, nil)，须同时校验回执状态
		// （与 crosschain/gateway.go、uavbusiness/mission.go 的既有惯例一致）；失败不上抛即停留 PENDING 可重试。
		if receipt.Status != 0 {
			return nil, errcode.NewError(errcode.CrosschainSend, "regulatory_authorization 上链失败（status=%d，授权停留 PENDING 可重试）", receipt.Status)
		}
		action, chainTxID = "AUTH_APPROVE", receipt.TxID
		auth.Status = "AUTHORIZED"
	} else {
		auth.Status = "DENIED"
	}
	if err := s.db.WithContext(ctx).Model(&auth).Update("status", auth.Status).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "update regulatory_auth: %v", err)
	}
	regAudit := &model.RegulatoryAudit{
		AuditID: model.GenAuditID(), AuthorizationID: auth.AuthorizationID, Action: action,
		OperatorID: req.ReviewerID, Target: auth.TargetID, Result: string(resultJSON),
		AuditHash: auth.AuditHash, ChainTxID: chainTxID,
	}
	if err := s.db.WithContext(ctx).Create(regAudit).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "create regulatory_audit: %v", err)
	}
	s.logAudit(traceID, req.ReviewerID, "AUTH_REVIEW", "AUTH", auth.AuthorizationID, map[string]any{
		"decision": req.Decision, "status": auth.Status, "chain_tx_id": chainTxID, "comment": req.Comment,
	})
	return &AuthReviewResult{Auth: &auth, Audit: regAudit, ChainTxID: chainTxID}, nil
}
