package api

import (
	"strings"
	"testing"
)

func TestAlertRaiseHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	resp := postJSON(t, r, "/api/alert/raise", map[string]any{
		"alert_id": "ALERT-2026-001", "uav_pseudonym": "PSEUDO-UAV-83921",
		"event_type": "ROUTE_DEVIATION", "risk_level": "HIGH",
		"source_system": "MANUAL", "operator": "REG-01", "mission_id": "MISSION-2026-001",
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("raise: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["alert_id"] != "ALERT-2026-001" || d["status"] != "OPEN" || d["evidence_hash"] == "" {
		t.Fatalf("raise data = %v", d)
	}
	// 绑定失败 → 6002 "参数错误: " 前缀
	bad := postJSON(t, r, "/api/alert/raise", map[string]any{"event_type": "ROUTE_DEVIATION"})
	if bad["code"].(float64) != 6002 || len(bad["message"].(string)) < 4 {
		t.Fatalf("bad raise: %v", bad)
	}
	// 枚举违规（绑定通过、service 拒绝）→ 6002
	enum := postJSON(t, r, "/api/alert/raise", map[string]any{
		"uav_pseudonym": "P", "event_type": "NOPE", "risk_level": "HIGH",
		"source_system": "MANUAL", "operator": "REG-01",
	})
	if enum["code"].(float64) != 6002 {
		t.Fatalf("enum: %v", enum)
	}
}

func TestAlertListHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/alert/raise", map[string]any{
		"uav_pseudonym": "PSEUDO-UAV-83921", "event_type": "WORMHOLE_ALERT",
		"risk_level": "HIGH", "source_system": "SYSTEM2", "operator": "REG-01",
	})
	// 空 body 合法
	resp := postJSON(t, r, "/api/alert/list", nil)
	if resp["code"].(float64) != 0 {
		t.Fatalf("list: %v", resp)
	}
	d := resp["data"].(map[string]any)
	for _, k := range []string{"records", "total", "page", "page_size"} {
		if _, ok := d[k]; !ok {
			t.Fatalf("envelope missing %s: %v", k, d)
		}
	}
	if d["total"].(float64) != 1 || d["page"].(float64) != 1 || d["page_size"].(float64) != 20 {
		t.Fatalf("envelope = %v", d)
	}
	f := postJSON(t, r, "/api/alert/list", map[string]any{"event_type": "ROUTE_DEVIATION"})
	if f["data"].(map[string]any)["total"].(float64) != 0 {
		t.Fatalf("filter = %v", f)
	}
}

func TestAlertStatusHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/alert/raise", map[string]any{
		"alert_id": "ALERT-2026-001", "uav_pseudonym": "PSEUDO-UAV-83921",
		"event_type": "ROUTE_DEVIATION", "risk_level": "HIGH",
		"source_system": "MANUAL", "operator": "REG-01",
	})
	ok := postJSON(t, r, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "IDENTIFIED", "operator": "REG-01",
	})
	if ok["code"].(float64) != 0 || ok["data"].(map[string]any)["status"] != "IDENTIFIED" {
		t.Fatalf("transition: %v", ok)
	}
	bad := postJSON(t, r, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "ARCHIVED", "operator": "REG-01",
	})
	if bad["code"].(float64) != 6002 {
		t.Fatalf("illegal jump: %v", bad)
	}
}

func TestTraceIdentityHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo init: %v", resp)
	}
	resp := postJSON(t, r, "/api/trace/identity", map[string]any{
		"pseudo": "PSEUDO-UAV-83921", "operator": "REG-01",
	})
	// demo 数据无 PASS-2026-001 许可行 → 断点在第 3 级，5001 + 部分结果透传
	if resp["code"].(float64) != 5001 {
		t.Fatalf("want 5001, got %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["break_level"].(float64) != 3 || d["resolved"] != false {
		t.Fatalf("trace data = %v", d)
	}
	levels := d["levels"].([]any)
	if len(levels) != 7 {
		t.Fatalf("levels = %d", len(levels))
	}
	l1 := levels[0].(map[string]any)
	if l1["status"] != "RESOLVED" || l1["value"] != "PSEUDO-UAV-83921" || l1["source"] != "CHAINMAKER_INDEX" {
		t.Fatalf("L1 = %v", l1)
	}
	l3 := levels[2].(map[string]any)
	if l3["status"] != "BROKEN" || l3["reason"] == "" {
		t.Fatalf("L3 = %v", l3)
	}
	// 入口全缺 → 6002
	bad := postJSON(t, r, "/api/trace/identity", map[string]any{"operator": "REG-01"})
	if bad["code"].(float64) != 6002 {
		t.Fatalf("no entry: %v", bad)
	}
}

func TestAuthorizeApplyHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo init: %v", resp)
	}
	// 真实目标任务（HTTP 全流程创建，UAV-A-001 已 seed VERIFIED）
	mc := postJSON(t, r, "/api/mission/create", map[string]any{
		"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R101", "R205", "R306"},
		"altitude_min": 60, "altitude_max": 120, "payload_type": "CAMERA",
		"description":  "巡线走廊Zone-A全线巡检",
	})
	if mc["code"].(float64) != 0 {
		t.Fatalf("mission create: %v", mc)
	}
	mid := mc["data"].(map[string]any)["mission_id"].(string)
	resp := postJSON(t, r, "/api/authorize/apply", map[string]any{
		"authorization_id": "AUTH-2026-001", "regulator_id": "REG-01",
		"scope": []string{"MISSION", "ROUTE", "PAYLOAD", "IDENTITY"},
		"target_type": "MISSION", "target_id": mid, "reason": "虫洞告警核查",
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("apply: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["authorization_id"] != "AUTH-2026-001" || d["status"] != "PENDING" || len(d["audit_hash"].(string)) != 64 {
		t.Fatalf("apply data = %v", d)
	}
	// 目标不存在 → 6002
	bad := postJSON(t, r, "/api/authorize/apply", map[string]any{
		"regulator_id": "REG-01", "scope": []string{"MISSION"},
		"target_type": "MISSION", "target_id": "MISSION-NOPE", "reason": "x",
	})
	if bad["code"].(float64) != 6002 {
		t.Fatalf("bad target: %v", bad)
	}
}

func TestAuthorizeReviewHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/demo/init", map[string]any{})
	mc := postJSON(t, r, "/api/mission/create", map[string]any{
		"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R101", "R205", "R306"},
		"altitude_min": 60, "altitude_max": 120, "payload_type": "CAMERA",
	})
	mid := mc["data"].(map[string]any)["mission_id"].(string)
	postJSON(t, r, "/api/authorize/apply", map[string]any{
		"authorization_id": "AUTH-2026-001", "regulator_id": "REG-01",
		"scope": []string{"MISSION"}, "target_type": "MISSION", "target_id": mid, "reason": "核查",
	})
	resp := postJSON(t, r, "/api/authorize/review", map[string]any{
		"authorization_id": "AUTH-2026-001", "decision": "APPROVE", "reviewer_id": "REG-ADMIN",
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("review: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["auth"].(map[string]any)["status"] != "AUTHORIZED" ||
		!strings.HasPrefix(d["chain_tx_id"].(string), "CHAINMAKER-") {
		t.Fatalf("review data = %v", d)
	}
	// 复审 → 6002
	again := postJSON(t, r, "/api/authorize/review", map[string]any{
		"authorization_id": "AUTH-2026-001", "decision": "APPROVE", "reviewer_id": "REG-ADMIN",
	})
	if again["code"].(float64) != 6002 {
		t.Fatalf("re-review: %v", again)
	}
}

func TestInspectCiphertextHandler(t *testing.T) {
	r := setupFullTestRouter(t)
	postJSON(t, r, "/api/demo/init", map[string]any{})
	mc := postJSON(t, r, "/api/mission/create", map[string]any{
		"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R101", "R205", "R306"},
		"altitude_min": 60, "altitude_max": 120, "payload_type": "CAMERA",
		"description": "巡线走廊Zone-A全线巡检",
	})
	mid := mc["data"].(map[string]any)["mission_id"].(string)
	// 未授权 → 5002 + sealed（数据在 data 顶层，明文键不存在）
	un := postJSON(t, r, "/api/inspect/ciphertext", map[string]any{"mission_id": mid, "regulator_id": "REG-01"})
	if un["code"].(float64) != 5002 {
		t.Fatalf("unauthorized: %v", un)
	}
	ud := un["data"].(map[string]any)
	if ud["authorized"] != false {
		t.Fatalf("authorized flag: %v", ud)
	}
	if _, leaked := ud["decrypted_view"]; leaked {
		t.Fatalf("plaintext leaked: %v", ud)
	}
	sld := ud["sealed"].(map[string]any)
	if sld["ciphertext_status"] != "SEALED" || sld["masked_value"] != "巡线走廊****" || sld["has_ciphertext"] != true {
		t.Fatalf("sealed: %v", sld)
	}
	// 授权闭环后 → code 0 + decrypted_view
	postJSON(t, r, "/api/authorize/apply", map[string]any{
		"authorization_id": "AUTH-2026-001", "regulator_id": "REG-01",
		"scope": []string{"MISSION", "ROUTE", "PAYLOAD"}, "target_type": "MISSION",
		"target_id": mid, "reason": "核查",
	})
	postJSON(t, r, "/api/authorize/review", map[string]any{
		"authorization_id": "AUTH-2026-001", "decision": "APPROVE", "reviewer_id": "REG-ADMIN",
	})
	ok := postJSON(t, r, "/api/inspect/ciphertext", map[string]any{
		"mission_id": mid, "authorization_id": "AUTH-2026-001", "regulator_id": "REG-01",
		"trajectory": "NORMAL", "payload_type": "CAMERA",
	})
	if ok["code"].(float64) != 0 {
		t.Fatalf("authorized inspect: %v", ok)
	}
	od := ok["data"].(map[string]any)
	if od["authorized"] != true || od["decrypted_view"] != "巡线走廊Zone-A全线巡检" {
		t.Fatalf("authorized data = %v", od)
	}
	conc := od["conclusion"].(map[string]any)
	if conc["route_verdict"] != "ROUTE_OK" || conc["payload_verdict"] != "PAYLOAD_OK" {
		t.Fatalf("conclusion = %v", conc)
	}
}
