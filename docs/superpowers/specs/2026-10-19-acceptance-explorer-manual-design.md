# SkyTrust 第五期设计：验收导向业务流水线浏览器（目标面板+时间线+折叠泳道）× 讲解人手册

- 日期：2026-10-19
- 状态：待批准（builder-check 后提交用户审批）
- 前置：`2026-10-13-fourth-chain-license-explorer-design.md`（第四期：四链拓扑 + 四端精简浏览器 + 证照中心端，已交付）
- 验收锚点（三条正式验收要求，与四期 spec 逐字一致）：
  1. 研制支持**至少 3 种异构链**的基于**商密算法**的原型跨链系统
  2. 研制基于商密算法的能够**抵抗虫洞攻击**的秒级链下交易网络原型系统
  3. 研制**秒级身份追踪**及**密文内容监管**原型系统

## 1. 意图（Why）

用户两个痛点（原话意译）：

1. 四期交付的四端区块链浏览器按「通用浏览器的功能分类」摆（节点/块/台账三区），验收人员需要自己在脑子里把块高、哈希映射回本项目的业务与三条研制目标——「目前的区块链浏览器感觉有点通用化」。要求：**区块链根据项目特色来展示，让验收人员一目了然**。
2. `docs/demo-operation-guide.md` 仍是三链时代版本（全文无「证照/IRITA」），第四链落地后，围绕三条原始研制目标缺一份新操作手册。

本期完成后：

- 浏览器首屏即验收目标①的**证据面**：三目标证据条 → 最近业务对象选择器 → 全链旅程概要头 → 横向时间线（链色带 + 节点下钻）→ 可折叠四链结构泳道 → 现有三区保留作下钻工具（布局 E，用户在浏览器 mockup 中三轮比对 A/B/C → D/E 后选定，融合 B 时间线的直观叙事与 C 的目标自证）。
- 新增**讲解人 runbook** `docs/acceptance-manual.md`：按目标①②③组织，每步五要素（在哪端操作 / 点什么填什么 / 屏幕出现什么 / 解说话术要点 / 指哪块证据），使三条研制目标的演示动线与新版浏览器证据面一一咬合。

## 2. 已锁定的用户决策

| # | 决策点 | 结论 |
|---|---|---|
| 1 | 浏览器受众与目标 | 验收人员**一目了然**：项目特色 + 三目标证据面，不是通用查块工具 |
| 2 | 首屏布局 | **E · 双视图融合**：三目标证据条 + 横向时间线主叙事 + 可折叠四链泳道（浏览器 mockup 点选落定） |
| 3 | 手册定位 | 给**讲解人**用的 runbook，不是给验收专家的自助说明书 |
| 4 | 手册组织 | 按三条研制目标分章（§1 目标① / §2 目标② / §3 目标③），不按系统分 |
| 5 | 手册落点 | 新文档 `docs/acceptance-manual.md`；旧 `demo-operation-guide.md` 一字不动保留为三链历史版 |
| 6 | 前端工程 | **分文件模块化**（用户明确要求，不塞单一大文件） |
| 7 | 文档同步 | 新端点必须同步再生成 apifox 工件 + `frontend/js/data/endpoints.js` |
| 8 | 芯片①统计口径 | **业务留痕口径**（builder-check 后用户拍板）：排除 `business_id` 前缀 `EXP-*` 的压测行；`#rN` 重试行各算一条；芯片小字如实标注口径；第③区台账保持全量原始表 |

## 3. 目标 / 非目标 / 反目标

**目标**

1. 后端：新增 2 个**只读**端点 `explorer/journey`、`explorer/goals`（契约见 §5），hermetic 测试全覆盖，端点总数 78→80
2. 前端：chainview 拆分为模块族（`js/cxv/*.js` ×4 + 薄壳 `js/chainview.js`），四端 + index 落地布局 E，按端裁剪沿用四期机制
3. 文档：`docs/acceptance-manual.md`（结构与五要素格式见 §7）
4. 工件与登记：apidoc 注册 + apifox 2 个 json 再生成 + endpoints.js 再生成 + 后端 README 端点表/计数更新 + frontend README 文件清单更新 + 已批准 mockup E 归档至 `docs/superpowers/specs/assets/`（视觉合同）

**非目标**

- System 1/2/3 任何业务逻辑变更（本期是纯只读展示层 + 文档）
- `js/pui.js` 改动（保持零改动；四期裁决 E 的 DOM 后处理方式继续沿用）
- 通用浏览器功能（地址簿、代币图表、 gas 分析等与本项目验收无关的一切）
- 旧 `demo-operation-guide.md`、frozen legacy `js/pages/explorer.js`、任何 frozen 资产的改动
- CROSSCHAIN_LOOP 压测路由变更（⑤ 基线口径不动，同四期）

**反目标（做成即失败）**

- 为未完成业务流**编造**旅程/时间线节点（空态如实：提示「业务操作产生跨链中继后自动出现」，同现有台账空态文案风格）
- 目标芯片数字**写死**或做假统计（一律请求时实时计算；测不到的字段 → null → 前端显示「—」，绝不猜测）
- 触碰 :8080/:8090 生产红线；手册中出现任何引导讲解人对生产库执行 `demo/reset`、杀进程、重启链的表述
- 破坏链色语义（紫 CM / 蓝 Fabric / 青 FISCO / 绿 IRITA 永不互换）；状态仅靠颜色不加图标+文字
- 在 sim 数据上声称链本体密码学能力（IRITA SM2/Merkle 文案沿用四期裁决 D：仅 mode=real 出现）

## 4. 继承约束

全部沿用四期 spec §5（不重述细节）：生产红线（:8080/:8090 不杀不重启不 POST）、隔离验证（:18080-:18190 + /tmp 数据目录，`verify-three-portals-story.sh` 模式）、frozen 前端资产清单 + `d-`/`--d-*` 命名空间、frozen Go 依赖（gin/gorm/sqlite/gmsm/go1.25.0）、real SDK 只在 `//go:build realchains` 内、域隔离（offchain 不 import crosschain/uavbusiness）、全 POST + 恒 200 + envelope（`code=0` 成功）、`internal/timex` 时间、列表 `{records,total,page,page_size}`、errcode 单一事实源、生成物只经命令再生成、中文 conventional commits + `Co-Authored-By: Claude Code <noreply@anthropic.com>` trailer、CLAUDE.md 不入库、既有脏文件（platform 子模块噪声、未格式化测试文件）永不 stage、秘密只走 `.env`、坐标红线。

卫生项核实：`.superpowers/`（brainstorm mockup 缓存）**已在** `.gitignore`（「brainstorming visual companion drafts - not for VCS」条目，四期遗留），无需动作。

## 5. 后端设计（2 个新只读端点）

实现位置：`internal/api/explorer_handler.go` 追加（或同包新文件 `explorer_journey_handler.go`），只经 `deps.DB`（GORM 读）+ 既有 `deps.Chains`/`deps.Gateway` 组合，不新增 Deps 字段（frozen）、不写库、不调用域服务写路径。聚合逻辑如需独立函数放 api 层或新建 `internal/explorer` 只读包（import 面 ≤ model+crosschain+chainadapter+timex+stdlib，builder 定夺）。

### 5.1 POST /api/explorer/journey — 业务对象全链旅程

请求：`{ "anchor_kind": "mission"|"pass"|"uav"（可选，缺省按 ID 前缀推断）, "anchor_id": "MSN-…" }`

- 参数缺失/非法 → 6002；anchor 不存在 → 6002，message 如实（绝不 404/500，恒 200 envelope）。

响应 `data`：

```jsonc
{
  "anchor":  { "kind": "mission", "id": "MSN-…", "status": "<业务表原值>" },
  "objects": [ { "kind": "mission|application|review|pass|uav", "id": "…", "status": "…" } ],  // anchor 关联业务对象（按既有表关系解析：FlightPass.MissionID 已确认存在）
  "hops": [                                   // CrosschainTx，created_at 升序；重试行(#rN/RetryOf)如实保留
    {
      "seq": 1, "cross_tx_id": "…", "message_type": "MISSION_APPLICATION", "business_id": "…",
      "source_chain": "fabric", "final_target_chain": "fisco-bcos",
      "status": "SUCCESS", "verify_result": "PASS", "latency_ms": 1234,
      "created_at": "…", "updated_at": "…", "sm3_hash": "…", "sm9_identity": "…",
      "segments": { "source_tx_id": "…", "reg_receive_tx_id": "…", "reg_relay_tx_id": "…", "target_tx_id": "…" }  // 四段 TxID 原值，空段如实空串
    }
  ],
  "summary": {
    "hop_count": 4, "success_count": 4, "verify_pass": 4, "verify_total": 4,
    "first_at": "…", "last_at": "…",
    "end_to_end_ms": 5200        // 仅当 hops 非空且全部 SUCCESS 时 = 末跳 updated_at − 首跳 created_at；否则 null（诚实）
  }
}
```

- hops 取数：`CrosschainTx WHERE business_id IN (锚点解析出的业务 ID 集)`。**business_id ↔ 消息类型的具体约定以 `uavbusiness/{mission,pass,uav}.go` 中 `sendCrosschain` 调用点为准**（builder 落地时在代码注释里登记映射表；已知 FLIGHT_PASS 为 irita→fabric、UAV_REGISTER_PROOF 为 fabric→chainmaker）。
- SM9 密文任务内容**不进本端点**（payload 不回显；需要细节走既有 `crosschain/query`/`mission/query`，脱敏语义由那些端点已保证）。`sm9_identity` 的暴露口径与既有 `crosschain/list`/`query` 完全一致，不新增暴露面。

### 5.2 POST /api/explorer/goals — 三目标证据芯片（实时聚合）

请求：`{}`。响应 `data`（每个数值字段均可为 null=测不到，前端「—」；**绝不写死**）：

```jsonc
{
  "goal1": {
    "chains": [ /* 与 explorer/overview 的 chains[] 同构同值（复用同一内部函数，避免双倍 RPC） */ ],
    "chains_online": 3, "chains_total": 4,
    "crosschain_total": 1284,               // 业务留痕口径（决策 8）：WHERE business_id NOT LIKE 'EXP-%'；重试行各算一条
    "verify_pass": 1280, "verify_fail": 4,   // 同上口径；芯片配固定小字「业务留痕 · 不含压测流量」，全量原始台账见第③区
    "verify_pass_rate_pct": 99.69            // verify_total=0 时 null
  },
  "goal2": {
    "sessions_total": 12, "messages_total": 340,
    "message_latency_median_ms": 46,          // OffchainMessage.LatencyMs 中位数；无记录 null
    "wormhole_events_total": 3,
    "wormhole_detected_total": 3,             // 以 WormholeEvent 实际检出语义字段为准（builder 核模型后定，测不到则省略此字段）
    "recovery_latency_median_ms": 820         // WormholeEvent.RecoveryLatencyMs 中位数；无记录 null
  },
  "goal3": {
    "alerts_total": 6, "trace_total": 11, "inspect_total": 4, "auth_total": 2
    // trace/inspect/auth 计数来源 = regulatory 既有表（RegulatoryAudit action 常量或专表，builder 核对后定）；无对应记录来源的字段直接省略（不编 0）
  }
}
```

- 聚合一律 COUNT/中位数级轻量查询，业务表内存量级小；chains[] 复用 overview 内部函数（builder 将 overview 主体抽为共享函数，行为不变、既有测试不动语义）。
- 芯片上的**解释性固定文案**（如「SM9 验签通过率」「IRITA SM2 链本体 · Merkle 证明」）留在前端（与四期 merkleNote 同性质：架构说明文案而非数据断言）；其中 IRITA SM2/Merkle 文案继续受 mode=real 门控（裁决 D 沿用）。

### 5.3 错误与降级

- 两端点自身查询故障 → ErrInternal；链能力缺失不影响 journey/goals 的台账聚合部分（chains[] 单链探测失败按 overview 既有语义如实归 0，绝不拼造）。
- 本组端点**不产生** 2005（不直接查块）；块级下钻仍走既有 explorer/block|tx（2005 语义不变）。

## 6. 前端设计（布局 E · 分文件模块化）

### 6.1 文件拆分（新增 `js/cxv/` 模块族；全部 IIFE + window 命名空间，零构建不变）

| 文件 | 全局 | 职责 |
|---|---|---|
| `js/cxv/goals.js` | `CXV_GOALS` | 三目标证据条：拉 `explorer/goals`；芯片① = 活数字 + 固定 SM 文案（real 门控）；芯片②③ = 关键指标 + 跳转链接（目标页在**本端** → 页内路由；在他端 → 普通跨页链接 authority.html/regulator.html，四端同源；具体路由 hash 以 portal.js 路由表为准，builder 核对） |
| `js/cxv/journey.js` | `CXV_JOURNEY` | 选择器（`pass/list`+`mission/list`+`uav/list` 各取 page_size=10 合并按时间倒序，**复用既有端点，不新增**）→ 旅程概要头 → 链色带横向时间线 + 节点卡（TxID/SM 徽章/块高提示/时延）→ 节点点击下钻（`P.openCxDetail` 四段存证 + explorer/block/tx）；默认自动展开最近一条 SUCCESS 旅程，无则空态如实 |
| `js/cxv/lanes.js` | `CXV_LANES` | 可折叠四链结构泳道：同一 `journey.hops` 按链归列（含 CM 中继列），默认收起、折叠条显示各链笔数 |
| `js/cxv/zones.js` | `CXV_ZONES` | 现有三区（节点/块/台账）代码**原样迁移**（纯搬家，行为与文案零变化，SMALL_PRINT 等 Task 11 grep 断言对象一字不动） |
| `js/chainview.js`（改造为薄壳） | `CXV` | `CXV.render(root, opts)` 组装 GOALS→JOURNEY→LANES→ZONES；`CXV.SMALL_PRINT`、`CXV._pure` 导出面保持不变（既有断言依赖） |

- 装载：`operator/authority/regulator/license-center/index` 5 个 html 在 `js/chainview.js` 之前按依赖序插入 4 个 `<script>`；各端 wrapper（`js/pages/*/chainview.js`）**不动**。
- 每个新 JS 过 `node --check`；`gofmt`/`go vet` 照旧。

### 6.2 首屏结构（自上而下，布局 E 定死）

① 三目标证据条 → ② 最近业务对象选择器 → ③ 旅程概要头（状态/跨链消息数/端到端耗时/验签 n:n/中继跳数·非旁路）→ ④ 横向时间线（链色带分段；节点卡=业务动作+TxID+SM 徽章+时延；严格按链上时间戳排布）→ ⑤ 折叠泳道条 → ⑥ 既有三区（原样）。

**时间线几何合同（= 用户已批准的 mockup E；源文件归档 `docs/superpowers/specs/assets/2026-10-19-explorer-layout-e-mockup.html`，文字与归档有歧义时以归档为准）：**

- x 轴 = **等宽节点列**（每跳一列），**不是**按时间戳比例的缩放轴；节点按链上 created_at 升序排列，时间戳/时延在节点卡内文字标注。
- 链色带 = 时间线正上方**单条横带**，按每一跳所属链分段着色（业务链段宽、ChainMaker 中继段窄——示意性宽度，非时间比例），段内标注「链名 · 角色」（如「Fabric 运营链 · 申请」）。
- 泳道展开态列序固定：运营链 Fabric、监管链 ChainMaker、管理链 FISCO、证照链 IRITA（同 mockup，不随旅程跳序重排）。
- 旅程概要头一行横排：对象号 + 状态徽章 + 跨链消息数 + 端到端耗时 + 验签 n/n + 中继跳数（非旁路），窄屏允许换行。

### 6.3 按端裁剪（沿用四期机制，opts 驱动）

- op：选择器聚焦任务/许可（defaultMsgTypes 沿用）；ct：证照对象优先 + `defaultChain:'irita'` 不变；rg：openCxDetail 后 CHAINMAKER 段高亮的 DOM 后处理继续生效（pui.js 零改动）；au/index：全量。

### 6.4 CSS

- `drone.css` 追加 `d-cxv-j*`（journey/goals/lanes）样式块；链色只经 `var(--p-chain-*)`/`var(--d-chain-irita)`；不触 `:root` legacy 令牌与 `--p-*` 定义；状态徽章沿用 icon+文字。

## 7. 手册设计（`docs/acceptance-manual.md`）

标题：《云巡信链（SkyTrust）· 验收演示讲解人手册（四链四端 × 三条研制目标）》。

**每一步五要素（格式定死）**：【端】【操作】（点什么、填什么——固定剧情值照抄附录 A）【屏幕】（预期回显）【解说】（话术要点）【证据】（指哪块：浏览器时间线节点/目标芯片/TxID/徽章），另标预计耗时与故障兜底（→附录 B）。

- **§0 演前整备（约 5 分钟）**：四链体检（只读：`chain/status` = 4×ONLINE、浏览器目标芯片活数核验）、后端自检、四端可达、默认旅程预检（有无已完成许可；生产环境**只做只读检查**，剧情数据由 §1 现场产生——这本身就是演示内容；严禁 demo/reset）。
- **§1 目标① 异构链商密跨链（约 15 分钟）**：System 1 主线四端接力——op 申请（Fabric）→ au 审批（FISCO）→ ct 签发（IRITA）→ op 起飞前验证；**每步完成回浏览器指认**：时间线长出新节点、芯片①留痕数实时 +1、旅程终态 SUCCESS、4 段 TxID、SM9 信封/SM3 摘要、（real 门控）IRITA SM2 + Merkle 文案；话术主线：≥3 条异构**业务**链 + 监管链非旁路中继 + 商密全栈。芯片①口径应答预案：若验收专家问及数字口径，如实答「业务留痕，不含性能压测流量；全量原始台账在下方第③区可查」（决策 8）。
- **§2 目标② 秒级链下抗虫洞（约 8 分钟）**：au 端网络安全戏——路由/消息秒级时延读数、SM9 挑战-应答会话、虫洞注入→「太快就是破绽」→5 维检出→隔离→可信路径重算；话术主线：秒级 + 抗虫洞 + 检测即时性。
- **§3 目标③ 秒级追踪密文监管（约 8 分钟）**：rg 端——告警登记→七级跨链身份追踪（秒级耗时展示；断链 5001 如实讲解断点证据，绝不粉饰）→范围×对象×窗口授权→密文核验（未授权只见密封信封：状态/摘要/脱敏值）；话术主线：秒级追踪 + 密文可管不可见。
- **附录 A** 固定剧情值速查表（沿用 demo-operation-guide §0.5 风格、更新为四端四链版）；**附录 B** 故障恢复手册（某链掉线/2005 降级卡怎么讲/5001 断链怎么继续/旅程空态话术）；**附录 C** 隔离排练环境（:18080 sim 全流程彩排流程，绝不触碰生产）；**附录 D** 旧文档对照（demo-operation-guide=三链历史版、demo-script=剧情版、本手册=验收 runbook；冲突时以本手册 + version-matrix 为准）。
- 手册中一切数字/时延要么来自现场屏幕读数，要么标注「以实测为准」——**不预填假数**；话术引用链上证据处写明「指向屏幕上的 X」。

## 8. 测试与验收

- 后端单测（hermetic sim，colocated）：journey——造 mission→submit→review→issue 后断言 hops 顺序/四段 TxID 齐备/summary 计数/不存在锚点 6002/end_to_end_ms 非全 SUCCESS 时 null；goals——字段实算、空库时 null/省略语义、chains[] 与 overview 一致性。
- E2E（`tests/`）：现有 System1 E2E 尾部追加 journey/goals 断言；端点计数断言实际位于 `internal/apidoc/table_test.go`（现断言 78 → 更新 80；`router_test.go` 无计数断言，builder-check 勘正）。
- `scripts/verify-three-portals-story.sh`（非 frozen，四期曾扩展）：薄壳 `chainview.js` **物理保留 SMALL_PRINT 字面量**（`CXV.SMALL_PRINT` 导出面不变，`cxv/zones.js` 引用导出而非自带字面量——脚本对该文件的 grep 落点不动）；4 个新 `js/cxv/*.js` 纳入脚本 product gate 文件清单与 DEFERRED-HUMAN 视觉核对清单（最小改动）。
- 全量：`go test ./... -count=1` 全绿 + `gofmt` + `node --check` 全部新旧 JS。
- 工件链：`internal/apidoc/endpoints.go` 注册 2 端点（Sample/ExpectCode/ProbeExpect/Capture 链，journey 的 Capture 可锚定既有 storyline 产物）→ `APIFOX_GEN=1 go test ./tests/ -run 'TestApifox'` → `./scripts/gen-endpoints.sh`。
- 隔离联调：:18080/:18090 模式跑通四端新首屏（含 sim 空态、旅程下钻、芯片活数），`verify-three-portals-story.sh` 回归不破。
- 手册验证：隔离 sim 环境按手册全流程彩排一遍，文末登记彩排日期与环境（sim），生产零接触。
- README：后端 README 端点表/计数（73→78 已发生，本期 →80）与 frontend README 文件清单更新。

## 9. Builder 定夺 vs 钉死

**钉死（不可推翻）**：布局 E 六段结构与顺序 + 时间线几何合同（§6.2 + 归档 mockup）；两端点路径与响应骨架（§5）；芯片①业务留痕口径（决策 8）；手册落点/五要素/章节结构（§7）；文件拆分清单（§6.1）；全部反目标红线（§3）。

**Builder 定夺（自行决定并在代码/文档注释登记）**：business_id↔消息类型映射表细节（以 sendCrosschain 调用点为准）；中位数实现（SQL vs 内存）；goal2/goal3 具体计数字段依既有模型字段取舍（测不到→省略）；芯片②③跳转的路由 hash（以 portal.js 路由表为准）；聚合逻辑放 api 层还是 internal/explorer 新包；测试用例命名与内部函数命名；CSS 细节值（间距/字号/圆角等——**时间线几何除外**，几何由 §6.2 合同 + 归档 mockup 钉死）；手册话术文字组织（事实以本设计 + 后端 README + version-matrix 为准）。

## 10. 开放问题

无（builder-check 若产生「只有用户能答」的问题，按流程带回来一轮）。
