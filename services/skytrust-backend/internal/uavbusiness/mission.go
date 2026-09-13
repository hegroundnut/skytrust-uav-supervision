package uavbusiness

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/statemachine"
	"skytrust-backend/internal/timex"
)

type MissionInput struct {
	MissionID     string // 可选，缺省生成 MISSION-<年>-%03d
	OperatorID    string
	UAVID         string
	MissionType   string
	StartTime     string // "2006-01-02 15:04:05" 或带毫秒
	EndTime       string
	RouteSegments []string
	AltitudeMin   float64
	AltitudeMax   float64
	PayloadType   string
	Description   string // 明文描述 → SM9 加密落库 + 脱敏展示
}

// genMissionID 自动生成 MISSION-<年>-%03d（count+1 探测）。
// db 须传当前事务句柄（C18：生成+查重+插入同事务）。
// C17：年份随当前年滚动——一律显式取自 timex.Now().Year()，不再跟随任务窗口年份。
func (s *Service) genMissionID(db *gorm.DB) (string, error) {
	year := timex.Now().Year()
	var cnt int64
	if err := db.Model(&model.Mission{}).Count(&cnt).Error; err != nil {
		return "", err
	}
	for n := int(cnt) + 1; n < 1000; n++ {
		cand := fmt.Sprintf("MISSION-%d-%03d", year, n)
		var dup int64
		if err := db.Model(&model.Mission{}).Where("mission_id = ?", cand).Count(&dup).Error; err != nil {
			return "", err
		}
		if dup == 0 {
			return cand, nil
		}
	}
	return "", fmt.Errorf("mission_id space exhausted for year %d", year)
}

// maskDescription 脱敏统一策略（C19，据盘点的现行函数收紧短值分支）：
//   - 长度 ≤4：全遮蔽——等长 `*`（短值保留任何前缀都等于泄露原文/近乎全文）；
//   - 长度 >4：沿用现行策略——保留前 4 字符 + 固定 `****`（长值留可辨识前缀）。
//
// 例：mask("机密")=="**"、mask("abcd")=="****"、mask("abcde")=="abcd****"。
func maskDescription(plain string) string {
	rs := []rune(plain)
	if len(rs) <= 4 {
		return strings.Repeat("*", len(rs))
	}
	return string(rs[:4]) + "****"
}

// CreateMission 任务创建（实施文档 §9.2 步骤2）：校验 → 生成 → 加密脱敏 →
// 规范化哈希签名 → DRAFT 落库。响应永不含密文（model json:"-"）。
func (s *Service) CreateMission(ctx context.Context, traceID string, in MissionInput) (*model.Mission, error) {
	if in.OperatorID == "" || in.UAVID == "" || in.MissionType == "" || in.StartTime == "" || in.EndTime == "" || len(in.RouteSegments) == 0 || in.PayloadType == "" {
		return nil, crosschain.NewError(errcode.Param, "operator_id/uav_id/mission_type/start_time/end_time/route_segments/payload_type 必填")
	}
	start, err := timex.ParseTime(in.StartTime)
	if err != nil {
		return nil, crosschain.NewError(errcode.Param, "start_time 格式非法（应为 2006-01-02 15:04:05[.000]）: %v", err)
	}
	end, err := timex.ParseTime(in.EndTime)
	if err != nil {
		return nil, crosschain.NewError(errcode.Param, "end_time 格式非法（应为 2006-01-02 15:04:05[.000]）: %v", err)
	}
	if !end.After(start) {
		return nil, crosschain.NewError(errcode.Param, "end_time 必须晚于 start_time")
	}
	if in.AltitudeMin < 0 || in.AltitudeMin >= in.AltitudeMax {
		return nil, crosschain.NewError(errcode.Param, "altitude_min(%v) 必须非负且小于 altitude_max(%v)", in.AltitudeMin, in.AltitudeMax)
	}
	uav, err := s.QueryUAV(ctx, traceID, in.UAVID)
	if err != nil {
		return nil, err
	}
	if uav.Status != "VERIFIED" && uav.Status != "ACTIVE" {
		return nil, crosschain.NewError(errcode.InvalidUAV, "UAV %s 状态 %q 不可创建任务（需 VERIFIED/ACTIVE）", uav.UAVID, uav.Status)
	}
	if uav.OperatorID != in.OperatorID {
		return nil, crosschain.NewError(errcode.InvalidUAV, "UAV %s 不属于运营方 %s", uav.UAVID, in.OperatorID)
	}
	var routes []model.RouteSegment
	if err := s.db.WithContext(ctx).Where("route_id IN ?", in.RouteSegments).Find(&routes).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "routes lookup: %v", err)
	}
	byID := make(map[string]model.RouteSegment, len(routes))
	for _, r := range routes {
		byID[r.RouteID] = r
	}
	zones := []string{}
	seen := map[string]bool{}
	for _, rid := range in.RouteSegments {
		r, ok := byID[rid]
		if !ok {
			return nil, crosschain.NewError(errcode.RouteConflict, "航路 %q 不存在", rid)
		}
		if r.CorridorStatus != "OPEN" {
			return nil, crosschain.NewError(errcode.RouteConflict, "航路 %q 走廊状态 %q 不可规划（仅 OPEN）", rid, r.CorridorStatus)
		}
		if !seen[r.Zone] {
			seen[r.Zone] = true
			zones = append(zones, r.Zone)
		}
	}
	// mission_id 生成/查重+插入同事务（C18）：并发同 mission_id 创建恰一成功。
	var m *model.Mission
	var masked string
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		missionID := in.MissionID
		if missionID == "" {
			gen, err := s.genMissionID(tx)
			if err != nil {
				return crosschain.NewError(errcode.Internal, "gen mission_id: %v", err)
			}
			missionID = gen
		} else {
			var cnt int64
			if err := tx.Model(&model.Mission{}).Where("mission_id = ?", missionID).Count(&cnt).Error; err != nil {
				return crosschain.NewError(errcode.Internal, "mission_id lookup: %v", err)
			}
			if cnt > 0 {
				return crosschain.NewError(errcode.Param, "mission_id %q 已存在", missionID)
			}
		}
		segJSON, err := json.Marshal(in.RouteSegments)
		if err != nil {
			return crosschain.NewError(errcode.Internal, "marshal segments: %v", err)
		}
		zoneJSON, err := json.Marshal(zones)
		if err != nil {
			return crosschain.NewError(errcode.Internal, "marshal zones: %v", err)
		}
		cipher := ""
		if in.Description != "" {
			c, err := s.cs.SM9Encrypt([]byte(in.Description))
			if err != nil {
				return crosschain.NewError(errcode.Internal, "SM9 encrypt description: %v", err)
			}
			cipher = c
			masked = maskDescription(in.Description)
		}
		canon := map[string]any{
			"altitude_max": in.AltitudeMax, "altitude_min": in.AltitudeMin,
			"end_time": timex.FormatTime(end), "mission_id": missionID,
			"mission_type": in.MissionType, "operator_id": in.OperatorID,
			"payload_type": in.PayloadType, "route_segments": in.RouteSegments,
			"start_time": timex.FormatTime(start), "uav_id": in.UAVID, "zones": zones,
		}
		cb, err := crypto.CanonicalJSON(canon)
		if err != nil {
			return crosschain.NewError(errcode.Internal, "canonicalize: %v", err)
		}
		sig, err := s.cs.SM9SignUserID(crypto.SM9IdentityOf(in.UAVID), cb)
		if err != nil {
			return crosschain.NewError(errcode.Internal, "SM9 sign: %v", err)
		}
		m = &model.Mission{
			MissionID: missionID, OperatorID: in.OperatorID, UAVID: in.UAVID,
			MissionType: in.MissionType, StartTime: timex.New(start), EndTime: timex.New(end),
			RouteSegments: string(segJSON), AltitudeMin: in.AltitudeMin, AltitudeMax: in.AltitudeMax,
			Zones: string(zoneJSON), PayloadType: in.PayloadType,
			MissionCiphertext: cipher, MaskedValue: masked,
			SM3Hash: crypto.SM3Hex(cb), SM9Identity: crypto.SM9IdentityOf(in.UAVID), Signature: sig,
			Status: "DRAFT",
		}
		if err := tx.Create(m).Error; err != nil {
			// 并发窗口：事务内插入撞主键 → 映射为查重失败同码同文案
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				return crosschain.NewError(errcode.Param, "mission_id %q 已存在", missionID)
			}
			return crosschain.NewError(errcode.Internal, "create mission: %v", err)
		}
		return nil
	}); err != nil {
		return nil, err
	}
	s.logAudit(traceID, in.OperatorID, "MISSION_CREATE", "MISSION", m.MissionID,
		map[string]any{"uav_id": m.UAVID, "mission_type": m.MissionType, "route_segments": in.RouteSegments,
			"window": []string{timex.FormatTime(start), timex.FormatTime(end)}, "masked_value": masked})
	return m, nil
}

// QueryMission 单任务查询；不存在 → 6002。
func (s *Service) QueryMission(ctx context.Context, traceID, missionID string) (*model.Mission, error) {
	var m model.Mission
	err := s.db.WithContext(ctx).Where("mission_id = ?", missionID).First(&m).Error
	if err == gorm.ErrRecordNotFound {
		return nil, crosschain.NewError(errcode.Param, "mission_id %q 不存在", missionID)
	}
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "query mission: %v", err)
	}
	return &m, nil
}

// MissionListFilter 任务列表过滤（分页约定同网关 List）。
type MissionListFilter struct {
	OperatorID string
	UAVID      string
	Status     string
	Page       int
	PageSize   int
}

// ListMission created_at 倒序分页；created_at 相同时按 mission_id DESC 决胜（F-5/C13）。
func (s *Service) ListMission(ctx context.Context, traceID string, f MissionListFilter) ([]model.Mission, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.WithContext(ctx).Model(&model.Mission{})
	if f.OperatorID != "" {
		q = q.Where("operator_id = ?", f.OperatorID)
	}
	if f.UAVID != "" {
		q = q.Where("uav_id = ?", f.UAVID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.Mission
	if err := q.Order("created_at DESC, mission_id DESC").Offset((f.Page - 1) * f.PageSize).Limit(f.PageSize).Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}

// transitionMission 任务状态迁移统一出口（Global Constraint 7）：Assert → 落库 → 审计。
// 非法迁移映射 3004。
func (s *Service) transitionMission(traceID, actor string, m *model.Mission, to, trigger string) error {
	from := m.Status
	if err := statemachine.MissionMachine.Assert(from, to); err != nil {
		return crosschain.NewError(errcode.MissionState, "%v", err)
	}
	if err := s.db.Model(m).Update("status", to).Error; err != nil {
		return crosschain.NewError(errcode.Internal, "persist mission status: %v", err)
	}
	m.Status = to
	s.logAudit(traceID, actor, "STATE_TRANSITION", "MISSION", m.MissionID,
		map[string]any{"from": from, "to": to, "trigger": trigger})
	return nil
}

// withdrawMission 跨链失败撤回：SUBMITTED→DRAFT（合法迁移，任务可修改后重报）。
// 撤回自身失败只审计不掩盖原始跨链错误。
func (s *Service) withdrawMission(traceID, actor string, m *model.Mission) {
	if err := s.transitionMission(traceID, actor, m, "DRAFT", "SUBMIT_FAILED_WITHDRAW"); err != nil {
		s.logAudit(traceID, actor, "WITHDRAW_FAILED", "MISSION", m.MissionID, map[string]any{"error": err.Error()})
	}
}

// SubmitMission 任务提交（实施文档 §9.2 步骤5-7）：DRAFT→SUBMITTED → 建申请 →
// fabric 源链业务交易 → 网关 MISSION_APPLICATION 跨链（fabric→fisco-bcos）。
// 任一跨域环节失败：申请 FAILED + 任务撤回 DRAFT + 透传错误（强制原则 4/5）。
func (s *Service) SubmitMission(ctx context.Context, traceID, missionID, operator string) (*model.MissionApplication, *model.CrosschainTx, error) {
	if missionID == "" || operator == "" {
		return nil, nil, crosschain.NewError(errcode.Param, "mission_id/operator 必填")
	}
	m, err := s.QueryMission(ctx, traceID, missionID)
	if err != nil {
		return nil, nil, err
	}
	if err := statemachine.MissionMachine.Assert(m.Status, "SUBMITTED"); err != nil {
		return nil, nil, crosschain.NewError(errcode.MissionState, "%v", err)
	}
	// 复核 UAV 与航路（创建后环境可能变化）
	uav, err := s.QueryUAV(ctx, traceID, m.UAVID)
	if err != nil {
		return nil, nil, err
	}
	if uav.Status != "VERIFIED" && uav.Status != "ACTIVE" {
		return nil, nil, crosschain.NewError(errcode.InvalidUAV, "UAV %s 状态 %q 不可提交任务", uav.UAVID, uav.Status)
	}
	if uav.OperatorID != operator || m.OperatorID != operator {
		return nil, nil, crosschain.NewError(errcode.InvalidUAV, "operator %s 与任务/UAV 归属不符", operator)
	}
	var segIDs []string
	if err := json.Unmarshal([]byte(m.RouteSegments), &segIDs); err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "unmarshal route_segments: %v", err)
	}
	var routes []model.RouteSegment
	if err := s.db.WithContext(ctx).Where("route_id IN ?", segIDs).Find(&routes).Error; err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "routes lookup: %v", err)
	}
	byID := make(map[string]model.RouteSegment, len(routes))
	for _, r := range routes {
		byID[r.RouteID] = r
	}
	for _, rid := range segIDs {
		r, ok := byID[rid]
		if !ok {
			return nil, nil, crosschain.NewError(errcode.RouteConflict, "航路 %q 不存在", rid)
		}
		if r.CorridorStatus != "OPEN" {
			return nil, nil, crosschain.NewError(errcode.RouteConflict, "航路 %q 走廊状态 %q 不可提交", rid, r.CorridorStatus)
		}
	}
	if err := s.transitionMission(traceID, operator, m, "SUBMITTED", "SUBMIT"); err != nil {
		return nil, nil, err
	}
	// 建申请（运营方 SM9 身份签名）
	appID := model.GenApplicationID()
	appCanon := map[string]any{
		"application_id": appID, "mission_id": m.MissionID, "mission_sm3_hash": m.SM3Hash,
	}
	acb, err := crypto.CanonicalJSON(appCanon)
	if err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "canonicalize application: %v", err)
	}
	appSig, err := s.cs.SM9SignUserID(crypto.SM9IdentityOf(operator), acb)
	if err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "SM9 sign application: %v", err)
	}
	app := &model.MissionApplication{
		ApplicationID: appID, MissionID: m.MissionID,
		SM3Hash: m.SM3Hash, Signature: appSig,
		SourceChain: "fabric", Status: "PENDING",
	}
	if err := s.db.WithContext(ctx).Create(app).Error; err != nil {
		return nil, nil, crosschain.NewError(errcode.Internal, "create application: %v", err)
	}
	// 源链业务交易（fabric: operator_business/SubmitApplication）
	src, ok := s.gw.Chain("fabric")
	if !ok {
		s.failApplication(traceID, operator, app, m)
		return app, nil, crosschain.NewError(errcode.CrosschainSend, "source chain fabric unavailable")
	}
	rc, err := src.SubmitTx(ctx, "operator_business", "SubmitApplication", map[string]any{
		"application_id": appID, "mission_id": m.MissionID, "sm3_hash": m.SM3Hash,
	})
	if err != nil {
		s.failApplication(traceID, operator, app, m)
		return app, nil, crosschain.NewError(errcode.CrosschainSend, "source submit: %v", err)
	}
	if rc.Status != 0 {
		s.failApplication(traceID, operator, app, m)
		return app, nil, crosschain.NewError(errcode.CrosschainSend, "source submit failed on chain (status=%d)", rc.Status)
	}
	app.SourceTxID = rc.TxID
	app.Status = "SENT"
	if err := s.db.WithContext(ctx).Model(app).Updates(map[string]any{"source_tx_id": app.SourceTxID, "status": app.Status}).Error; err != nil {
		return app, nil, crosschain.NewError(errcode.Internal, "persist application SENT: %v", err)
	}
	// 网关跨链 fabric→fisco-bcos
	payload := map[string]any{
		"mission_id": m.MissionID, "application_id": appID,
		"operator_id": operator, "uav_id": m.UAVID, "mission_type": m.MissionType,
		"start_time": timex.FormatTime(m.StartTime.Time), "end_time": timex.FormatTime(m.EndTime.Time),
		"route_segments": segIDs, "sm3_hash": m.SM3Hash,
	}
	tx, err := s.sendCrosschain(ctx, traceID, crosschain.MsgMissionApplication, appID,
		"fabric", "fisco-bcos", payload, crypto.SM9IdentityOf(operator), app.SourceTxID)
	if err != nil {
		s.failApplication(traceID, operator, app, m)
		return app, tx, err
	}
	app.Status = "RELAYED"
	if err := s.db.WithContext(ctx).Model(app).Update("status", app.Status).Error; err != nil {
		return app, tx, crosschain.NewError(errcode.Internal, "persist application RELAYED: %v", err)
	}
	s.logAudit(traceID, operator, "MISSION_SUBMIT", "MISSION_APPLICATION", appID,
		map[string]any{"mission_id": m.MissionID, "cross_tx_id": tx.CrossTxID, "status": "RELAYED",
			"source_tx_id": app.SourceTxID, "target_chain_tx_id": tx.TargetChainTxID})
	return app, tx, nil
}

// failApplication 申请置 FAILED + 任务撤回 DRAFT（跨域环节失败的统一善后）。
func (s *Service) failApplication(traceID, operator string, app *model.MissionApplication, m *model.Mission) {
	app.Status = "FAILED"
	if err := s.db.Model(app).Update("status", "FAILED").Error; err != nil {
		s.logAudit(traceID, operator, "PERSIST_FAILED", "MISSION_APPLICATION", app.ApplicationID, map[string]any{"error": err.Error()})
	}
	var fresh model.Mission
	if err := s.db.Where("mission_id = ?", m.MissionID).First(&fresh).Error; err == nil {
		s.withdrawMission(traceID, operator, &fresh)
	}
}
