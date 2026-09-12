package api

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func newExpRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	return r
}

// TestExperimentRunSM3ViaAPI 成功路径：DONE + 全成 + 双 ID 形状。
func TestExperimentRunSM3ViaAPI(t *testing.T) {
	r := newExpRouter(t)
	out := postJSON(t, r, "/api/experiment/run", map[string]any{"experiment_type": "SM3_INTEGRITY", "count": 5})
	if out["code"].(float64) != float64(ErrOK) {
		t.Fatalf("resp = %v", out)
	}
	data := out["data"].(map[string]any)
	if data["status"] != "DONE" || data["success_count"].(float64) != 5 || data["success_rate"].(float64) != 1 {
		t.Fatalf("data = %v", data)
	}
	if !strings.HasPrefix(data["run_id"].(string), "RUN-") || !strings.HasPrefix(data["experiment_id"].(string), "EXP-") {
		t.Errorf("ids = %v / %v", data["experiment_id"], data["run_id"])
	}
}

// TestExperimentRunValidationViaAPI 校验失败一律 6002（非法类型/count 越界/缺 count）。
func TestExperimentRunValidationViaAPI(t *testing.T) {
	r := newExpRouter(t)
	bodies := []map[string]any{
		{"experiment_type": "BOGUS", "count": 5},
		{"experiment_type": "SM3_INTEGRITY", "count": 0},
		{}, // 空对象绑定成功（RunRequest 无 binding tag）→ Validate 判 count → 6002
	}
	for i, body := range bodies {
		out := postJSON(t, r, "/api/experiment/run", body)
		if out["code"].(float64) != float64(ErrParam) {
			t.Errorf("body %d %v: want %d, got %v", i, body, ErrParam, out["code"])
		}
	}
}

// TestExperimentRunSetupFailureViaAPI P5-R3/R4 经 API：先 DEFENSE 消耗攻击拓扑
// （X/Y → ISOLATED），再 ATTACK 必 setup 失败 → 6001 + FailData 带 FAILED 行。
func TestExperimentRunSetupFailureViaAPI(t *testing.T) {
	r := newExpRouter(t)
	out1 := postJSON(t, r, "/api/experiment/run", map[string]any{"experiment_type": "MESSAGE_FLOW", "scenario": "DEFENSE", "count": 1})
	if out1["code"].(float64) != float64(ErrOK) {
		t.Fatalf("defense run = %v", out1)
	}
	out2 := postJSON(t, r, "/api/experiment/run", map[string]any{"experiment_type": "MESSAGE_FLOW", "scenario": "ATTACK", "count": 1})
	if out2["code"].(float64) != float64(ErrExperiment) {
		t.Fatalf("attack after defense: want %d, got %v", ErrExperiment, out2["code"])
	}
	data, ok := out2["data"].(map[string]any)
	if !ok || data["status"] != "FAILED" || data["failure_reasons"] != `{"setup_error":1}` {
		t.Fatalf("FailData run row = %v", out2["data"])
	}
}

// TestExperimentResultAndListViaAPI result 往返/6002 两态；list 契约 + page_size 封顶。
func TestExperimentResultAndListViaAPI(t *testing.T) {
	r := newExpRouter(t)
	out := postJSON(t, r, "/api/experiment/run", map[string]any{"experiment_type": "SM3_INTEGRITY", "count": 1})
	runID := out["data"].(map[string]any)["run_id"].(string)
	res := postJSON(t, r, "/api/experiment/result", map[string]any{"run_id": runID})
	if res["code"].(float64) != float64(ErrOK) || res["data"].(map[string]any)["status"] != "DONE" {
		t.Fatalf("result = %v", res)
	}
	if got := postJSON(t, r, "/api/experiment/result", map[string]any{"run_id": "RUN-NOPE"})["code"].(float64); got != float64(ErrParam) {
		t.Errorf("unknown run: want %d, got %v", ErrParam, got)
	}
	if got := postJSON(t, r, "/api/experiment/result", map[string]any{})["code"].(float64); got != float64(ErrParam) {
		t.Errorf("missing run_id: want %d, got %v", ErrParam, got)
	}
	lst := postJSON(t, r, "/api/experiment/list", map[string]any{})
	if lst["code"].(float64) != float64(ErrOK) {
		t.Fatalf("list = %v", lst)
	}
	ld := lst["data"].(map[string]any)
	if ld["total"].(float64) != 1 || ld["page"].(float64) != 1 || ld["page_size"].(float64) != 20 {
		t.Errorf("list data = %v", ld)
	}
	if recs, ok := ld["records"].([]any); !ok || len(recs) != 1 {
		t.Errorf("records = %v", ld["records"])
	}
	capped := postJSON(t, r, "/api/experiment/list", map[string]any{"page_size": 9999})["data"].(map[string]any)
	if capped["page_size"].(float64) != 200 {
		t.Errorf("page_size cap = %v, want 200", capped["page_size"])
	}
	filtered := postJSON(t, r, "/api/experiment/list", map[string]any{"experiment_type": "SM9_VERIFY"})["data"].(map[string]any)
	if filtered["total"].(float64) != 0 {
		t.Errorf("filter total = %v, want 0", filtered["total"])
	}
}

// TestExperimentExportViaAPI CSV 信封与表头前缀。
func TestExperimentExportViaAPI(t *testing.T) {
	r := newExpRouter(t)
	postJSON(t, r, "/api/experiment/run", map[string]any{"experiment_type": "SM3_INTEGRITY", "count": 2})
	out := postJSON(t, r, "/api/experiment/export", map[string]any{})
	if out["code"].(float64) != float64(ErrOK) {
		t.Fatalf("export = %v", out)
	}
	data := out["data"].(map[string]any)
	if data["format"] != "csv" || data["rows"].(float64) != 1 {
		t.Fatalf("export data = %v", data)
	}
	if !strings.HasPrefix(data["content"].(string), "experiment_id,run_id,experiment_type,scenario,status,count,") {
		t.Errorf("csv header prefix wrong: %.80q", data["content"])
	}
}
