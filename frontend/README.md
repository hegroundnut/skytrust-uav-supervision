# SkyTrust 前端（原生 HTML+CSS+JS，零构建）

零构建、零第三方依赖的前端，全量覆盖 skytrust-backend **80 个 API**
（契约来源 `docs/apifox/skytrust-backend.openapi.json`）。
**产品入口为四个独立门户页**（严扣无人机主题，固定主题不切换）；`index.html` 降为
**内部总控导航页**（演示维护台）：顶部四端入口卡片直达产品，下方 SPA 保留平台总览、
冻结的旧工作台、三幕参考流程、区块链浏览器与 API 浏览器。
验收故事脚本见 [`docs/demo-script.md`](../docs/demo-script.md)
（《紧急医疗运输：一次跨域飞行的全程可信监管（四端版）》，十章覆盖四端全流程）。

## 四端产品入口

| 入口 | 门户 | 主题 | 页面 |
|---|---|---|---|
| `operator.html` | 运营商端（UOM 风格政务办事窗口） | 政务蓝白 | 服务首页 / 实名登记 / 我的航空器 / 飞行活动申请 / 电子飞行许可 / 运行识别·飞行动态 / 空域查询 / 链上浏览器 |
| `authority.html` | 管理当局端（审核 + 链网安全运营） | 深蓝权威浅色 | 审核队列 / 许可管理（**只读台账 + 验证**——签发/吊销已移交证照中心端） / 审核留痕 / 登记与资质 / 主数据维护 / 链网安全运营 / 链上浏览器 |
| `regulator.html` | 监管当局端（跨域可信监管大屏） | 深藏青暗色 | 监管驾驶舱 / 告警管理 / 身份追踪 / 授权中心 / 密文核验 / 监管审计 / 密码工具箱 / 链上浏览器 |
| `license-center.html` | **证照中心端（第 4 链 IRITA 证照链门户）** | 深绿黑证照驾驶舱 | 证照总览 / 通行证签发 / 证照台账 / 证照查验 / 证照吊销 / 链上浏览器 |

四方分权叙事：**申请（运营商）→ 审批（管理当局）→ 签发/吊销（证照中心，身份 `REGISTRY-ADMIN`）→ 验证（运营商/监管）**。
FLIGHT_PASS / PASS_REVOKE 跨链源链为证照链（irita→chainmaker→fabric）。

四端共享底座：`js/api.js`（统一 POST 客户端）、`js/store.js`（DemoContext）、`js/pui.js`（产品组件）、
`js/portal.js`（hash 路由/**四链心跳**——含 IRITA 证照链 4 盏灯/key 引导/二维码）、
`js/chainview.js`（**CXV 四端共享区块链浏览器模块**）、`js/wormhole-topo.js`（**WTOPO 虫洞抽象拓扑图**，
纯 SVG 零依赖，挂载管理端 netsec）、`js/capability.js`（CAPX 三大核心能力卡）、
`js/map.js`（Leaflet 封装：天地图瓦片+退化兜底+矢量层）、`js/data/geo.js`（坐标红线纯函数）；
样式 `css/drone.css`（d-* 命名空间）+ `css/theme-{op,au,rg,ct}.css`（仅令牌覆盖）。
地图密钥只存浏览器 localStorage（`skytrust-tianditu-key`），绝不入仓库；未配置密钥时
底图自动退化（中性网格 + 矢量层照常）。

## 运行

    # 1. 后端已在 :8080（sim：go run ./cmd/server；真实四链：./scripts/start-backend-real.sh）
    # 2. 启动同源静态服务 + API 代理（后端未开 CORS，必须经此代理）
    ./scripts/serve-frontend.sh          # 默认 :8090；PORT=9000 BACKEND=http://host:8080 可覆盖

浏览器打开 `http://127.0.0.1:8090/operator.html`（四端产品入口），或
`http://127.0.0.1:8090/`（内部总控导航页，默认落地平台总览）。

## 内部总控导航页（index.html SPA）

| 路由 | 页面 | 覆盖端点组 |
|---|---|---|
| `#/overview` | 平台总览（默认落地） | chain/status、health/check、dashboard/summary、mission/pass/crosschain 台账计数、alert/list、crosschain/list、demo/init·reset |
| `#/wb-operator` | 运营商工作台（冻结参考） | manufacturer/*、operator/*、route/*、uav/*（注册/状态机/注销）、mission/*（创建/提交/冲突）、pass/query·list·verify、crosschain/* |
| `#/wb-manager` | 管理方审核台（冻结参考） | crosschain/list（MISSION_APPLICATION 台账驱动待审队列）、review/*、mission/list·query、pass/issue·revoke·verify·list、crosschain/list（REVIEW_RESULT/FLIGHT_PASS/PASS_REVOKE） |
| `#/wb-security` | 链网安全运营中心（冻结参考） | topology/get（SVG）、node/*、session/*、message/*（stats+path_detail）、wormhole/toggle、risk/evaluate、path/switch、event/list、experiment/* |
| `#/wb-regulator` | 监管门户（冻结参考） | dashboard/summary、alert/*、trace/identity（三入口七级时间线）、authorize/*、inspect/ciphertext（封缄/开箱双态）、regulatory/audit/*、audit/*、crypto/* |
| `#/chainview` | 区块链浏览器（CXV index 版） | explorer/overview·nodes·blocks·block·tx、crosschain/list（index 不加载 PORTAL/MAPX——CXV 只依赖 API/UI/PUI） |
| `#/dashboard` | 演示总控台（参考） | 三幕总控一键实跑 + 复位守卫 + 悬浮窗 |
| `#/act1` `#/act2` `#/act3` | 三幕参考流程 | 幕一任务协同 / 幕二虫洞攻防 / 幕三监管核查（各含一键实跑监控台与理论失败步） |
| `#/explorer` | API 浏览器（工具） | 80 端点全量：分组检索、请求体实发、录制样例对照 |
| `#/pui-lab` | 组件自检页（开发工具，不进侧边栏） | PUI 组件画廊 + live 数据组件验证 |

旧工作台（wb-*）与旧五页（dashboard/act1-3/explorer）**冻结**：不改不删，供参考与回归对照；
新四端不复用其页面代码，只共享 api/store/pui 底座。旧壳心跳灯仍 3 盏（app.js 冻结，
不显 IRITA——四门户壳 portal.js 为 4 盏，如实差异不掩饰）。

## 三套设计系统共存

- `css/app.css`：旧设计系统——**一字不动**，index.html SPA 专用（总览/旧工作台/参考页）。
- `css/product.css`：产品组件系统——`--p-*` 令牌 + `p-` 前缀组件类；四端与 index.html 共用
  （结构样式）；壳级覆盖（.topbar/.sidebar/.nav-*）只对 index.html 生效。
- `css/drone.css` + `css/theme-{op,au,rg,ct}.css`：四端设计系统——`d-` 前缀命名空间 + `--d-*` 令牌；
  四份主题只覆盖令牌值（政务蓝白 / 深蓝权威浅色 / 深藏青暗色 / **深绿黑证照驾驶舱**——ct 主题
  `data-theme="dark"` 同时驱动 product.css 暗色令牌），不改结构；含少量兼容规则
  （#toast-box/.toast/.tip/.json-block——ui.js 生成的类名，四端不加载 app.css）。
  追加块（additive）：`.d-cxv-*`（浏览器三区，链色走 `--cxv-chain` CSS var 注入，零硬编码 hex）、
  `.d-wtopo-*`（虫洞拓扑节点类型色）。
- `js/pui.js`：产品组件库（badge/dataTable/form/resultPanel/actionBar/confirm/drawer/
  chipBar/tabs(?tab= 深链)/statCards/scoreBars/hbars/pathHops/cxTrail 四段存证/
  openCxDetail/topoSVG/csvExport/runOp 操作管线）；只复用旧 `js/ui.js` 的纯函数；**只允许追加**。
- `js/store.js`：DemoContext 跨页业务上下文（localStorage 便利层，13 类实体单槽最新）。
  **唯一事实源永远是后端**——store 丢失不影响任何功能。

## 区块链浏览器（CXV，四端同页——验收直观展示项）

`js/chainview.js`（薄壳：组装 + 共享原语 + SMALL_PRINT/_pure 导出面）暴露 `window.CXV`，
四端各挂 `#/chainview`「链上浏览器」页。**第五期新首屏 = 布局 E 六段**（自上而下，结构定死
见 spec §6.2：`docs/superpowers/specs/2026-10-19-acceptance-explorer-manual-design.md`；
时间线几何对照源 = 归档 mockup：
`docs/superpowers/specs/assets/2026-10-19-explorer-layout-e-mockup.html`）：
① 三目标证据芯片（`js/cxv/goals.js`，explorer/goals 活数）→ ② 最近业务对象选择器 →
③ 旅程概要头 → ④ 等宽节点横向链色时间线（②③④ = `js/cxv/journey.js`，explorer/journey +
复用 pass/mission/uav 列表端点）→ ⑤ 可折叠四链结构泳道（`js/cxv/lanes.js`，零端点，
消费 journey onSelect 回调，列序 Fabric/ChainMaker/FISCO/IRITA 固定）→ ⑥ 原三区保留作
下钻工具（`js/cxv/zones.js`，原样迁移）；装载序 goals→journey→lanes→zones→薄壳。
第⑥段三区同页纵排、链选中态跨区共享：

1. **节点情况**：explorer/overview 四链卡（名称/共识显示串逐字取自后端响应，绝不转述）+
   选中链 explorer/nodes 节点表——`source` 列如实标注 `rpc`（链原生实测）/ `static+probe`
   （静态配置+TCP 探活）/ `sim`（进程内模拟），绝不以仿真冒充真实链。
2. **块浏览**：explorer/blocks 最近 20（新→旧）→ 行点击 explorer/block 抽屉（hash/time/tx_count/
   proposer/tx 列表）→ tx 点击 explorer/tx 链上直查；irita「Merkle 证明可用」标注仅在
   mode=real 时出现（绝不在模拟数据上声称证明）。
3. **链上数据追踪**：crosschain/list 两跳四段台账 + 行点击 openCxDetail 四段存证 +
   TxID 直查表单（链选 + TxID → explorer/tx）。

四端裁剪（`opts.portal`）：op 默认聚焦 MISSION_APPLICATION/FLIGHT_PASS 芯片；ct 默认链 irita；
rg 监管中继段高亮（CHAINMAKER 链标段加 `.d-cxv-reg-hl`，pui.js 零改动）；au/index 全量。
**诚实红线**：一切数据来自实时响应且 `code===0` 门控；链 RPC 能力缺失 → **2005 降级卡直出后端
message**（通用能力哨兵——fisco-bcos 块查询自 version-matrix §12.11 复核后走 go-sdk 通道回真实
块数据，v3.16 JSON-RPC curl 面怪癖不再触发降级）；空态如实；绝不硬编码块高/TxID/哈希。证照链块高含空块（create_empty_blocks=true，~40-50k 块/日）——
数值大且增长快属预期，账本连续（§12.5）。

## 虫洞攻击拓扑图（WTOPO——验收直观展示项）

`js/wormhole-topo.js` 暴露 `window.WTOPO`，纯 SVG 零依赖，挂载 authority.html netsec
「拓扑·节点」Leaflet 地理层下方。消费 `/api/topology/get`：抽象层全量可见（**含 ATTACKER
节点**，红色 ⚠ 标签）；虫洞边红虚线 + 流动动画 + 中点 ⚠；会话路径加粗（虫洞边同时在路径上时
保持红虚线流动——被诱入隧道的路径必须仍然显眼是攻击边）；ISOLATED 红虚线描边 + ⛔ + 检出脉冲环。
**坐标红线分工**：WTOPO 只渲染服务端抽象 position、**绝不读写 lat/lon**——经纬度 0=未设语义归
GEO/map.js 地理层独家裁决；无 position 节点不入图、列「未布点」清单，绝不猜测默认坐标；
节点色 = 类型语义（紫 MANAGEMENT/蓝 EDGE/青 UAV/红 ATTACKER），链色不挪用。

## 一键实跑可视化（参考页保留能力）

「一键实跑」是**实跑监控台**而非进度条：每步实时展示 API 路径、code 徽章、延迟、
关键字段 chips，可展开完整请求/响应；理论失败步带「◈ 预期」徽章（3004/4001/4002/5002/
valid=false 等设计内拒绝命中预期记 ✓）；每步附成功/失败解说（`js/data/explain.js`
词典：27 错误码 + 78 端点——后端现为 80，journey/goals 两新端点词典待补录）。三幕总控出发前自动检测残留并确认复位（真实链账本永不复位，P6-R6）。
排练用一键实跑，正式验收按 `docs/demo-script.md` 纯手动。新四端页面无「◈ 预期」徽章——
设计内拒绝以错误卡 + 解说词典呈现（Global Constraints #13）。

## 结构

    frontend/
    ├── operator.html         # 运营商端门户（产品入口，顶导航布局）
    ├── authority.html        # 管理当局端门户（产品入口，侧栏布局；netsec 挂 WTOPO 拓扑图）
    ├── regulator.html        # 监管当局端门户（产品入口，侧栏暗色大屏）
    ├── license-center.html   # 证照中心端门户（产品入口，深绿黑暗色侧栏——第 4 链 IRITA）
    ├── index.html            # 内部总控导航页：四端入口卡片 + SPA（总览/冻结工作台/浏览器/参考流程/工具）
    ├── vendor/leaflet/       # Leaflet 1.9.4（sha256 钉死，含 images/）
    ├── vendor/qrcode/        # qrcode-generator 2.0.4（运营商端/证照中心端二维码）
    ├── css/app.css           # 旧设计系统（index.html 专用，勿动）
    ├── css/product.css       # 产品组件系统（--p-* 令牌 + p- 组件，勿动）
    ├── css/drone.css         # 四端设计系统（d-* 命名空间 + --d-* 令牌；含 d-cxv-*/d-wtopo-* 追加块）
    ├── css/theme-op.css      # 运营商端主题：政务蓝白（令牌覆盖）
    ├── css/theme-au.css      # 管理端主题：深蓝权威浅色（令牌覆盖）
    ├── css/theme-rg.css      # 监管端主题：深藏青暗色（令牌覆盖）
    ├── css/theme-ct.css      # 证照中心端主题：深绿黑证照驾驶舱（令牌覆盖）
    └── js/
        ├── data/endpoints.js # 由 openapi.json 生成（scripts/gen-endpoints.sh，勿手改）
        ├── data/explain.js   # 成功/失败解说词典（27 错误码 + 78 端点，新旧共用；后端现 80——journey/goals 待补录）
        ├── data/geo.js       # 演示地理数据层：坐标红线纯函数 + zone 缓冲多边形
        ├── api.js            # 统一 POST 客户端：永不 throw（勿动）
        ├── ui.js             # 旧共享组件库（参考页 + 四端 toast/jsonBlock 复用；勿动）
        ├── pui.js            # 产品组件库（只允许追加）
        ├── store.js          # DemoContext 跨页上下文（勿动）
        ├── map.js            # Leaflet 封装：天地图瓦片/退化兜底/矢量层/无人机标记
        ├── chainview.js      # CXV 薄壳：组装 + 共享原语 + SMALL_PRINT/_pure 导出面
        ├── cxv/goals.js      # CXV 布局 E 第①段：三目标证据芯片（explorer/goals 活数，window.CXV_GOALS）
        ├── cxv/journey.js    # CXV 布局 E 第②③④段：对象选择器+旅程概要头+等宽节点横向时间线（window.CXV_JOURNEY）
        ├── cxv/lanes.js      # CXV 布局 E 第⑤段：可折叠四链结构泳道（零请求，消费 journey onSelect 回调，window.CXV_LANES）
        ├── cxv/zones.js      # CXV 布局 E 第⑥段：原三区代码原样迁移（explorer×5 + crosschain/list，window.CXV_ZONES）
        ├── wormhole-topo.js  # WTOPO 虫洞抽象拓扑图（纯 SVG，管理端 netsec 挂载）
        ├── capability.js     # CAPX 三大核心能力卡（cards/strip/cockpit 三密度）
        ├── portal.js         # 四端共享壳：路由/四链心跳/chips/key 引导/二维码
        ├── shell-op.js shell-au.js shell-rg.js shell-ct.js    # 每端薄壳（导航表 + boot）
        ├── pages/op/         # home realname aircraft flight license ops airspace chainview（8 页）
        ├── pages/au/         # queue passes records registry masterdata netsec chainview（7 页）
        ├── pages/rg/         # cockpit alerts trace authz inspect audit crypto chainview（8 页）
        ├── pages/ct/         # home issue ledger verify revoke chainview（6 页——证照中心端）
        ├── pages/chainview.js  # index SPA 版浏览器页（CXV portal:'index'）
        ├── pages/overview.js wb-operator.js wb-manager.js wb-security.js wb-regulator.js pui-lab.js   # 冻结
        ├── pages/dashboard.js act1.js act2.js act3.js explorer.js   # 旧页（勿动）
        └── app.js            # index.html SPA：hash 路由、主题、链灯 15s 巡检（旧壳 3 盏，冻结）、折叠组持久化（勿动）

## 约定

- 全部端点 **POST + JSON**，信封 `{code, message, data, trace_id, timestamp}`，`code=0` 成功；
  列表统一 `data.records[] + page/page_size/total`。
- 链身份色固定映射永不互换：ChainMaker=紫 `#7c3aed`、Fabric=蓝 `#2563eb`、
  FISCO BCOS=青 `#0891b2`、**IRITA 证照链=绿 `#15803d`（暗色主题 `#4ade80`）**；
  状态色 good/warning/serious/critical 一律 **图标+文字**，不单靠颜色。
- 新页面组件类名一律 `p-` 前缀、四端壳层类名一律 `d-` 前缀；令牌一律 `--p-*`/`--d-*`；
  禁止修改 `:root` 旧令牌。浏览器/拓扑追加块类名 `.d-cxv-*`/`.d-wtopo-*`，链色经 CSS var
  注入（`--cxv-chain`），JS 零硬编码 hex。
- 坐标红线：lat/lon 双零 = 未设 → 地图不画点不连线不猜（`js/data/geo.js` 唯一裁决）；
  抽象拓扑层（WTOPO）只用服务端 position，与经纬度语义无关。
- `demo/reset` 有确认弹窗：只清业务表并复位模拟链，**真实链数据不受影响**（P6-R6）。
- 端点样例过期时重新生成：`./scripts/gen-endpoints.sh`。
