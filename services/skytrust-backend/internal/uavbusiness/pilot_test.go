package uavbusiness

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

func TestApplyPilotLicense(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	lic, err := svc.ApplyPilotLicense(ctx, "TRACE-PL-1", PilotApplyInput{Name: "王五", IdNumber: "420100199303030033", Category: "多旋翼"})
	if err != nil {
		t.Fatalf("ApplyPilotLicense: %v", err)
	}
	if !strings.HasPrefix(lic.LicenseID, "PIL-") {
		t.Errorf("license_id = %q, want PIL- 前缀", lic.LicenseID)
	}
	wantNo := fmt.Sprintf("UAV-PILOT-%d-", timex.Now().Year())
	if !strings.HasPrefix(lic.LicenseNo, wantNo) || len(lic.LicenseNo) != len(wantNo)+4 {
		t.Errorf("license_no = %q, want %s<4位数字>", lic.LicenseNo, wantNo)
	}
	if lic.Status != "ISSUED" {
		t.Errorf("status = %q, want ISSUED（即申即发）", lic.Status)
	}
	if lic.Signature == "" {
		t.Error("signature 为空, want SM9 管理方签名")
	}
	if lic.ExpiresAt.Year() != lic.IssuedAt.Year()+2 {
		t.Errorf("expires_at = %v, want 签发+2年", lic.ExpiresAt)
	}

	// category 非法 → 6002
	_, err = svc.ApplyPilotLicense(ctx, "TRACE-PL-2", PilotApplyInput{Name: "x", IdNumber: "y", Category: "直升机"})
	if codeOf(err) != errcode.Param {
		t.Errorf("非法 category err = %v, want 6002", err)
	}
	// 缺 name → 6002
	_, err = svc.ApplyPilotLicense(ctx, "TRACE-PL-3", PilotApplyInput{IdNumber: "y", Category: "固定翼"})
	if codeOf(err) != errcode.Param {
		t.Errorf("缺 name err = %v, want 6002", err)
	}
}

func TestPilotQueryListCheck(t *testing.T) {
	svc, db := testSvc(t)
	ctx := context.Background()
	lic, err := svc.ApplyPilotLicense(ctx, "TRACE-PL-Q1", PilotApplyInput{Name: "赵六", IdNumber: "420100199404040044", Category: "垂直起降"})
	if err != nil {
		t.Fatal(err)
	}

	// query 命中 + 未命中（7002）+ 空 ID（6002）
	got, err := svc.QueryPilotLicense(ctx, "TRACE-PL-Q2", lic.LicenseID)
	if err != nil || got.LicenseNo != lic.LicenseNo {
		t.Errorf("query = (%+v, %v)", got, err)
	}
	_, err = svc.QueryPilotLicense(ctx, "TRACE-PL-Q3", "PIL-NOPE")
	if codeOf(err) != errcode.LicenseInvalid {
		t.Errorf("query miss err = %v, want 7002", err)
	}
	_, err = svc.QueryPilotLicense(ctx, "TRACE-PL-Q4", "")
	if codeOf(err) != errcode.Param {
		t.Errorf("空 ID err = %v, want 6002", err)
	}

	// list category 过滤 + 分页归一化
	if _, err := svc.ApplyPilotLicense(ctx, "TRACE-PL-Q5", PilotApplyInput{Name: "孙七", IdNumber: "420100199505050055", Category: "固定翼"}); err != nil {
		t.Fatal(err)
	}
	rows, total, err := svc.ListPilotLicenses(ctx, "TRACE-PL-Q6", PilotListFilter{Category: "垂直起降", Page: 0, PageSize: 0})
	if err != nil || total != 1 || len(rows) != 1 || rows[0].Name != "赵六" {
		t.Errorf("category 过滤 = (%+v, %d, %v)", rows, total, err)
	}

	// CheckPilotLicense：有效 → 通过
	if _, err := svc.CheckPilotLicense(ctx, "TRACE-PL-Q7", lic.LicenseID); err != nil {
		t.Errorf("有效执照应通过: %v", err)
	}
	// 过期 → 7002（直插过期行）
	past := timex.New(time.Now().AddDate(-1, 0, 0))
	db.Create(&model.PilotLicense{
		LicenseID: "PIL-EXP-1", LicenseNo: "UAV-PILOT-2020-0001", Name: "过期者", IdNumber: "420100198001010011",
		Category: "多旋翼", Status: "ISSUED", IssuedAt: past, ExpiresAt: past,
	})
	_, err = svc.CheckPilotLicense(ctx, "TRACE-PL-Q8", "PIL-EXP-1")
	if codeOf(err) != errcode.LicenseInvalid {
		t.Errorf("过期 err = %v, want 7002", err)
	}
}
