package timex

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestTimexTimeJSON(t *testing.T) {
	// 渲染：固定瞬时 → 毫秒格式（Asia/Shanghai）
	tm := New(time.Date(2026, 9, 12, 9, 0, 0, 0, time.UTC))
	b, err := json.Marshal(tm)
	if err != nil || string(b) != `"2026-09-12 17:00:00.000"` {
		t.Fatalf("marshal: %s err=%v", b, err)
	}
	// 双格式解析回环
	var u Time
	if err := json.Unmarshal([]byte(`"2026-09-12 09:00:00.000"`), &u); err != nil || FormatTime(u.Time) != "2026-09-12 09:00:00.000" {
		t.Fatalf("unmarshal ms: %v (%v)", u, err)
	}
	if err := json.Unmarshal([]byte(`"2026-09-12 09:00:00"`), &u); err != nil || FormatTime(u.Time) != "2026-09-12 09:00:00.000" {
		t.Fatalf("unmarshal no-ms: %v (%v)", u, err)
	}
	// 垃圾输入 → 错误（不静默）
	if err := json.Unmarshal([]byte(`"09/12/2026"`), &u); err == nil {
		t.Fatal("garbage accepted")
	}
	// null/空串 → 零值不报错
	if err := json.Unmarshal([]byte(`null`), &u); err != nil {
		t.Fatalf("null: %v", err)
	}
	if !strings.HasPrefix(FormatTime(NowT().Time), "20") {
		t.Fatal("NowT sanity")
	}
}
