package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func doPost(r *gin.Engine, path string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader("{}"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	return w
}

func TestHealthPing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := NewRouter(&Deps{})
	w := doPost(r, "/api/health/ping")
	var resp Resp
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != 0 || !strings.HasPrefix(resp.TraceID, "TRACE-") {
		t.Errorf("bad ping resp: %+v", resp)
	}
}

func TestHealthCheckWithoutDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := NewRouter(&Deps{})
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
	r := NewRouter(&Deps{Chains: map[string]ChainStatusProvider{
		"fabric": fakeChain{ok: true}, "fisco-bcos": fakeChain{ok: false},
	}})
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
	r := NewRouter(&Deps{})
	r.POST("/api/test/panic", func(c *gin.Context) { panic("boom") })
	w := doPost(r, "/api/test/panic")
	var resp Resp
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Code != ErrInternal {
		t.Errorf("panic should map to 9001, got %d", resp.Code)
	}
}
