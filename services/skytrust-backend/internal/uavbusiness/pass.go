package uavbusiness

import (
	"context"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/statemachine"
	"skytrust-backend/internal/timex"
)

// passSignerUID 许可签署/验签权威固定为管理方身份（Ruling：FlightPass 无 issuer
// 字段，验签需确定 uid；Global Constraint 管理方签名者 = SM9-ID-FISCO-ADMIN）。
// issuer 参数仅记入审计与 payload 作归因。
func passSignerUID() string { return crypto.SM9IdentityOf("FISCO-ADMIN") }

// transitionPass 许可状态迁移统一出口（Global Constraint 7）：非法 → 3002。
func (s *Service) transitionPass(traceID, actor string, p *model.FlightPass, to, trigger string) error {
	from := p.Status
	if err := statemachine.PassMachine.Assert(from, to); err != nil {
		return crosschain.NewError(errcode.PassInvalid, "%v", err)
	}
	if err := s.db.Model(p).Update("status", to).Error; err != nil {
		return crosschain.NewError(errcode.Internal, "persist pass status: %v", err)
	}
	p.Status = to
	s.logAudit(traceID, actor, "STATE_TRANSITION", "PASS", p.PassID,
		map[string]any{"from": from, "to": to, "trigger": trigger})
	return nil
}

// genPassID 自动生成 PASS-<year>-%03d（count+1 探测，镜像 genMissionID）。
func (s *Service) genPassID(year int) (string, error) {
	var cnt int64
	if err := s.db.Model(&model.FlightPass{}).Count(&cnt).Error; err != nil {
		return "", err
	}
	for n := int(cnt) + 1; n < 1000; n++ {
		cand := fmt.Sprintf("PASS-%d-%03d", year, n)
		var dup int64
		if err := s.db.Model(&model.FlightPass{}).Where("pass_id = ?", cand).Count(&dup).Error; err != nil {
			return "", err
		}
		if dup == 0 {
			return cand, nil
		}
	}
	return "", fmt.Errorf("pass_id space exhausted for year %d", year)
}

// passCanonical 许可规范化材料：签发与验证共用，保证重算一致。
// route 用库内 JSON 原文（确定性字符串）。
func passCanonical(p *model.FlightPass) map[string]any {
	return map[string]any{
		"pass_id": p.PassID, "mission_id": p.MissionID, "uav_id": p.UAVID,
		"route": p.Route, "valid_from": timex.FormatTime(p.ValidFrom.Time),
		"valid_to": timex.FormatTime(p.ValidTo.Time),
	}
}

type PassIssueInput struct {
	PassID    string // 空则自动生成 PASS-<year>-%03d；已存在的 GENERATING 记录 = 重试入口
	MissionID string
	ValidFrom string // 空 = 任务窗口
	ValidTo   string
	Issuer    string
}

// IssuePass 飞行许可签发：任务须 APPROVED（3004）。本地签名落库 GENERATING →
// FLIGHT_PASS 跨链（fisco-bcos→fabric，网关代提交源链）→ 成功迁移 VALID；
// 失败停留 GENERATING，可用同 pass_id 重试（复用 FAILED 记录的源链 TxID）。
func (s *Service) IssuePass(ctx context.Context, traceID string, in PassIssueInput) (*model.FlightPass, *model.CrosschainTx, error) {
	if in.MissionID == "" || in.Issuer == "" {
		return nil, nil, crosschain.NewError(errcode.Param, "mission_id/issuer 必填")
	}
	m, err := s.QueryMission(ctx, traceID, in.MissionID)
	if err != nil {
		return nil, nil, err
	}
	if m.Status != "APPROVED" {
		return nil, nil, crosschain.NewError(errcode.MissionState,
			"任务 %q 状态 %q 不可签发许可（需 APPROVED）", m.MissionID, m.Status)
	}
	vf, vt := m.StartTime.Time, m.EndTime.Time
	if in.ValidFrom != "" {
		if vf, err = timex.ParseTime(in.ValidFrom); err != nil {
			return nil, nil, crosschain.NewError(errcode.Param, "valid_from 格式非法（应为 2006-01-02 15:04:05[.000]）: %v", err)
		}
	}
	if in.ValidTo != "" {
		if vt, err = timex.ParseTime(in.ValidTo); err != nil {
			return nil, nil, crosschain.NewError(errcode.Param, "valid_to 格式非法（应为 2006-01-02 15:04:05[.000]）: %v", err)
		}
	}
	if !vt.After(vf) {
		return nil, nil, crosschain.NewError(errcode.Param, "valid_to 必须晚于 valid_from")
	}
	passID := in.PassID
	if passID == "" {
		gen, gerr := s.genPassID(vf.Year())
		if gerr != nil {
			return nil, nil, crosschain.NewError(errcode.Internal, "gen pass_id: %v", gerr)
		}
		passID = gen
	}
	var p model.FlightPass
	err = s.db.Where("pass_id = ?", passID).First(&p).Error
	switch {
	case err == nil && p.Status != "GENERATING":
		return nil, nil, crosschain.NewError(errcode.PassInvalid, "许可 %q 状态 %q 不可重复签发", passID, p.Status)
	case err == nil:
		// GENERATING → 重试入口：复用已签名的记录续发跨链
	case err == gorm.ErrRecordNotFound:
		p = model.FlightPass{
			PassID: passID, MissionID: m.MissionID, UAVID: m.UAVID,
			Route: m.RouteSegments, ValidFrom: timex.New(vf), ValidTo: timex.New(vt), Status: "GENERATING",
		}
		cb, cerr := crypto.CanonicalJSON(passCanonical(&p))
		if cerr != nil {
			return nil, nil, crosschain.NewError(errcode.Internal, "canonical pass: %v", cerr)
		}
		p.SM3Hash = crypto.SM3Hex(cb)
		sig, serr := s.cs.SM9SignUserID(passSignerUID(), cb)
		if serr != nil {
			return nil, nil, crosschain.NewError(errcode.Internal, "SM9 sign pass: %v", serr)
		}
		p.Signature = sig
		if cerr := s.db.Create(&p).Error; cerr != nil {
			return nil, nil, crosschain.NewError(errcode.Internal, "create pass: %v", cerr)
		}
	default:
		return nil, nil, crosschain.NewError(errcode.Internal, "pass lookup: %v", err)
	}
	tx, cerr := s.sendFlightPassCrosschain(ctx, traceID, &p, in.Issuer)
	if cerr != nil {
		return &p, tx, cerr // 停留 GENERATING，同 pass_id 可重试
	}
	if terr := s.transitionPass(traceID, in.Issuer, &p, "VALID", "ISSUED_ONCHAIN"); terr != nil {
		return &p, tx, terr
	}
	s.logAudit(traceID, in.Issuer, "PASS_ISSUE", "PASS", p.PassID,
		map[string]any{"mission_id": p.MissionID, "uav_id": p.UAVID, "cross_tx_id": tx.CrossTxID,
			"window": []string{timex.FormatTime(p.ValidFrom.Time), timex.FormatTime(p.ValidTo.Time)}})
	return &p, tx, nil
}

// sendFlightPassCrosschain FLIGHT_PASS fisco-bcos→fabric；重试复用 FAILED 记录的源链 TxID。
func (s *Service) sendFlightPassCrosschain(ctx context.Context, traceID string, p *model.FlightPass, issuer string) (*model.CrosschainTx, error) {
	var segIDs []string
	if err := json.Unmarshal([]byte(p.Route), &segIDs); err != nil {
		return nil, crosschain.NewError(errcode.Internal, "route json: %v", err)
	}
	payload := map[string]any{
		"pass_id": p.PassID, "mission_id": p.MissionID, "uav_id": p.UAVID,
		"route": segIDs, "valid_from": timex.FormatTime(p.ValidFrom.Time),
		"valid_to": timex.FormatTime(p.ValidTo.Time), "sm3_hash": p.SM3Hash, "issuer": issuer,
	}
	sourceTxID := s.prevFailedSourceTxID(crosschain.MsgFlightPass, p.PassID)
	return s.sendCrosschain(ctx, traceID, crosschain.MsgFlightPass, p.PassID,
		"fisco-bcos", "fabric", payload, passSignerUID(), sourceTxID)
}

// QueryPass 不存在 → 6002。
func (s *Service) QueryPass(ctx context.Context, traceID, passID string) (*model.FlightPass, error) {
	if passID == "" {
		return nil, crosschain.NewError(errcode.Param, "pass_id 必填")
	}
	var p model.FlightPass
	err := s.db.Where("pass_id = ?", passID).First(&p).Error
	if err == gorm.ErrRecordNotFound {
		return nil, crosschain.NewError(errcode.Param, "pass_id %q 不存在", passID)
	}
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "pass lookup: %v", err)
	}
	return &p, nil
}

type PassListFilter struct {
	MissionID string
	UAVID     string
	Status    string
	Page      int
	PageSize  int
}

func (s *Service) ListPass(ctx context.Context, traceID string, f PassListFilter) ([]model.FlightPass, int64, error) {
	q := s.db.Model(&model.FlightPass{})
	if f.MissionID != "" {
		q = q.Where("mission_id = ?", f.MissionID)
	}
	if f.UAVID != "" {
		q = q.Where("uav_id = ?", f.UAVID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count passes: %v", err)
	}
	page, size := f.Page, f.PageSize
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 200 {
		size = 20
	}
	var list []model.FlightPass
	if err := q.Order("created_at DESC").Offset((page - 1) * size).Limit(size).Find(&list).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "list passes: %v", err)
	}
	return list, total, nil
}

// VerifyPass 许可验证。不存在 → 6002；其余永远 code 0，valid = reasons 为空。
// VALID 且已过窗 → 自动迁移 EXPIRED（AUTO_EXPIRE）。VALID 时重算规范化哈希
// 比对 SM3 + SM9 验签 + now ≥ valid_from。
func (s *Service) VerifyPass(ctx context.Context, traceID, passID string) (bool, []string, *model.FlightPass, error) {
	p, err := s.QueryPass(ctx, traceID, passID)
	if err != nil {
		return false, nil, nil, err
	}
	now := timex.Now()
	if p.Status == "VALID" && now.After(p.ValidTo.Time) {
		_ = s.transitionPass(traceID, "SYSTEM", p, "EXPIRED", "AUTO_EXPIRE")
	}
	reasons := []string{}
	switch p.Status {
	case "VALID":
		if now.Before(p.ValidFrom.Time) {
			reasons = append(reasons, "未到生效时间")
		}
		cb, cerr := crypto.CanonicalJSON(passCanonical(p))
		if cerr != nil {
			return false, nil, p, crosschain.NewError(errcode.Internal, "canonical pass: %v", cerr)
		}
		if crypto.SM3Hex(cb) != p.SM3Hash {
			reasons = append(reasons, "SM3完整性校验失败")
		}
		ok, verr := s.cs.SM9VerifyUserID(passSignerUID(), cb, p.Signature)
		if verr != nil || !ok {
			reasons = append(reasons, "SM9验签失败")
		}
	case "GENERATING":
		reasons = append(reasons, "许可未生效（跨链确认未完成）")
	case "REVOKED":
		reasons = append(reasons, "许可已吊销")
	case "EXPIRED":
		reasons = append(reasons, "许可已过期")
	case "USED":
		reasons = append(reasons, "许可已使用")
	default:
		reasons = append(reasons, fmt.Sprintf("未知许可状态 %q", p.Status))
	}
	return len(reasons) == 0, reasons, p, nil
}

// RevokePass 许可吊销（本地先行 Ruling：安全优先，REVOKED 立即生效）。
// 非 VALID → 3002。随后 PASS_REVOKE 跨链 best-effort：失败也返回 nil error +
// crosschain_status="FAILED"（审计留痕，链上对账列入 Plan 5 加固清单）。
func (s *Service) RevokePass(ctx context.Context, traceID, passID, reason, operator string) (*model.FlightPass, string, *model.CrosschainTx, error) {
	if passID == "" || reason == "" || operator == "" {
		return nil, "", nil, crosschain.NewError(errcode.Param, "pass_id/reason/operator 必填")
	}
	p, err := s.QueryPass(ctx, traceID, passID)
	if err != nil {
		return nil, "", nil, err
	}
	if p.Status != "VALID" {
		return p, "", nil, crosschain.NewError(errcode.PassInvalid, "许可 %q 状态 %q 不可吊销（仅 VALID）", passID, p.Status)
	}
	if err := s.transitionPass(traceID, operator, p, "REVOKED", "REVOKE"); err != nil {
		return p, "", nil, err
	}
	s.logAudit(traceID, operator, "PASS_REVOKE", "PASS", p.PassID, map[string]any{"reason": reason})
	payload := map[string]any{
		"pass_id": p.PassID, "mission_id": p.MissionID, "reason": reason, "operator": operator,
	}
	sourceTxID := s.prevFailedSourceTxID(crosschain.MsgPassRevoke, p.PassID)
	tx, cerr := s.sendCrosschain(ctx, traceID, crosschain.MsgPassRevoke, p.PassID,
		"fisco-bcos", "fabric", payload, passSignerUID(), sourceTxID)
	if cerr != nil {
		s.logAudit(traceID, operator, "PASS_REVOKE_CROSSCHAIN_FAILED", "PASS", p.PassID,
			map[string]any{"reason": reason, "error": cerr.Error()})
		return p, "FAILED", tx, nil
	}
	return p, "SUCCESS", tx, nil
}
