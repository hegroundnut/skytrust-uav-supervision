package apidoc

// BuildScenarios 组装 Apifox 测试场景文档（skytrust-test-scenarios.json）。
// Body 中 ${ref} 为运行时捕获占位符（前序步骤 Capture 提供），${now-1h}/${now+1h}
// 为回放引擎注入的动态时间（timex 格式）——导入 Apifox 后由前置脚本或手工替换。
func BuildScenarios(scenarios []Scenario) map[string]any {
	list := make([]any, 0, len(scenarios))
	for _, sc := range scenarios {
		list = append(list, sc)
	}
	return map[string]any{
		"name":  "云巡信链验收与演示场景",
		"count": len(scenarios),
		"description": "24 个验收场景（TC1-01..TC3-08），与 tests/acceptance/ 判定同源。" +
			"步骤 body 中 ${ref} 引用前序步骤 capture 的运行时值；${now-1h}/${now+1h} 为动态时间占位符。",
		"scenarios": list,
	}
}
