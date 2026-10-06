# 计划 A：后端 UOM 扩展域 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 spec §3（docs/superpowers/specs/2026-10-06-uom-three-portals-design.md）为后端纯加法扩展 UOM 域：地理（航段/节点结构化经纬度）、遥测（上报/列表/最新 + SIM 自动驾驶）、实名登记、操控员执照、追踪映射根治，并同步 apidoc/README/CLAUDE.md 契约（端点 64→73），全套测试恒绿。

**Architecture:** 全部改动落在 `services/skytrust-backend/`。新增模型进 `model.AllModels()`；实名/执照域放 `internal/uavbusiness`（realname.go/pilot.go/mapping.go），遥测域放 `internal/offchain`（telemetry.go/telemetry_autopilot.go，遵守该包域隔离：禁止 import crosschain/uavbusiness）；handler 每域一个文件（api/telemetry_handler.go、api/uom_handler.go）；路由在 router.go 平铺追加。apidoc 端点表/场景表为手写唯一源，Task 6 统一改表并再生成 apifox 工件与 endpoints.js。

**Tech Stack:** Go 1.25、gin v1.12.0、gorm v1.31.2 + glebarez/sqlite v1.11.0（纯 Go）、gmsm v0.44.1（SM3/SM9）。全部冻结不得升迁。

## Global Constraints

以下约束对**每个任务**生效（值逐字来自 spec §3 总原则与仓库 CLAUDE.md 红线）：

- **纯加法**：只新增可选入参字段、新增响应字段、新增表；已有 64 端点语义、业务铁律、状态机、链适配层零改动。`api.Deps` 十字段不变。
- **所有端点一律 POST**；HTTP 状态码恒 200，业务成败看信封 `{code, message, data, trace_id, timestamp}` 的 `code`。
- **分页铁律**：page≤0→1；page_size≤0→20、>200→200；列表响应恒 `gin.H{"records", "total", "page", "page_size"}`。
- **时间**：一律 `internal/timex`（Asia/Shanghai，`2006-01-02 15:04:05.000`）。注意 API：`timex.Now()` 返回 **time.Time**；`timex.NowT()` 返回 **timex.Time**（模型字段用它）；`timex.New(t time.Time) Time`；`timex.FormatTime(time.Time) string`。
- **错误码**：唯一真源 `internal/errcode`；uavbusiness 域用 `crosschain.NewError`（= errcode.NewError 的 var 别名），offchain 域用 `errcode.NewError`；`crosschain.Error` 是 `errcode.Error` 的类型别名，api 层 `crosschainErrCode` 对两域通吃。新增 7xxx 段：RealnameNotFound=7001 / LicenseInvalid=7002 / TelemetrySession=7003；通用参数错仍 6002。
- **域隔离**：`internal/offchain` 禁止 import `internal/crosschain` 与 `internal/uavbusiness`（可读 `internal/model`）；`internal/uavbusiness` import 白名单 audit/crosschain/crypto/model/statemachine/timex + 标准库。
- **任务 canonical 红线**：`regulatory/inspection.go:176-194` 会逐字段重算任务 canonical JSON 做 SM3/SM9 双验证 —— **Mission.PilotLicenseID 只做普通列，绝不进 CreateMission 的 canon map**。
- **遥测推进红线**：缺结构化坐标的任务**跳过不造假**；测试环境 `TELEMETRY_AUTOPILOT_MS` 恒 0（关闭），单测手动 `tick()` 注入。
- **追踪映射红线**：跨链失败不建映射（链上无据、追踪就该断）；断链演示语义保留；回填 best-effort 失败不阻断签发；已有 PassID 的映射不覆盖（保护 seed 的 IDM-DEMO-0001→PASS-2026-001）。
- **hermetic**：`go test ./...` 无需网络/Docker/真实链。
- **生产环境红线**：:8080（PID 见部署记录）与 :8090 是**活的生产进程**——绝不 kill/重启、绝不向其 POST /api/*；`DB_PATH`/`SM9_KEY_DIR` 默认值指向生产文件，任何本地起服必须显式覆盖。
- **勿手改再生成物**：`docs/apifox/*.json` 与 `frontend/js/data/endpoints.js` 只能由 Task 6 的再生成命令产出。
- **工具链**：每个 shell 会话先 `export PATH=/usr/local/go/bin:$PATH`（或 `source scripts/env.sh`），`export GOPROXY=https://goproxy.cn,direct`。
- **工作目录**：除特别注明，所有命令在 `/root/codes/skytrust-uav-supervision/services/skytrust-backend` 下执行；git 提交在仓库内直接提交 main（本地仓）。
- **提交**：中文 conventional commits，消息末尾附 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。

## 任务总览（严格顺序执行）

| # | 任务 | 端点数 | 对应 spec |
|---|---|---|---|
| 1 | 地理域：航段/节点结构化经纬度 + seed 回填 | 64（不变） | §3.1 |
| 2 | 遥测域：模型/错误码/服务/SIM 自动驾驶/API/接线 | 64→67 | §3.2 |
| 3 | 实名域：实名登记 + UAV 注册标志/关联 | 67→70 | §3.3 |
| 4 | 执照域：操控员执照即申即发 + 任务关联 | 70→73 | §3.4 |
| 5 | 追踪映射根治：注册建映射 + 签发回填 pass_id | 73（不变） | §3.5 |
| 6 | 契约同步：apidoc 73 断言/场景、README、CLAUDE.md、工件再生成 | 73 | §3.6 |

注：Task 2 一次性加齐 7xxx 三个错误码常量与 api 别名（Task 3/4 直接消费，避免同行三改）；Task 2-4 各自把新路由加进 router.go——apidoc 表在 Task 6 之前仍是 64 行，回放只打表内路径，中途全套测试保持绿。

---

### Task 1: 地理域——航段/节点结构化经纬度（spec §3.1）

**Files:**
- Modify: `internal/model/business.go`（RouteSegment +4 字段）
- Modify: `internal/model/offchain.go`（NetworkNode +2 字段）
- Modify: `internal/uavbusiness/masterdata.go`（RouteInput +4 字段；新增 parsePointCoords；CreateRoute 回填）
- Modify: `internal/api/masterdata_handler.go`（routeCreateReq +4 字段 + 透传）
- Modify: `internal/offchain/node.go`（NodeRegisterRequest +Lat/Lon；NodeRegister 透传）
- Modify: `internal/demo/seed.go`（5 条航路 + 8 个节点回填坐标）
- Test: `internal/uavbusiness/geography_test.go`（新建）
- Test: `internal/api/geography_handler_test.go`（新建）

**Interfaces:**
- Consumes: `testSvc(t) (*Service, *gorm.DB)`（masterdata_test.go 已有）；`NewRouter(validTestDeps(t))`、`postJSON(t, r, path, body)`（api 包已有）。
- Produces（后续任务依赖）:
  - `model.RouteSegment` 新字段 `StartLat/StartLon/EndLat/EndLon float64`（json `start_lat/start_lon/end_lat/end_lon`，0=未设）。
  - `model.NetworkNode` 新字段 `Lat/Lon float64`（json `lat/lon`）。
  - `uavbusiness.RouteInput` 新字段 `StartLat/StartLon/EndLat/EndLon float64`。
  - `parsePointCoords(s string) (lat, lon float64, ok bool)`（uavbusiness 包内）。
  - seed 数据：R101 起点 (30.510,114.310)、终点 (30.540,114.340)；MGR 节点 (30.620,114.420) 等——Task 2 的 SIM 推进测试与 Task 6 场景依赖这些坐标。

- [ ] **Step 1: 写失败的服务层测试**

新建 `internal/uavbusiness/geography_test.go`：

```go
package uavbusiness

import (
	"context"
	"testing"
)

func TestParsePointCoords(t *testing.T) {
	cases := []struct {
		in       string
		lat, lon float64
		ok       bool
	}{
		{"A-ENTRY(30.510,114.310)", 30.510, 114.310, true},
		{"B-GATE(30.572, 114.372)", 30.572, 114.372, true}, // 逗号后空格合法
		{"(30.1,114.2)", 30.1, 114.2, true},                // 无名纯坐标
		{"S9", 0, 0, false},                                // 无括号
		{"A(30.5)", 0, 0, false},                           // 缺第二值
		{"A(xx,yy)", 0, 0, false},                          // 非数字
		{"A()", 0, 0, false},                               // 空括号
	}
	for _, c := range cases {
		lat, lon, ok := parsePointCoords(c.in)
		if ok != c.ok || lat != c.lat || lon != c.lon {
			t.Errorf("parsePointCoords(%q) = (%v,%v,%v), want (%v,%v,%v)", c.in, lat, lon, ok, c.lat, c.lon, c.ok)
		}
	}
}

func TestCreateRouteCoordinateBackfill(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()

	// 1) 内嵌 "NAME(lat,lon)" 自动解析
	r, err := svc.CreateRoute(ctx, "TRACE-GEO-1", RouteInput{
		RouteID: "R-GEO-1", Zone: "Zone-A",
		StartPoint: "A-ENTRY(30.510,114.310)", EndPoint: "A-EXIT(30.540,114.340)",
		AltitudeMin: 60, AltitudeMax: 120,
	})
	if err != nil {
		t.Fatalf("CreateRoute: %v", err)
	}
	if r.StartLat != 30.510 || r.StartLon != 114.310 || r.EndLat != 30.540 || r.EndLon != 114.340 {
		t.Errorf("backfill = (%v,%v,%v,%v), want (30.51,114.31,30.54,114.34)", r.StartLat, r.StartLon, r.EndLat, r.EndLon)
	}

	// 2) 显式字段优先，不被内嵌解析覆盖
	r2, err := svc.CreateRoute(ctx, "TRACE-GEO-2", RouteInput{
		RouteID: "R-GEO-2", Zone: "Zone-A",
		StartPoint: "A-ENTRY(30.510,114.310)", EndPoint: "A-EXIT(30.540,114.340)",
		StartLat: 1.5, StartLon: 2.5, EndLat: 3.5, EndLon: 4.5,
		AltitudeMin: 60, AltitudeMax: 120,
	})
	if err != nil {
		t.Fatalf("CreateRoute explicit: %v", err)
	}
	if r2.StartLat != 1.5 || r2.StartLon != 2.5 || r2.EndLat != 3.5 || r2.EndLon != 4.5 {
		t.Errorf("explicit coords = (%v,%v,%v,%v), want (1.5,2.5,3.5,4.5)", r2.StartLat, r2.StartLon, r2.EndLat, r2.EndLon)
	}

	// 3) 解析失败 → 保持 0 且不报错（spec §3.1）
	r3, err := svc.CreateRoute(ctx, "TRACE-GEO-3", RouteInput{
		RouteID: "R-GEO-3", Zone: "Zone-A",
		StartPoint: "S9", EndPoint: "E9",
		AltitudeMin: 60, AltitudeMax: 120,
	})
	if err != nil {
		t.Fatalf("CreateRoute no-coords: %v", err)
	}
	if r3.StartLat != 0 || r3.StartLon != 0 || r3.EndLat != 0 || r3.EndLon != 0 {
		t.Errorf("unparseable route should keep zero coords, got (%v,%v,%v,%v)", r3.StartLat, r3.StartLon, r3.EndLat, r3.EndLon)
	}
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd /root/codes/skytrust-uav-supervision/services/skytrust-backend
go test ./internal/uavbusiness/ -run 'TestParsePointCoords|TestCreateRouteCoordinateBackfill' -count=1
```

预期：**FAIL（build failed）**，报错类似 `undefined: parsePointCoords`、`unknown field StartLat in struct literal`。

- [ ] **Step 3: 实现模型字段 + 解析回填**

3a. `internal/model/business.go` —— RouteSegment 结构体，在 `EndPoint` 行之后插入 4 个字段（原有字段一律不动）：

```go
	StartLat       float64    `json:"start_lat"` // 结构化坐标（spec §3.1）：0=未设；创建时可由内嵌 "NAME(lat,lon)" 自动解析
	StartLon       float64    `json:"start_lon"`
	EndLat         float64    `json:"end_lat"`
	EndLon         float64    `json:"end_lon"`
```

3b. `internal/model/offchain.go` —— NetworkNode 结构体，在 `Position` 行之后插入（抽象 Position 保留，拓扑/Dijkstra/时延仿真一字不动）：

```go
	Lat         float64    `json:"lat"` // 结构化经纬度（spec §3.1）：0=未设；仅供前端地图与遥测推进使用
	Lon         float64    `json:"lon"`
```

3c. `internal/uavbusiness/masterdata.go` —— 三处改动：

① `RouteInput` 结构体在 `CorridorStatus` 字段后追加：

```go
	StartLat       float64 // 可选：结构化起点坐标（显式值优先，不被内嵌解析覆盖）
	StartLon       float64
	EndLat         float64
	EndLon         float64
```

② 在 `CreateRoute` 函数**之前**新增解析函数（并确保文件 import 块含 `"strconv"` 与 `"strings"`）：

```go
// parsePointCoords 解析 "NAME(lat,lon)" 内嵌坐标。任何畸形（无括号/缺值/非数字）返回 ok=false——
// 永不报错（spec §3.1：解析失败保持 0 即可）。
func parsePointCoords(s string) (lat, lon float64, ok bool) {
	l := strings.LastIndex(s, "(")
	r := strings.LastIndex(s, ")")
	if l < 0 || r <= l+1 {
		return 0, 0, false
	}
	parts := strings.Split(s[l+1:r], ",")
	if len(parts) != 2 {
		return 0, 0, false
	}
	latV, err1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	lonV, err2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	if err1 != nil || err2 != nil {
		return 0, 0, false
	}
	return latV, lonV, true
}
```

③ `CreateRoute` 内，在查重通过之后、`r := &model.RouteSegment{` 之前插入回填逻辑，并给字面量补 4 个字段。改后该段完整为：

```go
	// 结构化坐标回填（spec §3.1）：显式入参优先；未设时解析内嵌 "NAME(lat,lon)"，解析失败保持 0 不报错。
	startLat, startLon, endLat, endLon := in.StartLat, in.StartLon, in.EndLat, in.EndLon
	if startLat == 0 && startLon == 0 {
		if la, lo, ok := parsePointCoords(in.StartPoint); ok {
			startLat, startLon = la, lo
		}
	}
	if endLat == 0 && endLon == 0 {
		if la, lo, ok := parsePointCoords(in.EndPoint); ok {
			endLat, endLon = la, lo
		}
	}
	r := &model.RouteSegment{
		RouteID: in.RouteID, Zone: in.Zone, StartPoint: in.StartPoint, EndPoint: in.EndPoint,
		StartLat: startLat, StartLon: startLon, EndLat: endLat, EndLon: endLon,
		AltitudeMin: in.AltitudeMin, AltitudeMax: in.AltitudeMax, CorridorStatus: in.CorridorStatus,
	}
```

- [ ] **Step 4: 跑服务层测试确认通过**

```bash
go test ./internal/uavbusiness/ -run 'TestParsePointCoords|TestCreateRouteCoordinateBackfill' -count=1 -v
```

预期：`--- PASS: TestParsePointCoords`、`--- PASS: TestCreateRouteCoordinateBackfill`、`ok skytrust-backend/internal/uavbusiness`。

- [ ] **Step 5: 写失败的 API 层测试**

新建 `internal/api/geography_handler_test.go`：

```go
package api

import (
	"testing"
)

func TestRouteCreateCoordinates(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	// 1) 内嵌坐标自动解析
	resp := postJSON(t, r, "/api/route/create", map[string]any{
		"route_id": "R-GEO-A", "zone": "Zone-A",
		"start_point": "A-ENTRY(30.510,114.310)", "end_point": "A-EXIT(30.540,114.340)",
		"altitude_min": 60, "altitude_max": 120,
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("route/create: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["start_lat"].(float64) != 30.510 || d["start_lon"].(float64) != 114.310 ||
		d["end_lat"].(float64) != 30.540 || d["end_lon"].(float64) != 114.340 {
		t.Errorf("内嵌坐标解析 = %v", d)
	}
	// 2) 显式字段优先
	resp = postJSON(t, r, "/api/route/create", map[string]any{
		"route_id": "R-GEO-B", "zone": "Zone-A",
		"start_point": "A-ENTRY(30.510,114.310)", "end_point": "A-EXIT(30.540,114.340)",
		"start_lat": 1.5, "start_lon": 2.5, "end_lat": 3.5, "end_lon": 4.5,
		"altitude_min": 60, "altitude_max": 120,
	})
	d = resp["data"].(map[string]any)
	if d["start_lat"].(float64) != 1.5 || d["start_lon"].(float64) != 2.5 ||
		d["end_lat"].(float64) != 3.5 || d["end_lon"].(float64) != 4.5 {
		t.Errorf("显式字段应优先 = %v", d)
	}
	// 3) 无法解析 → 保持 0 不报错
	resp = postJSON(t, r, "/api/route/create", map[string]any{
		"route_id": "R-GEO-C", "zone": "Zone-A", "start_point": "S9", "end_point": "E9",
		"altitude_min": 60, "altitude_max": 120,
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("无坐标航线不应报错: %v", resp)
	}
	d = resp["data"].(map[string]any)
	if d["start_lat"].(float64) != 0 || d["end_lon"].(float64) != 0 {
		t.Errorf("解析失败应保持 0 = %v", d)
	}
}

func TestNodeRegisterLatLon(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	resp := postJSON(t, r, "/api/node/register", map[string]any{
		"node_id": "N-GEO-1", "node_type": "EDGE",
		"position": map[string]any{"X": 1, "Y": 2},
		"lat":      30.5, "lon": 114.3,
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("node/register: %v", resp)
	}
	d := resp["data"].(map[string]any)
	if d["lat"].(float64) != 30.5 || d["lon"].(float64) != 114.3 {
		t.Errorf("lat/lon = %v", d)
	}
	// 不提供 lat/lon → 保持 0，注册照常成功
	resp = postJSON(t, r, "/api/node/register", map[string]any{
		"node_id": "N-GEO-2", "node_type": "EDGE",
		"position": map[string]any{"X": 3, "Y": 4},
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("node/register without coords: %v", resp)
	}
	if resp["data"].(map[string]any)["lat"].(float64) != 0 {
		t.Errorf("未提供坐标应保持 0 = %v", resp["data"])
	}
}

func TestSeedRoutesAndNodesHaveCoords(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	resp := postJSON(t, r, "/api/route/list", map[string]any{"zone": "Zone-A"})
	recs := resp["data"].(map[string]any)["records"].([]any)
	found := false
	for _, rec := range recs {
		m := rec.(map[string]any)
		if m["route_id"] == "R101" {
			found = true
			if m["start_lat"].(float64) != 30.510 || m["start_lon"].(float64) != 114.310 ||
				m["end_lat"].(float64) != 30.540 || m["end_lon"].(float64) != 114.340 {
				t.Errorf("R101 坐标 = %v", m)
			}
		}
	}
	if !found {
		t.Fatal("seed 未找到 R101")
	}
	resp = postJSON(t, r, "/api/node/list", map[string]any{})
	recs = resp["data"].(map[string]any)["records"].([]any)
	seenMGR := false
	for _, rec := range recs {
		m := rec.(map[string]any)
		if m["node_id"] == "MGR" {
			seenMGR = true
			if m["lat"].(float64) != 30.620 || m["lon"].(float64) != 114.420 {
				t.Errorf("MGR 坐标 = %v", m)
			}
		}
	}
	if !seenMGR {
		t.Fatal("seed 未找到 MGR 节点")
	}
}
```

- [ ] **Step 6: 跑测试确认失败**

```bash
go test ./internal/api/ -run 'TestRouteCreateCoordinates|TestNodeRegisterLatLon|TestSeedRoutesAndNodesHaveCoords' -count=1
```

预期：**FAIL**——TestRouteCreateCoordinates 因 `start_lat` 恒 0（handler 未透传）；TestNodeRegisterLatLon 因 `lat` 恒 0；TestSeedRoutesAndNodesHaveCoords 因 seed 未回填。

- [ ] **Step 7: 实现 handler 透传 + 节点字段 + seed 回填**

7a. `internal/api/masterdata_handler.go` —— `routeCreateReq` 在 `CorridorStatus` 字段后追加：

```go
	StartLat       float64 `json:"start_lat"` // 可选：结构化坐标（0=未设；缺省时服务端解析 start_point/end_point 内嵌坐标）
	StartLon       float64 `json:"start_lon"`
	EndLat         float64 `json:"end_lat"`
	EndLon         float64 `json:"end_lon"`
```

`routeCreateHandler` 中 `uavbusiness.RouteInput{...}` 字面量改为：

```go
		r, err := deps.Business.CreateRoute(c.Request.Context(), TraceIDFrom(c), uavbusiness.RouteInput{
			RouteID: req.RouteID, Zone: req.Zone, StartPoint: req.StartPoint, EndPoint: req.EndPoint,
			StartLat: req.StartLat, StartLon: req.StartLon, EndLat: req.EndLat, EndLon: req.EndLon,
			AltitudeMin: req.AltitudeMin, AltitudeMax: req.AltitudeMax, CorridorStatus: req.CorridorStatus,
		})
```

7b. `internal/offchain/node.go` —— `NodeRegisterRequest` 在 `Status` 字段后追加：

```go
	Lat     float64 `json:"lat"` // 可选：结构化经纬度（spec §3.1），0=未设
	Lon     float64 `json:"lon"`
```

`NodeRegister` 中 `node := model.NetworkNode{...}` 字面量改为：

```go
	node := model.NetworkNode{
		NodeID: req.NodeID, NodeType: req.NodeType, SM9Identity: sm9,
		Neighbors: string(nbrsJSON), Position: string(posJSON), Lat: req.Lat, Lon: req.Lon, Status: status,
	}
```

7c. `internal/demo/seed.go` —— `routes := []model.RouteSegment{...}` 五条字面量整体替换为（坐标与内嵌字符串逐一对应）：

```go
	routes := []model.RouteSegment{
		{RouteID: "R101", Zone: "Zone-A", StartPoint: "A-ENTRY(30.510,114.310)", EndPoint: "A-EXIT(30.540,114.340)", StartLat: 30.510, StartLon: 114.310, EndLat: 30.540, EndLon: 114.340, AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN"},
		{RouteID: "R205", Zone: "Zone-A", StartPoint: "A-EXIT(30.540,114.340)", EndPoint: "B-GATE(30.572,114.372)", StartLat: 30.540, StartLon: 114.340, EndLat: 30.572, EndLon: 114.372, AltitudeMin: 80, AltitudeMax: 120, CorridorStatus: "OPEN"},
		{RouteID: "R208", Zone: "Zone-B", StartPoint: "B-WEST(30.570,114.370)", EndPoint: "B-EAST(30.590,114.390)", StartLat: 30.570, StartLon: 114.370, EndLat: 30.590, EndLon: 114.390, AltitudeMin: 60, AltitudeMax: 100, CorridorStatus: "OPEN"},
		{RouteID: "R209", Zone: "Zone-B", StartPoint: "B-GATE(30.555,114.365)", EndPoint: "B-NORTH(30.600,114.410)", StartLat: 30.555, StartLon: 114.365, EndLat: 30.600, EndLon: 114.410, AltitudeMin: 90, AltitudeMax: 150, CorridorStatus: "OPEN"},
		{RouteID: "R306", Zone: "Zone-B", StartPoint: "B-EAST(30.585,114.385)", EndPoint: "B-LAND(30.620,114.420)", StartLat: 30.585, StartLon: 114.385, EndLat: 30.620, EndLon: 114.420, AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN"},
	}
```

`nodes := []model.NetworkNode{...}` 八条字面量整体替换为（沿 R101→R205→R306 走廊赋经纬度，spec §3.1）：

```go
	nodes := []model.NetworkNode{
		{NodeID: "UAV-A-001-NODE", NodeType: "UAV", SM9Identity: crypto.SM9IdentityOf("UAV-A-001-NODE"), Neighbors: `["N1"]`, Position: `{"x":0,"y":0}`, Lat: 30.510, Lon: 114.310, Status: "ONLINE"},
		{NodeID: "N1", NodeType: "EDGE", SM9Identity: crypto.SM9IdentityOf("N1"), Neighbors: `["UAV-A-001-NODE","N2"]`, Position: `{"x":10,"y":10}`, Lat: 30.530, Lon: 114.330, Status: "ONLINE"},
		{NodeID: "N2", NodeType: "EDGE", SM9Identity: crypto.SM9IdentityOf("N2"), Neighbors: `["N1","N3"]`, Position: `{"x":20,"y":20}`, Lat: 30.548, Lon: 114.348, Status: "ONLINE"},
		{NodeID: "N3", NodeType: "EDGE", SM9Identity: crypto.SM9IdentityOf("N3"), Neighbors: `["N2","N4"]`, Position: `{"x":30,"y":30}`, Lat: 30.572, Lon: 114.372, Status: "ONLINE"},
		{NodeID: "N4", NodeType: "EDGE", SM9Identity: crypto.SM9IdentityOf("N4"), Neighbors: `["N3","MGR"]`, Position: `{"x":40,"y":40}`, Lat: 30.598, Lon: 114.398, Status: "ONLINE"},
		{NodeID: "MGR", NodeType: "MANAGEMENT", SM9Identity: crypto.SM9IdentityOf("MGR"), Neighbors: `["N4"]`, Position: `{"x":50,"y":50}`, Lat: 30.620, Lon: 114.420, Status: "ONLINE"},
		{NodeID: "NODE-X", NodeType: "ATTACKER", SM9Identity: crypto.SM9IdentityOf("NODE-X"), Neighbors: `[]`, Position: `{"x":1,"y":50}`, Lat: 30.556, Lon: 114.356, Status: "OFFLINE"},
		{NodeID: "NODE-Y", NodeType: "ATTACKER", SM9Identity: crypto.SM9IdentityOf("NODE-Y"), Neighbors: `[]`, Position: `{"x":99,"y":51}`, Lat: 30.640, Lon: 114.440, Status: "OFFLINE"},
	}
```

- [ ] **Step 8: 跑测试确认通过**

```bash
go test ./internal/api/ -run 'TestRouteCreateCoordinates|TestNodeRegisterLatLon|TestSeedRoutesAndNodesHaveCoords' -count=1 -v
```

预期：三个测试全 `--- PASS`。

- [ ] **Step 9: 全量回归 + vet**

```bash
go test ./... -count=1 && go vet ./...
```

预期：全部 `ok`，vet 无输出。（`go test ./...` 约 1-2 分钟，含 tests/ E2E 与 acceptance 24 例。）

- [ ] **Step 10: 提交**

```bash
git add internal/model/business.go internal/model/offchain.go internal/uavbusiness/masterdata.go internal/uavbusiness/geography_test.go internal/api/masterdata_handler.go internal/api/geography_handler_test.go internal/offchain/node.go internal/demo/seed.go
git commit -m "$(cat <<'EOF'
feat(backend): 地理域——航段/节点结构化经纬度与 seed 回填（spec §3.1）

- RouteSegment +start_lat/start_lon/end_lat/end_lon（0=未设），route/create 可选同名入参，
  缺省自动解析起终点内嵌 "NAME(lat,lon)"，解析失败保持 0 不报错，显式字段优先
- NetworkNode +lat/lon 可选；抽象 Position 保留，拓扑/Dijkstra/时延仿真零改动
- seed：5 条航路回填结构化坐标，8 个节点沿 R101→R205→R306 走廊赋经纬度

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 遥测域——模型/错误码/服务/SIM 自动驾驶/API/接线（spec §3.2）

**Files:**
- Create: `internal/model/uom.go`（TelemetryReport；Task 3/4 在此文件追加实名/执照模型）
- Modify: `internal/model/db.go`（AllModels +TelemetryReport）
- Modify: `internal/model/db_test.go`（表清单 +telemetry_reports）
- Modify: `internal/model/idgen.go`（+GenTelemetryID）
- Modify: `internal/errcode/errcode.go`（7xxx 三码一次加齐 + 包注释）
- Modify: `internal/api/errcode.go`（三个别名一次加齐）
- Create: `internal/offchain/telemetry.go`
- Create: `internal/offchain/telemetry_autopilot.go`
- Create: `internal/offchain/telemetry_test.go`
- Create: `internal/api/telemetry_handler.go`
- Create: `internal/api/telemetry_handler_test.go`
- Modify: `internal/api/router.go`（+3 行路由）
- Modify: `internal/config/config.go` + `internal/config/config_test.go`（TelemetryAutopilotMs）
- Modify: `cmd/server/main.go`（遥测 autopilot 接线）

**Interfaces:**
- Consumes（Task 1 产出）: `model.RouteSegment.StartLat/StartLon/EndLat/EndLon`。已有件：`offchain.loadSession(ctx, sessionID) (*model.OffchainSession, error)`（不存在→6002）、`s.logAudit(traceID, actor, action, targetType, targetID string, detail any)`（nil-safe）、offchain 测试助手 `newTestSvc(t) *Service`、`openTestSession(t, svc) string`、`errCodeOf(err) int`（node_test.go/message_test.go，同包直接复用）。
- Produces（后续任务依赖）:
  - `model.TelemetryReport`（表 telemetry_reports）与 `model.GenTelemetryID() string`（"TLM-"+12hex）。
  - `errcode.RealnameNotFound=7001 / errcode.LicenseInvalid=7002 / errcode.TelemetrySession=7003` 及 api 别名 `ErrRealnameNotFound/ErrLicenseInvalid/ErrTelemetrySession`（Task 3/4 直接消费，不再改这两个文件）。
  - `(*offchain.Service).ReportTelemetry(ctx, traceID string, req *TelemetryReportRequest) (*model.TelemetryReport, error)`、`TelemetryList(ctx, traceID string, q *TelemetryQuery) ([]model.TelemetryReport, int64, error)`、`LatestTelemetry(ctx, traceID string, req *TelemetryLatestRequest) (*model.TelemetryReport, error)`（无记录→`(nil, nil)`）。
  - `offchain.NewTelemetryAutopilot(svc *Service, intervalMs int) *TelemetryAutopilot`（svc==nil 或 intervalMs<=0 → nil）；`(*TelemetryAutopilot).Start()/Stop()/tick()`。
  - `config.Config.TelemetryAutopilotMs int`。
  - 路由：`POST /api/telemetry/report|list|latest`；响应 data 形状 `{telemetry}` / `{records,total,page,page_size}` / `{telemetry}`（可为 null）。

- [ ] **Step 1: 写失败的模型/服务层测试**

新建 `internal/offchain/telemetry_test.go`：

```go
package offchain

import (
	"context"
	"math"
	"testing"
	"time"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

func TestReportTelemetryLifecycle(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc) // ACTIVE 会话（UAV-A-001）

	// 上报两条：seq 服务端自增 1、2，Source=MANUAL
	tlm1, err := svc.ReportTelemetry(ctx, "TRACE-TLM-1", &TelemetryReportRequest{
		SessionID: sid, Lat: 30.52, Lon: 114.32, Alt: 85, Speed: 12, Heading: 45,
	})
	if err != nil {
		t.Fatalf("ReportTelemetry: %v", err)
	}
	if tlm1.Seq != 1 || tlm1.Source != "MANUAL" || tlm1.UAVID != "UAV-A-001" || tlm1.Lat != 30.52 {
		t.Errorf("tlm1 = %+v", tlm1)
	}
	if tlm1.TelemetryID[:4] != "TLM-" {
		t.Errorf("telemetry_id = %q, want TLM- 前缀", tlm1.TelemetryID)
	}
	if tlm1.ReportedAt.Before(timex.Now().Add(-time.Minute)) {
		t.Errorf("reported_at = %v, 应为当前时间", tlm1.ReportedAt)
	}
	tlm2, err := svc.ReportTelemetry(ctx, "TRACE-TLM-2", &TelemetryReportRequest{SessionID: sid, Lat: 30.53, Lon: 114.33})
	if err != nil {
		t.Fatalf("ReportTelemetry 2: %v", err)
	}
	if tlm2.Seq != 2 {
		t.Errorf("seq = %d, want 2（服务端自增）", tlm2.Seq)
	}

	// 不存在会话 → 6002（复用 loadSession）
	_, err = svc.ReportTelemetry(ctx, "TRACE-TLM-3", &TelemetryReportRequest{SessionID: "SESS-NOPE-001"})
	if errCodeOf(err) != errcode.Param {
		t.Errorf("unknown session err = %v, want 6002", err)
	}

	// 非 ACTIVE 会话 → 7003
	svc.db.Model(&model.OffchainSession{}).Where("session_id = ?", sid).Update("status", "CLOSED")
	_, err = svc.ReportTelemetry(ctx, "TRACE-TLM-4", &TelemetryReportRequest{SessionID: sid})
	if errCodeOf(err) != errcode.TelemetrySession {
		t.Errorf("closed session err = %v, want 7003", err)
	}
}


func TestTelemetryListAndLatest(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	for i := 0; i < 3; i++ {
		if _, err := svc.ReportTelemetry(ctx, "TRACE-TLM-L", &TelemetryReportRequest{
			SessionID: sid, Lat: 30.5 + float64(i)*0.01, Lon: 114.3,
		}); err != nil {
			t.Fatalf("report %d: %v", i, err)
		}
	}

	// 列表：session 过滤 + 分页归一化
	q := &TelemetryQuery{SessionID: sid, Page: 0, PageSize: 0}
	q.Normalize()
	rows, total, err := svc.TelemetryList(ctx, "TRACE-TLM-L", q)
	if err != nil {
		t.Fatalf("TelemetryList: %v", err)
	}
	if total != 3 || len(rows) != 3 || q.Page != 1 || q.PageSize != 20 {
		t.Errorf("list total=%d len=%d page=%d size=%d", total, len(rows), q.Page, q.PageSize)
	}
	// uav_id 过滤
	q2 := &TelemetryQuery{UAVID: "UAV-A-001"}
	q2.Normalize()
	_, total2, err := svc.TelemetryList(ctx, "TRACE-TLM-L", q2)
	if err != nil || total2 != 3 {
		t.Errorf("uav filter total=%d err=%v", total2, err)
	}

	// latest：按 session → seq 最大那条
	latest, err := svc.LatestTelemetry(ctx, "TRACE-TLM-L", &TelemetryLatestRequest{SessionID: sid})
	if err != nil {
		t.Fatalf("LatestTelemetry: %v", err)
	}
	if latest == nil || latest.Seq != 3 {
		t.Errorf("latest = %+v, want seq 3", latest)
	}
	// 无记录 → (nil, nil)（API 层 code=0 + telemetry:null）
	none, err := svc.LatestTelemetry(ctx, "TRACE-TLM-L", &TelemetryLatestRequest{UAVID: "UAV-NOPE"})
	if err != nil || none != nil {
		t.Errorf("no-record latest = (%v, %v), want (nil, nil)", none, err)
	}
	// 两个过滤都空 → 6002
	_, err = svc.LatestTelemetry(ctx, "TRACE-TLM-L", &TelemetryLatestRequest{})
	if errCodeOf(err) != errcode.Param {
		t.Errorf("empty latest err = %v, want 6002", err)
	}
}

func TestCorridorOf(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	svc.db.Create(&model.RouteSegment{
		RouteID: "R-C1", Zone: "Zone-T", StartPoint: "C1(30.500,114.300)", EndPoint: "C2(30.510,114.310)",
		StartLat: 30.500, StartLon: 114.300, EndLat: 30.510, EndLon: 114.310,
		AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN",
	})
	svc.db.Create(&model.RouteSegment{
		RouteID: "R-C2", Zone: "Zone-T", StartPoint: "C2(30.510,114.310)", EndPoint: "C3(30.520,114.320)",
		StartLat: 30.510, StartLon: 114.310, EndLat: 30.520, EndLon: 114.320,
		AltitudeMin: 100, AltitudeMax: 140, CorridorStatus: "OPEN",
	})
	svc.db.Create(&model.Mission{MissionID: "MISSION-C1", RouteSegments: `["R-C1","R-C2"]`, Status: "APPROVED"})

	wps, ok := svc.corridorOf(ctx, "MISSION-C1")
	if !ok {
		t.Fatal("corridorOf 应成功")
	}
	if len(wps) != 3 {
		t.Fatalf("waypoints = %d, want 3（相邻段共享点去重）", len(wps))
	}
	if wps[0].Alt != 90 || wps[1].Alt != 120 || wps[2].Alt != 120 {
		t.Errorf("高度带中值 = (%v,%v,%v), want (90,120,120)（共享点取后段）", wps[0].Alt, wps[1].Alt, wps[2].Alt)
	}
	// 任务不存在 → false
	if _, ok := svc.corridorOf(ctx, "MISSION-NOPE"); ok {
		t.Error("未知任务应 ok=false")
	}
	// 航段缺结构化坐标 → false（不造假）
	svc.db.Create(&model.RouteSegment{RouteID: "R-C0", Zone: "Zone-T", StartPoint: "S9", EndPoint: "E9", AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN"})
	svc.db.Create(&model.Mission{MissionID: "MISSION-C0", RouteSegments: `["R-C0"]`, Status: "APPROVED"})
	if _, ok := svc.corridorOf(ctx, "MISSION-C0"); ok {
		t.Error("缺坐标任务应 ok=false（跳过不造假）")
	}
}

func TestAdvanceOne(t *testing.T) {
	// 正北段 ~111m：(30.000,114.000) → (30.001,114.000)
	segLen := haversineM(30.000, 114.000, 30.001, 114.000)
	wps := []tlmWaypoint{{Lat: 30.000, Lon: 114.000, Alt: 80}, {Lat: 30.001, Lon: 114.000, Alt: 100}}

	// 半步 → 段中点，航向 ~0（正北）
	p := &tlmProgress{}
	lat, lon, alt, hd := advanceOne(p, wps, segLen/2)
	if math.Abs(lat-30.0005) > 1e-6 || math.Abs(lon-114.000) > 1e-9 {
		t.Errorf("中点 = (%v,%v), want (30.0005,114.000)", lat, lon)
	}
	if math.Abs(alt-90) > 1e-6 {
		t.Errorf("alt = %v, want 90（高度带插值）", alt)
	}
	if math.Abs(hd) > 0.5 && math.Abs(hd-360) > 0.5 {
		t.Errorf("正北 heading = %v, want ~0", hd)
	}

	// 步长超全程（单段）→ 循环回起点
	p2 := &tlmProgress{}
	lat2, _, _, _ := advanceOne(p2, wps, segLen*1.5)
	if p2.SegIdx != 0 || p2.Frac != 0 || lat2 != wps[0].Lat {
		t.Errorf("wrap = (%v, %+v), want 回到起点", lat2, p2)
	}

	// 两段等长各 ~111m，步长 1.5 段 → 落在第二段 frac≈0.5（跨段结转）
	wps3 := []tlmWaypoint{{Lat: 30.000, Lon: 114.000, Alt: 80}, {Lat: 30.001, Lon: 114.000, Alt: 80}, {Lat: 30.002, Lon: 114.000, Alt: 80}}
	p3 := &tlmProgress{}
	lat3, _, _, _ := advanceOne(p3, wps3, segLen*1.5)
	if p3.SegIdx != 1 {
		t.Errorf("segIdx = %d, want 1", p3.SegIdx)
	}
	if math.Abs(lat3-30.0015) > 1e-6 {
		t.Errorf("lat3 = %v, want ~30.0015", lat3)
	}
}

func TestTelemetryAutopilotTick(t *testing.T) {
	svc := newTestSvc(t)
	sid := openTestSession(t, svc)
	// 走廊 R-T1：(30.500,114.300)→(30.510,114.310)，高度带 60–120（中值 90）
	svc.db.Create(&model.RouteSegment{
		RouteID: "R-T1", Zone: "Zone-T", StartPoint: "T-START(30.500,114.300)", EndPoint: "T-END(30.510,114.310)",
		StartLat: 30.500, StartLon: 114.300, EndLat: 30.510, EndLon: 114.310,
		AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN",
	})
	svc.db.Create(&model.Mission{MissionID: "MISSION-T1", OperatorID: "Operator-A", UAVID: "UAV-A-001", MissionType: "POWER_INSPECTION", RouteSegments: `["R-T1"]`, AltitudeMin: 60, AltitudeMax: 120, Status: "APPROVED"})
	svc.db.Model(&model.OffchainSession{}).Where("session_id = ?", sid).Update("mission_id", "MISSION-T1")

	ap := NewTelemetryAutopilot(svc, 1000) // 1s 间隔 → 每 tick 步长 12m
	ap.tick()
	var rows []model.TelemetryReport
	svc.db.Where("session_id = ?", sid).Order("seq ASC").Find(&rows)
	if len(rows) != 1 {
		t.Fatalf("tick 后行数 = %d, want 1", len(rows))
	}
	if rows[0].Seq != 1 || rows[0].Source != "SIM" || rows[0].MissionID != "MISSION-T1" || rows[0].UAVID != "UAV-A-001" {
		t.Errorf("row = %+v", rows[0])
	}
	if rows[0].Alt != 90 {
		t.Errorf("alt = %v, want 90（高度带中值）", rows[0].Alt)
	}
	if rows[0].Lat < 30.500 || rows[0].Lat > 30.510 {
		t.Errorf("lat = %v 不在走廊内", rows[0].Lat)
	}
	// 第二次 tick：seq 单调递增且向东北推进
	ap.tick()
	svc.db.Where("session_id = ?", sid).Order("seq ASC").Find(&rows)
	if len(rows) != 2 || rows[1].Seq != 2 {
		t.Fatalf("二次 tick 后 = %+v", rows)
	}
	if rows[1].Lat <= rows[0].Lat {
		t.Errorf("未推进: %v -> %v", rows[0].Lat, rows[1].Lat)
	}
	// 会话 CLOSED → 停止推进 + progress 清理
	svc.db.Model(&model.OffchainSession{}).Where("session_id = ?", sid).Update("status", "CLOSED")
	ap.tick()
	var cnt int64
	svc.db.Model(&model.TelemetryReport{}).Where("session_id = ?", sid).Count(&cnt)
	if cnt != 2 {
		t.Errorf("CLOSED 后仍推进: %d 行, want 2", cnt)
	}
	ap.mu.Lock()
	n := len(ap.progress)
	ap.mu.Unlock()
	if n != 0 {
		t.Errorf("progress 未清理: %d 项", n)
	}
}

func TestTelemetryAutopilotSkipsMissionWithoutCoords(t *testing.T) {
	svc := newTestSvc(t)
	sid := openTestSession(t, svc)
	svc.db.Create(&model.RouteSegment{RouteID: "R-T0", Zone: "Zone-T", StartPoint: "S9", EndPoint: "E9", AltitudeMin: 60, AltitudeMax: 120, CorridorStatus: "OPEN"})
	svc.db.Create(&model.Mission{MissionID: "MISSION-T0", RouteSegments: `["R-T0"]`, Status: "APPROVED"})
	svc.db.Model(&model.OffchainSession{}).Where("session_id = ?", sid).Update("mission_id", "MISSION-T0")

	ap := NewTelemetryAutopilot(svc, 1000)
	ap.tick()
	var cnt int64
	svc.db.Model(&model.TelemetryReport{}).Where("session_id = ?", sid).Count(&cnt)
	if cnt != 0 {
		t.Errorf("缺坐标任务不得生成假遥测, got %d 行", cnt)
	}
}

func TestNewTelemetryAutopilotNilSafety(t *testing.T) {
	svc := newTestSvc(t)
	if NewTelemetryAutopilot(nil, 1000) != nil {
		t.Error("svc=nil 应返回 nil")
	}
	if NewTelemetryAutopilot(svc, 0) != nil {
		t.Error("intervalMs=0 应返回 nil（测试恒关闭）")
	}
	if NewTelemetryAutopilot(svc, -5) != nil {
		t.Error("负值应返回 nil（显式关闭）")
	}
	var ap *TelemetryAutopilot
	ap.Start() // nil-receiver 不得 panic
	ap.Stop()
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
go test ./internal/offchain/ -run 'Telemetry|Corridor|AdvanceOne' -count=1
```

预期：**FAIL（build failed）**——`undefined: TelemetryReportRequest / NewTelemetryAutopilot / tlmWaypoint / haversineM / advanceOne`、`errcode.TelemetrySession undefined`、`model.TelemetryReport undefined` 等。

- [ ] **Step 3: 实现模型 + 错误码**

3a. 新建 `internal/model/uom.go`：

```go
package model

import "skytrust-backend/internal/timex"

// 本文件承载 UOM（民用无人驾驶航空器综合管理平台）扩展域模型（spec §3.2-§3.4）：
// 遥测上报、实名登记主体、操控员执照。全部为纯加法新表，注册进 AllModels()。

// TelemetryReport 遥测上报记录（spec §3.2）：人工上报（Source=MANUAL）或 SIM 自动驾驶推进（Source=SIM）。
// (session_id, seq) 组合唯一——seq 由服务端按会话自增，客户端不传。
type TelemetryReport struct {
	TelemetryID string     `gorm:"primaryKey;size:64" json:"telemetry_id"` // TLM- 前缀
	SessionID   string     `gorm:"size:64;index;uniqueIndex:idx_tlm_session_seq" json:"session_id"`
	MissionID   string     `gorm:"size:64;index" json:"mission_id"`
	UAVID       string     `gorm:"size:64;index" json:"uav_id"`
	Seq         int64      `gorm:"uniqueIndex:idx_tlm_session_seq" json:"seq"`
	Lat         float64    `json:"lat"`
	Lon         float64    `json:"lon"`
	Alt         float64    `json:"alt"`
	Speed       float64    `json:"speed"`
	Heading     float64    `json:"heading"` // 度，正北顺时针 [0,360)
	ReportedAt  timex.Time `json:"reported_at"`
	Source      string     `gorm:"size:16" json:"source"` // SIM | MANUAL
	CreatedAt   timex.Time `json:"created_at"`
}
```

3b. `internal/model/db.go` —— AllModels() 中 `&OffchainMessage{}, &WormholeEvent{},` 行改为：

```go
		&NetworkNode{}, &OffchainSession{}, &OffchainMessage{}, &TelemetryReport{}, &WormholeEvent{},
```

3c. `internal/model/db_test.go` —— TestOpenMemoryAndMigrate 的表清单字面量（第 21-23 行附近）改为：

```go
	for _, want := range []string{"manufacturers", "uavs", "missions", "crosschain_txes",
		"flight_passes", "network_nodes", "offchain_messages", "telemetry_reports", "security_events",
		"identity_mappings", "regulatory_auths", "regulatory_audits", "experiment_runs", "audit_logs"} {
```

3d. `internal/model/idgen.go` —— 在 `func IdempotencyKey(` 之前插入：

```go
func GenTelemetryID() string { return "TLM-" + randHex(12) }
```

3e. `internal/errcode/errcode.go` —— 包注释首行改为：

```go
// Package errcode 业务错误码唯一真源（分段：1xxx 身份/商密，2xxx 跨链，
// 3xxx 任务/许可/审核，4xxx 链下/虫洞，5xxx 监管/授权，6xxx 实验/参数，
// 7xxx UOM 登记/遥测，9001 内部）。
```

常量块中 `Experiment = 6001 / Param = 6002` 之后、`Internal = 9001` 之前插入：

```go
	RealnameNotFound = 7001 // 实名主体不存在
	LicenseInvalid   = 7002 // 执照不存在或已过期
	TelemetrySession = 7003 // 遥测上报会话状态错误（需 ACTIVE）
```

3f. `internal/api/errcode.go` —— 别名块 `ErrExperiment/ErrParam` 之后、`ErrInternal` 之前插入：

```go
	ErrRealnameNotFound = errcode.RealnameNotFound
	ErrLicenseInvalid   = errcode.LicenseInvalid
	ErrTelemetrySession = errcode.TelemetrySession
```

- [ ] **Step 4: 实现遥测服务**

新建 `internal/offchain/telemetry.go`：

```go
package offchain

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// TelemetryReportRequest 人工遥测上报请求（spec §3.2）：seq 服务端自增，客户端不传。
type TelemetryReportRequest struct {
	SessionID string  `json:"session_id" binding:"required"`
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	Alt       float64 `json:"alt"`
	Speed     float64 `json:"speed"`
	Heading   float64 `json:"heading"`
}

// ReportTelemetry 人工遥测上报：会话不存在→6002（复用 loadSession）；非 ACTIVE→7003；
// Source=MANUAL，落库后写审计（SIM 推进不写审计，避免高频刷屏）。
func (s *Service) ReportTelemetry(ctx context.Context, traceID string, req *TelemetryReportRequest) (*model.TelemetryReport, error) {
	sess, err := s.loadSession(ctx, req.SessionID)
	if err != nil {
		return nil, err
	}
	if sess.Status != "ACTIVE" {
		return nil, errcode.NewError(errcode.TelemetrySession, "会话 %s 状态 %q 不可上报遥测（需 ACTIVE）", sess.SessionID, sess.Status)
	}
	tlm, err := s.insertTelemetry(ctx, sess, req.Lat, req.Lon, req.Alt, req.Speed, req.Heading, "MANUAL")
	if err != nil {
		return nil, err
	}
	s.logAudit(traceID, sess.UAVID, "TELEMETRY_REPORT", "TELEMETRY", tlm.TelemetryID, map[string]any{
		"session_id": sess.SessionID, "seq": tlm.Seq, "source": tlm.Source,
		"position": []float64{tlm.Lat, tlm.Lon, tlm.Alt},
	})
	return tlm, nil
}

// insertTelemetry 人工上报与 SIM 推进共用的落库出口：seq 按会话自增（首条=1）。
func (s *Service) insertTelemetry(ctx context.Context, sess *model.OffchainSession, lat, lon, alt, speed, heading float64, source string) (*model.TelemetryReport, error) {
	var last model.TelemetryReport
	seq := int64(1)
	err := s.db.WithContext(ctx).Where("session_id = ?", sess.SessionID).Order("seq DESC").First(&last).Error
	switch {
	case err == nil:
		seq = last.Seq + 1
	case errors.Is(err, gorm.ErrRecordNotFound):
		// 首条：seq=1
	default:
		return nil, errcode.NewError(errcode.Internal, "telemetry seq lookup: %v", err)
	}
	tlm := &model.TelemetryReport{
		TelemetryID: model.GenTelemetryID(), SessionID: sess.SessionID,
		MissionID: sess.MissionID, UAVID: sess.UAVID, Seq: seq,
		Lat: lat, Lon: lon, Alt: alt, Speed: speed, Heading: heading,
		ReportedAt: timex.NowT(), Source: source,
	}
	if err := s.db.WithContext(ctx).Create(tlm).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "create telemetry: %v", err)
	}
	return tlm, nil
}

// TelemetryQuery 遥测列表过滤 + 分页（同 SessionQuery 形状）。
type TelemetryQuery struct {
	SessionID string `json:"session_id"`
	UAVID     string `json:"uav_id"`
	Page      int    `json:"page"`
	PageSize  int    `json:"page_size"`
}

// Normalize 分页归一化（Constraint 10 同款）。
func (q *TelemetryQuery) Normalize() {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 {
		q.PageSize = 20
	}
	if q.PageSize > 200 {
		q.PageSize = 200
	}
}

// TelemetryList 按 session_id/uav_id 过滤分页，reported_at 降序。
func (s *Service) TelemetryList(ctx context.Context, traceID string, q *TelemetryQuery) ([]model.TelemetryReport, int64, error) {
	db := s.db.WithContext(ctx).Model(&model.TelemetryReport{})
	if q.SessionID != "" {
		db = db.Where("session_id = ?", q.SessionID)
	}
	if q.UAVID != "" {
		db = db.Where("uav_id = ?", q.UAVID)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.TelemetryReport
	if err := db.Order("reported_at DESC, seq DESC").
		Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&out).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}

// TelemetryLatestRequest 最新遥测查询：session_id / uav_id 至少提供一个。
type TelemetryLatestRequest struct {
	SessionID string `json:"session_id"`
	UAVID     string `json:"uav_id"`
}

// LatestTelemetry 返回最新一条遥测；无记录 → (nil, nil)（API 层回 code=0 + telemetry:null，spec §3.2）。
func (s *Service) LatestTelemetry(ctx context.Context, traceID string, req *TelemetryLatestRequest) (*model.TelemetryReport, error) {
	if req.SessionID == "" && req.UAVID == "" {
		return nil, errcode.NewError(errcode.Param, "session_id/uav_id 至少提供一个")
	}
	db := s.db.WithContext(ctx).Model(&model.TelemetryReport{})
	if req.SessionID != "" {
		db = db.Where("session_id = ?", req.SessionID)
	}
	if req.UAVID != "" {
		db = db.Where("uav_id = ?", req.UAVID)
	}
	var tlm model.TelemetryReport
	err := db.Order("reported_at DESC, seq DESC").First(&tlm).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "latest telemetry: %v", err)
	}
	return &tlm, nil
}
```

- [ ] **Step 5: 实现 SIM 遥测自动驾驶**

新建 `internal/offchain/telemetry_autopilot.go`（结构镜像 autopilot.go:12-81 的 Autopilot）：

```go
package offchain

import (
	"context"
	"encoding/json"
	"math"
	"sync"
	"time"

	"skytrust-backend/internal/model"
)

// telemetrySimSpeedMPS SIM 推进巡航速度（米/秒），与演示轨迹速度同量级（seed.go NormalTrajectory ≈12）。
const telemetrySimSpeedMPS = 12.0

// TelemetryAutopilot 遥测 SIM 自动驾驶（spec §3.2，仿 autopilot.go 结构与生命周期语义）：
// 每 tick 为全部 ACTIVE 会话沿任务航路经纬度链按 速度×间隔 插值推进一条遥测（Source=SIM）。
// 任务缺结构化坐标的会话跳过（不造假坐标）；DEGRADED/CLOSED 会话不推进并清理进度。
// TELEMETRY_AUTOPILOT_MS 语义同 OFFCHAIN_AUTOPILOT_MS：测试 0=关闭；生产 main.go 0→2000；负值=显式关闭。
type TelemetryAutopilot struct {
	svc      *Service
	interval time.Duration

	mu       sync.Mutex
	progress map[string]*tlmProgress // session_id → 推进进度

	stop chan struct{}
	done chan struct{}
	once sync.Once
}

// tlmProgress 推进进度：第 SegIdx 段（wps[SegIdx]→wps[SegIdx+1]）上的分数 Frac∈[0,1)。
type tlmProgress struct {
	SegIdx int
	Frac   float64
}

// tlmWaypoint 走廊航点：经纬度 + 高度（所在航段高度带中值）。
type tlmWaypoint struct {
	Lat float64
	Lon float64
	Alt float64
}

// NewTelemetryAutopilot svc 为 nil 或 intervalMs<=0 时返回 nil（同 NewAutopilot 的 nil-safe 语义）。
func NewTelemetryAutopilot(svc *Service, intervalMs int) *TelemetryAutopilot {
	if svc == nil || intervalMs <= 0 {
		return nil
	}
	return &TelemetryAutopilot{
		svc:      svc,
		interval: time.Duration(intervalMs) * time.Millisecond,
		progress: map[string]*tlmProgress{},
		stop:     make(chan struct{}),
		done:     make(chan struct{}),
	}
}

// Start 启动后台循环；nil 接收者安全（接线处可无脑调用）。
func (a *TelemetryAutopilot) Start() {
	if a == nil {
		return
	}
	go a.loop()
}

// Stop 幂等停止并等待循环退出（once + done chan，同 Autopilot.Stop）。
func (a *TelemetryAutopilot) Stop() {
	if a == nil {
		return
	}
	a.once.Do(func() { close(a.stop) })
	<-a.done
}

func (a *TelemetryAutopilot) loop() {
	defer close(a.done)
	ticker := time.NewTicker(a.interval)
	defer ticker.Stop()
	for {
		select {
		case <-a.stop:
			return
		case <-ticker.C:
			a.tick()
		}
	}
}

// tick 单轮推进：逐会话 best-effort，单会话失败不影响其他（同 autopilot.tick 形状）。
func (a *TelemetryAutopilot) tick() {
	ctx := context.Background()
	var sessions []model.OffchainSession
	if err := a.svc.db.WithContext(ctx).Where("status = ?", "ACTIVE").Find(&sessions).Error; err != nil {
		return
	}
	stepM := telemetrySimSpeedMPS * a.interval.Seconds()
	alive := make(map[string]bool, len(sessions))
	for i := range sessions {
		sess := sessions[i]
		alive[sess.SessionID] = true
		if sess.MissionID == "" {
			continue
		}
		wps, ok := a.svc.corridorOf(ctx, sess.MissionID)
		if !ok {
			continue // 任务缺结构化坐标：跳过，不造假（spec §3.2）
		}
		a.mu.Lock()
		p := a.progress[sess.SessionID]
		if p == nil {
			p = &tlmProgress{}
			a.progress[sess.SessionID] = p
		}
		lat, lon, alt, heading := advanceOne(p, wps, stepM)
		a.mu.Unlock()
		// best-effort：落库失败（降级/关闭竞态）静默跳过，下一轮自然停止
		_, _ = a.svc.insertTelemetry(ctx, &sess, lat, lon, alt, telemetrySimSpeedMPS, heading, "SIM")
	}
	// 清理非 ACTIVE 会话的推进进度，防 map 泄漏
	a.mu.Lock()
	for id := range a.progress {
		if !alive[id] {
			delete(a.progress, id)
		}
	}
	a.mu.Unlock()
}

// corridorOf 由任务航路构建走廊航点链（相邻重复点去重，高度=航段高度带中值，共享点取后段）。
// 任务不存在/无航段/任一航段缺结构化坐标 → ok=false（spec §3.2：跳过不造假）。
// 域隔离（service.go P3-3）：直接读 model，不 import uavbusiness/crosschain。
func (s *Service) corridorOf(ctx context.Context, missionID string) ([]tlmWaypoint, bool) {
	var m model.Mission
	if err := s.db.WithContext(ctx).Where("mission_id = ?", missionID).First(&m).Error; err != nil {
		return nil, false
	}
	var segIDs []string
	if err := json.Unmarshal([]byte(m.RouteSegments), &segIDs); err != nil || len(segIDs) == 0 {
		return nil, false
	}
	var routes []model.RouteSegment
	if err := s.db.WithContext(ctx).Where("route_id IN ?", segIDs).Find(&routes).Error; err != nil {
		return nil, false
	}
	byID := make(map[string]model.RouteSegment, len(routes))
	for _, r := range routes {
		byID[r.RouteID] = r
	}
	var wps []tlmWaypoint
	appendWP := func(lat, lon, alt float64) {
		if n := len(wps); n > 0 && wps[n-1].Lat == lat && wps[n-1].Lon == lon {
			wps[n-1].Alt = alt // 两段共享点：取后段高度带
			return
		}
		wps = append(wps, tlmWaypoint{Lat: lat, Lon: lon, Alt: alt})
	}
	for _, id := range segIDs {
		r, ok := byID[id]
		if !ok {
			return nil, false
		}
		if r.StartLat == 0 && r.StartLon == 0 && r.EndLat == 0 && r.EndLon == 0 {
			return nil, false // 缺坐标段 → 该会话跳过
		}
		alt := (r.AltitudeMin + r.AltitudeMax) / 2
		appendWP(r.StartLat, r.StartLon, alt)
		appendWP(r.EndLat, r.EndLon, alt)
	}
	if len(wps) < 2 {
		return nil, false
	}
	return wps, true
}

// advanceOne 沿航点链把进度 p 推进 stepM 米（纯函数，可单测）：
// 返回插值经纬度/高度 + 航向（当前段首→尾方位角，度，正北顺时针 [0,360)）。
// 跨段结转剩余距离；飞完全程循环回起点（演示连续飞行，seq 仍由落库方单调递增）。
func advanceOne(p *tlmProgress, wps []tlmWaypoint, stepM float64) (lat, lon, alt, heading float64) {
	nSeg := len(wps) - 1
	if nSeg < 1 {
		return wps[0].Lat, wps[0].Lon, wps[0].Alt, 0
	}
	if p.SegIdx < 0 || p.SegIdx >= nSeg {
		p.SegIdx, p.Frac = 0, 0
	}
	remain := stepM
	for guard := 0; guard <= nSeg+1 && remain > 0; guard++ { // 至多推进一整圈，防零长段死循环
		a, b := wps[p.SegIdx], wps[p.SegIdx+1]
		length := haversineM(a.Lat, a.Lon, b.Lat, b.Lon)
		if length <= 0 { // 零长段：跳过
			if p.SegIdx == nSeg-1 {
				p.SegIdx, p.Frac = 0, 0
			} else {
				p.SegIdx++
				p.Frac = 0
			}
			continue
		}
		frac := p.Frac + remain/length
		if frac < 1 {
			p.Frac = frac
			break
		}
		remain -= (1 - p.Frac) * length
		if p.SegIdx == nSeg-1 { // 飞完全程 → 循环回起点（余程舍弃，演示语义）
			p.SegIdx, p.Frac = 0, 0
			break
		}
		p.SegIdx++
		p.Frac = 0
	}
	a, b := wps[p.SegIdx], wps[p.SegIdx+1]
	lat = a.Lat + (b.Lat-a.Lat)*p.Frac
	lon = a.Lon + (b.Lon-a.Lon)*p.Frac
	alt = a.Alt + (b.Alt-a.Alt)*p.Frac
	heading = bearingDeg(a.Lat, a.Lon, b.Lat, b.Lon)
	return
}

// haversineM 两点大圆距离（米），R=6371000。
func haversineM(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	s := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*math.Sin(dLon/2)*math.Sin(dLon/2)
	return 2 * R * math.Asin(math.Sqrt(s))
}

// bearingDeg 点 1→点 2 初始方位角（度，正北顺时针 [0,360)）。
func bearingDeg(lat1, lon1, lat2, lon2 float64) float64 {
	phi1, phi2 := lat1*math.Pi/180, lat2*math.Pi/180
	dLambda := (lon2 - lon1) * math.Pi / 180
	y := math.Sin(dLambda) * math.Cos(phi2)
	x := math.Cos(phi1)*math.Sin(phi2) - math.Sin(phi1)*math.Cos(phi2)*math.Cos(dLambda)
	deg := math.Atan2(y, x) * 180 / math.Pi
	return math.Mod(deg+360, 360)
}
```

- [ ] **Step 6: 跑 offchain 测试确认通过**

```bash
go test ./internal/offchain/ ./internal/model/ -count=1
```

预期：`ok skytrust-backend/internal/offchain`、`ok skytrust-backend/internal/model`。

- [ ] **Step 7: 实现 API handler + 路由**

7a. 新建 `internal/api/telemetry_handler.go`：

```go
package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/offchain"
)

// telemetryReportHandler POST /api/telemetry/report —— data={telemetry}；
// 会话不存在→6002；非 ACTIVE→7003（spec §3.2）。
func telemetryReportHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.TelemetryReportRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		tlm, err := deps.Offchain.ReportTelemetry(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"telemetry": tlm})
	}
}

// telemetryListHandler POST /api/telemetry/list —— data={records,total,page,page_size}。
func telemetryListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var q offchain.TelemetryQuery
		if !bindOptionalBody(c, &q) { // 全字段可选：空体合法；格式错→6002
			return
		}
		q.Normalize()
		records, total, err := deps.Offchain.TelemetryList(c.Request.Context(), TraceIDFrom(c), &q)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": q.Page, "page_size": q.PageSize})
	}
}

// telemetryLatestHandler POST /api/telemetry/latest —— data={telemetry}；
// 无记录 → code=0 + telemetry:null（spec §3.2）。
func telemetryLatestHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req offchain.TelemetryLatestRequest
		if !bindOptionalBody(c, &req) {
			return
		}
		tlm, err := deps.Offchain.LatestTelemetry(c.Request.Context(), TraceIDFrom(c), &req)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"telemetry": tlm})
	}
}
```

7b. `internal/api/router.go` —— 在 `api.POST("/message/list", messageListHandler(deps))` 行之后插入：

```go
		api.POST("/telemetry/report", telemetryReportHandler(deps))
		api.POST("/telemetry/list", telemetryListHandler(deps))
		api.POST("/telemetry/latest", telemetryLatestHandler(deps))
```

- [ ] **Step 8: 写失败的 API 层测试**

新建 `internal/api/telemetry_handler_test.go`：

```go
package api

import (
	"testing"
)

func TestTelemetryEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	open := postJSON(t, r, "/api/session/open", map[string]any{"uav_id": "UAV-A-001"})
	if open["code"].(float64) != 0 {
		t.Fatalf("session/open: %v", open)
	}
	sid := open["data"].(map[string]any)["session"].(map[string]any)["session_id"].(string)

	// report：seq 服务端自增，Source=MANUAL
	rep := postJSON(t, r, "/api/telemetry/report", map[string]any{
		"session_id": sid, "lat": 30.52, "lon": 114.32, "alt": 85, "speed": 12, "heading": 45,
	})
	if rep["code"].(float64) != 0 {
		t.Fatalf("telemetry/report: %v", rep)
	}
	tlm := rep["data"].(map[string]any)["telemetry"].(map[string]any)
	if tlm["seq"].(float64) != 1 || tlm["source"] != "MANUAL" || tlm["uav_id"] != "UAV-A-001" {
		t.Errorf("telemetry = %v", tlm)
	}
	rep2 := postJSON(t, r, "/api/telemetry/report", map[string]any{"session_id": sid, "lat": 30.53, "lon": 114.33})
	if rep2["data"].(map[string]any)["telemetry"].(map[string]any)["seq"].(float64) != 2 {
		t.Errorf("第二条 seq = %v, want 2", rep2["data"])
	}
	// report 缺 session_id → 6002（binding required）
	if resp := postJSON(t, r, "/api/telemetry/report", map[string]any{"lat": 1}); resp["code"].(float64) != 6002 {
		t.Errorf("缺 session_id = %v, want 6002", resp)
	}

	// list：session 过滤 + 分页回显
	lst := postJSON(t, r, "/api/telemetry/list", map[string]any{"session_id": sid})
	d := lst["data"].(map[string]any)
	if d["total"].(float64) != 2 || d["page"].(float64) != 1 || d["page_size"].(float64) != 20 {
		t.Errorf("list = %v", d)
	}

	// latest：按 session → seq 2
	lt := postJSON(t, r, "/api/telemetry/latest", map[string]any{"session_id": sid})
	if lt["data"].(map[string]any)["telemetry"].(map[string]any)["seq"].(float64) != 2 {
		t.Errorf("latest = %v", lt["data"])
	}
	// latest 无记录 → code=0 + telemetry:null
	ln := postJSON(t, r, "/api/telemetry/latest", map[string]any{"uav_id": "UAV-NOPE"})
	if ln["code"].(float64) != 0 || ln["data"].(map[string]any)["telemetry"] != nil {
		t.Errorf("无记录 latest = %v, want code 0 + telemetry null", ln)
	}
	// latest 两个过滤都空 → 6002
	if resp := postJSON(t, r, "/api/telemetry/latest", map[string]any{}); resp["code"].(float64) != 6002 {
		t.Errorf("空过滤 latest = %v, want 6002", resp)
	}

	// 关闭会话后上报 → 7003
	if resp := postJSON(t, r, "/api/session/close", map[string]any{"session_id": sid, "operator": "OP-1", "reason": "测试完毕"}); resp["code"].(float64) != 0 {
		t.Fatalf("session/close: %v", resp)
	}
	if resp := postJSON(t, r, "/api/telemetry/report", map[string]any{"session_id": sid, "lat": 30.54}); resp["code"].(float64) != 7003 {
		t.Errorf("closed session report = %v, want 7003", resp)
	}
}
```

- [ ] **Step 9: 跑 API 测试确认通过**

```bash
go test ./internal/api/ -run TestTelemetryEndpoints -count=1 -v
```

预期：`--- PASS: TestTelemetryEndpoints`。（若 Step 7 未做，此步先确认 FAIL 再实现——本计划 Step 7 已先行实现，故直接 PASS；如你按严格 TDD 顺序执行，可将 Step 8 提到 Step 7 之前并先跑一次确认 FAIL。）

- [ ] **Step 10: config + main.go 接线（含测试）**

10a. `internal/config/config_test.go` 末尾追加（确认文件 import 含 `"os"`，若无则补）：

```go
func TestTelemetryAutopilotMs(t *testing.T) {
	os.Unsetenv("TELEMETRY_AUTOPILOT_MS")
	if got := Load().TelemetryAutopilotMs; got != 0 {
		t.Errorf("默认 TelemetryAutopilotMs = %d, want 0（测试恒关闭）", got)
	}
	t.Setenv("TELEMETRY_AUTOPILOT_MS", "1500")
	if got := Load().TelemetryAutopilotMs; got != 1500 {
		t.Errorf("TelemetryAutopilotMs = %d, want 1500", got)
	}
	t.Setenv("TELEMETRY_AUTOPILOT_MS", "not-a-number")
	if got := Load().TelemetryAutopilotMs; got != 0 {
		t.Errorf("非法值 TelemetryAutopilotMs = %d, want 0", got)
	}
}
```

10b. `internal/config/config.go` —— Config 结构体 `OffchainAutopilotMs` 行后加：

```go
	TelemetryAutopilotMs int // TELEMETRY_AUTOPILOT_MS：遥测 SIM 推进间隔(ms)，默认 0=关闭，非法值→0（语义同 OFFCHAIN_AUTOPILOT_MS）
```

Load() 中 `autopilotMs := 0 ...` 块后加：

```go
	telemetryMs := 0
	if v, err := strconv.Atoi(getEnv("TELEMETRY_AUTOPILOT_MS", "0")); err == nil {
		telemetryMs = v
	}
```

返回的 &Config{...} 中 `OffchainAutopilotMs: autopilotMs,` 行后加：

```go
		TelemetryAutopilotMs: telemetryMs,
```

10c. `cmd/server/main.go` —— 在 offchain autopilot 块（`if ap := offchain.NewAutopilot(off, autopilotMs); ap != nil { ... }`）之后插入：

```go
	telemetryMs := cfg.TelemetryAutopilotMs
	if telemetryMs == 0 {
		telemetryMs = 2000 // 语义同 OFFCHAIN：0=未设→生产默认 2000ms；TELEMETRY_AUTOPILOT_MS 设负值 = 显式关闭
	}
	if tap := offchain.NewTelemetryAutopilot(off, telemetryMs); tap != nil {
		tap.Start()
		defer tap.Stop()
	}
```

- [ ] **Step 11: 全量回归 + vet**

```bash
go test ./... -count=1 && go vet ./...
```

预期：全部 `ok`。特别确认 `internal/config`、`tests`（apifox 回放此时仍是 64 端点表，新路由不在表内、不受影响）全绿。

- [ ] **Step 12: 提交**

```bash
git add internal/model/uom.go internal/model/db.go internal/model/db_test.go internal/model/idgen.go internal/errcode/errcode.go internal/api/errcode.go internal/offchain/telemetry.go internal/offchain/telemetry_autopilot.go internal/offchain/telemetry_test.go internal/api/telemetry_handler.go internal/api/telemetry_handler_test.go internal/api/router.go internal/config/config.go internal/config/config_test.go cmd/server/main.go
git commit -m "$(cat <<'EOF'
feat(backend): 遥测域——人工上报/列表/最新 + SIM 自动驾驶推进（spec §3.2）

- 新表 telemetry_reports（TLM- 前缀，(session_id,seq) 组合唯一，seq 服务端自增）
- telemetry/report（非 ACTIVE→7003）/list（session_id/uav_id 过滤分页）/latest（无记录 code=0+telemetry:null）
- TelemetryAutopilot 仿 offchain autopilot：每 tick 沿任务航路经纬度链插值推进，
  高度取航段高度带中值、航向取段方位角、飞完全程循环回起点；缺坐标跳过不造假；
  TELEMETRY_AUTOPILOT_MS 语义同 OFFCHAIN（测试恒 0，生产 0→2000）
- errcode 新增 7xxx 段：7001 RealnameNotFound / 7002 LicenseInvalid / 7003 TelemetrySession（含 api 别名）
- 端点 64→67（apidoc 表契约同步在后续任务统一处理）

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 实名域——实名登记 + UAV 注册标志/关联（spec §3.3）

**Files:**
- Modify: `internal/model/uom.go`（追加 RealnameSubject）
- Modify: `internal/model/identity.go`（UAV +RegistrationMark/+RealnameID）
- Modify: `internal/model/db.go`（AllModels +RealnameSubject）
- Modify: `internal/model/db_test.go`（表清单 +realname_subjects）
- Modify: `internal/model/idgen.go`（+GenSubjectID/+GenRegistrationMark；import +encoding/binary,+fmt）
- Modify: `internal/demo/seed.go`（7 架种子 UAV 回填字面量注册标志——uniqueIndex 要求同库内 '' 不得重复）
- Create: `internal/uavbusiness/realname.go`
- Modify: `internal/uavbusiness/uav.go`（UAVInput+校验+标志生成+tx 字段+UNIQUE 分支）
- Create: `internal/api/uom_handler.go`（realname 三 handler；Task 4 在同文件追加 pilot）
- Modify: `internal/api/uav_handler.go`（req +realname_id 透传）
- Modify: `internal/api/router.go`（+3 行路由）
- Test: `internal/uavbusiness/realname_test.go`（新建）
- Test: `internal/api/uom_handler_test.go`（新建）

**Interfaces:**
- Consumes: `testSvc(t)`、`testSvcFull(t)`、`codeOf(err) int`（uavbusiness 既有测试助手，masterdata_test.go / uav_test.go）；Task 2 加好的 `errcode.RealnameNotFound=7001` 与 `ErrRealnameNotFound` 别名；`postJSON/validTestDeps/NewRouter`。
- Produces（后续任务依赖）:
  - `model.RealnameSubject`（表 realname_subjects）；`model.GenSubjectID()`（"RNS-"+12hex）；`model.GenRegistrationMark()`（"UAS-"+8 位数字）。
  - `uavbusiness.RealnameInput{SubjectType,Name,IdNumber,Contact string}`；`(*Service).RegisterRealname(ctx, traceID string, in RealnameInput) (*model.RealnameSubject, error)`；`RealnameListFilter{SubjectType string; Page,PageSize int}`；`ListRealname(...) ([]model.RealnameSubject, int64, error)`；`QueryRealname(ctx, traceID, subjectID string) (*model.RealnameSubject, error)`（不存在→7001，空 ID→6002）。
  - `uavbusiness.UAVInput` 新字段 `RealnameID string`；`model.UAV` 新字段 `RegistrationMark/RealnameID`（json `registration_mark/realname_id`）。
  - 路由 `POST /api/realname/register|list|query`；data 形状 `{subject}` / `{records,total,page,page_size}` / subject 对象。
  - seed：UAV-A-001..C-003 的 registration_mark 依次为 UAS-20260001..UAS-20260007。

- [ ] **Step 1: 写失败的服务层测试**

新建 `internal/uavbusiness/realname_test.go`：

```go
package uavbusiness

import (
	"context"
	"strings"
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

func TestRegisterRealname(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()

	sub, err := svc.RegisterRealname(ctx, "TRACE-RN-1", RealnameInput{
		SubjectType: "ENTERPRISE", Name: "云巡物流", IdNumber: "91420100MA4KTEST1X", Contact: "027-88880000",
	})
	if err != nil {
		t.Fatalf("RegisterRealname: %v", err)
	}
	if !strings.HasPrefix(sub.SubjectID, "RNS-") {
		t.Errorf("subject_id = %q, want RNS- 前缀", sub.SubjectID)
	}
	if sub.Status != "REGISTERED" || sub.SubjectType != "ENTERPRISE" {
		t.Errorf("subject = %+v", sub)
	}
	ind, err := svc.RegisterRealname(ctx, "TRACE-RN-2", RealnameInput{SubjectType: "INDIVIDUAL", Name: "张三", IdNumber: "420100199001010011"})
	if err != nil || ind.SubjectType != "INDIVIDUAL" {
		t.Fatalf("INDIVIDUAL 注册 = (%+v, %v)", ind, err)
	}

	// subject_type 非法 → 6002
	_, err = svc.RegisterRealname(ctx, "TRACE-RN-3", RealnameInput{SubjectType: "GOV", Name: "x", IdNumber: "y"})
	if codeOf(err) != errcode.Param {
		t.Errorf("非法 subject_type err = %v, want 6002", err)
	}
	// name/id_number 缺失 → 6002
	_, err = svc.RegisterRealname(ctx, "TRACE-RN-4", RealnameInput{SubjectType: "INDIVIDUAL", IdNumber: "y"})
	if codeOf(err) != errcode.Param {
		t.Errorf("缺 name err = %v, want 6002", err)
	}
}

func TestRealnameListAndQuery(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	if _, err := svc.RegisterRealname(ctx, "TRACE-RN-L1", RealnameInput{SubjectType: "ENTERPRISE", Name: "企业甲", IdNumber: "E1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterRealname(ctx, "TRACE-RN-L2", RealnameInput{SubjectType: "INDIVIDUAL", Name: "个人乙", IdNumber: "I1"}); err != nil {
		t.Fatal(err)
	}

	rows, total, err := svc.ListRealname(ctx, "TRACE-RN-L", RealnameListFilter{SubjectType: "INDIVIDUAL", Page: 0, PageSize: 0})
	if err != nil {
		t.Fatalf("ListRealname: %v", err)
	}
	if total != 1 || len(rows) != 1 || rows[0].Name != "个人乙" {
		t.Errorf("过滤结果 = (%+v, %d)", rows, total)
	}
	_, total, err = svc.ListRealname(ctx, "TRACE-RN-L", RealnameListFilter{})
	if err != nil || total != 2 {
		t.Errorf("全量 total = (%d, %v)", total, err)
	}

	// query 命中
	sub, err := svc.QueryRealname(ctx, "TRACE-RN-Q", rows[0].SubjectID)
	if err != nil || sub.Name != "个人乙" {
		t.Errorf("query = (%+v, %v)", sub, err)
	}
	// 不存在 → 7001
	_, err = svc.QueryRealname(ctx, "TRACE-RN-Q", "RNS-NOPE")
	if codeOf(err) != errcode.RealnameNotFound {
		t.Errorf("query miss err = %v, want 7001", err)
	}
	// 空 ID → 6002
	_, err = svc.QueryRealname(ctx, "TRACE-RN-Q", "")
	if codeOf(err) != errcode.Param {
		t.Errorf("空 ID err = %v, want 6002", err)
	}
}

func TestRegisterUAVRealnameAndMark(t *testing.T) {
	svc, db := testSvcFull(t)
	ctx := context.Background()
	db.Create(&model.Manufacturer{ManufacturerID: "MFR-RN", Name: "实名厂商", Status: "ACTIVE"})
	db.Create(&model.Operator{OperatorID: "OP-RN", Name: "实名运营方", Status: "ACTIVE"})
	sub, err := svc.RegisterRealname(ctx, "TRACE-RN-U1", RealnameInput{SubjectType: "INDIVIDUAL", Name: "王五", IdNumber: "420100199101010011"})
	if err != nil {
		t.Fatalf("RegisterRealname: %v", err)
	}

	// 带实名关联注册成功：registration_mark 即发、realname_id 回显
	uav, _, err := svc.RegisterUAV(ctx, "TRACE-RN-U2", UAVInput{
		ManufacturerID: "MFR-RN", OperatorID: "OP-RN", Model: "DJI-M30", SerialNo: "SN-RN-1", RealnameID: sub.SubjectID,
	})
	if err != nil {
		t.Fatalf("RegisterUAV: %v", err)
	}
	if uav.RealnameID != sub.SubjectID {
		t.Errorf("realname_id = %q, want %q", uav.RealnameID, sub.SubjectID)
	}
	if !strings.HasPrefix(uav.RegistrationMark, "UAS-") || len(uav.RegistrationMark) != 12 {
		t.Fatalf("registration_mark = %q, want UAS-+8 位数字", uav.RegistrationMark)
	}
	for _, ch := range uav.RegistrationMark[4:] {
		if ch < '0' || ch > '9' {
			t.Errorf("registration_mark 非纯数字 = %q", uav.RegistrationMark)
			break
		}
	}

	// 第二架（不带实名）：标志不重复、realname_id 为空
	uav2, _, err := svc.RegisterUAV(ctx, "TRACE-RN-U3", UAVInput{
		ManufacturerID: "MFR-RN", OperatorID: "OP-RN", SerialNo: "SN-RN-2",
	})
	if err != nil {
		t.Fatalf("RegisterUAV 2: %v", err)
	}
	if uav2.RegistrationMark == uav.RegistrationMark {
		t.Errorf("registration_mark 重复 = %q", uav2.RegistrationMark)
	}
	if uav2.RealnameID != "" {
		t.Errorf("未提供 realname_id 应为空 = %q", uav2.RealnameID)
	}

	// 不存在实名主体 → 7001
	_, _, err = svc.RegisterUAV(ctx, "TRACE-RN-U4", UAVInput{
		ManufacturerID: "MFR-RN", OperatorID: "OP-RN", SerialNo: "SN-RN-3", RealnameID: "RNS-NOPE",
	})
	if codeOf(err) != errcode.RealnameNotFound {
		t.Errorf("unknown realname err = %v, want 7001", err)
	}
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
go test ./internal/uavbusiness/ -run 'Realname|TestRegisterUAVRealname' -count=1
```

预期：**FAIL（build failed）**——`undefined: RealnameInput / RegisterRealname / errorCodeIs 引用 errcode.RealnameNotFound undefined / unknown field RealnameID`。

- [ ] **Step 3: 实现模型 + ID 生成 + seed 回填**

3a. `internal/model/uom.go` 末尾追加：

```go
// RealnameSubject UOM 实名登记主体（spec §3.3）：个人/企业，模拟证件号（不存真实证件）。
type RealnameSubject struct {
	SubjectID   string     `gorm:"primaryKey;size:64" json:"subject_id"` // RNS- 前缀
	SubjectType string     `gorm:"size:32" json:"subject_type"`          // INDIVIDUAL | ENTERPRISE
	Name        string     `gorm:"size:128" json:"name"`
	IdNumber    string     `gorm:"size:64;index" json:"id_number"` // 模拟身份证号/统一社会信用代码
	Contact     string     `gorm:"size:128" json:"contact"`
	Status      string     `gorm:"size:32;default:REGISTERED" json:"status"`
	CreatedAt   timex.Time `json:"created_at"`
	UpdatedAt   timex.Time `json:"updated_at"`
}
```

3b. `internal/model/identity.go` —— UAV 结构体 `SerialNo` 行后插入两字段（原有字段不动）：

```go
	RegistrationMark string     `gorm:"size:32;uniqueIndex" json:"registration_mark"` // 国籍登记标志 UAS-8位数字（spec §3.3：注册即发）
	RealnameID       string     `gorm:"size:64" json:"realname_id"`                   // 关联实名主体（可选，注册时校验存在性）
```

3c. `internal/model/db.go` —— AllModels() 首行 `&Manufacturer{}, &Operator{}, &UAV{},` 改为：

```go
		&Manufacturer{}, &Operator{}, &UAV{}, &RealnameSubject{},
```

3d. `internal/model/db_test.go` —— 表清单字面量改为（在 "uavs" 后插入 "realname_subjects"）：

```go
	for _, want := range []string{"manufacturers", "uavs", "realname_subjects", "missions", "crosschain_txes",
		"flight_passes", "network_nodes", "offchain_messages", "telemetry_reports", "security_events",
		"identity_mappings", "regulatory_auths", "regulatory_audits", "experiment_runs", "audit_logs"} {
```

3e. `internal/model/idgen.go` —— import 块加入 `"encoding/binary"` 与 `"fmt"`；在 `func GenTelemetryID()`（Task 2 已加）之后追加：

```go
func GenSubjectID() string { return "RNS-" + randHex(12) }

// GenRegistrationMark 国籍登记标志 "UAS-"+8 位随机数字（crypto/rand 大端取模，spec §3.3）。
func GenRegistrationMark() string {
	b := make([]byte, 4)
	rand.Read(b)
	return "UAS-" + fmt.Sprintf("%08d", binary.BigEndian.Uint32(b)%100000000)
}
```

3f. `internal/demo/seed.go` —— 7 架 UAV 字面量各加 `RegistrationMark`（uniqueIndex 下同库多行 '' 会撞唯一索引，必须回填互异字面量）：

```go
	uavs := []model.UAV{
		{UAVID: "UAV-A-001", ManufacturerID: "Manufacturer-B", OperatorID: "Operator-A", Model: "XAG-P40", SerialNo: "SN-A001", RegistrationMark: "UAS-20260001", SM9Identity: crypto.SM9IdentityOf("UAV-A-001"), Status: "VERIFIED"},
		{UAVID: "UAV-A-002", ManufacturerID: "Manufacturer-A", OperatorID: "Operator-A", Model: "DJI-M300", SerialNo: "SN-A002", RegistrationMark: "UAS-20260002", SM9Identity: crypto.SM9IdentityOf("UAV-A-002"), Status: "VERIFIED"},
		{UAVID: "UAV-B-001", ManufacturerID: "Manufacturer-A", OperatorID: "Operator-B", Model: "DJI-M30T", SerialNo: "SN-B001", RegistrationMark: "UAS-20260003", SM9Identity: crypto.SM9IdentityOf("UAV-B-001"), Status: "VERIFIED"},
		{UAVID: "UAV-B-002", ManufacturerID: "Manufacturer-B", OperatorID: "Operator-B", Model: "XAG-V40", SerialNo: "SN-B002", RegistrationMark: "UAS-20260004", SM9Identity: crypto.SM9IdentityOf("UAV-B-002"), Status: "VERIFIED"},
		{UAVID: "UAV-C-001", ManufacturerID: "Manufacturer-C", OperatorID: "Operator-C", Model: "FIMI-F8", SerialNo: "SN-C001", RegistrationMark: "UAS-20260005", SM9Identity: crypto.SM9IdentityOf("UAV-C-001"), Status: "VERIFIED"},
		{UAVID: "UAV-C-002", ManufacturerID: "Manufacturer-C", OperatorID: "Operator-C", Model: "FIMI-F8X", SerialNo: "SN-C002", RegistrationMark: "UAS-20260006", SM9Identity: crypto.SM9IdentityOf("UAV-C-002"), Status: "VERIFIED"},
		{UAVID: "UAV-C-003", ManufacturerID: "Manufacturer-C", OperatorID: "Operator-C", Model: "FIMI-F8Pro", SerialNo: "SN-C003", RegistrationMark: "UAS-20260007", SM9Identity: crypto.SM9IdentityOf("UAV-C-003"), Status: "VERIFIED"},
	}
```

（说明：`internal/regulatory/trace_test.go` 与 `authorization_test.go` 直接插桩的 UAV 每库仅一架，'' 标志不撞 uniqueIndex，无需改动——已核实。）

- [ ] **Step 4: 实现实名服务**

新建 `internal/uavbusiness/realname.go`：

```go
package uavbusiness

import (
	"context"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// validSubjectTypes 实名主体类型枚举（spec §3.3）。
var validSubjectTypes = map[string]bool{"INDIVIDUAL": true, "ENTERPRISE": true}

// RealnameInput 实名登记入参。
type RealnameInput struct {
	SubjectType string // INDIVIDUAL|ENTERPRISE（必填）
	Name        string
	IdNumber    string // 模拟证件号：身份证/统一社会信用代码
	Contact     string
}

// RegisterRealname 实名登记：必填与枚举校验（违规→6002）；SubjectID 自动 RNS- 前缀；状态 REGISTERED。
func (s *Service) RegisterRealname(ctx context.Context, traceID string, in RealnameInput) (*model.RealnameSubject, error) {
	if in.Name == "" || in.IdNumber == "" {
		return nil, crosschain.NewError(errcode.Param, "name 与 id_number 必填")
	}
	if !validSubjectTypes[in.SubjectType] {
		return nil, crosschain.NewError(errcode.Param, "subject_type 仅允许 INDIVIDUAL|ENTERPRISE，收到 %q", in.SubjectType)
	}
	sub := &model.RealnameSubject{
		SubjectID: model.GenSubjectID(), SubjectType: in.SubjectType,
		Name: in.Name, IdNumber: in.IdNumber, Contact: in.Contact, Status: "REGISTERED",
	}
	if err := s.db.WithContext(ctx).Create(sub).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create realname subject: %v", err)
	}
	s.logAudit(traceID, sub.SubjectID, "REALNAME_REGISTER", "REALNAME", sub.SubjectID,
		map[string]any{"subject_type": sub.SubjectType, "name": sub.Name})
	return sub, nil
}

// RealnameListFilter 实名主体列表过滤 + 分页参数。
type RealnameListFilter struct {
	SubjectType string
	Page        int
	PageSize    int
}

// ListRealname subject_type 过滤（空串=不过滤），created_at 降序分页（同 ListPass 形状）。
func (s *Service) ListRealname(ctx context.Context, traceID string, f RealnameListFilter) ([]model.RealnameSubject, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.WithContext(ctx).Model(&model.RealnameSubject{})
	if f.SubjectType != "" {
		q = q.Where("subject_type = ?", f.SubjectType)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.RealnameSubject
	if err := q.Order("created_at DESC, subject_id DESC").
		Offset((f.Page - 1) * f.PageSize).Limit(f.PageSize).Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}

// QueryRealname 单主体查询；空 ID→6002；不存在→7001。
func (s *Service) QueryRealname(ctx context.Context, traceID, subjectID string) (*model.RealnameSubject, error) {
	if subjectID == "" {
		return nil, crosschain.NewError(errcode.Param, "subject_id 必填")
	}
	var sub model.RealnameSubject
	err := s.db.WithContext(ctx).Where("subject_id = ?", subjectID).First(&sub).Error
	if err == gorm.ErrRecordNotFound {
		return nil, crosschain.NewError(errcode.RealnameNotFound, "实名主体 %q 不存在", subjectID)
	}
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "query realname subject: %v", err)
	}
	return &sub, nil
}
```

- [ ] **Step 5: 改造 RegisterUAV（校验 + 标志生成）**

`internal/uavbusiness/uav.go` 五处改动：

① `UAVInput` 结构体 `SerialNo` 字段后追加：

```go
	RealnameID     string // 可选：关联实名主体（提供则校验存在，不存在→7001）
```

② `RegisterUAV` 中，运营方 ACTIVE 校验块（`if op.Status != "ACTIVE" { ... }`）之后、`var cnt int64` 之前插入：

```go
	// 可选实名主体关联（spec §3.3）：提供则校验存在（不存在→7001）
	if in.RealnameID != "" {
		if _, err := s.QueryRealname(ctx, traceID, in.RealnameID); err != nil {
			return nil, nil, err
		}
	}
```

③ 事务闭包内，uavID 生成/查重 if-else 链之后、`uav = &model.UAV{` 之前插入：

```go
		mark, err := s.genRegistrationMark(tx)
		if err != nil {
			return crosschain.NewError(errcode.Internal, "gen registration_mark: %v", err)
		}
```

并把 `uav = &model.UAV{...}` 字面量改为：

```go
		uav = &model.UAV{
			UAVID: uavID, ManufacturerID: in.ManufacturerID, OperatorID: in.OperatorID,
			Model: in.Model, SerialNo: in.SerialNo,
			RegistrationMark: mark, RealnameID: in.RealnameID,
			SM9Identity: crypto.SM9IdentityOf(uavID), Status: "UNREGISTERED",
		}
```

④ `tx.Create(uav)` 的 UNIQUE 错误映射分支中，`serial_no` 分支之后、`uav_id` 兜底之前插入：

```go
				if strings.Contains(msg, "registration_mark") {
					return crosschain.NewError(errcode.Internal, "registration_mark 冲突（请重试）: %v", err)
				}
```

⑤ `genUAVID` 函数之后新增：

```go
// genRegistrationMark 生成国籍登记标志 "UAS-8位数字"（spec §3.3：注册即发）：随机探测 20 次查重。
func (s *Service) genRegistrationMark(db *gorm.DB) (string, error) {
	for i := 0; i < 20; i++ {
		cand := model.GenRegistrationMark()
		var dup int64
		if err := db.Model(&model.UAV{}).Where("registration_mark = ?", cand).Count(&dup).Error; err != nil {
			return "", err
		}
		if dup == 0 {
			return cand, nil
		}
	}
	return "", fmt.Errorf("registration_mark space exhausted (20 collisions)")
}
```

（uav.go 已 import fmt/strings/gorm/model/crosschain/errcode/crypto，无需增删 import。）

- [ ] **Step 6: 跑服务层测试确认通过**

```bash
go test ./internal/uavbusiness/ ./internal/model/ ./internal/demo/ -count=1
```

预期：全部 `ok`（demo 包含 seed 回归——7 架 UAV 字面量标志互异，uniqueIndex 无冲突）。

- [ ] **Step 7: 实现 API handler + 路由**

7a. 新建 `internal/api/uom_handler.go`：

```go
package api

import (
	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/uavbusiness"
)

type realnameRegisterReq struct {
	SubjectType string `json:"subject_type" binding:"required"` // INDIVIDUAL|ENTERPRISE
	Name        string `json:"name" binding:"required"`
	IdNumber    string `json:"id_number" binding:"required"` // 模拟证件号
	Contact     string `json:"contact"`
}

// realnameRegisterHandler POST /api/realname/register —— data={subject}。
func realnameRegisterHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req realnameRegisterReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		sub, err := deps.Business.RegisterRealname(c.Request.Context(), TraceIDFrom(c), uavbusiness.RealnameInput{
			SubjectType: req.SubjectType, Name: req.Name, IdNumber: req.IdNumber, Contact: req.Contact,
		})
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"subject": sub})
	}
}

type realnameListReq struct {
	SubjectType string `json:"subject_type"`
	Page        int    `json:"page"`
	PageSize    int    `json:"page_size"`
}

// realnameListHandler POST /api/realname/list —— data={records,total,page,page_size}。
func realnameListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req realnameListReq
		if !bindOptionalBody(c, &req) { // 全字段可选：空体合法；格式错→6002
			return
		}
		f := uavbusiness.RealnameListFilter{SubjectType: req.SubjectType, Page: req.Page, PageSize: req.PageSize}
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		records, total, err := deps.Business.ListRealname(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}

type realnameQueryReq struct {
	SubjectID string `json:"subject_id" binding:"required"`
}

// realnameQueryHandler POST /api/realname/query —— data=subject 对象；不存在→7001。
func realnameQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req realnameQueryReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		sub, err := deps.Business.QueryRealname(c.Request.Context(), TraceIDFrom(c), req.SubjectID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, sub)
	}
}
```

7b. `internal/api/uav_handler.go` —— `uavRegisterReq` 的 `SerialNo` 字段后追加：

```go
	RealnameID     string `json:"realname_id"` // 可选：关联实名主体（不存在→7001）
```

`uavRegisterHandler` 中 `uavbusiness.UAVInput{...}` 字面量改为：

```go
		uav, tx, err := deps.Business.RegisterUAV(c.Request.Context(), TraceIDFrom(c), uavbusiness.UAVInput{
			UAVID: req.UAVID, ManufacturerID: req.ManufacturerID, OperatorID: req.OperatorID,
			Model: req.Model, SerialNo: req.SerialNo, RealnameID: req.RealnameID,
		})
```

7c. `internal/api/router.go` —— 在 `api.POST("/route/list", routeListHandler(deps))` 行之后、`api.POST("/uav/register", ...)` 之前插入：

```go
		api.POST("/realname/register", realnameRegisterHandler(deps))
		api.POST("/realname/list", realnameListHandler(deps))
		api.POST("/realname/query", realnameQueryHandler(deps))
```

- [ ] **Step 8: 写失败的 API 层测试**

新建 `internal/api/uom_handler_test.go`：

```go
package api

import (
	"regexp"
	"testing"
)

func TestRealnameEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	// register ENTERPRISE
	resp := postJSON(t, r, "/api/realname/register", map[string]any{
		"subject_type": "ENTERPRISE", "name": "云巡物流", "id_number": "91420100MA4KTEST1X", "contact": "027-88880000",
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("realname/register: %v", resp)
	}
	sub := resp["data"].(map[string]any)["subject"].(map[string]any)
	if sub["status"] != "REGISTERED" || sub["subject_type"] != "ENTERPRISE" {
		t.Errorf("subject = %v", sub)
	}
	sid := sub["subject_id"].(string)
	if sid[:4] != "RNS-" {
		t.Errorf("subject_id = %q, want RNS- 前缀", sid)
	}
	// register INDIVIDUAL（为 list 过滤准备）
	if resp = postJSON(t, r, "/api/realname/register", map[string]any{
		"subject_type": "INDIVIDUAL", "name": "张三", "id_number": "420100199001010011",
	}); resp["code"].(float64) != 0 {
		t.Fatalf("realname/register INDIVIDUAL: %v", resp)
	}
	// subject_type 非法 → 6002
	if resp = postJSON(t, r, "/api/realname/register", map[string]any{"subject_type": "GOV", "name": "x", "id_number": "y"}); resp["code"].(float64) != 6002 {
		t.Errorf("非法 subject_type = %v, want 6002", resp)
	}
	// 缺 name → 6002（binding required）
	if resp = postJSON(t, r, "/api/realname/register", map[string]any{"subject_type": "INDIVIDUAL", "id_number": "y"}); resp["code"].(float64) != 6002 {
		t.Errorf("缺 name = %v, want 6002", resp)
	}
	// list 过滤 + 分页回显
	resp = postJSON(t, r, "/api/realname/list", map[string]any{"subject_type": "INDIVIDUAL"})
	d := resp["data"].(map[string]any)
	if d["total"].(float64) != 1 || d["page"].(float64) != 1 || d["page_size"].(float64) != 20 {
		t.Errorf("list = %v", d)
	}
	// query 命中 + 未命中
	if resp = postJSON(t, r, "/api/realname/query", map[string]any{"subject_id": sid}); resp["code"].(float64) != 0 {
		t.Errorf("query: %v", resp)
	}
	if resp = postJSON(t, r, "/api/realname/query", map[string]any{"subject_id": "RNS-NOPE"}); resp["code"].(float64) != 7001 {
		t.Errorf("query miss = %v, want 7001", resp)
	}
}

func TestUAVRegisterRealnameAndMarkAPI(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	sub := postJSON(t, r, "/api/realname/register", map[string]any{
		"subject_type": "INDIVIDUAL", "name": "李四", "id_number": "420100199202020022",
	})
	sid := sub["data"].(map[string]any)["subject"].(map[string]any)["subject_id"].(string)

	resp := postJSON(t, r, "/api/uav/register", map[string]any{
		"manufacturer_id": "Manufacturer-B", "operator_id": "Operator-A",
		"model": "DJI-M30", "serial_no": "SN-UOM-1", "realname_id": sid,
	})
	if resp["code"].(float64) != 0 {
		t.Fatalf("uav/register: %v", resp)
	}
	uav := resp["data"].(map[string]any)["uav"].(map[string]any)
	if uav["status"] != "VERIFIED" {
		t.Errorf("status = %v, want VERIFIED（纯加法不改变原语义）", uav["status"])
	}
	if uav["realname_id"] != sid {
		t.Errorf("realname_id = %v, want %s", uav["realname_id"], sid)
	}
	if !regexp.MustCompile(`^UAS-[0-9]{8}$`).MatchString(uav["registration_mark"].(string)) {
		t.Errorf("registration_mark = %v, want UAS-8位数字", uav["registration_mark"])
	}
	// 不存在实名主体 → 7001
	resp = postJSON(t, r, "/api/uav/register", map[string]any{
		"manufacturer_id": "Manufacturer-B", "operator_id": "Operator-A",
		"serial_no": "SN-UOM-2", "realname_id": "RNS-NOPE",
	})
	if resp["code"].(float64) != 7001 {
		t.Errorf("unknown realname = %v, want 7001", resp)
	}
	// seed 机预置注册标志
	resp = postJSON(t, r, "/api/uav/query", map[string]any{"uav_id": "UAV-A-001"})
	if m := resp["data"].(map[string]any)["registration_mark"]; m != "UAS-20260001" {
		t.Errorf("UAV-A-001 registration_mark = %v, want UAS-20260001", m)
	}
}
```

- [ ] **Step 9: 跑 API 测试确认通过**

```bash
go test ./internal/api/ -run 'TestRealnameEndpoints|TestUAVRegisterRealnameAndMarkAPI' -count=1 -v
```

预期：两个测试 `--- PASS`。

- [ ] **Step 10: 全量回归 + vet**

```bash
go test ./... -count=1 && go vet ./...
```

预期：全部 `ok`。重点确认 `tests/`（system1_e2e 对 uav/register 只断言 status 键，加法字段安全）与 `internal/regulatory`（trace_test 单库单机 '' 标志不撞唯一索引）。

- [ ] **Step 11: 提交**

```bash
git add internal/model/uom.go internal/model/identity.go internal/model/db.go internal/model/db_test.go internal/model/idgen.go internal/demo/seed.go internal/uavbusiness/realname.go internal/uavbusiness/realname_test.go internal/uavbusiness/uav.go internal/api/uom_handler.go internal/api/uom_handler_test.go internal/api/uav_handler.go internal/api/router.go
git commit -m "$(cat <<'EOF'
feat(backend): 实名域——实名登记 + UAV 国籍登记标志/实名关联（spec §3.3）

- 新表 realname_subjects（RNS- 前缀，INDIVIDUAL|ENTERPRISE，模拟证件号，状态 REGISTERED）
- realname/register·list（subject_type 过滤分页）·query（不存在→7001）
- UAV +registration_mark（UAS-8位随机数字，uniqueIndex，注册即发）+realname_id（可选，
  提供则校验存在→7001）；seed 7 架回填互异字面量标志规避 '' 撞唯一索引
- 端点 67→70（apidoc 表契约同步在 Task 6 统一处理）

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 执照域——操控员执照即申即发 + 任务关联（spec §3.4）

**Files:**
- Modify: `internal/model/uom.go`（追加 PilotLicense）
- Modify: `internal/model/business.go`（Mission +PilotLicenseID 普通列）
- Modify: `internal/model/db.go`（AllModels +PilotLicense）
- Modify: `internal/model/db_test.go`（表清单 +pilot_licenses）
- Modify: `internal/model/idgen.go`（+GenLicenseID/+GenLicenseNo）
- Create: `internal/uavbusiness/pilot.go`
- Modify: `internal/uavbusiness/mission.go`（MissionInput+校验+落库字段；canonical 不动）
- Modify: `internal/api/uom_handler.go`（追加 pilot 三 handler）
- Modify: `internal/api/mission_handler.go`（req +pilot_license_id 透传）
- Modify: `internal/api/router.go`（+3 行路由）
- Test: `internal/uavbusiness/pilot_test.go`（新建）
- Test: `internal/api/uom_handler_test.go`（追加两个测试函数）

**Interfaces:**
- Consumes: `codeOf(err) int`（uavbusiness 既有测试助手）；`errcode.LicenseInvalid=7002`（Task 2 已加）；`crypto.CanonicalJSON(map[string]any) ([]byte, error)`、`(*crypto.Service).SM9SignUserID(uid string, data []byte) (string, error)`、`crypto.SM9IdentityOf(id string) string`；`testSvc(t)`；`validTestDeps(t).DB`。
- Produces:
  - `model.PilotLicense`（表 pilot_licenses）；`model.GenLicenseID()`（"PIL-"+12hex）；`model.GenLicenseNo(year int)`（"UAV-PILOT-<年>-<4位数字>"）。
  - `uavbusiness.PilotApplyInput{Name,IdNumber,Category string}`；`(*Service).ApplyPilotLicense(ctx, traceID string, in PilotApplyInput) (*model.PilotLicense, error)`；`QueryPilotLicense(ctx, traceID, licenseID string) (*model.PilotLicense, error)`（不存在→7002）；`CheckPilotLicense(ctx, traceID, licenseID string) (*model.PilotLicense, error)`（过期→7002）；`PilotListFilter{Category string; Page,PageSize int}`；`ListPilotLicenses(...) ([]model.PilotLicense, int64, error)`。
  - `uavbusiness.MissionInput` 新字段 `PilotLicenseID string`；`model.Mission` 新字段 `PilotLicenseID`（json `pilot_license_id`，**不在 canonical**）。
  - 路由 `POST /api/pilot/apply|list|query`；data 形状 `{license}` / `{records,total,page,page_size}` / license 对象。

- [ ] **Step 1: 写失败的服务层测试**

新建 `internal/uavbusiness/pilot_test.go`：

```go
package uavbusiness

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

func TestApplyPilotLicense(t *testing.T) {
	svc, _ := testSvc(t)
	ctx := context.Background()
	lic, err := svc.ApplyPilotLicense(ctx, "TRACE-PL-1", PilotApplyInput{Name: "王五", IdNumber: "420100199303030033", Category: "多旋翼"})
	if err != nil {
		t.Fatalf("ApplyPilotLicense: %v", err)
	}
	if !strings.HasPrefix(lic.LicenseID, "PIL-") {
		t.Errorf("license_id = %q, want PIL- 前缀", lic.LicenseID)
	}
	wantNo := fmt.Sprintf("UAV-PILOT-%d-", timex.Now().Year())
	if !strings.HasPrefix(lic.LicenseNo, wantNo) || len(lic.LicenseNo) != len(wantNo)+4 {
		t.Errorf("license_no = %q, want %s<4位数字>", lic.LicenseNo, wantNo)
	}
	if lic.Status != "ISSUED" {
		t.Errorf("status = %q, want ISSUED（即申即发）", lic.Status)
	}
	if lic.Signature == "" {
		t.Error("signature 为空, want SM9 管理方签名")
	}
	if lic.ExpiresAt.Year() != lic.IssuedAt.Year()+2 {
		t.Errorf("expires_at = %v, want 签发+2年", lic.ExpiresAt)
	}

	// category 非法 → 6002
	_, err = svc.ApplyPilotLicense(ctx, "TRACE-PL-2", PilotApplyInput{Name: "x", IdNumber: "y", Category: "直升机"})
	if codeOf(err) != errcode.Param {
		t.Errorf("非法 category err = %v, want 6002", err)
	}
	// 缺 name → 6002
	_, err = svc.ApplyPilotLicense(ctx, "TRACE-PL-3", PilotApplyInput{IdNumber: "y", Category: "固定翼"})
	if codeOf(err) != errcode.Param {
		t.Errorf("缺 name err = %v, want 6002", err)
	}
}

func TestPilotQueryListCheck(t *testing.T) {
	svc, db := testSvc(t)
	ctx := context.Background()
	lic, err := svc.ApplyPilotLicense(ctx, "TRACE-PL-Q1", PilotApplyInput{Name: "赵六", IdNumber: "420100199404040044", Category: "垂直起降"})
	if err != nil {
		t.Fatal(err)
	}

	// query 命中 + 未命中（7002）+ 空 ID（6002）
	got, err := svc.QueryPilotLicense(ctx, "TRACE-PL-Q2", lic.LicenseID)
	if err != nil || got.LicenseNo != lic.LicenseNo {
		t.Errorf("query = (%+v, %v)", got, err)
	}
	_, err = svc.QueryPilotLicense(ctx, "TRACE-PL-Q3", "PIL-NOPE")
	if codeOf(err) != errcode.LicenseInvalid {
		t.Errorf("query miss err = %v, want 7002", err)
	}
	_, err = svc.QueryPilotLicense(ctx, "TRACE-PL-Q4", "")
	if codeOf(err) != errcode.Param {
		t.Errorf("空 ID err = %v, want 6002", err)
	}

	// list category 过滤 + 分页归一化
	if _, err := svc.ApplyPilotLicense(ctx, "TRACE-PL-Q5", PilotApplyInput{Name: "孙七", IdNumber: "420100199505050055", Category: "固定翼"}); err != nil {
		t.Fatal(err)
	}
	rows, total, err := svc.ListPilotLicenses(ctx, "TRACE-PL-Q6", PilotListFilter{Category: "垂直起降", Page: 0, PageSize: 0})
	if err != nil || total != 1 || len(rows) != 1 || rows[0].Name != "赵六" {
		t.Errorf("category 过滤 = (%+v, %d, %v)", rows, total, err)
	}

	// CheckPilotLicense：有效 → 通过
	if _, err := svc.CheckPilotLicense(ctx, "TRACE-PL-Q7", lic.LicenseID); err != nil {
		t.Errorf("有效执照应通过: %v", err)
	}
	// 过期 → 7002（直插过期行）
	past := timex.New(time.Now().AddDate(-1, 0, 0))
	db.Create(&model.PilotLicense{
		LicenseID: "PIL-EXP-1", LicenseNo: "UAV-PILOT-2020-0001", Name: "过期者", IdNumber: "420100198001010011",
		Category: "多旋翼", Status: "ISSUED", IssuedAt: past, ExpiresAt: past,
	})
	_, err = svc.CheckPilotLicense(ctx, "TRACE-PL-Q8", "PIL-EXP-1")
	if codeOf(err) != errcode.LicenseInvalid {
		t.Errorf("过期 err = %v, want 7002", err)
	}
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
go test ./internal/uavbusiness/ -run 'Pilot' -count=1
```

预期：**FAIL（build failed）**——`undefined: PilotApplyInput / ApplyPilotLicense / QueryPilotLicense / CheckPilotLicense / PilotListFilter / ListPilotLicenses`。

- [ ] **Step 3: 实现模型 + ID 生成**

3a. `internal/model/uom.go` 末尾追加：

```go
// PilotLicense 操控员执照（spec §3.4）：模拟即审即发；canonical 内容由管理方（FISCO-ADMIN）SM9 签名，
// 前端可经 crypto/sm9/verify 以同一 canonical 材料复核防篡改。
type PilotLicense struct {
	LicenseID string     `gorm:"primaryKey;size:64" json:"license_id"` // PIL- 前缀
	LicenseNo string     `gorm:"size:64;index" json:"license_no"`      // UAV-PILOT-<年份>-<4位随机数字>
	Name      string     `gorm:"size:128" json:"name"`
	IdNumber  string     `gorm:"size:64;index" json:"id_number"` // 模拟证件号
	Category  string     `gorm:"size:32" json:"category"`        // 多旋翼 | 固定翼 | 垂直起降
	Status    string     `gorm:"size:32;default:ISSUED" json:"status"`
	IssuedAt  timex.Time `json:"issued_at"`
	ExpiresAt timex.Time `json:"expires_at"` // 默认签发+2年
	Signature string     `gorm:"type:text" json:"signature"` // SM9 管理方签名（canonical JSON）
	CreatedAt timex.Time `json:"created_at"`
	UpdatedAt timex.Time `json:"updated_at"`
}
```

3b. `internal/model/business.go` —— Mission 结构体 `PayloadType` 行后插入：

```go
	PilotLicenseID    string     `gorm:"size:64" json:"pilot_license_id"` // 关联操控员执照（可选；不进 canonical 签名材料——inspection 逐字段重算，加字段会破坏既有密文核验）
```

3c. `internal/model/db.go` —— AllModels() 中 `&UAV{}, &RealnameSubject{},` 改为：

```go
		&Manufacturer{}, &Operator{}, &UAV{}, &RealnameSubject{}, &PilotLicense{},
```

3d. `internal/model/db_test.go` —— 表清单在 `"realname_subjects"` 后插入 `"pilot_licenses"`：

```go
	for _, want := range []string{"manufacturers", "uavs", "realname_subjects", "pilot_licenses", "missions", "crosschain_txes",
		"flight_passes", "network_nodes", "offchain_messages", "telemetry_reports", "security_events",
		"identity_mappings", "regulatory_auths", "regulatory_audits", "experiment_runs", "audit_logs"} {
```

3e. `internal/model/idgen.go` —— `GenRegistrationMark` 之后追加：

```go
func GenLicenseID() string { return "PIL-" + randHex(12) }

// GenLicenseNo 执照编号 "UAV-PILOT-<年份>-<4位随机数字>"（crypto/rand 大端取模，spec §3.4）。
func GenLicenseNo(year int) string {
	b := make([]byte, 2)
	rand.Read(b)
	return fmt.Sprintf("UAV-PILOT-%d-%04d", year, binary.BigEndian.Uint16(b)%10000)
}
```

- [ ] **Step 4: 实现执照服务**

新建 `internal/uavbusiness/pilot.go`：

```go
package uavbusiness

import (
	"context"

	"gorm.io/gorm"

	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// pilotSignerUID 执照签署人 = 管理方身份（与 passSignerUID 对齐，spec §3.4：
// 前端可用 crypto/sm9/verify 以同一 canonical 材料复核防篡改）。
func pilotSignerUID() string { return crypto.SM9IdentityOf("FISCO-ADMIN") }

// validLicenseCategories 执照类别枚举（spec §3.4）。
var validLicenseCategories = map[string]bool{"多旋翼": true, "固定翼": true, "垂直起降": true}

// pilotCanonical 执照 canonical 材料（签名与前端复核同源；时间用 timex 单一写格式）。
func pilotCanonical(l *model.PilotLicense) map[string]any {
	return map[string]any{
		"license_id": l.LicenseID, "license_no": l.LicenseNo, "name": l.Name,
		"id_number": l.IdNumber, "category": l.Category,
		"issued_at": timex.FormatTime(l.IssuedAt.Time), "expires_at": timex.FormatTime(l.ExpiresAt.Time),
	}
}

// PilotApplyInput 执照申请入参。
type PilotApplyInput struct {
	Name     string
	IdNumber string
	Category string // 多旋翼|固定翼|垂直起降（必填）
}

// ApplyPilotLicense 操控员执照申请（模拟即审即发，spec §3.4）：
// 枚举校验（违规→6002）；LicenseNo=UAV-PILOT-<年份>-<4位随机>；ExpiresAt 默认+2年；
// canonical 内容 SM9 管理方签名后落库。
func (s *Service) ApplyPilotLicense(ctx context.Context, traceID string, in PilotApplyInput) (*model.PilotLicense, error) {
	if in.Name == "" || in.IdNumber == "" {
		return nil, crosschain.NewError(errcode.Param, "name 与 id_number 必填")
	}
	if !validLicenseCategories[in.Category] {
		return nil, crosschain.NewError(errcode.Param, "category 仅允许 多旋翼|固定翼|垂直起降，收到 %q", in.Category)
	}
	now := timex.Now()
	l := &model.PilotLicense{
		LicenseID: model.GenLicenseID(), LicenseNo: model.GenLicenseNo(now.Year()),
		Name: in.Name, IdNumber: in.IdNumber, Category: in.Category, Status: "ISSUED",
		IssuedAt: timex.New(now), ExpiresAt: timex.New(now.AddDate(2, 0, 0)),
	}
	cb, err := crypto.CanonicalJSON(pilotCanonical(l))
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "canonical license: %v", err)
	}
	sig, err := s.cs.SM9SignUserID(pilotSignerUID(), cb)
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "SM9 sign license: %v", err)
	}
	l.Signature = sig
	if err := s.db.WithContext(ctx).Create(l).Error; err != nil {
		return nil, crosschain.NewError(errcode.Internal, "create pilot license: %v", err)
	}
	s.logAudit(traceID, l.LicenseID, "PILOT_LICENSE_ISSUE", "PILOT_LICENSE", l.LicenseID,
		map[string]any{"license_no": l.LicenseNo, "category": l.Category, "name": l.Name})
	return l, nil
}

// QueryPilotLicense 单执照查询；空 ID→6002；不存在→7002。
func (s *Service) QueryPilotLicense(ctx context.Context, traceID, licenseID string) (*model.PilotLicense, error) {
	if licenseID == "" {
		return nil, crosschain.NewError(errcode.Param, "license_id 必填")
	}
	var l model.PilotLicense
	err := s.db.WithContext(ctx).Where("license_id = ?", licenseID).First(&l).Error
	if err == gorm.ErrRecordNotFound {
		return nil, crosschain.NewError(errcode.LicenseInvalid, "执照 %q 不存在", licenseID)
	}
	if err != nil {
		return nil, crosschain.NewError(errcode.Internal, "query pilot license: %v", err)
	}
	return &l, nil
}

// CheckPilotLicense 任务关联校验：存在 + 未过期（不存在/过期→7002）。
func (s *Service) CheckPilotLicense(ctx context.Context, traceID, licenseID string) (*model.PilotLicense, error) {
	l, err := s.QueryPilotLicense(ctx, traceID, licenseID)
	if err != nil {
		return nil, err
	}
	if timex.Now().After(l.ExpiresAt.Time) {
		return nil, crosschain.NewError(errcode.LicenseInvalid, "执照 %q 已于 %s 过期", licenseID, timex.FormatTime(l.ExpiresAt.Time))
	}
	return l, nil
}

// PilotListFilter 执照列表过滤 + 分页参数。
type PilotListFilter struct {
	Category string
	Page     int
	PageSize int
}

// ListPilotLicenses category 过滤（空串=不过滤），created_at 降序分页（同 ListRealname 形状）。
func (s *Service) ListPilotLicenses(ctx context.Context, traceID string, f PilotListFilter) ([]model.PilotLicense, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := s.db.WithContext(ctx).Model(&model.PilotLicense{})
	if f.Category != "" {
		q = q.Where("category = ?", f.Category)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.PilotLicense
	if err := q.Order("created_at DESC, license_id DESC").
		Offset((f.Page - 1) * f.PageSize).Limit(f.PageSize).Find(&out).Error; err != nil {
		return nil, 0, crosschain.NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}
```

- [ ] **Step 5: 改造 CreateMission（可选执照关联，canonical 不动）**

`internal/uavbusiness/mission.go` 三处改动：

① `MissionInput` 结构体 `Description` 字段后追加：

```go
	PilotLicenseID string // 可选：关联操控员执照（提供则校验存在且未过期，否则→7002；不进 canonical 签名材料）
```

② UAV 归属校验块（`if uav.OperatorID != in.OperatorID { ... }`）之后、`var routes []model.RouteSegment` 之前插入：

```go
	// 可选操控员执照关联（spec §3.4）：提供则校验存在且未过期（不存在/过期→7002）。
	// 注意：PilotLicenseID 不进 canonical 签名材料——regulatory/inspection.go:176-194 会逐字段
	// 重算任务 canonical 做 SM3/SM9 双验证，加字段会破坏既有密文核验（Global Constraints 红线）。
	if in.PilotLicenseID != "" {
		if _, err := s.CheckPilotLicense(ctx, traceID, in.PilotLicenseID); err != nil {
			return nil, err
		}
	}
```

③ `m = &model.Mission{...}` 字面量中 `Zones: string(zoneJSON), PayloadType: in.PayloadType,` 行改为：

```go
			Zones: string(zoneJSON), PayloadType: in.PayloadType, PilotLicenseID: in.PilotLicenseID,
```

（canonical map `canon := map[string]any{...}` **一个字都不改**。）

- [ ] **Step 6: 跑服务层测试确认通过**

```bash
go test ./internal/uavbusiness/ ./internal/model/ ./internal/regulatory/ -count=1
```

预期：全部 `ok`。`internal/regulatory` 一并跑是验证 canonical 红线——inspection 重算逻辑对新增普通列零感知。

- [ ] **Step 7: 实现 API handler + 路由**

7a. `internal/api/uom_handler.go` 末尾追加：

```go
type pilotApplyReq struct {
	Name     string `json:"name" binding:"required"`
	IdNumber string `json:"id_number" binding:"required"`
	Category string `json:"category" binding:"required"` // 多旋翼|固定翼|垂直起降
}

// pilotApplyHandler POST /api/pilot/apply —— data={license}（即申即发，SM9 管理方签名）。
func pilotApplyHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req pilotApplyReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		lic, err := deps.Business.ApplyPilotLicense(c.Request.Context(), TraceIDFrom(c), uavbusiness.PilotApplyInput{
			Name: req.Name, IdNumber: req.IdNumber, Category: req.Category,
		})
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"license": lic})
	}
}

type pilotListReq struct {
	Category string `json:"category"`
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
}

// pilotListHandler POST /api/pilot/list —— data={records,total,page,page_size}。
func pilotListHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req pilotListReq
		if !bindOptionalBody(c, &req) {
			return
		}
		f := uavbusiness.PilotListFilter{Category: req.Category, Page: req.Page, PageSize: req.PageSize}
		if f.Page <= 0 {
			f.Page = 1
		}
		if f.PageSize <= 0 {
			f.PageSize = 20
		}
		if f.PageSize > 200 {
			f.PageSize = 200
		}
		records, total, err := deps.Business.ListPilotLicenses(c.Request.Context(), TraceIDFrom(c), f)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, gin.H{"records": records, "total": total, "page": f.Page, "page_size": f.PageSize})
	}
}

type pilotQueryReq struct {
	LicenseID string `json:"license_id" binding:"required"`
}

// pilotQueryHandler POST /api/pilot/query —— data=license 对象；不存在→7002。
func pilotQueryHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req pilotQueryReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		lic, err := deps.Business.QueryPilotLicense(c.Request.Context(), TraceIDFrom(c), req.LicenseID)
		if err != nil {
			Fail(c, crosschainErrCode(err), err.Error())
			return
		}
		OK(c, lic)
	}
}
```

7b. `internal/api/mission_handler.go` —— `missionCreateReq` 的 `Description` 字段后追加：

```go
	PilotLicenseID string   `json:"pilot_license_id"` // 可选：关联操控员执照（不存在/过期→7002）
```

`missionCreateHandler` 中 `uavbusiness.MissionInput{...}` 字面量改为：

```go
		m, err := deps.Business.CreateMission(c.Request.Context(), TraceIDFrom(c), uavbusiness.MissionInput{
			MissionID: req.MissionID, OperatorID: req.OperatorID, UAVID: req.UAVID,
			MissionType: req.MissionType, StartTime: req.StartTime, EndTime: req.EndTime,
			RouteSegments: req.RouteSegments, AltitudeMin: req.AltitudeMin, AltitudeMax: req.AltitudeMax,
			PayloadType: req.PayloadType, Description: req.Description, PilotLicenseID: req.PilotLicenseID,
		})
```

7c. `internal/api/router.go` —— realname 三行之后插入：

```go
		api.POST("/pilot/apply", pilotApplyHandler(deps))
		api.POST("/pilot/list", pilotListHandler(deps))
		api.POST("/pilot/query", pilotQueryHandler(deps))
```

- [ ] **Step 8: 写失败的 API 层测试**

`internal/api/uom_handler_test.go` —— import 块改为：

```go
import (
	"fmt"
	"regexp"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)
```

文件末尾追加：

```go
func TestPilotEndpoints(t *testing.T) {
	r, err := NewRouter(validTestDeps(t))
	if err != nil {
		t.Fatal(err)
	}
	resp := postJSON(t, r, "/api/pilot/apply", map[string]any{"name": "王五", "id_number": "420100199303030033", "category": "多旋翼"})
	if resp["code"].(float64) != 0 {
		t.Fatalf("pilot/apply: %v", resp)
	}
	lic := resp["data"].(map[string]any)["license"].(map[string]any)
	if lic["status"] != "ISSUED" || lic["signature"] == "" {
		t.Errorf("license = %v", lic)
	}
	lid := lic["license_id"].(string)
	if !strings.HasPrefix(lic["license_no"].(string), fmt.Sprintf("UAV-PILOT-%d-", time.Now().Year())) {
		t.Errorf("license_no = %v", lic["license_no"])
	}
	// category 非法 → 6002
	if resp = postJSON(t, r, "/api/pilot/apply", map[string]any{"name": "x", "id_number": "y", "category": "直升机"}); resp["code"].(float64) != 6002 {
		t.Errorf("非法 category = %v, want 6002", resp)
	}
	// query 命中 + 未命中 → 7002
	if resp = postJSON(t, r, "/api/pilot/query", map[string]any{"license_id": lid}); resp["code"].(float64) != 0 {
		t.Errorf("query: %v", resp)
	}
	if resp = postJSON(t, r, "/api/pilot/query", map[string]any{"license_id": "PIL-NOPE"}); resp["code"].(float64) != 7002 {
		t.Errorf("query miss = %v, want 7002", resp)
	}
	// list category 过滤 + 分页回显
	resp = postJSON(t, r, "/api/pilot/list", map[string]any{"category": "多旋翼"})
	d := resp["data"].(map[string]any)
	if d["total"].(float64) != 1 || d["page"].(float64) != 1 || d["page_size"].(float64) != 20 {
		t.Errorf("list = %v", d)
	}
	// 正则形状复核：UAV-PILOT-<年>-<4位数字>
	if !regexp.MustCompile(`^UAV-PILOT-[0-9]{4}-[0-9]{4}$`).MatchString(lic["license_no"].(string)) {
		t.Errorf("license_no 形状 = %v", lic["license_no"])
	}
}

func TestMissionCreatePilotLicenseLink(t *testing.T) {
	deps := validTestDeps(t)
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}
	if resp := postJSON(t, r, "/api/demo/init", map[string]any{}); resp["code"].(float64) != 0 {
		t.Fatalf("demo/init: %v", resp)
	}
	lic := postJSON(t, r, "/api/pilot/apply", map[string]any{"name": "医疗运输操控员", "id_number": "420100199203054321", "category": "垂直起降"})
	lid := lic["data"].(map[string]any)["license"].(map[string]any)["license_id"].(string)

	body := func(licenseID string) map[string]any {
		return map[string]any{
			"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
			"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
			"route_segments": []string{"R101", "R205", "R306"},
			"altitude_min": 60, "altitude_max": 120, "payload_type": "CAMERA",
			"description": "执照关联任务", "pilot_license_id": licenseID,
		}
	}
	// 有效执照 → 创建成功且回显 pilot_license_id
	resp := postJSON(t, r, "/api/mission/create", body(lid))
	if resp["code"].(float64) != 0 {
		t.Fatalf("mission/create with license: %v", resp)
	}
	if resp["data"].(map[string]any)["pilot_license_id"] != lid {
		t.Errorf("pilot_license_id = %v, want %s", resp["data"].(map[string]any)["pilot_license_id"], lid)
	}
	// 不存在执照 → 7002（校验在事务前，未产生任务；auto mission_id 计数不受影响）
	if resp = postJSON(t, r, "/api/mission/create", body("PIL-NOPE")); resp["code"].(float64) != 7002 {
		t.Errorf("unknown license = %v, want 7002", resp)
	}
	// 过期执照 → 7002（直插过期行）
	past := timex.New(time.Now().AddDate(-1, 0, 0))
	deps.DB.Create(&model.PilotLicense{
		LicenseID: "PIL-EXP-API", LicenseNo: "UAV-PILOT-2020-9999", Name: "过期者", IdNumber: "420100198001010011",
		Category: "多旋翼", Status: "ISSUED", IssuedAt: past, ExpiresAt: past,
	})
	if resp = postJSON(t, r, "/api/mission/create", body("PIL-EXP-API")); resp["code"].(float64) != 7002 {
		t.Errorf("expired license = %v, want 7002", resp)
	}
}
```

（mission/submit 全链路无需在此重复——7002 分支在事务前返回不产生任务，canonical 未含新列，既有回归测试覆盖提交/审核/签发链。）

- [ ] **Step 9: 跑 API 测试确认通过**

```bash
go test ./internal/api/ -run 'TestPilotEndpoints|TestMissionCreatePilotLicenseLink' -count=1 -v
```

预期：两个测试 `--- PASS`。

- [ ] **Step 10: 全量回归 + vet**

```bash
go test ./... -count=1 && go vet ./...
```

预期：全部 `ok`。重点确认 `tests/`（missionMainline 载荷未变，acceptance 与 apifox 回放逐字节一致语义保持）与 `internal/regulatory`（inspection canonical 重算全绿）。

- [ ] **Step 11: 提交**

```bash
git add internal/model/uom.go internal/model/business.go internal/model/db.go internal/model/db_test.go internal/model/idgen.go internal/uavbusiness/pilot.go internal/uavbusiness/pilot_test.go internal/uavbusiness/mission.go internal/api/uom_handler.go internal/api/uom_handler_test.go internal/api/mission_handler.go internal/api/router.go
git commit -m "$(cat <<'EOF'
feat(backend): 执照域——操控员执照即申即发 + 任务可选关联（spec §3.4）

- 新表 pilot_licenses（PIL- 前缀；LicenseNo=UAV-PILOT-<年份>-<4位随机>；默认有效期+2年；
  canonical 内容 SM9 管理方 FISCO-ADMIN 签名，前端可经 crypto/sm9/verify 复核）
- pilot/apply·list（category 过滤分页）·query（不存在→7002）
- mission/create 可选 pilot_license_id：不存在/过期→7002；
  该字段只做普通列，绝不进任务 canonical 签名材料（inspection.go 逐字段重算红线）
- 端点 70→73（apidoc 表契约同步在 Task 6 统一处理）

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 追踪映射根治——注册即建 IdentityMapping、签发回填 pass_id（spec §3.5）

**Files:**
- Modify: `internal/model/idgen.go`（+GenPseudo/+GenDeviceAddress）
- Create: `internal/uavbusiness/mapping.go`
- Modify: `internal/uavbusiness/uav.go`（RegisterUAV 成功后 + StatusUAV VERIFY 分支建映射）
- Modify: `internal/uavbusiness/pass.go`（IssuePass 成功后回填 pass_id）
- Test: `internal/uavbusiness/mapping_test.go`（新建）

**Interfaces:**
- Consumes（均已逐字核实）:
  - `model.IdentityMapping`（internal/model/regulatory.go:18）字段：`MappingID/Pseudo(uniqueIndex)/DeviceAddress/PassID/SM9Identity/UAVID/OperatorID/ManufacturerID/SourceChain/CreatedAt`。
  - `model.GenMappingID()`（"IDM-"+12hex，idgen.go:25）；`codeOf/testSvc/testSvcFull` 测试助手。
  - `New(db *gorm.DB, cs *crypto.Service, gw *crosschain.Gateway, auditSvc *audit.Service) *Service`（service.go:24）。
  - `crosschain.NewGateway(db, cs, chains map[string]chainadapter.ChainAdapter, auditSvc) *Gateway`（gateway.go:34）——**空 adapter map = 每跳跨链必败**（sim.Chain 无故障注入，用此法造跨链失败）。
  - `crypto.NewService(keyDir string) (*Service, error)`（crypto/service.go:8）；`model.Open(":memory:")` + `model.Migrate(db)`。
  - seed `IDM-DEMO-0001`（seed.go:133-140）：PassID 已冻结为 "PASS-2026-001"，回填逻辑**不得覆盖**。
- Produces:
  - `model.GenPseudo()`（"PSEUDO-UAV-"+5 位大写 hex，全长 16）；`model.GenDeviceAddress()`（"0xADDR"+5 位大写 hex）。
  - `(*Service).createIdentityMapping(ctx context.Context, traceID string, uav *model.UAV)`（best-effort 无返回值，绝不阻塞主流程；按 uav_id 查重幂等）。
  - `(*Service).backfillMappingPassID(ctx context.Context, traceID, uavID, passID, actor string)`（无映射静默；已有 pass_id 不覆盖）。
  - 审计动作：`IDENTITY_MAPPING_CREATE / IDENTITY_MAPPING_FAILED / MAPPING_PASS_BACKFILL / MAPPING_PASS_BACKFILL_FAILED`。
  - 端点数不变（73）；无新路由、无新表、无响应形状变化——监管追踪接口行为不变，只是 L2/L3 从"仅 seed 一条"变为"注册/签发即有真数据"。

- [ ] **Step 1: 写失败的测试**

新建 `internal/uavbusiness/mapping_test.go`：

```go
package uavbusiness

import (
	"context"
	"strings"
	"testing"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/model"
)

func TestRegisterUAVCreatesIdentityMapping(t *testing.T) {
	svc, db := testSvcFull(t)
	ctx := context.Background()
	db.Create(&model.Manufacturer{ManufacturerID: "MFR-MP", Name: "映射厂商", Status: "ACTIVE"})
	db.Create(&model.Operator{OperatorID: "OP-MP", Name: "映射运营方", Status: "ACTIVE"})

	uav, _, err := svc.RegisterUAV(ctx, "TRACE-MP-1", UAVInput{
		ManufacturerID: "MFR-MP", OperatorID: "OP-MP", Model: "DJI-M30", SerialNo: "SN-MP-1",
	})
	if err != nil {
		t.Fatalf("RegisterUAV: %v", err)
	}
	if uav.Status != "VERIFIED" {
		t.Fatalf("status = %q, want VERIFIED", uav.Status)
	}
	var m model.IdentityMapping
	if err := db.Where("uav_id = ?", uav.UAVID).First(&m).Error; err != nil {
		t.Fatalf("注册成功后应自动建 IdentityMapping, got err: %v", err)
	}
	if !strings.HasPrefix(m.Pseudo, "PSEUDO-UAV-") || len(m.Pseudo) != 16 {
		t.Errorf("pseudo = %q, want PSEUDO-UAV-<5位>（全长 16）", m.Pseudo)
	}
	if !strings.HasPrefix(m.DeviceAddress, "0xADDR") {
		t.Errorf("device_address = %q, want 0xADDR 前缀", m.DeviceAddress)
	}
	if m.PassID != "" {
		t.Errorf("创建时 pass_id 应为空（签发时回填）= %q", m.PassID)
	}
	if m.SM9Identity != crypto.SM9IdentityOf(uav.UAVID) || m.OperatorID != "OP-MP" ||
		m.ManufacturerID != "MFR-MP" || m.SourceChain != "chainmaker" {
		t.Errorf("mapping = %+v", m)
	}
}

func TestNoMappingOnCrosschainFailure(t *testing.T) {
	// 空 adapter map = 每跳跨链必败：注册应停留 REGISTERED 且**不**建映射
	//（链上无凭据，追踪就该断——禁止拼造红线）。
	db, err := model.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	if err := model.Migrate(db); err != nil {
		t.Fatal(err)
	}
	cs, err := crypto.NewService(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	auditSvc := audit.New(db)
	gw := crosschain.NewGateway(db, cs, map[string]chainadapter.ChainAdapter{}, auditSvc)
	svc := New(db, cs, gw, auditSvc)
	ctx := context.Background()
	db.Create(&model.Manufacturer{ManufacturerID: "MFR-MF", Name: "失败厂商", Status: "ACTIVE"})
	db.Create(&model.Operator{OperatorID: "OP-MF", Name: "失败运营方", Status: "ACTIVE"})

	uav, _, err := svc.RegisterUAV(ctx, "TRACE-MP-2", UAVInput{
		ManufacturerID: "MFR-MF", OperatorID: "OP-MF", SerialNo: "SN-MF-1",
	})
	if err == nil {
		t.Fatal("空 adapter map 下 RegisterUAV 应失败")
	}
	if uav == nil || uav.Status != "REGISTERED" {
		t.Fatalf("uav = %+v, want REGISTERED 停留留痕", uav)
	}
	var cnt int64
	db.Model(&model.IdentityMapping{}).Count(&cnt)
	if cnt != 0 {
		t.Errorf("mapping count = %d, want 0（跨链失败不建映射）", cnt)
	}
}

func TestBackfillMappingPassID(t *testing.T) {
	svc, db := testSvc(t)
	ctx := context.Background()
	db.Create(&model.IdentityMapping{
		MappingID: "IDM-BF-1", Pseudo: "PSEUDO-UAV-BF001", DeviceAddress: "0xADDRBF001",
		UAVID: "UAV-BF-1", OperatorID: "OP-1", ManufacturerID: "MFR-1", SourceChain: "chainmaker",
	})
	svc.backfillMappingPassID(ctx, "TRACE-MP-3", "UAV-BF-1", "PASS-BF-1", "FISCO-ADMIN")
	var m model.IdentityMapping
	db.Where("mapping_id = ?", "IDM-BF-1").First(&m)
	if m.PassID != "PASS-BF-1" {
		t.Errorf("pass_id = %q, want PASS-BF-1", m.PassID)
	}
	// 已有 pass_id 不得覆盖（保护 seed IDM-DEMO-0001 的冻结字面量 PASS-2026-001）
	svc.backfillMappingPassID(ctx, "TRACE-MP-4", "UAV-BF-1", "PASS-BF-2", "FISCO-ADMIN")
	db.Where("mapping_id = ?", "IDM-BF-1").First(&m)
	if m.PassID != "PASS-BF-1" {
		t.Errorf("pass_id 被覆盖 = %q, want PASS-BF-1", m.PassID)
	}
	// 无映射 UAV：静默返回不 panic（追踪断点由监管层留痕，这里不拼造）
	svc.backfillMappingPassID(ctx, "TRACE-MP-5", "UAV-NOPE", "PASS-X", "FISCO-ADMIN")
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
go test ./internal/uavbusiness/ -run 'Mapping|TestRegisterUAVCreatesIdentityMapping|TestNoMappingOnCrosschainFailure|TestBackfill' -count=1
```

预期：**FAIL（build failed）**——`svc.backfillMappingPassID undefined`。（前两个测试函数本身可编译，跑起来也会因未建映射而 FAIL。）

- [ ] **Step 3: 实现 ID 生成器**

`internal/model/idgen.go` —— Task 4 的 `GenLicenseNo` 之后、`IdempotencyKey` 之前插入（`strings` 已在 import 中）：

```go
// GenPseudo 追踪伪名 "PSEUDO-UAV-<5位大写hex>"（与 seed IDM-DEMO-0001 形状一致，spec §3.5）。
func GenPseudo() string { return "PSEUDO-UAV-" + strings.ToUpper(randHex(6)[:5]) }

// GenDeviceAddress 模拟设备链上地址 "0xADDR<5位大写hex>"（与 seed 形状一致，spec §3.5）。
func GenDeviceAddress() string { return "0xADDR" + strings.ToUpper(randHex(6)[:5]) }
```

- [ ] **Step 4: 实现映射服务**

新建 `internal/uavbusiness/mapping.go`：

```go
package uavbusiness

import (
	"context"
	"strings"

	"skytrust-backend/internal/model"
)

// createIdentityMapping 追踪映射根治（spec §3.5）：UAV 注册跨链证明成功（VERIFIED）后
// 自动创建 IdentityMapping，使 7 级追踪 L2（伪名→真实身份）有真数据可溯。
// best-effort：任何失败只记审计留痕，绝不阻塞注册主流程；
// 同 uav_id 已有映射则不重复创建（幂等）；pseudo 撞 uniqueIndex 则重生成（至多 5 次）。
func (s *Service) createIdentityMapping(ctx context.Context, traceID string, uav *model.UAV) {
	var cnt int64
	if err := s.db.WithContext(ctx).Model(&model.IdentityMapping{}).
		Where("uav_id = ?", uav.UAVID).Count(&cnt).Error; err == nil && cnt > 0 {
		return // 已有映射（正常流程不应发生）：幂等不重复
	}
	for i := 0; i < 5; i++ {
		m := &model.IdentityMapping{
			MappingID:      model.GenMappingID(),
			Pseudo:         model.GenPseudo(),
			DeviceAddress:  model.GenDeviceAddress(),
			SM9Identity:    uav.SM9Identity,
			UAVID:          uav.UAVID,
			OperatorID:     uav.OperatorID,
			ManufacturerID: uav.ManufacturerID,
			SourceChain:    "chainmaker",
			PassID:         "", // pass/issue 成功后回填（backfillMappingPassID）
		}
		err := s.db.WithContext(ctx).Create(m).Error
		if err == nil {
			s.logAudit(traceID, uav.UAVID, "IDENTITY_MAPPING_CREATE", "IDENTITY_MAPPING", m.MappingID,
				map[string]any{"uav_id": uav.UAVID, "pseudo": m.Pseudo, "device_address": m.DeviceAddress})
			return
		}
		if msg := err.Error(); strings.Contains(msg, "UNIQUE constraint failed") && strings.Contains(msg, "pseudo") {
			continue // pseudo 碰撞：重生成
		}
		s.logAudit(traceID, uav.UAVID, "IDENTITY_MAPPING_FAILED", "IDENTITY_MAPPING", uav.UAVID,
			map[string]any{"error": err.Error()})
		return
	}
	s.logAudit(traceID, uav.UAVID, "IDENTITY_MAPPING_FAILED", "IDENTITY_MAPPING", uav.UAVID,
		map[string]any{"error": "pseudo space exhausted (5 collisions)"})
}

// backfillMappingPassID 追踪映射根治（spec §3.5）：pass/issue 成功后 best-effort 回填
// 该 UAV 最新映射的 pass_id——否则 7 级追踪 L3 判据 m.PassID=="" 恒断链。
// 规则：无映射→静默（断点留痕是监管层语义，这里禁止拼造）；已有 pass_id 不覆盖
//（保护 seed IDM-DEMO-0001 的冻结字面量 PASS-2026-001，C17 裁定）。
func (s *Service) backfillMappingPassID(ctx context.Context, traceID, uavID, passID, actor string) {
	var m model.IdentityMapping
	if err := s.db.WithContext(ctx).Where("uav_id = ?", uavID).
		Order("created_at DESC").First(&m).Error; err != nil {
		return
	}
	if m.PassID != "" {
		return
	}
	if err := s.db.WithContext(ctx).Model(&m).Update("pass_id", passID).Error; err != nil {
		s.logAudit(traceID, actor, "MAPPING_PASS_BACKFILL_FAILED", "IDENTITY_MAPPING", m.MappingID,
			map[string]any{"uav_id": uavID, "error": err.Error()})
		return
	}
	s.logAudit(traceID, actor, "MAPPING_PASS_BACKFILL", "IDENTITY_MAPPING", m.MappingID,
		map[string]any{"uav_id": uavID, "pass_id": passID})
}
```

- [ ] **Step 5: 接线 uav.go 两处调用点**

① `RegisterUAV` 尾部（锚点逐字，含函数收尾大括号）：

```go
	if err := s.transitionUAV(traceID, in.OperatorID, uav, "VERIFIED", "REGISTER_PROOF_OK"); err != nil {
		return uav, tx, err
	}
	return uav, tx, nil
}
```

改为：

```go
	if err := s.transitionUAV(traceID, in.OperatorID, uav, "VERIFIED", "REGISTER_PROOF_OK"); err != nil {
		return uav, tx, err
	}
	// 追踪映射根治（spec §3.5）：跨链证明成功即建 IdentityMapping；
	// 失败已提前 return（停留 REGISTERED）——链上无凭据，追踪就该断，不建映射。
	s.createIdentityMapping(ctx, traceID, uav)
	return uav, tx, nil
}
```

② `StatusUAV` 的 VERIFY 分支（锚点逐字）：

```go
		if err := s.transitionUAV(traceID, uav.OperatorID, uav, to, "VERIFY"); err != nil {
			return uav, tx, err
		}
		return uav, tx, nil
	}
```

改为：

```go
		if err := s.transitionUAV(traceID, uav.OperatorID, uav, to, "VERIFY"); err != nil {
			return uav, tx, err
		}
		// VERIFY 仅能从 REGISTERED 进入 = 此前注册跨链失败 = 尚无映射；补建之。
		// createIdentityMapping 内部按 uav_id 查重，重复调用无害。
		s.createIdentityMapping(ctx, traceID, uav)
		return uav, tx, nil
	}
```

- [ ] **Step 6: 接线 pass.go 回填调用点**

`IssuePass` 尾部（锚点逐字）：

```go
	s.logAudit(traceID, in.Issuer, "PASS_ISSUE", "PASS", p.PassID,
		map[string]any{"mission_id": p.MissionID, "uav_id": p.UAVID, "cross_tx_id": tx.CrossTxID,
			"window": []string{timex.FormatTime(p.ValidFrom.Time), timex.FormatTime(p.ValidTo.Time)}})
	return &p, tx, nil
```

改为：

```go
	s.logAudit(traceID, in.Issuer, "PASS_ISSUE", "PASS", p.PassID,
		map[string]any{"mission_id": p.MissionID, "uav_id": p.UAVID, "cross_tx_id": tx.CrossTxID,
			"window": []string{timex.FormatTime(p.ValidFrom.Time), timex.FormatTime(p.ValidTo.Time)}})
	// 追踪映射根治（spec §3.5）：签发成功即回填最新映射的 pass_id，否则追踪 L3 恒断；
	// best-effort，不影响签发结果；已有 pass_id 不覆盖。
	s.backfillMappingPassID(ctx, traceID, p.UAVID, p.PassID, in.Issuer)
	return &p, tx, nil
```

- [ ] **Step 7: 跑测试确认通过**

```bash
go test ./internal/uavbusiness/ -run 'Mapping|TestRegisterUAVCreatesIdentityMapping|TestNoMappingOnCrosschainFailure|TestBackfill' -count=1 -v
```

预期：三个测试 `--- PASS`。

- [ ] **Step 8: 全量回归 + vet**

```bash
go test ./... -count=1 && go vet ./...
```

预期：全部 `ok`。重点确认：
- `internal/regulatory`（trace_test 自带隔离 seed，不受影响；已核实无映射计数断言）；
- `tests/acceptance` TC3（追踪链走 seed IDM-DEMO-0001，pass_id 冻结不被覆盖——backfill 的 PassID!="" 守卫保证）；
- `tests/` E2E（e2e 注册 UAV 现在会多建映射行，无断言依赖映射总数）。

- [ ] **Step 9: 提交**

```bash
git add internal/model/idgen.go internal/uavbusiness/mapping.go internal/uavbusiness/mapping_test.go internal/uavbusiness/uav.go internal/uavbusiness/pass.go
git commit -m "$(cat <<'EOF'
fix(backend): 追踪映射根治——注册成功即建 IdentityMapping、签发回填 pass_id（spec §3.5）

- RegisterUAV 跨链证明成功（VERIFIED）后自动创建 IdentityMapping（伪名/设备地址
  与 seed 形状一致：PSEUDO-UAV-<5hex> / 0xADDR<5hex>）；跨链失败不建——链上无凭据追踪就该断
- StatusUAV VERIFY 分支补建（此前注册跨链失败的补救路径；按 uav_id 查重幂等）
- IssuePass 成功后 best-effort 回填最新映射 pass_id（否则 7 级追踪 L3 判据恒断链）；
  已有 pass_id 不覆盖（保护 seed IDM-DEMO-0001 冻结字面量）
- best-effort 语义：失败只记审计（IDENTITY_MAPPING_FAILED / MAPPING_PASS_BACKFILL_FAILED），
  绝不阻塞注册/签发主流程；端点数与响应形状不变
- 新测试：注册建映射 / 跨链失败不建映射（空 adapter map）/ 回填与不覆盖守卫

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 契约同步——apidoc 73 端点、场景编排、README/CLAUDE.md、Apifox 工件再生成（spec §3.6）

**Files:**
- Modify: `internal/apidoc/endpoints.go`（注释 64→73；+6 行 UOM登记；uav/register 样例 +realname_id；+3 行 遥测）
- Modify: `internal/apidoc/storylines.go`（TC1-02 前置 3 步；TC2-03 追加 2 步）
- Modify: `internal/apidoc/table_test.go:29`（计数断言 64→73）
- Modify: `tests/apifox_replay_test.go`（两处 paths 计数断言 64→73，约 :133 与 :191）
- Modify: `README.md`（9 处，见 Step 7）
- Modify: `/root/codes/skytrust-uav-supervision/CLAUDE.md`（4 处，未跟踪文件，改而不提交）
- Regenerate: `docs/apifox/skytrust-backend.openapi.json`、`docs/apifox/skytrust-test-scenarios.json`、`frontend/js/data/endpoints.js`（仓库根相对路径；**只能脚本再生成，勿手改**）

**Interfaces:**
- Consumes: Task 1-5 全部端点/字段已就位（route/node 坐标、telemetry×3、realname×3、pilot×3、uav/register 的 realname_id、mission/create 的 pilot_license_id）；再生成命令（CLAUDE.md 权威）：`APIFOX_GEN=1 go test ./tests/ -run 'TestApifox' -count=1` + 仓库根 `./scripts/gen-endpoints.sh`。
- Produces: 73 端点契约（计划 B 三端前端以此为唯一 API 权威）；回放断言与实际路由数永久同步。
- 不变量：场景数恒 24（只加步骤不加场景）；ProbeExpect=0 恒 7 行（新 9 行全 6002）；`missionMainline()` 与 `reviewApproved()/b002Create()` 逐字节不动（与 acceptance 手写主线同源）；确定性错误样例三处不动。

- [ ] **Step 1: 先改三处计数断言（红灯先行）**

① `internal/apidoc/table_test.go`（TestEndpointTableComplete 开头）：

```go
	if len(Endpoints) != 64 {
		t.Fatalf("endpoints = %d, want 64", len(Endpoints))
	}
```

改为：

```go
	if len(Endpoints) != 73 {
		t.Fatalf("endpoints = %d, want 73", len(Endpoints))
	}
```

② `tests/apifox_replay_test.go` 第一处（TestApifoxEndpointSamples 内，Fatalf 消息含 "openapi paths"）：

```go
	if len(paths) != 64 {
		t.Fatalf("openapi paths = %d, want 64", len(paths))
	}
```

改为：

```go
	if len(paths) != 73 {
		t.Fatalf("openapi paths = %d, want 73", len(paths))
	}
```

③ 同文件第二处（committed 工件校验，Fatalf 消息为 "paths = %d, want 64"）：

```go
	if len(paths) != 64 {
		t.Fatalf("paths = %d, want 64", len(paths))
	}
```

改为：

```go
	if len(paths) != 73 {
		t.Fatalf("paths = %d, want 73", len(paths))
	}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
go test ./internal/apidoc/ -run TestEndpointTableComplete -count=1
```

预期：**FAIL** —— `endpoints = 64, want 73`。

- [ ] **Step 3: 端点表 +9 行与样例改造（endpoints.go）**

3a. 表头注释：

```go
// Endpoints 全部 64 个 POST 端点，按单服务器回放故事序排列（P5-R7 手写唯一源）。
```

改为：

```go
// Endpoints 全部 73 个 POST 端点，按单服务器回放故事序排列（P5-R7 手写唯一源）。
```

3b. 在 `/api/route/list` 行（:51）之后、`/api/uav/register` 行（:52）之前插入 6 行（**必须在此位置**：uav/register 样例引用 `${subject_id}`，Capture 须先行定义——P5-R13）：

```go
	{Path: "/api/realname/register", Group: "UOM登记", Summary: "实名登记（个人/企业，模拟证件号；→REGISTERED）", Sample: map[string]any{"subject_type": "ENTERPRISE", "name": "文档样例物流企业", "id_number": "91420100DOCAIR01X", "contact": "027-88880001"}, ExpectCode: 0, ProbeExpect: 6002, Capture: map[string]string{"subject_id": "data.subject.subject_id"}},
	{Path: "/api/realname/list", Group: "UOM登记", Summary: "实名主体分页列表（subject_type 可选过滤）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/realname/query", Group: "UOM登记", Summary: "实名主体查询（不存在→7001）", Sample: map[string]any{"subject_id": "${subject_id}"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/pilot/apply", Group: "UOM登记", Summary: "操控员执照申请（即申即发；SM9 管理方签名；默认有效期+2年）", Sample: map[string]any{"name": "文档样例操控员", "id_number": "420100199001010011", "category": "多旋翼"}, ExpectCode: 0, ProbeExpect: 6002, Capture: map[string]string{"license_id": "data.license.license_id"}},
	{Path: "/api/pilot/list", Group: "UOM登记", Summary: "执照分页列表（category 可选过滤）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/pilot/query", Group: "UOM登记", Summary: "执照查询（不存在→7002）", Sample: map[string]any{"license_id": "${license_id}"}, ExpectCode: 0, ProbeExpect: 6002},
```

3c. `/api/uav/register` 行整行替换（Summary 补注 + Sample 追加 realname_id 引用）：

```go
	{Path: "/api/uav/register", Group: "无人机", Summary: "无人机注册 + UAV_REGISTER_PROOF 跨链三链留痕", Sample: map[string]any{"uav_id": "UAV-DOC-001", "manufacturer_id": "Manufacturer-B", "operator_id": "Operator-A", "model": "DJI-M350", "serial_no": "SN-DOC-001"}, ExpectCode: 0, ProbeExpect: 6002},
```

改为：

```go
	{Path: "/api/uav/register", Group: "无人机", Summary: "无人机注册 + UAV_REGISTER_PROOF 跨链三链留痕（registration_mark 自动签发；可选关联实名主体；成功后自动建追踪映射）", Sample: map[string]any{"uav_id": "UAV-DOC-001", "manufacturer_id": "Manufacturer-B", "operator_id": "Operator-A", "model": "DJI-M350", "serial_no": "SN-DOC-001", "realname_id": "${subject_id}"}, ExpectCode: 0, ProbeExpect: 6002},
```

3d. 在 `/api/message/list` 行（:76）之后、`/api/wormhole/toggle` 行（:77）之前插入 3 行（**必须在此位置**：`${sid}` 已由 session/open 行 Capture 定义，且此时会话仍 ACTIVE——session/close 行在 :81，wormhole 开洞前上报才是干净样例）：

```go
	{Path: "/api/telemetry/report", Group: "遥测", Summary: "遥测上报（会话须 ACTIVE，否则→7003；seq 服务端自增）", Sample: map[string]any{"session_id": "${sid}", "lat": 30.52, "lon": 114.32, "alt": 85, "speed": 12, "heading": 45}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/telemetry/list", Group: "遥测", Summary: "遥测分页列表（session_id/uav_id 过滤）", Sample: map[string]any{"session_id": "${sid}"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/telemetry/latest", Group: "遥测", Summary: "最新遥测（session_id/uav_id 至少一个，否则→6002；无记录→code 0 + telemetry=null）", Sample: map[string]any{"session_id": "${sid}"}, ExpectCode: 0, ProbeExpect: 6002},
```

- [ ] **Step 4: 场景编排（storylines.go）**

4a. TC1-02 整块替换（前置实名/执照/注册三步，讲《紧急医疗运输》故事的登记前奏；`UAV-MED-01` 全库无碰撞——已核实）：

```go
	{ID: "TC1-02", Name: "正常任务申请跨链中继", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/mission/create", Body: missionMainline(), ExpectCode: 0},
		{Path: "/api/mission/submit", Body: map[string]any{"mission_id": "MISSION-2026-001", "operator": "Operator-A"}, ExpectCode: 0, Capture: map[string]string{"tc1_app": "data.application.application_id"}},
	}},
```

改为：

```go
	{ID: "TC1-02", Name: "正常任务申请跨链中继", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/realname/register", Body: map[string]any{"subject_type": "ENTERPRISE", "name": "紧急医疗运输企业", "id_number": "91420100MED0001X", "contact": "027-88880002"}, ExpectCode: 0, Capture: map[string]string{"tc1_subject": "data.subject.subject_id"}},
		{Path: "/api/pilot/apply", Body: map[string]any{"name": "医疗运输操控员", "id_number": "420100199203054321", "category": "垂直起降"}, ExpectCode: 0, Capture: map[string]string{"tc1_lic": "data.license.license_id"}},
		{Path: "/api/uav/register", Body: map[string]any{"uav_id": "UAV-MED-01", "manufacturer_id": "Manufacturer-B", "operator_id": "Operator-A", "model": "DJI-M350-RTK", "serial_no": "SN-MED-001", "realname_id": "${tc1_subject}"}, ExpectCode: 0},
		{Path: "/api/mission/create", Body: missionMainline(), ExpectCode: 0},
		{Path: "/api/mission/submit", Body: map[string]any{"mission_id": "MISSION-2026-001", "operator": "Operator-A"}, ExpectCode: 0, Capture: map[string]string{"tc1_app": "data.application.application_id"}},
	}},
```

（`missionMainline()` 与 submit 步逐字节不动——TC 前缀 capture 命名空间不与端点表的 `subject_id/license_id` 冲突。）

4b. TC2-03 整块替换（追加遥测两步；s1 此时仍 ACTIVE——TC2-04 才开虫洞）：

```go
	{ID: "TC2-03", Name: "正常持续交互", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/message/send", Body: map[string]any{"session_id": "${s1}", "msg_type": "HEARTBEAT", "source_node": "UAV-A-001-NODE", "target_node": "MGR"}, ExpectCode: 0},
		{Path: "/api/message/send", Body: map[string]any{"session_id": "${s1}", "msg_type": "HEARTBEAT", "source_node": "UAV-A-001-NODE", "target_node": "MGR"}, ExpectCode: 0},
		{Path: "/api/message/list", Body: map[string]any{"session_id": "${s1}"}, ExpectCode: 0},
	}},
```

改为：

```go
	{ID: "TC2-03", Name: "正常持续交互", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/message/send", Body: map[string]any{"session_id": "${s1}", "msg_type": "HEARTBEAT", "source_node": "UAV-A-001-NODE", "target_node": "MGR"}, ExpectCode: 0},
		{Path: "/api/message/send", Body: map[string]any{"session_id": "${s1}", "msg_type": "HEARTBEAT", "source_node": "UAV-A-001-NODE", "target_node": "MGR"}, ExpectCode: 0},
		{Path: "/api/message/list", Body: map[string]any{"session_id": "${s1}"}, ExpectCode: 0},
		{Path: "/api/telemetry/report", Body: map[string]any{"session_id": "${s1}", "lat": 30.52, "lon": 114.32, "alt": 85, "speed": 12, "heading": 45}, ExpectCode: 0},
		{Path: "/api/telemetry/latest", Body: map[string]any{"session_id": "${s1}"}, ExpectCode: 0},
	}},
```

- [ ] **Step 5: 跑 apidoc + 回放测试确认通过**

```bash
go test ./internal/apidoc/ ./tests/ -run 'TestEndpointTableComplete|TestApifoxReplayScenarios|TestApifoxEndpointSamples' -count=1
```

预期：全部 `ok`——表 73 行、capture 先行定义校验过、回放 73 paths / 24 场景全绿（TC1-02 的 UAV-MED-01 注册走 sim 三链成功；TC2-03 遥测上报时 s1 仍 ACTIVE）。

**注意：此步刻意排除 `TestApifoxArtifacts`**（apifox_replay_test.go:173）——它校验的是 committed `docs/apifox/*.json` 工件（此刻仍是 64 paths，Step 1 改的 :191 断言会红），Step 6 再生成后才能绿；Step 9 全量回归是最终闸门。

- [ ] **Step 6: 再生成 Apifox 工件（勿手改产物）**

```bash
APIFOX_GEN=1 go test ./tests/ -run 'TestApifox' -count=1
cd /root/codes/skytrust-uav-supervision && ./scripts/gen-endpoints.sh && cd services/skytrust-backend
git status --short ../../docs/apifox ../../frontend/js/data/endpoints.js
```

预期：`docs/apifox/skytrust-backend.openapi.json`、`docs/apifox/skytrust-test-scenarios.json`、`frontend/js/data/endpoints.js` 三个文件显示 `M`（脚本重写成功）。

- [ ] **Step 7: README.md 九处编辑（`services/skytrust-backend/README.md`）**

**注意**：README 第 12/456/460 行等 Plan 5 完成情况属**历史陈述**，其中 64/20 数字是当时事实，**不要改**。以下 9 处均为现状描述，必须改：

① 行 25（AutoMigrate 表数）：`AutoMigrate 20 张表` → `AutoMigrate 23 张表`

② 行 44 环境变量表，`OFFCHAIN_AUTOPILOT_MS` 行之后插入：

```markdown
| `TELEMETRY_AUTOPILOT_MS` | `0` | 遥测 SIM 推进间隔（毫秒）。语义同 `OFFCHAIN_AUTOPILOT_MS`：`0`=关闭（测试默认）；生产入口 main.go 在值为 0 时自动采用 2000ms；设为负值 = 显式关闭生产遥测推进 |
```

③ 行 66 端点计数（整行替换；分组和已验算=73）：

```markdown
**共 73 个端点**（分组：health×2 / chain×1 / crypto×4 / demo×2 / audit×2 / crosschain×3 / masterdata×6 / uom×6 / uav×5 / mission×4 / review×2 / conflict×2 / pass×5 / offchain×12 / telemetry×3 / regulatory×10 / experiment×4）：
```

④ 端点表：`| masterdata | \`POST /api/route/list\` | ...` 行之后、`| uav | \`POST /api/uav/register\` | ...` 行之前插入 6 行：

```markdown
| uom | `POST /api/realname/register` | 实名登记（个人/企业，模拟证件号；→REGISTERED） |
| uom | `POST /api/realname/list` | 实名主体分页列表（subject_type 可选过滤） |
| uom | `POST /api/realname/query` | 实名主体查询（不存在→7001） |
| uom | `POST /api/pilot/apply` | 操控员执照申请（即申即发；LicenseNo=UAV-PILOT-<年份>-<4位数字>；SM9 管理方签名；默认有效期+2年） |
| uom | `POST /api/pilot/list` | 执照分页列表（category 可选过滤） |
| uom | `POST /api/pilot/query` | 执照查询（不存在→7002） |
```

⑤ 端点表既有 4 行说明追加（整行替换）：

- route/create 行 → `| masterdata | \`POST /api/route/create\` | 创建航段（走廊状态 OPEN/RESTRICTED/CLOSED）；可选结构化坐标 start_lat/start_lon/end_lat/end_lon，缺省自动解析起终点内嵌 "NAME(lat,lon)"，解析失败留 0 不报错 |`
- node/register 行 → `| offchain | \`POST /api/node/register\` | 链下节点注册（node_type 四类；sm9_identity 空=自动派生；重复→6002）；可选 lat/lon 结构化坐标 |`
- uav/register 行 → `| uav | \`POST /api/uav/register\` | 无人机注册 + UAV_REGISTER_PROOF 跨链（fabric→chainmaker）→ VERIFIED；自动签发国籍登记标志 registration_mark（UAS-8位数字）；可选 realname_id 关联实名主体（不存在→7001）；成功后自动建 IdentityMapping 追踪映射 |`
- mission/create 行 → `| mission | \`POST /api/mission/create\` | 任务创建（描述 SM9 加密落库，对外仅脱敏值；SM3+SM9 签名）→ DRAFT；可选 pilot_license_id 关联操控员执照（不存在/过期→7002；该字段不进 canonical 签名材料） |`

⑥ 端点表：`| offchain | \`POST /api/event/list\` | ...` 行之后、`| regulatory | \`POST /api/alert/raise\` | ...` 行之前插入 3 行：

```markdown
| telemetry | `POST /api/telemetry/report` | 遥测上报（会话须 ACTIVE，否则→7003；seq 服务端自增；source=MANUAL） |
| telemetry | `POST /api/telemetry/list` | 遥测分页列表（session_id / uav_id 过滤） |
| telemetry | `POST /api/telemetry/latest` | 最新遥测（session_id/uav_id 至少一个，否则→6002；无记录→code 0 + telemetry=null） |
```

⑦ 错误码表：`| 6002 | Param | 参数非法 / 资源不存在 |` 行之后、`| 9001 | Internal | 内部错误 |` 行之前插入：

```markdown
| 7001 | RealnameNotFound | 实名主体不存在 |
| 7002 | LicenseInvalid | 执照不存在或已过期 |
| 7003 | TelemetrySession | 遥测上报会话状态错误（须 ACTIVE） |
```

⑧ 行 201 后台流量段（整段替换）：

```markdown
**后台流量（autopilot）：** 生产入口默认每 2000ms 为全部 ACTIVE 会话发送 HEARTBEAT（持续供给检测观测流量）；`OFFCHAIN_AUTOPILOT_MS` 控制（0=默认启用 2000ms，负值=关闭），测试环境不启动。遥测 SIM 推进以同一节奏并行（`TELEMETRY_AUTOPILOT_MS`，语义相同）：沿任务航段经纬度链插值推进并落遥测（source=SIM），任务缺坐标则跳过、绝不造假；飞完全程回到起点循环。
```

⑨ 目录结构三行 + Apifox 两处 + 新章节：

- 行 429 `64 端点 handler` → `73 端点 handler`
- 行 430 `端点表（64 行）` → `端点表（73 行）`
- 行 443 `20 张 GORM 模型` → `23 张 GORM 模型`；同行 offchain 描述如缺"遥测"则补 `、遥测上报与 SIM 推进`
- 行 465 `OpenAPI 3.0.3，64 个全 POST 端点` → `OpenAPI 3.0.3，73 个全 POST 端点`
- 行 473 `TestApifoxEndpointSamples`（64 端点故事序样例 → `TestApifoxEndpointSamples`（73 端点故事序样例

文件末尾（行 473 之后）追加新章节：

```markdown

## UOM 登记与运行识别域

对齐「民用无人驾驶航空器综合管理平台」（UOM）操作模型的后端纯加法扩展（设计权威：`docs/superpowers/specs/2026-10-06-uom-three-portals-design.md` §3；实施：`docs/superpowers/plans/2026-10-06-uom-backend-domains.md`）：

- **地理**：航段携带结构化经纬度（`start_lat/start_lon/end_lat/end_lon`，创建时自动解析起终点内嵌 `"NAME(lat,lon)"`，解析失败留 0 不报错）；节点携带可选 `lat/lon`。抽象 Position/拓扑/Dijkstra 不变。
- **实名登记**（`realname/*`）：个人/企业两类主体，模拟证件号（不存真实证件）；登记即 `REGISTERED`。UAV 注册自动签发国籍登记标志 `registration_mark=UAS-<8位数字>`（uniqueIndex），可选 `realname_id` 关联实名主体（不存在→7001）。
- **操控员执照**（`pilot/*`）：模拟即审即发——`LicenseNo=UAV-PILOT-<年份>-<4位随机数字>`、默认有效期+2年、canonical 内容由管理方（FISCO-ADMIN）SM9 签名，前端可经 `crypto/sm9/verify` 复核防篡改。任务可选 `pilot_license_id` 关联（不存在/过期→7002）；该字段不进任务 canonical 签名材料（inspection 逐字段重算，兼容既有密文）。
- **遥测**（`telemetry/*`）：人工上报要求会话 ACTIVE（否则→7003），seq 服务端自增、SM3/SM9 不落遥测（高频小记录）；SIM 自动驾驶（`TELEMETRY_AUTOPILOT_MS`）每 tick 沿任务航段经纬度链插值推进（12m/s 仿真速度），缺坐标任务跳过不造假，飞完全程回起点循环。
- **追踪映射根治**：`uav/register` 跨链证明成功（VERIFIED）即自动创建 IdentityMapping（`pseudo=PSEUDO-UAV-<5hex>` / `device_address=0xADDR<5hex>`）；跨链失败不建——链上无凭据追踪就该断。`pass/issue` 成功后 best-effort 回填该 UAV 最新映射的 `pass_id`（否则 7 级追踪 L3 判据恒断链），已有 pass_id 不覆盖（保护 seed `IDM-DEMO-0001` 冻结字面量）。trace/identity 断链演示语义（5001+断点留痕，禁止拼造）不变。
```

- [ ] **Step 8: CLAUDE.md 四处编辑（仓库根；未跟踪文件，改而不 git add）**

① 行 18 系统二表格行，行尾 `节点隔离与路径重算恢复 |` → `节点隔离与路径重算恢复、遥测上报与 SIM 推进 |`
② 行 71：`- **所有端点一律 POST**，共 64 个（分组见` → `- **所有端点一律 POST**，共 73 个（分组见`
③ 行 77：`（GORM + glebarez/sqlite 纯 Go，无 cgo；20 张表）` → `（GORM + glebarez/sqlite 纯 Go，无 cgo；23 张表）`
④ 行 110：`**权威 API 参考**：64 端点表、错误码表` → `**权威 API 参考**：73 端点表、错误码表`

- [ ] **Step 9: 全量回归 + vet（最终闸门）**

```bash
go test ./... -count=1 && go vet ./...
```

预期：全部 `ok`——64→73 的三处硬断言、24 场景回放、24 例验收、E2E 全绿；工件与端点表一致（回放测试读 committed 工件校验 paths=73）。

- [ ] **Step 10: 提交**

```bash
git add internal/apidoc/endpoints.go internal/apidoc/storylines.go internal/apidoc/table_test.go tests/apifox_replay_test.go README.md ../../docs/apifox/skytrust-backend.openapi.json ../../docs/apifox/skytrust-test-scenarios.json ../../frontend/js/data/endpoints.js
git commit -m "$(cat <<'EOF'
docs(backend): 契约同步——apidoc 73 端点表、场景编排、README/CLAUDE.md、Apifox 工件再生成（spec §3.6）

- 端点表 64→73：+realname×3/+pilot×3（Group UOM登记，位于 route/list 后 uav/register 前——
  ${subject_id}/${license_id} Capture 先行定义 P5-R13）+telemetry×3（Group 遥测，位于
  message/list 后 wormhole/toggle 前——会话仍 ACTIVE 的干净样例窗口）
- uav/register 样例 +realname_id 引用；TC1-02 前置实名/执照/UAV-MED-01 注册三步，
  TC2-03 追加遥测上报+最新两步；场景数恒 24、probe0 恒 7、missionMainline 逐字节不动
- 三处计数硬断言 64→73（table_test :29 / replay :133 :191）
- README：23 张表/73 端点分组行/9 行表格/4 行说明追加/错误码 7xxx/
  TELEMETRY_AUTOPILOT_MS/后台流量段/目录结构/新章节「UOM 登记与运行识别域」；
  Plan 5 历史陈述行（12/456/460）刻意不改；CLAUDE.md 同步 4 处（未跟踪不提交）
- docs/apifox/*.json 与 frontend/js/data/endpoints.js 经 APIFOX_GEN=1 + gen-endpoints.sh 再生成

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

## 计划完成判据

- [ ] 6 个任务全部提交，`go test ./... -count=1 && go vet ./...` 在干净工作树上全绿
- [ ] 端点计数三处硬断言=73；场景数=24；probe0=7
- [ ] `git status --short` 仅剩未跟踪的 CLAUDE.md（刻意不提交）
- [ ] 生产红线复查：全程未触碰 :8080/:8090、未动链容器、go.mod 依赖零漂移、`.env` 未入库
- [ ] 计划 B（三端前端+脚本重写）另行编写，以本计划产出的 73 端点契约为唯一 API 权威
