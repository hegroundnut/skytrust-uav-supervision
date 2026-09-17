# SkyTrust 演示前端（原生 HTML+CSS+JS）

零构建、零第三方依赖的单页应用，充分展示 skytrust-backend 全部 **64 个 API**
（契约来源 `docs/apifox/skytrust-backend.openapi.json`，三幕剧本对应
`docs/demo-showcase.md` 与实跑报告 `docs/demo-api-report.md`）。

## 运行

```bash
# 1. 后端已在 :8080（真实三链模式：./scripts/start-backend-real.sh）
# 2. 启动同源静态服务 + API 代理（后端未开 CORS，必须经此代理）
./scripts/serve-frontend.sh          # 默认 :8090；PORT=9000 BACKEND=http://host:8080 可覆盖
```

浏览器打开 `http://127.0.0.1:8090/`。

## 页面

| 路由 | 页面 | 覆盖端点组 |
|---|---|---|
| `#/dashboard` | 总览驾驶舱 | chain/status、dashboard/summary、crosschain/list·query、alert/list、demo/reset·init |
| `#/act1` | 幕一 · 任务跨域协同 | 主数据 5 类台账与注册、uav/*、mission/*、review/*、conflict/*、pass/*、crosschain/*（含一键实跑） |
| `#/act2` | 幕二 · 虫洞攻防 | node/*、topology/get（SVG 拓扑图）、session/*、message/*、wormhole/toggle、risk/evaluate、event/list、path/switch、experiment/*（含一键实跑） |
| `#/act3` | 幕三 · 监管密文核查 | alert/*、trace/identity（七级追踪时间线）、authorize/*、inspect/ciphertext（封缄卡/开箱卡）、regulatory/audit/*、audit/*、crypto/*（含一键实跑） |
| `#/explorer` | API 浏览器 | 64 端点全量：按 tag 分组检索、请求体可编辑实发、openapi 录制的成功/错误样例对照 |

## 结构

```
frontend/
├── index.html            # SPA 壳：顶栏（三链状态灯/后端延迟/主题切换）+ 侧边导航
├── css/app.css           # 设计令牌（明/暗双主题）+ 全部组件样式
└── js/
    ├── data/endpoints.js # 由 openapi.json 生成（scripts/gen-endpoints.sh，勿手改）
    ├── api.js            # 统一 POST 客户端：永不 throw，返回 {ok,code,data,latencyMs,raw,…}
    ├── ui.js             # 共享组件：状态徽章(图标+文字)、链色标签、JSON 高亮、条形图
    │                     #（hover 提示+表格视图兜底）、跨链四段流、表单工具、toast
    ├── pages/*.js        # 5 个页面模块，注册到 window.PAGES，hash 路由
    └── app.js            # 路由、主题（OS 偏好 > localStorage 显式选择）、三链灯 15s 巡检
```

## 约定

- 全部端点 **POST + JSON**，信封 `{code, message, data, trace_id, timestamp}`，`code=0` 成功；
  列表统一 `data.records[] + page/page_size/total`。
- 链实体色固定映射永不互换：Fabric=蓝、ChainMaker=橙、FISCO BCOS=青；
  状态色 good/warning/serious/critical 一律 **图标+文字**，不单靠颜色。
- `demo/reset` 有确认弹窗：只清 20 张业务表并重灌基线，**真实链数据不受影响**（P6-R6）。
- 端点样例过期时重新生成：`./scripts/gen-endpoints.sh`。
