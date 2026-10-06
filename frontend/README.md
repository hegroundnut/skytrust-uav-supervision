# SkyTrust 前端（原生 HTML+CSS+JS，零构建）

零构建、零第三方依赖的前端，全量覆盖 skytrust-backend **73 个 API**
（契约来源 `docs/apifox/skytrust-backend.openapi.json`）。
**产品入口为三个独立门户页**（严扣无人机主题，固定主题不切换）；`index.html` 降为
**内部总控导航页**（演示维护台）：顶部三端入口卡片直达产品，下方 SPA 保留平台总览、
冻结的旧工作台、三幕参考流程与 API 浏览器。
验收故事脚本见 [`docs/demo-script.md`](../docs/demo-script.md)
（《紧急医疗运输：一次跨域飞行的全程可信监管》，九章覆盖三端全流程）。

## 三端产品入口

| 入口 | 门户 | 主题 | 页面 |
|---|---|---|---|
| `operator.html` | 运营商端（UOM 风格政务办事窗口） | 政务蓝白 | 服务首页 / 实名登记 / 我的航空器 / 飞行活动申请 / 电子飞行许可 / 运行识别·飞行动态 / 空域查询 |
| `authority.html` | 管理当局端（审核签发 + 链网安全运营） | 深蓝权威浅色 | 审核队列 / 许可管理 / 审核留痕 / 登记与资质 / 主数据维护 / 链网安全运营 |
| `regulator.html` | 监管当局端（跨域可信监管大屏） | 深藏青暗色 | 监管驾驶舱 / 告警管理 / 身份追踪 / 授权中心 / 密文核验 / 监管审计 / 密码工具箱 |

三端共享底座：`js/api.js`（统一 POST 客户端）、`js/store.js`（DemoContext）、`js/pui.js`（产品组件）、
`js/portal.js`（hash 路由/三链心跳/key 引导/二维码）、`js/map.js`（Leaflet 封装：天地图瓦片+退化兜底+矢量层）、
`js/data/geo.js`（坐标红线纯函数）；样式 `css/drone.css`（d-* 命名空间）+ `css/theme-{op,au,rg}.css`
（仅令牌覆盖）。地图密钥只存浏览器 localStorage（`skytrust-tianditu-key`），绝不入仓库；未配置密钥时
底图自动退化（中性网格 + 矢量层照常）。

## 运行

    # 1. 后端已在 :8080（sim：go run ./cmd/server；真实三链：./scripts/start-backend-real.sh）
    # 2. 启动同源静态服务 + API 代理（后端未开 CORS，必须经此代理）
    ./scripts/serve-frontend.sh          # 默认 :8090；PORT=9000 BACKEND=http://host:8080 可覆盖

浏览器打开 `http://127.0.0.1:8090/operator.html`（三端产品入口），或
`http://127.0.0.1:8090/`（内部总控导航页，默认落地平台总览）。

## 内部总控导航页（index.html SPA）

| 路由 | 页面 | 覆盖端点组 |
|---|---|---|
| `#/overview` | 平台总览（默认落地） | chain/status、health/check、dashboard/summary、mission/pass/crosschain 台账计数、alert/list、crosschain/list、demo/init·reset |
| `#/wb-operator` | 运营商工作台（冻结参考） | manufacturer/*、operator/*、route/*、uav/*（注册/状态机/注销）、mission/*（创建/提交/冲突）、pass/query·list·verify、crosschain/* |
| `#/wb-manager` | 管理方审核台（冻结参考） | crosschain/list（MISSION_APPLICATION 台账驱动待审队列）、review/*、mission/list·query、pass/issue·revoke·verify·list、crosschain/list（REVIEW_RESULT/FLIGHT_PASS/PASS_REVOKE） |
| `#/wb-security` | 链网安全运营中心（冻结参考） | topology/get（SVG）、node/*、session/*、message/*（stats+path_detail）、wormhole/toggle、risk/evaluate、path/switch、event/list、experiment/* |
| `#/wb-regulator` | 监管门户（冻结参考） | dashboard/summary、alert/*、trace/identity（三入口七级时间线）、authorize/*、inspect/ciphertext（封缄/开箱双态）、regulatory/audit/*、audit/*、crypto/* |
| `#/dashboard` | 演示总控台（参考） | 三幕总控一键实跑 + 复位守卫 + 悬浮窗 |
| `#/act1` `#/act2` `#/act3` | 三幕参考流程 | 幕一任务协同 / 幕二虫洞攻防 / 幕三监管核查（各含一键实跑监控台与理论失败步） |
| `#/explorer` | API 浏览器（工具） | 73 端点全量：分组检索、请求体实发、录制样例对照 |
| `#/pui-lab` | 组件自检页（开发工具，不进侧边栏） | PUI 组件画廊 + live 数据组件验证 |

旧工作台（wb-*）与旧五页（dashboard/act1-3/explorer）**冻结**：不改不删，供参考与回归对照；
新三端不复用其页面代码，只共享 api/store/pui 底座。

## 三套设计系统共存

- `css/app.css`：旧设计系统——**一字不动**，index.html SPA 专用（总览/旧工作台/参考页）。
- `css/product.css`：产品组件系统——`--p-*` 令牌 + `p-` 前缀组件类；三端与 index.html 共用
  （结构样式）；壳级覆盖（.topbar/.sidebar/.nav-*）只对 index.html 生效。
- `css/drone.css` + `css/theme-{op,au,rg}.css`：三端设计系统——`d-` 前缀命名空间 + `--d-*` 令牌；
  三份主题只覆盖令牌值（政务蓝白 / 深蓝权威浅色 / 深藏青暗色），不改结构；含少量兼容规则
  （#toast-box/.toast/.tip/.json-block——ui.js 生成的类名，三端不加载 app.css）。
- `js/pui.js`：产品组件库（badge/dataTable/form/resultPanel/actionBar/confirm/drawer/
  chipBar/tabs(?tab= 深链)/statCards/scoreBars/hbars/pathHops/cxTrail 四段存证/
  openCxDetail/topoSVG/csvExport/runOp 操作管线）；只复用旧 `js/ui.js` 的纯函数。
- `js/store.js`：DemoContext 跨页业务上下文（localStorage 便利层，13 类实体单槽最新）。
  **唯一事实源永远是后端**——store 丢失不影响任何功能。

## 一键实跑可视化（参考页保留能力）

「一键实跑」是**实跑监控台**而非进度条：每步实时展示 API 路径、code 徽章、延迟、
关键字段 chips，可展开完整请求/响应；理论失败步带「◈ 预期」徽章（3004/4001/4002/5002/
valid=false 等设计内拒绝命中预期记 ✓）；每步附成功/失败解说（`js/data/explain.js`
词典：26 错误码 + 73 端点）。三幕总控出发前自动检测残留并确认复位（真实链账本永不复位，P6-R6）。
排练用一键实跑，正式验收按 `docs/demo-script.md` 纯手动。新三端页面无「◈ 预期」徽章——
设计内拒绝以错误卡 + 解说词典呈现（Global Constraints #13）。

## 结构

    frontend/
    ├── operator.html         # 运营商端门户（产品入口，顶导航布局）
    ├── authority.html        # 管理当局端门户（产品入口，侧栏布局）
    ├── regulator.html        # 监管当局端门户（产品入口，侧栏暗色大屏）
    ├── index.html            # 内部总控导航页：三端入口卡片 + SPA（总览/冻结工作台/参考流程/工具）
    ├── vendor/leaflet/       # Leaflet 1.9.4（sha256 钉死，含 images/）
    ├── vendor/qrcode/        # qrcode-generator 2.0.4（仅运营商端二维码）
    ├── css/app.css           # 旧设计系统（index.html 专用，勿动）
    ├── css/product.css       # 产品组件系统（--p-* 令牌 + p- 组件，勿动）
    ├── css/drone.css         # 三端设计系统（d-* 命名空间 + --d-* 令牌）
    ├── css/theme-op.css      # 运营商端主题：政务蓝白（令牌覆盖）
    ├── css/theme-au.css      # 管理端主题：深蓝权威浅色（令牌覆盖）
    ├── css/theme-rg.css      # 监管端主题：深藏青暗色（令牌覆盖）
    └── js/
        ├── data/endpoints.js # 由 openapi.json 生成（scripts/gen-endpoints.sh，勿手改）
        ├── data/explain.js   # 成功/失败解说词典（26 错误码 + 73 端点，新旧共用）
        ├── data/geo.js       # 演示地理数据层：坐标红线纯函数 + zone 缓冲多边形
        ├── api.js            # 统一 POST 客户端：永不 throw（勿动）
        ├── ui.js             # 旧共享组件库（参考页 + 三端 toast/jsonBlock 复用；勿动）
        ├── pui.js            # 产品组件库
        ├── store.js          # DemoContext 跨页上下文（勿动）
        ├── map.js            # Leaflet 封装：天地图瓦片/退化兜底/矢量层/无人机标记
        ├── portal.js         # 三端共享壳：路由/心跳/chips/key 引导/二维码
        ├── shell-op.js shell-au.js shell-rg.js    # 每端薄壳（导航表 + boot）
        ├── pages/op/         # home realname aircraft flight license ops airspace（7 页）
        ├── pages/au/         # queue passes records registry masterdata netsec（6 页）
        ├── pages/rg/         # cockpit alerts trace authz inspect audit crypto（7 页）
        ├── pages/overview.js wb-operator.js wb-manager.js wb-security.js wb-regulator.js pui-lab.js   # 冻结
        ├── pages/dashboard.js act1.js act2.js act3.js explorer.js   # 旧页（勿动）
        └── app.js            # index.html SPA：hash 路由、主题、三链灯 15s 巡检、折叠组持久化（勿动）

## 约定

- 全部端点 **POST + JSON**，信封 `{code, message, data, trace_id, timestamp}`，`code=0` 成功；
  列表统一 `data.records[] + page/page_size/total`。
- 链身份色固定映射永不互换：ChainMaker=紫、Fabric=蓝、FISCO BCOS=青；
  状态色 good/warning/serious/critical 一律 **图标+文字**，不单靠颜色。
- 新页面组件类名一律 `p-` 前缀、三端壳层类名一律 `d-` 前缀；令牌一律 `--p-*`/`--d-*`；
  禁止修改 `:root` 旧令牌。
- 坐标红线：lat/lon 双零 = 未设 → 地图不画点不连线不猜（`js/data/geo.js` 唯一裁决）。
- `demo/reset` 有确认弹窗：只清业务表并复位模拟链，**真实链数据不受影响**（P6-R6）。
- 端点样例过期时重新生成：`./scripts/gen-endpoints.sh`。
