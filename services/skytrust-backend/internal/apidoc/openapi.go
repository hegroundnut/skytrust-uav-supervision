package apidoc

import "strings"

const (
	// Title 文档标题（info.title）。
	Title = "云巡信链 SkyTrust 后端"
	// Version 文档版本。
	Version = "1.0.0"
	// ServerURL 本地默认服务地址。
	ServerURL = "http://localhost:8080"
)

// operationID "/api/experiment/run" → "experimentRun"（去掉 /api 前缀，驼峰拼接）。
func operationID(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) > 0 && parts[0] == "api" {
		parts = parts[1:]
	}
	if len(parts) == 0 {
		return "root"
	}
	out := parts[0]
	for _, p := range parts[1:] {
		if p == "" {
			continue
		}
		out += strings.ToUpper(p[:1]) + p[1:]
	}
	return out
}

// staticEnvelope 未录制时的静态信封模板（x-sample-source: static 标注来源）。
func staticEnvelope(code int, message string) map[string]any {
	return map[string]any{
		"code": code, "message": message, "data": nil,
		"trace_id": "TRACE-STATIC", "timestamp": "2026-01-01 00:00:00.000",
	}
}

// BuildOpenAPI 组装 OpenAPI 3.0.3 文档：全 POST、统一信封、tag=Group（按表序去重）、
// 每端点两个响应样例（success=Sample 回放录制；business_error=`[]` 探针录制）。
// ok/probe 中缺失的端点回退静态模板并标注 x-sample-source: static。
func BuildOpenAPI(endpoints []Endpoint, ok, probe Samples) map[string]any {
	tagSeen := map[string]bool{}
	var tags []any
	paths := make(map[string]any, len(endpoints))
	for _, ep := range endpoints {
		if !tagSeen[ep.Group] {
			tagSeen[ep.Group] = true
			tags = append(tags, map[string]any{"name": ep.Group})
		}
		reqExample := ep.Sample
		if rec, has := ok[ep.Path]; has && rec.Request != nil {
			reqExample = rec.Request // 占位符已解析的实际请求体
		}
		examples := map[string]any{}
		if rec, has := ok[ep.Path]; has {
			examples["success"] = map[string]any{
				"summary": "回放录制样例", "value": rec.Response, "x-sample-source": "recorded",
			}
		} else {
			examples["success"] = map[string]any{
				"summary": "静态模板（未录制）", "value": staticEnvelope(ep.ExpectCode, "(static sample)"),
				"x-sample-source": "static",
			}
		}
		if rec, has := probe[ep.Path]; has {
			examples["business_error"] = map[string]any{
				"summary": "`[]` 探针录制的业务错误样例", "value": rec.Response, "x-sample-source": "recorded",
			}
		} else {
			examples["business_error"] = map[string]any{
				"summary": "静态错误模板（未录制）", "value": staticEnvelope(ep.ProbeExpect, "(static error sample)"),
				"x-sample-source": "static",
			}
		}
		paths[ep.Path] = map[string]any{"post": map[string]any{
			"tags":        []any{ep.Group},
			"summary":     ep.Summary,
			"operationId": operationID(ep.Path),
			"requestBody": map[string]any{
				"required": true,
				"content": map[string]any{"application/json": map[string]any{
					"schema": InferSchema(reqExample), "example": reqExample,
				}},
			},
			"responses": map[string]any{"200": map[string]any{
				"description": "统一信封（HTTP 恒 200，业务语义看 code）",
				"content": map[string]any{"application/json": map[string]any{
					"schema": envelopeSchema(), "examples": examples,
				}},
			}},
		}}
	}
	return map[string]any{
		"openapi": "3.0.3",
		"info": map[string]any{
			"title":   Title,
			"version": Version,
			"description": "云巡信链（SkyTrust）无人机跨域协同与可信监管原型后端。全部接口一律 POST；" +
				"统一信封 {code,message,data,trace_id,timestamp}；code 0=成功，非 0 见错误码表" +
				"（1001-1004 无人机/密码学，2001-2004 跨链，3001-3004 任务/许可，4001-4004 链下网络，" +
				"5001-5004 监管，6001-6002 实验/参数，9001 内部）。响应样例由回放测试录制。",
		},
		"servers": []any{map[string]any{"url": ServerURL}},
		"tags":    tags,
		"paths":   paths,
	}
}
