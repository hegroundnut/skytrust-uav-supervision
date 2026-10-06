package api

import (
	"regexp"
	"testing"
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
