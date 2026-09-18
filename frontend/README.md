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

## 一键实跑可视化

「一键实跑」不是进度条，而是**实跑监控台**：

- **每幕监控台**（幕一/二/三页内，粘性面板）：剧本逐步推进，每步实时展示
  实际调用的 API 路径、`code` 徽章、延迟、返回关键字段摘要 chips，
  点「▸ 参数 / 返回 JSON」可展开该次调用的完整请求体与响应信封。
- **三幕总控**（驾驶舱「▶ 一键跑通三幕全流程」）：出发前确认后先 `demo/reset + demo/init`
  复位业务库（真实三链账本永不复位，P6-R6），保证任何时刻起跑都确定通过；
  右下角固定悬浮窗跨页存活，三幕各一行状态（⏳/✓/✕ + 耗时），下方尾流实时滚动最近 8 次调用；
  依次自动导航到每幕并触发其剧本，全部完成回到驾驶舱给出汇总；可随时取消。
- **理论失败步**（42 步剧本中共 7 步）：安全系统的一部分「通过」恰是**按设计拒绝**——
  重复消解必拒 3004、健康会话切路径必拒 4002、隔离残留重部署虫洞必拒 4001、
  未授权开箱必被 5002 封缄、基线流量不应误报（verdict=PASS）、吊销许可复验必 valid=false、
  篡改载荷验签必 valid=false。这类步骤带「◈ 预期」徽章，命中预期拒绝记 ✓ done（琥珀 ◈ 而非红 ✕），
  未命中才算失败；数据级拒绝（count/valid/verdict）用 `expectData` 严格校验返回。
- **成功/失败解说**：每次调用行下附一行解说（`js/data/explain.js` 词典：22 个错误码 + 64 个端点路径），
  成功说明「证明了什么机制」，失败说明「为何被拒/是否属设计内」；API 浏览器同样展示该词典。
- **重演自检**：幕二攻防拓扑是一次性消耗品（ISOLATED 处置仅 demo/reset 可复原）、
  幕一时隙是可复用演示资源、幕三依赖幕一种子任务 MISSION-2026-001——
  各幕剧本出发前检测残留/依赖，缺失时确认后自动复位或明确提示，不再默默红叉。
- 顶部三链状态灯的 15s `chain/status` 心跳不计入监控台调用行。

## 结构

```
frontend/
├── index.html            # SPA 壳：顶栏（三链状态灯/后端延迟/主题切换）+ 侧边导航
├── css/app.css           # 设计令牌（明/暗双主题）+ 全部组件样式
└── js/
    ├── data/endpoints.js # 由 openapi.json 生成（scripts/gen-endpoints.sh，勿手改）
    ├── data/explain.js   # 成功/失败解说词典：22 错误码 + 64 端点路径（监控台与浏览器共用）
    ├── api.js            # 统一 POST 客户端：永不 throw，返回 {ok,code,data,latencyMs,raw,…}
    ├── ui.js             # 共享组件：状态徽章(图标+文字)、链色标签、JSON 高亮、条形图
    │                     #（hover 提示+表格视图兜底）、跨链四段流、表单工具、toast、
    │                     # runMonitor 实跑监控台（订阅 API.onCall 逐调用渲染 + 解说行 +
    │                     # expectCode/expectData/expectFn 理论失败判定）
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
