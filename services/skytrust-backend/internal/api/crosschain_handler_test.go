package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func postJSON(t *testing.T, r *gin.Engine, path string, body any) map[string]any {
	t.Helper()
	b, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	var out map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode %s response: %v (body=%s)", path, err, w.Body.String())
	}
	return out
}

// validAppSend 合法 MISSION_APPLICATION 发送体（不带签名 → 平台代签路径）。
func validAppSend(businessID string) map[string]any {
	return map[string]any{
		"message_type":       "MISSION_APPLICATION",
		"business_id":        businessID,
		"source_chain":       "fabric",
		"final_target_chain": "fisco-bcos",
		"sm9_identity":       "SM9-ID-Operator-A",
		"payload": map[string]any{
			"mission_id":     "MISSION-2026-001",
			"application_id": businessID,
			"operator_id":    "Operator-A",
			"uav_id":         "UAV-A-001",
			"mission_type":   "POWER_INSPECTION",
			"start_time":     "2026-09-12 09:00:00",
			"end_time":       "2026-09-12 11:00:00",
			"route_segments": []any{"R101"},
			"sm3_hash":       "abc123def456",
		},
	}
}

func TestCrosschainSendAutoSignSuccess(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	resp := postJSON(t, r, "/api/crosschain/send", validAppSend("APP-E2E-000001"))
	if resp["code"].(float64) != 0 {
		t.Fatalf("want code 0, got %v (%s)", resp["code"], resp["message"])
	}
	data := resp["data"].(map[string]any)
	if data["status"] != "SUCCESS" || data["verify_result"] != "PASS" {
		t.Fatalf("want SUCCESS/PASS, got %v/%v", data["status"], data["verify_result"])
	}
	for _, k := range []string{"source_chain_tx_id", "reg_receive_tx_id", "reg_relay_tx_id", "target_chain_tx_id"} {
		if s, _ := data[k].(string); s == "" {
			t.Errorf("four tx ids required, %s empty", k)
		}
	}
}

func TestCrosschainSendBadSignatureFailsWithRecord(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	body := validAppSend("APP-E2E-000002")
	body["signature"] = "QUFBQUFBQUFBQQ==" // 非空 → 不走代签；伪造签名必败
	resp := postJSON(t, r, "/api/crosschain/send", body)
	if resp["code"].(float64) != 1002 {
		t.Fatalf("want code 1002, got %v (%s)", resp["code"], resp["message"])
	}
	data := resp["data"].(map[string]any) // FailData 必须携带留痕记录
	if data["status"] != "FAILED" || data["verify_result"] != "FAIL_SM9" {
		t.Fatalf("want FAILED/FAIL_SM9 record, got %v/%v", data["status"], data["verify_result"])
	}
}

func TestCrosschainSendDuplicateReturns2004(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	first := postJSON(t, r, "/api/crosschain/send", validAppSend("APP-E2E-000003"))
	if first["code"].(float64) != 0 {
		t.Fatalf("first send: %v", first)
	}
	second := postJSON(t, r, "/api/crosschain/send", validAppSend("APP-E2E-000003"))
	if second["code"].(float64) != 2004 {
		t.Fatalf("want code 2004, got %v", second["code"])
	}
	id1 := first["data"].(map[string]any)["cross_tx_id"]
	id2 := second["data"].(map[string]any)["cross_tx_id"]
	if id1 != id2 {
		t.Fatalf("duplicate must return existing record: %v vs %v", id1, id2)
	}
}

func TestCrosschainQueryAndList(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	sent := postJSON(t, r, "/api/crosschain/send", validAppSend("APP-E2E-000004"))
	if sent["code"].(float64) != 0 {
		t.Fatalf("send: %v", sent)
	}
	cxID := sent["data"].(map[string]any)["cross_tx_id"].(string)

	q := postJSON(t, r, "/api/crosschain/query", map[string]any{"cross_tx_id": cxID})
	if q["code"].(float64) != 0 || q["data"].(map[string]any)["status"] != "SUCCESS" {
		t.Fatalf("query: %v", q)
	}
	miss := postJSON(t, r, "/api/crosschain/query", map[string]any{"cross_tx_id": "CX-NOPE"})
	if miss["code"].(float64) != 6002 {
		t.Fatalf("query unknown: want 6002, got %v", miss["code"])
	}
	l := postJSON(t, r, "/api/crosschain/list", map[string]any{"status": "SUCCESS"})
	if l["code"].(float64) != 0 || l["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("list: %v", l)
	}
	bad := postJSON(t, r, "/api/crosschain/list", map[string]any{"page": "abc"})
	if bad["code"].(float64) != 6002 {
		t.Fatalf("list malformed body: want 6002, got %v", bad["code"])
	}
	empty := postJSON(t, r, "/api/crosschain/list", map[string]any{})
	if empty["code"].(float64) != 0 {
		t.Fatalf("list empty body must be legal: %v", empty)
	}
}
