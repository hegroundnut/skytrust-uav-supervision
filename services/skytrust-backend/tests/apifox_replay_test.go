package tests

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/apidoc"
	"skytrust-backend/internal/timex"
)

// dotPath 按点路径从信封取值，支持 map 键与数组数字下标（P5-R13）。
func dotPath(v any, path string) (any, error) {
	cur := v
	for _, seg := range strings.Split(path, ".") {
		switch node := cur.(type) {
		case map[string]any:
			next, has := node[seg]
			if !has {
				return nil, fmt.Errorf("dot-path %q: segment %q not found", path, seg)
			}
			cur = next
		case []any:
			idx, err := strconv.Atoi(seg)
			if err != nil || idx < 0 || idx >= len(node) {
				return nil, fmt.Errorf("dot-path %q: bad index %q", path, seg)
			}
			cur = node[idx]
		default:
			return nil, fmt.Errorf("dot-path %q: segment %q on non-container", path, seg)
		}
	}
	return cur, nil
}

// resolveBody 编组 body 后整串替换 "${ref}"（只作为完整字符串值出现，
// Task 11 表测试已静态校验先行定义）；残留 ${ → Fatalf。
func resolveBody(t *testing.T, body any, refs map[string]string) any {
	t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("resolve marshal: %v", err)
	}
	s := string(raw)
	for name, val := range refs {
		s = strings.ReplaceAll(s, `"${`+name+`}"`, strconv.Quote(val))
	}
	if strings.Contains(s, "${") {
		t.Fatalf("unresolved placeholder in body: %s", s)
	}
	var out any
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		t.Fatalf("resolve unmarshal: %v (%s)", err, s)
	}
	return out
}

// nowRefs 动态时间内置引用（timex 格式，与 issuePassA 同源）。
func nowRefs() map[string]string {
	return map[string]string{
		"now-1h": timex.FormatTime(timex.Now().Add(-time.Hour)),
		"now+1h": timex.FormatTime(timex.Now().Add(time.Hour)),
	}
}

// capture 从响应信封按 Capture 表捕获引用值。
func capture(t *testing.T, resp map[string]any, caps map[string]string, refs map[string]string) {
	t.Helper()
	for name, dot := range caps {
		v, err := dotPath(resp, dot)
		if err != nil {
			t.Fatalf("capture %s: %v", name, err)
		}
		refs[name] = fmt.Sprint(v)
	}
}

// TestApifoxReplayScenarios 24 场景单服务器顺序回放：每步只断言信封 code
// （数据级断言在 tests/acceptance；此处验证场景表对已实现行为的确定性）。
func TestApifoxReplayScenarios(t *testing.T) {
	srv := bootServerS1(t)
	defer srv.Close()
	refs := nowRefs()
	if resp := call(t, srv, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	for _, sc := range apidoc.Storylines {
		for j, st := range sc.Steps {
			resp := call(t, srv, st.Path, resolveBody(t, st.Body, refs))
			if got := resp["code"].(float64); int(got) != st.ExpectCode {
				t.Fatalf("%s step %d %s: want code %d, got %v", sc.ID, j, st.Path, st.ExpectCode, resp)
			}
			capture(t, resp, st.Capture, refs)
		}
	}
}

// TestApifoxEndpointSamples 端点表回放录制：64 样例（故事序，capture/resolve）
// + 64 个 `[]` 探针（绑定层判定，状态无关）→ 内存组装 OpenAPI 健全性 →
// APIFOX_GEN=1 时渲染写盘 docs/apifox/（快照提交，P5-R13）。
func TestApifoxEndpointSamples(t *testing.T) {
	srv := bootServerS1(t)
	defer srv.Close()
	refs := nowRefs()
	if resp := call(t, srv, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	ok := apidoc.Samples{}
	for i, ep := range apidoc.Endpoints {
		body := resolveBody(t, ep.Sample, refs)
		resp := call(t, srv, ep.Path, body)
		if got := resp["code"].(float64); int(got) != ep.ExpectCode {
			t.Fatalf("row %d %s: want code %d, got %v", i, ep.Path, ep.ExpectCode, resp)
		}
		ok[ep.Path] = apidoc.Recorded{Request: body, Response: resp}
		capture(t, resp, ep.Capture, refs)
	}
	probe := apidoc.Samples{}
	for i, ep := range apidoc.Endpoints {
		resp := call(t, srv, ep.Path, []any{})
		if got := resp["code"].(float64); int(got) != ep.ProbeExpect {
			t.Fatalf("probe row %d %s: want code %d, got %v", i, ep.Path, ep.ProbeExpect, resp)
		}
		probe[ep.Path] = apidoc.Recorded{Request: []any{}, Response: resp}
	}
	doc := apidoc.BuildOpenAPI(apidoc.Endpoints, ok, probe)
	paths := doc["paths"].(map[string]any)
	if len(paths) != 64 {
		t.Fatalf("openapi paths = %d, want 64", len(paths))
	}
	for p, item := range paths {
		m := item.(map[string]any)
		if len(m) != 1 {
			t.Fatalf("%s: must be POST-only, got %v", p, m)
		}
		if _, has := m["post"]; !has {
			t.Fatalf("%s: no post operation", p)
		}
	}
	scen := apidoc.BuildScenarios(apidoc.Storylines)
	if scen["count"] != 24 {
		t.Fatalf("scenarios count = %v, want 24", scen["count"])
	}
	if os.Getenv("APIFOX_GEN") != "1" {
		return
	}
	dir := filepath.Join("..", "..", "..", "docs", "apifox") // tests CWD（services/skytrust-backend/tests）→ 仓库根
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	for name, d := range map[string]map[string]any{
		"skytrust-backend.openapi.json": doc,
		"skytrust-test-scenarios.json":  scen,
	} {
		b, err := apidoc.Render(d)
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, name), append(b, '\n'), 0o644); err != nil {
			t.Fatal(err)
		}
		t.Logf("generated %s (%d bytes)", name, len(b)+1)
	}
}

// TestApifoxArtifacts 产物入库校验：解析已提交的两个 JSON（不比字节——快照语义），
// 断言 OpenAPI 版本/路径数/全 POST 与场景数/首尾 ID。
func TestApifoxArtifacts(t *testing.T) {
	read := func(name string) map[string]any {
		t.Helper()
		raw, err := os.ReadFile(filepath.Join("..", "..", "..", "docs", "apifox", name))
		if err != nil {
			t.Fatalf("%s: %v (先跑 APIFOX_GEN=1 生成并提交)", name, err)
		}
		var m map[string]any
		if err := json.Unmarshal(raw, &m); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		return m
	}
	doc := read("skytrust-backend.openapi.json")
	if doc["openapi"] != "3.0.3" {
		t.Fatalf("openapi = %v", doc["openapi"])
	}
	paths := doc["paths"].(map[string]any)
	if len(paths) != 64 {
		t.Fatalf("paths = %d, want 64", len(paths))
	}
	for p, item := range paths {
		m := item.(map[string]any)
		if _, has := m["post"]; !has || len(m) != 1 {
			t.Fatalf("%s: not POST-only: %v", p, m)
		}
	}
	if doc["info"].(map[string]any)["title"] == "" {
		t.Fatal("info.title empty")
	}
	scen := read("skytrust-test-scenarios.json")
	if scen["count"].(float64) != 24 {
		t.Fatalf("count = %v", scen["count"])
	}
	list := scen["scenarios"].([]any)
	if len(list) != 24 {
		t.Fatalf("scenarios = %d", len(list))
	}
	if list[0].(map[string]any)["id"] != "TC1-01" || list[23].(map[string]any)["id"] != "TC3-08" {
		t.Fatalf("first/last = %v / %v", list[0], list[23])
	}
}
