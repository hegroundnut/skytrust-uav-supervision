package uavbusiness

import (
	"context"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// validSubjectTypes 实名主体类型枚举（spec §3.3）。
var validSubjectTypes = map[string]bool{"INDIVIDUAL": true, "ENTERPRISE": true}

// RealnameInput 实名登记入参。
type RealnameInput struct {
	SubjectType string // INDIVIDUAL|ENTERPRISE（必填）
	Name        string
	IdNumber    string // 模拟证件号：身份证/统一社会信用代码
	Contact     string
}

// RegisterRealname 实名登记：必填与枚举校验（违规→6002）；SubjectID 自动 RNS- 前缀；状态 REGISTERED。
func (s *Service) RegisterRealname(ctx context.Context, traceID string, in RealnameInput) (*model.RealnameSubject, error) {
	if in.Name == "" || in.IdNumber == "" {
		return nil, crosschain.NewError(errcode.Param, "name 与 id_number 必填")
	}
	if !validSubjectTypes[in.SubjectType] {
		return nil, crosschain.NewError(errcode.Param, "subject_type 仅允许 INDIVIDUAL|ENTERPRISE，收到 %q", in.SubjectType)
	}
	sub := &model.RealnameSubject{
		SubjectID: model.GenSubjectID(), SubjectType: in.SubjectType,
		Name: in.Name, IdNumber: in.IdNumber, Contact: in.Contact, Status: "REGISTERED",
	}
	if err := s.db.WithContext(ctx).Create(sub).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create realname subject: %v", err)
	}
	s.logAudit(traceID, sub.SubjectID, "REALNAME_REGISTER", "REALNAME", sub.SubjectID,
		map[string]any{"subject_type": sub.SubjectType, "name": sub.Name})
	return sub, nil
}

// RealnameListFilter 实名主体列表过滤 + 分页参数。
type RealnameListFilter struct {
	SubjectType string
	Page        int
	PageSize    int
}

// ListRealname subject_type 过滤（空串=不过滤），created_at 降序分页（同 ListPass 形状）。
func (s *Service) ListRealname(ctx context.Context, traceID string, f RealnameListFilter) ([]model.RealnameSubject, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.WithContext(ctx).Model(&model.RealnameSubject{})
	if f.SubjectType != "" {
		q = q.Where("subject_type = ?", f.SubjectType)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.RealnameSubject
	if err := q.Order("created_at DESC, subject_id DESC").
		Offset((f.Page - 1) * f.PageSize).Limit(f.PageSize).Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}

// QueryRealname 单主体查询；空 ID→6002；不存在→7001。
func (s *Service) QueryRealname(ctx context.Context, traceID, subjectID string) (*model.RealnameSubject, error) {
	if subjectID == "" {
		return nil, crosschain.NewError(errcode.Param, "subject_id 必填")
	}
	var sub model.RealnameSubject
	err := s.db.WithContext(ctx).Where("subject_id = ?", subjectID).First(&sub).Error
	if err == gorm.ErrRecordNotFound {
		return nil, crosschain.NewError(errcode.RealnameNotFound, "实名主体 %q 不存在", subjectID)
	}
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "query realname subject: %v", err)
	}
	return &sub, nil
}
