# SkyTrust 前端（原生 HTML+CSS+JS，零构建）

零构建、零第三方依赖的单页应用，全量覆盖 skytrust-backend **64 个 API**
（契约来源 `docs/apifox/skytrust-backend.openapi.json`）。
主体界面为**四方角色工作台产品 UI**；三幕参考流程、演示总控台与 API 浏览器
原样保留，收纳于侧边栏「参考流程」「工具」折叠组。
验收故事脚本见 [`docs/demo-script.md`](../docs/demo-script.md)
（《紧急医疗运输：一次跨域飞行的全程可信监管》，UI 本身零场景痕迹）。

## 运行

    # 1. 后端已在 :8080（sim：go run ./cmd/server；真实三链：./scripts/start-backend-real.sh）
    # 2. 启动同源静态服务 + API 代理（后端未开 CORS，必须经此代理）
    ./scripts/serve-frontend.sh          # 默认 :8090；PORT=9000 BACKEND=http://host:8080 可覆盖

浏览器打开 `http://127.0.0.1:8090/`（默认落地平台总览）。

## 页面

| 路由 | 页面 | 覆盖端点组 |
|---|---|---|
| `#/overview` | 平台总览（首页） | chain/status、health/check、dashboard/summary、mission/pass/crosschain 台账计数、alert/list、crosschain/list、demo/init·reset |
| `#/wb-operator` | 运营商工作台 | manufacturer/*、operator/*、route/*、uav/*（注册/状态机/注销）、mission/*（创建/提交/冲突）、pass/query·list·verify、crosschain/* |
| `#/wb-manager` | 管理方审核台 | crosschain/list（MISSION_APPLICATION 台账驱动待审队列）、review/*、mission/list·query、pass/issue·revoke·verify·list、crosschain/list（REVIEW_RESULT/FLIGHT_PASS/PASS_REVOKE） |
| `#/wb-security` | 链网安全运营中心 | topology/get（SVG）、node/*、session/*、message/*（stats+path_detail）、wormhole/toggle、risk/evaluate、path/switch、event/list、experiment/* |
| `#/wb-regulator` | 监管门户 | dashboard/summary、alert/*、trace/identity（三入口七级时间线）、authorize/*、inspect/ciphertext（封缄/开箱双态）、regulatory/audit/*、audit/*、crypto/* |
| `#/dashboard` | 演示总控台（参考） | 三幕总控一键实跑 + 复位守卫 + 悬浮窗 |
| `#/act1` `#/act2` `#/act3` | 三幕参考流程 | 幕一任务协同 / 幕二虫洞攻防 / 幕三监管核查（各含一键实跑监控台与理论失败步） |
| `#/explorer` | API 浏览器（工具） | 64 端点全量：分组检索、请求体实发、录制样例对照 |
| `#/pui-lab` | 组件自检页（开发工具，不进侧边栏） | PUI 组件画廊 + live 数据组件验证 |

## 双设计系统共存（同壳渐进）

- `css/app.css`：旧设计系统——**一字不动**，参考页（dashboard/act1-3/explorer）专用。
- `css/product.css`：新设计系统——`--p-*` 令牌 + `p-` 前缀组件类；只覆盖壳级类
  （.topbar/.sidebar/.nav-*/.nav-fold），**不改 `:root` 旧令牌**。
- `js/pui.js`：新产品组件库（badge/dataTable/form/resultPanel/actionBar/confirm/drawer/
  chipBar/tabs(?tab= 深链)/statCards/scoreBars/hbars/pathHops/cxTrail 四段存证/
  openCxDetail/topoSVG/csvExport/runOp 操作管线）；只复用旧 `js/ui.js` 的纯函数。
- `js/store.js`：DemoContext 跨工作台业务上下文（localStorage 便利层，13 类实体单槽最新）。
  **唯一事实源永远是后端**——管理方待审队列仅凭跨链台账即可完整重建，store 丢失不影响任何功能。

## 一键实跑可视化（参考页保留能力）

「一键实跑」是**实跑监控台**而非进度条：每步实时展示 API 路径、code 徽章、延迟、
关键字段 chips，可展开完整请求/响应；理论失败步带「◈ 预期」徽章（3004/4001/4002/5002/
valid=false 等设计内拒绝命中预期记 ✓）；每步附成功/失败解说（`js/data/explain.js`
词典：22 错误码 + 64 端点）。三幕总控出发前自动检测残留并确认复位（真实链账本永不复位，P6-R6）。
排练用一键实跑，正式验收按 `docs/demo-script.md` 纯手动。

## 结构

    frontend/
    ├── index.html            # SPA 壳：顶栏（三链灯/延迟/主题）+ 侧边栏（工作台主导航 + 折叠组）
    ├── css/app.css           # 旧设计系统（参考页，勿动）
    ├── css/product.css       # 新设计系统（--p-* 令牌 + p- 组件 + 壳覆盖）
    └── js/
        ├── data/endpoints.js # 由 openapi.json 生成（scripts/gen-endpoints.sh，勿手改）
        ├── data/explain.js   # 成功/失败解说词典（新旧页面共用）
        ├── api.js            # 统一 POST 客户端：永不 throw（勿动）
        ├── ui.js             # 旧共享组件库（参考页专用，勿动；pui.js 复用其纯函数）
        ├── pui.js            # 新产品组件库
        ├── store.js          # DemoContext 跨工作台上下文
        ├── pages/overview.js wb-operator.js wb-manager.js wb-security.js wb-regulator.js pui-lab.js
        ├── pages/dashboard.js act1.js act2.js act3.js explorer.js   # 旧页（勿动）
        └── app.js            # hash 路由（#/name?tab=key）、主题、三链灯 15s 巡检、折叠组持久化

## 约定

- 全部端点 **POST + JSON**，信封 `{code, message, data, trace_id, timestamp}`，`code=0` 成功；
  列表统一 `data.records[] + page/page_size/total`。
- 链身份色固定映射永不互换：ChainMaker=紫、Fabric=蓝、FISCO BCOS=青；
  状态色 good/warning/serious/critical 一律 **图标+文字**，不单靠颜色。
- 新页面组件类名一律 `p-` 前缀、令牌一律 `--p-*`；禁止在新页面使用旧样式类、
  禁止修改 `:root` 旧令牌。
- `demo/reset` 有确认弹窗：只清业务表并复位模拟链，**真实链数据不受影响**（P6-R6）。
- 端点样例过期时重新生成：`./scripts/gen-endpoints.sh`。
