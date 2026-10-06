package api

import (
	"fmt"
	"regexp"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

func TestRealnameEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	// register ENTERPRISE
	resp := postJSON(t, r, "/api/realname/register", map[string]any{
		"subject_type": "ENTERPRISE", "name": "云巡物流", "id_number": "91420100MA4KTEST1X", "contact": "027-88880000",
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("realname/register: %v", resp)
	}
	sub := resp["data"].(map[string]any)["subject"].(map[string]any)
	if sub["status"] != "REGISTERED" || sub["subject_type"] != "ENTERPRISE" {
		t.Errorf("subject = %v", sub)
	}
	sid := sub["subject_id"].(string)
	if sid[:4] != "RNS-" {
		t.Errorf("subject_id = %q, want RNS- 前缀", sid)
	}
	// register INDIVIDUAL（为 list 过滤准备）
	if resp = postJSON(t, r, "/api/realname/register", map[string]any{
		"subject_type": "INDIVIDUAL", "name": "张三", "id_number": "420100199001010011",
	}); resp["code"].(float64) != 0 {
		t.Fatalf("realname/register INDIVIDUAL: %v", resp)
	}
	// subject_type 非法 → 6002
	if resp = postJSON(t, r, "/api/realname/register", map[string]any{"subject_type": "GOV", "name": "x", "id_number": "y"}); resp["code"].(float64) != 6002 {
		t.Errorf("非法 subject_type = %v, want 6002", resp)
	}
	// 缺 name → 6002（binding required）
	if resp = postJSON(t, r, "/api/realname/register", map[string]any{"subject_type": "INDIVIDUAL", "id_number": "y"}); resp["code"].(float64) != 6002 {
		t.Errorf("缺 name = %v, want 6002", resp)
	}
	// list 过滤 + 分页回显
	resp = postJSON(t, r, "/api/realname/list", map[string]any{"subject_type": "INDIVIDUAL"})
	d := resp["data"].(map[string]any)
	if d["total"].(float64) != 1 || d["page"].(float64) != 1 || d["page_size"].(float64) != 20 {
		t.Errorf("list = %v", d)
	}
	// query 命中 + 未命中
	if resp = postJSON(t, r, "/api/realname/query", map[string]any{"subject_id": sid}); resp["code"].(float64) != 0 {
		t.Errorf("query: %v", resp)
	}
	if resp = postJSON(t, r, "/api/realname/query", map[string]any{"subject_id": "RNS-NOPE"}); resp["code"].(float64) != 7001 {
		t.Errorf("query miss = %v, want 7001", resp)
	}
}

func TestUAVRegisterRealnameAndMarkAPI(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	sub := postJSON(t, r, "/api/realname/register", map[string]any{
		"subject_type": "INDIVIDUAL", "name": "李四", "id_number": "420100199202020022",
	})
	sid := sub["data"].(map[string]any)["subject"].(map[string]any)["subject_id"].(string)

	resp := postJSON(t, r, "/api/uav/register", map[string]any{
		"manufacturer_id": "Manufacturer-B", "operator_id": "Operator-A",
		"model": "DJI-M30", "serial_no": "SN-UOM-1", "realname_id": sid,
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("uav/register: %v", resp)
	}
	uav := resp["data"].(map[string]any)["uav"].(map[string]any)
	if uav["status"] != "VERIFIED" {
		t.Errorf("status = %v, want VERIFIED（纯加法不改变原语义）", uav["status"])
	}
	if uav["realname_id"] != sid {
		t.Errorf("realname_id = %v, want %s", uav["realname_id"], sid)
	}
	if !regexp.MustCompile(`^UAS-[0-9]{8}$`).MatchString(uav["registration_mark"].(string)) {
		t.Errorf("registration_mark = %v, want UAS-8位数字", uav["registration_mark"])
	}
	// 不存在实名主体 → 7001
	resp = postJSON(t, r, "/api/uav/register", map[string]any{
		"manufacturer_id": "Manufacturer-B", "operator_id": "Operator-A",
		"serial_no": "SN-UOM-2", "realname_id": "RNS-NOPE",
	})
	if resp["code"].(float64) != 7001 {
		t.Errorf("unknown realname = %v, want 7001", resp)
	}
	// seed 机预置注册标志
	resp = postJSON(t, r, "/api/uav/query", map[string]any{"uav_id": "UAV-A-001"})
	if m := resp["data"].(map[string]any)["registration_mark"]; m != "UAS-20260001" {
		t.Errorf("UAV-A-001 registration_mark = %v, want UAS-20260001", m)
	}
}

func TestPilotEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	resp := postJSON(t, r, "/api/pilot/apply", map[string]any{"name": "王五", "id_number": "420100199303030033", "category": "多旋翼"})
	if resp["code"].(float64) != 0 {
		t.Fatalf("pilot/apply: %v", resp)
	}
	lic := resp["data"].(map[string]any)["license"].(map[string]any)
	if lic["status"] != "ISSUED" || lic["signature"] == "" {
		t.Errorf("license = %v", lic)
	}
	lid := lic["license_id"].(string)
	if !strings.HasPrefix(lic["license_no"].(string), fmt.Sprintf("UAV-PILOT-%d-", time.Now().Year())) {
		t.Errorf("license_no = %v", lic["license_no"])
	}
	// category 非法 → 6002
	if resp = postJSON(t, r, "/api/pilot/apply", map[string]any{"name": "x", "id_number": "y", "category": "直升机"}); resp["code"].(float64) != 6002 {
		t.Errorf("非法 category = %v, want 6002", resp)
	}
	// query 命中 + 未命中 → 7002
	if resp = postJSON(t, r, "/api/pilot/query", map[string]any{"license_id": lid}); resp["code"].(float64) != 0 {
		t.Errorf("query: %v", resp)
	}
	if resp = postJSON(t, r, "/api/pilot/query", map[string]any{"license_id": "PIL-NOPE"}); resp["code"].(float64) != 7002 {
		t.Errorf("query miss = %v, want 7002", resp)
	}
	// list category 过滤 + 分页回显
	resp = postJSON(t, r, "/api/pilot/list", map[string]any{"category": "多旋翼"})
	d := resp["data"].(map[string]any)
	if d["total"].(float64) != 1 || d["page"].(float64) != 1 || d["page_size"].(float64) != 20 {
		t.Errorf("list = %v", d)
	}
	// 正则形状复核：UAV-PILOT-<年>-<4位数字>
	if !regexp.MustCompile(`^UAV-PILOT-[0-9]{4}-[0-9]{4}$`).MatchString(lic["license_no"].(string)) {
		t.Errorf("license_no 形状 = %v", lic["license_no"])
	}
}

func TestMissionCreatePilotLicenseLink(t *testing.T) {
	deps := validTestDeps(t)
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	lic := postJSON(t, r, "/api/pilot/apply", map[string]any{"name": "医疗运输操控员", "id_number": "420100199203054321", "category": "垂直起降"})
	lid := lic["data"].(map[string]any)["license"].(map[string]any)["license_id"].(string)

	body := func(licenseID string) map[string]any {
		return map[string]any{
			"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
			"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
			"route_segments": []string{"R101", "R205", "R306"},
			"altitude_min":   60, "altitude_max": 120, "payload_type": "CAMERA",
			"description": "执照关联任务", "pilot_license_id": licenseID,
		}
	}
	// 有效执照 → 创建成功且回显 pilot_license_id
	resp := postJSON(t, r, "/api/mission/create", body(lid))
	if resp["code"].(float64) != 0 {
		t.Fatalf("mission/create with license: %v", resp)
	}
	if resp["data"].(map[string]any)["pilot_license_id"] != lid {
		t.Errorf("pilot_license_id = %v, want %s", resp["data"].(map[string]any)["pilot_license_id"], lid)
	}
	// 不存在执照 → 7002（校验在事务前，未产生任务；auto mission_id 计数不受影响）
	if resp = postJSON(t, r, "/api/mission/create", body("PIL-NOPE")); resp["code"].(float64) != 7002 {
		t.Errorf("unknown license = %v, want 7002", resp)
	}
	// 过期执照 → 7002（直插过期行）
	past := timex.New(time.Now().AddDate(-1, 0, 0))
	deps.DB.Create(&model.PilotLicense{
		LicenseID: "PIL-EXP-API", LicenseNo: "UAV-PILOT-2020-9999", Name: "过期者", IdNumber: "420100198001010011",
		Category: "多旋翼", Status: "ISSUED", IssuedAt: past, ExpiresAt: past,
	})
	if resp = postJSON(t, r, "/api/mission/create", body("PIL-EXP-API")); resp["code"].(float64) != 7002 {
		t.Errorf("expired license = %v, want 7002", resp)
	}
}
