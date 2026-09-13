package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
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
	"skytrust-backend/internal/uavbusiness"
)

func doPost(r *gin.Engine, path string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader("{}"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	return w
}

func validTestDeps(t *testing.T) *Deps {
	t.Helper()
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
	status := make(map[string]ChainStatusProvider, len(adapters))
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
	return &Deps{DB: db, Crypto: cs, Chains: status, Seeder: seeder, Audit: auditSvc, Gateway: gw, Business: biz, Offchain: off, Regulatory: reg, Experiment: exp}
}

func TestHealthPing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	w := doPost(r, "/api/health/ping")
	var resp Resp
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 0 || !strings.HasPrefix(resp.TraceID, "TRACE-") {
		t.Errorf("bad ping resp: %+v", resp)
	}
}

func TestHealthCheckWithoutDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d := validTestDeps(t)
	r, err := NewRouter(d)
	if err != nil {
		t.Fatal(err)
	}
	// B1 之后 NewRouter 拒绝 nil-DB 接线（见 TestNewRouterRejectsInvalidDeps）；
	// 构造后移除 DB，保留 healthCheck 防御分支（ABSENT → 非零 code）的覆盖。
	d.DB = nil
	w := doPost(r, "/api/health/check")
	var resp Resp
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code == 0 {
		t.Error("expected non-zero code when DB absent")
	}
}

type fakeChain struct{ ok bool }

func (f fakeChain) Health() error {
	if f.ok {
		return nil
	}
	return NewBiz(ErrInternal, "chain down")
}

func TestChainStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d := validTestDeps(t)
	d.Chains = map[string]ChainStatusProvider{
		"fabric": fakeChain{ok: true}, "fisco-bcos": fakeChain{ok: false},
	}
	r, err := NewRouter(d)
	if err != nil {
		t.Fatal(err)
	}
	w := doPost(r, "/api/chain/status")
	var resp Resp
	json.Unmarshal(w.Body.Bytes(), &resp)
	data, _ := json.Marshal(resp.Data)
	var m map[string]any
	json.Unmarshal(data, &m)
	chains := m["chains"].(map[string]any)
	if chains["fabric"] != "ONLINE" || chains["fisco-bcos"] != "OFFLINE" {
		t.Errorf("bad chain status: %v", chains)
	}
}

func TestRecoveryMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	r.POST("/api/test/panic", func(c *gin.Context) { panic("boom") })
	w := doPost(r, "/api/test/panic")
	var resp Resp
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != ErrInternal {
		t.Errorf("panic should map to 9001, got %d", resp.Code)
	}
}

func TestNewRouterRejectsInvalidDeps(t *testing.T) {
	if _, err := NewRouter(nil); err == nil {
		t.Error("nil deps must be rejected")
	}
	if _, err := NewRouter(&Deps{}); err == nil {
		t.Error("empty deps must be rejected")
	}
	d := validTestDeps(t)
	d.Crypto = nil
	if _, err := NewRouter(d); err == nil {
		t.Error("missing Crypto must be rejected")
	}
	d = validTestDeps(t)
	d.Chains = nil
	if _, err := NewRouter(d); err == nil {
		t.Error("missing chains must be rejected")
	}
	d = validTestDeps(t)
	d.Gateway = nil
	if _, err := NewRouter(d); err == nil {
		t.Error("missing Gateway must be rejected")
	}
	d = validTestDeps(t)
	d.Business = nil
	if _, err := NewRouter(d); err == nil {
		t.Error("missing Business must be rejected")
	}
	if _, err := NewRouter(validTestDeps(t)); err != nil {
		t.Errorf("valid deps rejected: %v", err)
	}
}

func TestNewRouterRequiresOffchain(t *testing.T) {
	deps := validTestDeps(t)
	deps.Offchain = nil
	if _, err := NewRouter(deps); err == nil {
		t.Fatal("NewRouter must reject nil Offchain")
	}
}

func TestNewRouterRequiresRegulatory(t *testing.T) {
	deps := validTestDeps(t)
	deps.Regulatory = nil
	if _, err := NewRouter(deps); err == nil {
		t.Fatal("NewRouter must reject nil Regulatory")
	}
}

func TestNewRouterRequiresExperiment(t *testing.T) {
	deps := validTestDeps(t)
	deps.Experiment = nil
	if _, err := NewRouter(deps); err == nil {
		t.Fatal("NewRouter must reject nil Experiment")
	}
}
