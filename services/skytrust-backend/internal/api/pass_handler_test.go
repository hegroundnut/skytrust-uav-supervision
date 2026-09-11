package api

import (
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/timex"
)

func TestPassEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	post := func(path string, body map[string]any) map[string]any { return postJSON(t, r, path, body) }
	seedUAVEnvHTTP(t, post)
	create := post("/api/mission/create", map[string]any{
		"operator_id": "Operator-O1", "uav_id": "UAV-O1-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []string{"R101", "R205"}, "altitude_min": 60, "altitude_max": 120,
		"payload_type": "CAMERA",
	})
	if create["code"].(float64) != 0 {
		t.Fatalf("create: %v", create)
	}
	sub := post("/api/mission/submit", map[string]any{"mission_id": "MISSION-2026-001", "operator": "Operator-O1"})
	if sub["code"].(float64) != 0 {
		t.Fatalf("submit: %v", sub)
	}
	appID := sub["data"].(map[string]any)["application"].(map[string]any)["application_id"].(string)
	if rev := post("/api/review/submit", map[string]any{"application_id": appID, "result": "APPROVED", "reviewer": "FISCO-ADMIN"}); rev["code"].(float64) != 0 {
		t.Fatalf("review: %v", rev)
	}
	// 签发（now±1h 窗口，保证 verify 立即有效）
	vf := timex.FormatTime(timex.Now().Add(-time.Hour))
	vt := timex.FormatTime(timex.Now().Add(time.Hour))
	iss := post("/api/pass/issue", map[string]any{"mission_id": "MISSION-2026-001", "issuer": "FISCO-ADMIN", "valid_from": vf, "valid_to": vt})
	if iss["code"].(float64) != 0 {
		t.Fatalf("issue: %v", iss)
	}
	d := iss["data"].(map[string]any)
	if d["pass"].(map[string]any)["pass_id"] != "PASS-2026-001" || d["pass"].(map[string]any)["status"] != "VALID" {
		t.Fatalf("pass = %v", d["pass"])
	}
	tx := d["crosschain"].(map[string]any)
	if tx["status"] != "SUCCESS" || !strings.HasPrefix(tx["target_chain_tx_id"].(string), "FABRIC-") {
		t.Fatalf("tx = %v", tx)
	}
	// 验证有效
	ver := post("/api/pass/verify", map[string]any{"pass_id": "PASS-2026-001"})
	if ver["code"].(float64) != 0 || ver["data"].(map[string]any)["valid"] != true {
		t.Fatalf("verify: %v", ver)
	}
	// 未获批任务签发 → 3004
	post("/api/mission/create", map[string]any{
		"operator_id": "Operator-O1", "uav_id": "UAV-O1-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-13 09:00:00", "end_time": "2026-09-13 11:00:00",
		"route_segments": []string{"R101"}, "altitude_min": 60, "altitude_max": 120,
		"payload_type": "CAMERA",
	})
	post("/api/mission/submit", map[string]any{"mission_id": "MISSION-2026-002", "operator": "Operator-O1"})
	if bad := post("/api/pass/issue", map[string]any{"mission_id": "MISSION-2026-002", "issuer": "FISCO-ADMIN"}); bad["code"].(float64) != 3004 {
		t.Fatalf("unapproved issue: want 3004, got %v", bad)
	}
	// 吊销 → REVOKED + SUCCESS；再验 → 无效
	rev := post("/api/pass/revoke", map[string]any{"pass_id": "PASS-2026-001", "reason": "气象突变", "operator": "FISCO-ADMIN"})
	if rev["code"].(float64) != 0 || rev["data"].(map[string]any)["crosschain_status"] != "SUCCESS" ||
		rev["data"].(map[string]any)["pass"].(map[string]any)["status"] != "REVOKED" {
		t.Fatalf("revoke: %v", rev)
	}
	ver2 := post("/api/pass/verify", map[string]any{"pass_id": "PASS-2026-001"})
	if ver2["data"].(map[string]any)["valid"] != false || ver2["data"].(map[string]any)["status"] != "REVOKED" {
		t.Fatalf("verify revoked: %v", ver2)
	}
	// 重复吊销 → 3002；不存在 → 6002
	if again := post("/api/pass/revoke", map[string]any{"pass_id": "PASS-2026-001", "reason": "x", "operator": "FISCO-ADMIN"}); again["code"].(float64) != 3002 {
		t.Fatalf("re-revoke: want 3002, got %v", again)
	}
	if q := post("/api/pass/query", map[string]any{"pass_id": "PASS-NOPE"}); q["code"].(float64) != 6002 {
		t.Fatalf("query unknown: want 6002, got %v", q)
	}
	// 列表过滤
	if l := post("/api/pass/list", map[string]any{"mission_id": "MISSION-2026-001"}); l["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("list by mission: %v", l)
	}
	if l := post("/api/pass/list", map[string]any{"status": "REVOKED"}); l["data"].(map[string]any)["total"].(float64) != 1 {
		t.Fatalf("list revoked: %v", l)
	}
}
