// Package apidoc 生成 Apifox 可导入文档（P5-R7）：端点表与场景表是手写唯一源，
// 响应样例由回放录制（tests/apifox_replay_test.go），仅在 APIFOX_GEN=1 时写盘。
package apidoc

// Endpoint 单端点手写条目。Sample 可含 ${ref} 占位符（回放引擎解析后，
// 录制进 Samples.Request 作为文档请求样例）。
type Endpoint struct {
	Path        string            // 一律 POST（全栈裁定）
	Group       string            // Apifox 目录（OpenAPI tag）
	Summary     string            // 一句话用途
	Sample      any               // 请求样例（可含 ${ref}/${now±1h} 占位符）
	ExpectCode  int               // 回放样例请求时的预期信封 code
	ProbeExpect int               // `[]` 探针预期 code（绑定型 6002；忽略 body 型 0）
	Capture     map[string]string // ref 名 → 响应信封点路径（如 data.application.application_id），可空
}

// ScenarioStep 场景单步。Capture 从本步响应捕获 ref 供后续步骤 ${ref} 引用。
type ScenarioStep struct {
	Path       string            `json:"path"`
	Body       any               `json:"body"`
	ExpectCode int               `json:"expect_code"`
	Capture    map[string]string `json:"capture,omitempty"`
}

// Scenario 验收/演示场景（24 个 TC，与 tests/acceptance 判定同源）。
type Scenario struct {
	ID     string         `json:"id"`
	Name   string         `json:"name"`
	System string         `json:"system"`
	Steps  []ScenarioStep `json:"steps"`
}

// Recorded 回放录制的单端点结果：实际发送的请求体（占位符已解析）+ 完整信封。
type Recorded struct {
	Request  any
	Response map[string]any
}

// Samples 按 path 键控的录制集。
type Samples map[string]Recorded
