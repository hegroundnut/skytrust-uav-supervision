package uavbusiness

import (
	"context"
	"strings"
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

func TestRegisterRealname(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()

	sub, err := svc.RegisterRealname(ctx, "TRACE-RN-1", RealnameInput{
		SubjectType: "ENTERPRISE", Name: "云巡物流", IdNumber: "91420100MA4KTEST1X", Contact: "027-88880000",
	})
	if err != nil {
		t.Fatalf("RegisterRealname: %v", err)
	}
	if !strings.HasPrefix(sub.SubjectID, "RNS-") {
		t.Errorf("subject_id = %q, want RNS- 前缀", sub.SubjectID)
	}
	if sub.Status != "REGISTERED" || sub.SubjectType != "ENTERPRISE" {
		t.Errorf("subject = %+v", sub)
	}
	ind, err := svc.RegisterRealname(ctx, "TRACE-RN-2", RealnameInput{SubjectType: "INDIVIDUAL", Name: "张三", IdNumber: "420100199001010011"})
	if err != nil || ind.SubjectType != "INDIVIDUAL" {
		t.Fatalf("INDIVIDUAL 注册 = (%+v, %v)", ind, err)
	}

	// subject_type 非法 → 6002
	_, err = svc.RegisterRealname(ctx, "TRACE-RN-3", RealnameInput{SubjectType: "GOV", Name: "x", IdNumber: "y"})
	if codeOf(err) != errcode.Param {
		t.Errorf("非法 subject_type err = %v, want 6002", err)
	}
	// name/id_number 缺失 → 6002
	_, err = svc.RegisterRealname(ctx, "TRACE-RN-4", RealnameInput{SubjectType: "INDIVIDUAL", IdNumber: "y"})
	if codeOf(err) != errcode.Param {
		t.Errorf("缺 name err = %v, want 6002", err)
	}
}

func TestRealnameListAndQuery(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	if _, err := svc.RegisterRealname(ctx, "TRACE-RN-L1", RealnameInput{SubjectType: "ENTERPRISE", Name: "企业甲", IdNumber: "E1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterRealname(ctx, "TRACE-RN-L2", RealnameInput{SubjectType: "INDIVIDUAL", Name: "个人乙", IdNumber: "I1"}); err != nil {
		t.Fatal(err)
	}

	rows, total, err := svc.ListRealname(ctx, "TRACE-RN-L", RealnameListFilter{SubjectType: "INDIVIDUAL", Page: 0, PageSize: 0})
	if err != nil {
		t.Fatalf("ListRealname: %v", err)
	}
	if total != 1 || len(rows) != 1 || rows[0].Name != "个人乙" {
		t.Errorf("过滤结果 = (%+v, %d)", rows, total)
	}
	_, total, err = svc.ListRealname(ctx, "TRACE-RN-L", RealnameListFilter{})
	if err != nil || total != 2 {
		t.Errorf("全量 total = (%d, %v)", total, err)
	}

	// query 命中
	sub, err := svc.QueryRealname(ctx, "TRACE-RN-Q", rows[0].SubjectID)
	if err != nil || sub.Name != "个人乙" {
		t.Errorf("query = (%+v, %v)", sub, err)
	}
	// 不存在 → 7001
	_, err = svc.QueryRealname(ctx, "TRACE-RN-Q", "RNS-NOPE")
	if codeOf(err) != errcode.RealnameNotFound {
		t.Errorf("query miss err = %v, want 7001", err)
	}
	// 空 ID → 6002
	_, err = svc.QueryRealname(ctx, "TRACE-RN-Q", "")
	if codeOf(err) != errcode.Param {
		t.Errorf("空 ID err = %v, want 6002", err)
	}
}

func TestRegisterUAVRealnameAndMark(t *testing.T) {
	svc, db := testSvcFull(t)
	ctx := context.Background()
	db.Create(&model.Manufacturer{ManufacturerID: "MFR-RN", Name: "实名厂商", Status: "ACTIVE"})
	db.Create(&model.Operator{OperatorID: "OP-RN", Name: "实名运营方", Status: "ACTIVE"})
	sub, err := svc.RegisterRealname(ctx, "TRACE-RN-U1", RealnameInput{SubjectType: "INDIVIDUAL", Name: "王五", IdNumber: "420100199101010011"})
	if err != nil {
		t.Fatalf("RegisterRealname: %v", err)
	}

	// 带实名关联注册成功：registration_mark 即发、realname_id 回显
	uav, _, err := svc.RegisterUAV(ctx, "TRACE-RN-U2", UAVInput{
		ManufacturerID: "MFR-RN", OperatorID: "OP-RN", Model: "DJI-M30", SerialNo: "SN-RN-1", RealnameID: sub.SubjectID,
	})
	if err != nil {
		t.Fatalf("RegisterUAV: %v", err)
	}
	if uav.RealnameID != sub.SubjectID {
		t.Errorf("realname_id = %q, want %q", uav.RealnameID, sub.SubjectID)
	}
	if !strings.HasPrefix(uav.RegistrationMark, "UAS-") || len(uav.RegistrationMark) != 12 {
		t.Fatalf("registration_mark = %q, want UAS-+8 位数字", uav.RegistrationMark)
	}
	for _, ch := range uav.RegistrationMark[4:] {
		if ch < '0' || ch > '9' {
			t.Errorf("registration_mark 非纯数字 = %q", uav.RegistrationMark)
			break
		}
	}

	// 第二架（不带实名）：标志不重复、realname_id 为空
	uav2, _, err := svc.RegisterUAV(ctx, "TRACE-RN-U3", UAVInput{
		ManufacturerID: "MFR-RN", OperatorID: "OP-RN", SerialNo: "SN-RN-2",
	})
	if err != nil {
		t.Fatalf("RegisterUAV 2: %v", err)
	}
	if uav2.RegistrationMark == uav.RegistrationMark {
		t.Errorf("registration_mark 重复 = %q", uav2.RegistrationMark)
	}
	if uav2.RealnameID != "" {
		t.Errorf("未提供 realname_id 应为空 = %q", uav2.RealnameID)
	}

	// 不存在实名主体 → 7001
	_, _, err = svc.RegisterUAV(ctx, "TRACE-RN-U4", UAVInput{
		ManufacturerID: "MFR-RN", OperatorID: "OP-RN", SerialNo: "SN-RN-3", RealnameID: "RNS-NOPE",
	})
	if codeOf(err) != errcode.RealnameNotFound {
		t.Errorf("unknown realname err = %v, want 7001", err)
	}
}
