package apidoc

// InferSchema 从样例值推断 JSON Schema（OpenAPI 3.0 子集）。
// 空数组 items 为 nil（未知元素类型，Apifox 接受省略 items 细节）。
func InferSchema(v any) map[string]any {
	switch val := v.(type) {
	case nil:
		return map[string]any{"type": "null"}
	case bool:
		return map[string]any{"type": "boolean"}
	case float64:
		return map[string]any{"type": "number"}
	case int:
		return map[string]any{"type": "integer"}
	case string:
		return map[string]any{"type": "string"}
	case []any:
		s := map[string]any{"type": "array"}
		if len(val) > 0 {
			s["items"] = InferSchema(val[0])
		} else {
			s["items"] = nil
		}
		return s
	case map[string]any:
		props := make(map[string]any, len(val))
		for k, item := range val {
			props[k] = InferSchema(item)
		}
		return map[string]any{"type": "object", "properties": props}
	default:
		return map[string]any{"type": "object"}
	}
}

// envelopeSchema 统一信封 schema（code/message/data/trace_id/timestamp，全站唯一响应形状）。
func envelopeSchema() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"code":      map[string]any{"type": "integer", "description": "0=成功；非 0 见错误码表"},
			"message":   map[string]any{"type": "string"},
			"data":      map[string]any{"type": "object", "nullable": true},
			"trace_id":  map[string]any{"type": "string"},
			"timestamp": map[string]any{"type": "string", "description": "2006-01-02 15:04:05.000 Asia/Shanghai"},
		},
	}
}
