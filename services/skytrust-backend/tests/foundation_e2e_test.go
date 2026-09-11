package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"skytrust-backend/internal/api"
	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/demo"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/offchain"
	"skytrust-backend/internal/uavbusiness"
)

func bootServer(t *testing.T) *httptest.Server {
	t.Helper()
	gin.SetMode(gin.TestMode)
	dbPath := filepath.Join(t.TempDir(), "e2e.db")
	db, err := model.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	// Windows: t.TempDir() 的 RemoveAll 无法删除仍被 SQLite 连接池占用的 e2e.db。
	// 注册 t.Cleanup 关闭底层 *sql.DB；其 LIFO 顺序保证在 dbPath 对应 TempDir 清理之前执行。
	t.Cleanup(func() {
		if sqlDB, derr := db.DB(); derr == nil {
			sqlDB.Close()
		}
	})
	if err := model.Migrate(db); err != nil {
		t.Fatal(err)
	}
	cs, _ := crypto.NewService(t.TempDir())
	chains := map[string]*sim.Chain{
		"fabric": sim.New("fabric"), "chainmaker": sim.New("chainmaker"), "fisco-bcos": sim.New("fisco-bcos"),
	}
	adapters := make(map[string]chainadapter.ChainAdapter, len(chains))
	for name, s := range chains {
		adapters[name] = s
	}
	auditSvc := audit.New(db)
	gw := crosschain.NewGateway(db, cs, adapters, auditSvc)
	biz := uavbusiness.New(db, cs, gw, auditSvc)
	off := offchain.New(db, cs, auditSvc)
	r, err := api.NewRouter(&api.Deps{
		DB: db, Crypto: cs, SimChains: chains,
		Seeder: demo.NewSeeder(db, cs, chains), Audit: auditSvc,
		Gateway: gw, Business: biz, Offchain: off,
	})
	if err != nil {
		t.Fatal(err)
	}
	return httptest.NewServer(r)
}

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

func TestFoundationE2E(t *testing.T) {
	srv := bootServer(t)
	defer srv.Close()

	// 1. 三链在线（TC1-01 基础形态）
	st := call(t, srv, "/api/chain/status", map[string]any{})
	if st["code"].(float64) != 0 {
		t.Fatalf("chain status: %v", st)
	}
	// 2. demo init
	in := call(t, srv, "/api/demo/init", map[string]any{})
	if in["code"].(float64) != 0 {
		t.Fatalf("demo init: %v", in)
	}
	// 3. SM3 摘要 + SM9 签名/验签闭环（TC1-03/TC1-04 密码学底座）
	payload := map[string]any{"mission_id": "MISSION-2026-001", "route": []string{"R101", "R205", "R306"}}
	sg := call(t, srv, "/api/crypto/sm9/sign", map[string]any{"sm9_identity": "SM9-ID-UAV-A-001", "payload": payload})
	if sg["code"].(float64) != 0 {
		t.Fatalf("sign: %v", sg)
	}
	sig := sg["data"].(map[string]any)["signature"].(string)
	vf := call(t, srv, "/api/crypto/sm9/verify", map[string]any{"sm9_identity": "SM9-ID-UAV-A-001", "payload": payload, "signature": sig})
	if vf["data"].(map[string]any)["valid"] != true {
		t.Fatalf("verify: %v", vf)
	}
	// 篡改后必须 false
	bad := call(t, srv, "/api/crypto/sm9/verify", map[string]any{"sm9_identity": "SM9-ID-UAV-A-001",
		"payload": map[string]any{"mission_id": "MISSION-2026-001", "route": []string{"R101", "R209", "R306"}}, "signature": sig})
	if bad["data"].(map[string]any)["valid"] != false {
		t.Fatal("tampered payload verified!")
	}
	// 4. 健康检查
	hc := call(t, srv, "/api/health/check", map[string]any{})
	if hc["code"].(float64) != 0 {
		t.Fatalf("health: %v", hc)
	}
	// 5. 审计可查
	aq := call(t, srv, "/api/audit/query", map[string]any{"page": 1, "page_size": 50})
	if aq["data"].(map[string]any)["total"].(float64) < 1 {
		t.Fatal("no audit records")
	}
	// 6. 重置后可重复演示
	rs := call(t, srv, "/api/demo/reset", map[string]any{})
	if rs["code"].(float64) != 0 {
		t.Fatalf("reset: %v", rs)
	}
	in2 := call(t, srv, "/api/demo/init", map[string]any{})
	if in2["code"].(float64) != 0 {
		t.Fatalf("re-init: %v", in2)
	}
}
