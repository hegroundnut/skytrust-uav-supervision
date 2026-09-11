package api

import (
	"regexp"
	"testing"
)

var timeFmtRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$`)

func TestResponseTimeFormat(t *testing.T) {
	r := setupFullTestRouter(t)
	seed := postJSON(t, r, "/api/manufacturer/register", map[string]any{"manufacturer_id": "Manufacturer-TF1", "name": "时间格式厂"})
	// codeOfResp 在磁盘不存在 → 按简报注内联 code 判断（断言语义不变）
	if seed["code"].(float64) != 0 {
		t.Fatalf("register: %v", seed)
	}
	if ts, _ := seed["data"].(map[string]any)["created_at"].(string); !timeFmtRe.MatchString(ts) {
		t.Fatalf("created_at not TimeFmt: %q", ts)
	}
	// 列表同样合规
	l := postJSON(t, r, "/api/manufacturer/list", map[string]any{})
	recs, _ := l["data"].(map[string]any)["records"].([]any)
	if len(recs) == 0 {
		t.Fatal("empty records")
	}
	if ts, _ := recs[0].(map[string]any)["created_at"].(string); !timeFmtRe.MatchString(ts) {
		t.Fatalf("list created_at not TimeFmt: %q", ts)
	}
}
