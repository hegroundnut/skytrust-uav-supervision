package acceptance

import (
	"strings"
	"testing"
)

// TestTC1_01ThreeChainsOnline TC1-01 三链在线：chain/status code 0 + 三链全 ONLINE
// （P5-R6：模拟链判定；真实链判定属 Plan 6/WP-K）。
func TestTC1_01ThreeChainsOnline(t *testing.T) {
	srv := bootTC(t)
	st := must0(t, "chain/status", call(t, srv, "/api/chain/status", map[string]any{}))
	if st["count"].(float64) != 3 {
		t.Fatalf("count = %v, want 3", st["count"])
	}
	chains := st["chains"].(map[string]any)
	for _, name := range []string{"fabric", "chainmaker", "fisco-bcos"} {
		if chains[name] != "ONLINE" {
			t.Fatalf("%s = %v, want ONLINE", name, chains[name])
		}
	}
}

// TestTC1_02NormalApplication TC1-02 正常申请：运营链→长安链→管理链两跳成功，
// 管理链收到申请（RELAYED），三段 TxID 可查询。
func TestTC1_02NormalApplication(t *testing.T) {
	srv := bootTC(t)
	must0(t, "mission/create", call(t, srv, "/api/mission/create", map[string]any{
		"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R101", "R205", "R306"},
		"altitude_min":   60, "altitude_max": 120, "payload_type": "CAMERA",
		"description": "巡线走廊Zone-A全线巡检",
	}))
	sub := must0(t, "mission/submit", call(t, srv, "/api/mission/submit", map[string]any{
		"mission_id": "MISSION-2026-001", "operator": "Operator-A",
	}))
	if sub["application"].(map[string]any)["status"] != "RELAYED" {
		t.Fatalf("application = %v", sub["application"])
	}
	tx := sub["crosschain"].(map[string]any)
	if tx["status"] != "SUCCESS" || tx["message_type"] != "MISSION_APPLICATION" {
		t.Fatalf("tx = %v", tx)
	}
	if !strings.HasPrefix(tx["source_chain_tx_id"].(string), "FABRIC-") ||
		!strings.HasPrefix(tx["reg_receive_tx_id"].(string), "CHAINMAKER-") ||
		!strings.HasPrefix(tx["reg_relay_tx_id"].(string), "CHAINMAKER-") ||
		!strings.HasPrefix(tx["target_chain_tx_id"].(string), "FISCO-BCOS-") {
		t.Fatalf("三段 TxID = %v", tx)
	}
	qt := must0(t, "crosschain/query", call(t, srv, "/api/crosschain/query", map[string]any{"cross_tx_id": tx["cross_tx_id"]}))
	if qt["status"] != "SUCCESS" {
		t.Fatalf("queried = %v", qt)
	}
	if tx["latency_ms"].(float64) >= 1000 {
		t.Fatalf("latency = %v ms, want < 1000", tx["latency_ms"])
	}
}

// TestTC1_03SM3Tamper TC1-03 SM3 篡改验证：修改申请任一字段后摘要必变，
// 原签名对篡改载荷验签必败。
func TestTC1_03SM3Tamper(t *testing.T) {
	srv := bootTC(t)
	payload := map[string]any{"mission_id": "MISSION-2026-001", "operator_id": "Operator-A", "altitude_max": 120}
	sig := must0(t, "sm9/sign", call(t, srv, "/api/crypto/sm9/sign", map[string]any{
		"sm9_identity": "SM9-ID-UAV-A-001", "payload": payload,
	}))
	orig := must0(t, "sm3 original", call(t, srv, "/api/crypto/sm3", map[string]any{"payload": payload}))
	if orig["sm3_hash"] != sig["sm3_hash"] {
		t.Fatalf("hash mismatch: %v vs %v", orig["sm3_hash"], sig["sm3_hash"])
	}
	tampered := map[string]any{"mission_id": "MISSION-2026-001", "operator_id": "Operator-A", "altitude_max": 200}
	tm := must0(t, "sm3 tampered", call(t, srv, "/api/crypto/sm3", map[string]any{"payload": tampered}))
	if tm["sm3_hash"] == orig["sm3_hash"] {
		t.Fatalf("tampered hash must differ: %v", tm)
	}
	ver := must0(t, "sm9/verify tampered", call(t, srv, "/api/crypto/sm9/verify", map[string]any{
		"sm9_identity": "SM9-ID-UAV-A-001", "payload": tampered, "signature": sig["signature"],
	}))
	if ver["valid"] != false {
		t.Fatalf("tampered payload must fail verify: %v", ver)
	}
}

// TestTC1_04SM9VerifyFail TC1-04 SM9 签名验证：错误身份验签 false；
// 网关层伪造签名 → 1002 + FAILED 留痕可查询。
func TestTC1_04SM9VerifyFail(t *testing.T) {
	srv := bootTC(t)
	payload := map[string]any{"uav_id": "UAV-A-001", "serial_no": "SN-A001"}
	sig := must0(t, "sm9/sign", call(t, srv, "/api/crypto/sm9/sign", map[string]any{
		"sm9_identity": "SM9-ID-UAV-A-001", "payload": payload,
	}))
	wrong := must0(t, "sm9/verify wrong identity", call(t, srv, "/api/crypto/sm9/verify", map[string]any{
		"sm9_identity": "SM9-ID-UAV-B-001", "payload": payload, "signature": sig["signature"],
	}))
	if wrong["valid"] != false {
		t.Fatalf("wrong identity verify = %v", wrong)
	}
	bad := wantCode(t, "crosschain/send bad sig", 1002, call(t, srv, "/api/crosschain/send", map[string]any{
		"message_type": "MISSION_REVIEW_RESULT", "business_id": "TC1-04-BAD",
		"source_chain": "fisco-bcos", "final_target_chain": "fabric",
		"payload": map[string]any{
			"review_id": "TC1-04-BAD", "application_id": "APP-TC1-04-BAD", "mission_id": "MISSION-2026-001",
			"result": "APPROVED", "reviewer": "FISCO-ADMIN",
		},
		"sm9_identity": "SM9-ID-FISCO-ADMIN", "signature": "QUFBQUFBQUFBQQ==",
	}))
	if bad["status"] != "FAILED" || bad["verify_result"] != "FAIL_SM9" || bad["error_code"].(float64) != 1002 {
		t.Fatalf("bad tx = %v", bad)
	}
	qt := must0(t, "crosschain/query", call(t, srv, "/api/crosschain/query", map[string]any{"cross_tx_id": bad["cross_tx_id"]}))
	if qt["status"] != "FAILED" {
		t.Fatalf("queried failed tx = %v", qt)
	}
}

// TestTC1_05ConflictDetected TC1-05 多运营商冲突：A/B 重叠时段申请 R205 →
// 识别冲突（ROUTE/OPEN），主动方 B 进入 COORDINATING，已获批方 A 保持 APPROVED。
func TestTC1_05ConflictDetected(t *testing.T) {
	srv := bootTC(t)
	mainlineA(t, srv)
	must0(t, "mission/create B", call(t, srv, "/api/mission/create", map[string]any{
		"mission_id":  "MISSION-B-002",
		"operator_id": "Operator-B", "uav_id": "UAV-B-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 10:00:00", "end_time": "2026-09-12 12:00:00",
		"route_segments": []string{"R205"}, "altitude_min": 80, "altitude_max": 120,
		"payload_type": "CAMERA",
	}))
	must0(t, "mission/submit B", call(t, srv, "/api/mission/submit", map[string]any{
		"mission_id": "MISSION-B-002", "operator": "Operator-B",
	}))
	det := must0(t, "conflict/detect", call(t, srv, "/api/conflict/detect", map[string]any{"mission_id": "MISSION-B-002"}))
	if det["count"].(float64) != 1 {
		t.Fatalf("detect = %v", det)
	}
	cfl := det["conflicts"].([]any)[0].(map[string]any)
	if cfl["conflict_type"] != "ROUTE" || cfl["status"] != "OPEN" {
		t.Fatalf("conflict = %v", cfl)
	}
	qb := must0(t, "mission/query B", call(t, srv, "/api/mission/query", map[string]any{"mission_id": "MISSION-B-002"}))
	if qb["status"] != "COORDINATING" {
		t.Fatalf("B status = %v, want COORDINATING", qb["status"])
	}
	qa := must0(t, "mission/query A", call(t, srv, "/api/mission/query", map[string]any{"mission_id": "MISSION-2026-001"}))
	if qa["status"] != "APPROVED" {
		t.Fatalf("approved mission must not be transitioned: %v", qa["status"])
	}
}

// TestTC1_06CoordinatedApproval TC1-06 协调后许可：冲突消解后 B 复审通过，
// A/B 任务均处于 APPROVED。
func TestTC1_06CoordinatedApproval(t *testing.T) {
	srv := bootTC(t)
	mainlineA(t, srv)
	must0(t, "mission/create B", call(t, srv, "/api/mission/create", map[string]any{
		"mission_id":  "MISSION-B-002",
		"operator_id": "Operator-B", "uav_id": "UAV-B-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 10:00:00", "end_time": "2026-09-12 12:00:00",
		"route_segments": []string{"R205"}, "altitude_min": 80, "altitude_max": 120,
		"payload_type": "CAMERA",
	}))
	subB := must0(t, "mission/submit B", call(t, srv, "/api/mission/submit", map[string]any{
		"mission_id": "MISSION-B-002", "operator": "Operator-B",
	}))
	appIDB := subB["application"].(map[string]any)["application_id"].(string)
	det := must0(t, "conflict/detect", call(t, srv, "/api/conflict/detect", map[string]any{"mission_id": "MISSION-B-002"}))
	cfl := det["conflicts"].([]any)[0].(map[string]any)
	res := must0(t, "conflict/resolve", call(t, srv, "/api/conflict/resolve", map[string]any{
		"conflict_id": cfl["conflict_id"], "resolution": "时间窗后移30分钟", "operator": "Operator-B",
	}))
	if res["status"] != "RESOLVED" {
		t.Fatalf("resolve = %v", res)
	}
	must0(t, "review/submit B", call(t, srv, "/api/review/submit", map[string]any{
		"application_id": appIDB, "result": "APPROVED", "reviewer": "FISCO-ADMIN",
		"comment": "协调后放行", "rules_hit": []string{"R-ALT-001"},
	}))
	qa := must0(t, "mission/query A", call(t, srv, "/api/mission/query", map[string]any{"mission_id": "MISSION-2026-001"}))
	qb := must0(t, "mission/query B", call(t, srv, "/api/mission/query", map[string]any{"mission_id": "MISSION-B-002"}))
	if qa["status"] != "APPROVED" || qb["status"] != "APPROVED" {
		t.Fatalf("A = %v, B = %v, want both APPROVED", qa["status"], qb["status"])
	}
}

// TestTC1_07PassIssuance TC1-07 通行证签发：先写入长安链监管记录（reg_receive），
// 再由长安链回传运营链（reg_relay→target FABRIC）；签发后立即验证有效。
func TestTC1_07PassIssuance(t *testing.T) {
	srv := bootTC(t)
	mainlineA(t, srv)
	iss := issuePassA(t, srv)
	tx := iss["crosschain"].(map[string]any)
	if tx["status"] != "SUCCESS" || tx["message_type"] != "FLIGHT_PASS" {
		t.Fatalf("tx = %v", tx)
	}
	if !strings.HasPrefix(tx["source_chain_tx_id"].(string), "FISCO-BCOS-") ||
		!strings.HasPrefix(tx["reg_receive_tx_id"].(string), "CHAINMAKER-") ||
		!strings.HasPrefix(tx["reg_relay_tx_id"].(string), "CHAINMAKER-") ||
		!strings.HasPrefix(tx["target_chain_tx_id"].(string), "FABRIC-") {
		t.Fatalf("FLIGHT_PASS 管理→监管→运营 = %v", tx)
	}
	ver := must0(t, "pass/verify", call(t, srv, "/api/pass/verify", map[string]any{"pass_id": "PASS-2026-001"})) // 演示数据冻结裁定：issuePassA 显式冻结 ID
	if ver["valid"] != true {
		t.Fatalf("verify = %v", ver)
	}
}

// TestTC1_08BatchCrosschainLoop TC1-08 批量跨链：100 次完整闭环 →
// 实测成功率/时延分位/失败记录（P5-R6 经 /api/experiment/* 驱动；P5-R12 不断言 avg>0）。
func TestTC1_08BatchCrosschainLoop(t *testing.T) {
	srv := bootTC(t)
	out := must0(t, "experiment/run", call(t, srv, "/api/experiment/run", map[string]any{
		"experiment_type": "CROSSCHAIN_LOOP", "count": 100,
	}))
	if out["status"] != "DONE" || out["success_count"].(float64) != 100 ||
		out["success_rate"].(float64) != 1 || out["failed_count"].(float64) != 0 {
		t.Fatalf("run = %v", out)
	}
	if out["p95_latency_ms"].(float64) >= 1000 {
		t.Fatalf("p95 = %v ms, want < 1000", out["p95_latency_ms"])
	}
	if out["failure_reasons"] != "{}" {
		t.Fatalf("failure_reasons = %v, want empty map", out["failure_reasons"])
	}
	res := must0(t, "experiment/result", call(t, srv, "/api/experiment/result", map[string]any{"run_id": out["run_id"]}))
	if res["experiment_type"] != "CROSSCHAIN_LOOP" || res["count"].(float64) != 100 {
		t.Fatalf("result = %v", res)
	}
}
