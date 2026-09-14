package apidoc

import (
	"bytes"
	"testing"
)

// TestInferSchema 类型推断：标量/对象/数组/空数组/nil。
func TestInferSchema(t *testing.T) {
	s := InferSchema(map[string]any{
		"code": float64(0), "message": "ok", "flag": true, "none": nil,
		"data":  map[string]any{"run_id": "RUN-1"},
		"list":  []any{map[string]any{"a": "b"}},
		"empty": []any{},
	})
	if s["type"] != "object" {
		t.Fatalf("root = %v", s)
	}
	props := s["properties"].(map[string]any)
	if props["code"].(map[string]any)["type"] != "number" ||
		props["message"].(map[string]any)["type"] != "string" ||
		props["flag"].(map[string]any)["type"] != "boolean" ||
		props["none"].(map[string]any)["type"] != "null" {
		t.Fatalf("scalars = %v", props)
	}
	d := props["data"].(map[string]any)
	if d["type"] != "object" || d["properties"].(map[string]any)["run_id"].(map[string]any)["type"] != "string" {
		t.Fatalf("data = %v", d)
	}
	l := props["list"].(map[string]any)
	if l["type"] != "array" || l["items"].(map[string]any)["type"] != "object" {
		t.Fatalf("list = %v", l)
	}
	if e := props["empty"].(map[string]any); e["type"] != "array" || e["items"] != nil {
		t.Fatalf("empty = %v", e)
	}
}

// TestBuildOpenAPI 两假端点：一个有录制样例、一个无（静态回退必须标注来源）。
func TestBuildOpenAPI(t *testing.T) {
	eps := []Endpoint{
		{Path: "/api/experiment/run", Group: "实验", Summary: "运行实验",
			Sample: map[string]any{"experiment_type": "SM3_INTEGRITY", "count": 5}, ExpectCode: 0, ProbeExpect: 6002},
		{Path: "/api/health/ping", Group: "基础", Summary: "探活",
			Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 0},
	}
	ok := Samples{"/api/experiment/run": {
		Request:  map[string]any{"experiment_type": "SM3_INTEGRITY", "count": float64(5)},
		Response: map[string]any{"code": float64(0), "message": "ok", "data": map[string]any{"run_id": "RUN-1"}},
	}}
	probe := Samples{"/api/experiment/run": {
		Request:  []any{},
		Response: map[string]any{"code": float64(6002), "message": "参数错误"},
	}}
	doc := BuildOpenAPI(eps, ok, probe)
	if doc["openapi"] != "3.0.3" {
		t.Fatalf("openapi = %v", doc["openapi"])
	}
	paths := doc["paths"].(map[string]any)
	if len(paths) != 2 {
		t.Fatalf("paths = %d, want 2", len(paths))
	}
	run := paths["/api/experiment/run"].(map[string]any)["post"].(map[string]any)
	if run["operationId"] != "experimentRun" {
		t.Errorf("operationId = %v", run["operationId"])
	}
	resp := run["responses"].(map[string]any)["200"].(map[string]any)
	examples := resp["content"].(map[string]any)["application/json"].(map[string]any)["examples"].(map[string]any)
	if _, has := examples["success"]; !has {
		t.Errorf("recorded success example missing: %v", examples)
	}
	if be := examples["business_error"].(map[string]any); be["x-sample-source"] != "recorded" {
		t.Errorf("probe example must be marked recorded: %v", be)
	}
	// 请求样例必须用录制解析后的实际请求体
	reqEx := run["requestBody"].(map[string]any)["content"].(map[string]any)["application/json"].(map[string]any)["example"].(map[string]any)
	if reqEx["count"] != float64(5) {
		t.Errorf("request example not the recorded one: %v", reqEx)
	}
	ping := paths["/api/health/ping"].(map[string]any)["post"].(map[string]any)
	pex := ping["responses"].(map[string]any)["200"].(map[string]any)["content"].(map[string]any)["application/json"].(map[string]any)["examples"].(map[string]any)
	if pex["business_error"].(map[string]any)["x-sample-source"] != "static" {
		t.Errorf("unrecorded must fall back to static: %v", pex["business_error"])
	}
	tags := doc["tags"].([]any)
	if len(tags) != 2 {
		t.Errorf("tags = %v, want 2 unique groups", tags)
	}
}

// TestRenderDeterministic 同输入两次渲染逐字节一致（map 键排序），且为缩进 JSON。
func TestRenderDeterministic(t *testing.T) {
	doc := BuildScenarios([]Scenario{
		{ID: "TC1-01", Name: "三链在线", System: "system1", Steps: []ScenarioStep{
			{Path: "/api/chain/status", Body: map[string]any{}, ExpectCode: 0},
		}},
	})
	a, err := Render(doc)
	if err != nil {
		t.Fatal(err)
	}
	b, err := Render(BuildScenarios([]Scenario{
		{ID: "TC1-01", Name: "三链在线", System: "system1", Steps: []ScenarioStep{
			{Path: "/api/chain/status", Body: map[string]any{}, ExpectCode: 0},
		}},
	}))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(a, b) {
		t.Fatal("render not deterministic")
	}
	if !bytes.Contains(a, []byte(`"openapi_version"`)) && !bytes.Contains(a, []byte(`"scenarios"`)) {
		t.Fatalf("scenarios doc shape = %.200s", a)
	}
	if !bytes.Contains(a, []byte("\n  ")) {
		t.Fatal("want indented output")
	}
}
