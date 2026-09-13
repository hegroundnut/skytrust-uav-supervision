package acceptance

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

// bootTC 验收引导（P5-R6）：每个 TC 独立起全新 :memory: 服务（互不依赖、可乱序、
// 可单跑），全接线（含 Experiment）+ 演示数据预置。模拟链零延迟，保障亚秒断言。
func bootTC(t *testing.T) *httptest.Server {
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
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	if resp := call(t, srv, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	return srv
}

// call POST JSON 并返回整个信封（与 tests/foundation_e2e_test.go 助手同构）。
func call(t *testing.T, srv *httptest.Server, path string, body any) map[string]any {
	t.Helper()
	b, _ := json.Marshal(body)
	resp, err := http.Post(srv.URL+path, "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("%s -> HTTP %d", path, resp.StatusCode)
	}
	var m map[string]any
	json.NewDecoder(resp.Body).Decode(&m)
	return m
}

// must0 断言 code 0 → 返回 data。
func must0(t *testing.T, step string, resp map[string]any) map[string]any {
	t.Helper()
	if resp["code"].(float64) != 0 {
		t.Fatalf("%s: want code 0, got %v", step, resp)
	}
	return resp["data"].(map[string]any)
}

// wantCode 断言信封 code==want → 返回 data（FailData 时为记录，可能为 nil）。
func wantCode(t *testing.T, step string, want float64, resp map[string]any) map[string]any {
	t.Helper()
	if resp["code"].(float64) != want {
		t.Fatalf("%s: want code %v, got %v", step, want, resp)
	}
	d, _ := resp["data"].(map[string]any)
	return d
}

// mainlineA 业务主线（载荷与 tests/system1_e2e_test.go 逐字段一致）：
// create→submit→review APPROVED，返回 application_id。
// 全新库首个任务恒为 MISSION-2026-001。
func mainlineA(t *testing.T, srv *httptest.Server) string {
	t.Helper()
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
	appID := sub["application"].(map[string]any)["application_id"].(string)
	must0(t, "review/submit", call(t, srv, "/api/review/submit", map[string]any{
		"application_id": appID, "result": "APPROVED", "reviewer": "FISCO-ADMIN",
		"comment": "同意执行", "rules_hit": []string{"R-ALT-001"},
	}))
	return appID
}

// issuePassA 签发 PASS-2026-001（now±1h 窗口保证立即有效），返回 {pass,crosschain}。
func issuePassA(t *testing.T, srv *httptest.Server) map[string]any {
	t.Helper()
	iss := must0(t, "pass/issue", call(t, srv, "/api/pass/issue", map[string]any{
		"mission_id": "MISSION-2026-001", "issuer": "FISCO-ADMIN",
		"valid_from": timex.FormatTime(timex.Now().Add(-time.Hour)),
		"valid_to":   timex.FormatTime(timex.Now().Add(time.Hour)),
	}))
	if iss["pass"].(map[string]any)["pass_id"] != "PASS-2026-001" ||
		iss["pass"].(map[string]any)["status"] != "VALID" {
		t.Fatalf("pass = %v", iss["pass"])
	}
	return iss
}
