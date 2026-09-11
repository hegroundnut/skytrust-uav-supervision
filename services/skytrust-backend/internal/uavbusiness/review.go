package uavbusiness

import (
	"context"
	"encoding/json"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

type ReviewInput struct {
	ApplicationID string
	Result        string // APPROVED|REJECTED|NEED_COORDINATION
	Reviewer      string
	Comment       string
	RulesHit      []string
}

var reviewMissionTarget = map[string]string{
	"APPROVED": "APPROVED", "REJECTED": "REJECTED", "NEED_COORDINATION": "COORDINATING",
}

var reviewableAppStatus = map[string]bool{"PENDING": true, "SENT": true, "RELAYED": true}

// SubmitReview 审核裁决（实施文档 §9.2 步骤9-13）：SUBMITTED 先迁 REVIEWING；
// 裁决以 reviewer 的 SM9 身份签名，经 fisco-bcos→fabric 跨链回传；成功后任务迁
// APPROVED|REJECTED|COORDINATING、申请 Status=result。跨链失败：任务停留 REVIEWING、
// 裁决已落库，可重试（新 review_id → 幂等键天然更新）。
func (s *Service) SubmitReview(ctx context.Context, traceID string, in ReviewInput) (*model.ReviewRecord, *model.Mission, *model.CrosschainTx, error) {
	if in.ApplicationID == "" || in.Result == "" || in.Reviewer == "" {
		return nil, nil, nil, crosschain.NewError(errcode.Param, "application_id/result/reviewer 必填")
	}
	target, ok := reviewMissionTarget[in.Result]
	if !ok {
		return nil, nil, nil, crosschain.NewError(errcode.ReviewRule, "result 仅允许 APPROVED|REJECTED|NEED_COORDINATION，收到 %q", in.Result)
	}
	var app model.MissionApplication
	err := s.db.Where("application_id = ?", in.ApplicationID).First(&app).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil, nil, crosschain.NewError(errcode.ReviewRule, "申请 %q 不存在", in.ApplicationID)
	}
	if err != nil {
		return nil, nil, nil, crosschain.NewError(errcode.Internal, "application lookup: %v", err)
	}
	if !reviewableAppStatus[app.Status] {
		return nil, nil, nil, crosschain.NewError(errcode.ReviewRule, "申请状态 %q 不可审核（需 PENDING/SENT/RELAYED）", app.Status)
	}
	m, err := s.QueryMission(ctx, traceID, app.MissionID)
	if err != nil {
		return nil, nil, nil, err
	}
	switch m.Status {
	case "SUBMITTED":
		if err := s.transitionMission(traceID, in.Reviewer, m, "REVIEWING", "REVIEW_START"); err != nil {
			return nil, m, nil, err
		}
	case "REVIEWING": // 协调后重审，直接受理
	default:
		return nil, m, nil, crosschain.NewError(errcode.MissionState, "任务状态 %q 不可审核（需 SUBMITTED/REVIEWING）", m.Status)
	}
	if in.RulesHit == nil {
		in.RulesHit = []string{}
	}
	rulesJSON, err := json.Marshal(in.RulesHit)
	if err != nil {
		return nil, m, nil, crosschain.NewError(errcode.Internal, "marshal rules_hit: %v", err)
	}
	rev := &model.ReviewRecord{
		ReviewID: model.GenReviewID(), ApplicationID: app.ApplicationID,
		Result: in.Result, RulesHit: string(rulesJSON), Comment: in.Comment,
		Reviewer: in.Reviewer, ReviewTime: timex.NowT(),
	}
	if err := s.db.Create(rev).Error; err != nil {
		return nil, m, nil, crosschain.NewError(errcode.Internal, "create review: %v", err)
	}
	payload := map[string]any{
		"review_id": rev.ReviewID, "application_id": app.ApplicationID,
		"mission_id": m.MissionID, "result": in.Result, "reviewer": in.Reviewer,
	}
	tx, err := s.sendCrosschain(ctx, traceID, crosschain.MsgMissionReviewResult, rev.ReviewID,
		"fisco-bcos", "fabric", payload, crypto.SM9IdentityOf(in.Reviewer), "")
	if err != nil {
		return rev, m, tx, err // 任务停留 REVIEWING，可重试
	}
	if err := s.transitionMission(traceID, in.Reviewer, m, target, "REVIEW_"+in.Result); err != nil {
		return rev, m, tx, err
	}
	app.Status = in.Result
	if err := s.db.Model(&app).Update("status", app.Status).Error; err != nil {
		return rev, m, tx, crosschain.NewError(errcode.Internal, "persist application status: %v", err)
	}
	s.logAudit(traceID, in.Reviewer, "REVIEW_SUBMIT", "REVIEW", rev.ReviewID,
		map[string]any{"application_id": app.ApplicationID, "mission_id": m.MissionID,
			"result": in.Result, "cross_tx_id": tx.CrossTxID, "rules_hit": in.RulesHit})
	return rev, m, tx, nil
}

// QueryReview review_id 查单条；application_id 查列表（review_time 升序）；
// 都不提供 → 6002；review_id 不存在 → 6002。
func (s *Service) QueryReview(ctx context.Context, traceID, reviewID, applicationID string) (*model.ReviewRecord, []model.ReviewRecord, error) {
	if reviewID != "" {
		var rev model.ReviewRecord
		err := s.db.Where("review_id = ?", reviewID).First(&rev).Error
		if err == gorm.ErrRecordNotFound {
			return nil, nil, crosschain.NewError(errcode.Param, "review_id %q 不存在", reviewID)
		}
		if err != nil {
			return nil, nil, crosschain.NewError(errcode.Internal, "query review: %v", err)
		}
		return &rev, nil, nil
	}
	if applicationID != "" {
		var list []model.ReviewRecord
		if err := s.db.Where("application_id = ?", applicationID).Order("review_time ASC").Find(&list).Error; err != nil {
			return nil, nil, crosschain.NewError(errcode.Internal, "query reviews: %v", err)
		}
		return nil, list, nil
	}
	return nil, nil, crosschain.NewError(errcode.Param, "review_id 或 application_id 至少提供一个")
}
