# 三独立门户 + UOM 域扩展设计：运营商端 / 管理当局端 / 监管当局端

日期：2026-10-06
状态：已与需求方逐节确认（总体架构 / 后端扩展域 / 三端信息架构 / 验收脚本与实施策略四节均批准）
范围：`frontend/`、`services/skytrust-backend/`（加法扩展）、`docs/demo-script.md` 重写、README/CLAUDE.md 同步。
前序：本设计取代《2026-09-21 前端产品化改造设计》的「单壳四工作台」形态——旧四工作台与三幕页**原样冻结保留**为参考资产，不删不改。

## 1. 背景与目标

上一轮产品化改造已交付单壳 SPA（平台总览 + 四工作台 + 参考流程/工具折叠组，commit 69029b9）。需求方新方向：

1. 整个项目拆为**三个独立界面**（物理独立 HTML 入口），按角色划分：运营商端 / 管理当局端 / 监管当局端。
2. 视觉主题**严扣无人机**，整体偏向政务风。
3. 运营商端（普通用户操作无人机）参照**「民用无人驾驶航空器综合管理平台」(UOM, uom.caac.gov.cn)** 的信息架构与操作方式：实名登记、航空器登记（登记标志+二维码）、飞行活动申请、空域查询、电子许可、运行识别。
4. **需要地图操作**：真实经纬度底图（天地图）+ 空域/航线/节点矢量层 + 飞行动态实时渲染。
5. 后端**允许扩展**（全套 UOM 域）：地理、遥测、实名登记、操控员执照；并根治七级追踪对故事航空器必断链的缺陷。

## 2. 决策记录（brainstorming 全程已确认）

| 决策点 | 结论 |
|---|---|
| 三端划分 | 按角色：①运营商端（UOM 风格）②管理当局端（审核签发 + 链网安全运营合并）③监管当局端（监管门户职能） |
| 独立形态 | 三个独立 HTML 入口 `operator.html` / `authority.html` / `regulator.html`；现有 `index.html` 降为**内部总控导航页**（平台总览 demo 维护 + 参考流程 + 工具 + 旧四工作台参考组），不算产品界面 |
| 地图方案 | Leaflet **本地 vendored**（不走 CDN）+ **天地图瓦片**（浏览器 key 运行时配置存 localStorage，不入 git）+ 矢量层恒自绘兜底（无 key/断网时中性底图，演示不砸场） |
| 后端边界 | **全套 UOM 域扩展**：地理（lat/lon 结构化）、遥测（telemetry 三端点+自动推进）、实名登记、操控员执照（模拟即发）；端点 64 → 73 |
| 复用策略 | 三端**业务页面全新写**；`api.js`/`store.js`/`pui.js` 作共享底座复用（pui 为组件引擎，经 drone.css 令牌换肤）；旧四工作台 wb-*.js 原样冻结收进内部导航页 |
| 旧缺陷处置 | 追踪映射**后端根治**（uav/register 自动建 IdentityMapping + pass/issue 回填 pass_id）；Ch1 状态机（VERIFY 必 1004、ACTIVATE 毒化签发）与 Ch8 trajectory 枚举由**新脚本自然规避**，状态机语义零改动 |
| 视觉主题 | 混合双主题、政务为纲（D 方向）：运营商端政务蓝白（贴 UOM）、管理端深蓝权威浅色、监管端深藏青驾驶舱大屏；家族主色政务蓝，深色端不用霓虹青，告警语义红/黄 |
| 主题切换 | 三端各自**固定主题不提供切换**（政务门户无暗色开关）；index.html 内部页保留现有 data-theme 机制 |
| 代码架构 | 共享底座 + 每端薄壳（壳/导航/页内路由各写各的，布局自由；底座不重复） |
| 技术形态 | 零构建原生 HTML/CSS/JS 不变；Leaflet/QR 库以 vendored 文件入仓，不算构建依赖 |

## 3. 后端 UOM 扩展域（64 → 73 端点）

**总原则**：全部加法。新字段一律可选或新增返回字段；现有 64 端点语义、业务铁律（pass/verify 恒 code=0、断链 5001 留痕、未授权只回封缄等）、状态机、冻结依赖（gin/gorm/glebarez/gmsm）、链适配层**零改动**；所有新模型注册进 `model.AllModels()`（自动被 AutoMigrate 与 demo/reset 覆盖）；`api.Deps` 十字段不动。

### 3.1 地理域（结构化既有坐标，不发明数据）

事实基础：种子航线起终点字符串已内嵌武汉区域经纬度（`"A-ENTRY(30.510,114.310)"` 格式，seed.go:98-104），标准轨迹样例 12 点含 lat/lon/alt/speed（seed.go:188-201）。

- `RouteSegment` 加 `StartLat/StartLon/EndLat/EndLon float64`（json `start_lat` 等，0=未设）。
- `route/create`：入参加同名可选字段；未提供时自动从 `StartPoint/EndPoint` 的 `"NAME(lat,lon)"` 格式解析回填；解析失败保持 0，**不报错**（向后兼容旧调用与旧测试）。
- `NetworkNode` 加 `Lat/Lon float64` 可选（json `lat/lon`）；抽象 `Position`(X/Y 字符串 JSON) **保留**，拓扑 Dijkstra/时延计算（topology.go 欧氏距离+固定时延常量）一字不动。`node/register` 加可选 lat/lon。
- 种子：5 条航线从内嵌坐标回填结构化字段；8 节点沿走廊赋 lat/lon。
- `topology/get` / `route/list` / `node/list` 返回自然携带坐标。zone 展示多边形由前端 `geo.js` 从航线坐标缓冲生成，**不入库**。

### 3.2 遥测域（运行识别叙事，挂 `internal/offchain`）

- 新模型 `TelemetryReport`：`TelemetryID`(TLM-前缀，idgen 生成)/`SessionID`/`MissionID`/`UAVID`/`Seq int`/`Lat`/`Lon`/`Alt`/`Speed`/`Heading`/`ReportedAt`/`Source`(SIM|MANUAL)。
- 端点（3 个）：
  - `telemetry/report`：手动上报，会话须 ACTIVE，否则 7003；Source=MANUAL，seq 服务端自增。
  - `telemetry/list`：session_id/uav_id 过滤 + 分页（records/total/page/page_size 与现有列表端点同形）。
  - `telemetry/latest`：按 session_id 或 uav_id 取最新一条；**无记录时 code=0 + `telemetry: null`**（前端轮询稳定，不算错误）。
- `TelemetryAutopilot`：仿 `autopilot.go:12-81` 现成形态（nil-safe ticker，main.go 启动+defer Stop）。环境变量 `TELEMETRY_AUTOPILOT_MS`，语义与 `OFFCHAIN_AUTOPILOT_MS` 一致（测试环境 0=无后台；生产 main.go 0→默认 2000ms；负值=显式关闭）。
- 推进规则：每 tick 对全部 ACTIVE 会话——取会话 mission 的 route_segments 经纬度链，按速度×间隔沿走廊插值推进一个点（alt 取航段高度带、heading 由前后点方位角计算），**飞完全程循环回起点**（seq 单调递增，演示连续）；mission 缺地理坐标的会话跳过（不造假坐标）；会话 DEGRADED/CLOSED 停止推进。Source=SIM。

### 3.3 实名登记域（挂 `internal/uavbusiness`，主数据域扩展）

- 新模型 `RealnameSubject`：`SubjectID`(RNS-)/`SubjectType`(INDIVIDUAL|ENTERPRISE)/`Name`/`IdNumber`(模拟证件号：身份证/统一社会信用代码)/`Contact`/`Status`(default REGISTERED)/时间戳。
- 端点（3 个）：`realname/register`、`realname/list`（分页+subject_type 过滤）、`realname/query`（subject_id，不存在→7001）。
- UAV 联动（全部可选，老调用零破坏）：
  - `UAV` 模型加 `RegistrationMark string`（json `registration_mark`，uniqueIndex，格式 `"UAS-"+8 位随机数字`，**注册即发**，所有注册都生成）与 `RealnameID string`（可选）。
  - `uav/register` 入参加可选 `realname_id`：提供则校验主体存在（不存在→7001）。
  - 二维码：**后端不生成**（全仓现无 QR 代码），响应带 registration_mark 等字段，前端 vendored QR 库渲染。

### 3.4 操控员执照域（挂 `internal/uavbusiness`，模拟即审即发）

- 新模型 `PilotLicense`：`LicenseID`(PIL-)/`LicenseNo`(格式 `UAV-PILOT-<年份>-<4 位随机数字>`)/`Name`/`IdNumber`/`Category`(多旋翼|固定翼|垂直起降)/`Status`(default ISSUED)/`IssuedAt`/`ExpiresAt`(默认 +2 年)/`Signature`(SM9)。
- 端点（3 个）：`pilot/apply`（即发；执照规范内容用现成 `cs.SM9SignUserID` 签名，前端可走 sm9/verify 展示防篡改）、`pilot/list`（分页+category 过滤）、`pilot/query`（license_id，不存在→7002）。
- `Mission` 加可选 `PilotLicenseID`；`mission/create` 入参加可选 `pilot_license_id`：提供则校验存在（不存在/过期→7002）。

### 3.5 追踪映射根治（本次唯一触及既有链路的点）

事实基础：`IdentityMapping` 模型/表已存在（regulatory.go:18-29，Pseudo uniqueIndex），`GenMappingID()` 现成（idgen.go）；全仓**无伪名生成逻辑**（PSEUDO-UAV-83921 是种子硬编码）；L3 追踪要求映射 `pass_id` 非空且 FlightPass 行存在（trace.go）；监管自动告警已按 uav_id 查最新映射取伪名（inspection.go:335-371）；现有测试全部不受自动建映射影响（TC3-03 用不存在伪名 PSEUDO-UNKNOWN-999、种子映射走 Seeder 直插、trace_test 直插不走业务服务）。

- `uav/register` 在跨链证明成功后（与自动 VERIFIED 迁移同点，uav.go:167 附近）创建 `IdentityMapping`：MappingID=GenMappingID()；Pseudo=新增生成器 `GenPseudo()`（`"PSEUDO-UAV-"+5 位随机 hex 大写`，uniqueIndex 冲突重试）；DeviceAddress=新增生成器（`"0xADDR"+5 位随机 hex 大写`）；UAVID/OperatorID/ManufacturerID/SM9Identity(=SM9IdentityOf(uavID)) 从注册事实带出；SourceChain="chainmaker"；PassID 留空。
- **跨链证明失败则不建映射**——未上链航空器的追踪本来就该断链，与「断链留痕禁止拼造」铁律一致。
- `pass/issue` 成功后回填：按 uav_id 取最新映射写入 PassID（best-effort，失败不阻断签发——与 logAudit 同模式）；否则故事机追踪断在 L3。
- `uav/revoke` 不动映射（历史留痕仍可溯）。
- 断链演示保留：未注册/未上链航空器、伪名打错，照旧 5001 + break_level + 断点留痕。

### 3.6 契约与测试同步（独立任务量，硬断言不可漏）

- `internal/apidoc/endpoints.go` 手写唯一源（P5-R7）按故事序登记 9 个新端点：Sample/ExpectCode/ProbeExpect/Capture 齐全；新端点样例编入现有场景（TC1 注册前奏：realname/register → pilot/apply → uav/register 带 realname_id；TC2 会话段：telemetry 样例），**场景数保持 24**。
- `tests/apifox_replay_test.go` 硬断言 `len(paths)==64` → **73**。
- errcode 新 **7xxx 段**（UOM 域）：7001 实名主体不存在、7002 执照不存在或过期、7003 遥测会话状态/参数错误；通用参数错仍复用 6002。
- 再生成命令链（勿手改快照铁律不变）：`APIFOX_GEN=1 go test ./tests -run TestApifoxEndpointSamples` → `./scripts/gen-endpoints.sh`。
- 新 handler 各配 `_test.go`（`NewRouter(validTestDeps(t))` + postJSON 模式）；遥测推进逻辑单测（手动 tick 注入）；route 坐标解析单测；映射生成/回填单测；TC1/TC2/TC3 与全量 `go test ./...` 零回归。
- README（后端）：端点表 64→73 + 新增「UOM 登记与运行识别域」章节。

## 4. 前端架构

### 4.1 文件结构

```
frontend/
├── index.html              # 内部总控导航页（改造）：三端入口大卡片 + 平台总览(demo维护)
│                           #   + 折叠组：参考流程(dashboard/act1/act2/act3)、旧工作台·参考(wb-*×4)、工具(explorer/pui-lab)
├── operator.html           # ① 运营商端 —— UOM 政务蓝白，顶部导航，地图为首页核心
├── authority.html          # ② 管理当局端 —— 深蓝权威浅色，侧栏政务风
├── regulator.html          # ③ 监管当局端 —— 深藏青驾驶舱大屏，侧栏+大屏布局
├── vendor/
│   ├── leaflet/            # Leaflet 1.9.x 本地 vendored（leaflet.js/leaflet.css/images/）
│   └── qrcode/             # 二维码渲染小库（登记标志/电子执照展示）
├── css/
│   ├── app.css             # 旧设计系统 —— 一字不动
│   ├── product.css         # 上一轮产品壳 —— 继续服务 index.html 与旧页，不动（含 :root 旧令牌）
│   ├── drone.css           # 新：三端共享设计系统（组件样式+布局原语+--d-* 令牌基座）
│   ├── theme-op.css        # 运营商端令牌：政务蓝白（主色 #0b4ea2 系）
│   ├── theme-au.css        # 管理端令牌：深蓝权威浅色
│   └── theme-rg.css        # 监管端令牌：深藏青深色大屏（政务蓝主色、告警红/黄，无霓虹青）
└── js/
    ├── api.js  store.js    # 共享底座：API 客户端（铁律契约）、跨端业务上下文（localStorage skytrust-ctx-v1）
    ├── pui.js              # 复用为组件引擎：dataTable/form/runOp/drawer/chipBar 等已验证逻辑不重写
    ├── portal.js           # 新：三端共用薄工具——hash 路由函数、顶栏三链状态灯/心跳、STORE chip 条基座、天地图 key 引导
    ├── map.js              # 新：Leaflet 封装——天地图瓦片层(key 从 localStorage)+矢量层 API
    │                       #   (drawRoutes/drawZones/drawNodes/droneMarker/wormhole 标记/隔离样式/点选回调)
    │                       #   +断网退化：tile 错误→中性网格底图，矢量层照常
    ├── data/geo.js         # 新：演示地理视图配置——默认视图(武汉 30.55,114.37)、zone 多边形缓冲生成、图层样式常量
    ├── shell-op.js / shell-au.js / shell-rg.js   # 每端薄壳：导航结构+路由表+主题装载（固定主题）
    └── pages/
        ├── op/             # 运营商端页面（每页一文件，window.OP_PAGES 注册）
        ├── au/             # 管理端页面（window.AU_PAGES）
        ├── rg/             # 监管端页面（window.RG_PAGES）
        └── dashboard.js act1.js act2.js act3.js explorer.js overview.js pui-lab.js
            wb-operator.js wb-manager.js wb-security.js wb-regulator.js   # 旧页原样冻结
```

### 4.2 共享底座与复用边界

- 「三端全新写」的精确边界：**业务页面、壳、导航、地图交互全部新写**；表格/表单/抽屉/确认框/导出等交互引擎复用 `pui.js`（drone.css 令牌换肤成政务风），不重写 ~1400 行已验证组件库。
- 三端共写同一 `STORE`（同 localStorage key）：运营商端建的 uav_id/mission_id/pass_id/session_id 等，切端即在手（跨端讲故事机制继承）；每端顶部 chip 条点击预填表单。
- 唯一事实源仍是后端；STORE 只是操作员便利层。
- 天地图 key：`localStorage['skytrust-tianditu-key']`；每端首次进地图页若无 key 弹引导（说明免费申请途径），可跳过→退化模式（矢量层+中性底图）。key 属浏览器端公开性质，但仍**不入 git**。

### 4.3 视觉语言

政务风家族：等宽数字、状态徽章、克制阴影、卡片圆角 8-10px；运营商端贴 UOM 政务蓝白（权威、服务大厅式入口卡片）；管理端深蓝权威浅色（高密度表格）；监管端深藏青大屏（雷达/态势元素、告警红黄语义）。链色语义（ChainMaker 紫/Fabric 蓝/FISCO 青）保留用于跨链存证组件。无人机元素：quadcopter SVG 图标族、地图无人机标记、登记标志/二维码卡片。

## 5. 三端信息架构

三端顶栏统一：三链状态灯（15s 心跳）+ 后端延迟徽章 + STORE chip 条。主题固定不切换。

### 5.1 运营商端 `operator.html`（顶部导航）

| 路由 | 页面 | 内容与地图交互 | 端点 |
|---|---|---|---|
| `#/home` | 服务首页 | hero 大地图（空域状态着色+我的航空器实时位置）；服务入口卡片（实名登记/航空器登记/飞行活动申请/电子许可/运行识别/空域查询）；政策公告装饰区（静态） | topology/get、telemetry/latest、chain/status |
| `#/realname` | 实名登记 | realname/register（个人/企业+模拟证件号）→成功卡；主体列表；顶栏身份选择器（选定主体存 STORE 全端预填，轻量「登录」叙事、无密码） | realname/register·list·query |
| `#/aircraft` | 我的航空器 | uav/register（选实名主体+厂商/运营商下拉）→成功页：登记标志 UAS-xxx+**二维码**+跨链四段 TxID（「登记即上链」）；列表/详情/注销；VERIFIED 徽章=「实名核验通过」 | uav/register·list·query·revoke、manufacturer/list、operator/list、crosschain/query |
| `#/flight` | 飞行活动申请 | mission/create：**地图勾选航段**生成 route_segments（zone 着色 OPEN/RESTRICTED/CLOSED，点选高亮入单）+高度/时窗/载荷/描述+可选执照；mission/submit 跨链申请；状态追踪；conflict/detect 冲突提示+conflict/resolve 协调（含 3004 设计内拒绝展示） | mission/create·submit·query·list、route/list、conflict/detect·resolve、crosschain/query、pilot/list |
| `#/license` | 电子飞行许可 | pass/list（本方过滤）→电子许可卡（证号/航线缩略图/有效窗/SM3 摘要/签名值/QR 装饰）；飞行前自查 pass/verify：valid 绿灯「可以起飞」大卡 / reasons 红灯清单 | pass/list·query·verify |
| `#/ops` | 运行识别·飞行动态 | session/open=**起飞报备**（SM9 挑战认证回显）→地图无人机沿航线实时移动（轮询 telemetry/latest）+遥测流水表+会话状态；session/close=降落报备 | session/open·list·close、telemetry/latest·list、message/list |
| `#/airspace` | 空域查询 | 全屏地图：zone 多边形+全部航线+网络节点图层开关（UOM「空域查询」对位） | route/list、node/list、topology/get |

### 5.2 管理当局端 `authority.html`（侧栏）

| 路由 | 页面 | 内容 | 端点 |
|---|---|---|---|
| `#/queue` | 待审队列 | crosschain/list(MISSION_APPLICATION+SUCCESS) 发现申请+review/query 已审标注+mission/query 详情（**只见脱敏值**，隐私叙事）+地图小窗看任务航线→review/submit 裁决跨链回传 | crosschain/list·query、review/query·submit、mission/query |
| `#/passes` | 许可管理 | pass/issue（有效窗）·revoke（本地先行）·list·query·verify+FLIGHT_PASS/PASS_REVOKE 跨链流水四段 TxID；幂等提示按事实写（跨链 GENERATING 同 pass_id 重试复用；已生效不可重复签发 3002） | pass/*、crosschain/list·query |
| `#/records` | 审核记录 | review/query + crosschain/list(MISSION_REVIEW_RESULT) | review/query、crosschain/list |
| `#/registry` | 登记与资质 | 只读台账：realname/list（实名主体）+pilot/list·query（执照记录含 SM9 验签按钮）——「局方台账」叙事 | realname/list、pilot/list·query、crypto/sm9/verify |
| `#/masterdata` | 主数据维护 | manufacturer/operator 注册；**route/create 地图点选两点定起止坐标**（或手输 lat/lon）+航线台账（corridor_status） | manufacturer/register·list、operator/register·list、route/create·list |
| `#/netsec` | 链网安全运营 | 拓扑**真地图**（Leaflet 节点/边/虫洞标记/隔离集）；节点注册；会话监控；消息流量（统计卡+逐跳时延）；攻防演练（wormhole/toggle·risk/evaluate·event/list·path/switch）；性能实验（experiment/run·result·list·export 含 CSV） | topology/get、node/register·list、session/*、message/*、wormhole/toggle、risk/evaluate、event/list、path/switch、experiment/* |

### 5.3 监管当局端 `regulator.html`（侧栏+大屏）

| 路由 | 页面 | 内容 | 端点 |
|---|---|---|---|
| `#/cockpit` | 监管驾驶舱 | dashboard/summary 统计带+**全屏态势地图 C 位**：航线/节点/活跃飞行遥测无人机位置/虫洞标记/告警落点（点击→详情卡） | dashboard/summary、topology/get、telemetry/latest、alert/list |
| `#/alerts` | 告警管理 | alert/raise·list·status 状态机推进（OPEN→…→RESOLVED）+风险徽章（6 类 event_type） | alert/* |
| `#/trace` | 身份追踪 | trace/identity 三入口（告警号/伪名/设备地址）七级时间线；**断链 5001 特判：errCard 下补渲断点时间线**（吸收 Task 11 C14 建议）；根治后故事航空器 break_level=0 全链可溯 | trace/identity |
| `#/authz` | 授权中心 | authorize/apply·review+审批上链 chain_tx_id 展示 | authorize/* |
| `#/inspect` | 密文核验 | 封缄(5002)/开箱双态+scope 四项+digest/signature 双验证+结论上链；**trajectory 用下拉 ""/NORMAL/DEVIATION**（吸收 Task 11 BUG-4，消除误导 placeholder） | inspect/ciphertext |
| `#/audit` | 监管审计 | regulatory/audit/list·export+audit/query·export 双 CSV 导出 | regulatory/audit/*、audit/* |
| `#/crypto` | 密码工具箱 | sm3/sm9 keygen·sign·verify 篡改检测演示 | crypto/* |

### 5.4 错误处理

沿用 api.js 契约（永不 throw）；code≠0 统一 errCard+explain.js 解说（新增 7xxx 三码与 9 个新端点词条）；code=-1 给启动指引；三端对拒绝类错误中性展示（无「◈ 预期」徽章——那是参考页语义）。

## 6. 验收故事脚本（`docs/demo-script.md` 覆盖重写）

《紧急医疗运输：一次跨域飞行的全程可信监管（三端版）》。三端 = 三个浏览器标签页，切换即换视角。

| 章 | 端 | 剧情与关键操作 |
|---|---|---|
| 0 开场整备 | （后台）内部导航页 | 三链 ONLINE、demo/reset+init、天地图 key 检查——明示「后台整备」不算产品叙事 |
| 1 建档 | 管理端→运营商端 | 管理端主数据：运营商/厂商注册、**地图点选建医疗走廊航线**（真实坐标）；运营商端：企业实名登记→执照申请（即发+SM9 签名）→**航空器登记**：登记标志+二维码+跨链四段 TxID（台词：注册即核验、登记即上链——**无 VERIFY 步**） |
| 2 申请 | 运营商端 | 地图勾选航段建任务（描述含「特殊血样」→界面只见脱敏值）→跨链提交；物流商 B 同走廊重叠时窗→conflict/detect 命中→协调消解；再消解被拒 3004（设计内拒绝） |
| 3 审核与许可 | 管理端 | 待审队列→地图小窗看航线→脱敏详情（隐私台词）→APPROVED 跨链回传→签发许可 |
| 4 起飞 | 运营商端 | 电子许可卡→飞行前自查绿灯（valid=true）→**起飞报备 session/open→地图无人机沿医疗走廊实时移动**（遥测轮询） |
| 5 攻防 | 管理端+运营商端 | 真地图拓扑→开虫洞→消息诱入时延骤降→5 维 DETECT→隔离→路径重算恢复→重开被拒 4001；**运营商端地图飞行动态同步降级停摆**（跨端可见攻击后果） |
| 6 追踪 | 监管端 | WORMHOLE 告警登记→**故事机伪名七级追踪全链可走通**（break_level=0 高光）→未登记航空器演示断链即红线（5001+断点时间线，「宁可展示断链也不拼造身份」台词）→告警状态机推进 |
| 7 授权开箱 | 监管端 | 授权申请 scope=MISSION+ROUTE+PAYLOAD+IDENTITY+有效窗→审批上链 ChainMaker→封缄 5002→开箱明文「特殊血样」+双验证+结论上链→工具箱篡改检测（1002/valid=false） |
| 8 收尾 | 管理端→运营商端→监管端 | 吊销许可→运营商端复验红灯 valid=false（code=0 铁律）→**ACTIVATE 状态机收尾展示**（后置无下游依赖）→监管端双 CSV 导出+驾驶舱汇总+跨链流水盘点 |

附录三件：①验收前检查清单（三链/后端/复位/key；**时间窗守备消除**——许可有效窗改用相对指令「valid_from=当前时间−1 小时、valid_to=当前时间+4 小时」，不再写死钟点）；②设计内拒绝汇总表（3004/4001/5001 断链/5002/valid=false/篡改验签，每条配「为什么拒绝恰恰证明系统在保护你」台词）；③预计时长（约 30 分钟含讲解与切端）。

trajectory 参数全程留空（NORMAL 会撞硬编码基线必报偏航+污染驾驶舱——旧脚本已实测定性）。

## 7. 实施与迁移

### 7.1 两份计划，先后执行（均走 subagent-driven-development）

- **计划 A「后端 UOM 扩展域」**：地理域 → 遥测域 → 实名/执照域 → 追踪映射根治 → apidoc/errcode/断言/README 契约同步 → endpoints.js 再生成。产出：73 端点后端全绿。
- **计划 B「三端前端 + 脚本重写」**：vendor 底座（Leaflet/QR）+ drone.css/portal.js/map.js/geo.js → index.html 内部导航页改造 → 运营商端 → 管理端 → 监管端 → demo-script 重写 → 集成验证。依赖 A 的新端点与再生成的 endpoints.js。

### 7.2 回归防护与冻结资产

- `go test ./...`（含 TC1/2/3 与 apifox 回放）全程零挂；新断言 73/24 同步。
- 旧五页（dashboard/act1/act2/act3/explorer）+ 旧四工作台（wb-*）**原样冻结**：app.css `:root` 旧令牌、product.css 不改；wb-* 遗留缺陷不再修（参考资产）；pui.js 如需改动只允许加法（三端与旧页共用）。
- 仍活的遗留项并入计划 B：`chmod +x scripts/serve-frontend.sh`；管理端 passes 页幂等提示按事实写；监管端 trajectory 下拉与断链时间线已入 5.3 设计。
- index.html 改造只动导航结构与文案，overview.js（demo 维护区）逻辑不动。

### 7.3 验证纪律（Task 11 教训固化）

- 集成验证一律**隔离 sim 环境**：SERVER_ADDR/DB_PATH/SM9_KEY_DIR 全部 override 到 /tmp 专用目录（默认值指向生产文件）；生产 :8080/:8090 进程永不 kill/restart、永不 POST。
- API 层走查用 curl+jq 断言脚本按新 demo-script 输入值逐章验证；浏览器目检项如实标 DEFERRED-HUMAN，禁止臆造结果。
- 前端语法门：node --check 全部新旧 JS。

### 7.4 文档同步清单

后端 README（73 端点表+UOM 域章节）、frontend README（三端入口+天地图 key 配置指引+内部导航页说明）、根 CLAUDE.md（「共 64 个」→73、前端结构描述、demo-script 描述）、docs/demo-script.md（重写）；apifox 快照与 endpoints.js 经脚本再生成。

### 7.5 旧 SDD 收尾处置

上一轮 subagent-driven-development 的 Task 11（集成验证）被本设计取代：其未裁定的 bug 清单按「根治（追踪映射）/内置（trajectory 下拉、断链时间线、幂等提示）/冻结（wb-* 参考页缺陷）」三分法吸收进两份新计划；旧分支终审与 finishing-a-development-branch 合并进计划 B 的收尾，不再单独走。台账 `.git/sdd/progress.md` 记录本处置。

## 8. 范围外（明确不做）

- 真实用户认证/权限体系（实名主体/执照是**业务数据域**，身份选择器只是 STORE 预填便利层，不是登录态）。
- 真实地理数据（演示地理=种子内嵌的武汉区域坐标；不接真实空域/禁飞区/气象数据源）。
- 移动端/App、真实 QR 防伪体系（二维码为展示层渲染）。
- 执照真实审批流（模拟即审即发，管理端只读台账）。
- 链适配层/真实链部署改动（新域不新增链上合约调用；real 模式行为与 sim 一致经既有网关）。
- 旧三幕/旧四工作台/explorer 的视觉或逻辑改动；构建系统/框架引入。
- 天地图 key 的申请与保管（需求方自备免费 key；无 key 走退化模式）。

## 9. 风险与备注

- **apifox 快照大 diff**：9 新端点+既有响应加字段 → openapi.json/endpoints.js 重写幅度大；均为脚本再生成产物，勿手改，评审只看生成命令与断言。
- **Leaflet 版本钉死**：vendored 1.9.x 入仓后不升级（与冻结依赖同精神）。
- **遥测自动推进与测试环境**：测试恒 `TELEMETRY_AUTOPILOT_MS=0` 关后台，单测手动 tick——与 offchain 既有约定一致，避免测试抖动。
- **uav/register 响应加字段**（registration_mark 等）为纯加法，但 TC1 与 apifox 样例需回归确认无「响应字段集合」类断言被破坏。
