package uavbusiness

import (
	"context"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// pilotSignerUID 执照签署人 = 管理方身份（与 passSignerUID 对齐，spec §3.4：
// 前端可用 crypto/sm9/verify 以同一 canonical 材料复核防篡改）。
func pilotSignerUID() string { return crypto.SM9IdentityOf("FISCO-ADMIN") }

// validLicenseCategories 执照类别枚举（spec §3.4）。
var validLicenseCategories = map[string]bool{"多旋翼": true, "固定翼": true, "垂直起降": true}

// pilotCanonical 执照 canonical 材料（签名与前端复核同源；时间用 timex 单一写格式）。
func pilotCanonical(l *model.PilotLicense) map[string]any {
	return map[string]any{
		"license_id": l.LicenseID, "license_no": l.LicenseNo, "name": l.Name,
		"id_number": l.IdNumber, "category": l.Category,
		"issued_at": timex.FormatTime(l.IssuedAt.Time), "expires_at": timex.FormatTime(l.ExpiresAt.Time),
	}
}

// PilotApplyInput 执照申请入参。
type PilotApplyInput struct {
	Name     string
	IdNumber string
	Category string // 多旋翼|固定翼|垂直起降（必填）
}

// ApplyPilotLicense 操控员执照申请（模拟即审即发，spec §3.4）：
// 枚举校验（违规→6002）；LicenseNo=UAV-PILOT-<年份>-<4位随机>；ExpiresAt 默认+2年；
// canonical 内容 SM9 管理方签名后落库。
func (s *Service) ApplyPilotLicense(ctx context.Context, traceID string, in PilotApplyInput) (*model.PilotLicense, error) {
	if in.Name == "" || in.IdNumber == "" {
		return nil, crosschain.NewError(errcode.Param, "name 与 id_number 必填")
	}
	if !validLicenseCategories[in.Category] {
		return nil, crosschain.NewError(errcode.Param, "category 仅允许 多旋翼|固定翼|垂直起降，收到 %q", in.Category)
	}
	now := timex.Now()
	l := &model.PilotLicense{
		LicenseID: model.GenLicenseID(), LicenseNo: model.GenLicenseNo(now.Year()),
		Name: in.Name, IdNumber: in.IdNumber, Category: in.Category, Status: "ISSUED",
		IssuedAt: timex.New(now), ExpiresAt: timex.New(now.AddDate(2, 0, 0)),
	}
	cb, err := crypto.CanonicalJSON(pilotCanonical(l))
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "canonical license: %v", err)
	}
	sig, err := s.cs.SM9SignUserID(pilotSignerUID(), cb)
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "SM9 sign license: %v", err)
	}
	l.Signature = sig
	if err := s.db.WithContext(ctx).Create(l).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create pilot license: %v", err)
	}
	s.logAudit(traceID, l.LicenseID, "PILOT_LICENSE_ISSUE", "PILOT_LICENSE", l.LicenseID,
		map[string]any{"license_no": l.LicenseNo, "category": l.Category, "name": l.Name})
	return l, nil
}

// QueryPilotLicense 单执照查询；空 ID→6002；不存在→7002。
func (s *Service) QueryPilotLicense(ctx context.Context, traceID, licenseID string) (*model.PilotLicense, error) {
	if licenseID == "" {
		return nil, crosschain.NewError(errcode.Param, "license_id 必填")
	}
	var l model.PilotLicense
	err := s.db.WithContext(ctx).Where("license_id = ?", licenseID).First(&l).Error
	if err == gorm.ErrRecordNotFound {
		return nil, crosschain.NewError(errcode.LicenseInvalid, "执照 %q 不存在", licenseID)
	}
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "query pilot license: %v", err)
	}
	return &l, nil
}

// CheckPilotLicense 任务关联校验：存在 + 未过期（不存在/过期→7002）。
func (s *Service) CheckPilotLicense(ctx context.Context, traceID, licenseID string) (*model.PilotLicense, error) {
	l, err := s.QueryPilotLicense(ctx, traceID, licenseID)
	if err != nil {
		return nil, err
	}
	if timex.Now().After(l.ExpiresAt.Time) {
		return nil, crosschain.NewError(errcode.LicenseInvalid, "执照 %q 已于 %s 过期", licenseID, timex.FormatTime(l.ExpiresAt.Time))
	}
	return l, nil
}

// PilotListFilter 执照列表过滤 + 分页参数。
type PilotListFilter struct {
	Category string
	Page     int
	PageSize int
}

// ListPilotLicenses category 过滤（空串=不过滤），created_at 降序分页（同 ListRealname 形状）。
func (s *Service) ListPilotLicenses(ctx context.Context, traceID string, f PilotListFilter) ([]model.PilotLicense, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.WithContext(ctx).Model(&model.PilotLicense{})
	if f.Category != "" {
		q = q.Where("category = ?", f.Category)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.PilotLicense
	if err := q.Order("created_at DESC, license_id DESC").
		Offset((f.Page - 1) * f.PageSize).Limit(f.PageSize).Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}
