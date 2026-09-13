package acceptance

import (
	"net/http/httptest"
	"strings"
	"testing"
)

// goldenThread 黄金线前置（载荷与 tests/system3_e2e_test.go 逐字段一致）：
// 业务主线 → PASS-<当前年>-001（C17：年份随当前年滚动）→ 显式告警 ALERT-2026-001。
// 身份映射由 demo/init 预置：PSEUDO-UAV-83921 → PASS-2026-001 → UAV-A-001 → Manufacturer-B。
// L3 追踪要求映射的 pass_id 有真实 flight_passes 行 → issuePassA 必不可少。
func goldenThread(t *testing.T, srv *httptest.Server) map[string]any {
	t.Helper()
	mainlineA(t, srv)
	issuePassA(t, srv)
	return must0(t, "alert/raise", call(t, srv, "/api/alert/raise", map[string]any{
		"alert_id": "ALERT-2026-001", "mission_id": seqID("MISSION", 1),
		"uav_pseudonym": "PSEUDO-UAV-83921", "event_type": "ROUTE_DEVIATION",
		"risk_level": "HIGH", "source_system": "MANUAL", "operator": "REG-01",
	}))
}

// authorizeA 授权闭环：AUTH-2026-001 申请（MISSION/ROUTE/PAYLOAD/IDENTITY）→ APPROVE 上链。
func authorizeA(t *testing.T, srv *httptest.Server) {
	t.Helper()
	ap := must0(t, "authorize/apply", call(t, srv, "/api/authorize/apply", map[string]any{
		"authorization_id": "AUTH-2026-001", "regulator_id": "REG-01",
		"scope":       []string{"MISSION", "ROUTE", "PAYLOAD", "IDENTITY"},
		"target_type": "MISSION", "target_id": seqID("MISSION", 1),
		"reason": "核查告警 ALERT-2026-001",
	}))
	if ap["status"] != "PENDING" || len(ap["audit_hash"].(string)) != 64 {
		t.Fatalf("apply = %v", ap)
	}
	rv := must0(t, "authorize/review", call(t, srv, "/api/authorize/review", map[string]any{
		"authorization_id": "AUTH-2026-001", "decision": "APPROVE",
		"reviewer_id": "REG-ADMIN", "comment": "同意",
	}))
	if rv["auth"].(map[string]any)["status"] != "AUTHORIZED" ||
		!strings.HasPrefix(rv["chain_tx_id"].(string), "CHAINMAKER-") {
		t.Fatalf("review = %v", rv)
	}
}

// TestTC3_01AnonymousAlert TC3-01 匿名告警：导入 ALERT-2026-001 →
// 只显示 PSEUDO-UAV，不显示真实主体（响应与列表均不得含 uav_id/operator_id/manufacturer_id）。
func TestTC3_01AnonymousAlert(t *testing.T) {
	srv := bootTC(t)
	raised := goldenThread(t, srv)
	if raised["alert_id"] != "ALERT-2026-001" || raised["status"] != "OPEN" ||
		raised["uav_pseudonym"] != "PSEUDO-UAV-83921" || len(raised["evidence_hash"].(string)) != 64 {
		t.Fatalf("raised = %v", raised)
	}
	for _, k := range []string{"uav_id", "operator_id", "manufacturer_id"} {
		if _, leaked := raised[k]; leaked {
			t.Fatalf("real subject leaked (%s): %v", k, raised)
		}
	}
	lst := must0(t, "alert/list", call(t, srv, "/api/alert/list", map[string]any{}))
	found := false
	for _, rec := range lst["records"].([]any) {
		a := rec.(map[string]any)
		if a["alert_id"] != "ALERT-2026-001" {
			continue
		}
		found = true
		if a["uav_pseudonym"] != "PSEUDO-UAV-83921" {
			t.Fatalf("list record = %v", a)
		}
		for _, k := range []string{"uav_id", "operator_id", "manufacturer_id"} {
			if _, leaked := a[k]; leaked {
				t.Fatalf("real subject leaked in list (%s): %v", k, a)
			}
		}
	}
	if !found {
		t.Fatalf("ALERT-2026-001 not in list: %v", lst)
	}
}

// TestTC3_02SubSecondTrace TC3-02 秒级追踪：告警入口 7 级追踪 →
// 返回 UAV/运营商/厂商（L5/L6/L7 RESOLVED）+ 实测亚秒耗时。
func TestTC3_02SubSecondTrace(t *testing.T) {
	srv := bootTC(t)
	goldenThread(t, srv)
	tr := must0(t, "trace/identity", call(t, srv, "/api/trace/identity", map[string]any{
		"alert_id": "ALERT-2026-001", "operator": "REG-01",
	}))
	if tr["resolved"] != true || tr["break_level"].(float64) != 0 || tr["entry_type"] != "ALERT_ID" {
		t.Fatalf("trace = %v", tr)
	}
	levels := tr["levels"].([]any)
	if len(levels) != 7 {
		t.Fatalf("levels = %d, want 7", len(levels))
	}
	if l5 := levels[4].(map[string]any); l5["value"] != "UAV-A-001" || l5["status"] != "RESOLVED" {
		t.Fatalf("L5 = %v", l5)
	}
	if l6 := levels[5].(map[string]any); l6["value"] != "Operator-A" || l6["status"] != "RESOLVED" {
		t.Fatalf("L6 = %v", l6)
	}
	if l7 := levels[6].(map[string]any); l7["value"] != "Manufacturer-B" || l7["status"] != "RESOLVED" {
		t.Fatalf("L7 = %v", l7)
	}
	if tr["trace_latency_ms"].(float64) >= 1000 {
		t.Fatalf("trace latency = %v ms, want < 1000", tr["trace_latency_ms"])
	}
}

// TestTC3_03BrokenChainTrace TC3-03 缺失链路：映射缺失 → 5001 + 中断位置（L1 BROKEN
// 带原因）+ 后续级别保持 BROKEN（禁止拼造）+ 断点留痕审计。
func TestTC3_03BrokenChainTrace(t *testing.T) {
	srv := bootTC(t)
	brk := wantCode(t, "trace unknown", 5001, call(t, srv, "/api/trace/identity", map[string]any{
		"pseudo": "PSEUDO-UNKNOWN-999", "operator": "REG-01",
	}))
	if brk["resolved"] != false || brk["break_level"].(float64) != 1 {
		t.Fatalf("broken = %v", brk)
	}
	l1 := brk["levels"].([]any)[0].(map[string]any)
	if l1["status"] != "BROKEN" || l1["reason"] == "" {
		t.Fatalf("L1 = %v", l1)
	}
	l2 := brk["levels"].([]any)[1].(map[string]any)
	if l2["status"] != "BROKEN" {
		t.Fatalf("L2 must stay broken (no fabrication): %v", l2)
	}
	baud := must0(t, "audit/query", call(t, srv, "/api/audit/query", map[string]any{"action": "TRACE_IDENTITY_BROKEN"}))
	if baud["total"].(float64) < 1 {
		t.Fatalf("broken trace audit = %v", baud)
	}
}

// TestTC3_04UnauthorizedInspect TC3-04 未授权核验：直接访问任务明文 → 5002 拒绝
// （无明文键）+ 封缄视图 + 未授权尝试留痕审计。
func TestTC3_04UnauthorizedInspect(t *testing.T) {
	srv := bootTC(t)
	goldenThread(t, srv)
	un := wantCode(t, "inspect unauthorized", 5002, call(t, srv, "/api/inspect/ciphertext", map[string]any{
		"mission_id": seqID("MISSION", 1), "regulator_id": "REG-01",
	}))
	if un["authorized"] != false {
		t.Fatalf("un = %v", un)
	}
	if _, leaked := un["decrypted_view"]; leaked {
		t.Fatalf("plaintext leaked: %v", un)
	}
	sld := un["sealed"].(map[string]any)
	if sld["ciphertext_status"] != "SEALED" || sld["masked_value"] != "巡线走廊****" ||
		sld["has_ciphertext"] != true || len(sld["sm3_hash"].(string)) != 64 {
		t.Fatalf("sealed = %v", sld)
	}
	aud := must0(t, "audit/query", call(t, srv, "/api/audit/query", map[string]any{"action": "INSPECT_UNAUTHORIZED"}))
	if aud["total"].(float64) < 1 {
		t.Fatalf("unauthorized attempt must leave audit: %v", aud)
	}
}

// TestTC3_05AuthorizedInspect TC3-05 授权核验：REG-01 获得 MISSION/ROUTE（及
// PAYLOAD/IDENTITY）权限 → 明文视图 + scope 回显授权范围 + 双 verdict OK。
func TestTC3_05AuthorizedInspect(t *testing.T) {
	srv := bootTC(t)
	goldenThread(t, srv)
	authorizeA(t, srv)
	ins := must0(t, "inspect authorized", call(t, srv, "/api/inspect/ciphertext", map[string]any{
		"mission_id": seqID("MISSION", 1), "authorization_id": "AUTH-2026-001",
		"regulator_id": "REG-01", "trajectory": "NORMAL", "payload_type": "CAMERA",
	}))
	if ins["authorized"] != true || ins["decrypted_view"] != "巡线走廊Zone-A全线巡检" {
		t.Fatalf("inspect = %v", ins)
	}
	scope := ins["scope"].([]any)
	if len(scope) != 4 {
		t.Fatalf("scope = %v, want 4 (MISSION/ROUTE/PAYLOAD/IDENTITY)", scope)
	}
	conc := ins["conclusion"].(map[string]any)
	if conc["route_verdict"] != "ROUTE_OK" || conc["payload_verdict"] != "PAYLOAD_OK" ||
		len(conc["raised_alerts"].([]any)) != 0 {
		t.Fatalf("conclusion = %v", conc)
	}
}

// TestTC3_06RouteDeviation TC3-06 航迹异常：批准 R205 走廊、实际偏航 →
// ROUTE_DEVIATION 判定 + SYSTEM3 自动告警。
func TestTC3_06RouteDeviation(t *testing.T) {
	srv := bootTC(t)
	goldenThread(t, srv)
	authorizeA(t, srv)
	// P5-R15 前置：raiseAutoAlert 去重按 mission_id+event_type+status∈{OPEN,IDENTIFIED,TRACED}，
	// 无 source_system 过滤（P4-7 既有语义）——MANUAL ALERT-2026-001 未结案时偏航自动告警会被
	// 去重复用（raised_alerts 仍 1，但 SYSTEM3 total 为 0）。镜像 system3_e2e：先把 MANUAL 告警
	// 线性推进到 REVIEWED（三步；跨级 → 6002），偏航核验才会真正产出 SYSTEM3 自动告警。
	must0(t, "alert/status IDENTIFIED", call(t, srv, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "IDENTIFIED", "operator": "REG-01", "reason": "初判成立",
	}))
	must0(t, "alert/status TRACED", call(t, srv, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "TRACED", "operator": "REG-01", "reason": "追踪完成",
	}))
	must0(t, "alert/status REVIEWED", call(t, srv, "/api/alert/status", map[string]any{
		"alert_id": "ALERT-2026-001", "to_status": "REVIEWED", "operator": "REG-01", "reason": "核验完成",
	}))
	dev := must0(t, "inspect deviation", call(t, srv, "/api/inspect/ciphertext", map[string]any{
		"mission_id": seqID("MISSION", 1), "authorization_id": "AUTH-2026-001",
		"regulator_id": "REG-01", "trajectory": "DEVIATION",
	}))
	dc := dev["conclusion"].(map[string]any)
	if dc["route_verdict"] != "ROUTE_DEVIATION" {
		t.Fatalf("verdict = %v", dc)
	}
	if len(dc["raised_alerts"].([]any)) != 1 {
		t.Fatalf("auto alert = %v", dc["raised_alerts"])
	}
	sys3 := must0(t, "alert/list SYSTEM3", call(t, srv, "/api/alert/list", map[string]any{"source_system": "SYSTEM3"}))
	if sys3["total"].(float64) != 1 {
		t.Fatalf("SYSTEM3 alerts = %v", sys3)
	}
}

// TestTC3_07AuditOnChain TC3-07 审计上链：完成核验 → audit_hash + 监管链 TxID
// （CHAINMAKER- 前缀）+ 监管审计可查可导出。
func TestTC3_07AuditOnChain(t *testing.T) {
	srv := bootTC(t)
	goldenThread(t, srv)
	authorizeA(t, srv)
	ins := must0(t, "inspect authorized", call(t, srv, "/api/inspect/ciphertext", map[string]any{
		"mission_id": seqID("MISSION", 1), "authorization_id": "AUTH-2026-001",
		"regulator_id": "REG-01", "trajectory": "NORMAL", "payload_type": "CAMERA",
	}))
	ver := ins["verification"].(map[string]any)
	if ver["digest_match"] != true || ver["signature_valid"] != true ||
		len(ver["audit_hash"].(string)) != 64 {
		t.Fatalf("verification = %v", ver)
	}
	if !strings.HasPrefix(ins["chain_tx_id"].(string), "CHAINMAKER-") || ins["reg_audit_id"].(string) == "" {
		t.Fatalf("chain/audit = %v", ins)
	}
	ral := must0(t, "regulatory/audit/list INSPECT", call(t, srv, "/api/regulatory/audit/list", map[string]any{"action": "INSPECT"}))
	if ral["total"].(float64) != 1 {
		t.Fatalf("INSPECT audits = %v", ral)
	}
	ex := must0(t, "regulatory/audit/export", call(t, srv, "/api/regulatory/audit/export", map[string]any{}))
	if ex["format"] != "csv" || ex["rows"].(float64) < 1 || !strings.HasPrefix(ex["content"].(string), "audit_id,") {
		t.Fatalf("export = %v", ex)
	}
}

// TestTC3_08BatchTrace TC3-08 批量追踪：100 次预置追踪 → 实测平均/P95 耗时和
// 成功率（P5-R6 经 /api/experiment/* 驱动；黄金线由 TRACE_BATCH executor 的
// setup 条件式构建；P5-R12 不断言 avg>0）。
func TestTC3_08BatchTrace(t *testing.T) {
	srv := bootTC(t)
	out := must0(t, "experiment/run TRACE_BATCH", call(t, srv, "/api/experiment/run", map[string]any{
		"experiment_type": "TRACE_BATCH", "count": 100,
	}))
	if out["status"] != "DONE" || out["success_count"].(float64) != 100 ||
		out["success_rate"].(float64) != 1 || out["failed_count"].(float64) != 0 {
		t.Fatalf("run = %v", out)
	}
	if out["p95_latency_ms"].(float64) >= 1000 {
		t.Fatalf("p95 = %v ms, want < 1000", out["p95_latency_ms"])
	}
	res := must0(t, "experiment/result", call(t, srv, "/api/experiment/result", map[string]any{"run_id": out["run_id"]}))
	if res["experiment_type"] != "TRACE_BATCH" || res["count"].(float64) != 100 {
		t.Fatalf("result = %v", res)
	}
}
