# 验收导向业务流水线浏览器（布局 E）× 讲解人手册 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 后端新增 2 个只读聚合端点（`explorer/journey`、`explorer/goals`，78→80），前端 chainview 拆分为 `js/cxv/*` 模块族并在四端 + index 落地布局 E（三目标证据条 → 对象选择器 → 旅程概要头 → 横向时间线 → 折叠泳道 → 既有三区），并新写讲解人手册 `docs/acceptance-manual.md`。

**Architecture:** 纯只读展示层 + 文档，零业务逻辑变更。聚合逻辑放 `internal/api` 层（builder 定夺项，已定：不新建 internal/explorer 包），只经 `deps.DB` GORM 读 + 既有 `deps.Chains`/`deps.Gateway` 组合，不新增 Deps 字段（frozen）。前端零构建 IIFE + window 命名空间，薄壳 `js/chainview.js` 保持 `CXV.render/SMALL_PRINT/_pure` 导出面不变，新增 `CXV.SHARED` 共享原语；四个模块按 goals→journey→lanes→zones 顺序装载，跨模块引用一律运行时经 window 全局解析。

**Tech Stack:** Go 1.25 + gin + GORM/sqlite（hermetic sim，`go test ./...` 无网络无 Docker）；原生 HTML/CSS/JS（`d-`/`--d-*` 命名空间）；apidoc→apifox→endpoints.js 生成链。

**Spec:** `docs/superpowers/specs/2026-10-19-acceptance-explorer-manual-design.md`（§5 端点契约、§6 前端拆分与几何合同、§7 手册结构为钉死项；视觉合同归档 `docs/superpowers/specs/assets/2026-10-19-explorer-layout-e-mockup.html`，文字与归档有歧义时以归档为准）

**范围注记:** 本计划**不含生产部署**。:8080/:8090 生产更新是独立的受控窗口，不在任何任务内。

## Global Constraints

每条对全部任务生效，违反即失败：

1. **生产红线**：:8080（真实后端）与 :8090（前端代理）是生产——不杀、不重启、不 POST。一切本地/联调运行必须覆写 `SERVER_ADDR`/`DB_PATH`/`SM9_KEY_DIR` 到 /tmp 一次性目录 + 空闲端口（:18080/:18090 模式，参照 `scripts/verify-three-portals-story.sh`，该脚本自带隔离、可随时跑）。
2. **数据红线**：`demo/reset` 只允许打隔离 sim；真实链数据永不重置（P6-R6）；永不 `network.sh down`。
3. **frozen 前端资产**：`css/app.css`、`css/product.css`、`js/app.js`、`js/api.js`、`js/store.js`、`js/ui.js`、`js/pages/wb-*`、legacy 页面（dashboard/act1/act2/act3/explorer/overview/pui-lab）不改不删；`js/pui.js` 只允许加法；不触 `:root` legacy 令牌与 `--p-*` 定义；新 CSS 用 `d-` 前缀 / `--d-*` 令牌，链色只经 `var(--p-chain-*)`/`var(--d-chain-irita)`。
4. **链色语义永不互换**：ChainMaker 紫 `#7c3aed`、Fabric 蓝 `#2563eb`、FISCO 青 `#0891b2`、IRITA 绿（`--d-chain-irita`）；状态永远图标+文字，不单靠颜色。
5. **frozen Go 依赖**：gin v1.12.0、gorm v1.31.2、glebarez/sqlite v1.11.0、gmsm v0.44.1、go 1.25.0——不动 `go.mod`/`go.sum`。
6. **API 铁律**：全 POST + JSON；HTTP 恒 200，业务成败看 envelope `code`（0=成功）；envelope `{code,message,data,trace_id,timestamp}`；时间一律 `internal/timex`（Asia/Shanghai，`2006-01-02 15:04:05.000`）；列表 `{records,total,page,page_size}`；错误码单一事实源 `internal/errcode`（6002 参数/不存在，2005 能力降级，ErrInternal 内部错）。
7. **域隔离**：`internal/offchain` 不 import crosschain/uavbusiness；本期新代码只读，不调用任何域服务写路径、不写库。
8. **诚实红线（反目标）**：不为未完成业务流编造旅程节点（空态如实）；目标芯片数字绝不写死（请求时实时计算，测不到→null→前端「—」）；不在 sim 数据上声称链本体密码学能力（IRITA SM2/Merkle 文案仅 mode=real 出现，沿用四期裁决 D）；坐标 0=未设不猜测。
9. **芯片①口径（决策 8）**：业务留痕口径——排除 `business_id LIKE 'EXP-%'` 压测行；`#rN` 重试行各算一条；芯片带固定小字口径标注；第③区台账保持全量原始表。
10. **生成物只经命令再生成**：`docs/apifox/*.json` 用 `APIFOX_GEN=1 go test ./tests/ -run 'TestApifox' -count=1`；`frontend/js/data/endpoints.js` 用 `./scripts/gen-endpoints.sh`；永不手改。
11. **提交纪律**：中文 conventional commits 直接提交 main，每条以 `Co-Authored-By: Claude Code <noreply@anthropic.com>` trailer 结尾；`CLAUDE.md` 永不 stage/commit；既有脏文件（platform 子模块噪声、未格式化的 `regulatory_handler_test.go`、`contracts/fabric/operator_business_1.0.tar.gz`）永不 stage、永不 gofmt。
12. **质量门**：每个后端任务结束 `go test ./... -count=1` 全绿 + `gofmt -l` 对改动文件为空；每个前端任务新/改 JS 过 `node --check`。Go 命令一律先 `source scripts/env.sh`（或 `export PATH=/usr/local/go/bin:$PATH && export GOPROXY=https://goproxy.cn,direct`），工作目录 `services/skytrust-backend`。

## Review Focus

spec 隐含但无任务测试直接覆盖、最可能咬到使用者的 5 个失败模式（每条的钉住测试已写进所属任务）：

1. **锚点存在但零跨链行**（DRAFT 任务/刚建对象）→ 必须 code 0 + 空 hops + summary 零值/null，前端空态文案，绝不编造节点、绝不报错 → Task 1 `TestExplorerJourneyEmptyHops` + Task 7 空态实现 + Task 9 目检。
2. **空库 goals**（全新 sim 无业务数据）→ 中位数/通过率 null 而非 0，计数为真实 0；前端显示「—」而非 NaN/空白 → Task 2 `TestExplorerGoalsEmptyDB` + Task 6 `fmtVal` + Task 9 目检（隔离 sim reset 后首屏）。
3. **压测行污染芯片①**：`EXP-*` 行计入业务留痕、或重试行被去重 → 口径失真 → Task 2 `TestExplorerGoalsBusinessScope` 种入 EXP- 与 #rN 行断言排除/保留。
4. **文件拆分破坏既有断言面**：`CXV._pure`/`CXV.SMALL_PRINT` 导出、verify 脚本对 `frontend/js/chainview.js` 的 SMALL_PRINT 字面量 grep、5 个 HTML 的 `js/chainview.js` 挂载 grep → Task 5 全量跑 `verify-three-portals-story.sh` ALL_GREEN + 字面量物理保留在薄壳。
5. **时间线几何漂移**（做成时间比例轴、泳道列序随跳序重排、CM 段与业务段等宽）→ 偏离已批准 mockup → Task 9 目检清单逐项对照归档 mockup（等宽节点列、单条链色带、CM 段窄、列序 Fabric/CM/FISCO/IRITA）。

---

### Task 1: 后端 `POST /api/explorer/journey`（业务对象全链旅程）

**Files:**
- Create: `services/skytrust-backend/internal/api/explorer_journey_handler.go`
- Test: `services/skytrust-backend/internal/api/explorer_journey_handler_test.go`
- Modify: `services/skytrust-backend/internal/api/router.go`（第 31 行 `/explorer/tx` 之后加一行）

**Interfaces:**
- Consumes: `Deps`（frozen 10 字段，只用 `deps.DB`）；`model.Mission{MissionID,Status}`、`model.MissionApplication{ApplicationID,MissionID,Status}`、`model.ReviewRecord{ReviewID,ApplicationID,Result}`、`model.FlightPass{PassID,MissionID,Status}`、`model.UAV{UAVID}`（`internal/model/identity.go:25`）、`model.CrosschainTx`（`internal/model/crosschain.go`，字段 CrossTxID/SourceChain/FinalTargetChain/MessageType/BusinessID/SourceChainTxID/RegReceiveTxID/RegRelayTxID/TargetChainTxID/SM3Hash/SM9Identity/VerifyResult/Status/LatencyMs/CreatedAt/UpdatedAt）；api 包既有 `OK(c, data)`/`Fail(c, ErrParam, msg)`/`ErrInternal`；`timex`。
- Produces: 路由 `POST /api/explorer/journey`；handler `explorerJourneyHandler(deps *Deps) gin.HandlerFunc`；响应 data 骨架 = spec §5.1（`anchor/objects/hops/summary`，hop 含 `segments` 四段）。Task 3/4/7 依赖此契约。

**钉死语义（实现必须逐条满足）：**
- 请求 `{anchor_kind?: "mission"|"pass"|"uav", anchor_id: required}`。`anchor_id` 缺失 → binding 失败 → `Fail(c, ErrParam, "参数错误: "+err.Error())`（6002）；`anchor_kind` 给了但不在三值内 → 6002；缺省推断：前缀 `PASS-`→pass、`MISSION-`→mission（真实前缀 = `genPassID`/`genMissionID`，`MISSION-<年>-%03d`/`PASS-<年>-%03d`）；两者都不匹配 → 依序查 FlightPass、Mission、UAV 表，命中谁算谁；全不命中 → 6002 `锚点不存在: <id>`。
- 锚点行不存在（推断/kind 指向的表查无）→ 6002，message 如实；**绝不 404/500**。
- 簇解析（代码注释登记 business_id↔消息类型映射表，调用点：`uavbusiness/uav.go:102` UAV_REGISTER_PROOF→UAVID、`mission.go:384` MISSION_APPLICATION→ApplicationID、`review.go:85` MISSION_REVIEW_RESULT→ReviewID、`pass.go:187` FLIGHT_PASS→PassID（irita→fabric）、`pass.go:338` PASS_REVOKE→PassID）：
  - mission：appIDs = MissionApplication WHERE mission_id；revIDs = ReviewRecord WHERE application_id IN appIDs；passIDs = FlightPass WHERE mission_id；businessIDs = appIDs ∪ revIDs ∪ passIDs（**不含 missionID 本身**——五个调用点无人用它）。
  - pass：查 FlightPass；`MissionID != ""` → 展开为同 mission 全簇（anchor.kind 仍 pass）；空 → businessIDs = {passID}。
  - uav：businessIDs = {uavID}（UAV 注册证明是独立锚点，不并入任务簇）。
- `objects[]` = 锚点 + 簇内各对象 `{kind: mission|application|review|pass|uav, id, status}`（status 取各表原值；review 用 Result），按 kind、id 排序稳定输出。
- `hops` = CrosschainTx WHERE business_id IN businessIDs，`ORDER BY created_at ASC, cross_tx_id ASC`；seq 从 1 连续编号；每 hop 输出 spec §5.1 字段 + `segments{source_tx_id,reg_receive_tx_id,reg_relay_tx_id,target_tx_id}` 原值（空段如实空串）；**不回显 payload 与 Signature**（sm3_hash/sm9_identity 暴露口径与 crosschain/list 一致，不新增暴露面）。
- `summary`：hop_count、success_count（status=SUCCESS）、verify_pass（verify_result=PASS）、verify_total（= hop_count）；first_at/last_at = 首/末跳 created_at（timex 字符串格式），空 hops → null；`end_to_end_ms` 仅当 hop_count>0 且 success_count==hop_count 时 = `末跳.UpdatedAt.Time.Sub(首跳.CreatedAt.Time).Milliseconds()`，否则 **null**（诚实）。
- 锚点存在但零跨链行 → code 0 + hops `[]` + summary 零值/null（Review Focus 1）。
- DB 错误 → `Fail(c, ErrInternal, ...)`。本端点不产生 2005。

**Steps:**

- [ ] **Step 1: 写失败测试**（harness 同 `explorer_handler_test.go`：`validTestDeps(t)`（`router_test.go:36`）+ `NewRouter(deps)` + `postJSON`；种子直接 `deps.DB.Create` 模型行，时间用 `timex.NowT()` 偏移构造乱序）：
  - `TestExplorerJourneyMissionCluster`：种 mission + 1 app + 1 review + 1 pass + 4 条 CrosschainTx（business_id 分别为 appID/revID/passID/passID，created_at 乱序写入）→ 断言 code 0；hops 按 created_at 升序且 seq=1..4；每 hop segments 四段原值；summary.hop_count=4、success_count/verify_pass 计数正确；end_to_end_ms = 末 updated − 首 created（毫秒精确）；objects 含 mission/application/review/pass 四类。
  - `TestExplorerJourneyPassAnchorTransitive`：pass 锚点 → 与 mission 锚点同簇同 hops；anchor.kind=="pass"。
  - `TestExplorerJourneyUavAnchor`：种 UAV + UAV_REGISTER_PROOF 行（business_id=UAVID）+ 无关 mission 簇 → hops 仅 1 条注册证明。
  - `TestExplorerJourneyEmptyHops`：DRAFT mission 无跨链行 → code 0、hops 长度 0、summary.hop_count==0、end_to_end_ms 为 nil。
  - `TestExplorerJourneyPartialFailure`：一 hop status=FAILED → end_to_end_ms nil、success_count<hop_count。
  - `TestExplorerJourneyBadParams`：`{}`（缺 anchor_id）→ 6002；`{"anchor_id":"PASS-1999-999"}` → 6002 且 message 含「锚点不存在」；`{"anchor_id":"X","anchor_kind":"bogus"}` → 6002。
- [ ] **Step 2: 跑测试确认失败** — `cd services/skytrust-backend && go test ./internal/api/ -run 'TestExplorerJourney' -count=1` → 编译失败/404（路由未注册）。
- [ ] **Step 3: 实现** `explorer_journey_handler.go` + `router.go` 注册 `api.POST("/explorer/journey", explorerJourneyHandler(deps))`。按上述钉死语义实现；簇解析抽包内私有函数即可（命名 builder 定夺）。
- [ ] **Step 4: 跑测试确认通过** — 同 Step 2 命令 → PASS；再 `go test ./internal/api/ -count=1` 全包绿。
- [ ] **Step 5: gofmt + 全量** — `gofmt -l internal/api/explorer_journey_handler.go internal/api/explorer_journey_handler_test.go` 输出为空；`go test ./... -count=1` 全绿。
- [ ] **Step 6: Commit** — 只 stage 本任务 3 个文件：
  ```bash
  git add services/skytrust-backend/internal/api/explorer_journey_handler.go services/skytrust-backend/internal/api/explorer_journey_handler_test.go services/skytrust-backend/internal/api/router.go
  git commit -m "$(printf 'feat(explorer): 新增 POST /api/explorer/journey——业务对象全链旅程只读聚合（锚点 mission/pass/uav、簇解析、四段 TxID、summary 诚实 null 语义）\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>')"
  ```

### Task 2: 后端 `POST /api/explorer/goals` + overview 共享函数抽取

**Files:**
- Create: `services/skytrust-backend/internal/api/explorer_goals_handler.go`
- Test: `services/skytrust-backend/internal/api/explorer_goals_handler_test.go`
- Modify: `services/skytrust-backend/internal/api/explorer_handler.go`（把 `explorerOverviewHandler` 内 chains[] 构建循环——`names` 收集到 `OK(c, gin.H{"chains":...})` 之前——**逐字搬移**为共享函数）、`services/skytrust-backend/internal/api/router.go`

**Interfaces:**
- Consumes: Task 1 无依赖；`model.CrosschainTx/OffchainSession/OffchainMessage{LatencyMs,Status}/WormholeEvent{Action,RecoveryLatencyMs}/SecurityEvent/RegulatoryAuth/AuditLog{Action}`（`internal/model/auditlog.go:6`）；`chainadapter`。
- Produces: `explorerChainsSnapshot(deps *Deps, ctx context.Context) []gin.H`（overview 与 goals 共用，输出与既有 overview chains[] 同构同值）；路由 `POST /api/explorer/goals`；响应骨架 = spec §5.2。Task 4/6 依赖。

**钉死语义：**
- overview 抽取**行为零变化**：既有 `explorer_handler_test.go` 测试一字不改、必须全绿。
- `goal1`：chains = `explorerChainsSnapshot`；chains_online = status=="ONLINE" 计数；chains_total = len；crosschain_total = COUNT(CrosschainTx WHERE `business_id NOT LIKE 'EXP-%'`)；verify_pass/verify_fail 同口径（verify_result='PASS' / IN ('FAIL_SM3','FAIL_SM9')）；verify_pass_rate_pct = `math.Round(float64(pass)*10000/float64(pass+fail))/100`，pass+fail==0 → **null**。
- `goal2`：sessions_total=COUNT(OffchainSession)；messages_total=COUNT(OffchainMessage)；message_latency_median_ms = LatencyMs>0 记录的中位数，无 → null；wormhole_events_total=COUNT(WormholeEvent)；recovery_latency_median_ms = RecoveryLatencyMs>0 的中位数，无 → null；**wormhole_detected_total 省略**（builder 定夺已定：WormholeEvent 每行即检出记录、无独立检出字段，测不到省略而非编造——代码注释 + Task 4 README 登记）。
- 中位数实现（builder 定夺已定：内存法）：取列切片升序排序；n 奇 → v[n/2]；n 偶 → `(v[n/2-1]+v[n/2])/2` 整数除法；注释注明取整规则。
- `goal3`：alerts_total=COUNT(SecurityEvent)；trace_total=COUNT(AuditLog WHERE action IN ('TRACE_IDENTITY','TRACE_IDENTITY_BROKEN'))（写入点 `regulatory/trace.go:168/:91`）；inspect_total=COUNT(AuditLog WHERE action IN ('INSPECT','INSPECT_CHAIN_FAILED'))（`regulatory/inspection.go:312/:271/:281`）；auth_total=COUNT(RegulatoryAuth)。计数为真实 0 时输出 0（实测值）；仅中位数/率可 null。
- DB 错误 → ErrInternal；不产生 2005；请求体 `{}`。

**Steps:**

- [ ] **Step 1: 写失败测试**：
  - `TestExplorerGoalsEmptyDB`：全新 `validTestDeps` → code 0；goal1.crosschain_total==0、verify_pass_rate_pct nil、chains_total==4（sim 四链）、chains 与 overview 响应 `reflect.DeepEqual`；goal2 两中位数 nil、计数 0；goal3 四计数 0；响应中**无** wormhole_detected_total 键。
  - `TestExplorerGoalsBusinessScope`：种 CrosschainTx：2 条业务行（其中 1 条 cross_tx_id 带 `#r2` 重试标记）、1 条 `business_id="EXP-STRESS-1"`、1 条 FAIL_SM9 业务行 → crosschain_total==3（EXP 排除、重试各算一条）、verify_pass==2、verify_fail==1、rate==66.67。
  - `TestExplorerGoalsMedians`：种 OffchainMessage LatencyMs {10,20,30,0} → median==20（0 被滤除，n=3 奇数取中）；再种一条 40 → 滤后 {10,20,30,40}，n=4 偶数 → 断言 (20+30)/2==25；WormholeEvent RecoveryLatencyMs {800,0,1200} → 滤后 {800,1200}，偶数 → 断言 (800+1200)/2==1000。
  - `TestExplorerGoalsGoal3Counts`：种 SecurityEvent×2、AuditLog action {TRACE_IDENTITY, TRACE_IDENTITY_BROKEN, INSPECT, INSPECT_CHAIN_FAILED, AUTH_APPLY, 其他}、RegulatoryAuth×1 → alerts==2、trace==2、inspect==2、auth==1（AUTH_APPLY 不计入任何 goal3 字段）。
  - `TestExplorerOverviewUnchangedAfterExtract`：调用 overview，断言既有固定字符串（"ChainMaker 监管链"/"TBFT（4 节点）"等，照抄 `explorer_handler_test.go` 既有断言值）仍逐字存在。
- [ ] **Step 2: 跑测试确认失败** — `go test ./internal/api/ -run 'TestExplorerGoals|TestExplorerOverviewUnchanged' -count=1` → 编译失败。
- [ ] **Step 3: 实现** 共享函数抽取 + goals handler + 路由 `api.POST("/explorer/goals", explorerGoalsHandler(deps))`。
- [ ] **Step 4: 跑测试确认通过** — 同 Step 2 → PASS；`go test ./internal/api/ -count=1` 全包绿（含既有 explorer 测试）。
- [ ] **Step 5: gofmt + 全量** — 同 Task 1 Step 5 模式。
- [ ] **Step 6: Commit** — 只 stage 4 个改动文件，`feat(explorer): 新增 POST /api/explorer/goals——三目标证据芯片实时聚合（业务留痕口径排除 EXP-*、中位数内存法、测不到→null）+ overview chains 共享函数抽取（行为零变化）` + trailer。

### Task 3: E2E 追加（System1 尾部 journey/goals 断言）

**Files:**
- Modify: `services/skytrust-backend/tests/system1_e2e_test.go`（`TestSystem1E2E` 第 10 步之后、函数收尾 `}` 之前追加第 11 步）

**Interfaces:**
- Consumes: Task 1/2 的两个端点；既有 helpers `call(t, srv, path, body) map[string]any`（`foundation_e2e_test.go:84`，返回 envelope）、`must0(name, env)`（断言 code==0 返回 data）、`seqID(prefix, n)`（`system1_e2e_test.go:33`，生成 `PASS-<年>-001` 等）。
- Produces: E2E 对 journey/goals 的真实全流程覆盖（此时 PASS-<年>-001 已 REVOKED、MISSION-<年>-001 全簇存在）。

- [ ] **Step 1: 追加第 11 步**（精确断言，沿用既有失败信息风格）：
  ```go
  // 11. 第五期：验收浏览器聚合端点（只读；旅程/芯片在吊销闭环后如实聚合）
  jn := must0("explorer/journey mission", call(t, srv, "/api/explorer/journey", map[string]any{"anchor_id": seqID("MISSION", 1)}))
  if jn["anchor"].(map[string]any)["kind"] != "mission" {
      t.Fatalf("mission journey anchor = %v", jn["anchor"])
  }
  jsum := jn["summary"].(map[string]any)
  if jsum["hop_count"].(float64) < 3 {
      t.Fatalf("mission journey hop_count = %v, want >= 3（APP+REVIEW+FLIGHT_PASS[+REVOKE]）", jsum["hop_count"])
  }
  jp := must0("explorer/journey pass", call(t, srv, "/api/explorer/journey", map[string]any{"anchor_kind": "pass", "anchor_id": seqID("PASS", 1)}))
  if jp["anchor"].(map[string]any)["status"] != "REVOKED" {
      t.Fatalf("pass anchor = %v, want REVOKED", jp["anchor"])
  }
  badEnv := call(t, srv, "/api/explorer/journey", map[string]any{"anchor_id": "PASS-1999-999"})
  if badEnv["code"].(float64) != 6002 {
      t.Fatalf("unknown anchor = %v, want code 6002", badEnv)
  }
  gl := must0("explorer/goals", call(t, srv, "/api/explorer/goals", map[string]any{}))
  g1 := gl["goal1"].(map[string]any)
  if g1["chains_total"].(float64) != 4 || g1["chains_online"].(float64) != 4 {
      t.Fatalf("goal1 chains = %v", g1)
  }
  if g1["crosschain_total"].(float64) < 5 {
      t.Fatalf("goal1 crosschain_total = %v, want >= 5（五条业务中继）", g1["crosschain_total"])
  }
  ```
  （若 `call` 实际返回形态与上述取值不符，以 `foundation_e2e_test.go:84` 定义为准调整取值路径，断言语义不变。）
- [ ] **Step 2: 跑 E2E 确认通过** — `go test ./tests/ -run TestSystem1E2E -count=1 -v` → PASS（新断言在真实全流程数据上成立）。
- [ ] **Step 3: 全量回归** — `go test ./... -count=1` 全绿。
- [ ] **Step 4: Commit** — 只 stage `tests/system1_e2e_test.go`，`test(e2e): System1 E2E 尾部追加 explorer/journey+goals 断言（mission/pass 锚点、6002、四链芯片计数）` + trailer。

### Task 4: apidoc 注册 + apifox/endpoints.js 工件链 + 后端 README

**Files:**
- Modify: `services/skytrust-backend/internal/apidoc/endpoints.go`（`/api/explorer/tx` 行（约 114 行）之后加 2 行）、`services/skytrust-backend/internal/apidoc/table_test.go`（第 29 行计数 78→80；第 34-38 行 `ignoreBody` map 加 `"/api/explorer/goals": true`）、`services/skytrust-backend/README.md`
- Regen: `docs/apifox/*.json`、`frontend/js/data/endpoints.js`

**Interfaces:**
- Consumes: Task 1/2 端点已注册可回放；apidoc 行格式 = 既有 explorer 条目（Path/Group/Summary/Sample/ExpectCode/ProbeExpect/Capture）；回放按表序执行，journey 的 Sample 锚定既有 storyline 产物 `MISSION-2026-001`（mission/create 行在前，P5-R13 顺序保证）。
- Produces: 工件与文档同步（80 端点）。Task 9 的 endpoints.js 依赖此步。

- [ ] **Step 1: 注册 2 行**（照抄既有格式；goals 无必填参数 → ProbeExpect 0，table_test.go:56 规则要求 ProbeExpect==0 必须在 ignoreBody 中；journey 探空体 → 6002）：
  ```go
  {Path: "/api/explorer/journey", Group: "explorer", Summary: "业务对象全链旅程（锚点 mission/pass/uav，缺省按 ID 前缀推断；hops 按 created_at 升序含四段 TxID；summary 仅全 SUCCESS 给 end_to_end_ms；锚点不存在→6002）", Sample: map[string]any{"anchor_kind": "mission", "anchor_id": "MISSION-2026-001"}, ExpectCode: 0, ProbeExpect: 6002},
  {Path: "/api/explorer/goals", Group: "explorer", Summary: "三目标证据芯片实时聚合（芯片①业务留痕口径排除 EXP-*、重试各算一条；测不到→null 绝不写死；wormhole_detected_total 无独立检出字段如实省略）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 0},
  ```
- [ ] **Step 2: 更新计数断言** — table_test.go:29 `!= 78` → `!= 80`；ignoreBody 加 goals 条目。
- [ ] **Step 3: 跑 apidoc 表测试确认通过** — `go test ./internal/apidoc/ -count=1` → PASS（计数断言 80、ignoreBody/ProbeExpect 一致性规则 table_test.go:56、Capture 引用规则全过；若计数未改会在此如实失败）。
- [ ] **Step 4: 再生成工件** — `APIFOX_GEN=1 go test ./tests/ -run 'TestApifox' -count=1`（重写 docs/apifox/*.json）→ 仓库根 `./scripts/gen-endpoints.sh`（重写 endpoints.js）→ `git diff --stat docs/apifox frontend/js/data/endpoints.js` 确认两工件均变化且含新端点（`grep -c "explorer/journey" docs/apifox/skytrust-backend.openapi.json frontend/js/data/endpoints.js` 均 ≥1）。若 TestApifox 回放对 journey 报锚点不存在，核对表中 mission/create 行的字面 MISSION-2026-001 与顺序，修正 Sample 而非放宽断言。
- [ ] **Step 5: README 更新** — `grep -n "78" services/skytrust-backend/README.md` 逐处核对：第 74 行「共 78 个端点」→ 80 且 `explorer×5`→`explorer×7`；第 92-96 行 explorer 表后追加 journey/goals 两行（描述与 apidoc Summary 同口径，journey 行注明锚点推断与 6002 语义，goals 行注明业务留痕口径与 wormhole_detected_total 省略决定）；第 494 行「78 个全 POST 端点」→ 80。
- [ ] **Step 6: 全量回归** — `go test ./... -count=1` 全绿（含 TestApifox 回放）。
- [ ] **Step 7: Commit** — stage endpoints.go、table_test.go、README.md、docs/apifox/*.json、frontend/js/data/endpoints.js（生成物只经命令产生），`docs(apidoc): explorer/journey+goals 注册与工件再生成——端点总数 78→80（apifox json + endpoints.js + README 端点表同步）` + trailer。

### Task 5: 前端拆分——`js/cxv/zones.js` 迁移 + 薄壳改造 + 装载（行为零变化）

**Files:**
- Create: `frontend/js/cxv/zones.js`
- Modify: `frontend/js/chainview.js`（改造为薄壳）、`frontend/index.html`（115 行前插）、`frontend/operator.html`（73 行前插）、`frontend/authority.html`（78 行前插）、`frontend/regulator.html`（79 行前插）、`frontend/license-center.html`（78 行前插）、`scripts/verify-three-portals-story.sh`（product gate 文件清单，`frontend/js/chainview.js` 行之后加 `frontend/js/cxv/zones.js \`）

**Interfaces:**
- Consumes: 现有 `frontend/js/chainview.js` 全部代码（487 行）；`window.API.call(path, body)`（`js/api.js:53`，async 返回 envelope，永不 throw）；PUI/P（pui.js，加载序在 chainview 之前，不动）。
- Produces（后续任务全部依赖，导出面钉死）：
  - `window.CXV_ZONES = { render: function(root, opts) }` —— 现有三区（节点/块/台账）渲染，代码**原样迁移**（纯搬家：行为、文案、类名、SMALL_PRINT 引用零变化）。
  - 薄壳 `window.CXV = { render, SMALL_PRINT, _pure: {merkleNote, degradeSpec, isDegrade}, SHARED }`：`render(root, opts)` 签名与 opts 契约 `{portal:'op'|'au'|'rg'|'ct'|'index', defaultChain?, defaultMsgTypes?}` 不变（本任务内 render 仅组装 CXV_ZONES）；`SMALL_PRINT` 字面量 `'服务端仅支持状态/类型过滤，其余为最近 200 条内客户端筛选'` **物理保留在 chainview.js**（verify 脚本 grep 落点）；`_pure` 三键不变。
  - 新增 `CXV.SHARED = { CHAIN_VAR, MSG_TYPES, CX_STATUSES, merkleNote, degradeSpec, isDegrade, chainCard, openBlock, txView, openCx }` —— 共享常量与下钻助手（openCx 含 rg 端 CHAINMAKER 高亮 DOM 后处理，pui.js 零改动裁决 E 沿用）。zones.js 经运行时 `window.CXV.SHARED.*` 引用（装载序在薄壳前，调用时机在 render/点击后，无加载序问题）。
- 各端 wrapper（`js/pages/*/chainview.js`、`js/pages/chainview.js`）**一字不动**。

- [ ] **Step 1: 迁移** — 新建 `frontend/js/cxv/zones.js`（IIFE + `'use strict'`，注释头注明「第五期拆分：原 chainview.js 三区原样迁移，行为零变化」）；把三区渲染代码与其私有 helper 逐字搬入；对薄壳共享原语的引用改为 `window.CXV.SHARED.*` / `window.CXV.SMALL_PRINT`（运行时解析）。改造 `frontend/js/chainview.js` 为薄壳：共享常量/helper + SMALL_PRINT 字面量 + 导出面 + `render` 组装（本任务只有 `CXV_ZONES.render(root, opts)`）。
- [ ] **Step 2: 装载** — 5 个 HTML 在各自 `<script src="js/chainview.js"></script>` 行**之前**插入 `<script src="js/cxv/zones.js"></script>`（后续任务的模块标签一律插在 `js/cxv/zones.js` 行之前，最终序 goals→journey→lanes→zones→薄壳）。
- [ ] **Step 3: 静态验证** — `node --check frontend/js/cxv/zones.js && node --check frontend/js/chainview.js`；`grep -c "服务端仅支持状态/类型过滤" frontend/js/chainview.js` ≥1（字面量物理保留）；`grep -c "_pure" frontend/js/chainview.js` ≥1；5 个 HTML `grep -l "js/cxv/zones.js" frontend/*.html | wc -l` == 5。
- [ ] **Step 4: verify 脚本更新 + 全量回归** — gate 清单加 `frontend/js/cxv/zones.js \`；`bash scripts/verify-three-portals-story.sh`（自带 :18080/:18090 隔离，**绝不触 :8080/:8090**）→ 末行 `ALL_GREEN`（含既有 SMALL_PRINT grep、5 HTML 挂载 grep、node --check 全量循环——Review Focus 4 钉住点）。
- [ ] **Step 5: Commit** — stage 8 个文件（zones.js、chainview.js、5 HTML、verify 脚本），`refactor(frontend): chainview 拆分第一步——三区原样迁移 js/cxv/zones.js + 薄壳化（CXV 导出面/SMALL_PRINT grep 落点/opts 契约零变化，verify 脚本 ALL_GREEN）` + trailer。

### Task 6: `js/cxv/goals.js` 三目标证据条（布局 E 第①段）

**Files:**
- Create: `frontend/js/cxv/goals.js`
- Modify: `frontend/css/drone.css`（追加 `d-cxv-goal*` 样式块）、`frontend/js/chainview.js`（render 组装加 GOALS 段，位于 ZONES 之上）、5 个 HTML（`js/cxv/zones.js` 行前插 `<script src="js/cxv/goals.js"></script>`）、`scripts/verify-three-portals-story.sh`（gate 清单加 goals.js）

**Interfaces:**
- Consumes: `POST /api/explorer/goals`（Task 2 契约）；`window.API.call`；`CXV.SHARED.merkleNote`（IRITA real 门控文案语义参照）。
- Produces: `window.CXV_GOALS = { render: function(root, opts), fmtVal: function(v) }`；`fmtVal(null/undefined/NaN)` → `'—'`（Review Focus 2 钉住点）。Task 7/8 与其并列，无依赖。

**钉死语义：**
- 芯片①（目标①）：`chains_online/chains_total 链在线`、`留痕 crosschain_total 条`、`SM9 验签通过率 verify_pass_rate_pct%`（null→「—」）+ 固定小字 `「业务留痕 · 不含压测流量（全量原始台账见下方第③区）」`（决策 8 口径标注，一字不差）；IRITA SM2/Merkle 说明文案**仅当** `goal1.chains` 中 `chain=="irita"` 项 `mode=="real"` 时渲染（Global Constraint 8）。
- 芯片②（目标②）：`消息时延中位 message_latency_median_ms ms`、`虫洞事件 wormhole_events_total 起`、`恢复中位 recovery_latency_median_ms ms`（null→「—」）+ 跳转「链网安全运营」：本端为 au → `location.hash='#/netsec'`；否则 `<a href="authority.html#/netsec">`（四端同源；路由 key 实证自 `shell-au.js:16`）。
- 芯片③（目标③）：`告警 alerts_total`、`身份追踪 trace_total`、`密文核验 inspect_total`、`授权 auth_total` + 跳转「身份追踪」：本端为 rg → `location.hash='#/trace'`；否则 `<a href="regulator.html#/trace">`（`shell-rg.js:13`）。
- 数据一律请求时实时拉取（`render` 内 `API.call('/api/explorer/goals', {})`），失败/非 0 code → 芯片区如实显示错误态文案，不显示任何数字（绝不写死、绝不缓存假数）。
- CSS 只追加 `d-cxv-goal*` 类 + `var(--d-*)` 令牌；三芯片 grid 三列（窄屏换行），链色仅出现在芯片内链名徽章。

- [ ] **Step 1: 实现** goals.js + drone.css 样式块 + 薄壳 render 组装（GOALS 段 root 节点在 ZONES 之前）+ 5 HTML 标签 + gate 清单。
- [ ] **Step 2: 静态验证** — `node --check frontend/js/cxv/goals.js`；`grep -c "业务留痕 · 不含压测流量" frontend/js/cxv/goals.js` == 1；`grep -c "cxv/goals.js" frontend/*.html | grep -c ":1"` == 5；`grep -c "cxv/goals.js" scripts/verify-three-portals-story.sh` ≥1。
- [ ] **Step 3: 隔离回归** — `bash scripts/verify-three-portals-story.sh` → ALL_GREEN（脚本自带 demo/init 数据面，goals 端点在其 sim 后端可回放）。
- [ ] **Step 4: Commit** — `feat(frontend): 浏览器首屏第①段——三目标证据条 js/cxv/goals.js（实时聚合、口径小字、IRITA real 门控、②③芯片跨页跳转 #/netsec 与 #/trace）` + trailer。

### Task 7: `js/cxv/journey.js` 对象选择器 + 旅程概要头 + 横向时间线（布局 E 第②③④段）

**Files:**
- Create: `frontend/js/cxv/journey.js`
- Modify: `frontend/css/drone.css`（追加 `d-cxv-jn*` 样式块）、`frontend/js/chainview.js`（render 组装加 JOURNEY 段，GOALS 之下 ZONES 之上；onSelect 回调本任务先空实现，Task 8 接 LANES）、5 个 HTML（zones.js 行前插 journey.js 标签）、verify 脚本 gate 清单

**Interfaces:**
- Consumes: `POST /api/explorer/journey`（Task 1）、既有 `pass/list`/`mission/list`/`uav/list`（`router.go:46/51/59`，复用不新增）；`CXV.SHARED.openCx`（节点下钻四段存证，与三区台账行点击同行为）、`CXV.SHARED.CHAIN_VAR/MSG_TYPES/CX_STATUSES`。
- Produces: `window.CXV_JOURNEY = { render: function(root, opts, onSelect) }`——`onSelect(journeyData|null)` 在初次自动选择与每次点选芯片时回调（Task 8 依赖此签名接 LANES.update）。

**钉死语义（几何合同 = spec §6.2 + 归档 mockup，违反即 Review Focus 5）：**
- 选择器：三 list 端点各 `{page:1,page_size:10}` 并取 records，按 created_at 倒序合并；按端裁剪：op→[pass,mission]、ct→[pass,mission]（pass 排前）、au/rg/index→[pass,mission,uav]；芯片 = kind 图标 + ID + 状态徽章（图标+文字，Global Constraint 4）。
- 默认选择：按时间倒序取前 5 个候选逐一请求 journey，选第一个 `hop_count>0 且 success_count==hop_count` 的；无全 SUCCESS 则选第一个 `hop_count>0` 的；全部为空 → 空态文案「业务操作产生跨链中继后自动出现」（同台账空态风格，Review Focus 1）。
- 概要头一行横排（窄屏允许换行）：对象号 + 状态徽章 + `跨链消息 ×hop_count` + `端到端 end_to_end_ms`（null→「—」+ 不显示假值）+ `验签 verify_pass/verify_total PASS` + `监管中继 ×hop_count（非旁路）`。
- 时间线：**等宽节点列**（每 hop 一列，flex:1，**不是**时间比例轴）；列上方**单条链色带**按 hop 分段——每 hop = 宽业务段（源链色，标注「链名 · 业务动作」，业务动作 = MSG_TYPES[message_type] 中文名）+ 窄紫 CM 中继段（示意宽度约业务段 40%，标注「CM 中继」）；节点卡 = 序号 + 业务动作 + TxID 截断（`cross_tx_id` 前 8 后 6）+ SM 徽章（verify_result：PASS→「SM3✓ SM9✓」绿徽章，FAIL_*→红徽章，图标+文字）+ `latency_ms` + created_at 全文字标注。
- 节点点击 → `CXV.SHARED.openCx(hop.cross_tx_id)`（四段存证详情，rg 端 CHAINMAKER 高亮后处理继续生效）。
- journey 请求失败/6002 → 时间线区如实错误态，不渲染任何编造节点。

- [ ] **Step 1: 实现** journey.js + CSS + 薄壳组装（`CXV_JOURNEY.render(journeyRoot, opts, function(data){ /* Task 8 接 LANES */ })`）+ 5 HTML 标签 + gate 清单。
- [ ] **Step 2: 静态验证** — `node --check`；`grep -c "cxv/journey.js" frontend/*.html | grep -c ":1"` == 5；`grep -c "业务操作产生跨链中继后自动出现" frontend/js/cxv/journey.js` == 1。
- [ ] **Step 3: 隔离回归** — `bash scripts/verify-three-portals-story.sh` → ALL_GREEN。
- [ ] **Step 4: Commit** — `feat(frontend): 浏览器首屏第②③④段——对象选择器+旅程概要头+等宽节点横向时间线 js/cxv/journey.js（链色带分段、CM 窄段非旁路、节点下钻四段存证、空态如实）` + trailer。

### Task 8: `js/cxv/lanes.js` 可折叠四链结构泳道（布局 E 第⑤段）

**Files:**
- Create: `frontend/js/cxv/lanes.js`
- Modify: `frontend/css/drone.css`（追加 `d-cxv-lane*`）、`frontend/js/chainview.js`（render 组装加 LANES 段于 JOURNEY/ZONES 之间，并把 Task 7 预留的 onSelect 空实现改为 `CXV_LANES.update(data)`）、5 个 HTML（zones.js 行前插 lanes.js 标签）、verify 脚本 gate 清单

**Interfaces:**
- Consumes: Task 7 的 `onSelect(journeyData|null)` 回调。
- Produces: `window.CXV_LANES = { render: function(root, opts), update: function(journeyData) }`——render 先挂折叠条（无数据时「四链结构视图（等待旅程选择）」），update 刷新计数与展开内容。

**钉死语义：**
- 默认收起；折叠条显示各链笔数（如「Fabric 2 笔 · CM 中继 3 跳 · FISCO 2 笔 · IRITA 1 笔」——由 hops 实算：业务事件计入其 source_chain 列，CM 列 = 中继跳数 = hop_count）。
- 展开态列序**固定**：运营链 Fabric、监管链 ChainMaker、管理链 FISCO BCOS、证照链 IRITA（不随旅程跳序重排）；列头链色 = Global Constraint 4 四色。
- 事件卡 = 业务动作 + TxID 截断 + verify 徽章（复用 `CXV.SHARED` 常量与徽章样式类）；CM 列 = 每 hop 一张虚线中继卡（「◈ 中继：source→target · verify 结果」，点击同 openCx）。
- `update(null)`（空态旅程）→ 泳道收起且计数清空，如实。

- [ ] **Step 1: 实现** lanes.js + CSS + 薄壳 onSelect 接线 + 5 HTML 标签 + gate 清单。
- [ ] **Step 2: 静态验证** — `node --check`；`grep -c "cxv/lanes.js" frontend/*.html | grep -c ":1"` == 5；薄壳中 `grep -n "CXV_LANES.update" frontend/js/chainview.js` ≥1。
- [ ] **Step 3: 隔离回归** — `bash scripts/verify-three-portals-story.sh` → ALL_GREEN。
- [ ] **Step 4: Commit** — `feat(frontend): 浏览器首屏第⑤段——可折叠四链结构泳道 js/cxv/lanes.js（列序 Fabric/CM/FISCO/IRITA 固定、计数实算、旅程联动）` + trailer。

### Task 9: 隔离联调四端目检 + DEFERRED-HUMAN 清单 + frontend README

**Files:**
- Modify: `scripts/verify-three-portals-story.sh`（约 533 行 DEFERRED-HUMAN 汇总章节加一条目检项）、`frontend/README.md`（文件清单 + 首屏结构说明）

**Interfaces:**
- Consumes: Task 1-8 全部产物；隔离模式 = verify 脚本同款（自起 :18080 sim 后端 + :18090 代理，/tmp 数据目录；**硬编码拒绝 :8080/:8090**）。

- [ ] **Step 1: verify 脚本 DEFERRED-HUMAN 清单追加**（目检项一条）：「【浏览器新首屏·布局 E】三目标芯片活数（对照 goals 响应）/ 时间线几何对照归档 mockup（等宽节点列、单条链色带、CM 段窄、泳道列序 Fabric-CM-FISCO-IRITA）/ 节点下钻四段存证 / sim 空态文案 / rg 端 openCx CHAINMAKER 高亮 / ct 端 defaultChain=irita」——Review Focus 5 钉住点。
- [ ] **Step 2: 全量回归** — `bash scripts/verify-three-portals-story.sh` → ALL_GREEN。
- [ ] **Step 3: 隔离四端目检** — 手工起隔离环境：后端 `cd services/skytrust-backend && SERVER_ADDR=127.0.0.1:18080 DB_PATH=/tmp/st-cxv/skytrust.db SM9_KEY_DIR=/tmp/st-cxv/sm9 go run ./cmd/server`（后台）；:18090 静态+代理复用 `scripts/verify-three-portals-story.sh` 内同款隔离启动段（该脚本硬编码拒绝 :8080/:8090，照抄其变量即可）。浏览器过 operator/authority/regulator/license-center 四端 chainview 页 + index `#/chainview`：布局 E 六段自上而下齐备、几何对照归档 mockup 逐项核（Step 1 清单）、`demo/reset` 后（仅隔离 sim！）空库首屏芯片「—」+ 时间线空态（Review Focus 2 钉住点）、跑一单 mission 流程后芯片活数 +1、时间线长出新节点。目检发现问题→回所属任务修复再全量回归。
- [ ] **Step 4: frontend README 更新** — 文件清单加 `js/cxv/{goals,journey,lanes,zones}.js` 四行（各注职责）+ chainview.js 改注「薄壳：组装 + 共享原语 + SMALL_PRINT/_pure 导出面」+ 首屏六段结构一段说明（引用 spec §6.2 与归档 mockup 路径）。
- [ ] **Step 5: Commit** — `docs(frontend): 第五期浏览器新首屏收口——verify 脚本 DEFERRED-HUMAN 目检项（布局 E 几何对照归档 mockup）+ README 文件清单与六段结构说明` + trailer。

### Task 10: 讲解人手册 `docs/acceptance-manual.md` + 隔离彩排登记

**Files:**
- Create: `docs/acceptance-manual.md`（旧 `docs/demo-operation-guide.md` **一字不动**）

**Interfaces:**
- Consumes: spec §7（结构与五要素格式钉死）；新版浏览器首屏（Task 6-8 证据面）；`docs/version-matrix.md`、后端 README（事实来源）；隔离彩排环境 = Task 9 同款 :18080/:18090。

**钉死语义：**
- 标题《云巡信链（SkyTrust）· 验收演示讲解人手册（四链四端 × 三条研制目标）》；每步五要素【端】【操作】【屏幕】【解说】【证据】+ 预计耗时 + 故障兜底指向附录 B。
- 章节：§0 演前整备（约 5 分钟）/ §1 目标①（约 15 分钟）/ §2 目标②（约 8 分钟）/ §3 目标③（约 8 分钟）/ 附录 A 固定剧情值速查（四端四链版，沿用 demo-operation-guide §0.5 风格）/ 附录 B 故障恢复（掉链、2005 降级卡怎么讲、5001 断链如实讲断点证据、旅程空态话术）/ 附录 C 隔离排练环境（:18080 sim 全流程，绝不触生产）/ 附录 D 旧文档对照（冲突时以本手册 + version-matrix 为准）。内容细节 = spec §7 各条逐字展开。
- **数字纪律**：手册中一切数字/时延要么写「以实测为准」要么写「读现场屏幕」，不预填任何假数；证据指向写「指向屏幕上的 X（芯片①留痕数 / 时间线第 N 节点 / 4 段 TxID / SM 徽章）」。
- **生产安全措辞**：§0 体检 = 四端顶部链状态灯 + 浏览器目标芯片①目视核验（只读 UI 检查），明文写「生产环境严禁 demo/reset、杀进程、重启链」；手册不出现任何引导对生产 :8080 裸 curl POST 的命令行。
- §1 芯片①口径应答预案（决策 8）：「业务留痕，不含性能压测流量；全量原始台账在下方第③区可查」。
- IRITA SM2/Merkle 话术标注「仅 real 模式屏幕出现该文案时讲」。

- [ ] **Step 1: 写手册**（按上述骨架 + spec §7 全文展开；System 1 主线四端接力动线 = op 申请（Fabric）→ au 审批（FISCO）→ ct 签发（IRITA）→ op 起飞前验证，每步完成回浏览器指认时间线新节点/芯片 +1/终态 SUCCESS/4 段 TxID）。
- [ ] **Step 2: 措辞审计** — `grep -n "demo/reset" docs/acceptance-manual.md` 逐处核对只出现在「严禁」或附录 C 隔离语境；`grep -nE "[0-9]+(\.[0-9]+)?\s*(ms|秒|s\b)" docs/acceptance-manual.md` 逐处核对为「以实测为准」或屏幕读数指引（预计耗时分钟数除外）；无生产 curl POST 指令。
- [ ] **Step 3: 隔离彩排** — :18080/:18090 隔离 sim 按手册 §0-§3 全流程走一遍（含附录 A 剧情值），发现步骤与实际 UI/回显不符 → 修手册（不修产品代码；产品缺陷回所属任务）；彩排完毕只杀隔离进程。
- [ ] **Step 4: 文末登记彩排** — 追加「彩排登记：日期 2026-10-XX · 环境 = 隔离 sim（:18080/:18090，/tmp 数据目录）· 结论：§0-§3 全流程可复现，生产零接触」。
- [ ] **Step 5: Commit** — `docs(manual): 新增验收演示讲解人手册 docs/acceptance-manual.md——按三条研制目标分章、每步五要素、四端四链动线与新版浏览器证据面咬合（隔离 sim 彩排登记，生产零接触）` + trailer。

---

## 收尾核对（最后一个任务完成后执行，不单独成任务）

- `cd services/skytrust-backend && go test ./... -count=1` 全绿（~315+ 测试）；`gofmt -l internal/ tests/` 无本期文件。
- `bash scripts/verify-three-portals-story.sh` → ALL_GREEN。
- `git log --oneline` 核对 10 条提交均带 trailer；`git status` 核对 CLAUDE.md、platform 子模块、`regulatory_handler_test.go`、`contracts/fabric/*.tar.gz` 均未被 stage 过。
- 端点总数三处一致：`grep -c "Path:" services/skytrust-backend/internal/apidoc/endpoints.go` == 80、table_test.go 断言 80、README「共 80 个端点」。
- 生产 :8080/:8090 全程未被触碰（本期不部署；部署为独立受控窗口，届时另行走 `scripts/start-backend-real.sh` 自检流程）。
