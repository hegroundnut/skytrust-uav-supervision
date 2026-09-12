package regulatory

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/demo"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// payloadCompat 任务类型→允许载荷兼容表（P4-7；未收录的任务类型跳过兼容检查）。
var payloadCompat = map[string][]string{
	"SURVEY":           {"CAMERA", "LIDAR"},
	"POWER_INSPECTION": {"CAMERA", "SENSOR", "LIDAR"},
	"LOGISTICS":        {"CARGO"},
	"EMERGENCY":        {"MEDICAL", "CARGO", "CAMERA"},
}

type InspectRequest struct {
	MissionID       string `json:"mission_id" binding:"required"`
	AuthorizationID string `json:"authorization_id"`
	RegulatorID     string `json:"regulator_id"`
	Trajectory      string `json:"trajectory"`   // ""|NORMAL|DEVIATION（demo 轨迹数据，P4-4）
	PayloadType     string `json:"payload_type"` // 实际装载载荷申报（可选）
}

type InspectSealed struct {
	MissionID        string `json:"mission_id"`
	CiphertextStatus string `json:"ciphertext_status"` // SEALED|OPENED
	SM3Hash          string `json:"sm3_hash"`
	MaskedValue      string `json:"masked_value"`
	HasCiphertext    bool   `json:"has_ciphertext"`
}

type InspectVerification struct {
	DigestMatch    bool   `json:"digest_match"`
	SignatureValid bool   `json:"signature_valid"`
	AuditHash      string `json:"audit_hash"`
}

type InspectConclusion struct {
	RouteVerdict   string   `json:"route_verdict"`   // ROUTE_OK|ROUTE_DEVIATION|NOT_CHECKED
	PayloadVerdict string   `json:"payload_verdict"` // PAYLOAD_OK|MISSION_MISMATCH|NOT_CHECKED
	RaisedAlerts   []string `json:"raised_alerts"`
}

type InspectResult struct {
	Authorized    bool                 `json:"authorized"`
	Mission       *model.Mission       `json:"mission,omitempty"` // MissionCiphertext 为 json:"-"，永不出库
	Scope         []string             `json:"scope,omitempty"`
	DecryptedView string               `json:"decrypted_view,omitempty"` // 仅授权响应临时生成，不落库（spec §5）
	Sealed        *InspectSealed       `json:"sealed,omitempty"`
	Verification  *InspectVerification `json:"verification,omitempty"`
	Conclusion    *InspectConclusion   `json:"conclusion,omitempty"`
	ChainTxID     string               `json:"chain_tx_id,omitempty"`
	RegAuditID    string               `json:"reg_audit_id,omitempty"`
}

// InspectCiphertext 密文核验（spec §5.5/§9.3，P4-6/P4-7/P4-8）：
// 未授权 → 5002 sealed；窗口外 → 5004（惰性 EXPIRED）；scope/目标违规 → 5003；
// 授权通过 → SM9 解密临时视图 + SM3/SM9 完整性验证 + 航路/载荷一致性结论；
// 结论 audit_hash 写 ChainMaker audit_record（失败 → 2001 + sealed-only，明文绝不进错误信封）。
func (s *Service) InspectCiphertext(ctx context.Context, traceID string, req *InspectRequest) (*InspectResult, error) {
	actor := req.RegulatorID
	if actor == "" {
		actor = "anonymous"
	}
	var m model.Mission
	if err := s.db.WithContext(ctx).Where("mission_id = ?", req.MissionID).First(&m).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errcode.NewError(errcode.Param, "mission_id %q 不存在", req.MissionID)
		}
		return nil, errcode.NewError(errcode.Internal, "load mission: %v", err)
	}
	sealed := &InspectSealed{
		MissionID: m.MissionID, CiphertextStatus: "SEALED", SM3Hash: m.SM3Hash,
		MaskedValue: m.MaskedValue, HasCiphertext: m.MissionCiphertext != "",
	}
	deny := func(code int, auditAction, format string, args ...any) (*InspectResult, error) {
		reason := fmt.Sprintf(format, args...)
		s.logAudit(traceID, actor, auditAction, "MISSION", m.MissionID, map[string]any{
			"authorization_id": req.AuthorizationID, "reason": reason,
		})
		return &InspectResult{Authorized: false, Sealed: sealed}, errcode.NewError(code, "%s", reason)
	}
	if req.Trajectory != "" && req.Trajectory != "NORMAL" && req.Trajectory != "DEVIATION" {
		return nil, errcode.NewError(errcode.Param, "trajectory %q 非法（NORMAL|DEVIATION）", req.Trajectory)
	}
	if req.AuthorizationID == "" {
		return deny(errcode.NoAuth, "INSPECT_UNAUTHORIZED",
			"mission %s 密文未授权访问：仅返回密文状态/摘要/脱敏值", m.MissionID)
	}
	var auth model.RegulatoryAuth
	if err := s.db.WithContext(ctx).Where("authorization_id = ?", req.AuthorizationID).First(&auth).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return deny(errcode.NoAuth, "INSPECT_UNAUTHORIZED",
				"授权 %s 不存在或未授权：仅返回密文状态/摘要/脱敏值", req.AuthorizationID)
		}
		return nil, errcode.NewError(errcode.Internal, "load regulatory_auth: %v", err)
	}
	now := timex.Now()
	switch auth.Status {
	case "AUTHORIZED":
		if now.After(auth.ValidTo.Time) {
			// 惰性过期（P4-5）：顺带更新行状态
			if err := s.db.WithContext(ctx).Model(&auth).Update("status", "EXPIRED").Error; err != nil {
				return nil, errcode.NewError(errcode.Internal, "expire regulatory_auth: %v", err)
			}
			return deny(errcode.AuthExpired, "INSPECT_EXPIRED",
				"授权 %s 已超出有效窗口（valid_to %s）", auth.AuthorizationID, timex.FormatTime(auth.ValidTo.Time))
		}
		if now.Before(auth.ValidFrom.Time) {
			return deny(errcode.AuthExpired, "INSPECT_EXPIRED",
				"授权 %s 尚未生效（valid_from %s）", auth.AuthorizationID, timex.FormatTime(auth.ValidFrom.Time))
		}
	case "EXPIRED":
		return deny(errcode.AuthExpired, "INSPECT_EXPIRED", "授权 %s 已过期", auth.AuthorizationID)
	case "PENDING", "DENIED":
		return deny(errcode.NoAuth, "INSPECT_UNAUTHORIZED",
			"授权 %s 状态 %s：未授权访问明文", auth.AuthorizationID, auth.Status)
	default:
		return deny(errcode.NoAuth, "INSPECT_UNAUTHORIZED",
			"授权 %s 状态 %s 非法", auth.AuthorizationID, auth.Status)
	}
	// 目标匹配（P4-8）
	matched := false
	switch auth.TargetType {
	case "MISSION":
		matched = auth.TargetID == m.MissionID
	case "UAV":
		matched = auth.TargetID == m.UAVID
	case "ALERT":
		var cnt int64
		if err := s.db.WithContext(ctx).Model(&model.SecurityEvent{}).
			Where("alert_id = ? AND mission_id = ?", auth.TargetID, m.MissionID).Count(&cnt).Error; err != nil {
			return nil, errcode.NewError(errcode.Internal, "alert target lookup: %v", err)
		}
		matched = cnt > 0
	}
	if !matched {
		return deny(errcode.AuthScope, "INSPECT_SCOPE_DENIED",
			"授权目标（%s:%s）与任务 %s 不匹配", auth.TargetType, auth.TargetID, m.MissionID)
	}
	var scope []string
	if err := json.Unmarshal([]byte(auth.Scope), &scope); err != nil {
		return nil, errcode.NewError(errcode.Internal, "scope json corrupt: %v", err)
	}
	scopeSet := make(map[string]bool, len(scope))
	for _, sc := range scope {
		scopeSet[sc] = true
	}
	if req.Trajectory != "" && !scopeSet["ROUTE"] {
		return deny(errcode.AuthScope, "INSPECT_SCOPE_DENIED", "轨迹核偏需 ROUTE scope")
	}
	if req.PayloadType != "" && !scopeSet["PAYLOAD"] {
		return deny(errcode.AuthScope, "INSPECT_SCOPE_DENIED", "载荷一致性核验需 PAYLOAD scope")
	}

	res := &InspectResult{Authorized: true, Mission: &m, Scope: scope, Sealed: sealed}
	if scopeSet["MISSION"] && m.MissionCiphertext != "" {
		pt, err := s.cs.SM9Decrypt(m.MissionCiphertext)
		if err != nil {
			return nil, errcode.NewError(errcode.Internal, "SM9 解密失败: %v", err)
		}
		res.DecryptedView = string(pt) // 临时视图：仅本次响应，绝不落库
		sealed.CiphertextStatus = "OPENED"
	}
	// 完整性验证：SM3 摘要复算 + SM9 验签（canonical 材料与生产方 mission.go 逐字段一致）
	var routeSegs, zones []string
	if err := json.Unmarshal([]byte(m.RouteSegments), &routeSegs); err != nil {
		return nil, errcode.NewError(errcode.Internal, "route_segments corrupt: %v", err)
	}
	if m.Zones != "" {
		if err := json.Unmarshal([]byte(m.Zones), &zones); err != nil {
			return nil, errcode.NewError(errcode.Internal, "zones corrupt: %v", err)
		}
	}
	cb, err := crypto.CanonicalJSON(map[string]any{
		"altitude_max": m.AltitudeMax, "altitude_min": m.AltitudeMin,
		"end_time": timex.FormatTime(m.EndTime.Time), "mission_id": m.MissionID,
		"mission_type": m.MissionType, "operator_id": m.OperatorID,
		"payload_type": m.PayloadType, "route_segments": routeSegs,
		"start_time": timex.FormatTime(m.StartTime.Time), "uav_id": m.UAVID, "zones": zones,
	})
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "canonicalize: %v", err)
	}
	sigValid := false
	if m.Signature != "" {
		ok, err := s.cs.SM9VerifyUserID(crypto.SM9IdentityOf(m.UAVID), cb, m.Signature)
		if err != nil {
			return nil, errcode.NewError(errcode.Internal, "SM9 验签失败: %v", err)
		}
		sigValid = ok
	}
	conclusion := &InspectConclusion{RouteVerdict: "NOT_CHECKED", PayloadVerdict: "NOT_CHECKED", RaisedAlerts: []string{}}
	if req.Trajectory != "" {
		points := demo.NormalTrajectory
		if req.Trajectory == "DEVIATION" {
			points = demo.DeviationTrajectory
		}
		actual := trajectorySegments(points)
		if slices.Equal(actual, routeSegs) {
			conclusion.RouteVerdict = "ROUTE_OK"
		} else {
			conclusion.RouteVerdict = "ROUTE_DEVIATION"
			id, err := s.raiseAutoAlert(ctx, traceID, &m, AlertRouteDeviation, "HIGH", actor, map[string]any{
				"mission_id": m.MissionID, "approved": routeSegs, "actual": actual,
			})
			if err != nil {
				return nil, err
			}
			conclusion.RaisedAlerts = append(conclusion.RaisedAlerts, id)
		}
	}
	if req.PayloadType != "" {
		switch {
		case req.PayloadType != m.PayloadType:
			conclusion.PayloadVerdict = "MISSION_MISMATCH"
			id, err := s.raiseAutoAlert(ctx, traceID, &m, AlertMissionMismatch, "MEDIUM", actor, map[string]any{
				"mission_id": m.MissionID, "registered_payload": m.PayloadType, "claimed_payload": req.PayloadType,
			})
			if err != nil {
				return nil, err
			}
			conclusion.RaisedAlerts = append(conclusion.RaisedAlerts, id)
		default:
			if allowed, ok := payloadCompat[m.MissionType]; ok && !slices.Contains(allowed, m.PayloadType) {
				conclusion.PayloadVerdict = "MISSION_MISMATCH"
				id, err := s.raiseAutoAlert(ctx, traceID, &m, AlertMissionMismatch, "MEDIUM", actor, map[string]any{
					"mission_id": m.MissionID, "mission_type": m.MissionType, "payload_type": m.PayloadType,
				})
				if err != nil {
					return nil, err
				}
				conclusion.RaisedAlerts = append(conclusion.RaisedAlerts, id)
			} else {
				conclusion.PayloadVerdict = "PAYLOAD_OK"
			}
		}
	}
	// 结论 audit_hash + ChainMaker 登记（P4-6：失败 → 2001 + sealed-only）
	auditHash, err := s.cs.HashCanonical(map[string]any{
		"authorization_id": auth.AuthorizationID, "regulator_id": auth.RegulatorID, "mission_id": m.MissionID,
		"route_verdict": conclusion.RouteVerdict, "payload_verdict": conclusion.PayloadVerdict,
		"digest_match": crypto.SM3Hex(cb) == m.SM3Hash, "signature_valid": sigValid,
		"inspected_at": timex.FormatTime(now),
	})
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "conclusion hash: %v", err)
	}
	chain, ok := s.gw.Chain(crosschain.RegChainName)
	if !ok {
		return nil, errcode.NewError(errcode.Internal, "监管链 %s 未接入", crosschain.RegChainName)
	}
	receipt, err := chain.SubmitTx(ctx, ContractAuditRec, MethodRecordInsp, map[string]any{
		"authorization_id": auth.AuthorizationID, "regulator_id": auth.RegulatorID, "mission_id": m.MissionID,
		"route_verdict": conclusion.RouteVerdict, "payload_verdict": conclusion.PayloadVerdict,
		"digest_match": crypto.SM3Hex(cb) == m.SM3Hash, "signature_valid": sigValid,
		"audit_hash": auditHash, "inspected_at": timex.FormatTime(now),
	})
	if err != nil {
		s.logAudit(traceID, actor, "INSPECT_CHAIN_FAILED", "MISSION", m.MissionID, map[string]any{
			"authorization_id": auth.AuthorizationID, "error": err.Error(),
		})
		return &InspectResult{Authorized: false, Sealed: sealed},
			errcode.NewError(errcode.CrosschainSend, "audit_record 上链失败: %v", err)
	}
	// 裁定（同 Task 4 C2）：sim 故障注入返回 (receipt{Status:1}, nil)——必须同时检查 receipt.Status，
	// 否则 TestInspectChainFailureNoPlaintext 的 2001 断言永不可达。失败语义与 err 分支一致：sealed-only + 审计 + 2001。
	if receipt.Status != 0 {
		failReason := fmt.Sprintf("chain receipt status %d: %s", receipt.Status, receipt.Ret)
		s.logAudit(traceID, actor, "INSPECT_CHAIN_FAILED", "MISSION", m.MissionID, map[string]any{
			"authorization_id": auth.AuthorizationID, "error": failReason,
		})
		return &InspectResult{Authorized: false, Sealed: sealed},
			errcode.NewError(errcode.CrosschainSend, "audit_record 上链被拒: %s", failReason)
	}
	res.Verification = &InspectVerification{
		DigestMatch: crypto.SM3Hex(cb) == m.SM3Hash, SignatureValid: sigValid, AuditHash: auditHash,
	}
	res.Conclusion = conclusion
	res.ChainTxID = receipt.TxID
	resultJSON, err := json.Marshal(map[string]any{
		"route_verdict": conclusion.RouteVerdict, "payload_verdict": conclusion.PayloadVerdict,
		"digest_match": res.Verification.DigestMatch, "signature_valid": sigValid,
	})
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "result json: %v", err)
	}
	alertID := ""
	if len(conclusion.RaisedAlerts) > 0 {
		alertID = conclusion.RaisedAlerts[0]
	}
	regAudit := &model.RegulatoryAudit{
		AuditID: model.GenAuditID(), AlertID: alertID, AuthorizationID: auth.AuthorizationID,
		Action: "INSPECT", OperatorID: actor, Target: m.MissionID, Result: string(resultJSON),
		AuditHash: auditHash, ChainTxID: receipt.TxID,
	}
	if err := s.db.WithContext(ctx).Create(regAudit).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "create regulatory_audit: %v", err)
	}
	res.RegAuditID = regAudit.AuditID
	s.logAudit(traceID, actor, "INSPECT", "MISSION", m.MissionID, map[string]any{
		"authorization_id": auth.AuthorizationID, "route_verdict": conclusion.RouteVerdict,
		"payload_verdict": conclusion.PayloadVerdict, "digest_match": res.Verification.DigestMatch,
		"signature_valid": sigValid, "chain_tx_id": receipt.TxID, "raised_alerts": conclusion.RaisedAlerts,
	})
	return res, nil
}

// trajectorySegments 轨迹点 route_segment 去重有序集合（P4-7 实际航路）。
func trajectorySegments(points []map[string]any) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, p := range points {
		seg, _ := p["route_segment"].(string)
		if seg != "" && !seen[seg] {
			seen[seg] = true
			out = append(out, seg)
		}
	}
	return out
}

// raiseAutoAlert 一致性违规自动告警（SYSTEM3）；同任务同类型未结案告警去重复用（P4-7）。
func (s *Service) raiseAutoAlert(ctx context.Context, traceID string, m *model.Mission, eventType, riskLevel, operator string, evidence map[string]any) (string, error) {
	var existing model.SecurityEvent
	err := s.db.WithContext(ctx).
		Where("mission_id = ? AND event_type = ? AND status IN ?", m.MissionID, eventType,
			[]string{"OPEN", "IDENTIFIED", "TRACED"}).
		Order("created_at DESC, alert_id DESC").First(&existing).Error
	if err == nil {
		return existing.AlertID, nil
	}
	if err != gorm.ErrRecordNotFound {
		return "", errcode.NewError(errcode.Internal, "dedup query: %v", err)
	}
	hash, err := s.cs.HashCanonical(evidence)
	if err != nil {
		return "", errcode.NewError(errcode.Internal, "evidence hash: %v", err)
	}
	pseudonym := ""
	var mapping model.IdentityMapping
	if err := s.db.WithContext(ctx).Where("uav_id = ?", m.UAVID).
		Order("created_at DESC").First(&mapping).Error; err == nil {
		pseudonym = mapping.Pseudo
	}
	ev := &model.SecurityEvent{
		AlertID: model.GenAlertID(), MissionID: m.MissionID, UAVPseudonym: pseudonym,
		EventType: eventType, RiskLevel: riskLevel, EvidenceHash: hash,
		SourceSystem: "SYSTEM3", Status: "OPEN",
	}
	if err := s.db.WithContext(ctx).Create(ev).Error; err != nil {
		return "", errcode.NewError(errcode.Internal, "create auto alert: %v", err)
	}
	s.logAudit(traceID, operator, "ALERT_RAISE", "ALERT", ev.AlertID, map[string]any{
		"event_type": eventType, "risk_level": riskLevel, "source_system": "SYSTEM3",
		"auto": true, "mission_id": m.MissionID, "evidence_hash": hash,
	})
	return ev.AlertID, nil
}
