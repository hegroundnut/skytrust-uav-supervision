package tests

import (
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"skytrust-backend/internal/api"
	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter"
	adpchainmaker "skytrust-backend/internal/chainadapter/chainmaker"
	adpfabric "skytrust-backend/internal/chainadapter/fabric"
	adpfisco "skytrust-backend/internal/chainadapter/fisco"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/demo"
	"skytrust-backend/internal/experiment"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/offchain"
	"skytrust-backend/internal/regulatory"
	"skytrust-backend/internal/timex"
	"skytrust-backend/internal/uavbusiness"
)

// seqID 重构自动生成序列 ID（C17：年份一律显式取自 timex.Now().Year()，年份随
// 当前年滚动——断言不再写死 2026）。tests 包 e2e 共用。
func seqID(prefix string, n int) string {
	return fmt.Sprintf("%s-%d-%03d", prefix, timex.Now().Year(), n)
}

// bootServerS1 系统一 E2E 引导：:memory: DB（避免 Windows 文件锁）+ 三模拟链
// （零延迟，保障亚秒断言）+ 网关 + 业务服务全接线。
func bootServerS1(t *testing.T) *httptest.Server {
	t.Helper()
	gin.SetMode(gin.TestMode)
	db, err := model.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	if err := model.Migrate(db); err != nil {
		t.Fatal(err)
	}
	cs, err := crypto.NewService(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	chains := map[string]*sim.Chain{
		"fabric": sim.New("fabric"), "chainmaker": sim.New("chainmaker"), "fisco-bcos": sim.New("fisco-bcos"),
	}
	adapters := map[string]chainadapter.ChainAdapter{
		"fabric":     adpfabric.New(chains["fabric"]),
		"chainmaker": adpchainmaker.New(chains["chainmaker"]),
		"fisco-bcos": adpfisco.New(chains["fisco-bcos"]),
	}
	resets := make(map[string]chainadapter.Resettable, len(chains))
	for name, c := range chains {
		resets[name] = c
	}
	status := make(map[string]api.ChainStatusProvider, len(adapters))
	for name, ad := range adapters {
		status[name] = ad
	}
	auditSvc := audit.New(db)
	gw := crosschain.NewGateway(db, cs, adapters, auditSvc)
	biz := uavbusiness.New(db, cs, gw, auditSvc)
	off := offchain.New(db, cs, auditSvc)
	reg := regulatory.New(db, cs, gw, auditSvc)
	seeder := demo.NewSeeder(db, cs, resets)
	exp := experiment.New(db, cs, gw, biz, off, reg, auditSvc, seeder)
	r, err := api.NewRouter(&api.Deps{
		DB: db, Crypto: cs, Chains: status,
		Seeder: seeder, Audit: auditSvc,
		Gateway: gw, Business: biz, Offchain: off, Regulatory: reg, Experiment: exp,
	})
	if err != nil {
		t.Fatal(err)
	}
	return httptest.NewServer(r)
}

func TestSystem1E2E(t *testing.T) {
	srv := bootServerS1(t)
	defer srv.Close()
	must0 := func(step string, resp map[string]any) map[string]any {
		t.Helper()
		if resp["code"].(float64) != 0 {
			t.Fatalf("%s: want code 0, got %v", step, resp)
		}
		return resp["data"].(map[string]any)
	}

	// 0. 演示数据就绪
	must0("demo/init", call(t, srv, "/api/demo/init", map[string]any{}))

	// 1. TC2-01 无人机注册跨链闭环：VERIFIED + 四段 TxID（fabric→chainmaker）
	reg := must0("uav/register", call(t, srv, "/api/uav/register", map[string]any{
		"manufacturer_id": "Manufacturer-A", "operator_id": "Operator-A",
		"serial_no": "SN-E2E-001", "model": "DJI-M350",
	}))
	if reg["uav"].(map[string]any)["status"] != "VERIFIED" {
		t.Fatalf("uav = %v", reg["uav"])
	}
	uavID := reg["uav"].(map[string]any)["uav_id"].(string)
	regTx := reg["crosschain"].(map[string]any)
	if regTx["status"] != "SUCCESS" || regTx["message_type"] != "UAV_REGISTER_PROOF" {
		t.Fatalf("reg tx = %v", regTx)
	}
	for _, k := range []string{"source_chain_tx_id", "reg_receive_tx_id", "reg_relay_tx_id", "target_chain_tx_id"} {
		if s, _ := regTx[k].(string); s == "" {
			t.Fatalf("reg tx %s empty: %v", k, regTx)
		}
	}
	if !strings.HasPrefix(regTx["source_chain_tx_id"].(string), "FABRIC-") ||
		!strings.HasPrefix(regTx["reg_receive_tx_id"].(string), "CHAINMAKER-") ||
		!strings.HasPrefix(regTx["target_chain_tx_id"].(string), "CHAINMAKER-") {
		t.Fatalf("UAV_REGISTER_PROOF must land on chainmaker: %v", regTx)
	}

	// 2. 任务创建：固定演示 ID + 密文不出库 + 脱敏展示
	mc := must0("mission/create", call(t, srv, "/api/mission/create", map[string]any{
		"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R101", "R205", "R306"},
		"altitude_min":   60, "altitude_max": 120, "payload_type": "CAMERA",
		"description": "巡线走廊Zone-A全线巡检",
	}))
	if mc["mission_id"] != seqID("MISSION", 1) || mc["status"] != "DRAFT" {
		t.Fatalf("mission = %v", mc)
	}
	if mc["masked_value"] != "巡线走廊****" {
		t.Fatalf("masked = %v", mc["masked_value"])
	}
	if _, leaked := mc["mission_ciphertext"]; leaked {
		t.Fatal("ciphertext leaked in response")
	}

	// 3. 任务提交：源链交易 + MISSION_APPLICATION（fabric→fisco-bcos）→ RELAYED；
	//    TC2-06 亚秒断言：模拟链本地闭环 latency_ms < 1000
	sub := must0("mission/submit", call(t, srv, "/api/mission/submit", map[string]any{
		"mission_id": seqID("MISSION", 1), "operator": "Operator-A",
	}))
	if sub["application"].(map[string]any)["status"] != "RELAYED" {
		t.Fatalf("application = %v", sub["application"])
	}
	subTx := sub["crosschain"].(map[string]any)
	if subTx["status"] != "SUCCESS" ||
		!strings.HasPrefix(subTx["target_chain_tx_id"].(string), "FISCO-BCOS-") {
		t.Fatalf("submit tx = %v", subTx)
	}
	if subTx["latency_ms"].(float64) >= 1000 {
		t.Fatalf("crosschain latency = %v ms, want < 1000", subTx["latency_ms"])
	}
	appID := sub["application"].(map[string]any)["application_id"].(string)

	// 4. 审核裁决 APPROVED（REVIEW_RESULT fisco-bcos→fabric）
	rev := must0("review/submit", call(t, srv, "/api/review/submit", map[string]any{
		"application_id": appID, "result": "APPROVED", "reviewer": "FISCO-ADMIN",
		"comment": "同意执行", "rules_hit": []string{"R-ALT-001"},
	}))
	if rev["mission"].(map[string]any)["status"] != "APPROVED" {
		t.Fatalf("mission after review = %v", rev["mission"])
	}

	// 5. TC2-05 许可签发 + 验证：PASS-<当前年>-001（now±1h 窗口保证立即有效）
	vf := timex.FormatTime(timex.Now().Add(-time.Hour))
	vt := timex.FormatTime(timex.Now().Add(time.Hour))
	iss := must0("pass/issue", call(t, srv, "/api/pass/issue", map[string]any{
		"mission_id": seqID("MISSION", 1), "issuer": "FISCO-ADMIN",
		"valid_from": vf, "valid_to": vt,
	}))
	if iss["pass"].(map[string]any)["pass_id"] != seqID("PASS", 1) ||
		iss["pass"].(map[string]any)["status"] != "VALID" {
		t.Fatalf("pass = %v", iss["pass"])
	}
	ver := must0("pass/verify", call(t, srv, "/api/pass/verify", map[string]any{"pass_id": seqID("PASS", 1)}))
	if ver["valid"] != true {
		t.Fatalf("verify = %v", ver)
	}

	// 6. TC2-04 冲突检测与协调：MISSION-B-002（演示模板）与已获批任务三维重叠。
	//    已获批方只标记不迁移（APPROVED 保持），主动方 SUBMITTED→COORDINATING。
	must0("mission/create B", call(t, srv, "/api/mission/create", map[string]any{
		"mission_id":  "MISSION-B-002",
		"operator_id": "Operator-B", "uav_id": "UAV-B-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 10:00:00", "end_time": "2026-09-12 12:00:00",
		"route_segments": []string{"R205"}, "altitude_min": 80, "altitude_max": 120,
		"payload_type": "CAMERA",
	}))
	must0("mission/submit B", call(t, srv, "/api/mission/submit", map[string]any{
		"mission_id": "MISSION-B-002", "operator": "Operator-B",
	}))
	det := must0("conflict/detect", call(t, srv, "/api/conflict/detect", map[string]any{"mission_id": "MISSION-B-002"}))
	if det["count"].(float64) != 1 {
		t.Fatalf("detect = %v", det)
	}
	cfl := det["conflicts"].([]any)[0].(map[string]any)
	if cfl["conflict_type"] != "ROUTE" || cfl["status"] != "OPEN" {
		t.Fatalf("conflict = %v", cfl)
	}
	qb := must0("mission/query B", call(t, srv, "/api/mission/query", map[string]any{"mission_id": "MISSION-B-002"}))
	if qb["status"] != "COORDINATING" {
		t.Fatalf("B status = %v", qb["status"])
	}
	qa := must0("mission/query A", call(t, srv, "/api/mission/query", map[string]any{"mission_id": seqID("MISSION", 1)}))
	if qa["status"] != "APPROVED" {
		t.Fatalf("approved mission must not be transitioned: %v", qa["status"])
	}
	res := must0("conflict/resolve", call(t, srv, "/api/conflict/resolve", map[string]any{
		"conflict_id": cfl["conflict_id"], "resolution": "时间窗后移30分钟", "operator": "Operator-B",
	}))
	if res["status"] != "RESOLVED" {
		t.Fatalf("resolve = %v", res)
	}
	qb2 := must0("mission/query B2", call(t, srv, "/api/mission/query", map[string]any{"mission_id": "MISSION-B-002"}))
	if qb2["status"] != "REVIEWING" {
		t.Fatalf("B after resolve = %v", qb2["status"])
	}

	// 7. TC2-03 幂等：同 (msg_type, business_id, source_tx_id) 重复提交 → 2004 + 原记录
	sendBody := map[string]any{
		"message_type": "UAV_REGISTER_PROOF", "business_id": "UAV-A-001",
		"source_chain": "fabric", "final_target_chain": "chainmaker",
		"payload": map[string]any{
			"uav_id": "UAV-A-001", "manufacturer_id": "Manufacturer-B",
			"operator_id": "Operator-A", "serial_no": "SN-A001",
			"sm9_identity": "SM9-ID-UAV-A-001",
		},
		"sm9_identity": "SM9-ID-UAV-A-001",
	}
	send1 := must0("crosschain/send", call(t, srv, "/api/crosschain/send", sendBody))
	if send1["status"] != "SUCCESS" {
		t.Fatalf("send1 = %v", send1)
	}
	dup := call(t, srv, "/api/crosschain/send", sendBody)
	if dup["code"].(float64) != 2004 {
		t.Fatalf("duplicate: want 2004, got %v", dup)
	}
	if dup["data"].(map[string]any)["cross_tx_id"] != send1["cross_tx_id"] {
		t.Fatalf("duplicate must return existing record: %v", dup["data"])
	}

	// 8. TC2-02 失败留痕：伪造签名 → 1002 + FAILED + FAIL_SM9，且可查询
	bad := call(t, srv, "/api/crosschain/send", map[string]any{
		"message_type": "MISSION_REVIEW_RESULT", "business_id": "REV-E2E-BAD",
		"source_chain": "fisco-bcos", "final_target_chain": "fabric",
		"payload": map[string]any{
			"review_id": "REV-E2E-BAD", "application_id": appID,
			"mission_id": seqID("MISSION", 1), "result": "APPROVED", "reviewer": "FISCO-ADMIN",
		},
		"sm9_identity": "SM9-ID-FISCO-ADMIN", "signature": "QUFBQUFBQUFBQQ==",
	})
	if bad["code"].(float64) != 1002 {
		t.Fatalf("bad signature: want 1002, got %v", bad)
	}
	badTx := bad["data"].(map[string]any)
	if badTx["status"] != "FAILED" || badTx["verify_result"] != "FAIL_SM9" ||
		badTx["error_code"].(float64) != 1002 {
		t.Fatalf("bad tx = %v", badTx)
	}
	qt := must0("crosschain/query", call(t, srv, "/api/crosschain/query", map[string]any{"cross_tx_id": badTx["cross_tx_id"]}))
	if qt["status"] != "FAILED" {
		t.Fatalf("queried failed tx = %v", qt)
	}
	lst := must0("crosschain/list", call(t, srv, "/api/crosschain/list", map[string]any{}))
	if lst["total"].(float64) < 6 {
		t.Fatalf("crosschain total = %v, want >= 6", lst["total"])
	}

	// 9. 吊销闭环：许可吊销（PASS_REVOKE 跨链）→ 验证无效；UAV 注销
	rvk := must0("pass/revoke", call(t, srv, "/api/pass/revoke", map[string]any{
		"pass_id": seqID("PASS", 1), "reason": "任务结束", "operator": "FISCO-ADMIN",
	}))
	if rvk["pass"].(map[string]any)["status"] != "REVOKED" || rvk["crosschain_status"] != "SUCCESS" {
		t.Fatalf("pass revoke = %v", rvk)
	}
	ver2 := must0("pass/verify revoked", call(t, srv, "/api/pass/verify", map[string]any{"pass_id": seqID("PASS", 1)}))
	if ver2["valid"] != false || ver2["status"] != "REVOKED" {
		t.Fatalf("verify revoked = %v", ver2)
	}
	ruav := must0("uav/revoke", call(t, srv, "/api/uav/revoke", map[string]any{
		"uav_id": uavID, "reason": "退役", "operator": "Operator-A",
	}))
	if ruav["status"] != "REVOKED" {
		t.Fatalf("uav revoke = %v", ruav)
	}

	// 10. TC2-07 审计全程可查：许可痕迹 + 网关痕迹
	aq := must0("audit/query pass", call(t, srv, "/api/audit/query", map[string]any{
		"business_id": seqID("PASS", 1), "page": 1, "page_size": 50,
	}))
	if aq["total"].(float64) < 3 {
		t.Fatalf("pass audit total = %v, want >= 3", aq["total"])
	}
	aq2 := must0("audit/query gateway", call(t, srv, "/api/audit/query", map[string]any{
		"actor": "GATEWAY", "page": 1, "page_size": 100,
	}))
	if aq2["total"].(float64) < 6 {
		t.Fatalf("gateway audit total = %v, want >= 6", aq2["total"])
	}
}
