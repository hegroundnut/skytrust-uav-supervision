package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/model"
)

func setupTestRouter(t *testing.T) *gin.Engine {
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
	return NewRouter(&Deps{DB: db, Crypto: cs})
}

func post(r *gin.Engine, path string, body any) Resp {
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	var resp Resp
	json.Unmarshal(w.Body.Bytes(), &resp)
	return resp
}

func dataMap(resp Resp) map[string]any {
	b, _ := json.Marshal(resp.Data)
	var m map[string]any
	json.Unmarshal(b, &m)
	return m
}

func TestCryptoSM3Endpoint(t *testing.T) {
	r := setupTestRouter(t)
	resp := post(r, "/api/crypto/sm3", map[string]any{
		"payload": map[string]any{"b": 1, "a": "x"},
	})
	if resp.Code != 0 {
		t.Fatalf("code=%d msg=%s", resp.Code, resp.Message)
	}
	d := dataMap(resp)
	if len(d["sm3_hash"].(string)) != 64 {
		t.Errorf("bad hash: %v", d["sm3_hash"])
	}
	if d["canonical"].(string) != `{"a":"x","b":1}` {
		t.Errorf("bad canonical: %v", d["canonical"])
	}
}

func TestCryptoSM3MissingPayload(t *testing.T) {
	r := setupTestRouter(t)
	resp := post(r, "/api/crypto/sm3", map[string]any{})
	if resp.Code != ErrParam {
		t.Errorf("code=%d want 6002", resp.Code)
	}
}

func TestCryptoSignVerifyFlow(t *testing.T) {
	r := setupTestRouter(t)
	kg := post(r, "/api/crypto/sm9/keygen", map[string]any{"entity_id": "UAV-A-001"})
	if kg.Code != 0 || dataMap(kg)["sm9_identity"] != "SM9-ID-UAV-A-001" {
		t.Fatalf("keygen resp: %+v", kg)
	}
	payload := map[string]any{"mission_id": "MISSION-2026-001", "route": []string{"R101", "R205"}}
	sg := post(r, "/api/crypto/sm9/sign", map[string]any{
		"sm9_identity": "SM9-ID-UAV-A-001", "payload": payload,
	})
	if sg.Code != 0 {
		t.Fatalf("sign code=%d", sg.Code)
	}
	sig := dataMap(sg)["signature"].(string)
	// 正确验签
	vf := post(r, "/api/crypto/sm9/verify", map[string]any{
		"sm9_identity": "SM9-ID-UAV-A-001", "payload": payload, "signature": sig,
	})
	if vf.Code != 0 || dataMap(vf)["valid"] != true {
		t.Errorf("valid signature rejected: %+v", vf)
	}
	// 篡改 payload → valid=false（TC1-03）
	vt := post(r, "/api/crypto/sm9/verify", map[string]any{
		"sm9_identity": "SM9-ID-UAV-A-001",
		"payload":      map[string]any{"mission_id": "MISSION-2026-001", "route": []string{"R101", "R209"}},
		"signature":    sig,
	})
	if vt.Code != 0 || dataMap(vt)["valid"] != false {
		t.Errorf("tampered payload must be invalid: %+v", vt)
	}
	// 错误身份 → valid=false（TC1-04）
	vw := post(r, "/api/crypto/sm9/verify", map[string]any{
		"sm9_identity": "SM9-ID-UAV-B-001", "payload": payload, "signature": sig,
	})
	if vw.Code != 0 || dataMap(vw)["valid"] != false {
		t.Errorf("wrong identity must be invalid: %+v", vw)
	}
	// 非法 base64 签名 → 1002
	vb := post(r, "/api/crypto/sm9/verify", map[string]any{
		"sm9_identity": "SM9-ID-UAV-A-001", "payload": payload, "signature": "!!!not-base64!!!",
	})
	if vb.Code != ErrSM9Verify {
		t.Errorf("bad signature code=%d want 1002", vb.Code)
	}
}
