# 前端产品化改造（四方角色工作台）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把演示台形态的前端改造为四方角色工作台产品 UI（运营商/管理方/安全运营/监管门户），三幕参考流程收进侧边栏折叠组，验收故事写成外部脚本 `docs/demo-script.md`。

**Architecture:** 零构建原生 JS 单页应用不变。新增 product.css（`--p-*` 令牌 + `p-` 前缀组件类）与旧 app.css 同壳共存；新增 pui.js 产品组件库（DataTable/Form/Drawer/CxTrail 等）与 store.js 跨工作台业务上下文；5 个新页面模块注册进现有 `window.PAGES` hash 路由。后端零改动，64 端点契约以 `docs/apifox/skytrust-backend.openapi.json` 与后端 Query 结构体为准。

**Tech Stack:** 原生 HTML/CSS/JS（零第三方依赖）、Python3 同源代理（scripts/serve-frontend.sh）、Go 后端 sim 模式验证。

**设计规格:** `docs/superpowers/specs/2026-09-21-frontend-product-workbenches-design.md`（本计划的权威上游，冲突时以规格为准）。

## Global Constraints

- 零构建：不引入任何框架、构建工具、npm 依赖；全部原生 JS（IIFE + `'use strict'`）。
- **一字不动的文件**：`frontend/css/app.css`、`frontend/js/api.js`、`frontend/js/ui.js`、`frontend/js/data/endpoints.js`、`frontend/js/data/explain.js`、`frontend/js/pages/dashboard.js`、`act1.js`、`act2.js`、`act3.js`、`explorer.js`。（`index.html` 与 `app.js` 按计划修改。）
- 新组件类名一律 `p-` 前缀；新 CSS 令牌一律 `--p-*`；**不改 `:root` 旧令牌值**（旧页面观感必须完全不变）。
- API 铁律：全部 POST+JSON；HTTP 恒 200，业务成败看 `code`（0=成功）；统一走 `API.call`（永不 throw）。
- `code≠0` 一律渲染 `PUI.errCard(r)`（含 `EXPLAIN.codes[r.code]` 解说）；`code=-1` 文案提示启动后端与代理。
- UI 零场景痕迹：验收故事文案只出现在 `docs/demo-script.md`，界面里不得出现「血样/医疗/故事」等剧情词。
- 界面文案简体中文；ID/哈希/ TxID 一律等宽（`p-mono`）。
- 每个变更类操作成功后调用 `STORE.note(kind, id, extra)` 记录业务实体。
- 枚举唯一真源（下拉一律用这些值，禁止自由发挥）：
  - 链键：`fabric` / `chainmaker` / `fisco-bcos`
  - crosschain message_type（5）：`UAV_REGISTER_PROOF` `MISSION_APPLICATION` `MISSION_REVIEW_RESULT` `FLIGHT_PASS` `PASS_REVOKE`；status 过滤：`SUCCESS` `FAILED`
  - uav status：`REGISTERED` `VERIFIED` `ACTIVE` `SUSPENDED` `REVOKED`；uav/status action：`VERIFY` `ACTIVATE` `SUSPEND` `RESUME`
  - mission status：`DRAFT` `SUBMITTED` `REVIEWING` `COORDINATING` `APPROVED` `REJECTED` `EXECUTING` `COMPLETED` `ABORTED`
  - pass status：`GENERATING` `VALID` `USED` `EXPIRED` `REVOKED`
  - session status：`ACTIVE` `DEGRADED` `RECOVERED` `CLOSED`；node_type：`UAV` `EDGE` `MANAGEMENT` `ATTACKER`；node status：`ONLINE` `OFFLINE` `ISOLATED`
  - msg_type（6）：`HEARTBEAT` `POSITION_UPDATE` `PASS_VERIFY` `NODE_CHALLENGE` `ROUTE_STATUS` `EVENT_REPORT`；message status：`SUCCESS` `FAILED`；event action：`DETECT` `ISOLATE` `RECOVER`
  - alert event_type（6）：`ROUTE_DEVIATION` `INVALID_PASS` `UNKNOWN_NODE_ACCESS` `MISSION_MISMATCH` `WORMHOLE_ALERT` `IDENTITY_ANOMALY`；risk_level：`LOW` `MEDIUM` `HIGH`；source_system：`SYSTEM1` `SYSTEM2` `SYSTEM3` `MANUAL`；alert status 线性：`OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED`
  - authorize scope（5，多选）：`MISSION` `ROUTE` `PAYLOAD` `IDENTITY` `EVIDENCE`；target_type：`MISSION` `UAV` `ALERT`；decision：`APPROVE` `DENY`；authorization status：`PENDING` `AUTHORIZED` `DENIED` `EXPIRED`
  - experiment_type（11）：`CROSSCHAIN_LOOP` `SM3_INTEGRITY` `SM9_VERIFY` `CONFLICT_DETECT` `MESSAGE_FLOW` `RISK_SCAN` `STRESS` `TRACE_BATCH` `INSPECT_UNAUTHORIZED` `INSPECT_AUTHORIZED` `ALERT_BATCH`；仅 `MESSAGE_FLOW` 接受 scenario：`NORMAL` `ATTACK` `DEFENSE`（双向严格：其余类型 scenario 必须为空）；count 1..1000 必填；concurrency 1..20 可选
  - review result：`APPROVED` `REJECTED` `NEED_COORDINATION`；conflict status：`OPEN` `RESOLVED`；corridor_status：`OPEN` `RESTRICTED` `CLOSED`
  - risk verdict：`PASS` `DETECT` `BLOCK`；crosschain verify_result：`PASS` `FAIL_SM3` `FAIL_SM9`
- 后端演示种子（`demo/init`，脚本与验证会用到）：厂商 `Manufacturer-A/B/C`；运营商 `Operator-A/B/C`；无人机 `UAV-A-001/002`、`UAV-B-001/002`、`UAV-C-001/002/003`（均 VERIFIED）；航段 `R101 R205`（Zone-A）、`R208 R209 R306`（Zone-B，均 OPEN）；链下 8 节点 `UAV-A-001-NODE→N1→N2→N3→N4→MGR` + 攻击节点 `NODE-X/Y`（OFFLINE）。
- 提交信息：中文 conventional commits（`feat(frontend): …`），结尾 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- 每任务的语法门：`cd /root/codes/skytrust-uav-supervision && for f in $(git diff --name-only HEAD~1 -- 'frontend/js/*.js' 'frontend/js/**/*.js'); do node --check "$f"; done`（或对该任务新建/修改的每个 JS 逐一 `node --check`）。
- 浏览器验证统一入口：后端 `cd services/skytrust-backend && PATH=/usr/local/go/bin:$PATH go run ./cmd/server`（sim 模式 :8080）+ `./scripts/serve-frontend.sh`（:8090）。

## File Structure

```
frontend/
├── index.html                  # 修改：侧边栏折叠组结构、title、新 CSS/JS 引入
├── css/
│   ├── app.css                 # 不动（旧设计系统，参考页专用）
│   └── product.css             # 新建：--p-* 令牌 + 壳覆盖 + p- 组件样式（Task 1/3/4 分段追加）
└── js/
    ├── api.js / ui.js / data/* # 不动
    ├── store.js                # 新建：DemoContext（Task 2）
    ├── pui.js                  # 新建：产品组件库（Task 3 基础 + Task 4 数据组件）
    ├── pages/
    │   ├── pui-lab.js          # 新建：组件自检页 #/pui-lab（Task 3/4，不进侧边栏）
    │   ├── overview.js         # 新建：平台总览 #/overview（Task 5）
    │   ├── wb-operator.js      # 新建：运营商工作台 #/wb-operator（Task 6）
    │   ├── wb-manager.js       # 新建：管理方审核台 #/wb-manager（Task 7）
    │   ├── wb-security.js      # 新建：链网安全运营中心 #/wb-security（Task 8）
    │   ├── wb-regulator.js     # 新建：监管门户 #/wb-regulator（Task 9）
    │   └── dashboard.js act1-3.js explorer.js   # 不动
    └── app.js                  # 修改：路由 ?tab= 解析、默认落地 #/overview、折叠组持久化（Task 1）
docs/demo-script.md             # 重写：验收故事脚本（Task 10，现为空占位）
frontend/README.md              # 修改：结构与页面表更新（Task 11）
README.md                       # 修改：前端段落更新（Task 11）
```

任务依赖：Task 1 → Task 2 → Task 3 → Task 4 → {Task 5, 6, 7, 8, 9 可并行} → Task 10 → Task 11。

---

### Task 1: product.css 设计系统基座 + 壳改造（index.html / app.js）

**Files:**
- Create: `frontend/css/product.css`
- Modify: `frontend/index.html`（`<title>`、sidebar 结构、新增 `<link>`）
- Modify: `frontend/js/app.js`（route 函数、折叠组持久化）

**Interfaces:**
- Consumes: 无（首个任务）。
- Produces: `--p-*` 令牌全集与壳级样式（后续所有任务的组件样式都追加在本文件）；路由支持 `#/name?tab=key`（PUI.tabs 依赖）；`PAGES[name]` 查找顺序变为 `PAGES[name] || PAGES.overview || PAGES.dashboard`。

- [ ] **Step 1: 写 product.css 第一段（令牌 + 壳）**

完整内容（这是令牌唯一真源，后续任务只追加组件段，不改令牌值）：

```css
/* product.css —— 新产品设计系统（p- 前缀组件 + --p-* 令牌）。
   与 app.css 同壳共存：只覆盖壳级类（.topbar/.sidebar/.nav-*/.layout/.page），
   绝不改 :root 旧令牌——旧页面（三幕/浏览器/总控台）观感保持完全不变。 */

:root {
  /* 表面与线条 */
  --p-bg: #f4f5f9;          --p-panel: #ffffff;        --p-panel-2: #fafbfd;
  --p-line: #e3e6ef;        --p-line-strong: #c9cfe0;
  /* 文字 */
  --p-ink: #1c2333;         --p-ink-2: #4a5468;        --p-ink-3: #8a93a8;
  /* 品牌（靛蓝） */
  --p-brand: #4338ca;       --p-brand-ink: #ffffff;    --p-brand-soft: #eef0ff;
  /* 语义色（成对：前景/浅底） */
  --p-good: #15803d;        --p-good-soft: #ecfdf3;
  --p-warning: #b45309;     --p-warning-soft: #fffbeb;
  --p-critical: #b91c1c;    --p-critical-soft: #fef2f2;
  --p-serious: #c2410c;     --p-serious-soft: #fff7ed;
  --p-info: #1d4ed8;        --p-info-soft: #eff6ff;
  /* 三链身份色（语义与旧系统一致：chainmaker 紫 / fabric 蓝 / fisco 青） */
  --p-chain-chainmaker: #7c3aed;
  --p-chain-fabric: #2563eb;
  --p-chain-fisco: #0891b2;
  /* 侧边栏（深靛） */
  --p-side-bg: #1e1b4b;     --p-side-ink: #c7d2fe;     --p-side-active: #312e81;
  --p-side-line: #312e81;
  /* 形状与层级 */
  --p-radius: 10px;         --p-radius-sm: 6px;
  --p-shadow-1: 0 1px 2px rgba(16,24,40,.06);
  --p-shadow-2: 0 8px 24px rgba(16,24,40,.14);
  /* 排版（B 端密度：13px 基准） */
  --p-font: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --p-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --p-row-h: 34px;
}
[data-theme="dark"] {
  --p-bg: #0f1117;          --p-panel: #171a23;        --p-panel-2: #1d212c;
  --p-line: #2a2f3d;        --p-line-strong: #3a4152;
  --p-ink: #e6e9f2;         --p-ink-2: #aab2c5;        --p-ink-3: #6f7891;
  --p-brand: #818cf8;       --p-brand-ink: #14122e;    --p-brand-soft: #232647;
  --p-good: #4ade80;        --p-good-soft: #12261c;
  --p-warning: #fbbf24;     --p-warning-soft: #26200f;
  --p-critical: #f87171;    --p-critical-soft: #2a1416;
  --p-serious: #fb923c;     --p-serious-soft: #291a10;
  --p-info: #60a5fa;        --p-info-soft: #122036;
  --p-side-bg: #14122e;     --p-side-ink: #a5b4fc;     --p-side-active: #272458;
  --p-shadow-1: 0 1px 2px rgba(0,0,0,.4);
  --p-shadow-2: 0 8px 24px rgba(0,0,0,.55);
}

/* ---------- 壳覆盖（仅这几个旧类名允许直接重绘） ---------- */
body { background: var(--p-bg); }
.topbar {
  background: var(--p-panel); border-bottom: 1px solid var(--p-line);
  box-shadow: var(--p-shadow-1);
}
.sidebar {
  background: var(--p-side-bg); border-right: none;
  font-family: var(--p-font);
}
.sidebar .nav-group { color: #8b8fd4; }
.sidebar .nav-item { color: var(--p-side-ink); border-radius: var(--p-radius-sm); }
.sidebar .nav-item:hover { background: rgba(255,255,255,.06); color: #fff; }
.sidebar .nav-item.active {
  background: var(--p-side-active); color: #fff;
  box-shadow: inset 3px 0 0 var(--p-brand);
}
.sidebar .nav-foot { color: #6d71b8; border-top: 1px solid var(--p-side-line); }
/* 折叠组（原生 details，零 JS 也能开合；开合状态由 app.js 持久化） */
.nav-fold { margin: 4px 0; }
.nav-fold > summary {
  cursor: pointer; list-style: none; user-select: none;
  padding: 8px 14px; font-size: 12px; letter-spacing: .05em;
  color: #8b8fd4; display: flex; align-items: center; gap: 6px;
}
.nav-fold > summary::-webkit-details-marker { display: none; }
.nav-fold > summary::before { content: "▸"; transition: transform .15s; }
.nav-fold[open] > summary::before { transform: rotate(90deg); }
.nav-fold .nav-item { padding-left: 30px; font-size: 12.5px; }
/* 工作区：新页面用 p-page 容器；旧页面结构不变 */
.page { font-family: var(--p-font); }
```

- [ ] **Step 2: 改 index.html**

`<title>` 改为 `云巡信链 SkyTrust · 无人机跨域协同与可信监管平台`。
`<link rel="stylesheet" href="css/app.css">` 之后新增一行：
`<link rel="stylesheet" href="css/product.css">`。
sidebar 整块（`<nav class="sidebar" id="sidebar">…</nav>`）替换为：

```html
<nav class="sidebar" id="sidebar">
  <a class="nav-item" href="#/overview" data-page="overview"><span class="nav-ico">▦</span>平台总览</a>
  <div class="nav-group">四方角色工作台</div>
  <a class="nav-item" href="#/wb-operator" data-page="wb-operator"><span class="nav-ico">✈</span>运营商工作台</a>
  <a class="nav-item" href="#/wb-manager" data-page="wb-manager"><span class="nav-ico">✓</span>管理方审核台</a>
  <a class="nav-item" href="#/wb-security" data-page="wb-security"><span class="nav-ico">⬢</span>链网安全运营中心</a>
  <a class="nav-item" href="#/wb-regulator" data-page="wb-regulator"><span class="nav-ico">§</span>监管门户</a>
  <details class="nav-fold" data-fold="ref">
    <summary>参考流程 · 三幕演示</summary>
    <a class="nav-item" href="#/dashboard" data-page="dashboard"><span class="nav-ico">▶</span>演示总控台</a>
    <a class="nav-item" href="#/act1" data-page="act1"><span class="nav-ico">①</span>幕一 · 任务跨域协同</a>
    <a class="nav-item" href="#/act2" data-page="act2"><span class="nav-ico">②</span>幕二 · 虫洞攻防</a>
    <a class="nav-item" href="#/act3" data-page="act3"><span class="nav-ico">③</span>幕三 · 监管密文核查</a>
  </details>
  <details class="nav-fold" data-fold="tools">
    <summary>工具</summary>
    <a class="nav-item" href="#/explorer" data-page="explorer"><span class="nav-ico">⇄</span>API 浏览器（64 端点）</a>
  </details>
  <div class="nav-foot">
    <div>契约：docs/apifox</div>
    <div>验收脚本：docs/demo-script.md</div>
  </div>
</nav>
```

- [ ] **Step 3: 改 app.js 路由与折叠组**

`route()` 函数整体替换为（其余代码不动）：

```js
  /* ---------- hash 路由（支持 #/name?tab=key；新页面消费 query，旧页面忽略第二参） ---------- */
  function route() {
    const raw = (location.hash || '#/overview').replace(/^#\//, '');
    const qi = raw.indexOf('?');
    const name = (qi >= 0 ? raw.slice(0, qi) : raw) || 'overview';
    const query = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '');
    const page = PAGES[name] || PAGES.overview || PAGES.dashboard;
    document.querySelectorAll('.nav-item').forEach(a =>
      a.classList.toggle('active', a.dataset.page === name));
    expandFoldFor(name);
    const root = document.getElementById('page');
    root.innerHTML = '';
    hideTipSafe();
    try {
      page.render(root, { query: query, name: name });
    } catch (e) {
      root.append(h('div', { class: 'card' }, '页面渲染失败：' + e.message));
      console.error(e);
    }
    window.scrollTo(0, 0);
  }
  /* 折叠组：当前页在组内则自动展开；开合状态 localStorage 持久化 */
  const FOLDS = { ref: ['dashboard', 'act1', 'act2', 'act3'], tools: ['explorer'] };
  function expandFoldFor(name) {
    document.querySelectorAll('.nav-fold').forEach(d => {
      const key = d.dataset.fold;
      if (FOLDS[key] && FOLDS[key].includes(name)) d.open = true;
      else if (localStorage.getItem('skytrust-fold-' + key) === '1') d.open = true;
    });
  }
  document.querySelectorAll('.nav-fold').forEach(d => {
    d.addEventListener('toggle', () =>
      localStorage.setItem('skytrust-fold-' + d.dataset.fold, d.open ? '1' : '0'));
  });
```

注意：`FOLDS`/`expandFoldFor` 定义须在 `route()` 首次调用之前（IIFE 内函数声明有提升，`document.querySelectorAll('.nav-fold')` 绑定语句放在 `route()` 调用语句之前即可）。

- [ ] **Step 4: 语法门 + 浏览器验证**

Run: `node --check frontend/js/app.js` → 无输出（通过）。
启动后端 sim + `./scripts/serve-frontend.sh`，打开 `http://127.0.0.1:8090/`，逐项核对：
1. 默认落地：地址栏 `#/overview`，内容显示旧 dashboard（overview 未注册，回退——预期行为）。
2. 新壳视觉：侧边栏深靛蓝、顶栏白底细边框；「参考流程」「工具」两组默认收起，点击可展开，刷新后开合状态保持。
3. 旧页回归：进入 `#/act1`——页面内部卡片/徽章/按钮仍是旧样式（app.css 令牌未被改动）；「参考流程」组自动展开且幕一高亮。
4. `#/act1?tab=x` 不报错（旧 render 忽略第二参）。
5. 主题切换按钮：明暗两态下新壳正常、旧页正常。
6. 三链状态灯与后端延迟徽章照常工作（app.js 轮询未动）。

- [ ] **Step 5: Commit**

```bash
git add frontend/css/product.css frontend/index.html frontend/js/app.js
git commit -m "feat(frontend): 新设计系统基座+壳改造——侧边栏折叠组收纳三幕参考流程

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: store.js —— DemoContext 跨工作台业务上下文

**Files:**
- Create: `frontend/js/store.js`
- Modify: `frontend/index.html`（script 引入）

**Interfaces:**
- Consumes: 无（纯浏览器 API）。
- Produces: `window.STORE = { note(kind,id,extra?), get(kind)→entry|null, all()→entry[], clear(), onChange(fn)→unsub, KINDS, KIND_LABEL }`，entry 形如 `{kind,id,extra,at}`；localStorage 键 `skytrust-ctx-v1`；每 kind 单槽最新覆盖；跨标签页经 `storage` 事件同步。**Task 3 的 chipBar 与 Task 5-9 全部页面依赖此签名。**

- [ ] **Step 1: 写 store.js（完整代码）**

```js
/* store.js —— DemoContext：跨工作台共享业务对象上下文（localStorage 便利层）。
   唯一事实源永远是后端：store 丢失/清空不影响任何工作台功能（管理方待审队列
   有独立的跨链台账发现机制）。每 kind 单槽（最新覆盖），多标签页经 storage 事件同步。 */
(function () {
  'use strict';
  const KEY = 'skytrust-ctx-v1';
  const KINDS = ['OPERATOR', 'MANUFACTURER', 'ROUTE', 'UAV', 'MISSION', 'APPLICATION',
    'PASS', 'CONFLICT', 'SESSION', 'NODE', 'ALERT', 'AUTHORIZATION', 'CROSS_TX'];
  const KIND_LABEL = {
    OPERATOR: '运营商', MANUFACTURER: '厂商', ROUTE: '航段', UAV: '无人机',
    MISSION: '任务', APPLICATION: '申请', PASS: '许可', CONFLICT: '冲突',
    SESSION: '会话', NODE: '节点', ALERT: '告警', AUTHORIZATION: '授权', CROSS_TX: '跨链单',
  };
  let mem = load();
  const subs = [];
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (_) {}
  }
  function emit() {
    const list = all();
    subs.slice().forEach(fn => { try { fn(list); } catch (_) {} });
  }
  function note(kind, id, extra) {
    if (KINDS.indexOf(kind) < 0 || !id) return;
    mem[kind] = { kind: kind, id: String(id), extra: extra || null, at: Date.now() };
    persist(); emit();
  }
  function get(kind) { return mem[kind] || null; }
  function all() {
    return Object.keys(mem).map(k => mem[k]).sort((a, b) => b.at - a.at);
  }
  function clear() { mem = {}; persist(); emit(); }
  function onChange(fn) {
    subs.push(fn);
    return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
  }
  window.addEventListener('storage', e => {
    if (e.key === KEY) { mem = load(); emit(); }
  });
  window.STORE = { note, get, all, clear, onChange, KINDS, KIND_LABEL };
})();
```

- [ ] **Step 2: index.html 引入**

在 `<script src="js/api.js"></script>` 之后新增一行：
`<script src="js/store.js"></script>`

- [ ] **Step 3: 语法门 + 浏览器控制台冒烟**

Run: `node --check frontend/js/store.js` → 通过。
浏览器 `#/act1` 页控制台执行（逐行核对期望值）：

```js
STORE.note('MISSION', 'MISSION-X-1', { uav_id: 'UAV-A-001' });
STORE.note('UAV', 'UAV-A-001');
STORE.all().length;                       // 期望 2（MISSION 在前，at 更新）
STORE.get('MISSION').extra.uav_id;        // 期望 'UAV-A-001'
STORE.note('MISSION', 'MISSION-X-2');
STORE.get('MISSION').id;                  // 期望 'MISSION-X-2'（同 kind 覆盖）
JSON.parse(localStorage.getItem('skytrust-ctx-v1')).UAV.id;  // 期望 'UAV-A-001'
let fired = 0; const un = STORE.onChange(() => fired++);
STORE.note('PASS', 'P-1'); fired;         // 期望 1
un(); STORE.note('PASS', 'P-2'); fired;   // 期望仍为 1（已退订）
STORE.clear(); STORE.all().length;        // 期望 0
```

另开第二个标签页验证跨页同步：A 页 `STORE.note('NODE','N-TEST')`，B 页预先挂 `STORE.onChange(l=>console.log(l.length))` 应打印 1。

- [ ] **Step 4: Commit**

```bash
git add frontend/js/store.js frontend/index.html
git commit -m "feat(frontend): DemoContext 跨工作台业务上下文（localStorage 便利层）

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: pui.js 基础组件 + #/pui-lab 组件自检页

**Files:**
- Create: `frontend/js/pui.js`（本任务写基础段；Task 4 在同一文件追加数据段）
- Create: `frontend/js/pages/pui-lab.js`
- Modify: `frontend/css/product.css`（追加组件样式段）
- Modify: `frontend/index.html`（script 引入 ×2）

**Interfaces:**
- Consumes: `UI.h/jsonBlock/toast/showTip/hideTip/datetimeLocal/tsSuffix`（旧 ui.js 纯函数，允许复用）、`window.EXPLAIN`、`window.STORE`（Task 2）、`API.call`。
- Produces（**Task 4-9 依赖的全部签名，逐字实现**）:

```js
window.PUI = {
  h,                          // = UI.h 转发
  badge(status),              // 状态徽章：语义色+图标，映射表同旧 STATUS_MAP（p-badge 类）
  chainTag(chain),            // 链身份标签（p-chain-tag，data-chain=chainmaker|fabric|fisco）
  kv(pairs),                  // 键值对列表 pairs: [[k, v|Node]]
  empty(text),                // 空态
  metaLine(r),                // code 徽章 + ⏱latencyMs + trace_id + timestamp
  errCard(r),                 // code≠0 错误卡：code+message+EXPLAIN.codes[code]（无词典则只显示 message）
  resultPanel(),              // → {root, show(r, renderFn?)} 统一结果渲染：metaLine → 错误卡或自定义视图 → 折叠原始 JSON
  actionBar(btns),            // btns: [{label, kind:'primary'|'danger'|'ghost', title?, confirm?:{title,msg,ok?}, run:()=>Promise}]
  confirm(title, msg, okLabel?), // → Promise<boolean>，模态，ESC/点遮罩=取消
  drawer(title, ...body),     // 右侧滑出详情 → {root, close()}，ESC/点遮罩关闭
  chipBar(opts?),             // 「当前业务对象」chips（STORE.all()）；点 chip=复制 id+toast；opts.onPick(entry) 回调；✕ 清空
  pageHead({title, sub, actions}), // 页头：h1+副标题+右侧操作区(Node[])
  tabs(items),                // items:[{key,label,render(box)}]；active 同步 #/xxx?tab=key；每次切入重新 render（拉新数据）
  tabParam(), setTabParam(key),
  runOp(o),                   // 变更类操作统一管线（Task 5-9 所有写操作按钮都经此）：
                              // o = {path, body():object|Promise<object|null>(null=放弃), rp(resultPanel 实例),
                              //      successText?, render?(data)→Node, note?:{kind, id:string|(data)→string, extra?:(data)→object},
                              //      onOk?(data)}
                              // → 返回可直接放进 actionBar 的 run 函数：API.call → rp.show(r, 组合 successText+render)
                              //   → r.ok 时 STORE.note + onOk
};
```

- [ ] **Step 1: 写 pui.js 基础段（完整代码）**

```js
/* pui.js —— 新产品组件库：p- 前缀类 + --p-* 令牌（样式在 css/product.css）。
   只复用旧 ui.js 的纯函数（h/jsonBlock/toast/showTip/hideTip/datetimeLocal/tsSuffix）
   与 EXPLAIN 词典；不复用旧组件的 DOM/类名——两套视觉互不渗透。 */
(function () {
  'use strict';
  const h = UI.h;

  /* ---------- 状态徽章（映射表与旧系统语义一致，视觉为新令牌） ---------- */
  const STATUS_MAP = {
    ONLINE: ['good', '●'], VERIFIED: ['good', '●'], SUCCESS: ['good', '✓'], VALID: ['good', '✓'],
    ACTIVE: ['good', '●'], APPROVED: ['good', '✓'], RESOLVED: ['good', '✓'], AUTHORIZED: ['good', '✓'],
    RECOVERED: ['good', '✓'], DONE: ['good', '✓'], PASS: ['good', '✓'],
    ROUTE_OK: ['good', '✓'], PAYLOAD_OK: ['good', '✓'], QUALIFIED: ['good', '✓'], RELAYED: ['good', '⇄'],
    PENDING: ['warning', '◔'], DRAFT: ['warning', '◔'], DEGRADED: ['warning', '⚠'],
    SENT: ['warning', '◔'], SUBMITTED: ['warning', '◔'], REVIEWING: ['warning', '◔'],
    COORDINATING: ['warning', '◔'], SUSPENDED: ['warning', '◸'], NEED_COORDINATION: ['warning', '⚠'],
    SEALED: ['critical', '🔒'], OFFLINE: ['critical', '○'], ISOLATED: ['critical', '⛔'],
    REVOKED: ['critical', '✕'], FAILED: ['critical', '✕'], REJECTED: ['critical', '✕'],
    DENIED: ['critical', '✕'], DETECT: ['critical', '⚠'], BLOCK: ['critical', '⛔'],
    ROUTE_DEVIATION: ['critical', '⚠'], EXPIRED: ['critical', '◷'], ABORTED: ['critical', '✕'],
    REGISTERED: ['info', '◌'], GENERATING: ['info', '◌'], USED: ['info', '✔'],
    MISSION_MISMATCH: ['serious', '⚠'], COMPLETED: ['info', '▣'], ARCHIVED: ['warning', '▣'],
    OPEN: ['serious', '◉'], IDENTIFIED: ['serious', '◉'], TRACED: ['serious', '◉'],
    REVIEWED: ['serious', '◉'], HIGH: ['critical', '▲'], MEDIUM: ['warning', '▲'], LOW: ['good', '▲'],
    BROKEN: ['critical', '✕'],
  };
  function badge(status) {
    const s = String(status ?? '—');
    const m = STATUS_MAP[s] || ['', '·'];
    return h('span', { class: 'p-badge p-tone-' + (m[0] || 'neutral'), title: s }, m[1] + ' ' + s);
  }
  const CHAIN_NAME = { chainmaker: 'ChainMaker 监管链', fabric: 'Fabric 运营链', 'fisco-bcos': 'FISCO BCOS 管理链' };
  function chainTag(chain) {
    const c = String(chain || '').toLowerCase();
    const key = c === 'fisco' ? 'fisco-bcos' : c;
    if (!CHAIN_NAME[key]) return h('span', { class: 'p-badge p-tone-neutral' }, String(chain || '—'));
    return h('span', { class: 'p-chain-tag', 'data-chain': key }, CHAIN_NAME[key]);
  }
  function kv(pairs) {
    return h('dl', { class: 'p-kv' }, pairs.filter(Boolean).map(p => [
      h('dt', {}, p[0]),
      h('dd', {}, p[1] && p[1].nodeType ? p[1] : String(p[1] ?? '—')),
    ]));
  }
  function empty(text) { return h('div', { class: 'p-empty' }, text || '暂无记录'); }
  function metaLine(r) {
    if (!r) return null;
    return h('div', { class: 'p-meta' },
      r.ok ? h('span', { class: 'p-badge p-tone-good' }, '✓ code=0')
           : h('span', { class: 'p-badge p-tone-critical' }, '✕ code=' + r.code),
      h('span', {}, '⏱ ' + r.latencyMs + 'ms'),
      r.trace_id ? h('span', {}, 'trace ', h('code', { class: 'p-mono' }, r.trace_id)) : null,
      r.timestamp ? h('span', { class: 'p-meta-ts' }, r.timestamp) : null);
  }
  function errCard(r) {
    const why = (window.EXPLAIN && EXPLAIN.codes[r.code]) || '';
    return h('div', { class: 'p-err' },
      h('div', { class: 'p-err-head' }, '✕ code=' + r.code + ' · ' + (r.message || '')),
      r.code === -1
        ? h('div', { class: 'p-err-why' }, '后端不可达：请确认 go run ./cmd/server（:8080）与 ./scripts/serve-frontend.sh（:8090）已启动。')
        : why ? h('div', { class: 'p-err-why' }, why) : null);
  }
  function resultPanel() {
    const root = h('div', { class: 'p-result' });
    function show(r, renderFn) {
      root.innerHTML = '';
      root.append(metaLine(r));
      if (!r.ok) root.append(errCard(r));
      else if (renderFn) { const v = renderFn(r.data, r); if (v) root.append(v); }
      root.append(h('details', { class: 'p-rawjson' },
        h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
      return r;
    }
    return { root, show };
  }
  function confirm(title, msg, okLabel) {
    return new Promise(res => {
      const mask = h('div', { class: 'p-modal-mask' });
      function close(v) {
        mask.remove(); document.removeEventListener('keydown', onKey); res(v);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }
      mask.append(h('div', { class: 'p-modal' },
        h('div', { class: 'p-modal-title' }, title),
        h('div', { class: 'p-modal-msg' }, msg),
        h('div', { class: 'p-modal-btns' },
          h('button', { class: 'p-btn p-btn-ghost', onClick: () => close(false) }, '取消'),
          h('button', { class: 'p-btn p-btn-danger', onClick: () => close(true) }, okLabel || '确认执行'))));
      mask.addEventListener('click', e => { if (e.target === mask) close(false); });
      document.addEventListener('keydown', onKey);
      document.body.append(mask);
    });
  }
  function drawer(title, ...body) {
    const panel = h('div', { class: 'p-drawer' },
      h('div', { class: 'p-drawer-head' },
        h('h3', {}, title),
        h('button', { class: 'p-btn p-btn-ghost p-btn-sm', onClick: () => close() }, '✕')),
      h('div', { class: 'p-drawer-body' }, ...body));
    const mask = h('div', { class: 'p-drawer-mask' }, panel);
    function close() { mask.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    mask.addEventListener('click', e => { if (e.target === mask) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(mask);
    return { root: mask, close };
  }
  function actionBar(btns) {
    return h('div', { class: 'p-actions' }, btns.map(b => {
      const el = h('button', {
        class: 'p-btn' + (b.kind ? ' p-btn-' + b.kind : ''), title: b.title || null,
      }, b.label);
      el.addEventListener('click', async () => {
        if (b.confirm && !(await confirm(b.confirm.title || '请确认', b.confirm.msg, b.confirm.ok))) return;
        el.disabled = true; const old = el.textContent; el.textContent = '⏳ ' + old;
        try { await b.run(el); } finally { el.disabled = false; el.textContent = old; }
      });
      return el;
    }));
  }
  /* chipBar：STORE 单一全局订阅（避免路由重绘泄漏监听器） */
  let chipWrap = null;
  STORE.onChange(list => { if (chipWrap && chipWrap.isConnected) drawChips(chipWrap); });
  function drawChips(wrap) {
    const opts = wrap.__opts || {};
    const ents = STORE.all();
    wrap.innerHTML = '';
    wrap.append(h('span', { class: 'p-chipbar-label' }, '当前业务对象'));
    if (!ents.length) {
      wrap.append(h('span', { class: 'p-chip p-chip-empty' }, '（尚无——完成操作后自动汇集，点击可复制 ID）'));
      return;
    }
    ents.forEach(e => {
      const chip = h('button', {
        class: 'p-chip',
        title: (STORE.KIND_LABEL[e.kind] || e.kind) + ' · ' + e.id +
          (e.extra ? '\n' + JSON.stringify(e.extra) : '') + '\n点击复制 ID',
        onClick: () => {
          if (navigator.clipboard) navigator.clipboard.writeText(e.id);
          UI.toast('已复制 ' + e.id);
          if (opts.onPick) opts.onPick(e);
        },
      }, h('i', {}, STORE.KIND_LABEL[e.kind] || e.kind), h('b', { class: 'p-mono' }, e.id));
      wrap.append(chip);
    });
    wrap.append(h('button', {
      class: 'p-chip p-chip-clear', title: '清空本地业务上下文（不影响后端数据）',
      onClick: () => STORE.clear(),
    }, '✕ 清空'));
  }
  function chipBar(opts) {
    const wrap = h('div', { class: 'p-chipbar' });
    wrap.__opts = opts || {};
    chipWrap = wrap; drawChips(wrap);
    return wrap;
  }
  function pageHead(o) {
    return h('div', { class: 'p-page-head' },
      h('div', {}, h('h1', {}, o.title), o.sub ? h('p', { class: 'p-page-sub' }, o.sub) : null),
      o.actions && o.actions.length ? h('div', { class: 'p-page-actions' }, ...o.actions) : null);
  }
  /* ---------- tabs：active 同步 ?tab= 参数；切入即重新 render（每次拉新数据） ---------- */
  function tabParam() {
    const qs = (location.hash.split('?')[1]) || '';
    return new URLSearchParams(qs).get('tab');
  }
  function setTabParam(key) {
    const raw = (location.hash || '#/').replace(/^#\//, '');
    const base = raw.split('?')[0];
    const p = new URLSearchParams(raw.split('?')[1] || '');
    p.set('tab', key);
    location.hash = '#/' + base + '?' + p.toString();
  }
  function tabs(items) {
    const cur = tabParam() || (items[0] && items[0].key);
    const box = h('div', { class: 'p-tab-body' });
    const nav = h('div', { class: 'p-tabs' }, items.map(it =>
      h('button', {
        class: 'p-tab' + (it.key === cur ? ' active' : ''),
        onClick: () => { if (tabParam() !== it.key) setTabParam(it.key); },
      }, it.label)));
    const item = items.find(i => i.key === cur) || items[0];
    if (item) item.render(box);
    return h('div', { class: 'p-tabs-wrap' }, nav, box);
  }

  /* ---------- runOp：变更类操作统一管线（Task 5-9 所有写操作按钮共用） ---------- */
  function runOp(o) {
    return async () => {
      const body = await o.body();
      if (!body) return null;                    // body() 返回 null = 校验失败/用户放弃，不发请求
      const r = await API.call(o.path, body);
      o.rp.show(r, d => {
        const parts = [];
        if (o.successText) parts.push(h('div', { class: 'p-ok-line' }, '✓ ' + o.successText));
        if (o.render) { const v = o.render(d); if (v) parts.push(v); }
        return parts.length ? h('div', {}, ...parts) : null;
      });
      if (r.ok) {
        if (o.note) {
          const id = typeof o.note.id === 'function' ? o.note.id(r.data) : o.note.id;
          const extra = o.note.extra ? o.note.extra(r.data) : null;
          STORE.note(o.note.kind, id, extra);
        }
        if (o.onOk) await o.onOk(r.data, r);
      }
      return r;
    };
  }

  window.PUI = {
    h, badge, chainTag, kv, empty, metaLine, errCard, resultPanel, actionBar,
    confirm, drawer, chipBar, pageHead, tabs, tabParam, setTabParam, runOp,
  };
})();
```

- [ ] **Step 2: product.css 追加组件样式段（基础）**

在文件末尾追加。要求（视觉验收标准）：`p-badge` 圆角胶囊、按 `p-tone-good/warning/critical/serious/info/neutral` 用对应 `--p-*`/`--p-*-soft` 前景+浅底；`p-chain-tag[data-chain=chainmaker|fabric|fisco]` 左边框 3px 用链色；`p-kv` 两列网格（dt 灰 12px / dd 13px，`p-mono` 等宽）；`p-btn` 高 30px 圆角 6px，`p-btn-primary` 品牌底白字、`p-btn-danger` critical 底白字、`p-btn-ghost` 透明底细边框、`p-btn-sm` 高 24px；`p-result`/`p-err`（critical 浅底左边框 3px）、`p-err-why` 次级文字、`p-rawjson summary` 12px 灰；`p-modal-mask`/`p-drawer-mask` 全屏半透明遮罩（drawer 右侧滑入 480px 宽、`--p-shadow-2`、进入动画 transform .18s）；`p-chipbar` 横向 flex wrap、`p-chip` 胶囊（i 标签灰色小字 + b 等宽）、`p-chip-clear` critical 色；`p-page-head` 标题 20px/副标题 13px 灰、右侧操作区；`p-tabs` 底边框导航（active 项品牌色 + 2px 下划线）、`p-tab-body` 上方留白 14px；`p-actions` flex gap 8px wrap；`p-empty` 居中灰字 40px 高；`p-card`（面板底 + 1px `--p-line` 边框 + `--p-radius` 圆角 + `--p-shadow-1` + 内边距 16px，`p-card-title` 14px 粗体下留白 10px）；`p-row` flex wrap gap 8px；`p-ok-line` good 色 13px 粗体。全部只用 `--p-*` 令牌，明暗主题自动成立。

- [ ] **Step 3: 写 pui-lab.js 组件自检页（完整代码）**

```js
/* pui-lab.js —— PUI 组件自检页（#/pui-lab，不进侧边栏；开发/回归用）。 */
(function () {
  'use strict';
  const { h, toast } = UI, P = PUI;

  function render(root) {
    root.append(P.pageHead({ title: 'PUI 组件自检', sub: '新设计系统组件画廊（开发工具页）' }));
    root.append(P.chipBar({ onPick: e => toast('onPick: ' + e.kind + '=' + e.id) }));

    const sec = (title, ...body) => h('section', { class: 'p-card' },
      h('h3', { class: 'p-card-title' }, title), ...body);

    root.append(sec('徽章画廊',
      h('div', { class: 'p-row' }, ['ONLINE', 'VERIFIED', 'SUCCESS', 'VALID', 'PENDING', 'DRAFT',
        'DEGRADED', 'ISOLATED', 'REVOKED', 'FAILED', 'OPEN', 'TRACED', 'ARCHIVED', 'HIGH', 'BROKEN',
        'ROUTE_OK', 'PASS', 'DETECT', '未知状态'].map(s => P.badge(s))),
      h('div', { class: 'p-row' }, ['chainmaker', 'fabric', 'fisco-bcos'].map(c => P.chainTag(c)))));

    const rp = P.resultPanel();
    root.append(sec('结果面板（live：health/ping）',
      P.actionBar([
        { label: '调用 health/ping', kind: 'primary', run: () => API.call('/api/health/ping', {}).then(r => rp.show(r, d => P.kv([['ping', d.ping]]))) },
        { label: '模拟 code=4001 错误卡', run: () => rp.show({ ok: false, code: 4001, message: '虫洞部署被拒', latencyMs: 3, raw: { code: 4001 } }) },
        { label: '危险操作（confirm）', kind: 'danger',
          confirm: { title: '确认演示', msg: '这是 PUI.confirm 的确认文案。', ok: '执行' },
          run: () => toast('确认后执行') },
        { label: '打开抽屉', run: () => P.drawer('详情抽屉', P.kv([['组件', 'PUI.drawer'], ['关闭', 'ESC / 点遮罩 / ✕']])) },
      ]), rp.root));

    root.append(sec('tabs（?tab= 同步）', P.tabs([
      { key: 'a', label: '页签 A', render: box => box.append(h('p', {}, 'A 内容；URL 应为 ?tab=a')) },
      { key: 'b', label: '页签 B', render: box => box.append(h('p', {}, 'B 内容')) },
    ])));

    root.append(sec('STORE 调试',
      P.actionBar([
        { label: 'note MISSION=LAB-1', run: () => STORE.note('MISSION', 'LAB-1', { demo: true }) },
        { label: 'note UAV=LAB-UAV', run: () => STORE.note('UAV', 'LAB-UAV') },
      ])));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['pui-lab'] = { render };
})();
```

- [ ] **Step 4: index.html 引入 + 语法门 + 浏览器验证**

`<script src="js/ui.js"></script>` 之后加 `<script src="js/pui.js"></script>`；
`<script src="js/pages/explorer.js"></script>` 之后加 `<script src="js/pages/pui-lab.js"></script>`。
Run: `node --check frontend/js/pui.js && node --check frontend/js/pages/pui-lab.js` → 通过。
浏览器打开 `http://127.0.0.1:8090/#/pui-lab` 逐项核对：
1. 徽章画廊：全部有色调区分、未知状态为中性；链标签三色正确。
2. 「调用 health/ping」（后端已启动）→ 绿色 code=0 元信息行 + ping=pong + 折叠 JSON 可展开。
3. 「模拟 code=4001」→ 红错误卡且**含 EXPLAIN 词典解说**（「虫洞部署被拒：NODE-X/Y 仍带上次攻防的 ISOLATED 残留…」）。
4. 危险操作 → confirm 模态；ESC 取消不执行、确认后 toast。
5. 抽屉：右侧滑入，三种方式可关。
6. tabs：点击 B → 地址栏 `#/pui-lab?tab=b`；刷新后仍在 B。
7. chipBar：note 两个实体后出现 chips（MISSION 在 UAV 前），点击复制 toast，✕ 清空后回到空态文案。
8. 明暗主题切换：本页两态均无不可读文字。

- [ ] **Step 5: Commit**

```bash
git add frontend/js/pui.js frontend/js/pages/pui-lab.js frontend/css/product.css frontend/index.html
git commit -m "feat(frontend): PUI 产品组件库基础段（徽章/结果面板/模态/抽屉/chips/tabs）+ 自检页

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: pui.js 数据组件（DataTable / Form / CSV 导出 / 统计卡 / 评分条 / 跨链存证 / 拓扑 SVG）

**Files:**
- Modify: `frontend/js/pui.js`（IIFE 内追加，window.PUI 导出扩充）
- Modify: `frontend/css/product.css`（追加数据组件样式段）
- Modify: `frontend/js/pages/pui-lab.js`（追加数据组件 live 自检区）

**Interfaces:**
- Consumes: Task 3 的 PUI 基础段。
- Produces（**Task 5-9 依赖的全部签名，逐字实现**）:

```js
// 追加到 window.PUI：
form(fields),        // → {root, read(), set(name,val), setOptions(name, options)}
                     // field: {name, label, type:'text'|'number'|'select'|'multi'|'textarea'|'datetime',
                     //           options?:[[value,text]|value], value?, required?, hint?, placeholder?, rows?, step?}
                     // read(): number 转 Number、textarea trim、multi 收集勾选值为数组、空值省略键
                     // 'datetime' = 文本输入（值格式 'YYYY-MM-DD HH:mm:ss'，调用方用 UI.datetimeLocal(offsetMin) 给默认值）
                     // setOptions: select/multi 异步换选项（route_segments 多选等场景）
dataTable(opts),     // → element，附 el.reload(extraFilters?)；opts:
                     // {endpoint, baseBody?, filters?:[{name,label,type:'select'|'text',options?,value?}],
                     //  columns:[{title, key?|render(rec,i)?, num?, mono?}], pageSize?=10,
                     //  onRow?(rec), emptyText?, autoLoad?!=false, onLoaded?(records,data,r)}
                     // 请求体 = {...baseBody, ...过滤条当前值, page, page_size}；响应吃 {records,total}
csvExport(opts),     // {label?, endpoint, body?|filters():object, filename?} → 按钮；
                     // 成功下载 BOM+content（.csv），toast「已导出 N 行」；失败 toast code+message
statCards(items),    // items:[{label, value, sub?, tone?:'good'|'warning'|'critical'|'info'|''}]
scoreBars(dims, threshold), // dims:{name:number(0..1)}（risk dimensions 5 键）；threshold 画标线；
                     // 条超阈值变 critical 色
hbars(items),        // items:[{label, value, tone?}] 横向条形（dashboard by_type / 时延分位）
cxTrail(cx),         // 跨链四段存证可视化：头行 cross_tx_id+status 徽章+message_type+latency+verify/policy；
                     // 四段卡 ①源链上链(source_chain/source_chain_tx_id) ②监管链签收(reg_receive_tx_id)
                     // ③监管链中继(reg_relay_tx_id) ④目标链存证(final_target_chain/target_chain_tx_id)；
                     // 每段复制按钮；点击任一段 → openCxDetail(cx.cross_tx_id)
openCxDetail(crossTxId), // drawer：POST /api/crosschain/query → 全字段 kv（含 idempotency_key/retry_of/
                     // error_code/reg_record_id/sm3_hash/sm9_identity/signature 截断）+ cxTrail + 原始 JSON
topoSVG(topo, hlPath?), // 链下拓扑渲染（新视觉）：算法照抄 act2.js topoSVG（js/pages/act2.js 34-100 行），
                     // 替换：class → p-topo/p-topo-edge/p-topo-wormhole/p-topo-active/p-topo-node/p-topo-label；
                     // TYPE_COLOR → {UAV:'var(--p-chain-fabric)', EDGE:'var(--p-good)',
                     //   MANAGEMENT:'var(--p-chain-chainmaker)', ATTACKER:'var(--p-critical)'}；
                     // 保留 UI.showTip/hideTip 边悬浮提示；isolated 节点 ⛔ 红虚线描边
pathHops(hops),      // message/send 的 path_detail 逐跳时延：[{from,to,latency_ms}] → 水平跳段条
                     // （每段 from→to 标签 + latency_ms，宽度按时延占比）
```

- [ ] **Step 1: pui.js 追加数据段（完整代码——form/dataTable/csvExport 为逻辑核心，逐字实现）**

```js
  /* ---------- 表单 ---------- */
  function form(fields) {
    const els = {};
    const root = h('div', { class: 'p-form' }, fields.map(f => {
      let inp;
      if (f.type === 'select') {
        inp = h('select', { 'data-f': f.name },
          (f.options || []).map(o => optEl(o, f.value)));
      } else if (f.type === 'multi') {
        inp = (f.options || []).map(o => multiBox(o, f.value));
      } else if (f.type === 'textarea') {
        inp = h('textarea', { 'data-f': f.name, rows: f.rows || 3, placeholder: f.placeholder || '' },
          f.value || '');
      } else {
        inp = h('input', {
          type: f.type === 'number' ? 'number' : 'text', 'data-f': f.name,
          value: f.value ?? '', placeholder: f.placeholder || '', step: f.step || null,
        });
      }
      els[f.name] = { f, inp };
      const wide = f.type === 'textarea' || f.type === 'multi';
      return h('label', { class: 'p-field' + (wide ? ' p-field-wide' : '') },
        h('span', { class: 'p-field-label' }, f.label,
          f.required ? h('i', { class: 'p-req' }, '*') : null),
        f.type === 'multi' ? h('span', { class: 'p-multi' }, ...inp) : inp,
        f.hint ? h('span', { class: 'p-field-hint' }, f.hint) : null);
    }));
    function optEl(o, cur) {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      return h('option', { value: v, selected: String(cur ?? '') === String(v) }, t);
    }
    function multiBox(o, cur) {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      const arr = Array.isArray(cur) ? cur : (cur ? [cur] : []);
      return h('label', { class: 'p-multi-item' },
        h('input', { type: 'checkbox', 'data-f': o === v ? undefined : undefined, value: v, checked: arr.map(String).includes(String(v)) }),
        h('span', {}, t));
    }
    function boxes(name) { return root.querySelectorAll('.p-multi-item input[data-mf="' + name + '"]'); }
    // multi 的 checkbox 需要 data-mf 定位（value 可能重复跨字段）：
    fields.forEach(f => {
      if (f.type !== 'multi') return;
      root.querySelectorAll('.p-multi-item input').forEach(() => {});
    });
    function read() {
      const out = {};
      fields.forEach(f => {
        const e = els[f.name];
        if (f.type === 'multi') {
          const v = Array.from(root.querySelectorAll('input[data-mf="' + f.name + '"]:checked')).map(i => i.value);
          if (v.length) out[f.name] = v;
          return;
        }
        let v = e.inp.value;
        if (f.type === 'number' && v !== '') v = Number(v);
        if (typeof v === 'string') v = f.type === 'textarea' ? v.trim() : v;
        if (v !== '' && v !== null && v !== undefined) out[f.name] = v;
      });
      return out;
    }
    function set(name, val) {
      const e = els[name]; if (!e) return;
      if (e.f.type === 'multi') {
        const arr = (Array.isArray(val) ? val : [val]).map(String);
        root.querySelectorAll('input[data-mf="' + name + '"]').forEach(i => { i.checked = arr.includes(i.value); });
        return;
      }
      e.inp.value = val ?? '';
    }
    function setOptions(name, options) {
      const e = els[name]; if (!e) return;
      if (e.f.type === 'select') {
        e.inp.innerHTML = '';
        options.forEach(o => e.inp.append(optEl(o, e.inp.value)));
      } else if (e.f.type === 'multi') {
        const wrap = e.inp[0] && e.inp[0].closest('.p-multi');
        if (!wrap) return;
        wrap.innerHTML = '';
        options.forEach(o => {
          const [v, t] = Array.isArray(o) ? o : [o, o];
          wrap.append(h('label', { class: 'p-multi-item' },
            h('input', { type: 'checkbox', 'data-mf': name, value: v }), h('span', {}, t)));
        });
      }
    }
    return { root, read, set, setOptions };
  }
```

**修正说明（写码时落实）**：上面草稿中 multi 的 checkbox 一律用 `data-mf="<字段名>"` 定位（初始渲染与 setOptions 都是），删除草稿里的 `boxes()` 与无效 forEach 残留——最终代码中 `multiBox` 生成 `h('input', {type:'checkbox','data-mf':f.name,value:v,checked:…})`（需要把 f.name 传进 multiBox）。

```js
  /* ---------- 数据表：过滤条 + 服务端分页 ---------- */
  function dataTable(opts) {
    const st = { page: 1, pageSize: opts.pageSize || 10, total: 0, filters: {} };
    (opts.filters || []).forEach(f => { if (f.value) st.filters[f.name] = f.value; });
    const body = h('div', { class: 'p-dt-body' }, h('div', { class: 'p-empty' }, '⏳ 加载中…'));
    const pager = h('div', { class: 'p-dt-pager' });
    const fEls = {};
    const filterBar = (opts.filters && opts.filters.length) ? h('div', { class: 'p-dt-filters' },
      opts.filters.map(f => {
        const el = f.type === 'select'
          ? h('select', {}, [h('option', { value: '' }, '全部' + f.label)]
              .concat((f.options || []).map(o => h('option', { value: o, selected: st.filters[f.name] === o }, o))))
          : h('input', { type: 'text', placeholder: f.label, value: st.filters[f.name] || '' });
        fEls[f.name] = el;
        return h('label', { class: 'p-dt-filter' }, el);
      }),
      h('button', { class: 'p-btn p-btn-sm', onClick: () => { readFilters(); load(1); } }, '查询'),
      h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
        onClick: () => { Object.keys(fEls).forEach(k => fEls[k].value = ''); st.filters = {}; load(1); } }, '重置'))
      : null;
    function readFilters() {
      st.filters = {};
      Object.keys(fEls).forEach(k => { if (fEls[k].value !== '') st.filters[k] = fEls[k].value; });
    }
    const root = h('div', { class: 'p-dt' },
      h('div', { class: 'p-dt-head' }, filterBar || h('span', {}),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', title: '刷新', onClick: () => load(st.page) }, '⟳ 刷新')),
      body, pager);
    async function load(page) {
      if (page) st.page = page;
      body.innerHTML = ''; body.append(h('div', { class: 'p-empty' }, '⏳ 加载中…'));
      pager.innerHTML = '';
      const reqBody = Object.assign({}, opts.baseBody || {}, st.filters,
        { page: st.page, page_size: st.pageSize });
      const r = await API.call(opts.endpoint, reqBody);
      body.innerHTML = '';
      if (!r.ok) { body.append(errCard(r)); return; }
      const d = r.data || {};
      st.total = d.total || 0;
      const recs = d.records || [];
      if (!recs.length) body.append(empty(opts.emptyText));
      else body.append(renderRows(recs));
      renderPager();
      if (opts.onLoaded) opts.onLoaded(recs, d, r);
    }
    function renderRows(recs) {
      const cols = opts.columns;
      return h('div', { class: 'p-tbl-wrap' }, h('table', { class: 'p-tbl' },
        h('thead', {}, h('tr', {}, cols.map(c => h('th', { class: c.num ? 'num' : null }, c.title)))),
        h('tbody', {}, recs.map((rec, i) => h('tr', {
          onClick: opts.onRow ? () => opts.onRow(rec, i) : null,
          class: opts.onRow ? 'clickable' : null,
        }, cols.map(c => h('td', { class: (c.num ? 'num ' : '') + (c.mono ? 'p-mono' : '') },
          c.render ? c.render(rec, i) : String(rec[c.key] ?? '—'))))))));
    }
    function renderPager() {
      const pages = Math.max(1, Math.ceil(st.total / st.pageSize));
      pager.append(
        h('span', { class: 'p-dt-total' }, '共 ' + st.total + ' 条 · 第 ' + st.page + '/' + pages + ' 页'),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', disabled: st.page <= 1,
          onClick: () => load(st.page - 1) }, '‹ 上一页'),
        h('button', { class: 'p-btn p-btn-sm p-btn-ghost', disabled: st.page >= pages,
          onClick: () => load(st.page + 1) }, '下一页 ›'));
    }
    root.reload = extra => { if (extra) Object.assign(st.filters, extra); load(st.page); };
    if (opts.autoLoad !== false) load(1);
    return root;
  }

  /* ---------- CSV 导出（BOM 头保证 Excel 中文兼容） ---------- */
  function csvExport(opts) {
    const b = h('button', { class: 'p-btn p-btn-sm' }, opts.label || '⤓ 导出 CSV');
    b.addEventListener('click', async () => {
      b.disabled = true;
      const body = Object.assign({}, opts.body || {}, opts.filters ? opts.filters() : {});
      const r = await API.call(opts.endpoint, body);
      b.disabled = false;
      if (!r.ok) { UI.toast('导出失败 code=' + r.code + '：' + r.message, 'err'); return; }
      const name = opts.filename || (opts.endpoint.replace(/[\/\W]+/g, '_') + '.csv');
      const url = URL.createObjectURL(new Blob(['﻿' + r.data.content],
        { type: 'text/csv;charset=utf-8' }));
      const a = h('a', { href: url, download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      UI.toast('已导出 ' + (r.data.rows ?? '?') + ' 行 → ' + name);
    });
    return b;
  }

  /* ---------- 统计卡 / 条形 / 评分条 ---------- */
  function statCards(items) {
    return h('div', { class: 'p-stats' }, items.filter(Boolean).map(it =>
      h('div', { class: 'p-stat' + (it.tone ? ' p-tone-' + it.tone : '') },
        h('div', { class: 'p-stat-label' }, it.label),
        h('div', { class: 'p-stat-value' }, String(it.value ?? '—')),
        it.sub ? h('div', { class: 'p-stat-sub' }, it.sub) : null)));
  }
  function hbars(items) {
    const max = Math.max(1, ...items.map(i => Number(i.value) || 0));
    return h('div', { class: 'p-hbars' }, items.map(i =>
      h('div', { class: 'p-hbar' },
        h('span', { class: 'p-hbar-label' }, i.label),
        h('span', { class: 'p-hbar-track' },
          h('i', { class: 'p-hbar-fill' + (i.tone ? ' p-tone-' + i.tone : ''),
            style: { width: Math.round((Number(i.value) || 0) / max * 100) + '%' } })),
        h('b', { class: 'p-hbar-val' }, String(i.value ?? 0)))));
  }
  function scoreBars(dims, threshold) {
    const names = { identity: '身份一致性', adjacency: '邻接真实性', latency: '时延合理性',
      challenge: '挑战同步性', path: '路径稳定性' };
    const rows = Object.keys(dims).map(k => ({ k, v: Number(dims[k]) || 0 }));
    return h('div', { class: 'p-scores' },
      rows.map(r => h('div', { class: 'p-score-row' },
        h('span', { class: 'p-score-name' }, names[r.k] || r.k),
        h('span', { class: 'p-hbar-track' },
          h('i', { class: 'p-hbar-fill' + (r.v >= (threshold ?? 0.7) ? ' p-tone-critical' : ' p-tone-good'),
            style: { width: Math.min(100, Math.round(r.v * 100)) + '%' } }),
          threshold != null ? h('u', { class: 'p-score-thr',
            style: { left: Math.min(100, Math.round(threshold * 100)) + '%' } }) : null),
        h('b', { class: 'p-mono' }, r.v.toFixed(2)))));
  }

  /* ---------- 跨链四段存证 ---------- */
  function copyBtn(tx) {
    return tx ? h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
      onClick: e => { e.stopPropagation(); navigator.clipboard && navigator.clipboard.writeText(tx); UI.toast('已复制 TxID'); } },
      '复制') : null;
  }
  function cxSeg(idx, role, chain, tx, crossTxId) {
    return h('div', { class: 'p-cx-seg' + (tx ? '' : ' missing'), onClick: () => openCxDetail(crossTxId) },
      h('div', { class: 'p-cx-role' }, idx + ' ' + role, chain ? chainTag(chain) : null),
      h('div', { class: 'p-cx-tx p-mono' }, tx ? UI.trunc(tx, 40) : '—'),
      copyBtn(tx));
  }
  function cxTrail(cx) {
    if (!cx) return null;
    return h('div', { class: 'p-cx' },
      h('div', { class: 'p-cx-head' },
        h('code', { class: 'p-mono' }, cx.cross_tx_id), badge(cx.status),
        h('span', { class: 'p-cx-sub' }, cx.message_type, ' · ', (cx.latency_ms ?? '—') + 'ms',
          ' · verify=', cx.verify_result || '—', ' · policy=', cx.policy_result || '—',
          cx.error_code ? ' · error_code=' + cx.error_code : '')),
      h('div', { class: 'p-cx-flow' },
        cxSeg('①', '源链上链', cx.source_chain, cx.source_chain_tx_id, cx.cross_tx_id),
        cxSeg('②', '监管链签收', 'chainmaker', cx.reg_receive_tx_id, cx.cross_tx_id),
        cxSeg('③', '监管链中继', 'chainmaker', cx.reg_relay_tx_id, cx.cross_tx_id),
        cxSeg('④', '目标链存证', cx.final_target_chain, cx.target_chain_tx_id, cx.cross_tx_id)));
  }
  async function openCxDetail(crossTxId) {
    if (!crossTxId) return;
    const d = drawer('跨链存证详情 ' + crossTxId, h('div', { class: 'p-empty' }, '⏳ 查询中…'));
    const r = await API.call('/api/crosschain/query', { cross_tx_id: crossTxId });
    d.root.querySelector('.p-drawer-body').innerHTML = '';
    const body = d.root.querySelector('.p-drawer-body');
    if (!r.ok) { body.append(errCard(r)); return; }
    const x = r.data;
    body.append(cxTrail(x),
      kv([
        ['业务单号', h('code', { class: 'p-mono' }, x.business_id)],
        ['监管记录', x.reg_record_id || '—'],
        ['幂等键', h('code', { class: 'p-mono' }, UI.trunc(x.idempotency_key, 48))],
        x.retry_of ? ['重试自', h('code', { class: 'p-mono' }, x.retry_of)] : null,
        ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(x.sm3_hash, 48))],
        ['SM9 身份', h('code', { class: 'p-mono' }, x.sm9_identity || '—')],
        ['签名', h('code', { class: 'p-mono' }, UI.trunc(x.signature, 48))],
        ['错误码', x.error_code ? String(x.error_code) : '0'],
        ['创建/更新', x.created_at + ' → ' + x.updated_at],
      ]),
      h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
  }

  /* ---------- 消息逐跳时延 ---------- */
  function pathHops(hops) {
    if (!hops || !hops.length) return empty('无逐跳明细');
    const max = Math.max(1, ...hops.map(x => Number(x.latency_ms) || 0));
    return h('div', { class: 'p-hops' }, hops.map(x =>
      h('div', { class: 'p-hop' },
        h('span', { class: 'p-hop-label p-mono' }, x.from + ' → ' + x.to),
        h('span', { class: 'p-hbar-track' },
          h('i', { class: 'p-hbar-fill', style: { width: Math.max(6, Math.round((Number(x.latency_ms) || 0) / max * 100)) + '%' } })),
        h('b', { class: 'p-mono' }, (x.latency_ms ?? '—') + 'ms'))));
  }

  /* ---------- 链下拓扑 SVG（新视觉；算法照抄 act2.js topoSVG 34-100 行） ---------- */
  // 实现要求（不重复贴算法，照抄后按此替换）：
  // 1) 类名：svg.p-topo；边 line.p-topo-edge（虫洞边加 .p-topo-wormhole，会话路径加 .p-topo-active）；
  //    节点 g.p-topo-node；标签 text.p-topo-label。
  // 2) 颜色：TYPE_COLOR = {UAV:'var(--p-chain-fabric)', EDGE:'var(--p-good)',
  //    MANAGEMENT:'var(--p-chain-chainmaker)', ATTACKER:'var(--p-critical)'}；
  //    节点描边 ONLINE 用 var(--p-line-strong)、ISOLATED 用 var(--p-critical)（3px 虚线）、OFFLINE 透明填充。
  // 3) 保留 UI.showTip/hideTip 的边悬浮提示（距离/宣告时延/虫洞标记/当前路径标记）与坐标换算
  //    （X=40+x*6.1, Y=30+y*5.6, viewBox 0 0 700 470）、isolated 节点 ⛔ 前缀、MANAGEMENT r=13/ATTACKER r=11/其余 r=10。
  // 4) 签名：topoSVG(topo, hlPath) → SVGElement；topo 为 topology/get 的 data。
```

`window.PUI` 导出对象追加：`form, dataTable, csvExport, statCards, scoreBars, hbars, cxTrail, openCxDetail, topoSVG, pathHops`。

- [ ] **Step 2: product.css 追加数据组件样式段**

要求（视觉验收标准）：`p-form` 两列网格（`p-field-wide` 跨两列；gap 10px；label 上灰字 12px + 控件 30px 高、边框 `--p-line`、聚焦品牌色描边）；`p-multi` 复选胶囊横排；`p-req` critical 星号；`p-field-hint` 11px `--p-ink-3`；`p-dt-head` 过滤条 flex（select/input 高 28px）；`p-tbl` 全宽、行高 `--p-row-h`、斑马纹 `--p-panel-2`、表头 12px 灰底、`tr.clickable:hover` 品牌浅底、`.num` 右对齐等宽；`p-dt-pager` 右对齐灰字+按钮；`p-stats` 自适应网格卡片（label 12px 灰 / value 22px 等宽粗体 / sub 11px；`p-tone-*` 左边框 3px 语义色）；`p-hbars`/`p-hbar-track`（6px 圆角轨道 + 填充条）；`p-scores` 行式布局 + `p-score-thr` 绝对定位 2px 竖虚线（critical 色）；`p-cx` 卡片、`p-cx-flow` 四段横排（窄屏 wrap；段间 → 箭头伪元素；`.missing` 段虚线灰化）、`p-cx-tx` 11px 截断；`p-hops` 同 hbars 紧凑版；`p-drawer-body` 内 `p-kv`/`p-cx` 间距；`p-topo` 宽度 100%、`p-topo-edge` 2px `--p-line-strong`、`p-topo-wormhole` critical 色 2px 虚线、`p-topo-active` 品牌色 3px、标签 11px。全部仅用 `--p-*`。

- [ ] **Step 3: pui-lab 追加 live 自检区（完整代码，追加在 tabs 区之后）**

```js
    /* ---- Task 4 数据组件 live 自检（需后端 sim 运行） ---- */
    const mf = P.form([
      { name: 'operator_id', label: '运营商过滤', type: 'text', placeholder: 'Operator-A' },
      { name: 'status', label: '状态', type: 'select', options: ['VERIFIED', 'ACTIVE', 'REVOKED'] },
      { name: 'scope', label: 'scope 多选', type: 'multi', options: ['MISSION', 'ROUTE', 'PAYLOAD'], value: ['ROUTE'] },
      { name: 'count', label: '数量', type: 'number', value: 5 },
      { name: 'when', label: '时间', type: 'datetime', value: UI.datetimeLocal(60) },
      { name: 'note', label: '备注', type: 'textarea', placeholder: '多行' },
    ]);
    const rp2 = P.resultPanel();
    root.append(sec('form（read/set/setOptions）', mf.root,
      P.actionBar([
        { label: 'read() 打印', run: () => rp2.show({ ok: true, code: 0, latencyMs: 0, raw: mf.read(), data: mf.read() }, d => UI.jsonBlock(d)) },
        { label: 'set(status=ACTIVE)', run: () => { mf.set('status', 'ACTIVE'); } },
        { label: 'setOptions(status 换源)', run: () => mf.setOptions('status', ['DRAFT', 'SUBMITTED']) },
      ]), rp2.root));

    root.append(sec('dataTable（live：uav/list，过滤 operator_id/status）',
      P.dataTable({
        endpoint: '/api/uav/list',
        filters: [
          { name: 'operator_id', label: '运营商', type: 'text' },
          { name: 'status', label: '状态', type: 'select', options: ['REGISTERED', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED'] },
        ],
        columns: [
          { title: 'ID', key: 'uav_id', mono: true }, { title: '型号', key: 'model' },
          { title: '运营商', key: 'operator_id' },
          { title: '状态', render: r => P.badge(r.status) },
        ],
        pageSize: 5,
        onRow: rec => P.drawer('无人机 ' + rec.uav_id, P.kv([['型号', rec.model], ['状态', P.badge(rec.status)]])),
      })));

    root.append(sec('csvExport（live：audit/export）',
      P.csvExport({ endpoint: '/api/audit/export', body: {}, filename: 'audit.csv' })));

    root.append(sec('statCards / hbars / scoreBars / pathHops（静态样例）',
      P.statCards([
        { label: '成功率', value: '99.2%', sub: 'p95 42ms', tone: 'good' },
        { label: '高危告警', value: 2, tone: 'critical' },
        { label: '会话', value: 3, sub: '1 降级', tone: 'warning' },
      ]),
      P.hbars([{ label: 'HEARTBEAT', value: 42 }, { label: 'POSITION_UPDATE', value: 17, tone: 'info' }]),
      P.scoreBars({ identity: 1.0, adjacency: 0.35, latency: 0.25, challenge: 0, path: 0.15 }, 0.7),
      P.pathHops([{ from: 'A', to: 'N1', latency_ms: 8 }, { from: 'N1', to: 'N2', latency_ms: 11 }])));

    root.append(sec('cxTrail（live：crosschain/list 首行）',
      (() => { const box = h('div', {});
        API.call('/api/crosschain/list', { page: 1, page_size: 1 }).then(r => {
          box.innerHTML = '';
          const rec = r.ok && r.data.records && r.data.records[0];
          box.append(rec ? P.cxTrail(rec) : P.empty('无跨链记录（先在幕一注册一架无人机）'));
        });
        return box; })())));
```

- [ ] **Step 4: 语法门 + 浏览器验证**

Run: `node --check frontend/js/pui.js && node --check frontend/js/pages/pui-lab.js` → 通过。
后端 sim 运行中，打开 `#/pui-lab`：
1. form：read() 输出含 `status:'VERIFIED'`（默认值）、`scope:['ROUTE']`、`count:5`（Number）、空文本字段不出键；set/setOptions 生效。
2. dataTable：显示种子 7 架无人机（分页 5+2）；过滤 `operator_id=Operator-A` 查询 → 2 行；点行开抽屉；⟳ 刷新可用。
3. csvExport：点击后浏览器下载 audit.csv，Excel/文本打开中文不乱码（BOM）。
4. statCards/hbars/scoreBars/pathHops 渲染正常，scoreBars 0.7 处有阈值虚线、identity=1.00 条为 critical 色。
5. cxTrail：有跨链记录时四段卡显示、点段开 openCxDetail 抽屉（全字段 kv）；无记录时空态。
6. 明暗主题下以上全部可读。

- [ ] **Step 5: Commit**

```bash
git add frontend/js/pui.js frontend/css/product.css frontend/js/pages/pui-lab.js
git commit -m "feat(frontend): PUI 数据组件——DataTable/Form/CSV导出/统计卡/评分条/跨链存证/拓扑SVG

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: overview.js —— 平台总览（新首页）

**Files:**
- Create: `frontend/js/pages/overview.js`
- Modify: `frontend/index.html`（script 引入）

**Interfaces:**
- Consumes: PUI 全部（Task 3/4）、STORE（Task 2）、`UI.trunc/jsonBlock`、路由 `#/overview`（Task 1 已设为默认落地）。
- Produces: `PAGES.overview = { render }`；Task 1 的回退链 `PAGES[name] || PAGES.overview` 自此生效。

- [ ] **Step 1: 写 overview.js（完整代码）**

```js
/* overview.js —— 平台总览 #/overview：三链状态、核心指标、跨链流水、告警摘要、演示维护。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  function statChain(name, chainKey, v) {
    const st = typeof v === 'string' ? v : (v && (v.status || v.state)) || 'UNKNOWN';
    return h('div', { class: 'p-stat' },
      h('div', { class: 'p-stat-label' }, name),
      h('div', { class: 'p-row' }, P.chainTag(chainKey), P.badge(st)));
  }

  function render(root) {
    root.append(P.pageHead({
      title: '平台总览',
      sub: '三链状态 · 核心指标 · 跨链流水 · 告警摘要 · 演示维护',
      actions: [h('button', { class: 'p-btn',
        onClick: () => { root.innerHTML = ''; render(root); } }, '⟳ 刷新全部')],
    }));
    root.append(P.chipBar());

    /* --- 三链状态条 --- */
    const chainBox = h('div', { class: 'p-stats' }, P.empty('⏳ 加载三链状态…'));
    const rpHealth = P.resultPanel();
    root.append(card('三链状态 chain/status', chainBox,
      P.actionBar([{ label: '健康自检 health/check', run: async () => {
        const r = await API.call('/api/health/check', {});
        rpHealth.show(r, d => P.kv([
          ['数据库', d.database],
          ['Fabric 运营链', d.chains && d.chains.fabric],
          ['ChainMaker 监管链', d.chains && d.chains['chainmaker']],
          ['FISCO BCOS 管理链', d.chains && d.chains['fisco-bcos']],
        ]));
      } }]), rpHealth.root));
    API.call('/api/chain/status', {}).then(r => {
      chainBox.innerHTML = '';
      if (!r.ok) { chainBox.append(P.errCard(r)); return; }
      const cs = r.data.chains || {};
      chainBox.append(
        statChain('监管链（不可绕过的枢纽）', 'chainmaker', cs['chainmaker']),
        statChain('运营链', 'fabric', cs.fabric),
        statChain('管理链', 'fisco-bcos', cs['fisco-bcos']));
    });

    /* --- 核心指标：dashboard/summary + 三本台账 total --- */
    const kpiBox = h('div', {}, P.empty('⏳ 加载指标…'));
    root.append(card('核心指标', kpiBox));
    Promise.all([
      API.call('/api/dashboard/summary', {}),
      API.call('/api/mission/list', { page: 1, page_size: 1 }),
      API.call('/api/pass/list', { page: 1, page_size: 1 }),
      API.call('/api/crosschain/list', { page: 1, page_size: 1 }),
    ]).then(([rs, rm, rp, rc]) => {
      kpiBox.innerHTML = '';
      if (!rs.ok) { kpiBox.append(P.errCard(rs)); return; }
      const s = rs.data;
      kpiBox.append(P.statCards([
        { label: '任务', value: rm.ok ? rm.data.total : '—', sub: 'mission/list 台账' },
        { label: '飞行许可', value: rp.ok ? rp.data.total : '—', sub: 'pass/list 台账' },
        { label: '跨链交易', value: rc.ok ? rc.data.total : '—', sub: 'crosschain/list 台账' },
        { label: '告警总数', value: s.alerts.total, sub: 'OPEN ' + s.alerts.open,
          tone: s.alerts.high_open > 0 ? 'critical' : '' },
        { label: '高危待处置', value: s.alerts.high_open, tone: s.alerts.high_open > 0 ? 'critical' : 'good' },
        { label: '活跃会话', value: s.sessions.active, sub: '降级 ' + s.sessions.degraded,
          tone: s.sessions.degraded > 0 ? 'warning' : '' },
        { label: '待批授权', value: s.authorizations.pending,
          tone: s.authorizations.pending > 0 ? 'warning' : '' },
        { label: '攻防事件', value: s.wormhole_events.total,
          sub: 'DETECT ' + s.wormhole_events.detect + ' · ISOLATE ' + s.wormhole_events.isolate +
               ' · RECOVER ' + s.wormhole_events.recover },
      ]));
      if (s.alerts.by_type) {
        kpiBox.append(h('div', { class: 'p-card-sub' }, '告警类型分布'),
          P.hbars(Object.keys(s.alerts.by_type).map(k =>
            ({ label: k, value: s.alerts.by_type[k] }))));
      }
    });

    /* --- 最近跨链流水 --- */
    root.append(card('最近跨链流水（点行看四段 TxID 存证详情）',
      P.dataTable({
        endpoint: '/api/crosschain/list', pageSize: 8,
        columns: [
          { title: 'cross_tx_id', render: r => UI.trunc(r.cross_tx_id, 24), mono: true },
          { title: '类型', key: 'message_type' },
          { title: '业务单号', render: r => UI.trunc(r.business_id, 20), mono: true },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '目标链', render: r => P.chainTag(r.final_target_chain) },
          { title: '时延(ms)', key: 'latency_ms', num: true },
        ],
        onRow: rec => P.openCxDetail(rec.cross_tx_id),
        emptyText: '暂无跨链记录',
      })));

    /* --- 最近告警 --- */
    root.append(card('最近告警 alert/list',
      P.dataTable({
        endpoint: '/api/alert/list', pageSize: 5,
        columns: [
          { title: '告警号', key: 'alert_id', mono: true },
          { title: '类型', render: r => P.badge(r.event_type) },
          { title: '风险级', render: r => P.badge(r.risk_level) },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '来源', key: 'source_system' },
          { title: '无人机伪名', render: r => UI.trunc(r.uav_pseudonym, 16), mono: true },
        ],
        emptyText: '暂无告警',
      })));

    /* --- 演示维护 --- */
    const rpDemo = P.resultPanel();
    root.append(card('演示维护',
      h('p', { class: 'p-field-hint' },
        'demo/init 幂等灌注演示种子；demo/reset 仅清空本地业务库并复位模拟链状态——真实链模式下的链上账本数据永不受影响。'),
      P.actionBar([
        { label: '灌注演示数据 demo/init', run: P.runOp({
          path: '/api/demo/init', body: () => ({}), rp: rpDemo, successText: '灌注完成',
          render: d => P.kv([
            ['created', h('code', { class: 'p-mono' }, JSON.stringify(d.created))],
            ['skipped', h('code', { class: 'p-mono' }, JSON.stringify(d.skipped))]]) }) },
        { label: '复位演示数据 demo/reset', kind: 'danger',
          confirm: { title: '复位演示数据', ok: '确认复位',
            msg: '将清空全部业务表并复位模拟链状态（真实链上数据不受影响）。确认继续？' },
          run: P.runOp({
            path: '/api/demo/reset', body: () => ({}), rp: rpDemo, successText: '复位完成',
            render: d => P.kv([
              ['tables_cleared', String(d.tables_cleared)],
              ['reset_at', d.reset_at]]) }) },
      ]), rpDemo.root));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES.overview = { render };
})();
```

- [ ] **Step 2: index.html 引入 + product.css 补两条小样式**

`<script src="js/pages/pui-lab.js"></script>` 之后加 `<script src="js/pages/overview.js"></script>`。
product.css 追加：`p-card-sub`（12px 灰标题，上下留白 8px）；`p-hr`（1px `--p-line` 横线，margin 12px 0）。

- [ ] **Step 3: 语法门 + 浏览器验证**

Run: `node --check frontend/js/pages/overview.js` → 通过。
后端 sim 运行中，打开 `http://127.0.0.1:8090/`（应默认落地 `#/overview`）：
1. 三链状态条：三个链卡显示 ONLINE（sim 模式恒 ONLINE）。
2. 健康自检按钮 → code=0 + database/chains kv。
3. 先点 demo/init → created/skipped 计数回显；核心指标出现任务/许可/跨链/告警等数字（种子后：任务 0、跨链 0、无人机台账在总览不显示——正常）。
4. 最近跨链流水/最近告警：空态或数据行；到 `#/act1` 一键注册一架无人机后回总览刷新 → 跨链流水出现 UAV_REGISTER_PROOF 行，点行开四段存证抽屉。
5. demo/reset 危险确认 → tables_cleared 回显 → 刷新后指标归零。
6. 侧边栏「平台总览」高亮；明暗主题两态可读。

- [ ] **Step 4: Commit**

```bash
git add frontend/js/pages/overview.js frontend/index.html frontend/css/product.css
git commit -m "feat(frontend): 平台总览新首页——三链状态/核心指标/跨链流水/演示维护

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: wb-operator.js —— 运营商工作台

**Files:**
- Create: `frontend/js/pages/wb-operator.js`
- Modify: `frontend/index.html`（script 引入）

**Interfaces:**
- Consumes: PUI（含 runOp/cxTrail/openCxDetail/dataTable/form）、STORE、`UI.datetimeLocal/trunc/jsonBlock`。
- Produces: `PAGES['wb-operator'] = { render }`；tab keys：`master` / `uavs` / `missions` / `passes`（深链 `#/wb-operator?tab=missions`）。Task 10 脚本按这些 key 与下述卡片标题引用。
- 后端契约要点（写死，勿猜）：
  - `uav/register` → `data = {uav:{uav_id,serial_no,model,manufacturer_id,operator_id,sm9_identity,status,created_at,updated_at}, crosschain:{cross_tx_id,business_id,...}}`
  - `uav/status` → `data = {uav:{…}, crosschain:{…}}`；`uav/revoke` → `data = uav 平铺`（无包裹）
  - `mission/create` → `data = mission 平铺`（含 `masked_value, sm3_hash, signature, zones[], route_segments[]`）
  - `mission/submit` → `data = {application:{application_id,mission_id,source_chain,source_tx_id,status,signature,sm3_hash,created_at}, crosschain:{…}}`
  - `conflict/detect` → `data = {conflicts:[ConflictRecord], count}`；ConflictRecord = `{conflict_id, mission_id_a, mission_id_b, conflict_type:TIME|ROUTE|ALTITUDE, suggestion(JSON文本), resolution, operator, status:OPEN|RESOLVED, created_at}`
  - `pass/query` → `data = pass 平铺`（含 valid_from/valid_to/route/sm3_hash）；`pass/verify` → `{pass_id, valid:bool, reasons:[], status}`

- [ ] **Step 1: 写 wb-operator.js（完整代码）**

```js
/* wb-operator.js —— 运营商工作台 #/wb-operator：主数据 / 无人机管理 / 任务管理 / 许可与存证。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  /* 必填校验：缺字段 toast 并返回 null（runOp 收到 null 不发请求） */
  function need(v, ...names) {
    const miss = names.filter(n => v[n] === undefined || v[n] === '' ||
      (Array.isArray(v[n]) && !v[n].length));
    if (miss.length) { UI.toast('缺少必填项：' + miss.join('、'), 'err'); return null; }
    return v;
  }
  const monoTrunc = (s, n) => h('code', { class: 'p-mono' }, UI.trunc(s, n || 40));

  function render(root) {
    root.append(P.pageHead({
      title: '运营商工作台',
      sub: '主体建档 · 无人机全生命周期 · 任务申请与冲突协调 · 许可自查与跨链存证',
    }));
    root.append(P.chipBar());
    root.append(P.tabs([
      { key: 'master', label: '主数据', render: tabMaster },
      { key: 'uavs', label: '无人机管理', render: tabUavs },
      { key: 'missions', label: '任务管理', render: tabMissions },
      { key: 'passes', label: '许可与存证', render: tabPasses },
    ]));
  }

  /* ================= Tab 1：主数据 ================= */
  function tabMaster(box) {
    /* --- 制造商 --- */
    const rpMf = P.resultPanel();
    const fMf = P.form([
      { name: 'manufacturer_id', label: '制造商 ID', type: 'text', required: true, placeholder: 'MF-XXX' },
      { name: 'name', label: '制造商名称', type: 'text', required: true },
    ]);
    const tblMf = P.dataTable({ endpoint: '/api/manufacturer/list', columns: [
      { title: 'ID', key: 'manufacturer_id', mono: true },
      { title: '名称', key: 'name' },
      { title: '状态', render: r => P.badge(r.status) },
      { title: '链适配器', key: 'adapter_type' },
      { title: '创建时间', key: 'created_at' }] });
    box.append(card('制造商注册 manufacturer/register', fMf.root,
      P.actionBar([{ label: '注册制造商', kind: 'primary', run: P.runOp({
        path: '/api/manufacturer/register',
        body: () => need(fMf.read(), 'manufacturer_id', 'name'), rp: rpMf,
        successText: '制造商已注册',
        render: d => P.kv([['ID', d.manufacturer_id], ['状态', P.badge(d.status)]]),
        note: { kind: 'MANUFACTURER', id: d => d.manufacturer_id },
        onOk: () => tblMf.reload() }) }]),
      rpMf.root, tblMf));

    /* --- 运营商 --- */
    const rpOp = P.resultPanel();
    const fOp = P.form([
      { name: 'operator_id', label: '运营商 ID', type: 'text', required: true, placeholder: 'OP-XXX' },
      { name: 'name', label: '运营商名称', type: 'text', required: true },
    ]);
    const tblOp = P.dataTable({ endpoint: '/api/operator/list', columns: [
      { title: 'ID', key: 'operator_id', mono: true },
      { title: '名称', key: 'name' },
      { title: '资质', render: r => P.badge(r.qualification_status) },
      { title: '链上组织', render: r => monoTrunc(r.chain_org_id, 24) },
      { title: '状态', render: r => P.badge(r.status) }] });
    box.append(card('运营商注册 operator/register（自动分配链上组织身份）', fOp.root,
      P.actionBar([{ label: '注册运营商', kind: 'primary', run: P.runOp({
        path: '/api/operator/register',
        body: () => need(fOp.read(), 'operator_id', 'name'), rp: rpOp,
        successText: '运营商已注册',
        render: d => P.kv([
          ['ID', d.operator_id], ['资质', P.badge(d.qualification_status)],
          ['链上组织', monoTrunc(d.chain_org_id, 32)]]),
        note: { kind: 'OPERATOR', id: d => d.operator_id },
        onOk: () => tblOp.reload() }) }]),
      rpOp.root, tblOp));

    /* --- 航段 --- */
    const rpRt = P.resultPanel();
    const fRt = P.form([
      { name: 'route_id', label: '航段 ID', type: 'text', required: true, placeholder: 'R-XXX' },
      { name: 'zone', label: '空域 Zone', type: 'text', required: true, placeholder: 'Zone-A' },
      { name: 'start_point', label: '起点', type: 'text', required: true },
      { name: 'end_point', label: '终点', type: 'text', required: true },
      { name: 'altitude_min', label: '高度下限(m)', type: 'number', value: 120 },
      { name: 'altitude_max', label: '高度上限(m)', type: 'number', value: 300 },
    ]);
    const tblRt = P.dataTable({ endpoint: '/api/route/list', pageSize: 20, columns: [
      { title: 'ID', key: 'route_id', mono: true },
      { title: '空域', key: 'zone' },
      { title: '走向', render: r => r.start_point + ' → ' + r.end_point },
      { title: '高度层(m)', render: r => r.altitude_min + '–' + r.altitude_max, num: true },
      { title: '走廊状态', render: r => P.badge(r.corridor_status) }] });
    box.append(card('航段创建 route/create', fRt.root,
      P.actionBar([{ label: '创建航段', kind: 'primary', run: P.runOp({
        path: '/api/route/create',
        body: () => need(fRt.read(), 'route_id', 'zone', 'start_point', 'end_point'), rp: rpRt,
        successText: '航段已创建（corridor_status=OPEN）',
        render: d => P.kv([
          ['ID', d.route_id], ['空域', d.zone],
          ['走向', d.start_point + ' → ' + d.end_point],
          ['走廊状态', P.badge(d.corridor_status)]]),
        note: { kind: 'ROUTE', id: d => d.route_id, extra: d => ({ zone: d.zone }) },
        onOk: () => tblRt.reload() }) }]),
      rpRt.root, tblRt));
  }

  /* ================= Tab 2：无人机管理 ================= */
  function tabUavs(box) {
    const tbl = P.dataTable({
      endpoint: '/api/uav/list',
      filters: [
        { name: 'operator_id', label: '运营商', type: 'text' },
        { name: 'manufacturer_id', label: '制造商', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['REGISTERED', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED'] },
      ],
      columns: [
        { title: 'ID', key: 'uav_id', mono: true },
        { title: '型号', key: 'model' },
        { title: '序列号', key: 'serial_no', mono: true },
        { title: '运营商', key: 'operator_id' },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          onClick: e => { e.stopPropagation(); openUav(r.uav_id); } }, '详情') },
      ],
    });

    /* --- 注册（含跨链存证） --- */
    const rpReg = P.resultPanel();
    const fReg = P.form([
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true, placeholder: 'UAV-X-001' },
      { name: 'serial_no', label: '序列号', type: 'text', required: true },
      { name: 'model', label: '型号', type: 'text', required: true },
      { name: 'manufacturer_id', label: '制造商 ID', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'operator_id', label: '运营商 ID', type: 'text', required: true },
    ]);
    box.append(card('无人机注册 uav/register（自动生成 UAV_REGISTER_PROOF 三链存证）', fReg.root,
      P.actionBar([{ label: '注册无人机', kind: 'primary', run: P.runOp({
        path: '/api/uav/register',
        body: () => need(fReg.read(), 'uav_id', 'serial_no', 'model', 'manufacturer_id', 'operator_id'),
        rp: rpReg, successText: '注册成功，跨链存证已生成',
        render: d => h('div', {},
          P.kv([['ID', d.uav.uav_id], ['状态', P.badge(d.uav.status)],
            ['SM9 身份', monoTrunc(d.uav.sm9_identity, 40)]]),
          P.cxTrail(d.crosschain)),
        note: { kind: 'UAV', id: d => d.uav.uav_id, extra: d => ({ operator_id: d.uav.operator_id }) },
        onOk: d => {
          STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.crosschain.business_id });
          tbl.reload();
        } }) }]),
      rpReg.root));

    /* --- 状态机 --- */
    const rpSt = P.resultPanel();
    const fSt = P.form([
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'action', label: '动作', type: 'select', value: 'VERIFY',
        options: ['VERIFY', 'ACTIVATE', 'SUSPEND', 'RESUME'] },
    ]);
    box.append(card('状态机 uav/status（REGISTERED →VERIFY→ VERIFIED →ACTIVATE→ ACTIVE；SUSPEND ⇄ RESUME）',
      fSt.root,
      h('p', { class: 'p-field-hint' },
        'VERIFY 的跨链中继可能失败（FAILED）——同动作重发即幂等重试，跨链台账会留 retry_of 痕迹；重复 VERIFY 已核验机器返回 2004 幂等拒绝。'),
      P.actionBar([{ label: '执行状态动作', kind: 'primary', run: P.runOp({
        path: '/api/uav/status', body: () => need(fSt.read(), 'uav_id', 'action'), rp: rpSt,
        render: d => h('div', {},
          P.kv([['ID', d.uav.uav_id], ['状态', P.badge(d.uav.status)]]),
          d.crosschain ? P.cxTrail(d.crosschain) : null),
        note: { kind: 'UAV', id: d => d.uav.uav_id },
        onOk: () => tbl.reload() }) }]),
      rpSt.root));

    /* --- 注销 --- */
    const rpRv = P.resultPanel();
    const fRv = P.form([
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'Operator-A' },
      { name: 'reason', label: '注销原因', type: 'textarea', required: true },
    ]);
    box.append(card('无人机注销 uav/revoke（不可逆，状态→REVOKED）', fRv.root,
      P.actionBar([{ label: '注销', kind: 'danger',
        confirm: { title: '确认注销', msg: '注销后该无人机不可再用于新任务（状态→REVOKED）。', ok: '确认注销' },
        run: P.runOp({
          path: '/api/uav/revoke', body: () => need(fRv.read(), 'uav_id', 'operator', 'reason'),
          rp: rpRv, render: d => P.kv([['ID', d.uav_id], ['状态', P.badge(d.status)]]),
          note: { kind: 'UAV', id: d => d.uav_id }, onOk: () => tbl.reload() }) }]),
      rpRv.root));

    box.append(card('无人机台账 uav/list', tbl));
  }

  async function openUav(uavId) {
    const d = P.drawer('无人机详情 ' + uavId, P.empty('⏳ 查询中…'));
    const body = d.root.querySelector('.p-drawer-body');
    const r = await API.call('/api/uav/query', { uav_id: uavId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    const u = r.data;
    body.append(P.kv([
      ['ID', h('code', { class: 'p-mono' }, u.uav_id)],
      ['型号', u.model], ['序列号', u.serial_no],
      ['制造商', u.manufacturer_id], ['运营商', u.operator_id],
      ['状态', P.badge(u.status)],
      ['SM9 身份', monoTrunc(u.sm9_identity, 48)],
      ['创建时间', u.created_at], ['更新时间', u.updated_at],
    ]), h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
    STORE.note('UAV', u.uav_id, { operator_id: u.operator_id });
  }

  /* ================= Tab 3：任务管理 ================= */
  function tabMissions(box) {
    const tbl = P.dataTable({
      endpoint: '/api/mission/list',
      filters: [
        { name: 'operator_id', label: '运营商', type: 'text' },
        { name: 'uav_id', label: '无人机', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['DRAFT', 'SUBMITTED', 'REVIEWING', 'COORDINATING', 'APPROVED',
            'REJECTED', 'EXECUTING', 'COMPLETED', 'ABORTED'] },
      ],
      columns: [
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '运营商', key: 'operator_id' },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '描述（脱敏）', key: 'masked_value' },
        { title: '时窗', render: r => UI.trunc(r.start_time, 16) + ' → ' + UI.trunc(r.end_time, 16) },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          onClick: e => { e.stopPropagation(); openMission(r.mission_id); } }, '详情') },
      ],
    });

    /* --- 创建 --- */
    const rpCr = P.resultPanel();
    const fCr = P.form([
      { name: 'operator_id', label: '运营商 ID', type: 'text', required: true },
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true },
      { name: 'mission_type', label: '任务类型', type: 'text', required: true,
        placeholder: 'INSPECTION / MEDICAL / LOGISTICS…' },
      { name: 'payload_type', label: '载荷类型', type: 'text', required: true,
        placeholder: 'CARGO / CAMERA…' },
      { name: 'description', label: '任务描述', type: 'textarea', required: true,
        hint: '描述经 SM9 加密入库——界面与台账只显示脱敏值 masked_value，明文不出运营商域' },
      { name: 'route_segments', label: '航段（多选）', type: 'multi', options: [], required: true,
        hint: '选项自动取自 route/list' },
      { name: 'altitude_min', label: '高度下限(m)', type: 'number', value: 120 },
      { name: 'altitude_max', label: '高度上限(m)', type: 'number', value: 300 },
      { name: 'start_time', label: '开始时间', type: 'datetime', value: UI.datetimeLocal(60) },
      { name: 'end_time', label: '结束时间', type: 'datetime', value: UI.datetimeLocal(240) },
    ]);
    API.call('/api/route/list', { page: 1, page_size: 200 }).then(r => {
      if (r.ok) fCr.setOptions('route_segments', (r.data.records || []).map(x =>
        [x.route_id, x.route_id + ' · ' + x.zone + ' · ' + x.corridor_status]));
    });
    box.append(card('任务创建 mission/create（描述密文入库，脱敏展示）', fCr.root,
      P.actionBar([{ label: '创建任务', kind: 'primary', run: P.runOp({
        path: '/api/mission/create',
        body: () => need(fCr.read(), 'operator_id', 'uav_id', 'mission_type',
          'payload_type', 'description', 'route_segments'),
        rp: rpCr, successText: '任务已创建（DRAFT），描述已密文入库',
        render: d => P.kv([
          ['任务号', h('code', { class: 'p-mono' }, d.mission_id)],
          ['状态', P.badge(d.status)],
          ['脱敏值', d.masked_value],
          ['涉及空域', (d.zones || []).join('、')],
          ['航段', (d.route_segments || []).join('、')],
          ['SM3 摘要', monoTrunc(d.sm3_hash, 40)]]),
        note: { kind: 'MISSION', id: d => d.mission_id,
          extra: d => ({ operator_id: d.operator_id, uav_id: d.uav_id }) },
        onOk: () => tbl.reload() }) }]),
      rpCr.root));

    /* --- 提交 --- */
    const rpSb = P.resultPanel();
    const fSb = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'operator', label: '提交人', type: 'text', required: true, value: 'Operator-A' },
    ]);
    box.append(card('任务提交 mission/submit（源链交易 + MISSION_APPLICATION 跨链中继至管理链）',
      fSb.root,
      P.actionBar([{ label: '提交审核', kind: 'primary', run: P.runOp({
        path: '/api/mission/submit', body: () => need(fSb.read(), 'mission_id', 'operator'),
        rp: rpSb, successText: '已提交，跨链申请存证已生成',
        render: d => h('div', {},
          P.kv([
            ['申请号', h('code', { class: 'p-mono' }, d.application.application_id)],
            ['源链', P.chainTag(d.application.source_chain)],
            ['源链 TxID', monoTrunc(d.application.source_tx_id, 40)],
            ['申请状态', P.badge(d.application.status)]]),
          P.cxTrail(d.crosschain)),
        note: { kind: 'APPLICATION', id: d => d.application.application_id,
          extra: d => ({ mission_id: d.application.mission_id }) },
        onOk: d => { STORE.note('CROSS_TX', d.crosschain.cross_tx_id); tbl.reload(); } }) }]),
      rpSb.root));

    /* --- 冲突检测 / 消解 --- */
    const rpCf = P.resultPanel();
    const fCf = P.form([
      { name: 'mission_id', label: '任务号（主动方）', type: 'text', required: true },
    ]);
    const rpRs = P.resultPanel();
    const fRs = P.form([
      { name: 'conflict_id', label: '冲突 ID', type: 'text', required: true },
      { name: 'operator', label: '处置人', type: 'text', required: true, value: 'Operator-A' },
      { name: 'resolution', label: '处置方案', type: 'textarea', required: true,
        placeholder: '如：错峰 30 分钟 / 变更高度层 / 改航段' },
    ]);
    box.append(card('空域冲突 conflict/detect · conflict/resolve（时间×航路×高度三维重叠判定）',
      fCf.root,
      P.actionBar([{ label: '检测冲突', run: P.runOp({
        path: '/api/conflict/detect', body: () => need(fCf.read(), 'mission_id'), rp: rpCf,
        render: d => h('div', {},
          P.statCards([{ label: '命中冲突', value: d.count, tone: d.count > 0 ? 'warning' : 'good' }]),
          h('div', {}, (d.conflicts || []).map(c => P.kv([
            ['冲突 ID', h('code', { class: 'p-mono' }, c.conflict_id)],
            ['类型', P.badge(c.conflict_type)],
            ['任务 A / B', c.mission_id_a + '  ×  ' + c.mission_id_b],
            ['状态', P.badge(c.status)],
            ['协调建议', c.suggestion || '—']]))))),
        onOk: () => tbl.reload() }) }]),
      rpCf.root,
      h('hr', { class: 'p-hr' }),
      fRs.root,
      h('p', { class: 'p-field-hint' },
        '检测命中后主动方任务进入 COORDINATING；消解成功→RESOLVED。同一冲突重复消解将被 3004 拒绝（幂等保护，设计内）。'),
      P.actionBar([{ label: '消解冲突', kind: 'primary', run: P.runOp({
        path: '/api/conflict/resolve',
        body: () => need(fRs.read(), 'conflict_id', 'operator', 'resolution'), rp: rpRs,
        successText: '冲突已消解',
        note: { kind: 'CONFLICT', id: d => (d && d.conflict_id) || '' },
        onOk: () => tbl.reload() }) }]),
      rpRs.root));

    box.append(card('任务台账 mission/list', tbl));
  }

  async function openMission(missionId) {
    const d = P.drawer('任务详情 ' + missionId, P.empty('⏳ 查询中…'));
    const body = d.root.querySelector('.p-drawer-body');
    const r = await API.call('/api/mission/query', { mission_id: missionId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    const m = r.data;
    body.append(P.kv([
      ['任务号', h('code', { class: 'p-mono' }, m.mission_id)],
      ['状态', P.badge(m.status)],
      ['运营商', m.operator_id], ['无人机', m.uav_id],
      ['类型 / 载荷', m.mission_type + ' / ' + m.payload_type],
      ['描述（脱敏）', m.masked_value],
      ['航段', (m.route_segments || []).join('、')],
      ['空域', (m.zones || []).join('、')],
      ['高度层(m)', m.altitude_min + ' – ' + m.altitude_max],
      ['时窗', m.start_time + ' → ' + m.end_time],
      ['SM3 摘要', monoTrunc(m.sm3_hash, 48)],
      ['SM9 身份', monoTrunc(m.sm9_identity, 32)],
      ['签名', monoTrunc(m.signature, 48)],
    ]), h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
    STORE.note('MISSION', m.mission_id, { operator_id: m.operator_id, uav_id: m.uav_id });
  }

  /* ================= Tab 4：许可与存证 ================= */
  function tabPasses(box) {
    const tbl = P.dataTable({
      endpoint: '/api/pass/list',
      filters: [
        { name: 'mission_id', label: '任务号', type: 'text' },
        { name: 'uav_id', label: '无人机', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['GENERATING', 'VALID', 'USED', 'EXPIRED', 'REVOKED'] },
      ],
      columns: [
        { title: '许可号', key: 'pass_id', mono: true },
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '生效', key: 'valid_from' },
        { title: '失效', key: 'valid_to' },
      ],
    });
    const rpQ = P.resultPanel();
    const fQ = P.form([
      { name: 'pass_id', label: '许可号', type: 'text', required: true, hint: '可点上方 chips 复制' },
    ]);
    box.append(card('飞行前自查 pass/query · pass/verify', fQ.root,
      P.actionBar([
        { label: '查询详情', run: P.runOp({
          path: '/api/pass/query', body: () => need(fQ.read(), 'pass_id'), rp: rpQ,
          render: d => P.kv([
            ['许可号', d.pass_id], ['状态', P.badge(d.status)],
            ['任务号', d.mission_id], ['无人机', d.uav_id],
            ['航路', d.route], ['生效', d.valid_from], ['失效', d.valid_to],
            ['SM3 摘要', monoTrunc(d.sm3_hash, 40)]]),
          note: { kind: 'PASS', id: d => d.pass_id } }) },
        { label: '验证有效性', kind: 'primary', run: P.runOp({
          path: '/api/pass/verify', body: () => need(fQ.read(), 'pass_id'), rp: rpQ,
          render: d => h('div', {},
            P.statCards([{ label: 'valid（可否起飞）', value: String(d.valid),
              tone: d.valid ? 'good' : 'critical' }]),
            P.kv([['许可状态', P.badge(d.status)],
              ['原因', (d.reasons || []).join('；') || '—']])) }) },
      ]), rpQ.root));
    box.append(card('许可台账 pass/list', tbl));
    box.append(card('跨链存证台账 crosschain/list（点行看四段 TxID 详情）',
      P.dataTable({
        endpoint: '/api/crosschain/list',
        filters: [
          { name: 'message_type', label: '类型', type: 'select',
            options: ['UAV_REGISTER_PROOF', 'MISSION_APPLICATION', 'MISSION_REVIEW_RESULT',
              'FLIGHT_PASS', 'PASS_REVOKE'] },
          { name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] },
        ],
        columns: [
          { title: 'cross_tx_id', render: r => UI.trunc(r.cross_tx_id, 22), mono: true },
          { title: '类型', key: 'message_type' },
          { title: '业务单号', render: r => UI.trunc(r.business_id, 18), mono: true },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '验签', key: 'verify_result' },
          { title: '时延(ms)', key: 'latency_ms', num: true },
          { title: '创建时间', key: 'created_at' },
        ],
        onRow: rec => P.openCxDetail(rec.cross_tx_id),
      })));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['wb-operator'] = { render };
})();
```

- [ ] **Step 2: index.html 引入 + 语法门**

`<script src="js/pages/overview.js"></script>` 之后加 `<script src="js/pages/wb-operator.js"></script>`。
Run: `node --check frontend/js/pages/wb-operator.js` → 通过。

- [ ] **Step 3: 浏览器端到端验证（sim 后端 + demo/init 后）**

打开 `#/wb-operator`，按序操作并核对：
1. 主数据 tab：注册 `MF-TEST-1/测试制造商`、`OP-TEST-1/测试运营商` → 成功 kv + 表格自动刷新出现新行；chips 条出现 MANUFACTURER/OPERATOR。创建航段 `R-T1/Zone-T/P1/P2` → corridor_status=OPEN 徽章。
2. 无人机 tab：注册 `UAV-T-001`（制造商/运营商用上一步 ID）→ 结果面板出现**四段跨链存证组件**（UAV_REGISTER_PROOF），chips 出现 UAV + CROSS_TX；状态机 VERIFY → VERIFIED、ACTIVATE → ACTIVE（台账状态徽章同步）；对 ACTIVE 机器再 VERIFY → errCard 2004 且**带 EXPLAIN 词典解说**。
3. 任务 tab：创建任务（航段多选自动列出 R-T1 等；描述任意）→ masked_value 脱敏回显；提交 → application_id + MISSION_APPLICATION cxTrail；chips 出现 MISSION/APPLICATION。
4. 冲突：再建一条同航段重叠时窗任务并提交 → 对第一条 detect → count≥1、冲突卡显示 conflict_id/类型/A×B；resolve → RESOLVED；**再 resolve 同 ID → errCard 3004 带解说**（设计内）。
5. 许可 tab：此时无许可（签发在管理方台）——pass/verify 随便输一个 ID → errCard 6002 带解说；跨链台账过滤 message_type=UAV_REGISTER_PROOF 只剩注册存证行，点行开 openCxDetail 抽屉全字段。
6. 深链：地址栏直接输 `#/wb-operator?tab=passes` → 落在许可 tab。
7. 注销 UAV-T-001（confirm 弹窗）→ REVOKED。

- [ ] **Step 4: Commit**

```bash
git add frontend/js/pages/wb-operator.js frontend/index.html
git commit -m "feat(frontend): 运营商工作台——主数据/无人机全生命周期/任务与冲突/许可自查与跨链存证

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: wb-manager.js —— 管理方审核台

**Files:**
- Create: `frontend/js/pages/wb-manager.js`
- Modify: `frontend/index.html`（script 引入）

**Interfaces:**
- Consumes: PUI/STORE（同 Task 6）；`need()/card()/monoTrunc()` 三个小工具在本文件内再定义一份（**有意重复**：每工作台模块自包含，不跨页依赖）。
- Produces: `PAGES['wb-manager'] = { render }`；tab keys：`queue` / `records` / `passes`。
- 后端契约要点：
  - `review/submit` req：`{application_id, result:APPROVED|REJECTED|NEED_COORDINATION, reviewer, comment, rules_hit:[]string}` → `data = {review:{review_id,application_id,result,reviewer,rules_hit,comment,review_time}, mission:{…平铺含 masked_value/status}, crosschain:{…}}`
  - `review/query` req：`{application_id}` → `data = {records:[review…], total}`
  - `pass/issue` req：`{pass_id, mission_id, issuer, valid_from, valid_to}` → `data = {pass:{pass_id,mission_id,uav_id,route,status,sm3_hash,signature,created_at}, crosschain:{…}}`（同 pass_id 重发=复用重试，幂等）
  - `pass/revoke` req：`{pass_id, operator, reason}` → `data = {pass:{…status=REVOKED}, crosschain:{…}, crosschain_status}`（跨链重发本地先行：crosschain_status 可能 FAILED 而本地已 REVOKED）
  - **待审发现机制（不依赖 store，跨浏览器成立）**：`crosschain/list {message_type:'MISSION_APPLICATION', status:'SUCCESS'}` 的 `business_id` 即 application_id；逐行 `review/query` 判定已审/待审；任务详情面板走 `mission/list {status:'SUBMITTED'}`。

- [ ] **Step 1: 写 wb-manager.js（完整代码）**

```js
/* wb-manager.js —— 管理方审核台 #/wb-manager：待审队列 / 审核记录 / 许可管理。
   待审队列由跨链台账驱动（crosschain/list MISSION_APPLICATION），不依赖本地缓存——
   换浏览器、清缓存、重启后端后队列依然完整。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  function need(v, ...names) {
    const miss = names.filter(n => v[n] === undefined || v[n] === '' ||
      (Array.isArray(v[n]) && !v[n].length));
    if (miss.length) { UI.toast('缺少必填项：' + miss.join('、'), 'err'); return null; }
    return v;
  }
  const monoTrunc = (s, n) => h('code', { class: 'p-mono' }, UI.trunc(s, n || 40));

  function render(root) {
    root.append(P.pageHead({
      title: '管理方审核台',
      sub: '跨链台账驱动的待审队列 · 审核裁决回传 · 飞行许可签发与吊销',
    }));
    root.append(P.chipBar());
    root.append(P.tabs([
      { key: 'queue', label: '待审队列', render: tabQueue },
      { key: 'records', label: '审核记录', render: tabRecords },
      { key: 'passes', label: '许可管理', render: tabPasses },
    ]));
  }

  /* ================= Tab 1：待审队列 ================= */
  function tabQueue(box) {
    box.append(h('div', { class: 'p-note' },
      '队列发现机制：跨链台账 crosschain/list（message_type=MISSION_APPLICATION, status=SUCCESS）的',
      h('b', {}, ' business_id 即申请号'),
      '；逐行 review/query 标注已审/待审。任务详情面板独立来自 mission/list（status=SUBMITTED），两者均以链上台账为准，与本地缓存无关。'));

    let tblA = null, tblB = null;
    const reloadAll = () => { if (tblA) tblA.reload(); if (tblB) tblB.reload(); };

    /* --- 面板 A：跨链申请台账 --- */
    tblA = P.dataTable({
      endpoint: '/api/crosschain/list',
      baseBody: { message_type: 'MISSION_APPLICATION', status: 'SUCCESS' },
      columns: [
        { title: '申请号（business_id）', render: r => UI.trunc(r.business_id, 24), mono: true },
        { title: 'cross_tx_id', render: r => UI.trunc(r.cross_tx_id, 18), mono: true },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '申请时间', key: 'created_at' },
        { title: '审核状态', render: r => h('span', { 'data-rv': r.business_id }, '⏳') },
        { title: '操作', render: r => h('span', { class: 'p-row' },
          h('button', { class: 'p-btn p-btn-sm p-btn-primary',
            onClick: e => { e.stopPropagation(); reviewDrawer(r.business_id, reloadAll); } }, '审核'),
          h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: e => { e.stopPropagation(); P.openCxDetail(r.cross_tx_id); } }, '存证')) },
      ],
      onLoaded: recs => {
        recs.forEach(rec => {
          API.call('/api/review/query', { application_id: rec.business_id }).then(r => {
            const el = tblA.querySelector('[data-rv="' + CSS.escape(rec.business_id) + '"]');
            if (!el) return;
            el.innerHTML = '';
            el.append(r.ok && r.data.total > 0 ? P.badge('REVIEWED') : P.badge('PENDING'));
            if (r.ok && r.data.total > 0) el.title = '已审 ' + r.data.total + ' 次';
          });
        });
      },
      emptyText: '暂无跨链申请（运营商提交任务后自动出现）',
    });
    box.append(card('跨链申请台账（MISSION_APPLICATION · SUCCESS）', tblA));

    /* --- 面板 B：待审任务详情面板 --- */
    tblB = P.dataTable({
      endpoint: '/api/mission/list',
      baseBody: { status: 'SUBMITTED' },
      columns: [
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '运营商', key: 'operator_id' },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '描述（脱敏）', key: 'masked_value' },
        { title: '时窗', render: r => UI.trunc(r.start_time, 16) + ' → ' + UI.trunc(r.end_time, 16) },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          onClick: e => { e.stopPropagation(); missionDrawer(r.mission_id); } }, '详情') },
      ],
      emptyText: '暂无待审任务',
    });
    box.append(card('待审任务面板（mission/list · SUBMITTED；管理方只见脱敏值）', tblB));
  }

  /* 审核抽屉：历史 + 裁决表单 + 跨链回传存证 */
  function reviewDrawer(applicationId, onDone) {
    const rp = P.resultPanel();
    const histBox = h('div', {}, P.empty('⏳ 加载审核历史…'));
    const f = P.form([
      { name: 'result', label: '裁决', type: 'select', value: 'APPROVED',
        options: ['APPROVED', 'REJECTED', 'NEED_COORDINATION'] },
      { name: 'reviewer', label: '审核员', type: 'text', required: true, value: 'Manager-A' },
      { name: 'rules_hit', label: '命中规则（逗号分隔，可留空）', type: 'text',
        placeholder: '如 ZONE_LIMIT,TIME_WINDOW' },
      { name: 'comment', label: '审核意见', type: 'textarea' },
    ]);
    const d = P.drawer('审核裁决 · 申请 ' + applicationId,
      h('div', { class: 'p-drawer-sec' }, '审核历史 review/query', histBox),
      h('div', { class: 'p-drawer-sec' }, '裁决 review/submit（MISSION_REVIEW_RESULT 跨链回传源链）',
        f.root,
        P.actionBar([{ label: '提交裁决', kind: 'primary',
          confirm: { title: '提交裁决', msg: '裁决将跨链回传源链并推进任务状态机，确认提交？', ok: '提交' },
          run: P.runOp({
            path: '/api/review/submit',
            body: () => {
              const v = need(f.read(), 'result', 'reviewer');
              if (!v) return null;
              return {
                application_id: applicationId,
                result: v.result, reviewer: v.reviewer,
                comment: v.comment || '',
                rules_hit: v.rules_hit
                  ? String(v.rules_hit).split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
              };
            },
            rp, successText: '裁决已提交并跨链回传',
            render: x => h('div', {},
              P.kv([
                ['审核号', monoTrunc(x.review.review_id, 32)],
                ['裁决', P.badge(x.review.result)],
                ['任务号', x.mission.mission_id],
                ['任务新状态', P.badge(x.mission.status)],
                ['任务描述（管理方视角）', x.mission.masked_value]]),
              P.cxTrail(x.crosschain)),
            onOk: x => {
              STORE.note('CROSS_TX', x.crosschain.cross_tx_id, { business_id: applicationId });
              loadHist(); if (onDone) onDone();
            } }) }]),
        rp.root));
    function loadHist() {
      histBox.innerHTML = ''; histBox.append(P.empty('⏳ 加载审核历史…'));
      API.call('/api/review/query', { application_id: applicationId }).then(r => {
        histBox.innerHTML = '';
        if (!r.ok) { histBox.append(P.errCard(r)); return; }
        if (!r.data.total) { histBox.append(P.empty('尚无审核记录（待审）')); return; }
        (r.data.records || []).forEach(x => histBox.append(P.kv([
          ['审核号', monoTrunc(x.review_id, 32)], ['裁决', P.badge(x.result)],
          ['审核员', x.reviewer], ['规则', (x.rules_hit || []).join('、') || '—'],
          ['意见', x.comment || '—'], ['时间', x.review_time]])));
      });
    }
    loadHist();
    return d;
  }

  async function missionDrawer(missionId) {
    const d = P.drawer('待审任务 ' + missionId, P.empty('⏳ 查询中…'));
    const body = d.root.querySelector('.p-drawer-body');
    const r = await API.call('/api/mission/query', { mission_id: missionId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    const m = r.data;
    body.append(
      h('div', { class: 'p-note' }, '隐私说明：任务描述以 SM9 密文入库，管理方视角仅见脱敏值——明文只在监管授权开箱后出现。'),
      P.kv([
        ['任务号', h('code', { class: 'p-mono' }, m.mission_id)],
        ['状态', P.badge(m.status)],
        ['运营商', m.operator_id], ['无人机', m.uav_id],
        ['类型 / 载荷', m.mission_type + ' / ' + m.payload_type],
        ['描述（脱敏）', m.masked_value],
        ['航段', (m.route_segments || []).join('、')],
        ['空域', (m.zones || []).join('、')],
        ['高度层(m)', m.altitude_min + ' – ' + m.altitude_max],
        ['时窗', m.start_time + ' → ' + m.end_time]]),
      h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
  }

  /* ================= Tab 2：审核记录 ================= */
  function tabRecords(box) {
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'application_id', label: '申请号', type: 'text', required: true, hint: '可点上方 chips 复制（APPLICATION）' },
    ]);
    box.append(card('按申请号查审核记录 review/query', f.root,
      P.actionBar([{ label: '查询', run: P.runOp({
        path: '/api/review/query', body: () => need(f.read(), 'application_id'), rp,
        render: d => h('div', {},
          P.statCards([{ label: '审核次数', value: d.total }]),
          h('div', {}, (d.records || []).map(x => P.kv([
            ['审核号', monoTrunc(x.review_id, 32)], ['裁决', P.badge(x.result)],
            ['审核员', x.reviewer], ['规则', (x.rules_hit || []).join('、') || '—'],
            ['意见', x.comment || '—'], ['时间', x.review_time]])))),
      }) }]), rp.root));
    box.append(card('裁决回传存证（MISSION_REVIEW_RESULT）',
      P.dataTable({
        endpoint: '/api/crosschain/list',
        baseBody: { message_type: 'MISSION_REVIEW_RESULT' },
        filters: [{ name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] }],
        columns: [
          { title: 'cross_tx_id', render: r => UI.trunc(r.cross_tx_id, 22), mono: true },
          { title: '业务单号', render: r => UI.trunc(r.business_id, 20), mono: true },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '时延(ms)', key: 'latency_ms', num: true },
          { title: '创建时间', key: 'created_at' }],
        onRow: rec => P.openCxDetail(rec.cross_tx_id),
        emptyText: '暂无裁决回传记录',
      })));
  }

  /* ================= Tab 3：许可管理 ================= */
  function tabPasses(box) {
    const tbl = P.dataTable({
      endpoint: '/api/pass/list',
      filters: [
        { name: 'mission_id', label: '任务号', type: 'text' },
        { name: 'uav_id', label: '无人机', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['GENERATING', 'VALID', 'USED', 'EXPIRED', 'REVOKED'] }],
      columns: [
        { title: '许可号', key: 'pass_id', mono: true },
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '生效', key: 'valid_from' }, { title: '失效', key: 'valid_to' }],
    });

    /* --- 签发 --- */
    const rpIs = P.resultPanel();
    const fIs = P.form([
      { name: 'pass_id', label: '许可号', type: 'text', required: true, placeholder: 'PASS-XXX' },
      { name: 'mission_id', label: '任务号', type: 'text', required: true, hint: '可点上方 chips 复制（MISSION）' },
      { name: 'issuer', label: '签发人', type: 'text', required: true, value: 'Manager-A' },
      { name: 'valid_from', label: '生效时间', type: 'datetime', value: UI.datetimeLocal(0) },
      { name: 'valid_to', label: '失效时间', type: 'datetime', value: UI.datetimeLocal(480) },
    ]);
    box.append(card('许可签发 pass/issue（FLIGHT_PASS：管理链 → 监管链 → 运营链）', fIs.root,
      h('p', { class: 'p-field-hint' },
        '同 pass_id 重复签发 = 复用既有许可的幂等重试（不产生第二张证）；签发前提是任务已 APPROVED。'),
      P.actionBar([{ label: '签发许可', kind: 'primary', run: P.runOp({
        path: '/api/pass/issue',
        body: () => need(fIs.read(), 'pass_id', 'mission_id', 'issuer', 'valid_from', 'valid_to'),
        rp: rpIs, successText: '许可已签发并跨链送达运营链',
        render: d => h('div', {},
          P.kv([['许可号', d.pass.pass_id], ['状态', P.badge(d.pass.status)],
            ['任务号', d.pass.mission_id], ['无人机', d.pass.uav_id],
            ['SM3 摘要', monoTrunc(d.pass.sm3_hash, 40)]]),
          P.cxTrail(d.crosschain)),
        note: { kind: 'PASS', id: d => d.pass.pass_id, extra: d => ({ mission_id: d.pass.mission_id }) },
        onOk: d => { STORE.note('CROSS_TX', d.crosschain.cross_tx_id); tbl.reload(); } }) }]),
      rpIs.root));

    /* --- 吊销 --- */
    const rpRv = P.resultPanel();
    const fRv = P.form([
      { name: 'pass_id', label: '许可号', type: 'text', required: true },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'Manager-A' },
      { name: 'reason', label: '吊销原因', type: 'textarea', required: true },
    ]);
    box.append(card('许可吊销 pass/revoke（PASS_REVOKE 跨链重发，本地先行）', fRv.root,
      h('p', { class: 'p-field-hint' },
        '本地 REVOKED 立即生效，跨链重发结果见 crosschain_status（FAILED 时会留痕但不回滚本地吊销）。'),
      P.actionBar([{ label: '吊销许可', kind: 'danger',
        confirm: { title: '确认吊销', msg: '吊销后该许可立即失效（valid=false），跨链重发 PASS_REVOKE。', ok: '确认吊销' },
        run: P.runOp({
          path: '/api/pass/revoke', body: () => need(fRv.read(), 'pass_id', 'operator', 'reason'),
          rp: rpRv, successText: '许可已吊销',
          render: d => h('div', {},
            P.kv([['许可号', d.pass.pass_id], ['状态', P.badge(d.pass.status)],
              ['跨链重发', P.badge(d.crosschain_status)]]),
            P.cxTrail(d.crosschain)),
          note: { kind: 'PASS', id: d => d.pass.pass_id },
          onOk: () => tbl.reload() }) }]),
      rpRv.root));

    /* --- 验证 --- */
    const rpVf = P.resultPanel();
    const fVf = P.form([{ name: 'pass_id', label: '许可号', type: 'text', required: true }]);
    box.append(card('许可验证 pass/verify', fVf.root,
      P.actionBar([{ label: '验证', kind: 'primary', run: P.runOp({
        path: '/api/pass/verify', body: () => need(fVf.read(), 'pass_id'), rp: rpVf,
        render: d => h('div', {},
          P.statCards([{ label: 'valid', value: String(d.valid), tone: d.valid ? 'good' : 'critical' }]),
          P.kv([['状态', P.badge(d.status)], ['原因', (d.reasons || []).join('；') || '—']])) }) }]),
      rpVf.root));

    box.append(card('许可台账 pass/list', tbl));
    box.append(card('许可跨链存证（FLIGHT_PASS / PASS_REVOKE）',
      P.dataTable({
        endpoint: '/api/crosschain/list',
        filters: [{ name: 'message_type', label: '类型', type: 'select',
          options: ['FLIGHT_PASS', 'PASS_REVOKE'] }],
        columns: [
          { title: 'cross_tx_id', render: r => UI.trunc(r.cross_tx_id, 22), mono: true },
          { title: '类型', key: 'message_type' },
          { title: '业务单号', render: r => UI.trunc(r.business_id, 20), mono: true },
          { title: '状态', render: r => P.badge(r.status) },
          { title: '时延(ms)', key: 'latency_ms', num: true }],
        onRow: rec => P.openCxDetail(rec.cross_tx_id),
        emptyText: '暂无许可存证',
      })));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['wb-manager'] = { render };
})();
```

**注（写码时落实）**：`badge('REVIEWED')` 已在 Task 3 STATUS_MAP（serious ◉）——「已审」直接复用即可，无需新增键；`p-note`（信息提示条：info 浅底、13px、圆角、内边距 10px 12px）与 `p-drawer-sec`（抽屉内分节标题：13px 粗体、上边距 14px）两条样式在本任务 product.css 追加；`p-btn-primary` 类在按钮上直接使用（Task 3 已定义）。

- [ ] **Step 2: index.html 引入 + product.css 追加 + 语法门**

`<script src="js/pages/wb-operator.js"></script>` 之后加 `<script src="js/pages/wb-manager.js"></script>`。
product.css 追加 `p-note`、`p-drawer-sec` 两条样式（规格见上注）。
Run: `node --check frontend/js/pages/wb-manager.js` → 通过。

- [ ] **Step 3: 浏览器端到端验证（sim 后端；先经 Task 6 验证流程造出一条 SUBMITTED 任务）**

打开 `#/wb-manager`：
1. 待审队列：面板 A 出现该申请（business_id=申请号），审核状态列先 ⏳ 后变 PENDING 徽章；面板 B 出现 SUBMITTED 任务，详情抽屉含隐私说明 + 只见 masked_value。
2. 点「审核」→ 抽屉（历史空态）→ 裁决 APPROVED 提交 → review kv + MISSION_REVIEW_RESULT cxTrail；关闭抽屉后面板 A 状态列变 REVIEWED、面板 B 该任务消失（已非 SUBMITTED）。
3. 对同一申请再次审核提交 → errCard（6002 复审拒绝）带 EXPLAIN 解说。
4. 审核记录 tab：按申请号查询 → 1 条记录 kv；存证表出现 MISSION_REVIEW_RESULT 行，点行开四段详情。
5. 许可管理 tab：签发 `PASS-T-01`（mission_id 用 chips）→ pass kv(VALID) + FLIGHT_PASS cxTrail；同 pass_id 再签发 → 幂等复用语义（成功、不产生第二张）；verify → valid=true；吊销（confirm）→ REVOKED + crosschain_status 徽章 + PASS_REVOKE 存证；再 verify → valid=false + reasons 列表。
6. 清空 localStorage（`STORE.clear()`）并刷新 → 待审队列依然完整（跨链台账驱动）。
7. 深链 `#/wb-manager?tab=passes` 落在许可管理。

- [ ] **Step 4: Commit**

```bash
git add frontend/js/pages/wb-manager.js frontend/index.html frontend/css/product.css
git commit -m "feat(frontend): 管理方审核台——跨链台账驱动待审队列/裁决回传/许可签发吊销验证

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 8: wb-security.js —— 链网安全运营中心

**Files:**
- Create: `frontend/js/pages/wb-security.js`
- Modify: `frontend/index.html`（script 引入）
- Modify: `frontend/js/pui.js`（STATUS_MAP 增补 `INIT: ['info', '◌']` 一行）
- Modify: `frontend/css/product.css`（追加 `p-topo-box`、`p-verdict` 样式）

**Interfaces:**
- Consumes: PUI（含 topoSVG/pathHops/scoreBars）、STORE、`need()/card()/monoTrunc()` 本文件内再定义（同 Task 7 约定）。
- Produces: `PAGES['wb-security'] = { render }`；tab keys：`topo` / `sessions` / `traffic` / `drill` / `lab`。
- 后端契约要点（已核实源码）：
  - `node/register` req：`{node_id, node_type:UAV|EDGE|MANAGEMENT|ATTACKER, position:{X,Y}, neighbors?:[]string, sm9_identity?, status?:ONLINE|OFFLINE}`（sm9 缺省自动派生；status 只收 ONLINE|OFFLINE，ISOLATED 由攻防处置产生；重复 node_id → 1001 参数错）
  - 拓扑图为**无向图**（BuildGraph 对邻接去重排序）——新节点 neighbors 写 `["N1"]` 即可双向连通
  - `session/open` req：`{uav_id(必填), mission_id?, pass_id?, source_node?, target_node?, signature?}`；source_node 缺省 `<uav_id>-NODE`、target 缺省 `MGR`；节点不存在→4003、无可达路径→4004；signature 空=平台代签（演示路径）
  - `message/send` req：`{session_id, msg_type(6 类), source_node?, target_node?}` → `data = {message:{message_id,session_id,msg_type,seq,path,evidence,latency_ms,created_at}, path_detail:[{from,to,latency_ms}]}`；会话 CLOSED 后发送→4002
  - `message/list` → `data = {records, total, page, page_size, stats:{count,success_count,success_rate,avg_latency_ms,p50_latency_ms,p95_latency_ms,max_latency_ms}}`
  - `wormhole/toggle` req：`{enabled:bool, operator}` → `{wormhole_enabled, nodes_affected[]}`；NODE-X/Y 带 ISOLATED 残留时重开→4001（设计内，只有 demo/reset 可复原）
  - `risk/evaluate` req：`{session_id}` → `{verdict:PASS|DETECT, risk_score, threshold, session_status, dimensions:{identity,adjacency,latency,challenge,path}, events[]}`
  - `path/switch` req：`{session_id, operator}` → `{session, original_path, new_path, recovery_latency_ms, event}`；仅 DEGRADED 会话可切，健康会话→4002（设计内）
  - `event/list` 过滤 `{session_id?, action?:DETECT|ISOLATE|RECOVER, page, page_size}`；WormholeEvent 字段：`{event_id, session_id, node_x, node_y, risk_score, detection_dimensions(JSON文本), action, original_path, new_path, recovery_latency_ms, created_at}`
  - `experiment/run` req：`{experiment_type(11 类), scenario?(仅 MESSAGE_FLOW：NORMAL|ATTACK|DEFENSE), count(1..1000 必填), concurrency?(1..20), config?}`——**双向严格**：非 MESSAGE_FLOW 带 scenario 会被拒；`experiment/export` 可带 `{run_id?}` 过滤

- [ ] **Step 1: 写 wb-security.js（完整代码）**

```js
/* wb-security.js —— 链网安全运营中心 #/wb-security：拓扑 / 会话 / 流量 / 攻防 / 实验。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  function need(v, ...names) {
    const miss = names.filter(n => v[n] === undefined || v[n] === '');
    if (miss.length) { UI.toast('缺少必填项：' + miss.join('、'), 'err'); return null; }
    return v;
  }
  const monoTrunc = (s, n) => h('code', { class: 'p-mono' }, UI.trunc(s, n || 40));
  const splitList = s => String(s || '').split(/[,，]/).map(x => x.trim()).filter(Boolean);

  function render(root) {
    root.append(P.pageHead({
      title: '链网安全运营中心',
      sub: '链下可信网络：拓扑与会话 · 消息流量与时延 · 虫洞攻防处置 · 性能实验',
    }));
    root.append(P.chipBar());
    root.append(P.tabs([
      { key: 'topo', label: '网络拓扑', render: tabTopo },
      { key: 'sessions', label: '会话监控', render: tabSessions },
      { key: 'traffic', label: '消息流量', render: tabTraffic },
      { key: 'drill', label: '攻防演练', render: tabDrill },
      { key: 'lab', label: '性能实验', render: tabLab },
    ]));
  }

  /* ================= Tab 1：网络拓扑 ================= */
  function tabTopo(box) {
    const svgBox = h('div', { class: 'p-topo-box' }, P.empty('⏳ 加载拓扑…'));
    const metaBox = h('div', { class: 'p-row' });
    async function loadTopo() {
      svgBox.innerHTML = ''; svgBox.append(P.empty('⏳ 加载拓扑…')); metaBox.innerHTML = '';
      const r = await API.call('/api/topology/get', {});
      svgBox.innerHTML = '';
      if (!r.ok) { svgBox.append(P.errCard(r)); return; }
      const t = r.data;
      svgBox.append(P.topoSVG(t, null));
      metaBox.append(
        h('span', { class: 'p-badge ' + (t.wormhole_enabled ? 'p-tone-critical' : 'p-tone-good') },
          t.wormhole_enabled ? '⚠ 虫洞开启' : '● 虫洞关闭'),
        h('span', { class: 'p-badge p-tone-neutral' }, '活跃会话 ' + t.active_sessions),
        h('span', { class: 'p-badge p-tone-neutral' },
          '节点 ' + t.nodes.length + ' · 边 ' + t.edges.length),
        (t.isolated && t.isolated.length)
          ? h('span', { class: 'p-badge p-tone-critical' }, '⛔ 隔离中：' + t.isolated.join('、'))
          : null);
    }
    const rpWh = P.resultPanel();
    box.append(card('实时拓扑 topology/get（悬停边看距离/时延；⛔ 红虚线=被隔离节点）',
      P.actionBar([
        { label: '⟳ 刷新拓扑', run: loadTopo },
        { label: '开启虫洞攻击', kind: 'danger',
          confirm: { title: '开启虫洞', msg: '将在 NODE-X/Y 间建立攻击隧道，后续消息可能被诱入。确认？', ok: '开启' },
          run: P.runOp({ path: '/api/wormhole/toggle',
            body: () => ({ enabled: true, operator: 'SecOps' }), rp: rpWh,
            successText: '虫洞已开启',
            render: d => P.kv([['wormhole_enabled', String(d.wormhole_enabled)],
              ['受影响节点', (d.nodes_affected || []).join('、')]]),
            onOk: loadTopo }) },
        { label: '关闭虫洞', run: P.runOp({ path: '/api/wormhole/toggle',
          body: () => ({ enabled: false, operator: 'SecOps' }), rp: rpWh,
          successText: '虫洞已关闭', onOk: loadTopo }) },
      ]),
      rpWh.root, metaBox, svgBox));

    /* --- 节点注册 --- */
    const rpNd = P.resultPanel();
    const fNd = P.form([
      { name: 'node_id', label: '节点 ID', type: 'text', required: true,
        hint: '无人机端节点约定 <uav_id>-NODE（会话建立缺省源节点）' },
      { name: 'node_type', label: '类型', type: 'select', value: 'UAV',
        options: ['UAV', 'EDGE', 'MANAGEMENT', 'ATTACKER'] },
      { name: 'posX', label: '坐标 X', type: 'number', value: 0 },
      { name: 'posY', label: '坐标 Y', type: 'number', value: 0 },
      { name: 'neighbors', label: '邻居（逗号分隔）', type: 'text', placeholder: '如 N1；图为无向，单边声明即连通' },
      { name: 'status', label: '初始状态', type: 'select', value: 'ONLINE', options: ['ONLINE', 'OFFLINE'],
        hint: 'ISOLATED 由攻防处置产生，注册不可指定' },
    ]);
    const tblNd = P.dataTable({
      endpoint: '/api/node/list',
      filters: [
        { name: 'node_type', label: '类型', type: 'select', options: ['UAV', 'EDGE', 'MANAGEMENT', 'ATTACKER'] },
        { name: 'status', label: '状态', type: 'select', options: ['ONLINE', 'OFFLINE', 'ISOLATED'] }],
      columns: [
        { title: '节点 ID', key: 'node_id', mono: true },
        { title: '类型', key: 'node_type' },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '风险分', key: 'risk_score', num: true },
        { title: '邻居', render: r => r.neighbors },
        { title: 'SM9 身份', render: r => UI.trunc(r.sm9_identity, 20), mono: true }],
      onLoaded: () => loadTopo(),
    });
    box.append(card('节点注册 node/register（SM9 身份未提供时自动派生）', fNd.root,
      P.actionBar([{ label: '注册节点', kind: 'primary', run: P.runOp({
        path: '/api/node/register',
        body: () => {
          const v = need(fNd.read(), 'node_id', 'node_type');
          if (!v) return null;
          return { node_id: v.node_id, node_type: v.node_type,
            position: { X: Number(v.posX) || 0, Y: Number(v.posY) || 0 },
            neighbors: splitList(v.neighbors), status: v.status || 'ONLINE' };
        },
        rp: rpNd, successText: '节点已注册',
        render: d => P.kv([
          ['节点 ID', d.node_id], ['类型', d.node_type], ['状态', P.badge(d.status)],
          ['SM9 身份', monoTrunc(d.sm9_identity, 36)], ['风险分', String(d.risk_score)]]),
        note: { kind: 'NODE', id: d => d.node_id, extra: d => ({ node_type: d.node_type }) },
        onOk: () => tblNd.reload() }) }]),
      rpNd.root, tblNd));
    loadTopo();
  }

  /* ================= Tab 2：会话监控 ================= */
  function tabSessions(box) {
    const tbl = P.dataTable({
      endpoint: '/api/session/list',
      filters: [
        { name: 'mission_id', label: '任务号', type: 'text' },
        { name: 'uav_id', label: '无人机', type: 'text' },
        { name: 'status', label: '状态', type: 'select',
          options: ['ACTIVE', 'DEGRADED', 'RECOVERED', 'CLOSED'] }],
      columns: [
        { title: '会话 ID', render: r => UI.trunc(r.session_id, 20), mono: true },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '任务号', key: 'mission_id' },
        { title: '许可号', key: 'pass_id' },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '当前路径', render: r => UI.trunc(r.current_path, 30), mono: true },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          disabled: r.status === 'CLOSED',
          onClick: e => { e.stopPropagation(); closeSession(r.session_id, () => tbl.reload()); } }, '关闭') },
      ],
    });
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'uav_id', label: '无人机 ID', type: 'text', required: true,
        hint: '缺省源节点 <uav_id>-NODE；该节点须已在拓扑注册' },
      { name: 'mission_id', label: '任务号（可选）', type: 'text' },
      { name: 'pass_id', label: '许可号（可选）', type: 'text' },
      { name: 'source_node', label: '源节点（可选）', type: 'text', placeholder: '缺省 <uav_id>-NODE' },
      { name: 'target_node', label: '目标节点（可选）', type: 'text', placeholder: '缺省 MGR' },
    ]);
    box.append(card('会话建立 session/open（SM9 挑战认证 + Dijkstra 初始可信路径）', f.root,
      P.actionBar([{ label: '建立会话', kind: 'primary', run: P.runOp({
        path: '/api/session/open', body: () => need(f.read(), 'uav_id'), rp,
        successText: '会话已建立（挑战认证通过）',
        render: d => h('div', {},
          P.kv([
            ['会话 ID', h('code', { class: 'p-mono' }, d.session.session_id)],
            ['状态', P.badge(d.session.status)],
            ['认证结论', d.auth.verified ? '✓ SM9 挑战通过' : '✕ 未通过'],
            ['SM9 身份', monoTrunc(d.auth.sm9_identity, 36)],
            ['nonce', monoTrunc(d.auth.nonce, 24)],
            ['初始路径', (d.path || []).join(' → ')]]),
          h('p', { class: 'p-field-hint' },
            '虫洞开启期间建立的会话，初始路径可能已含隧道边——正是后续检测演练的前提。')),
        note: { kind: 'SESSION', id: d => d.session.session_id,
          extra: d => ({ uav_id: d.session.uav_id, mission_id: d.session.mission_id }) },
        onOk: () => tbl.reload() }) }]),
      rp.root, card('会话台账 session/list', tbl)));
  }
  function closeSession(sessionId, onDone) {
    P.confirm('关闭会话', '关闭后该会话再发消息将被 4002 拒绝（设计内）。确认关闭 ' + sessionId + '？', '关闭会话')
      .then(async ok => {
        if (!ok) return;
        const r = await API.call('/api/session/close',
          { session_id: sessionId, operator: 'SecOps', reason: '手动关闭' });
        UI.toastResult(r);
        if (r.ok) { STORE.note('SESSION', r.data.session_id); if (onDone) onDone(); }
      });
  }

  /* ================= Tab 3：消息流量 ================= */
  function tabTraffic(box) {
    const statsBox = h('div', {});
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'session_id', label: '会话 ID', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'msg_type', label: '消息类型', type: 'select', value: 'HEARTBEAT',
        options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT'] },
      { name: 'source_node', label: '源节点（可选）', type: 'text', placeholder: '缺省会话路径首端' },
      { name: 'target_node', label: '目标节点（可选）', type: 'text', placeholder: '缺省会话路径末端' },
    ]);
    const tbl = P.dataTable({
      endpoint: '/api/message/list',
      filters: [
        { name: 'session_id', label: '会话', type: 'text' },
        { name: 'msg_type', label: '类型', type: 'select',
          options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT'] },
        { name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] }],
      columns: [
        { title: '消息 ID', render: r => UI.trunc(r.message_id, 18), mono: true },
        { title: '类型', render: r => P.badge(r.msg_type) },
        { title: '路径', render: r => UI.trunc(r.source_node + ' → ' + r.target_node, 26), mono: true },
        { title: 'seq', key: 'seq', num: true },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '时间', key: 'created_at' }],
      onRow: rec => {
        P.drawer('消息 ' + rec.message_id,
          P.kv([['会话', rec.session_id], ['类型', P.badge(rec.msg_type)],
            ['seq', String(rec.seq)], ['时延', rec.latency_ms + 'ms'],
            ['实际路径', rec.path], ['SM3 摘要', UI.trunc(rec.sm3_hash, 48)]]),
          h('details', { class: 'p-rawjson' }, h('summary', {}, 'evidence / 原始 JSON'),
            UI.jsonBlock(rec)));
      },
      onLoaded: (recs, d) => {
        statsBox.innerHTML = '';
        const s = d.stats;
        if (!s) return;
        statsBox.append(P.statCards([
          { label: '消息数', value: s.count },
          { label: '成功率', value: s.success_rate + '%', tone: s.success_rate >= 99 ? 'good' : 'warning' },
          { label: 'p50', value: s.p50_latency_ms + 'ms' },
          { label: 'p95', value: s.p95_latency_ms + 'ms' },
          { label: 'max', value: s.max_latency_ms + 'ms', tone: 'info' },
        ]));
      },
    });
    box.append(card('消息发送 message/send（亚秒级链下通道，返回逐跳时延 path_detail）', f.root,
      P.actionBar([{ label: '发送消息', kind: 'primary', run: P.runOp({
        path: '/api/message/send', body: () => need(f.read(), 'session_id', 'msg_type'), rp,
        render: d => h('div', {},
          P.kv([
            ['消息 ID', monoTrunc(d.message.message_id, 28)],
            ['类型', P.badge(d.message.msg_type)],
            ['seq', String(d.message.seq)],
            ['时延', d.message.latency_ms + 'ms'],
            ['实际路径', d.message.path]]),
          h('div', { class: 'p-card-sub' }, '逐跳时延 path_detail'),
          P.pathHops(d.path_detail)),
        onOk: () => tbl.reload() }) }]),
      rp.root));
    box.append(card('流量统计 message/list stats', statsBox));
    box.append(card('消息台账 message/list（点行看详情）', tbl));
  }

  /* ================= Tab 4：攻防演练 ================= */
  function tabDrill(box) {
    const rpWh = P.resultPanel();
    box.append(card('虫洞攻击开关 wormhole/toggle（NODE-X ⇄ NODE-Y 隧道）',
      h('p', { class: 'p-field-hint' },
        'X/Y 一旦被隔离（ISOLATED），重开虫洞将被 4001 拒绝——残留只能由 demo/reset 复原（设计内：隔离是不可绕过的处置）。'),
      P.actionBar([
        { label: '开启虫洞', kind: 'danger',
          confirm: { title: '开启虫洞攻击', msg: '在 NODE-X/Y 间建立攻击隧道？', ok: '开启' },
          run: P.runOp({ path: '/api/wormhole/toggle',
            body: () => ({ enabled: true, operator: 'SecOps' }), rp: rpWh,
            render: d => P.kv([['wormhole_enabled', String(d.wormhole_enabled)],
              ['受影响节点', (d.nodes_affected || []).join('、')]]) }) },
        { label: '关闭虫洞', run: P.runOp({ path: '/api/wormhole/toggle',
          body: () => ({ enabled: false, operator: 'SecOps' }), rp: rpWh,
          render: d => P.kv([['wormhole_enabled', String(d.wormhole_enabled)]]) }) },
      ]), rpWh.root));

    const rpRk = P.resultPanel();
    const fRk = P.form([{ name: 'session_id', label: '会话 ID', type: 'text', required: true }]);
    box.append(card('会话风险评估 risk/evaluate（5 维评分 + 阈值判定 PASS/DETECT）', fRk.root,
      P.actionBar([{ label: '评估', kind: 'primary', run: P.runOp({
        path: '/api/risk/evaluate', body: () => need(fRk.read(), 'session_id'), rp: rpRk,
        render: d => h('div', {},
          h('div', { class: 'p-row' },
            h('span', { class: 'p-verdict p-tone-' + (d.verdict === 'PASS' ? 'good' : 'critical') },
              d.verdict === 'PASS' ? '✓ PASS 无异常' : '⚠ DETECT 检出攻击'),
            h('span', { class: 'p-badge p-tone-neutral' },
              'risk_score ' + Number(d.risk_score).toFixed(2) + ' / 阈值 ' + d.threshold),
            P.badge(d.session_status)),
          P.scoreBars(d.dimensions, d.threshold),
          (d.events && d.events.length)
            ? h('div', {}, h('div', { class: 'p-card-sub' }, '联动安全事件'),
                ...d.events.map(ev => P.kv([
                  ['动作', P.badge(ev.action)], ['X / Y 节点', ev.node_x + ' / ' + ev.node_y],
                  ['风险分', String(ev.risk_score)]])))
            : null) }) }]),
      rpRk.root));

    const rpSw = P.resultPanel();
    const fSw = P.form([
      { name: 'session_id', label: '会话 ID', type: 'text', required: true },
      { name: 'operator', label: '操作人', type: 'text', value: 'SecOps' },
    ]);
    box.append(card('路径规避切换 path/switch（仅 DEGRADED 会话可切；健康会话被拒 4002=设计内）', fSw.root,
      P.actionBar([{ label: '切换路径', kind: 'primary', run: P.runOp({
        path: '/api/path/switch', body: () => need(fSw.read(), 'session_id'), rp: rpSw,
        successText: '路径已切换，会话恢复',
        render: d => P.kv([
          ['原路径', d.original_path], ['新路径', d.new_path],
          ['恢复时延', d.recovery_latency_ms + 'ms'],
          ['会话状态', P.badge(d.session && d.session.status)],
          ['事件动作', d.event ? P.badge(d.event.action) : '—']]),
        note: { kind: 'SESSION', id: d => (d.session && d.session.session_id) || '' } }) }]),
      rpSw.root));

    box.append(card('安全事件台账 event/list（DETECT / ISOLATE / RECOVER 全程留痕）',
      P.dataTable({
        endpoint: '/api/event/list',
        filters: [
          { name: 'session_id', label: '会话', type: 'text' },
          { name: 'action', label: '动作', type: 'select', options: ['DETECT', 'ISOLATE', 'RECOVER'] }],
        columns: [
          { title: '事件 ID', render: r => UI.trunc(r.event_id, 18), mono: true },
          { title: '动作', render: r => P.badge(r.action) },
          { title: 'X / Y', render: r => r.node_x + ' / ' + r.node_y, mono: true },
          { title: '风险分', key: 'risk_score', num: true },
          { title: '恢复时延(ms)', key: 'recovery_latency_ms', num: true },
          { title: '时间', key: 'created_at' }],
        onRow: rec => P.drawer('安全事件 ' + rec.event_id,
          P.kv([['会话', rec.session_id], ['动作', P.badge(rec.action)],
            ['X / Y', rec.node_x + ' / ' + rec.node_y], ['风险分', String(rec.risk_score)],
            ['原路径', rec.original_path || '—'], ['新路径', rec.new_path || '—'],
            ['恢复时延', (rec.recovery_latency_ms ?? '—') + 'ms']]),
          h('details', { class: 'p-rawjson' }, h('summary', {}, '5 维评分 / 原始 JSON'),
            UI.jsonBlock(rec))),
        emptyText: '暂无安全事件',
      })));
  }

  /* ================= Tab 5：性能实验 ================= */
  const EXP_TYPES = ['CROSSCHAIN_LOOP', 'SM3_INTEGRITY', 'SM9_VERIFY', 'CONFLICT_DETECT',
    'MESSAGE_FLOW', 'RISK_SCAN', 'STRESS', 'TRACE_BATCH', 'INSPECT_UNAUTHORIZED',
    'INSPECT_AUTHORIZED', 'ALERT_BATCH'];
  function tabLab(box) {
    const tbl = P.dataTable({
      endpoint: '/api/experiment/list',
      columns: [
        { title: 'run_id', render: r => UI.trunc(r.run_id, 18), mono: true },
        { title: '类型', key: 'experiment_type' },
        { title: '场景', render: r => r.scenario || '—' },
        { title: 'count', key: 'count', num: true },
        { title: '成功率', render: r => r.success_rate + '%', num: true },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '开始时间', key: 'started_at' },
        { title: '操作', render: r => h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
          onClick: e => { e.stopPropagation(); openExp(r.run_id); } }, '结果') }],
    });
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'experiment_type', label: '实验类型', type: 'select', value: 'MESSAGE_FLOW', options: EXP_TYPES },
      { name: 'scenario', label: '场景（仅 MESSAGE_FLOW）', type: 'select', value: 'NORMAL',
        options: ['NORMAL', 'ATTACK', 'DEFENSE'],
        hint: '双向严格：MESSAGE_FLOW 必填其一，其余类型必须留空——非 MESSAGE_FLOW 时本字段自动不发送' },
      { name: 'count', label: '样本数 count（1..1000）', type: 'number', value: 10 },
      { name: 'concurrency', label: '并发（1..20，可选）', type: 'number' },
      { name: 'config', label: 'config JSON（可选）', type: 'textarea', placeholder: '{"key":"value"}' },
    ]);
    box.append(card('运行实验 experiment/run（11 类）', f.root,
      P.actionBar([{ label: '运行', kind: 'primary', run: P.runOp({
        path: '/api/experiment/run',
        body: () => {
          const v = need(f.read(), 'experiment_type', 'count');
          if (!v) return null;
          const body = { experiment_type: v.experiment_type, count: Number(v.count) };
          if (v.experiment_type === 'MESSAGE_FLOW') {
            if (!v.scenario) { UI.toast('MESSAGE_FLOW 必须选择场景 NORMAL/ATTACK/DEFENSE', 'err'); return null; }
            body.scenario = v.scenario;
          }
          if (v.concurrency) body.concurrency = Number(v.concurrency);
          if (v.config) {
            try { body.config = JSON.parse(v.config); }
            catch (_) { UI.toast('config 不是合法 JSON', 'err'); return null; }
          }
          return body;
        },
        rp, successText: '实验完成',
        render: d => h('div', {},
          P.statCards([
            { label: '成功率', value: d.success_rate + '%', tone: d.success_rate >= 99 ? 'good' : 'warning' },
            { label: '样本数', value: d.count },
            { label: '失败数', value: d.failed_count, tone: d.failed_count > 0 ? 'critical' : 'good' }]),
          P.kv([
            ['run_id', monoTrunc(d.run_id, 32)], ['类型 / 场景', d.experiment_type + ' / ' + (d.scenario || '—')],
            ['状态', P.badge(d.status)],
            ['时延 avg/p50/p95/max', [d.avg_latency_ms, d.p50_latency_ms, d.p95_latency_ms, d.max_latency_ms].join(' / ') + 'ms'],
            ['失败原因', (d.failure_reasons || []).join('；') || '无']]),
          (d.experiment_type === 'MESSAGE_FLOW' && d.scenario === 'ATTACK')
            ? h('p', { class: 'p-field-hint' }, 'ATTACK 场景的低成功率恰是检测体系生效的证明。') : null),
        onOk: () => tbl.reload() }) }]),
      rp.root));

    const fEx = P.form([{ name: 'run_id', label: 'run_id（留空=导出全部）', type: 'text' }]);
    box.append(card('实验台账与导出 experiment/list · experiment/export',
      fEx.root,
      P.csvExport({ endpoint: '/api/experiment/export', filters: () => fEx.read(),
        filename: 'experiments.csv', label: '⤓ 导出实验 CSV' }),
      tbl));
  }
  async function openExp(runId) {
    const d = P.drawer('实验结果 ' + runId, P.empty('⏳ 查询中…'));
    const body = d.root.querySelector('.p-drawer-body');
    const r = await API.call('/api/experiment/result', { run_id: runId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    const x = r.data;
    body.append(
      P.statCards([
        { label: '成功率', value: x.success_rate + '%', tone: x.success_rate >= 99 ? 'good' : 'warning' },
        { label: '成功 / 失败', value: x.success_count + ' / ' + x.failed_count }]),
      P.kv([
        ['run_id', monoTrunc(x.run_id, 40)],
        ['类型 / 场景', x.experiment_type + ' / ' + (x.scenario || '—')],
        ['count', String(x.count)], ['状态', P.badge(x.status)],
        ['时延 avg', x.avg_latency_ms + 'ms'], ['p50', x.p50_latency_ms + 'ms'],
        ['p95', x.p95_latency_ms + 'ms'], ['max', x.max_latency_ms + 'ms'],
        ['失败原因', (x.failure_reasons || []).join('；') || '无'],
        ['开始 / 完成', x.started_at + ' → ' + x.completed_at],
        ['config', x.config ? JSON.stringify(x.config) : '—']]),
      h('details', { class: 'p-rawjson' }, h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['wb-security'] = { render };
})();
```

**注（写码时落实）**：`UI.toastResult` 为旧 ui.js 现成函数（成功绿/失败红 toast），closeSession 直接复用；experiment/list 的 `status` 值为 `DONE`（STATUS_MAP 已有映射）。

- [ ] **Step 2: index.html 引入 + pui.js STATUS_MAP 增补 + product.css 追加 + 语法门**

1. `<script src="js/pages/wb-manager.js"></script>` 之后加 `<script src="js/pages/wb-security.js"></script>`。
2. pui.js STATUS_MAP 对象中增补一行：`INIT: ['info', '◌'],`（会话初始态）。
3. product.css 追加：`p-topo-box`（面板底、1px 边框、圆角、内边距 8px、SVG 居中、溢出滚动）；`p-verdict`（大号判定徽章：15px 粗体、圆角 8px、内边距 6px 14px，`p-tone-good/critical` 用对应前景+浅底）。
4. Run: `node --check frontend/js/pages/wb-security.js && node --check frontend/js/pui.js` → 通过。

- [ ] **Step 3: 浏览器端到端验证（sim 后端 + demo/init；沿用种子拓扑）**

打开 `#/wb-security`：
1. 拓扑 tab：SVG 显示 8 种子节点（NODE-X/Y 红、OFFLINE 空心）、meta 行虫洞关闭徽章；开启虫洞（confirm）→ 徽章变「⚠ 虫洞开启」、X–Y 间出现红虚线边。
2. 注册节点 `UAV-T-001-NODE`（UAV, X=0,Y=0, neighbors=N1）→ 成功 kv，拓扑刷新出现新节点（无向连通验证：仅单边声明）。重复注册同 ID → errCard 1001。
3. 会话 tab：建立会话 uav_id=UAV-A-001 → 认证 ✓、初始路径 6 节点；台账出现 INIT 徽章行；关闭会话（confirm）→ CLOSED，关闭按钮变灰。
4. 流量 tab：对新开会话发 HEARTBEAT → message kv + path_detail 逐跳条；message/list stats 卡出现成功率/p50/p95；过滤 msg_type 生效；点行开抽屉。对 CLOSED 会话发送 → errCard 4002 带解说。
5. 攻防 tab：开虫洞后**新建**会话（初始路径含隧道）→ risk/evaluate 显示 DETECT 大红徽章 + 5 维条（adjacency/latency 超阈值变红）+ 联动事件；path/switch → 新旧路径 + 恢复时延 + RECOVERED；对健康会话 path/switch → errCard 4002；隔离后再开虫洞 → errCard 4001 带解说。event/list 出现 DETECT/ISOLATE/RECOVER 行，点行看 5 维 JSON。
6. 实验 tab：MESSAGE_FLOW/NORMAL/count=20 运行 → 成功率 100%；切 ATTACK 场景 → 成功率<100% + 提示文案；CROSSCHAIN_LOOP + count=5（scenario 不发送）→ 成功；导出 CSV（留空 run_id=全部；填 run_id=单条）下载成功。
7. 深链 `#/wb-security?tab=drill` 落在攻防演练。

- [ ] **Step 4: Commit**

```bash
git add frontend/js/pages/wb-security.js frontend/js/pui.js frontend/css/product.css frontend/index.html
git commit -m "feat(frontend): 链网安全运营中心——拓扑/会话/流量/虫洞攻防/性能实验五页签

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 9: wb-regulator.js —— 监管门户

**Files:**
- Create: `frontend/js/pages/wb-regulator.js`
- Modify: `frontend/index.html`（script 引入）
- Modify: `frontend/css/product.css`（追加 `p-trace` 时间线、`p-sealed` 封缄卡、`p-canon` 摘要样式）

**Interfaces:**
- Consumes: PUI/STORE、`need()/card()/monoTrunc()` 本文件内再定义（同 Task 7/8 约定）、局部工具 `simpleTable(cols, recs, emptyText)`（本文件定义，渲染 summary.recent_alerts 等已到手数据，不发请求）。
- Produces: `PAGES['wb-regulator'] = { render }`；tab keys：`cockpit` / `alerts` / `trace` / `authz` / `inspect` / `audit` / `crypto`。
- 后端契约要点（已核实源码）：
  - `alert/raise` req：`{alert_id, event_type(6), risk_level:LOW|MEDIUM|HIGH, source_system:SYSTEM1|SYSTEM2|SYSTEM3|MANUAL, mission_id, uav_pseudonym, operator}` → data 为 alert 平铺（含 evidence_hash、status=OPEN）
  - `alert/status` req：`{alert_id, to_status, operator, reason}`；线性 OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED，跨级/复审→6002
  - `trace/identity` req：`{pseudo?, device_address?, alert_id?, operator(必填)}`（三入口任选其一）→ `{entry, entry_type:PSEUDO|DEVICE_ADDRESS|ALERT_ID, pseudonym, resolved, break_level(0=全通), levels:[{level,name,value,source,latency_ms,status:RESOLVED|BROKEN,reason}], trace_latency_ms}`；断链→5001+断点留痕
  - `authorize/apply` req：`{authorization_id, regulator_id, target_type:MISSION|UAV|ALERT, target_id, scope:[](MISSION|ROUTE|PAYLOAD|IDENTITY|EVIDENCE), reason}` → 平铺（status=PENDING、valid_from/valid_to、audit_hash）
  - `authorize/review` req：`{authorization_id, reviewer_id, decision:APPROVE|DENY, comment}` → `{auth:{…}, audit:{audit_id,action,alert_id,authorization_id,operator_id,audit_hash,chain_tx_id,created_at}, chain_tx_id}`（APPROVE 摘要上链 ChainMaker；复审→6002）
  - `inspect/ciphertext` req：`{mission_id, regulator_id, authorization_id?, payload_type?, trajectory?}`；**未授权→code=5002 但 data 仍带 sealed 视图**（r.ok=false，需特判）；授权→`{authorized:true, decrypted_view, verification:{digest_match,signature_valid,audit_hash}, conclusion:{route_verdict,payload_verdict,raised_alerts}, scope[4], mission:{…}, sealed:{…}, chain_tx_id, reg_audit_id}`
  - `regulatory/audit/list` 过滤 `{alert_id?, authorization_id?, action?, operator_id?}`；`audit/query` 过滤 `{business_id?, action?, actor?}` → AuditLog 平铺 `{id, trace_id, actor, action, target_type, target_id, detail, created_at}`
  - `crypto/sm3` req `{payload:object}` → `{canonical, sm3_hash}`；`crypto/sm9/keygen` `{entity_id}` → `{sm9_identity}`；`sign` `{sm9_identity, payload}` → `{signature, sm3_hash}`；`verify` `{sm9_identity, signature, payload}` → `{valid, …}`（篡改 payload→valid=false，设计内）

- [ ] **Step 1: 写 wb-regulator.js（完整代码）**

```js
/* wb-regulator.js —— 监管门户 #/wb-regulator：驾驶舱 / 告警 / 身份追踪 / 授权 / 密文核验 / 审计 / 密码工具箱。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  function need(v, ...names) {
    const miss = names.filter(n => v[n] === undefined || v[n] === '' ||
      (Array.isArray(v[n]) && !v[n].length));
    if (miss.length) { UI.toast('缺少必填项：' + miss.join('、'), 'err'); return null; }
    return v;
  }
  const monoTrunc = (s, n) => h('code', { class: 'p-mono' }, UI.trunc(s, n || 40));
  function simpleTable(cols, recs, emptyText) {
    if (!recs || !recs.length) return P.empty(emptyText);
    return h('div', { class: 'p-tbl-wrap' }, h('table', { class: 'p-tbl' },
      h('thead', {}, h('tr', {}, cols.map(c => h('th', {}, c.title)))),
      h('tbody', {}, recs.map(r => h('tr', {}, cols.map(c => h('td', {}, c.render(r))))))));
  }
  function parsePayload(v, rp) {
    try { return JSON.parse(v); }
    catch (_) { UI.toast('payload 不是合法 JSON', 'err'); return null; }
  }

  function render(root) {
    root.append(P.pageHead({
      title: '监管门户',
      sub: '驾驶舱 · 告警处置 · 七级身份追踪 · 授权中心 · 密文核验 · 监管审计 · 密码工具箱',
    }));
    root.append(P.chipBar());
    root.append(P.tabs([
      { key: 'cockpit', label: '监管驾驶舱', render: tabCockpit },
      { key: 'alerts', label: '告警管理', render: tabAlerts },
      { key: 'trace', label: '身份追踪', render: tabTrace },
      { key: 'authz', label: '授权中心', render: tabAuthz },
      { key: 'inspect', label: '密文核验', render: tabInspect },
      { key: 'audit', label: '监管审计', render: tabAudit },
      { key: 'crypto', label: '密码工具箱', render: tabCrypto },
    ]));
  }

  /* ================= Tab 1：监管驾驶舱 ================= */
  function tabCockpit(box) {
    const b1 = h('div', {}, P.empty('⏳ 加载中…'));
    const b2 = h('div', {});
    const b3 = h('div', {});
    async function load() {
      b1.innerHTML = ''; b1.append(P.empty('⏳ 加载中…')); b2.innerHTML = ''; b3.innerHTML = '';
      const r = await API.call('/api/dashboard/summary', {});
      b1.innerHTML = '';
      if (!r.ok) { b1.append(P.errCard(r)); return; }
      const s = r.data;
      b1.append(
        h('div', { class: 'p-card-sub' }, '告警 alerts'),
        P.statCards([
          { label: '总数', value: s.alerts.total },
          { label: 'OPEN', value: s.alerts.open, tone: s.alerts.open ? 'serious' : '' },
          { label: '高危未处置', value: s.alerts.high_open, tone: s.alerts.high_open ? 'critical' : 'good' },
          { label: 'IDENTIFIED', value: s.alerts.identified },
          { label: 'REVIEWED', value: s.alerts.reviewed },
          { label: 'RESOLVED', value: s.alerts.resolved, tone: 'good' },
          { label: 'ARCHIVED', value: s.alerts.archived }]),
        h('div', { class: 'p-card-sub' }, '会话 sessions'),
        P.statCards([
          { label: '总数', value: s.sessions.total },
          { label: 'ACTIVE', value: s.sessions.active, tone: 'good' },
          { label: '已认证', value: s.sessions.authenticated },
          { label: 'DEGRADED', value: s.sessions.degraded, tone: s.sessions.degraded ? 'warning' : '' },
          { label: 'RECOVERED', value: s.sessions.recovered },
          { label: 'CLOSED', value: s.sessions.closed }]),
        h('div', { class: 'p-card-sub' }, '授权与攻防'),
        P.statCards([
          { label: '待批授权', value: s.authorizations.pending, tone: s.authorizations.pending ? 'warning' : '' },
          { label: '已授权', value: s.authorizations.authorized, tone: 'good' },
          { label: '已拒绝', value: s.authorizations.denied },
          { label: '已过期', value: s.authorizations.expired },
          { label: 'DETECT', value: s.wormhole_events.detect },
          { label: 'ISOLATE', value: s.wormhole_events.isolate },
          { label: 'RECOVER', value: s.wormhole_events.recover }]),
        h('p', { class: 'p-field-hint' }, '生成时间：' + s.generated_at));
      b2.append(P.hbars(Object.keys(s.alerts.by_type || {}).map(k =>
        ({ label: k, value: s.alerts.by_type[k] }))));
      b3.append(simpleTable([
        { title: '告警号', render: a => h('code', { class: 'p-mono' }, a.alert_id) },
        { title: '类型', render: a => P.badge(a.event_type) },
        { title: '风险', render: a => P.badge(a.risk_level) },
        { title: '状态', render: a => P.badge(a.status) },
      ], s.recent_alerts, '暂无告警'));
    }
    box.append(card('监管驾驶舱 dashboard/summary',
      P.actionBar([{ label: '⟳ 刷新', run: load }]), b1,
      h('div', { class: 'p-card-sub' }, '告警类型分布 by_type'), b2,
      h('div', { class: 'p-card-sub' }, '最近告警 recent_alerts'), b3));
    load();
  }

  /* ================= Tab 2：告警管理 ================= */
  const ALERT_TYPES = ['ROUTE_DEVIATION', 'INVALID_PASS', 'UNKNOWN_NODE_ACCESS',
    'MISSION_MISMATCH', 'WORMHOLE_ALERT', 'IDENTITY_ANOMALY'];
  const ALERT_FLOW = ['IDENTIFIED', 'TRACED', 'REVIEWED', 'RESOLVED', 'ARCHIVED'];
  function tabAlerts(box) {
    const tbl = P.dataTable({
      endpoint: '/api/alert/list',
      filters: [
        { name: 'event_type', label: '类型', type: 'select', options: ALERT_TYPES },
        { name: 'status', label: '状态', type: 'select',
          options: ['OPEN'].concat(ALERT_FLOW) },
        { name: 'risk_level', label: '风险级', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
        { name: 'source_system', label: '来源系统', type: 'select',
          options: ['SYSTEM1', 'SYSTEM2', 'SYSTEM3', 'MANUAL'] },
        { name: 'mission_id', label: '任务号', type: 'text' }],
      columns: [
        { title: '告警号', key: 'alert_id', mono: true },
        { title: '类型', render: r => P.badge(r.event_type) },
        { title: '风险级', render: r => P.badge(r.risk_level) },
        { title: '状态', render: r => P.badge(r.status) },
        { title: '来源', key: 'source_system' },
        { title: '伪名', render: r => UI.trunc(r.uav_pseudonym, 14), mono: true },
        { title: '任务号', key: 'mission_id' },
        { title: '时间', key: 'created_at' }],
    });

    const rpR = P.resultPanel();
    const fR = P.form([
      { name: 'alert_id', label: '告警号', type: 'text', required: true, placeholder: 'ALERT-XXX' },
      { name: 'event_type', label: '事件类型', type: 'select', value: 'WORMHOLE_ALERT', options: ALERT_TYPES },
      { name: 'risk_level', label: '风险级', type: 'select', value: 'HIGH', options: ['LOW', 'MEDIUM', 'HIGH'] },
      { name: 'source_system', label: '来源系统', type: 'select', value: 'SYSTEM2',
        options: ['SYSTEM1', 'SYSTEM2', 'SYSTEM3', 'MANUAL'],
        hint: 'SYSTEM1=任务协同 SYSTEM2=链下攻防 SYSTEM3=密文核查 MANUAL=人工' },
      { name: 'mission_id', label: '关联任务号', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'uav_pseudonym', label: '无人机伪名', type: 'text', required: true,
        hint: '匿名化登记：库中只存伪名+证据摘要，明文身份不出运营域' },
      { name: 'operator', label: '登记人', type: 'text', required: true, value: 'Regulator-A' },
    ]);
    box.append(card('告警登记 alert/raise（匿名化：伪名 + 证据摘要）', fR.root,
      P.actionBar([{ label: '登记告警', kind: 'primary', run: P.runOp({
        path: '/api/alert/raise',
        body: () => need(fR.read(), 'alert_id', 'event_type', 'risk_level',
          'source_system', 'mission_id', 'uav_pseudonym', 'operator'),
        rp: rpR, successText: '告警已登记（status=OPEN）',
        render: d => P.kv([
          ['告警号', d.alert_id], ['类型', P.badge(d.event_type)],
          ['风险级', P.badge(d.risk_level)], ['状态', P.badge(d.status)],
          ['伪名', monoTrunc(d.uav_pseudonym, 24)],
          ['证据摘要', monoTrunc(d.evidence_hash, 48)]]),
        note: { kind: 'ALERT', id: d => d.alert_id, extra: d => ({ mission_id: d.mission_id }) },
        onOk: () => tbl.reload() }) }]),
      rpR.root));

    const rpS = P.resultPanel();
    const fS = P.form([
      { name: 'alert_id', label: '告警号', type: 'text', required: true },
      { name: 'to_status', label: '推进到', type: 'select', value: 'IDENTIFIED', options: ALERT_FLOW },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'Regulator-A' },
      { name: 'reason', label: '处置说明', type: 'textarea', required: true },
    ]);
    box.append(card('状态机推进 alert/status（OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED）',
      fS.root,
      h('p', { class: 'p-field-hint' }, '线性推进：跨级或重复推进将被 6002 拒绝（设计内——状态机不可跳跃）。'),
      P.actionBar([{ label: '推进状态', kind: 'primary', run: P.runOp({
        path: '/api/alert/status',
        body: () => need(fS.read(), 'alert_id', 'to_status', 'operator', 'reason'),
        rp: rpS, successText: '状态已推进',
        render: d => P.kv([['告警号', d.alert_id], ['状态', P.badge(d.status)],
          ['更新时间', d.updated_at]]),
        note: { kind: 'ALERT', id: d => d.alert_id },
        onOk: () => tbl.reload() }) }]),
      rpS.root));

    box.append(card('告警台账 alert/list（五维过滤）', tbl));
  }

  /* ================= Tab 3：身份追踪 ================= */
  function traceView(d) {
    return h('div', {},
      h('div', { class: 'p-row' },
        h('span', { class: 'p-verdict p-tone-' + (d.resolved ? 'good' : 'critical') },
          d.resolved ? '✓ 全链可溯（break_level=0）' : '⛔ 第 ' + d.break_level + ' 级断链'),
        h('span', { class: 'p-badge p-tone-neutral' }, '入口 ' + d.entry_type + '：' + d.entry),
        h('span', { class: 'p-badge p-tone-neutral' }, '伪名 ' + d.pseudonym),
        h('span', { class: 'p-badge p-tone-neutral' }, '追踪耗时 ' + d.trace_latency_ms + 'ms')),
      h('ol', { class: 'p-trace' }, (d.levels || []).map(lv =>
        h('li', { class: 'p-trace-level' + (lv.status === 'BROKEN' ? ' broken' : '') },
          h('div', { class: 'p-trace-head' },
            h('b', {}, 'L' + lv.level + ' · ' + lv.name),
            P.badge(lv.status),
            h('span', { class: 'p-trace-src' }, lv.source + ' · ' + lv.latency_ms + 'ms')),
          h('div', { class: 'p-trace-val' }, lv.value ? monoTrunc(lv.value, 56) : '—'),
          lv.reason ? h('div', { class: 'p-trace-reason' }, '⛔ ' + lv.reason) : null)))));
  }
  function tabTrace(box) {
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'entry_type', label: '入口类型', type: 'select', value: 'alert_id',
        options: [['alert_id', '告警号 alert_id'], ['pseudo', '无人机伪名 pseudo'],
          ['device_address', '设备地址 device_address']],
        hint: '三入口任选其一填写下方对应字段' },
      { name: 'alert_id', label: '告警号', type: 'text', placeholder: '入口=告警号时填写' },
      { name: 'pseudo', label: '伪名', type: 'text', placeholder: '入口=伪名时填写' },
      { name: 'device_address', label: '设备地址', type: 'text', placeholder: '入口=设备地址时填写' },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'Regulator-A' },
    ]);
    box.append(card('七级身份追踪 trace/identity（ChainMaker 索引 → Fabric/FISCO 明细逐级展开）',
      f.root,
      P.actionBar([{ label: '开始追踪', kind: 'primary', run: P.runOp({
        path: '/api/trace/identity',
        body: () => {
          const v = need(f.read(), 'entry_type', 'operator');
          if (!v) return null;
          if (!v[v.entry_type]) { UI.toast('请填写入口字段：' + v.entry_type, 'err'); return null; }
          const b = { operator: v.operator };
          b[v.entry_type] = v[v.entry_type];
          return b;
        },
        rp,
        render: d => traceView(d),
        note: null,
        onOk: d => { if (d.pseudonym) UI.toast('伪名 ' + d.pseudonym + ' 已可作二次追踪入口'); } }) }]),
      rp.root,
      h('p', { class: 'p-field-hint' },
        '断链（5001）不是失败：断点位置与原因被完整留痕——「查不到」本身也是可审计的监管结论。')));
  }

  /* ================= Tab 4：授权中心 ================= */
  function tabAuthz(box) {
    const rpA = P.resultPanel();
    const fA = P.form([
      { name: 'authorization_id', label: '授权号', type: 'text', required: true, placeholder: 'AUTH-XXX' },
      { name: 'regulator_id', label: '申请人（监管员）', type: 'text', required: true, value: 'Regulator-A' },
      { name: 'target_type', label: '目标类型', type: 'select', value: 'MISSION',
        options: ['MISSION', 'UAV', 'ALERT'] },
      { name: 'target_id', label: '目标 ID', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'scope', label: '授权范围（多选）', type: 'multi', required: true, value: ['ROUTE', 'PAYLOAD'],
        options: ['MISSION', 'ROUTE', 'PAYLOAD', 'IDENTITY', 'EVIDENCE'],
        hint: '范围最小化：开箱时仅所见即所批' },
      { name: 'reason', label: '申请事由', type: 'textarea', required: true },
    ]);
    box.append(card('授权申请 authorize/apply（审计摘要前置生成）', fA.root,
      P.actionBar([{ label: '提交申请', kind: 'primary', run: P.runOp({
        path: '/api/authorize/apply',
        body: () => need(fA.read(), 'authorization_id', 'regulator_id', 'target_type',
          'target_id', 'scope', 'reason'),
        rp: rpA, successText: '授权申请已提交（PENDING）',
        render: d => P.kv([
          ['授权号', d.authorization_id], ['状态', P.badge(d.status)],
          ['目标', d.target_type + ' · ' + d.target_id],
          ['范围', (d.scope || []).join('、')],
          ['有效窗', d.valid_from + ' → ' + d.valid_to],
          ['审计摘要', monoTrunc(d.audit_hash, 48)]]),
        note: { kind: 'AUTHORIZATION', id: d => d.authorization_id,
          extra: d => ({ target_id: d.target_id }) } }) }]),
      rpA.root));

    const rpR = P.resultPanel();
    const fR = P.form([
      { name: 'authorization_id', label: '授权号', type: 'text', required: true },
      { name: 'reviewer_id', label: '审批人', type: 'text', required: true, value: 'Regulator-B' },
      { name: 'decision', label: '决定', type: 'select', value: 'APPROVE', options: ['APPROVE', 'DENY'] },
      { name: 'comment', label: '批注', type: 'textarea' },
    ]);
    box.append(card('授权审批 authorize/review（APPROVE 审计摘要上链 ChainMaker）', fR.root,
      h('p', { class: 'p-field-hint' }, '已审授权重复审批将被 6002 拒绝（设计内）。'),
      P.actionBar([{ label: '提交审批', kind: 'primary',
        confirm: { title: '提交审批', msg: '审批结果将上链存证，不可撤销。确认？', ok: '提交' },
        run: P.runOp({
          path: '/api/authorize/review',
          body: () => need(fR.read(), 'authorization_id', 'reviewer_id', 'decision'),
          rp: rpR, successText: '审批完成，审计摘要已上链',
          render: d => h('div', {},
            P.kv([
              ['授权状态', P.badge(d.auth.status)],
              ['范围', (d.auth.scope || []).join('、')],
              ['审计动作', d.audit.action],
              ['审计号', monoTrunc(d.audit.audit_id, 32)],
              ['链上存证', monoTrunc(d.chain_tx_id, 48)]]),
            P.chainTag('chainmaker')),
          note: { kind: 'AUTHORIZATION', id: d => d.auth.authorization_id } }) }]),
      rpR.root));
  }

  /* ================= Tab 5：密文核验 ================= */
  function inspectView(d) {
    return h('div', {},
      h('div', { class: 'p-row' },
        h('span', { class: 'p-verdict p-tone-good' }, '✓ 已授权开箱'),
        h('span', { class: 'p-badge p-tone-neutral' },
          '授权范围 scope[' + (d.scope || []).length + ']：' + (d.scope || []).join('、'))),
      h('div', { class: 'p-card-sub' }, '明文视图 decrypted_view'),
      P.kv(Object.keys(d.decrypted_view || {}).map(k =>
        [k, typeof d.decrypted_view[k] === 'object'
          ? JSON.stringify(d.decrypted_view[k]) : String(d.decrypted_view[k])])),
      h('div', { class: 'p-card-sub' }, '双重验证 verification'),
      P.kv([
        ['SM3 摘要一致 digest_match', d.verification.digest_match ? '✓ 一致' : '✕ 不一致'],
        ['SM9 签名有效 signature_valid', d.verification.signature_valid ? '✓ 有效' : '✕ 无效'],
        ['审计摘要 audit_hash', monoTrunc(d.verification.audit_hash, 48)]]),
      h('div', { class: 'p-card-sub' }, '一致性结论 conclusion（已上链）'),
      P.kv([
        ['航迹核查 route_verdict', P.badge(d.conclusion.route_verdict)],
        ['载荷核查 payload_verdict', P.badge(d.conclusion.payload_verdict)],
        ['触发告警 raised_alerts', (d.conclusion.raised_alerts || []).join('、') || '无']]),
      h('div', { class: 'p-card-sub' }, '任务档案（密文字段仍不可见，仅脱敏值）'),
      P.kv([
        ['任务号', d.mission.mission_id], ['脱敏值', d.mission.masked_value],
        ['运营商', d.mission.operator_id], ['类型', d.mission.mission_type],
        ['高度层(m)', d.mission.altitude_min + ' – ' + d.mission.altitude_max]]),
      P.kv([
        ['结论存证 chain_tx_id', monoTrunc(d.chain_tx_id, 48)],
        ['监管审计号 reg_audit_id', d.reg_audit_id]]));
  }
  function tabInspect(box) {
    const rp = P.resultPanel();
    const f = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, hint: '可点上方 chips 复制' },
      { name: 'regulator_id', label: '监管员', type: 'text', required: true, value: 'Regulator-A' },
      { name: 'authorization_id', label: '授权号（留空=未授权尝试）', type: 'text',
        placeholder: '留空将被 5002 封缄拒绝——这正是隐私保护的证明' },
      { name: 'payload_type', label: '申报载荷类型（可选）', type: 'text',
        placeholder: '与任务实际载荷比对，影响 payload_verdict' },
      { name: 'trajectory', label: '申报航迹（可选）', type: 'text',
        placeholder: '与任务航段比对，影响 route_verdict' },
    ]);
    box.append(card('密文核验 inspect/ciphertext（未授权=封缄视图；授权=开箱+双验证+结论上链）',
      f.root,
      P.actionBar([{ label: '执行核验', kind: 'primary', run: async () => {
        const v = need(f.read(), 'mission_id', 'regulator_id');
        if (!v) return;
        const r = await API.call('/api/inspect/ciphertext', v);
        if (r.code === 5002) {
          /* 未授权：错误卡 + 封缄视图（sealed 在错误响应的 data 里） */
          rp.root.innerHTML = '';
          rp.root.append(P.metaLine(r), P.errCard(r));
          const s = (r.data && r.data.sealed) || {};
          rp.root.append(h('div', { class: 'p-sealed' },
            h('div', { class: 'p-card-sub' }, '🔒 封缄视图 sealed（未授权——只可见元信息，明文不可见）'),
            P.kv([
              ['任务号', s.mission_id || v.mission_id],
              ['密文状态', s.ciphertext_status],
              ['has_ciphertext', String(s.has_ciphertext)],
              ['脱敏值', s.masked_value],
              ['SM3 摘要', monoTrunc(s.sm3_hash, 48)]])));
          rp.root.append(h('details', { class: 'p-rawjson' },
            h('summary', {}, '原始响应 JSON'), UI.jsonBlock(r.raw)));
          return;
        }
        rp.show(r, d => inspectView(d));
        if (r.ok) STORE.note('MISSION', r.data.mission.mission_id);
      } }]), rp.root));
  }

  /* ================= Tab 6：监管审计 ================= */
  function tabAudit(box) {
    box.append(card('监管审计台账 regulatory/audit/list（INSPECT / AUTH_APPROVE 等监管动作留痕）',
      P.actionBar([P.csvExport({ endpoint: '/api/regulatory/audit/export',
        filename: 'regulatory-audit.csv', label: '⤓ 导出监管审计 CSV' })]),
      P.dataTable({
        endpoint: '/api/regulatory/audit/list',
        filters: [
          { name: 'alert_id', label: '告警号', type: 'text' },
          { name: 'authorization_id', label: '授权号', type: 'text' },
          { name: 'action', label: '动作', type: 'text', placeholder: '如 INSPECT' },
          { name: 'operator_id', label: '操作员', type: 'text' }],
        columns: [
          { title: '审计号', render: r => UI.trunc(r.audit_id, 18), mono: true },
          { title: '动作', key: 'action' },
          { title: '告警号', render: r => r.alert_id || '—' },
          { title: '授权号', render: r => r.authorization_id || '—' },
          { title: '操作员', key: 'operator_id' },
          { title: '审计摘要', render: r => UI.trunc(r.audit_hash, 16), mono: true },
          { title: '链上存证', render: r => r.chain_tx_id ? UI.trunc(r.chain_tx_id, 16) : '—', mono: true },
          { title: '时间', key: 'created_at' }],
        emptyText: '暂无监管审计记录',
      })));
    box.append(card('全域审计 audit/query（业务号/动作/行为人三维过滤）',
      P.actionBar([P.csvExport({ endpoint: '/api/audit/export',
        filename: 'audit-all.csv', label: '⤓ 导出全域审计 CSV' })]),
      P.dataTable({
        endpoint: '/api/audit/query',
        filters: [
          { name: 'business_id', label: '业务号', type: 'text' },
          { name: 'action', label: '动作', type: 'text' },
          { name: 'actor', label: '行为人', type: 'text' }],
        columns: [
          { title: 'trace_id', render: r => UI.trunc(r.trace_id, 16), mono: true },
          { title: '行为人', key: 'actor' },
          { title: '动作', key: 'action' },
          { title: '目标', render: r => (r.target_type || '') + (r.target_id ? ' · ' + r.target_id : '') },
          { title: '明细', render: r => UI.trunc(r.detail, 30) },
          { title: '时间', key: 'created_at' }],
        emptyText: '暂无审计记录',
      })));
  }

  /* ================= Tab 7：密码工具箱 ================= */
  const PAYLOAD_SAMPLE = '{"mission_id":"MISSION-DEMO","operator_id":"Operator-A","altitude_max":300}';
  function tabCrypto(box) {
    const rp1 = P.resultPanel();
    const f1 = P.form([
      { name: 'payload', label: 'payload JSON', type: 'textarea', required: true, value: PAYLOAD_SAMPLE }]);
    box.append(card('SM3 规范化摘要 crypto/sm3（canonical 化后哈希——字段顺序不影响摘要）', f1.root,
      P.actionBar([{ label: '计算摘要', run: P.runOp({
        path: '/api/crypto/sm3',
        body: () => {
          const v = need(f1.read(), 'payload'); if (!v) return null;
          const p = parsePayload(v.payload); if (!p) return null;
          return { payload: p };
        },
        rp: rp1,
        render: d => h('div', {},
          P.kv([['SM3 摘要', monoTrunc(d.sm3_hash, 64)]]),
          h('div', { class: 'p-card-sub' }, '规范化串 canonical'),
          h('pre', { class: 'p-canon' }, d.canonical)) }) }]),
      rp1.root));

    const rp2 = P.resultPanel();
    const f2 = P.form([{ name: 'entity_id', label: '实体 ID', type: 'text', required: true,
      value: 'UAV-DEMO-001' }]);
    box.append(card('SM9 身份密钥 crypto/sm9/keygen', f2.root,
      P.actionBar([{ label: '生成身份', run: P.runOp({
        path: '/api/crypto/sm9/keygen', body: () => need(f2.read(), 'entity_id'), rp: rp2,
        render: d => P.kv([['SM9 身份', monoTrunc(d.sm9_identity, 64)]]) }) }]),
      rp2.root));

    const rp3 = P.resultPanel();
    const f3 = P.form([
      { name: 'sm9_identity', label: 'SM9 身份', type: 'text', required: true },
      { name: 'payload', label: 'payload JSON', type: 'textarea', required: true, value: PAYLOAD_SAMPLE }]);
    box.append(card('SM9 签名 crypto/sm9/sign（先 SM3 摘要再签）', f3.root,
      P.actionBar([{ label: '签名', run: P.runOp({
        path: '/api/crypto/sm9/sign',
        body: () => {
          const v = need(f3.read(), 'sm9_identity', 'payload'); if (!v) return null;
          const p = parsePayload(v.payload); if (!p) return null;
          return { sm9_identity: v.sm9_identity, payload: p };
        },
        rp: rp3,
        render: d => P.kv([['签名', monoTrunc(d.signature, 64)],
          ['SM3 摘要', monoTrunc(d.sm3_hash, 64)]]) }) }]),
      rp3.root));

    const rp4 = P.resultPanel();
    const f4 = P.form([
      { name: 'sm9_identity', label: 'SM9 身份', type: 'text', required: true },
      { name: 'signature', label: '签名', type: 'text', required: true },
      { name: 'payload', label: 'payload JSON', type: 'textarea', required: true, value: PAYLOAD_SAMPLE,
        hint: '篡改演示：把 payload 里任一字符改掉再验签 → valid=false（设计内——篡改必现形）' }]);
    box.append(card('SM9 验签 crypto/sm9/verify', f4.root,
      P.actionBar([{ label: '验签', kind: 'primary', run: P.runOp({
        path: '/api/crypto/sm9/verify',
        body: () => {
          const v = need(f4.read(), 'sm9_identity', 'signature', 'payload'); if (!v) return null;
          const p = parsePayload(v.payload); if (!p) return null;
          return { sm9_identity: v.sm9_identity, signature: v.signature, payload: p };
        },
        rp: rp4,
        render: d => h('div', {},
          P.statCards([{ label: 'valid', value: String(d.valid),
            tone: d.valid ? 'good' : 'critical' }]),
          P.kv(Object.keys(d).filter(k => k !== 'valid').map(k =>
            [k, typeof d[k] === 'object' ? JSON.stringify(d[k]) : String(d[k])]))) }) }]),
      rp4.root));
  }

  window.PAGES = window.PAGES || {};
  window.PAGES['wb-regulator'] = { render };
})();
```

**注（写码时落实）**：`runOp` 的 `note` 允许为 null（trace 不记 store）；`parsePayload` 的 `rp` 形参未用，删掉该参数只留 `(v)`。

- [ ] **Step 2: index.html 引入 + product.css 追加 + 语法门**

1. `<script src="js/pages/wb-security.js"></script>` 之后加 `<script src="js/pages/wb-regulator.js"></script>`。
2. product.css 追加：
   - `p-trace`：垂直时间线（ol 去列表点；左侧 2px `--p-line` 竖线；每 li 圆点标记，BROKEN 级圆点与文字用 `--p-critical`、左侧竖线断点处变红虚线）；`p-trace-head` flex（级别名粗体 13px + 徽章 + 来源灰字 11px）；`p-trace-val` 等宽 12px；`p-trace-reason` critical 色 12px。
   - `p-sealed`：封缄卡（`--p-warning-soft` 底、1px `--p-warning` 虚线边框、圆角、内边距 12px）。
   - `p-canon`：规范化串展示（等宽 12px、`--p-panel-2` 底、圆角、内边距 10px、横向溢出滚动、可换行 break-all）。
3. Run: `node --check frontend/js/pages/wb-regulator.js` → 通过。

- [ ] **Step 3: 浏览器端到端验证（sim 后端；沿用 Task 6/7 验证造出的 APPROVED 任务）**

打开 `#/wb-regulator`：
1. 驾驶舱：告警/会话/授权/攻防四组统计卡 + by_type 条形 + recent_alerts 表；⟳ 刷新可用。
2. 告警：登记 `ALERT-T-01`（WORMHOLE_ALERT/HIGH/SYSTEM2/任务号用 chips/伪名 PS-T-01）→ OPEN + evidence_hash；推进 IDENTIFIED→TRACED 逐步成功；**直接跳 RESOLVED → errCard 6002 带解说**；台账五维过滤生效（event_type=WORMHOLE_ALERT 只剩 1 行）。
3. 追踪：alert_id 入口 → 7 级时间线全 RESOLVED + 「✓ 全链可溯」+ 伪名徽章；复制伪名换 pseudo 入口再追 → 同样全通；随便编一个伪名 → errCard 5001 或断链视图（break_level>0、断点级红色 + reason 留痕）。
4. 授权：申请 `AUTH-T-01`（MISSION/任务号/scope=[ROUTE,PAYLOAD]）→ PENDING + audit_hash；审批 APPROVE（confirm）→ AUTHORIZED + chain_tx_id + ChainMaker 链标签；重复审批 → errCard 6002。
5. 密文核验：**authorization_id 留空**执行 → 5002 错误卡（带 EXPLAIN 解说）+ 封缄视图（masked_value/sm3_hash 可见、明文不可见）；填 AUTH-T-01 再执行 → 「✓ 已授权开箱」+ 明文视图 + digest_match/signature_valid 双 ✓ + conclusion ROUTE_OK/PAYLOAD_OK 徽章 + chain_tx_id/reg_audit_id。
6. 审计：监管审计表出现 INSPECT/AUTH_APPROVE 行；两个 CSV 导出下载成功；全域审计按 actor=Regulator-A 过滤生效。
7. 密码工具箱：sm3 计算 → canonical+摘要；keygen → SM9 身份；sign → 签名；verify 原样 → valid=true 绿卡；**payload 改一个字符再验 → valid=false 红卡**。
8. 深链 `#/wb-regulator?tab=inspect` 落在密文核验。

- [ ] **Step 4: Commit**

```bash
git add frontend/js/pages/wb-regulator.js frontend/index.html frontend/css/product.css
git commit -m "feat(frontend): 监管门户——驾驶舱/告警/七级追踪/授权中心/密文核验/双审计/密码工具箱

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 10: docs/demo-script.md —— 验收故事脚本《紧急医疗运输》

**Files:**
- Rewrite: `docs/demo-script.md`（现为 0 行占位）

**Interfaces:**
- Consumes: Task 5-9 全部工作台的 tab key、卡片标题、表单字段（脚本按界面实际文案引用）；后端种子数据（Operator-B/UAV-B-001/R205 等）。
- Produces: 验收当日操作者手持的唯一脚本；UI 内零场景痕迹的对应物。
- 前提约定：sim 或 real 模式后端均可（脚本不触碰真实链数据；第 0 章复位只清本地业务库）。所有 ID/表单值写死保证可复现；时间窗按验收当日日期填写（格式与表单默认值一致）。

- [ ] **Step 1: 写入 demo-script.md 全文**

````markdown
# 验收演示脚本 ·《紧急医疗运输：一次跨域飞行的全程可信监管》

> 本脚本是验收当日的**操作手册 + 解说词**。界面本身是通用产品 UI（无任何剧情文案），
> 故事只存在于本脚本。操作者按章推进，每章 = 台词要点 → 精确操作 → 预期证据。
> 预计总时长 25–30 分钟（附录 C）。排练可用参考流程页的「一键实跑」，正式验收**全程手动**。

## 角色与固定值速查

| 项 | 值 |
|---|---|
| 医疗运营商 | `OP-MED-01` / 云翼医疗空运 |
| 医疗制造商 | `MF-MED-01` / 擎天航空制造 |
| 医疗无人机 | `UAV-MED-01`（序列号 `SN-MED-0001`，型号 `MTOL-Care-200`） |
| 医疗走廊航段 | `R-MED-01`（Zone-M，市一医院H → 血液中心B，120–300m） |
| 任务 | 类型 `MEDICAL`，载荷 `SPECIAL_BLOOD`，时窗 **当日 18:00–20:00** |
| 冲突方（种子数据） | 运营商 `Operator-B` + 无人机 `UAV-B-001`，任务时窗 18:30–19:30、同走廊、高度 150–260m |
| 管理方 | 审核员 `Manager-A`；许可 `PASS-MED-01`（17:30–21:00） |
| 安全运营 | 操作人 `SecOps`；医疗机链下节点 `UAV-MED-01-NODE`（UAV 型，坐标 0,0，邻居 `N1`） |
| 监管方 | `Regulator-A`（申请/追踪/核验）、`Regulator-B`（审批）；告警 `ALERT-MED-01`；授权 `AUTH-MED-01` |

---

## 第 0 章 · 开场：三条链与一个平台（平台总览，约 2 分钟）

**台词要点**：SkyTrust 用三条链各司其职——ChainMaker 监管链是不可绕过的枢纽，Fabric 承载运营，
FISCO BCOS 承载行业管理。任何跨域动作都必须经监管链签收、中继、双端存证。

**操作**（`#/overview`）：
1. 打开平台 → 默认落地「平台总览」：指三链状态条（全部 ONLINE）与核心指标卡。
2. 演示维护区 →「复位演示数据 demo/reset」（确认弹窗）→「灌注演示数据 demo/init」。
   **台词**：复位只清本地业务库与模拟链状态——真实链上的历史账本永不受影响，这本身就是监管设计的一部分。

**预期证据**：reset 回显 `tables_cleared`；init 回显 created/skipped 计数（厂商 3、运营商 3、无人机 7、航段 5、节点 8）。

## 第 1 章 · 建档：医疗空运公司接入平台（运营商工作台，约 4 分钟）

**台词要点**：一家医疗空运公司要上平台飞，先得有身份——公司、制造商、走廊航段、飞机，
每一样都要建档，而飞机注册的那一刻，三条链上就同时留下了它的出生证明。

**操作**（`#/wb-operator`）：
1. 主数据 tab：注册制造商 `MF-MED-01`/擎天航空制造 → 注册运营商 `OP-MED-01`/云翼医疗空运
   （**指** 回显里的链上组织 chain_org_id）→ 创建航段 `R-MED-01`（Zone-M，市一医院H→血液中心B，120/300）。
2. 无人机管理 tab：注册 `UAV-MED-01`（SN-MED-0001 / MTOL-Care-200 / MF-MED-01 / OP-MED-01）。
   **指** 结果面板的四段跨链存证组件：①源链上链 → ②监管链签收 → ③监管链中继 → ④目标链存证，点开展示四个 TxID。
3. 状态机：`VERIFY` → VERIFIED，`ACTIVATE` → ACTIVE。

**预期证据**：UAV_REGISTER_PROOF 跨链单 status=SUCCESS、verify_result=PASS；chips 条出现 UAV/MANUFACTURER/OPERATOR/ROUTE/CROSS_TX。

## 第 2 章 · 申请：一单特殊血样任务（运营商工作台，约 2 分钟）

**台词要点**：医院有一袋 RH 阴性特殊血样要在两小时内送到血液中心。注意——任务描述从提交那一刻起
就是密文，接下来无论管理方还是台账，都只能看到脱敏值。

**操作**（`#/wb-operator?tab=missions`）：
1. 任务创建：OP-MED-01 / UAV-MED-01 / 类型 `MEDICAL` / 载荷 `SPECIAL_BLOOD` /
   描述「紧急运输特殊血样（RH 阴性），全程专用冷链箱，医院到科室直达，18 时前必须起飞」/
   航段勾选 `R-MED-01` / 高度 120–300 / 时窗当日 18:00–20:00。
   **指** 回显的 masked_value（脱敏）与 SM3 摘要——明文只在第 8 章授权开箱后重现。
2. 任务提交（提交人 OP-MED-01）→ **指** application_id 与 MISSION_APPLICATION 四段存证。

**预期证据**：任务状态 SUBMITTED；chips 出现 MISSION/APPLICATION。

## 第 3 章 · 冲突：物流航班抢了同一条走廊（运营商工作台，约 3 分钟）

**台词要点**：同一时段，物流公司的常规补给任务也要过 Zone-M——时间、航路、高度三维重叠，
平台在审核之前就把冲突拦了出来。协调是有痕迹的，而且同一冲突不会被「协调」两次。

**操作**：
1. 同 tab 再创建任务：`Operator-B` / `UAV-B-001` / 类型 `LOGISTICS` / 载荷 `CARGO` /
   描述「常规物资补给」/ 航段 `R-MED-01` / 高度 150–260 / 时窗 18:30–19:30 → 提交（提交人 Operator-B）。
2. 冲突检测：对**医疗任务号**执行「检测冲突」→ **指** 命中卡：conflict_id、类型（TIME/ROUTE/ALTITUDE）、任务 A×B、协调建议。
3. 冲突消解：resolution 填「医疗任务优先，物流航班顺延至 20:00 后执行」→ RESOLVED。
4. **设计内拒绝**：同 conflict_id 再次消解 → 红色错误卡 **3004**。
   **台词**：这不是 bug——重复消解被幂等拒绝，说明协调记录不可被篡改或重放。

**预期证据**：医疗任务状态从 COORDINATING 恢复推进；3004 错误卡带词典解说。

## 第 4 章 · 审核与许可：管理方只看得见该看的（管理方审核台，约 3 分钟）

**台词要点**：换到管理方视角。注意两点：一，待审队列是从**跨链台账**里长出来的——换台电脑、
清了缓存都照样在；二，审核员全程只见脱敏值，「血样」两个字他看不到。

**操作**（`#/wb-manager`）：
1. 待审队列 tab：**指** 面板 A（MISSION_APPLICATION 台账，business_id=申请号，审核状态列 PENDING）
   与面板 B（SUBMITTED 任务面板）。可现场 `STORE.clear()` + 刷新证明队列不依赖本地缓存。
2. 面板 B 点「详情」→ **指** 隐私说明与 masked_value。
3. 面板 A 点「审核」→ 裁决 APPROVED / 审核员 Manager-A / 规则 `ZONE_LIMIT,MANUAL` /
   意见「医疗紧急任务，走廊时段已协调」→ 提交（确认弹窗）→ **指** MISSION_REVIEW_RESULT 回传存证。
4. 许可管理 tab：签发 `PASS-MED-01`（任务号用 chips、签发人 Manager-A、17:30–21:00）→ **指** FLIGHT_PASS 存证；验证 → valid=true。

**预期证据**：任务状态 APPROVED；面板 A 状态列变 REVIEWED；许可 VALID。

## 第 5 章 · 起飞：链下可信通道（链网安全运营中心，约 3 分钟）

**台词要点**：飞机起飞后，秒级上链不现实——位置、心跳走的是链下可信网络：亚秒级时延，
但每一跳都有 SM9 身份、每条消息都有 SM3 存证。跨链管「信任」，链下管「实时」。

**操作**（`#/wb-security`）：
1. 网络拓扑 tab：**指** 8 节点种子拓扑与 MGR 管理节点。注册节点 `UAV-MED-01-NODE`
   （UAV / 坐标 0,0 / 邻居 `N1`）→ 拓扑刷新出现医疗机接入点（**台词**：图为无向，单边声明即双向连通）。
2. 会话监控 tab：建立会话 uav_id=`UAV-MED-01`、任务号/许可号用 chips → **指** SM9 挑战认证 ✓、nonce、初始路径 `UAV-MED-01-NODE → N1 → … → MGR`。
3. 消息流量 tab：发 3 条 `POSITION_UPDATE` + 1 条 `HEARTBEAT` → **指** 逐跳时延条与 stats 统计卡（亚秒级、成功率 100%）。

**预期证据**：会话 INIT/ACTIVE；消息 SUCCESS；p95 时延毫秒级。

## 第 6 章 · 虫洞攻防：网络里出现了一条不该存在的捷径（安全运营中心，约 4 分钟）

**台词要点**：攻击者在网络两侧挖了一条「虫洞隧道」——消息被诱进去，时延低得不合常理。
平台不靠防火墙 signatures，靠**物理一致性**：邻接关系、时延合理性等五个维度给会话打分。

**操作**（`#/wb-security?tab=drill`）：
1. 开启虫洞（确认弹窗）→ 拓扑 tab 刷新：**指** NODE-X⇄NODE-Y 红虚线隧道边。
2. 会话监控：**新建**会话（uav_id=UAV-MED-01）→ **指** 初始路径已含隧道边（攻击先于会话存在）。
3. 消息流量：对新会话发 `POSITION_UPDATE` → **指** 时延骤降（被诱入隧道）。
4. 攻防演练：风险评估（新会话）→ **指** ⚠ DETECT 大红判定、5 维分数条（邻接/时延维度越过阈值标线变红）、联动安全事件。
5. 路径规避切换 → **指** 原路径 vs 新路径、恢复时延、会话 RECOVERED；事件台账出现 DETECT/ISOLATE/RECOVER 全程留痕（点行看 5 维评分 JSON）。
6. **设计内拒绝**：再开虫洞 → **4001**。**台词**：X/Y 已被隔离，隔离是处置不是状态位——只有平台复位才能解除，攻击者无法「洗白」自己。

**预期证据**：verdict=DETECT；切换后 verdict 复评=PASS（可选加分项）；4001 错误卡带解说。

## 第 7 章 · 告警与追踪：从一个伪名追到真身（监管门户，约 3 分钟）

**台词要点**：安全事件同步给了监管方。监管台账里无人机只有**伪名**——但七级追踪可以依法
从伪名一路解析回注册身份，每一级都标注数据来自哪条链。

**操作**（`#/wb-regulator`）：
1. 告警管理 tab：登记 `ALERT-MED-01`（WORMHOLE_ALERT / HIGH / SYSTEM2 / 任务号用 chips / 伪名 `PS-MED-01`）→ **指** evidence_hash（匿名化：明文身份不出库）。
2. 身份追踪 tab：入口=告警号 `ALERT-MED-01` → **指** 七级时间线逐级 RESOLVED、「✓ 全链可溯」、每级的 source（CHAINMAKER_INDEX/FABRIC_DETAIL/FISCO_BCOS_DETAIL）与耗时。
3. 换入口=伪名再追一次 → 同样全通（**台词**：三入口任一即可起追）。
4. 状态机推进：IDENTIFIED → TRACED → REVIEWED → RESOLVED，每步填处置说明。
5. **设计内拒绝（可选加分项）**：对新告警直接跳 RESOLVED → **6002** 线性状态机拒绝。

**预期证据**：break_level=0；告警台账五维过滤 event_type=WORMHOLE_ALERT 可复现。

## 第 8 章 · 授权与开箱：监管者也不能随便看（监管门户，约 4 分钟）

**台词要点**：现在监管员想看任务明文。他不能直接看——必须先申请授权、由另一名监管员审批、
审批摘要上链，然后**在授权范围内**开箱。开箱那一刻的核验结论，又回到了链上。

**操作**（`#/wb-regulator?tab=authz` → `?tab=inspect`）：
1. 授权申请 `AUTH-MED-01`（Regulator-A / MISSION / 任务号用 chips / scope 勾 `ROUTE`+`PAYLOAD` / 事由「虫洞告警调查，需核验航迹与载荷一致性」）→ **指** audit_hash 与有效窗。
2. 授权审批：Regulator-B / APPROVE（确认弹窗）→ **指** chain_tx_id 与 ChainMaker 链标签（审计摘要上链）。
3. 密文核验 tab：**authorization_id 留空**执行 → **5002** 封缄卡。**台词**：没有授权，监管者看到的也只有密文元信息——隐私保护对特权角色同样生效。
4. 填入 `AUTH-MED-01` 再执行，payload_type 填 `SPECIAL_BLOOD`、trajectory 填 `R-MED-01` → **指** 明文视图（description 重现「特殊血样」）、digest_match/signature_valid 双 ✓、conclusion ROUTE_OK + PAYLOAD_OK、chain_tx_id 与 reg_audit_id（开箱行为本身也被审计）。
5. 密码工具箱 tab：sm3 计算样例 payload → keygen → sign → verify valid=true；**把 payload 改一个字符再验 → valid=false**。**台词**：这就是全平台完整性的地基——篡改一个比特都会现形。

**预期证据**：5002 封缄视图含 masked_value/sm3_hash；开箱后 scope=[MISSION,ROUTE,PAYLOAD,IDENTITY]（4 项按后端回显）；篡改验签红卡。

## 第 9 章 · 收尾：许可收回，账本说话（监管门户 + 平台总览，约 2 分钟）

**台词要点**：任务完成，许可收回。最后我们不总结 PPT——直接看账本。

**操作**：
1. `#/wb-manager?tab=passes`：吊销 `PASS-MED-01`（原因「运输完成，许可回收」）→ **指** PASS_REVOKE 存证与 crosschain_status；验证 → **valid=false（设计内：吊销即刻全网生效）**。
2. `#/wb-regulator?tab=audit`：监管审计与全域审计两张台账 → 各导出一份 CSV（**台词**：审计可离线归档）。
3. `#/wb-regulator?tab=cockpit`：驾驶舱总览（告警 RESOLVED、攻防 DETECT/ISOLATE/RECOVER 计数、授权 AUTHORIZED）。
4. `#/overview`：跨链流水全量盘点——**指** 至少 5 类消息各一笔 SUCCESS：UAV_REGISTER_PROOF / MISSION_APPLICATION / MISSION_REVIEW_RESULT / FLIGHT_PASS / PASS_REVOKE，点开任意一笔看四段 TxID 收尾。

**结束语**：从建档到回收，每一次跨域动作都在三条链上留下了不可绕过的四段存证；
而所有「被拒绝」的瞬间，恰恰是系统在证明它在保护你。

---

## 附录 A · 验收前检查清单

- [ ] 链环境：sim 模式（`go run ./cmd/server`）或 real 模式（`./scripts/start-backend-real.sh`，三链容器已起、**绝不** `network.sh down`）
- [ ] 后端 :8080 健康（health/check 全绿）；前端代理 :8090（`./scripts/serve-frontend.sh`）
- [ ] 平台总览执行 demo/reset + demo/init，种子计数符合第 0 章预期
- [ ] 四工作台 + 总览各打开一遍无 JS 报错（控制台干净）
- [ ] 完整排练一遍本脚本（含全部设计内拒绝点），记录各章实际耗时
- [ ] 双屏/投屏分辨率下侧边栏与表格无横向溢出

## 附录 B · 设计内拒绝汇总表（「拒绝即保护」台词卡）

| 章 | 触发操作 | 预期拒绝 | 一句话台词 |
|---|---|---|---|
| 3 | 同一冲突重复消解 | code=3004 | 协调记录不可重放——消解只有一次 |
| 6 | 隔离残留后重开虫洞 | code=4001 | 隔离是处置不是开关，攻击者无法自我洗白 |
| 6(可选) | 健康会话切路径 | code=4002 | 没降级就不切换——恢复机制不被滥用 |
| 7(可选) | 告警跨级推进 | code=6002 | 状态机线性推进，监管流程不可跳跃 |
| 8 | 未授权密文开箱 | code=5002+封缄 | 监管者无授权同样只见密文——隐私对特权生效 |
| 8 | 篡改 payload 验签 | valid=false | 篡改一个比特都会现形 |
| 9 | 吊销后复验许可 | valid=false | 吊销即刻全网生效，不存在「旧证还能飞」 |

## 附录 C · 预计时长（合计约 27 分钟）

| 章 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| 分钟 | 2 | 4 | 2 | 3 | 3 | 3 | 4 | 3 | 4 | 2 |
````

- [ ] **Step 2: 校对脚本与 UI 的一致性**

逐条核对脚本引用的 tab key（master/uavs/missions/passes、queue/records/passes、topo/sessions/traffic/drill/lab、cockpit/alerts/trace/authz/inspect/audit/crypto）、卡片标题、按钮文案与 Task 5-9 代码一致；固定值（OP-MED-01/MF-MED-01/UAV-MED-01/R-MED-01/PASS-MED-01/ALERT-MED-01/AUTH-MED-01/UAV-MED-01-NODE/PS-MED-01）全文无拼写漂移。
Run: `grep -c "MED-01" docs/demo-script.md` → ≥ 20（值被反复引用属预期）。

- [ ] **Step 3: Commit**

```bash
git add docs/demo-script.md
git commit -m "docs(demo): 验收故事脚本《紧急医疗运输》——十章+三附录，纯手动全程可信监管

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 11: 集成验证 + 旧页回归 + README 更新

**Files:**
- Modify: `frontend/README.md`（页面表/结构/双设计系统段落重写）
- Modify: `README.md`（根：「演示前端」段落重写）

**Interfaces:**
- Consumes: Task 1-10 全部产物。
- Produces: 可交付状态——脚本十章走通、旧页零回归、文档与实现一致。

- [ ] **Step 1: 全量语法门**

Run:
```bash
cd /root/codes/skytrust-uav-supervision
for f in frontend/js/store.js frontend/js/pui.js frontend/js/app.js \
  frontend/js/pages/pui-lab.js frontend/js/pages/overview.js \
  frontend/js/pages/wb-operator.js frontend/js/pages/wb-manager.js \
  frontend/js/pages/wb-security.js frontend/js/pages/wb-regulator.js; do
  node --check "$f" || echo "FAIL $f"; done
```
Expected: 无任何 FAIL 输出。

- [ ] **Step 2: 后端测试回归（证明后端零改动未被误伤）**

Run: `cd services/skytrust-backend && source ../../scripts/env.sh 2>/dev/null; PATH=/usr/local/go/bin:$PATH GOPROXY=https://goproxy.cn,direct go test ./...`
Expected: 全部 ok（与改造前一致）。

- [ ] **Step 3: 按 demo-script.md 完整走通十章（sim 模式）**

启动：`go run ./cmd/server`（:8080）+ `./scripts/serve-frontend.sh`（:8090）。
手持 `docs/demo-script.md` 从第 0 章走到第 9 章，逐章核对「预期证据」；每个附录 B 拒绝点必须命中预期 code/valid 值且错误卡带 EXPLAIN 解说。发现脚本与 UI 不一致时：**以 UI 实际行为为准修订脚本**（UI 文案已在 Task 5-9 验收，不反向改 UI，除非属实现 bug）。

- [ ] **Step 4: 旧页回归点验（旧视觉与旧逻辑零变化）**

1. `#/dashboard` 演示总控台：三链灯、指标、「▶ 一键跑通三幕全流程」确认后悬浮窗出现、跨页存活、可取消。
2. `#/act1` 一键实跑：42 步剧本全绿（含理论失败步 ◈ 琥珀徽章：3004/2004 等）；实跑后执行 demo/reset+init 复原。
3. `#/act2` 一键实跑：虫洞攻防剧本全绿（含 4001/4002 ◈ 步）；跑完 ISOLATED 残留 → demo/reset 复原（**再跑脚本前必须复位**）。
4. `#/act3` 一键实跑：核查剧本全绿（含 5002/valid=false ◈ 步）。
5. `#/explorer`：抽查 5 端点（crosschain/list、risk/evaluate、inspect/ciphertext、experiment/run、audit/export）实发正常、样例对照与 EXPLAIN 词典展示不变。
6. 旧页视觉：act1/act2/act3/dashboard/explorer 内部卡片、徽章、按钮与改造前完全一致（app.css 未被触碰）；仅壳（侧边栏/顶栏）是新视觉——预期行为。
7. 主题切换：明暗两态下新旧页面全部可读；刷新后主题保持。
8. `#/pui-lab`：Task 3/4 验证清单快速重放一遍。

- [ ] **Step 5: 重写 frontend/README.md（完整新内容）**

```markdown
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
```

- [ ] **Step 6: 重写根 README.md「演示前端」段落**

将现有段落（自 `## 演示前端（原生 HTML+CSS+JS，零构建）` 起，至「幕一/幕二/幕三页面各有「一键实跑」按钮按剧本顺序调用真实后端。」止）整体替换为：

```markdown
## 演示前端（原生 HTML+CSS+JS，零构建）

位于 [`frontend/`](frontend/)：单页应用，主体是**四方角色工作台产品界面**
（平台总览 / 运营商工作台 / 管理方审核台 / 链网安全运营中心 / 监管门户），
全量覆盖 64 个 API；三幕参考流程（幕一任务协同 / 幕二虫洞攻防 / 幕三监管核查）、
演示总控台与 API 浏览器原样保留，收纳于侧边栏折叠组。
验收故事脚本见 [`docs/demo-script.md`](docs/demo-script.md)
（《紧急医疗运输：一次跨域飞行的全程可信监管》，十章 + 设计内拒绝汇总），
三幕实跑报告见 [`docs/demo-api-report.md`](docs/demo-api-report.md)。

后端未开 CORS，前端经同源代理访问（Python 标准库，无第三方依赖）：

    ./scripts/serve-frontend.sh        # 默认 :8090，代理 /api/* → :8080（PORT/BACKEND 可覆盖）

浏览器打开 <http://127.0.0.1:8090/>（默认落地平台总览）；三链状态灯每 15s 自动巡检。
幕一/幕二/幕三参考页各保留「一键实跑」排练工具，正式验收按 demo-script.md 纯手动执行。
```

（该段落前后的其余内容不动。）

- [ ] **Step 7: Commit**

```bash
git add frontend/README.md README.md
git commit -m "docs(frontend): README 对齐产品化改造——四工作台页面表/双设计系统/验收脚本索引

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## 计划自审记录（writing-plans self-review）

- **规格覆盖**：设计规格 §3.1 壳/侧边栏→Task 1；§3.2 页面去留（overview 新建、dashboard 收编）→Task 1/5；§3.3 四工作台×64 端点归宿→Task 6-9（端点逐一落位：运营商 22、管理方 9、安全 15、监管 17、全局 3，合计 64 无遗漏）；§3.4 增强矩阵（过滤条/分页/CSV×3/stats/三入口/双态 inspect/5 维评分/11 类实验/path_detail/demo 回显/幂等重试提示）→Task 4 组件 + Task 5-9 各卡片；§3.5 组件清单→Task 3/4；§4.2 CSS 隔离→Global Constraints + Task 1/3；§4.4 数据流（chips/台账驱动/刷新策略）→Task 2/3/7；§4.5 错误处理→Global Constraints + runOp/errCard；§4.6 验证四条→Task 11；§5 十章脚本+三附录→Task 10；§6 范围外→Global Constraints「一字不动」清单。
- **占位符扫描**：无 TBD/TODO；Task 4 topoSVG 与 Task 3 Step 2/Task 7-9 样式段为「算法照抄源文件行号 + 明确替换清单」式规格（源代码在仓库中逐行可查，属可执行的精确指令而非占位）；wb-security tabLab 的占位按钮已在追加注记中明确删除。
- **类型/命名一致性**：PUI 导出名与 Task 5-9 调用逐一对过（runOp/dataTable.reload/setOptions/openCxDetail/cxTrail/pathHops/scoreBars/topoSVG/csvExport.filters()）；STORE.note 的 kind 均在 KINDS 白名单内；tab key 与 Task 10 脚本引用一致；枚举值与 Global Constraints 唯一真源一致（node/register status 仅 ONLINE|OFFLINE、experiment scenario 双向严格、alert 线性流等已按后端源码核实）。
