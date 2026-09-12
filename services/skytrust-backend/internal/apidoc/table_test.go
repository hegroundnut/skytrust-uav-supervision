package apidoc

import (
	"encoding/json"
	"regexp"
	"testing"
)

// refPattern 匹配 body 中的 ${ref} 占位符（P5-R13：只作为完整字符串值出现）。
var refPattern = regexp.MustCompile(`\$\{([A-Za-z0-9_+-]+)\}`)

// bodyRefs 编组 body 后提取全部 ${ref} 名。
func bodyRefs(t *testing.T, body any) []string {
	t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	ms := refPattern.FindAllStringSubmatch(string(raw), -1)
	refs := make([]string, 0, len(ms))
	for _, m := range ms {
		refs = append(refs, m[1])
	}
	return refs
}

// TestEndpointTableComplete 端点表完整性 + 占位符先行定义校验。
func TestEndpointTableComplete(t *testing.T) {
	if len(Endpoints) != 64 {
		t.Fatalf("endpoints = %d, want 64", len(Endpoints))
	}
	seen := map[string]bool{}
	defined := map[string]bool{"now-1h": true, "now+1h": true}
	ignoreBody := map[string]bool{
		"/api/health/ping": true, "/api/health/check": true, "/api/chain/status": true,
		"/api/demo/init": true, "/api/demo/reset": true, "/api/topology/get": true,
		"/api/dashboard/summary": true,
	}
	probe0 := 0
	for i, ep := range Endpoints {
		if seen[ep.Path] {
			t.Fatalf("row %d: duplicate path %s", i, ep.Path)
		}
		seen[ep.Path] = true
		if len(ep.Path) < 6 || ep.Path[:5] != "/api/" {
			t.Fatalf("row %d: path must start /api/: %s", i, ep.Path)
		}
		if ep.Group == "" || ep.Summary == "" || ep.Sample == nil {
			t.Fatalf("row %d (%s): Group/Summary/Sample must be set", i, ep.Path)
		}
		switch ep.ExpectCode {
		case 0, 1002, 6002:
		default:
			t.Fatalf("row %d (%s): ExpectCode = %d, want 0/1002/6002", i, ep.Path, ep.ExpectCode)
		}
		if want := ignoreBody[ep.Path]; (ep.ProbeExpect == 0) != want {
			t.Fatalf("row %d (%s): ProbeExpect = %d, ignore-body = %v", i, ep.Path, ep.ProbeExpect, want)
		}
		if ep.ProbeExpect == 0 {
			probe0++
		}
		for ref := range ep.Capture {
			if defined[ref] {
				t.Fatalf("row %d (%s): capture %q redefined", i, ep.Path, ref)
			}
			defined[ref] = true
		}
		for _, dot := range ep.Capture {
			if len(dot) < 6 || dot[:5] != "data." {
				t.Fatalf("row %d (%s): capture dot-path must start data.: %q", i, ep.Path, dot)
			}
		}
		for _, ref := range bodyRefs(t, ep.Sample) {
			if !defined[ref] {
				t.Fatalf("row %d (%s): sample uses ${%s} before any capture defines it", i, ep.Path, ref)
			}
		}
	}
	if probe0 != 7 {
		t.Fatalf("ProbeExpect=0 rows = %d, want 7 (body-ignoring handlers)", probe0)
	}
	if last := Endpoints[len(Endpoints)-1].Path; last != "/api/demo/reset" {
		t.Fatalf("last row = %s, want /api/demo/reset (story cleanup)", last)
	}
	for _, must := range []string{"/api/experiment/run", "/api/experiment/result", "/api/experiment/list", "/api/experiment/export"} {
		if !seen[must] {
			t.Fatalf("missing endpoint %s", must)
		}
	}
}

// TestScenarioTableComplete 场景表：24 个 TC 顺序/系统归属/步骤合法性/引用先行定义。
func TestScenarioTableComplete(t *testing.T) {
	if len(Storylines) != 24 {
		t.Fatalf("scenarios = %d, want 24", len(Storylines))
	}
	epPaths := map[string]bool{}
	for _, ep := range Endpoints {
		epPaths[ep.Path] = true
	}
	defined := map[string]bool{"now-1h": true, "now+1h": true} // 整个场景回放共享命名空间
	wantID := 0
	for i, sc := range Storylines {
		wantID++
		sysNum := (wantID-1)/8 + 1
		want := "TC" + string(rune('0'+sysNum)) + "-"
		if len(sc.ID) != 6 || sc.ID[:4] != want[:4] {
			t.Fatalf("scenario %d: ID = %q, want prefix %q", i, sc.ID, want)
		}
		if sc.ID != want+[]string{"01", "02", "03", "04", "05", "06", "07", "08"}[(wantID-1)%8] {
			t.Fatalf("scenario %d: ID = %q, want %q", i, sc.ID, want+[]string{"01", "02", "03", "04", "05", "06", "07", "08"}[(wantID-1)%8])
		}
		if sc.Name == "" {
			t.Fatalf("%s: Name empty", sc.ID)
		}
		wantSys := []string{"system1", "system2", "system3"}[sysNum-1]
		if sc.System != wantSys {
			t.Fatalf("%s: System = %q, want %q", sc.ID, sc.System, wantSys)
		}
		if len(sc.Steps) == 0 {
			t.Fatalf("%s: no steps", sc.ID)
		}
		for j, st := range sc.Steps {
			if !epPaths[st.Path] {
				t.Fatalf("%s step %d: path %s not in endpoint table", sc.ID, j, st.Path)
			}
			switch st.ExpectCode {
			case 0, 1002, 5001, 5002:
			default:
				t.Fatalf("%s step %d (%s): ExpectCode = %d", sc.ID, j, st.Path, st.ExpectCode)
			}
			for ref, dot := range st.Capture {
				if defined[ref] {
					t.Fatalf("%s step %d: capture %q redefined", sc.ID, j, ref)
				}
				defined[ref] = true
				if len(dot) < 6 || dot[:5] != "data." {
					t.Fatalf("%s step %d: dot-path %q must start data.", sc.ID, j, dot)
				}
			}
			for _, ref := range bodyRefs(t, st.Body) {
				if !defined[ref] {
					t.Fatalf("%s step %d (%s): body uses ${%s} before definition", sc.ID, j, st.Path, ref)
				}
			}
		}
	}
}
