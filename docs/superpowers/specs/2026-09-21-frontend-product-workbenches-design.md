# 前端产品化改造设计：四方角色工作台 + 全新视觉语言 + 验收故事脚本

日期：2026-09-21
状态：已与需求方逐节确认（信息架构 / 技术架构 / 故事脚本三节均批准）
范围：仅 `frontend/` 与 `docs/demo-script.md`；后端零改动。

## 1. 背景与目标

现有前端是「演示台」形态：三幕页面（act1/act2/act3）各配一键实跑监控台 + 手动按钮区。验收要求**一个真实场景的故事**，由操作者在真实产品界面里逐步亲手完成，而不是归纳到一起按一下。

目标：

1. 主体前端改造为**角色工作台产品 UI**——四方角色（运营商 / 管理方 / 链网安全运营 / 监管者）各一个工作台，拥有三幕参考流程的全部功能，按真实产品的信息架构组织。
2. 三幕参考页与 API 浏览器**原样保留**，收进左侧边栏「参考流程」「工具」两个默认收起的折叠组。
3. 全新视觉语言（通用 B 端平台风格），但采用**同壳渐进**策略：新页面新视觉，参考页保留旧视觉，互不干扰。
4. 验收故事写成外部脚本 `docs/demo-script.md`（紧急医疗运输，十章），UI 本身零场景痕迹。
5. **充分利用 API 能力**：对照 `docs/apifox/skytrust-backend.openapi.json`（64 端点）与后端 Query 结构体，把所有列表过滤、分页、统计、CSV 导出、详情字段做成一等公民 UI。

## 2. 决策记录（已确认）

| 决策点 | 结论 |
|---|---|
| 前端形态 | 角色工作台产品 UI（非故事驱动器，无内建剧本引导层） |
| 工作台粒度 | 四工作台，对应链上四方角色 |
| 故事融入 | 纯产品 UI + 外部 markdown 验收脚本；UI 零场景痕迹 |
| 导航结构 | 工作台主导航 + 平台总览保留为首页 + 参考流程/工具折叠组 |
| 验收故事 | 紧急医疗运输（覆盖三系统全闭环），写入 `docs/demo-script.md`（现为空占位） |
| 视觉范围 | 全新视觉语言；同壳渐进——新页新视觉，三幕/API 浏览器保留旧样 |
| 技术形态 | 零构建原生 HTML/CSS/JS 不变，与仓库现有模式一致 |

## 3. 信息架构与导航

### 3.1 壳与侧边栏

单 `index.html` + hash 路由不变。顶栏：品牌区 + 三链状态灯（15s 心跳）+ 后端延迟徽章 + 主题切换，功能不变、视觉重做。侧边栏自上而下：

```
平台总览                #/overview        ← 新首页（新建，默认落地页）
── 工作台 ──
运营商工作台             #/wb-operator
管理方审核台             #/wb-manager
链网安全运营中心          #/wb-security
监管门户                #/wb-regulator
▸ 参考流程（折叠，默认收起）
    演示总控台           #/dashboard       ← 旧 dashboard 原样保留（含三幕总控/重演自检）
    幕一 · 任务跨域协同   #/act1
    幕二 · 虫洞攻防      #/act2
    幕三 · 监管密文核查   #/act3
▸ 工具（折叠，默认收起）
    API 浏览器          #/explorer
```

### 3.2 页面去留

- 旧 dashboard **不删**，改名「演示总控台」收进参考流程组——三幕总控悬浮窗、复位守卫等已验证逻辑零改动。
- 新「平台总览」从头建：三链状态、核心指标卡（任务/告警/活跃会话/跨链笔数）、跨链流水摘要、演示维护区（`demo/init` 回显 created/skipped 计数；`demo/reset` 带二次确认，明示真实链上数据不受影响，回显 tables_cleared）。
- act1/act2/act3/explorer 四页与 `js/ui.js`、`js/api.js`、`js/data/*` 原样保留。

### 3.3 四工作台与 64 端点归宿

各工作台内部用页内 tab：

| 工作台 | Tab | 端点 |
|---|---|---|
| 运营商工作台 | 主数据 | manufacturer/register·list、operator/register·list、route/create·list |
| | 无人机管理 | uav/register·query·list·status·revoke |
| | 任务管理 | mission/create·submit·query·list、conflict/detect·resolve |
| | 许可与存证 | pass/query·list·verify（飞行前自查）、crosschain/send·query·list（本方任务四段 TxID 详情） |
| 管理方审核台 | 待审队列 | crosschain/list(message_type=MISSION_APPLICATION) 发现申请、review/submit、mission/query 详情 |
| | 审核记录 | review/query、crosschain/list(MISSION_REVIEW_RESULT) |
| | 许可管理 | pass/issue·revoke·list·verify·query、crosschain/list(FLIGHT_PASS/PASS_REVOKE) |
| 链网安全运营中心 | 网络拓扑 | topology/get（SVG 大图）、node/register·list |
| | 会话监控 | session/open·list·close |
| | 消息流量 | message/send·list（含 stats 图表、path_detail 逐跳时延） |
| | 攻防演练 | wormhole/toggle、risk/evaluate、event/list、path/switch |
| | 性能实验 | experiment/run·result·list·export |
| 监管门户 | 监管驾驶舱 | dashboard/summary |
| | 告警管理 | alert/raise·list·status |
| | 身份追踪 | trace/identity（7 级时间线，三入口） |
| | 授权中心 | authorize/apply·review |
| | 密文核验 | inspect/ciphertext（封缄/开箱双态） |
| | 监管审计 | regulatory/audit/list·export、audit/query·export |
| | 密码工具箱 | crypto/sm3、crypto/sm9/keygen·sign·verify |

全局端点：health/ping·check、chain/status 由顶栏与总览消费。合计 64 端点全覆盖。

### 3.4 API 能力用满（对照 apifox 契约的增强矩阵）

| API 能力 | 旧幕页现状 | 新工作台做法 |
|---|---|---|
| 13 个列表端点的服务端过滤 | 基本裸调 `{}` | 每列表配完整过滤条（字段按后端 Query 结构体穷举） |
| 分页（page/page_size/total） | 只显示第一页 | 统一 DataTable：页码 + 每页条数 + total |
| 3 个 CSV 导出（audit / regulatory/audit / experiment，返回 content+rows） | 未接 | 导出按钮 → Blob 下载，回显 rows |
| message/list 的 stats（success_rate/p50/p95/max） | 有显示 | 统计卡 + 时延分位条形图 |
| trace/identity 三入口（pseudo / device_address / alert_id） | 只做告警入口 | 入口类型选择器 |
| crosschain/list status+message_type 过滤 | 全量拉取 | 各工作台按角色预置过滤，可改 |
| inspect/ciphertext 双态全字段 | 部分 | sealed / decrypted_view + verification + conclusion（route_verdict/payload_verdict/raised_alerts）+ scope[4] + chain_tx_id + reg_audit_id 全展示 |
| risk/evaluate dimensions 5 维分 | 只显示总分 | 5 维分数条 + threshold 标线 + verdict + 联动 events |
| experiment/run 11 类 × count | 固定几个按钮 | 类型选择器 + count 输入 + failure_reasons + 导出 |
| message/send path_detail 逐跳时延 | 未展示 | 逐跳时延迷你可视化 |
| demo/init created/skipped、demo/reset tables_cleared | 未展示 | 总览维护区回显 |
| uav/status VERIFY 重试、pass/issue 同 pass_id 复用重试、pass/revoke crosschain_status 本地先行 | 部分 | 失败态提供重试按钮并注明语义 |

权威过滤矩阵（源自后端 Query 结构体，做进过滤条）：

- `uav/list`: operator_id / manufacturer_id / status；`mission/list`: operator_id / uav_id / status；`pass/list`: mission_id / uav_id / status
- `node/list`: node_type / status；`session/list`: mission_id / uav_id / status；`message/list`: session_id / msg_type / status
- `event/list`: session_id / action(DETECT|ISOLATE|RECOVER)；`alert/list`: event_type / status / risk_level / source_system / mission_id
- `regulatory/audit/list`: alert_id / authorization_id / action / operator_id；`audit/query`: business_id / action / actor；`crosschain/list`: status / message_type

枚举值来源：状态/类型枚举以后端 README 端点表与 `js/data/endpoints.js` 录制样例为准（如 uav status 流转 VERIFY/ACTIVATE/SUSPEND/RESUME、alert 6 类 event_type、experiment 11 类、msg_type 6 类、node_type 4 类、authorize scope ROUTE/PAYLOAD 等），过滤条用下拉选择而非自由文本。

### 3.5 新增共享组件（pui.js）

`PDataTable`（过滤条 + 分页 + 空态 + 手动刷新）、`PCsvExport`、`PDetailDrawer`（crosschain/query 四段 TxID、review/query 历史等侧滑详情）、`PStatCards`（stats / dashboard summary）、`PScoreBars`（risk 5 维）、`PTabs`、`PForm`（含枚举下拉/时间窗控件）、`PConfirm`（危险操作二次确认）、`PEmpty`、跨链存证组件（四段 TxID 流程图的新视觉版）。

## 4. 技术架构

### 4.1 文件结构

```
frontend/
├── index.html              # 壳改造：新侧边栏（折叠组）、新增 script/link
├── css/
│   ├── app.css             # 旧设计系统——一字不动（参考页继续用）
│   └── product.css         # 新设计系统：壳 + 5 个新页面
└── js/
    ├── api.js / ui.js / data/endpoints.js / data/explain.js   # 不动（explain.js 新页面复用）
    ├── pui.js              # 新产品组件库（§3.5）
    ├── store.js            # DemoContext 共享业务上下文（localStorage）
    ├── pages/overview.js
    ├── pages/wb-operator.js / wb-manager.js / wb-security.js / wb-regulator.js
    ├── pages/dashboard.js act1.js act2.js act3.js explorer.js  # 旧页原样保留
    └── app.js              # 路由表加新页；默认落地页 #/dashboard → #/overview；侧边栏折叠交互
```

### 4.2 CSS 隔离（两套视觉共存零冲突）

- 新组件类名一律 `p-` 前缀（`.p-card`、`.p-table`…）；新令牌一律 `--p-*` 命名空间；明暗双主题沿用 `data-theme` 机制。
- 只有壳级类（`.topbar` `.sidebar` `.nav-item` `.layout`）在 product.css 直接覆盖重绘。
- **不改 `:root` 旧令牌**——旧页面观感完全不变。

### 4.3 视觉语言方向

通用 B 端平台风：浅色为主的控制台——深靛蓝侧栏 + 浅灰工作区；高密度表格；状态色语义沿用链色（ChainMaker 紫 / Fabric 蓝 / FISCO 青）；等宽数字；卡片圆角 10px；克制阴影层级；暗色主题为对应深色映射。

### 4.4 跨工作台数据流（验收讲故事的关键机制）

- **唯一事实源是后端**。`store.js` 只是操作员便利层：变更操作成功后显式 `store.note()` 记录关键实体（uav_id / mission_id / application_id / pass_id / session_id / alert_id / authorization_id / conflict_id…），localStorage 持久化，同浏览器多标签共享。
- 各工作台顶部「当前业务对象」chip 条：点击 chip 预填相关表单——演示者从运营商台切到管理台时 application_id 已在手上。
- **管理台不依赖 store**：待审队列走 `crosschain/list {message_type: MISSION_APPLICATION, status: SUCCESS}` → `business_id` 即 application_id，再 `review/query` 判是否已审、`mission/query` 拉详情——跨浏览器、刷新、重启后依然成立。
- 刷新策略：tab 挂载即拉取；变更成功后自动刷新相关表格；每个 DataTable 带手动刷新；顶栏 15s 心跳不变。

### 4.5 错误处理

沿用 api.js 契约（永不 throw）。`code≠0` 统一渲染错误卡 + `explain.js` 词典解说（22 错误码 + 64 端点路径，新页面复用）；`code=-1`（后端不可达）给启动指引。产品页对拒绝类错误做中性展示（不带参考页「◈ 预期」徽章语义）。

### 4.6 验证方式

1. `node --check` 全部新旧 JS 语法门通过。
2. sim 模式起后端（`go run ./cmd/server`）+ `./scripts/serve-frontend.sh`，按 `docs/demo-script.md` 人工走通十章全流程。
3. 旧参考页回归点验：三幕一键实跑、演示总控台悬浮窗、API 浏览器均仍可用，旧视觉未变。
4. openapi 契约（`docs/apifox/*`）不变——本次不动后端，无需 APIFOX_GEN 再生成；`frontend/js/data/endpoints.js` 亦不变。

## 5. 验收故事脚本（docs/demo-script.md）

《紧急医疗运输：一次跨域飞行的全程可信监管》。每章 = 叙事台词要点 + 精确操作步骤（工作台/tab/按钮/表单值）+ 预期结果与证据观察点。所有输入值写死（如 `Operator-MED-001`、医疗走廊 `Zone-M` 航段、任务时窗），保证可复现、可排练。

| 章 | 工作台 | 剧情与关键操作 |
|---|---|---|
| 0 开场 | 平台总览 | 三链 ONLINE 展示；demo/reset+init 复位（台词：真实链账本不受影响） |
| 1 建档 | 运营商 | 医疗运营商/厂商注册、医疗走廊航段创建；无人机注册 → UAV_REGISTER_PROOF 跨链存证（四段 TxID）→ ACTIVATE |
| 2 申请 | 运营商 | 创建任务（描述含"特殊血样"→ SM9 加密，界面只见脱敏值）→ 提交跨链 MISSION_APPLICATION |
| 3 空域冲突 | 运营商 | 物流运营商 B 同走廊重叠时窗提交 → conflict/detect 命中 → 协调消解；再消解被拒 3004（设计内拒绝） |
| 4 审核与许可 | 管理方 | 待审队列发现申请 → 详情只见脱敏值（隐私台词）→ APPROVED 跨链回传 → 签发许可 → 验证有效 |
| 5 起飞 | 安全运营中心 | 拓扑总览 → SM9 挑战认证开会话 → 基线消息流（逐跳时延、统计卡） |
| 6 虫洞攻防 | 安全运营中心 | 开虫洞 → 消息被诱入隧道时延骤降 → 5 维评分 DETECT → 隔离 X/Y、会话降级 → 路径重算恢复 → 重开虫洞被拒 4001 → 事件复盘 |
| 7 告警与追踪 | 监管门户 | WORMHOLE_ALERT 告警登记 → 7 级跨链身份追踪（告警号/伪名双入口）→ 告警状态机推进 |
| 8 授权与开箱 | 监管门户 | 授权申请（scope=MISSION+ROUTE+PAYLOAD+IDENTITY+有效窗）→ 审批上链 ChainMaker → 密文核验：先无授权看封缄（5002），授权后开箱（明文视图+双验证+一致性结论上链）；密码工具箱篡改检测演示 |
| 9 收尾 | 监管门户+总览 | 吊销许可 → 复验 valid=false；监管审计 CSV 导出、全域审计、驾驶舱汇总、跨链流水全量盘点（N 笔 SUCCESS） |

附录三件：验收前检查清单（三链/后端/复位）；设计内拒绝汇总表（3004/4001/5002/valid=false/篡改验签失败，每条附「为什么拒绝恰恰证明系统在保护你」台词）；预计时长（约 25-30 分钟含讲解）。

旧三幕「一键实跑」保留为排练/回归工具；正式验收走本脚本纯手动。

## 6. 范围外（明确不做）

- 后端任何改动（含新增端点）；openapi 契约与 endpoints.js 再生成。
- 三幕参考页、API 浏览器、演示总控台的视觉翻新或逻辑改动。
- 构建系统/框架引入（保持零构建原生 JS）。
- UI 内建剧本引导层（故事只在外部脚本里）。
- 真实用户认证/权限（角色工作台是叙事视角划分，不是登录态）。
