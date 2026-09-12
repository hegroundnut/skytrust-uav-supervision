package tests

import (
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/timex"
)

// TestSystem3E2E 系统三闭环：业务主线 → 告警 → 7级追踪 → 未授权封缄 → 授权上链 →
// 密文核验（一致/偏航/过期）→ 审计导出 → 驾驶舱 → 断链留痕。
func TestSystem3E2E(t *testing.T) {
	srv := bootServerS1(t)
	defer srv.Close()
	must0 := func(step string, resp map[string]any) map[string]any {
		t.Helper()
		if resp["code"].(float64) != 0 {
			t.Fatalf("%s: want code 0, got %v", step, resp)
		}
		return resp["data"].(map[string]any)
	}
	wantCode := func(step string, code float64, resp map[string]any) map[string]any {
		t.Helper()
		if resp["code"].(float64) != code {
			t.Fatalf("%s: want code %v, got %v", step, code, resp)
		}
		d, _ := resp["data"].(map[string]any)
		return d
	}

	// 0. 演示数据就绪（身份映射 PSEUDO-UAV-83921 → PASS-2026-001 → UAV-A-001 → Manufacturer-B）
	must0("demo/init", call(t, srv, "/api/demo/init", map[string]any{}))

	// 1. 业务主线：create→submit→review APPROVED→pass/issue（与系统一同路径）
	mc := must0("mission/create", call(t, srv, "/api/mission/create", map[string]any{
		"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R101", "R205", "R306"},
		"altitude_min":   60, "altitude_max": 120, "payload_type": "CAMERA",
		"description": "巡线走廊Zone-A全线巡检",
	}))
	if mc["mission_id"] != "MISSION-2026-001" || mc["masked_value"] != "巡线走廊****" {
		t.Fatalf("mission = %v", mc)
	}
	sub := must0("mission/submit", call(t, srv, "/api/mission/submit", map[string]any{
		"mission_id": "MISSION-2026-001", "operator": "Operator-A",
	}))
	appID := sub["application"].(map[string]any)["application_id"].(string)
	must0("review/submit", call(t, srv, "/api/review/submit", map[string]any{
		"application_id": appID, "result": "APPROVED", "reviewer": "FISCO-ADMIN",
		"comment": "同意执行", "rules_hit": []string{"R-ALT-001"},
	}))
	iss := must0("pass/issue", call(t, srv, "/api/pass/issue", map[string]any{
		"mission_id": "MISSION-2026-001", "issuer": "FISCO-ADMIN",
		"valid_from": timex.FormatTime(timex.Now().Add(-time.Hour)),
		"valid_to":   timex.FormatTime(timex.Now().Add(time.Hour)),
	}))
	if iss["pass"].(map[string]any)["pass_id"] != "PASS-2026-001" ||
		iss["pass"].(map[string]any)["status"] != "VALID" {
		t.Fatalf("pass = %v", iss["pass"])
	}

	// 2. 告警登记（显式演示 ID ALERT-2026-001）+ 状态机线性推进；跨级迁移 → 6002
	raised := must0("alert/raise", call(t, srv, "/api/alert/raise", map[string]any{
		"alert_id": "ALERT-2026-001", "mission_id": "MISSION-2026-001",
		"uav_pseudonym": "PSEUDO-UAV-83921", "event_type": "ROUTE_DEVIATION",
		"risk_level": "HIGH", "source_system": "MANUAL", "operator": "REG-01",
	}))
	if raised["alert_id"] != "ALERT-2026-001" || raised["status"] != "OPEN" ||
		len(raised["evidence_hash"].(string)) != 64 {
		t.Fatalf("raised = %v", raised)
	}
	st1 := must0("alert/status IDENTIFIED", call(t, srv, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "IDENTIFIED", "operator": "REG-01", "reason": "初判成立",
	}))
	if st1["status"] != "IDENTIFIED" {
		t.Fatalf("st1 = %v", st1)
	}
	wantCode("alert/status skip", 6002, call(t, srv, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "REVIEWED", "operator": "REG-01",
	}))

	// 3. 告警入口 7 级追踪：resolved + break_level 0 + L7=Manufacturer-B + 亚秒
	tr := must0("trace/identity", call(t, srv, "/api/trace/identity", map[string]any{
		"alert_id": "ALERT-2026-001", "operator": "REG-01",
	}))
	if tr["resolved"] != true || tr["break_level"].(float64) != 0 || tr["entry_type"] != "ALERT_ID" {
		t.Fatalf("trace = %v", tr)
	}
	levels := tr["levels"].([]any)
	if len(levels) != 7 {
		t.Fatalf("levels = %d, want 7", len(levels))
	}
	if l7 := levels[6].(map[string]any); l7["value"] != "Manufacturer-B" ||
		l7["status"] != "RESOLVED" || l7["source"] != "FISCO_BCOS_DETAIL" {
		t.Fatalf("L7 = %v", l7)
	}
	if tr["trace_latency_ms"].(float64) >= 1000 {
		t.Fatalf("trace latency = %v ms, want < 1000", tr["trace_latency_ms"])
	}
	must0("alert/status TRACED", call(t, srv, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "TRACED", "operator": "REG-01", "reason": "追踪完成",
	}))

	// 4. TC3-04 未授权密文核验：5002 + 封缄（无明文键）+ 尝试留痕审计
	un := wantCode("inspect unauthorized", 5002, call(t, srv, "/api/inspect/ciphertext", map[string]any{
		"mission_id": "MISSION-2026-001", "regulator_id": "REG-01",
	}))
	if un["authorized"] != false {
		t.Fatalf("un data = %v", un)
	}
	if _, leaked := un["decrypted_view"]; leaked {
		t.Fatalf("plaintext leaked: %v", un)
	}
	sld := un["sealed"].(map[string]any)
	if sld["ciphertext_status"] != "SEALED" || sld["masked_value"] != "巡线走廊****" ||
		sld["has_ciphertext"] != true || len(sld["sm3_hash"].(string)) != 64 {
		t.Fatalf("sealed = %v", sld)
	}
	aud := must0("audit/query", call(t, srv, "/api/audit/query", map[string]any{"action": "INSPECT_UNAUTHORIZED"}))
	if aud["total"].(float64) < 1 {
		t.Fatalf("INSPECT_UNAUTHORIZED audit = %v", aud)
	}

	// 5. 授权闭环：显式 AUTH-2026-001 → APPROVE 上链 → 复审 6002
	ap := must0("authorize/apply", call(t, srv, "/api/authorize/apply", map[string]any{
		"authorization_id": "AUTH-2026-001", "regulator_id": "REG-01",
		"scope":       []string{"MISSION", "ROUTE", "PAYLOAD", "IDENTITY"},
		"target_type": "MISSION", "target_id": "MISSION-2026-001",
		"reason": "核查告警 ALERT-2026-001",
	}))
	if ap["authorization_id"] != "AUTH-2026-001" || ap["status"] != "PENDING" ||
		len(ap["audit_hash"].(string)) != 64 {
		t.Fatalf("apply = %v", ap)
	}
	rv := must0("authorize/review", call(t, srv, "/api/authorize/review", map[string]any{
		"authorization_id": "AUTH-2026-001", "decision": "APPROVE",
		"reviewer_id": "REG-ADMIN", "comment": "同意",
	}))
	if rv["auth"].(map[string]any)["status"] != "AUTHORIZED" ||
		!strings.HasPrefix(rv["chain_tx_id"].(string), "CHAINMAKER-") {
		t.Fatalf("review = %v", rv)
	}
	wantCode("re-review", 6002, call(t, srv, "/api/authorize/review", map[string]any{
		"authorization_id": "AUTH-2026-001", "decision": "APPROVE", "reviewer_id": "REG-ADMIN",
	}))

	// 6. 授权核验（正常航路+载荷一致）：明文视图 + 双验证 + 结论上链
	ins := must0("inspect authorized", call(t, srv, "/api/inspect/ciphertext", map[string]any{
		"mission_id": "MISSION-2026-001", "authorization_id": "AUTH-2026-001",
		"regulator_id": "REG-01", "trajectory": "NORMAL", "payload_type": "CAMERA",
	}))
	if ins["authorized"] != true || ins["decrypted_view"] != "巡线走廊Zone-A全线巡检" {
		t.Fatalf("inspect = %v", ins)
	}
	ver := ins["verification"].(map[string]any)
	if ver["digest_match"] != true || ver["signature_valid"] != true ||
		len(ver["audit_hash"].(string)) != 64 {
		t.Fatalf("verification = %v", ver)
	}
	conc := ins["conclusion"].(map[string]any)
	if conc["route_verdict"] != "ROUTE_OK" || conc["payload_verdict"] != "PAYLOAD_OK" ||
		len(conc["raised_alerts"].([]any)) != 0 {
		t.Fatalf("conclusion = %v", conc)
	}
	if !strings.HasPrefix(ins["chain_tx_id"].(string), "CHAINMAKER-") || ins["reg_audit_id"].(string) == "" {
		t.Fatalf("chain/audit = %v", ins)
	}
	must0("alert/status REVIEWED", call(t, srv, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "REVIEWED", "operator": "REG-01", "reason": "核验完成",
	}))

	// 7. 偏航核验：ROUTE_DEVIATION → SYSTEM3 自动告警；重复核验去重不新增
	dev := must0("inspect deviation", call(t, srv, "/api/inspect/ciphertext", map[string]any{
		"mission_id": "MISSION-2026-001", "authorization_id": "AUTH-2026-001",
		"regulator_id": "REG-01", "trajectory": "DEVIATION",
	}))
	dc := dev["conclusion"].(map[string]any)
	if dc["route_verdict"] != "ROUTE_DEVIATION" {
		t.Fatalf("deviation = %v", dc)
	}
	auto := dc["raised_alerts"].([]any)
	if len(auto) != 1 {
		t.Fatalf("raised = %v", auto)
	}
	autoID := auto[0].(string)
	again := must0("inspect deviation again", call(t, srv, "/api/inspect/ciphertext", map[string]any{
		"mission_id": "MISSION-2026-001", "authorization_id": "AUTH-2026-001",
		"regulator_id": "REG-01", "trajectory": "DEVIATION",
	}))
	againAlerts := again["conclusion"].(map[string]any)["raised_alerts"].([]any)
	if len(againAlerts) != 1 || againAlerts[0] != autoID {
		t.Fatalf("dedup = %v", againAlerts)
	}
	sys3 := must0("alert/list SYSTEM3", call(t, srv, "/api/alert/list", map[string]any{"source_system": "SYSTEM3"}))
	if sys3["total"].(float64) != 1 {
		t.Fatalf("SYSTEM3 alerts = %v, want 1 (dedup)", sys3)
	}

	// 8. 监管审计查询 + CSV 导出
	ral := must0("regulatory/audit/list INSPECT", call(t, srv, "/api/regulatory/audit/list", map[string]any{"action": "INSPECT"}))
	if ral["total"].(float64) != 3 { // 正常 + 偏航 + 去重复核
		t.Fatalf("INSPECT audits = %v", ral)
	}
	raa := must0("regulatory/audit/list AUTH_APPROVE", call(t, srv, "/api/regulatory/audit/list", map[string]any{"action": "AUTH_APPROVE"}))
	if raa["total"].(float64) != 1 {
		t.Fatalf("AUTH_APPROVE audits = %v", raa)
	}
	exp := must0("regulatory/audit/export", call(t, srv, "/api/regulatory/audit/export", map[string]any{}))
	if exp["format"] != "csv" || exp["rows"].(float64) < 4 ||
		!strings.HasPrefix(exp["content"].(string), "audit_id,") {
		t.Fatalf("export = %v", exp)
	}

	// 9. 驾驶舱：2 告警（演示 + 自动）、1 授权 AUTHORIZED、recent_alerts 有序
	sum := must0("dashboard/summary", call(t, srv, "/api/dashboard/summary", nil))
	alerts := sum["alerts"].(map[string]any)
	if alerts["total"].(float64) != 2 || alerts["high_open"].(float64) != 1 {
		t.Fatalf("alerts = %v", alerts)
	}
	if alerts["by_type"].(map[string]any)["ROUTE_DEVIATION"].(float64) != 2 {
		t.Fatalf("by_type = %v", alerts["by_type"])
	}
	if sum["authorizations"].(map[string]any)["authorized"].(float64) != 1 {
		t.Fatalf("authorizations = %v", sum["authorizations"])
	}
	recent := sum["recent_alerts"].([]any)
	if len(recent) != 2 {
		t.Fatalf("recent = %d, want 2", len(recent))
	}
	if sum["generated_at"].(string) == "" {
		t.Fatal("generated_at empty")
	}

	// 10. 过期授权核验：过去窗口 → APPROVE → inspect 5004（惰性 EXPIRED）
	must0("authorize/apply expired-window", call(t, srv, "/api/authorize/apply", map[string]any{
		"authorization_id": "AUTH-2026-002", "regulator_id": "REG-02",
		"scope":       []string{"MISSION"},
		"target_type": "MISSION", "target_id": "MISSION-2026-001",
		"reason":     "过期窗口联测",
		"valid_from": timex.FormatTime(timex.Now().Add(-48 * time.Hour)),
		"valid_to":   timex.FormatTime(timex.Now().Add(-24 * time.Hour)),
	}))
	must0("authorize/review expired-window", call(t, srv, "/api/authorize/review", map[string]any{
		"authorization_id": "AUTH-2026-002", "decision": "APPROVE", "reviewer_id": "REG-ADMIN",
	}))
	exp4 := wantCode("inspect expired", 5004, call(t, srv, "/api/inspect/ciphertext", map[string]any{
		"mission_id": "MISSION-2026-001", "authorization_id": "AUTH-2026-002", "regulator_id": "REG-02",
	}))
	if exp4["authorized"] != false || exp4["sealed"] == nil {
		t.Fatalf("expired data = %v", exp4)
	}
	if _, leaked := exp4["decrypted_view"]; leaked {
		t.Fatalf("plaintext leaked on expired: %v", exp4)
	}

	// 11. 断链追踪：未知伪名 → 5001 + break_level 1 + 断点留痕（禁止拼造）
	brk := wantCode("trace unknown", 5001, call(t, srv, "/api/trace/identity", map[string]any{
		"pseudo": "PSEUDO-UNKNOWN-999", "operator": "REG-01",
	}))
	if brk["resolved"] != false || brk["break_level"].(float64) != 1 {
		t.Fatalf("broken = %v", brk)
	}
	bl := brk["levels"].([]any)
	if l1 := bl[0].(map[string]any); l1["status"] != "BROKEN" || l1["reason"] == "" {
		t.Fatalf("L1 = %v", l1)
	}
	if l2 := bl[1].(map[string]any); l2["status"] != "BROKEN" {
		t.Fatalf("L2 must stay broken (no fabrication): %v", l2)
	}
	baud := must0("audit/query broken", call(t, srv, "/api/audit/query", map[string]any{"action": "TRACE_IDENTITY_BROKEN"}))
	if baud["total"].(float64) < 1 {
		t.Fatalf("broken trace audit = %v", baud)
	}

	// 12. 告警收尾：REVIEWED → RESOLVED
	st2 := must0("alert/status RESOLVED", call(t, srv, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "RESOLVED", "operator": "REG-01", "reason": "处置完成",
	}))
	if st2["status"] != "RESOLVED" {
		t.Fatalf("st2 = %v", st2)
	}
}
