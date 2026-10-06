# 三端门户前端 + 验收脚本重写 实施计划（计划 B）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把单壳 SPA 拆为三个物理独立的政务风门户（运营商端 UOM 风格 / 管理当局端 / 监管当局端），配真实经纬度地图操作，并重写验收演示脚本；旧页原样冻结进内部导航页。

**Architecture:** 零构建原生 HTML/CSS/JS。共享底座复用（api.js/store.js/ui.js/pui.js 不动，pui 经令牌换肤）；新增 vendor（Leaflet 1.9.4 + qrcode-generator 2.0.4 本地入仓）、新设计系统 drone.css（`d-` 前缀 + 三份主题令牌文件）、三端共用 portal.js（hash 路由/链灯心跳/chip 条/天地图 key 引导）、map.js（Leaflet 封装 + 瓦片失败退化 + 矢量层 API）、geo.js（纯地理数据函数）。每端一个 HTML 入口 + 一个薄壳 shell-*.js + 一组页面文件（window.OP_PAGES / AU_PAGES / RG_PAGES 注册）。后端契约以再生成后的 endpoints.js（73 端点）为唯一权威。

**Tech Stack:** vanilla JS（无框架无构建）、Leaflet 1.9.4（vendored，钉死）、qrcode-generator 2.0.4（vendored）、天地图 WMTS 瓦片（浏览器 key 运行时配置）、python3 scripts/serve-frontend.py 同源代理、bash+curl+jq 集成验证、Go 1.25 隔离 sim 后端（仅验证任务）。

**Spec:** `docs/superpowers/specs/2026-10-06-uom-three-portals-design.md`（§4-§7 为本计划权威）
**前序:** 计划 A（`docs/superpowers/plans/2026-10-06-uom-backend-domains.md`）已完成收官：73 端点后端全绿（range 75596c9..73bc6f2，终审 Ready to merge = Yes）。
**锚点档案:** `.git/sdd/planB-frontend-anchors.md`（底座 file:line 契约、vendor sha256、p- 类碰撞清单）
**端点契约档案:** `.git/sdd/planB-endpoint-contracts.md`（73 端点 req/resp 逐字段摘要——页面代码字段名的唯一参照）

## Global Constraints

每个任务的要求隐含包含本节全部条目（值从 spec 与红线记录逐字抄录）：

1. **零构建**：原生 HTML/CSS/JS；唯一新增第三方文件 = vendored Leaflet 1.9.4 + qrcode-generator 2.0.4，**版本钉死不升级**（与后端冻结依赖同精神，spec §9）。
2. **API 铁律**：全部端点 POST；HTTP 状态码恒 200，业务成败只看信封 `code`（0=成功）；`API.call` 永不 throw；信封 `{code,message,data,trace_id,timestamp}`。
3. **endpoints.js（73 条）= 三端页面 API 唯一权威**；勿手改；再生成只能走 `APIFOX_GEN=1 go test ./tests -run TestApifoxEndpointSamples` → `./scripts/gen-endpoints.sh`。apifox 快照（docs/apifox/*.json）同为脚本产物勿手改。
4. **冻结资产不改不删**：`css/app.css`、`css/product.css`、`js/app.js`、`js/api.js`、`js/store.js`、`js/ui.js`、旧五页（dashboard/act1/act2/act3/explorer）、旧四工作台（wb-operator/wb-manager/wb-security/wb-regulator）、overview.js、pui-lab.js。`pui.js` 只允许**加法**改动（三端与旧页共用；本计划默认零改动）。index.html 改造只动导航结构与文案（Task 13）。
5. **CSS 命名空间**：新类一律 `d-` 前缀；例外=复用 pui 的 `p-` 结构类（令牌换肤）与兼容层 `.toast`/`.tip`/`.json-block`/`#toast-box`（ui.js 硬编码发射这些名字，drone.css 门户作用域内重实现结构样式）。绝不与 product.css 的 108 个 `p-` 类碰撞、绝不改 `--p-*` 令牌定义本体（只在 theme-*.css 覆盖值）。
6. **链色语义**（新系统值，勿沿用旧 app.css 橙色）：ChainMaker 紫 `#7c3aed` / Fabric 蓝 `#2563eb` / FISCO 青 `#0891b2`；跨链存证组件（cxTrail 等）保留三色语义。
7. **三端固定主题不切换**（政务门户无暗色开关，spec §2）：op=政务蓝白（主色 #0b4ea2 系）、au=深蓝权威浅色、rg=深藏青深色大屏（`<body data-theme="dark">` 固定属性；告警红/黄语义，深色端不用霓虹青）。index.html 内部页保留现有 data-theme 机制不动。
8. **天地图 key**：只存浏览器 `localStorage['skytrust-tianditu-key']`，**绝不入 git、绝不写进任何源文件**；无 key/瓦片加载失败 → 中性网格底图退化 + 明确徽章提示，矢量层恒自绘照常（演示不砸场）；每端首次进地图页弹引导（可跳过，sessionStorage 记忆本次会话不再弹）。
9. **不造假坐标红线**（与后端 corridorOf 同语义）：lat/lon 任一为 0（=未设）的航段/节点/遥测点，地图上不画点不连线不猜测；遗留行 `registration_mark=NULL` UI 必须容忍（回退文案「未发放登记标志」，不 crash 不渲染空 QR）。
10. **模拟证件号红线**：realname/pilot 表单只收演示用模拟证件号（占位样例值），界面与脚本绝不出现采集真实证件信息的措辞；demo-script 台词同样遵守。
11. **生产进程红线**：:8080（real 后端）与 :8090（前端代理）存活——**永不 kill/重启、永不发任何请求**；集成验证一律隔离 sim：`SERVER_ADDR`/`DB_PATH`/`SM9_KEY_DIR` override 到 /tmp 专用目录 + 空闲端口（:18080/:18090 模式）；`demo/reset` 只准打隔离 sim。
12. **语法门与诚实验证**：所有新增/修改的 JS 过 `node --check`；CSS/HTML 做结构断言（grep/node 轻校验）；浏览器目检项如实标 **DEFERRED-HUMAN**，禁止臆造结果。
13. **错误呈现**：code≠0 统一 `P.errCard` + explain.js 解说；code=-1 给启动指引；新三端页面**无「◈ 预期」徽章**（那是参考页专属语义）；拒绝类错误中性展示。
14. **STORE 契约**：三端共写同一 `STORE`（localStorage `skytrust-ctx-v1`），沿用既有 13 类 kind（OPERATOR/MANUFACTURER/ROUTE/UAV/MISSION/APPLICATION/PASS/CONFLICT/SESSION/NODE/ALERT/AUTHORIZATION/CROSS_TX），**不新增 kind**；跨端预填靠 chip 条点击。
15. **提交纪律**：中文 conventional commits + `Co-Authored-By: Claude Code <noreply@anthropic.com>` trailer；本地仓库直接提交 main；预存脏文件（CLAUDE.md untracked、platforms 子模块噪声、regulatory_handler_test.go 未格式化）**永不 stage 永不 gofmt**。
16. **Go 环境**（仅 Task 15 用）：`export PATH=/usr/local/go/bin:$PATH` + `export GOPROXY=https://goproxy.cn,direct`；go.mod/go.sum 不动；后端源码零改动（计划 B 是纯前端+文档+脚本计划）。
17. **trajectory 参数全程留空**（NORMAL 会撞硬编码基线必报偏航——旧脚本实测定性）；许可有效窗用相对时间「valid_from=当前时间−1 小时、valid_to=当前时间+4 小时」，不写死钟点。

## 文件结构（spec §4.1 落地 + 本计划新增产物）

```
frontend/
├── index.html                 # [Task 13 改造] 内部总控导航页：顶部三端入口大卡片(pc-*) + SPA 保留(demo维护)
│                              #   侧栏「四方角色工作台」改名「旧工作台 · 参考（已冻结）」；explorer 计数 64→73；script 区/app.js 零改动
├── operator.html              # [Task 5 新建] ① 运营商端入口（顶部导航，政务蓝白）
├── authority.html             # [Task 5 新建] ② 管理当局端入口（侧栏，深蓝权威浅色）
├── regulator.html             # [Task 5 新建] ③ 监管当局端入口（侧栏+大屏，深藏青 dark）
├── vendor/
│   ├── leaflet/               # [Task 1] leaflet.js/leaflet.css/LICENSE/images/{layers,layers-2x,marker-icon,marker-icon-2x,marker-shadow}.png
│   └── qrcode/                # [Task 1] qrcode.js/LICENSE（qrcode-generator 2.0.4）
├── css/
│   ├── app.css  product.css   # 冻结不动（product.css 被三端 HTML 加载以取 pui 结构样式）
│   ├── drone.css              # [Task 2 新建] 三端共享设计系统：--d-* 令牌基座 + d- 组件/布局原语 + 兼容层
│   ├── theme-op.css           # [Task 2 新建] 运营商端令牌：政务蓝白
│   ├── theme-au.css           # [Task 2 新建] 管理端令牌：深蓝权威浅色
│   └── theme-rg.css           # [Task 2 新建] 监管端令牌：深藏青深色大屏
└── js/
    ├── api.js store.js ui.js pui.js app.js      # 冻结（pui.js 仅加法许可）
    ├── portal.js              # [Task 5 新建] 三端共用：hash 路由/链灯心跳 15s/STORE chip 条基座/天地图 key 引导/boot
    ├── map.js                 # [Task 4 新建] MAPX：Leaflet 封装 + 天地图瓦片(localStorage key) + 退化 + drawRoutes/drawZones/drawNodes/droneMarker/wormhole/隔离样式/点选回调
    ├── data/geo.js            # [Task 3 新建] GEO：武汉默认视图/坐标纯函数/zone 缓冲多边形/图层样式常量
    ├── data/explain.js        # [Task 5 加法] +7001/7002/7003 三码 + 9 个新端点词条
    ├── shell-op.js shell-au.js shell-rg.js      # [Task 5 新建] 每端薄壳：导航表+路由表+PORTAL.boot
    └── pages/
        ├── op/  home.js realname.js aircraft.js flight.js license.js ops.js airspace.js        # [Task 6-8] window.OP_PAGES
        ├── au/  queue.js passes.js records.js registry.js masterdata.js netsec.js               # [Task 9-10] window.AU_PAGES
        ├── rg/  cockpit.js alerts.js trace.js authz.js inspect.js audit.js crypto.js            # [Task 11-12] window.RG_PAGES
        └── （旧 12 页文件原样冻结）
scripts/
├── serve-frontend.sh          # [Task 1] chmod +x（644→755，mode 入库）
└── verify-three-portals-story.sh   # [Task 15 新建] 隔离 sim 上按 demo-script 输入值逐章 curl+jq 断言
docs/
└── demo-script.md             # [Task 14 覆盖重写] 《紧急医疗运输：一次跨域飞行的全程可信监管（三端版）》9 章 + 3 附录
frontend/README.md             # [Task 13] 三端入口+天地图 key 指引+73 端点字样同步
CLAUDE.md                      # [Task 13] 「前端」段重写为三门户结构 + 文档地图段 demo-script 摘掉占位帽子（端点计数 73 已由计划 A 工作树同步，勿重复改；untracked：只改工作树，永不 commit）
```

## 任务总览（15 任务，均走 subagent-driven-development）

| # | 任务 | 产物 | 依赖 |
|---|---|---|---|
| 1 | vendor 底座入库 + serve-frontend.sh 执行位 | vendor/leaflet ×8 文件、vendor/qrcode ×2、sha256 钉死、mode 755 | — |
| 2 | drone.css + 三份主题令牌 | css/drone.css、theme-op/au/rg.css | 1（无硬依赖，可并行序）|
| 3 | geo.js 纯地理数据层 + node 断言 | js/data/geo.js | — |
| 4 | map.js Leaflet 封装 | js/map.js | 1,3 |
| 5 | portal.js + 三 HTML 入口 + 三薄壳 + explain.js 增补 | js/portal.js、operator/authority/regulator.html、shell-op/au/rg.js、explain.js | 2,3,4 |
| 6 | 运营商端 I：home / realname / aircraft | js/pages/op/×3 | 5 |
| 7 | 运营商端 II：flight / license | js/pages/op/×2 | 6 |
| 8 | 运营商端 III：ops / airspace | js/pages/op/×2 | 6 |
| 9 | 管理端 I：queue / passes / records | js/pages/au/×3 | 5 |
| 10 | 管理端 II：registry / masterdata / netsec | js/pages/au/×3 | 9 |
| 11 | 监管端 I：cockpit / alerts / trace | js/pages/rg/×3 | 5 |
| 12 | 监管端 II：authz / inspect / audit / crypto | js/pages/rg/×4 | 11 |
| 13 | index.html 内部导航页改造 + 文档同步 | index.html、frontend/README.md、CLAUDE.md（工作树） | 5-12 |
| 14 | demo-script.md 覆盖重写（9 章+3 附录） | docs/demo-script.md | 6-12（页面路由/文案事实） |
| 15 | 集成验证：隔离 sim + 逐章 curl 断言脚本 + 全量 node --check | scripts/verify-three-portals-story.sh + 验证报告 | 13,14 |

**收尾（SDD 过程层，非计划任务）**：Task 15 过后走整分支终审（review-package 全 range）→ 按 spec §7.5 把旧 SDD（2026-09-21）未裁项处置核销 → finishing-a-development-branch（本地仓库=main 直接落地，收尾动作以台账记录代替分支合并）。

**每任务统一测试形态**（前端无测试框架，验证纪律如下，各任务步骤内给精确命令）：
- `node --check <每个新增/修改 JS>`；
- 纯函数用 `node -e` 断言（geo.js 有完整断言脚本；页面 JS 依赖 DOM 不做）；
- HTML/CSS 用 grep 结构断言（script 顺序、类名、令牌定义存在性）；
- 页面级行为 = DEFERRED-HUMAN 清单（Task 15 汇总成核对表）；
- 集成链路 = Task 15 隔离 sim curl 断言。

---

### Task 1: vendor 底座入库 + serve-frontend.sh 执行位

**Files:**
- Create: `frontend/vendor/leaflet/leaflet.js`、`frontend/vendor/leaflet/leaflet.css`、`frontend/vendor/leaflet/LICENSE`、`frontend/vendor/leaflet/images/{layers.png,layers-2x.png,marker-icon.png,marker-icon-2x.png,marker-shadow.png}`
- Create: `frontend/vendor/qrcode/qrcode.js`、`frontend/vendor/qrcode/LICENSE`
- Modify: `scripts/serve-frontend.sh`（仅文件 mode 644→755，内容零改动）

**Interfaces:**
- Consumes: 无（首个任务）。
- Produces:
  - 全局 `L`（Leaflet 1.9.4 UMD，`vendor/leaflet/leaflet.js`）——Task 4 map.js 依赖；`leaflet.css` 与 `images/` **必须保持同级**（CSS url() 与 JS 默认图标按相对路径探测五个 png）。
  - 全局函数 `qrcode(typeNumber, errorCorrectionLevel)`（`vendor/qrcode/qrcode.js`，qrcode-generator 2.0.4）→ 实例方法 `addData(str)` / `make()` / `createSvgTag(cellSize, margin)`（亦支持对象入参 `createSvgTag({cellSize, margin, scalable})`——portal.js renderQR 用此形式）/ `createDataURL(cellSize, margin)` / `createImgTag(cellSize, margin)` / `renderTo2dContext(context, cellSize)`——Task 6 aircraft/license 页依赖（经 PORTAL.renderQR，不直接调用）。**注意：2.0.4 无 `createCanvas` 方法**（Task 1 评审实证：canvas 能力即 `renderTo2dContext`，qrcode.js:719）。
  - `bash scripts/serve-frontend.sh` 与 `./scripts/serve-frontend.sh` 均可用。

**背景事实（照抄执行，勿另行发明）：** sha256 值来自锚点档案 `.git/sdd/planB-frontend-anchors.md` §13（2026-10-06 实测下载核验，Leaflet SRI 与官方公布值一致）；qrcode-generator 必须取 **2.0.4**（相对 1.4.4 仅一行差异=canvas `fillRect(row,col)→(col,row)` 转置 bug 修复）。

- [ ] **Step 1: 建目录并下载 Leaflet 1.9.4（7 文件）**

```bash
cd /root/codes/skytrust-uav-supervision
mkdir -p frontend/vendor/leaflet/images frontend/vendor/qrcode
B=https://unpkg.com/leaflet@1.9.4
curl -fSL --retry 2 -o frontend/vendor/leaflet/leaflet.js   $B/dist/leaflet.js
curl -fSL --retry 2 -o frontend/vendor/leaflet/leaflet.css  $B/dist/leaflet.css
for f in layers.png layers-2x.png marker-icon.png marker-icon-2x.png marker-shadow.png; do
  curl -fSL --retry 2 -o frontend/vendor/leaflet/images/$f $B/dist/images/$f
done
```

网络兜底（仅当 unpkg 不可达时启用，逐字执行）：`curl -fSL -o /tmp/leaflet.tgz https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz && tar -xzf /tmp/leaflet.tgz -C /tmp package/dist && cp /tmp/package/dist/leaflet.js /tmp/package/dist/leaflet.css frontend/vendor/leaflet/ && cp /tmp/package/dist/images/{layers.png,layers-2x.png,marker-icon.png,marker-icon-2x.png,marker-shadow.png} frontend/vendor/leaflet/images/`。下载后必须过 Step 3 校验，校验不过=BLOCKED（绝不放宽哈希）。

- [ ] **Step 2: 下载 qrcode-generator 2.0.4（1 文件）+ 两份 LICENSE**

```bash
curl -fSL --retry 2 -o frontend/vendor/qrcode/qrcode.js https://unpkg.com/qrcode-generator@2.0.4/dist/qrcode.js
curl -fSL --retry 2 -o frontend/vendor/leaflet/LICENSE  https://unpkg.com/leaflet@1.9.4/LICENSE
curl -fSL --retry 2 -o frontend/vendor/qrcode/LICENSE   https://unpkg.com/qrcode-generator@2.0.4/LICENSE
```

LICENSE 兜底：任一 LICENSE 拉取 404/失败时，改为手写该文件——Leaflet 用 BSD-2-Clause 全文（版权行 `Copyright (c) 2010-2023, Volodymyr Agafonkin` 与 `Copyright (c) 2010-2011, CloudMade` + 标准两条款）；qrcode-generator 用 MIT 全文（版权行 `Copyright (c) 2012 Kazuhiko Arase`）。并在实施报告记录「LICENSE 为手写兜底」。

- [ ] **Step 3: sha256 钉死校验（硬门，任何一条不符 = BLOCKED）**

```bash
cd /root/codes/skytrust-uav-supervision
cat > /tmp/vendor-manifest.sha256 <<'MANIFEST'
db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a  frontend/vendor/leaflet/leaflet.js
a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6  frontend/vendor/leaflet/leaflet.css
79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c  frontend/vendor/qrcode/qrcode.js
MANIFEST
sha256sum -c /tmp/vendor-manifest.sha256
```

预期输出三行均 `: OK`。png 无完整哈希档案，按**精确字节数 + 魔数**校验并把实测 sha256 记入报告（供未来钉死）：

```bash
stat -c '%s %n' frontend/vendor/leaflet/images/*.png
file frontend/vendor/leaflet/images/*.png
sha256sum frontend/vendor/leaflet/images/*.png
```

预期字节数（一个不差）：`layers.png=696  layers-2x.png=1259  marker-icon.png=1466  marker-icon-2x.png=2464  marker-shadow.png=618`；`file` 全部报 `PNG image data`。

- [ ] **Step 4: 版本与语法断言**

```bash
head -c 400 frontend/vendor/leaflet/leaflet.js | grep -o '1\.9\.4' | head -1     # 预期输出 1.9.4（UMD @preserve 头）
node --check frontend/vendor/leaflet/leaflet.js && echo LEAFLET_SYNTAX_OK
node --check frontend/vendor/qrcode/qrcode.js  && echo QRCODE_SYNTAX_OK
ls frontend/vendor/leaflet/ frontend/vendor/leaflet/images/ frontend/vendor/qrcode/
```

预期：`1.9.4`、两条 `*_SYNTAX_OK`；目录清单=leaflet/{LICENSE,leaflet.css,leaflet.js,images/}、images/ 五 png、qrcode/{LICENSE,qrcode.js}；`leaflet.css` 与 `images/` 同级（布局硬约束）。

- [ ] **Step 5: serve-frontend.sh 补执行位（spec §7.2 遗留项；内容零改动）**

```bash
chmod +x scripts/serve-frontend.sh
ls -l scripts/serve-frontend.sh          # 预期 -rwxr-xr-x
git diff --stat                           # 预期：工作树零内容 diff（mode 变化由 git add 后 ls-files 验证）
```

`scripts/serve-frontend.py` 保持 644 不动（经 `python3` 调用，无执行位需求；本任务只修 .sh——与 spec §7.2 逐项对应）。

- [ ] **Step 6: 提交**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/vendor scripts/serve-frontend.sh
git diff --cached --stat                  # 核验：10 个新文件 + serve-frontend.sh mode 变化，无其他条目
git ls-files -s scripts/serve-frontend.sh # 预期 mode 100755
git commit -m "$(cat <<'MSG'
chore(frontend): vendor 底座入库——Leaflet 1.9.4 + qrcode-generator 2.0.4（sha256 钉死）、serve-frontend.sh 补执行位（计划 B Task 1）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

预存脏文件（CLAUDE.md、platforms 子模块噪声）永不 stage；`git diff --cached --stat` 出现清单外条目即停手排查。

---

### Task 2: drone.css 共享设计系统 + 三份主题令牌

**Files:**
- Create: `frontend/css/drone.css`
- Create: `frontend/css/theme-op.css`、`frontend/css/theme-au.css`、`frontend/css/theme-rg.css`

**Interfaces:**
- Consumes: product.css 的 `p-` 结构类与 `--p-*` 令牌（加载顺序 product.css → drone.css → theme-*.css，后者覆盖令牌值）；product.css 模态/抽屉遮罩 z-index=1000（本文件壳层 chrome 必须 <1000，toast/tip >1000）。
- Produces（Task 4/5/6-12 全部依赖的类名与令牌，逐字）：
  - 令牌：`--d-bg --d-panel --d-panel-2 --d-line --d-line-strong --d-ink --d-ink-2 --d-ink-3 --d-brand --d-brand-ink --d-brand-soft --d-good(-soft) --d-warning(-soft) --d-critical(-soft) --d-serious(-soft) --d-info(-soft) --d-side-bg --d-side-ink --d-side-active --d-side-line --d-radius --d-radius-sm --d-shadow --d-font --d-mono --d-topbar-h --d-subbar-h --d-side-w --d-map-grid --d-map-grid-line --d-hero-grad --d-seal-ink`
  - 壳类：`body.d-portal`（+`.d-op/.d-au/.d-rg`）；顶导航布局 `.d-topbar .d-brand .d-brand-sub .d-nav .d-nav-item(.active) .d-topbar-right`；侧栏布局 `.d-layout .d-side .d-sidenav .d-side-foot .d-body .d-subbar .d-main`；`.d-chiprow`
  - 状态灯：`.d-lamps .d-lampwrap .d-lamp(.on/.off/.err)[data-chain] .d-backend(.ok/.bad)`
  - 地图：`.d-map(.is-fallback) .d-map-sm .d-map-lg .d-map-xl .d-map-badge .d-map-hint .d-map-empty`；地图标记 `.d-drone-ico`（航向经 `--hdg` CSS 变量旋转）`.d-wormhole-ico .d-alert-pin`
  - 组件：`.d-hero .d-hero-head .d-hero-title .d-hero-sub .d-hero-map`；`.d-entry-grid .d-entry-card .d-entry-ico`；`.d-notice .d-notice-date`；`.d-cert .d-cert-head .d-cert-title .d-cert-no .d-cert-body .d-cert-main .d-qr .d-qr-none .d-seal`；`.d-idbar .d-idbar-label .d-idchip`；`.d-break .d-break-title .d-break-item(.ok) .d-break-lv .d-break-txt`；`.d-cockpit .d-cockpit-side`；`.d-keyform .d-linkbtn`
  - 图标：`.d-ico .d-ico-sm .d-ico-lg`（stroke 线性图标，配 HTML 内 `<symbol id="d-ico-*">` 雪碧图）
  - 工具类：`.d-row(.d-row-top/.d-row-wrap) .d-col .d-grid-2 .d-grid-3 .d-grid-4 .d-grid-side .d-mt .d-mb .d-mt2 .d-mb2 .d-muted .d-small .d-strong .d-num .d-section .d-toolbar .d-spacer .d-center .d-hidden .d-scroll-x`
  - 兼容层（ui.js 硬编码类名，门户内重实现）：`#toast-box .toast(.ok/.err) .tip(.show) .json-block(.jk/.js/.jn/.jb)`

- [ ] **Step 1: 写 `frontend/css/drone.css`（全文逐字如下）**

```css
/* drone.css — SkyTrust 三端门户共享设计系统（计划 B Task 2）
   加载顺序：product.css → drone.css → theme-op|au|rg.css（主题文件只覆盖令牌值）。
   命名空间铁律：本文件只定义 d- 前缀类 + 兼容层（.toast/.tip/.json-block/#toast-box，
   ui.js 硬编码发射这些名字）；绝不定义/重绘 p- 类结构规则（product.css 专属）。
   z-index 层级：壳层 chrome ≤900（product.css 模态/抽屉遮罩=1000 必须盖过壳层），
   toast=1200、tip=1300（盖过模态）；.d-map 以 isolation:isolate 封住 Leaflet 内部层级。
   设计基调：政务风——等宽数字、状态徽章、克制阴影、卡片圆角 10px、状态永不单靠颜色。 */

/* ---------- 0. 迷你 reset（门户不加载 app.css） ---------- */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body.d-portal {
  font-family: var(--d-font);
  background: var(--d-bg);
  color: var(--d-ink);
  font-size: 14px;
  line-height: 1.55;
  min-height: 100vh;
}
a { color: var(--d-brand); }
button { font-family: inherit; }

/* ---------- 1. --d-* 令牌基座（浅色默认值；theme-*.css 覆盖） ---------- */
:root {
  --d-bg: #f4f6fa;
  --d-panel: #ffffff;
  --d-panel-2: #f0f3f8;
  --d-line: #dfe4ee;
  --d-line-strong: #c6cddf;
  --d-ink: #1b2434;
  --d-ink-2: #4a5568;
  --d-ink-3: #7b8699;
  --d-brand: #0b4ea2;
  --d-brand-ink: #ffffff;
  --d-brand-soft: #e7eff9;
  --d-good: #15803d;      --d-good-soft: #e6f4ea;
  --d-warning: #b45309;   --d-warning-soft: #fdf1de;
  --d-critical: #b91c1c;  --d-critical-soft: #fbe9e9;
  --d-serious: #c2410c;   --d-serious-soft: #fdeee6;
  --d-info: #1d4ed8;      --d-info-soft: #e8eefc;
  --d-side-bg: #12396e;
  --d-side-ink: #c8d6ea;
  --d-side-active: #ffffff;
  --d-side-line: rgba(255, 255, 255, .14);
  --d-radius: 10px;
  --d-radius-sm: 6px;
  --d-shadow: 0 1px 2px rgba(16, 32, 64, .06), 0 4px 14px rgba(16, 32, 64, .07);
  --d-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
            "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --d-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace;
  --d-topbar-h: 56px;
  --d-subbar-h: 46px;
  --d-side-w: 216px;
  --d-map-grid: #e8ecf3;              /* 退化底图基色 */
  --d-map-grid-line: rgba(27, 36, 52, .07);
  --d-hero-grad: linear-gradient(135deg, #0b4ea2, #1668c9);
  --d-seal-ink: #c0392b;              /* 证照印章红 */
}

/* ---------- 2. 壳层：顶部导航布局（运营商端） ---------- */
.d-topbar {
  position: sticky; top: 0; z-index: 900;
  height: var(--d-topbar-h);
  display: flex; align-items: center; gap: 18px;
  padding: 0 18px;
  background: var(--d-panel);
  border-bottom: 1px solid var(--d-line);
  box-shadow: var(--d-shadow);
}
.d-brand {
  display: flex; align-items: center; gap: 8px;
  font-weight: 700; font-size: 15px; color: var(--d-ink);
  white-space: nowrap; text-decoration: none;
}
.d-brand .d-ico { width: 22px; height: 22px; color: var(--d-brand); }
.d-brand-sub { font-size: 11px; color: var(--d-ink-3); font-weight: 400; }
.d-nav { display: flex; gap: 2px; flex: 1; overflow-x: auto; min-width: 0; }
.d-nav-item {
  padding: 0 14px; height: var(--d-topbar-h);
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 14px; color: var(--d-ink-2); text-decoration: none;
  border: none; border-bottom: 3px solid transparent;
  background: none; cursor: pointer; white-space: nowrap;
}
.d-nav-item:hover { color: var(--d-brand); background: var(--d-brand-soft); }
.d-nav-item.active { color: var(--d-brand); font-weight: 600; border-bottom-color: var(--d-brand); }
.d-topbar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }

/* ---------- 3. 壳层：侧栏布局（管理端/监管端） ---------- */
.d-layout { display: flex; min-height: 100vh; }
.d-side {
  width: var(--d-side-w); flex: 0 0 var(--d-side-w);
  background: var(--d-side-bg); color: var(--d-side-ink);
  position: sticky; top: 0; height: 100vh;
  display: flex; flex-direction: column; z-index: 900;
}
.d-side .d-brand { color: #fff; padding: 14px 16px; border-bottom: 1px solid var(--d-side-line); }
.d-side .d-brand .d-ico { color: #fff; }
.d-sidenav { flex: 1; overflow-y: auto; padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; }
.d-sidenav .d-nav-item {
  height: auto; padding: 9px 12px;
  border-radius: var(--d-radius-sm); border-bottom: none;
  color: var(--d-side-ink); justify-content: flex-start;
}
.d-sidenav .d-nav-item:hover { background: rgba(255, 255, 255, .07); color: #fff; }
.d-sidenav .d-nav-item.active {
  background: var(--d-brand); color: #fff; font-weight: 600;
  box-shadow: inset 3px 0 0 rgba(255, 255, 255, .55);
}
.d-side-foot {
  padding: 10px 16px; font-size: 11px; color: var(--d-side-ink);
  opacity: .75; border-top: 1px solid var(--d-side-line);
}
.d-side-foot a { color: inherit; text-decoration: underline; }
.d-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.d-subbar {
  position: sticky; top: 0; z-index: 890;
  min-height: var(--d-subbar-h);
  display: flex; align-items: center; gap: 12px;
  padding: 6px 18px;
  background: var(--d-panel); border-bottom: 1px solid var(--d-line);
}
.d-main { flex: 1; padding: 18px; min-width: 0; }
.d-chiprow { padding: 6px 18px 0; }
.d-chiprow:empty { display: none; }

/* ---------- 4. 三链状态灯 + 后端徽章 ---------- */
.d-lamps { display: inline-flex; gap: 8px; align-items: center; }
.d-lampwrap { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; color: var(--d-ink-3); }
.d-lamp {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--d-line-strong); display: inline-block;
}
.d-lamp.on  { background: var(--d-good);     box-shadow: 0 0 6px var(--d-good); }
.d-lamp.err { background: var(--d-critical); box-shadow: 0 0 6px var(--d-critical); }
.d-backend {
  font-size: 11px; padding: 2px 8px; border-radius: 999px;
  border: 1px solid var(--d-line); color: var(--d-ink-3);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.d-backend.ok  { color: var(--d-good);     border-color: var(--d-good);     background: var(--d-good-soft); }
.d-backend.bad { color: var(--d-critical); border-color: var(--d-critical); background: var(--d-critical-soft); }

/* ---------- 5. 地图容器 + 退化底图 + 覆盖徽章 ---------- */
.d-map {
  position: relative; z-index: 0; isolation: isolate;
  height: 380px;
  border: 1px solid var(--d-line); border-radius: var(--d-radius);
  overflow: hidden; background: var(--d-map-grid);
}
.d-map-sm { height: 220px; }
.d-map-lg { height: 560px; }
.d-map-xl { height: calc(100vh - 210px); min-height: 480px; }
.d-map.is-fallback {
  background-image:
    linear-gradient(var(--d-map-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--d-map-grid-line) 1px, transparent 1px);
  background-size: 28px 28px, 28px 28px;
}
.d-map-badge {
  position: absolute; top: 8px; right: 8px; z-index: 5;
  padding: 3px 10px; border-radius: 999px; font-size: 11px;
  background: var(--d-warning-soft); color: var(--d-warning);
  border: 1px solid var(--d-warning); pointer-events: none;
}
.d-map-hint {
  position: absolute; bottom: 8px; left: 8px; z-index: 5;
  padding: 3px 10px; border-radius: 999px; font-size: 11px;
  background: var(--d-panel); color: var(--d-ink-2);
  border: 1px solid var(--d-line); box-shadow: var(--d-shadow);
}
.d-map-empty {
  position: absolute; inset: 0; z-index: 4;
  display: flex; align-items: center; justify-content: center;
  color: var(--d-ink-3); font-size: 13px; pointer-events: none;
}
.leaflet-container { font-family: var(--d-font); }
.d-map .leaflet-control-attribution { font-size: 10px; opacity: .65; }

/* ---------- 6. 地图标记（Leaflet divIcon） ---------- */
.d-drone-ico { position: relative; width: 30px; height: 30px; }
.d-drone-ico svg {
  width: 30px; height: 30px; color: var(--d-brand);
  transform: rotate(var(--hdg, 0deg));
  transition: transform .8s linear;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .35));
}
.d-drone-ico::before {
  content: ""; position: absolute; inset: -7px; border-radius: 50%;
  border: 2px solid var(--d-brand); opacity: .35;
  animation: d-pulse 2s ease-out infinite;
}
@keyframes d-pulse {
  0%   { transform: scale(.6);  opacity: .5; }
  100% { transform: scale(1.25); opacity: 0; }
}
.d-wormhole-ico {
  width: 26px; height: 26px; border-radius: 50%;
  border: 2px dashed var(--d-critical);
  background: var(--d-critical-soft); color: var(--d-critical);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
}
.d-alert-pin {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--d-critical); border: 2px solid #fff;
  box-shadow: 0 0 0 2px var(--d-critical);
}

/* ---------- 7. 服务首页：hero + 入口卡片 + 公告 ---------- */
.d-hero {
  border-radius: var(--d-radius); overflow: hidden;
  border: 1px solid var(--d-line); box-shadow: var(--d-shadow);
  background: var(--d-panel); margin-bottom: 16px;
}
.d-hero-head { padding: 18px 20px 14px; background: var(--d-hero-grad); color: #fff; }
.d-hero-title { margin: 0; font-size: 22px; letter-spacing: .02em; }
.d-hero-sub { margin: 6px 0 0; font-size: 13px; opacity: .85; }
.d-hero-map { height: 420px; border: none; border-radius: 0; }
.d-entry-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.d-entry-card {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 16px; background: var(--d-panel);
  border: 1px solid var(--d-line); border-radius: var(--d-radius);
  box-shadow: var(--d-shadow); cursor: pointer;
  text-decoration: none; color: inherit; text-align: left;
  transition: border-color .15s, transform .15s;
}
.d-entry-card:hover { border-color: var(--d-brand); transform: translateY(-2px); }
.d-entry-ico {
  flex: 0 0 44px; width: 44px; height: 44px;
  border-radius: var(--d-radius-sm);
  background: var(--d-brand-soft); color: var(--d-brand);
  display: flex; align-items: center; justify-content: center;
}
.d-entry-ico .d-ico { width: 24px; height: 24px; }
.d-entry-card h3 { margin: 0 0 4px; font-size: 15px; }
.d-entry-card p { margin: 0; font-size: 12px; color: var(--d-ink-3); line-height: 1.5; }
.d-notice {
  background: var(--d-panel); border: 1px solid var(--d-line);
  border-radius: var(--d-radius); padding: 14px 16px;
}
.d-notice h3 { margin: 0 0 8px; font-size: 14px; }
.d-notice ul { margin: 0; padding-left: 18px; }
.d-notice li { font-size: 12.5px; color: var(--d-ink-2); margin: 6px 0; }
.d-notice-date { color: var(--d-ink-3); font-size: 11px; margin-left: 8px; }

/* ---------- 8. 证照卡（登记标志/电子许可/执照） ---------- */
.d-cert {
  position: relative; overflow: hidden;
  border: 1px solid var(--d-line-strong); border-radius: var(--d-radius);
  background: var(--d-panel); box-shadow: var(--d-shadow);
}
.d-cert::before {
  content: ""; position: absolute; inset: 6px;
  border: 1px solid var(--d-line);
  border-radius: calc(var(--d-radius) - 3px);
  pointer-events: none;
}
.d-cert-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px; border-bottom: 1px solid var(--d-line);
  background: var(--d-brand-soft);
}
.d-cert-title { font-size: 16px; font-weight: 700; letter-spacing: .08em; color: var(--d-brand); }
.d-cert-no { margin-left: auto; font-family: var(--d-mono); font-size: 13px; color: var(--d-ink-2); }
.d-cert-body { display: flex; gap: 18px; padding: 16px 18px; }
.d-cert-main { flex: 1; min-width: 0; }
.d-qr {
  flex: 0 0 128px; width: 128px; height: 128px; padding: 6px;
  background: #fff; border: 1px solid var(--d-line);
  border-radius: var(--d-radius-sm);
  display: flex; align-items: center; justify-content: center;
}
.d-qr svg, .d-qr img, .d-qr canvas { width: 100%; height: 100%; }
.d-qr-none { font-size: 11px; color: var(--d-ink-3); text-align: center; padding: 24px 6px; }
.d-seal {
  position: absolute; right: 26px; bottom: 20px;
  width: 84px; height: 84px; border-radius: 50%;
  border: 3px double var(--d-seal-ink); color: var(--d-seal-ink);
  display: flex; align-items: center; justify-content: center;
  text-align: center; font-size: 11px; line-height: 1.4;
  transform: rotate(-12deg); opacity: .8; pointer-events: none;
  white-space: pre-line;
}

/* ---------- 9. 身份选择条（运营商端「轻量登录」叙事） ---------- */
.d-idbar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px; margin-bottom: 14px;
  background: var(--d-brand-soft);
  border: 1px solid var(--d-line); border-radius: var(--d-radius);
}
.d-idbar-label { font-size: 12px; color: var(--d-ink-2); }
.d-idchip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 999px;
  background: var(--d-panel); border: 1px solid var(--d-brand);
  color: var(--d-brand); font-size: 12px; font-family: var(--d-mono);
}

/* ---------- 10. 追踪断链时间线（5001 errCard 下补渲） ---------- */
.d-break {
  margin-top: 12px; padding: 12px 14px;
  border: 1px solid var(--d-line); border-left: 4px solid var(--d-critical);
  border-radius: var(--d-radius-sm); background: var(--d-panel);
}
.d-break-title { font-size: 13px; font-weight: 700; color: var(--d-critical); margin-bottom: 8px; }
.d-break-item { display: flex; gap: 10px; padding: 5px 0; border-top: 1px dashed var(--d-line); font-size: 12.5px; }
.d-break-item:first-of-type { border-top: none; }
.d-break-lv { flex: 0 0 72px; font-family: var(--d-mono); color: var(--d-ink-3); }
.d-break-txt { color: var(--d-ink-2); min-width: 0; }
.d-break-item.ok .d-break-lv { color: var(--d-good); }

/* ---------- 11. 监管驾驶舱大屏 ---------- */
.d-cockpit { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 14px; align-items: stretch; }
.d-cockpit .d-map-xl { height: calc(100vh - 190px); min-height: 420px; }
.d-cockpit-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
@media (max-width: 1100px) { .d-cockpit { grid-template-columns: 1fr; } }

/* ---------- 12. 天地图 key 引导 ---------- */
.d-keyform { display: flex; gap: 8px; margin-top: 10px; }
.d-keyform input {
  flex: 1; min-width: 0; padding: 8px 10px;
  border: 1px solid var(--d-line-strong); border-radius: var(--d-radius-sm);
  font-family: var(--d-mono); font-size: 13px;
  background: var(--d-panel); color: var(--d-ink);
}
.d-linkbtn {
  background: none; border: none; padding: 0;
  color: var(--d-brand); cursor: pointer; font-size: 12.5px; text-decoration: underline;
}

/* ---------- 13. 图标（stroke 线性，配 HTML symbol 雪碧图） ---------- */
.d-ico {
  width: 18px; height: 18px; flex: 0 0 auto;
  fill: none; stroke: currentColor; stroke-width: 1.7;
  stroke-linecap: round; stroke-linejoin: round;
}
.d-ico-sm { width: 14px; height: 14px; }
.d-ico-lg { width: 26px; height: 26px; }

/* ---------- 14. 布局与文本工具类 ---------- */
.d-row { display: flex; gap: 10px; align-items: center; }
.d-row-top { align-items: flex-start; }
.d-row-wrap { flex-wrap: wrap; }
.d-col { display: flex; flex-direction: column; gap: 10px; }
.d-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.d-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.d-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.d-grid-side { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
@media (max-width: 980px) {
  .d-grid-3, .d-grid-4 { grid-template-columns: 1fr 1fr; }
  .d-grid-side { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .d-grid-2, .d-grid-3, .d-grid-4 { grid-template-columns: 1fr; }
}
.d-mt { margin-top: 10px; }  .d-mb { margin-bottom: 10px; }
.d-mt2 { margin-top: 18px; } .d-mb2 { margin-bottom: 18px; }
.d-muted { color: var(--d-ink-3); }
.d-small { font-size: 12px; }
.d-strong { font-weight: 600; }
.d-num { font-family: var(--d-mono); font-variant-numeric: tabular-nums; }
.d-section {
  margin: 18px 0 10px; font-size: 14px; font-weight: 700; color: var(--d-ink);
  display: flex; align-items: center; gap: 8px;
}
.d-section::before { content: ""; width: 4px; height: 14px; border-radius: 2px; background: var(--d-brand); }
.d-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.d-spacer { flex: 1; }
.d-center { text-align: center; }
.d-hidden { display: none !important; }
.d-scroll-x { overflow-x: auto; }

/* ---------- 15. 兼容层：ui.js 硬编码类名在门户内的结构重实现 ---------- */
#toast-box {
  position: fixed; right: 18px; bottom: 18px; z-index: 1200;
  display: flex; flex-direction: column; gap: 8px; max-width: 420px;
}
.toast {
  padding: 9px 14px; border-radius: var(--d-radius-sm);
  background: var(--d-panel); border: 1px solid var(--d-line);
  box-shadow: var(--d-shadow); font-size: 13px; color: var(--d-ink);
  animation: d-toast-in .18s ease-out;
}
.toast.ok  { border-color: var(--d-good);     background: var(--d-good-soft);     color: var(--d-good); }
.toast.err { border-color: var(--d-critical); background: var(--d-critical-soft); color: var(--d-critical); }
@keyframes d-toast-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}
.tip {
  position: fixed; z-index: 1300; pointer-events: none;
  opacity: 0; transition: opacity .12s;
  max-width: 340px; padding: 8px 10px;
  border-radius: var(--d-radius-sm);
  background: rgba(16, 24, 40, .92); color: #f2f5fa;
  font-size: 12px; line-height: 1.5;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .25);
}
.tip.show { opacity: 1; }
.json-block {
  margin: 0; padding: 10px 12px;
  border-radius: var(--d-radius-sm);
  background: var(--d-panel-2); border: 1px solid var(--d-line);
  font-family: var(--d-mono); font-size: 12px; line-height: 1.5;
  color: var(--d-ink-2);
  overflow: auto; max-height: 320px;
  white-space: pre-wrap; word-break: break-all;
}
.json-block .jk { color: var(--d-info); }
.json-block .js { color: var(--d-good); }
.json-block .jn { color: var(--d-warning); }
.json-block .jb { color: var(--d-serious); }
```

- [ ] **Step 2: 写 `frontend/css/theme-op.css`（运营商端：政务蓝白，全文逐字）**

```css
/* theme-op.css — 运营商端令牌：政务蓝白（贴 UOM，spec §4.3）。
   加载于 drone.css 之后；只覆盖令牌值，不写结构规则。
   --p-* 覆盖 = pui 组件（dataTable/form/drawer/errCard…）随端换肤。 */
:root {
  --d-bg: #f4f6fa;
  --d-panel: #ffffff;
  --d-panel-2: #f0f4fa;
  --d-line: #dde5f0;
  --d-line-strong: #c3d0e4;
  --d-ink: #1c2b41;
  --d-ink-2: #46586f;
  --d-ink-3: #77879c;
  --d-brand: #0b4ea2;
  --d-brand-ink: #ffffff;
  --d-brand-soft: #e7eff9;
  --d-hero-grad: linear-gradient(135deg, #0b4ea2, #1668c9);
  --d-side-bg: #0b4ea2;
  --d-seal-ink: #c0392b;
  /* pui 组件换肤（product.css :root 同名令牌的政务蓝版本） */
  --p-bg: #f4f6fa;
  --p-panel: #ffffff;
  --p-panel-2: #f0f4fa;
  --p-line: #dde5f0;
  --p-line-strong: #c3d0e4;
  --p-ink: #1c2b41;
  --p-ink-2: #46586f;
  --p-ink-3: #77879c;
  --p-brand: #0b4ea2;
  --p-brand-ink: #ffffff;
  --p-brand-soft: #e7eff9;
  --p-info: #1d4ed8;
  --p-info-soft: #e8eefc;
}
```

- [ ] **Step 3: 写 `frontend/css/theme-au.css`（管理端：深蓝权威浅色，全文逐字）**

```css
/* theme-au.css — 管理当局端令牌：深蓝权威浅色（高密度表格叙事，spec §4.3）。
   加载于 drone.css 之后；只覆盖令牌值。 */
:root {
  --d-bg: #f2f4f8;
  --d-panel: #ffffff;
  --d-panel-2: #eef1f7;
  --d-line: #dbe1ec;
  --d-line-strong: #bfc9db;
  --d-ink: #182539;
  --d-ink-2: #41506a;
  --d-ink-3: #71809a;
  --d-brand: #143d75;
  --d-brand-ink: #ffffff;
  --d-brand-soft: #e9eff8;
  --d-hero-grad: linear-gradient(135deg, #143d75, #1f5aa8);
  --d-side-bg: #16305c;
  --d-side-ink: #c3d2e8;
  --d-side-line: rgba(255, 255, 255, .14);
  --d-seal-ink: #a93226;
  /* pui 组件换肤 */
  --p-bg: #f2f4f8;
  --p-panel: #ffffff;
  --p-panel-2: #eef1f7;
  --p-line: #dbe1ec;
  --p-line-strong: #bfc9db;
  --p-ink: #182539;
  --p-ink-2: #41506a;
  --p-ink-3: #71809a;
  --p-brand: #143d75;
  --p-brand-ink: #ffffff;
  --p-brand-soft: #e9eff8;
  --p-info: #1d4ed8;
  --p-info-soft: #e8eefc;
  --p-row-h: 32px; /* 管理端高密度表格 */
}
```

- [ ] **Step 4: 写 `frontend/css/theme-rg.css`（监管端：深藏青大屏，全文逐字）**

```css
/* theme-rg.css — 监管当局端令牌：深藏青驾驶舱大屏（spec §4.3）。
   regulator.html 的 <body data-theme="dark"> 为固定属性（无切换）。
   --p-* 深色覆盖必须挂在 body[data-theme="dark"] 选择器上：
   product.css 的暗色块即此选择器（同特异性、本文件后加载 → 覆盖生效）；
   --d-* 无竞争者，:root 即可。告警红/黄语义、不用霓虹青。 */
:root {
  --d-bg: #0a1628;
  --d-panel: #101f36;
  --d-panel-2: #0d1a2e;
  --d-line: #1d3252;
  --d-line-strong: #2a4470;
  --d-ink: #dbe7f5;
  --d-ink-2: #9fb2cc;
  --d-ink-3: #6f83a1;
  --d-brand: #3d7fd6;
  --d-brand-ink: #ffffff;
  --d-brand-soft: #14294a;
  --d-good: #3f9e5f;     --d-good-soft: #12291c;
  --d-warning: #d99a2b;  --d-warning-soft: #2c2113;
  --d-critical: #e5484d; --d-critical-soft: #31161a;
  --d-serious: #d97a3c;  --d-serious-soft: #2e1c11;
  --d-info: #5b8def;     --d-info-soft: #13233f;
  --d-hero-grad: linear-gradient(135deg, #12294d, #1b4a8a);
  --d-side-bg: #081120;
  --d-side-ink: #8fa5c4;
  --d-side-line: rgba(255, 255, 255, .1);
  --d-map-grid: #122036;
  --d-map-grid-line: rgba(219, 231, 245, .06);
  --d-seal-ink: #e07a6a;
  --d-shadow: 0 1px 2px rgba(0, 0, 0, .35), 0 4px 14px rgba(0, 0, 0, .3);
}
body[data-theme="dark"] {
  /* pui 组件深色藏青化（覆盖 product.css 暗色块的靛蓝系） */
  --p-bg: #0a1628;
  --p-panel: #101f36;
  --p-panel-2: #0d1a2e;
  --p-line: #1d3252;
  --p-line-strong: #2a4470;
  --p-ink: #dbe7f5;
  --p-ink-2: #9fb2cc;
  --p-ink-3: #6f83a1;
  --p-brand: #3d7fd6;
  --p-brand-ink: #ffffff;
  --p-brand-soft: #14294a;
  --p-info: #5b8def;
  --p-info-soft: #13233f;
  /* 链色暗底提亮一档（保持紫/蓝/青语义，不用霓虹青） */
  --p-chain-chainmaker: #9d7bef;
  --p-chain-fabric: #5b8def;
  --p-chain-fisco: #2ba3c2;
}
```

- [ ] **Step 5: 结构断言（全过才准提交）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
# 1) drone.css 不得定义任何 p- 类结构规则（注释行除外）
grep -qn '\.p-' css/drone.css && { echo P_CLASS_FOUND; grep -n '\.p-' css/drone.css; } || echo NO_P_CLASS_OK
# 2) 令牌基座完备（Task 2 Produces 清单的 --d-* 全部在 drone.css :root 定义）
for t in bg panel panel-2 line line-strong ink ink-2 ink-3 brand brand-ink brand-soft good warning critical serious info side-bg side-ink side-active side-line radius radius-sm shadow font mono topbar-h subbar-h side-w map-grid map-grid-line hero-grad seal-ink; do
  grep -q -- "--d-$t:" css/drone.css || echo "MISSING --d-$t"
done; echo TOKEN_SCAN_DONE
# 3) 三份主题文件各覆盖 --d-brand；rg 用 body[data-theme="dark"] 覆盖 --p-brand
grep -c -- '--d-brand:' css/theme-op.css css/theme-au.css css/theme-rg.css   # 预期各 ≥1
grep -q 'body\[data-theme="dark"\]' css/theme-rg.css && grep -A15 'body\[data-theme="dark"\]' css/theme-rg.css | grep -q -- '--p-brand:' && echo RG_DARK_OK
# 4) 兼容层四件套齐
for s in '#toast-box' '.toast' '.tip' '.json-block'; do grep -q -- "$s" css/drone.css || echo "MISSING $s"; done; echo COMPAT_OK
# 5) z-index 纪律：drone.css 中壳层 chrome <1000、toast/tip >1000
grep -n 'z-index' css/drone.css
```

预期：`NO_P_CLASS_OK`、`TOKEN_SCAN_DONE` 前零 MISSING、`RG_DARK_OK`、`COMPAT_OK` 前零 MISSING；z-index 清单=900/890/5/4/1200/1300（人工比对：壳层 ≤900 < product.css 模态 1000 < toast 1200 < tip 1300；`.d-map` 的 `z-index: 0` 为隔离层叠基线非壳层，不计入清单）。

- [ ] **Step 6: 提交**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/css/drone.css frontend/css/theme-op.css frontend/css/theme-au.css frontend/css/theme-rg.css
git diff --cached --stat   # 预期恰 4 个新文件
git commit -m "$(cat <<'MSG'
feat(frontend): 三端共享设计系统 drone.css + 政务蓝白/深蓝权威/深藏青三份主题令牌（计划 B Task 2）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: geo.js 演示地理数据层（纯函数 + node 断言）

**Files:**
- Create: `frontend/js/data/geo.js`

**Interfaces:**
- Consumes: 无（纯函数零依赖）。后端事实（已核实）：`RouteSegment{route_id,zone,start_point,end_point,start_lat,start_lon,end_lat,end_lon,altitude_min,altitude_max,corridor_status}`，corridor_status∈OPEN|RESTRICTED|CLOSED，seed 坐标域 30.510-30.620/114.310-114.420；`NetworkNode{node_id,node_type,sm9_identity,neighbors,position,lat,lon,status,risk_score}`，node_type∈UAV|EDGE|MANAGEMENT|ATTACKER，status∈ONLINE|ISOLATED|OFFLINE；坐标 0=未设（单零=赤道/本初子午线合法惯例，双零=未设）。
- Produces（Task 4 map.js 与 Task 6-12 页面全依赖，签名逐字）：
  - `window.GEO.DEFAULT_VIEW` = `{lat:30.55, lon:114.37, zoom:11}`
  - `GEO.ZONES`（['OPEN','RESTRICTED','CLOSED']）、`GEO.ZONE_COLOR/ZONE_FILL/ZONE_LABEL`（按 corridor_status 键）
  - `GEO.NODE_STYLE`（MANAGEMENT/EDGE/UAV/ATTACKER/DEFAULT → `{color,radius,label}`）
  - `GEO.isNum(v)`、`GEO.hasCoord(lat,lon)` → bool（双零/NaN/Inf/非数=false）
  - `GEO.segmentCoords(route)` → `[[lat,lon],[lat,lon]]` | null（任一端点双零即 null）
  - `GEO.routePoints(routes)` → `[[lat,lon],...]`（相邻去重、缺坐标整条跳过）
  - `GEO.zonePolygon(route, widthDeg?)` → 闭合环 `[[lat,lon]×5]`（首尾同点）| null；widthDeg 默认 0.004
  - `GEO.boundsOf(points)` → `[[minLat,minLon],[maxLat,maxLon]]` | null
  - `GEO.nodeCoord(node)` / `GEO.telemetryCoord(t)` → `[lat,lon]` | null
  - `GEO.nodeStyle(node)` → NODE_STYLE 项；`GEO.fmtCoord(v)` → '30.50000'|'--'；`GEO.fmtCoordPair(lat,lon)` → '30.50000, 114.30000'|'坐标未设'

- [ ] **Step 1: 写 `frontend/js/data/geo.js`（全文逐字）**

```js
/* geo.js — 演示地理数据层（计划 B Task 3，spec §3.1/§4.1）
   纯函数 + 常量，零 DOM/Leaflet 依赖；map.js 与三端页面消费。
   node 断言方式：global.window = {}; require(本文件) → window.GEO。
   坐标红线（Global Constraints #9）：lat/lon 双零=「未设」，hasCoord() 为唯一裁决——
   未设一律不画不连不猜；抽象 position{x,y} 非地理坐标，本模块不消费不投影。 */
(function () {
  'use strict';

  /* 默认视图：武汉演示空域（seed 航线坐标域 30.510-30.620 / 114.310-114.420 取中） */
  var DEFAULT_VIEW = { lat: 30.55, lon: 114.37, zoom: 11 };

  /* 走廊状态语义（RouteSegment.corridor_status） */
  var ZONES = ['OPEN', 'RESTRICTED', 'CLOSED'];
  var ZONE_COLOR = { OPEN: '#15803d', RESTRICTED: '#b45309', CLOSED: '#b91c1c' };
  var ZONE_FILL = {
    OPEN: 'rgba(21,128,61,.14)',
    RESTRICTED: 'rgba(180,83,9,.14)',
    CLOSED: 'rgba(185,28,28,.16)'
  };
  var ZONE_LABEL = { OPEN: '开放走廊', RESTRICTED: '限制走廊', CLOSED: '关闭走廊' };

  /* 节点类型样式（NetworkNode.node_type；链色语义见 Global Constraints #6） */
  var NODE_STYLE = {
    MANAGEMENT: { color: '#7c3aed', radius: 9, label: '管理节点' },
    EDGE:       { color: '#2563eb', radius: 7, label: '边缘中继' },
    UAV:        { color: '#0891b2', radius: 7, label: '航空器节点' },
    ATTACKER:   { color: '#b91c1c', radius: 8, label: '攻击节点' },
    DEFAULT:    { color: '#4a5568', radius: 6, label: '节点' }
  };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* 单点坐标有效性：lat 与 lon 均为有限数且非双零
     （双零=未设；单零=赤道/本初子午线，与后端既有惯例一致视为显式设定） */
  function hasCoord(lat, lon) {
    return isNum(lat) && isNum(lon) && !(lat === 0 && lon === 0);
  }

  /* 航线（route/list 行）→ 两端点坐标；任一端点缺 → null
     （与后端 corridorOf 逐端点判缺同语义：内嵌解析失败仅该端点两值留 0） */
  function segmentCoords(r) {
    if (!r) return null;
    if (!hasCoord(r.start_lat, r.start_lon)) return null;
    if (!hasCoord(r.end_lat, r.end_lon)) return null;
    return [[r.start_lat, r.start_lon], [r.end_lat, r.end_lon]];
  }

  /* 航线列表 → 折线点序（相邻共享端点去重；缺坐标航线整条跳过不造假） */
  function routePoints(routes) {
    var pts = [];
    (routes || []).forEach(function (r) {
      var c = segmentCoords(r);
      if (!c) return;
      var last = pts[pts.length - 1];
      if (!last || last[0] !== c[0][0] || last[1] !== c[0][1]) pts.push(c[0]);
      pts.push(c[1]);
    });
    return pts;
  }

  /* zone 缓冲多边形（spec §3.1：由前端从航线坐标生成，不入库）。
     航线两侧走廊带：垂直偏移 widthDeg（默认 0.004° ≈ 440m）；返回闭合环（首尾同点）。
     缺坐标航线 → null；零长段退化为小方块。平面近似，演示尺度失真可忽略。 */
  function zonePolygon(route, widthDeg) {
    var c = segmentCoords(route);
    if (!c) return null;
    var w = isNum(widthDeg) && widthDeg > 0 ? widthDeg : 0.004;
    var a = c[0], b = c[1];
    var dLat = b[0] - a[0], dLon = b[1] - a[1];
    var len = Math.sqrt(dLat * dLat + dLon * dLon);
    if (len === 0) {
      return [[a[0] - w, a[1] - w], [a[0] - w, a[1] + w], [a[0] + w, a[1] + w],
              [a[0] + w, a[1] - w], [a[0] - w, a[1] - w]];
    }
    var px = -dLon / len, py = dLat / len;   /* 垂直单位向量 */
    return [
      [a[0] + px * w, a[1] + py * w],
      [b[0] + px * w, b[1] + py * w],
      [b[0] - px * w, b[1] - py * w],
      [a[0] - px * w, a[1] - py * w],
      [a[0] + px * w, a[1] + py * w]
    ];
  }

  /* 点集 → 包围盒；空集/全缺坐标 → null */
  function boundsOf(points) {
    var pts = (points || []).filter(function (p) { return p && hasCoord(p[0], p[1]); });
    if (!pts.length) return null;
    var b = [[pts[0][0], pts[0][1]], [pts[0][0], pts[0][1]]];
    pts.forEach(function (p) {
      if (p[0] < b[0][0]) b[0][0] = p[0];
      if (p[1] < b[0][1]) b[0][1] = p[1];
      if (p[0] > b[1][0]) b[1][0] = p[0];
      if (p[1] > b[1][1]) b[1][1] = p[1];
    });
    return b;
  }

  /* 节点 → 坐标；lat/lon 未设（双零）→ null（不投影抽象 position，不造假） */
  function nodeCoord(n) {
    return n && hasCoord(n.lat, n.lon) ? [n.lat, n.lon] : null;
  }

  /* 遥测行（telemetry/list|latest 的 telemetry 对象）→ 坐标；同红线 */
  function telemetryCoord(t) {
    return t && hasCoord(t.lat, t.lon) ? [t.lat, t.lon] : null;
  }

  function nodeStyle(n) {
    return NODE_STYLE[(n && n.node_type) || ''] || NODE_STYLE.DEFAULT;
  }

  function fmtCoord(v) { return isNum(v) ? v.toFixed(5) : '--'; }
  function fmtCoordPair(lat, lon) {
    return hasCoord(lat, lon) ? fmtCoord(lat) + ', ' + fmtCoord(lon) : '坐标未设';
  }

  window.GEO = {
    DEFAULT_VIEW: DEFAULT_VIEW, ZONES: ZONES,
    ZONE_COLOR: ZONE_COLOR, ZONE_FILL: ZONE_FILL, ZONE_LABEL: ZONE_LABEL,
    NODE_STYLE: NODE_STYLE,
    isNum: isNum, hasCoord: hasCoord, segmentCoords: segmentCoords,
    routePoints: routePoints, zonePolygon: zonePolygon, boundsOf: boundsOf,
    nodeCoord: nodeCoord, telemetryCoord: telemetryCoord, nodeStyle: nodeStyle,
    fmtCoord: fmtCoord, fmtCoordPair: fmtCoordPair
  };
})();
```

- [ ] **Step 2: 语法门 + 纯函数断言（RED→GREEN 不适用——纯数据层，以断言脚本为测试）**

```bash
cd /root/codes/skytrust-uav-supervision
node --check frontend/js/data/geo.js && echo SYNTAX_OK
node -e '
global.window = {};
require("/root/codes/skytrust-uav-supervision/frontend/js/data/geo.js");
const G = window.GEO, assert = require("assert");
/* hasCoord：双零/单零/NaN/正常 */
assert.strictEqual(G.hasCoord(0, 0), false);
assert.strictEqual(G.hasCoord(30.5, 0), true);
assert.strictEqual(G.hasCoord(NaN, 114.3), false);
assert.strictEqual(G.hasCoord(30.5, Infinity), false);
assert.strictEqual(G.hasCoord(30.5, 114.3), true);
/* segmentCoords：全坐标/半套缺/全缺 */
const full = { start_lat: 30.51, start_lon: 114.31, end_lat: 30.54, end_lon: 114.34 };
assert.deepStrictEqual(G.segmentCoords(full), [[30.51, 114.31], [30.54, 114.34]]);
assert.strictEqual(G.segmentCoords({ start_lat: 30.51, start_lon: 114.31, end_lat: 0, end_lon: 0 }), null);
assert.strictEqual(G.segmentCoords({ start_lat: 0, start_lon: 0, end_lat: 30.54, end_lon: 114.34 }), null);
assert.strictEqual(G.segmentCoords(null), null);
/* routePoints：共享端点去重 + 缺坐标跳过 */
const rA = { start_lat: 30.51, start_lon: 114.31, end_lat: 30.54, end_lon: 114.34 };
const rB = { start_lat: 30.54, start_lon: 114.34, end_lat: 30.57, end_lon: 114.37 };
const rBad = { start_lat: 30.9, start_lon: 114.9, end_lat: 0, end_lon: 0 };
assert.deepStrictEqual(G.routePoints([rA, rB]), [[30.51,114.31],[30.54,114.34],[30.57,114.37]]);
assert.deepStrictEqual(G.routePoints([rA, rBad, rB]).length, 3);
assert.deepStrictEqual(G.routePoints([]), []);
/* zonePolygon：闭合环 5 点、首尾同点、缺坐标 null、零长段方块 */
const poly = G.zonePolygon(rA);
assert.strictEqual(poly.length, 5);
assert.deepStrictEqual(poly[0], poly[4]);
assert.strictEqual(G.zonePolygon(rBad), null);
const zero = { start_lat: 30.5, start_lon: 114.3, end_lat: 30.5, end_lon: 114.3 };
assert.strictEqual(G.zonePolygon(zero).length, 5);
assert.ok(Math.abs(G.zonePolygon(zero, 0.01)[2][0] - 30.51) < 1e-9);
/* 垂直性：走廊带四角到轴线距离≈widthDeg */
const w = 0.01, p = G.zonePolygon(rA, w);
const dx = rA.end_lon - rA.start_lon, dy = rA.end_lat - rA.start_lat;
const len = Math.sqrt(dx*dx + dy*dy);
const dist = Math.abs((p[0][0]-rA.start_lat)*(-dx/len) + (p[0][1]-rA.start_lon)*(dy/len));
assert.ok(Math.abs(dist - w) < 1e-9, "垂直偏移量应等于 widthDeg");
/* boundsOf */
assert.strictEqual(G.boundsOf([]), null);
assert.strictEqual(G.boundsOf([[0,0]]), null);
assert.deepStrictEqual(G.boundsOf([[30.5,114.3],[30.7,114.1]]), [[30.5,114.1],[30.7,114.3]]);
/* nodeCoord / telemetryCoord / nodeStyle */
assert.deepStrictEqual(G.nodeCoord({ lat: 30.62, lon: 114.42 }), [30.62, 114.42]);
assert.strictEqual(G.nodeCoord({ lat: 0, lon: 0 }), null);
assert.strictEqual(G.telemetryCoord({ lat: 0, lon: 0 }), null);
assert.strictEqual(G.nodeStyle({ node_type: "MANAGEMENT" }).color, "#7c3aed");
assert.strictEqual(G.nodeStyle({ node_type: "???" }), G.NODE_STYLE.DEFAULT);
assert.strictEqual(G.nodeStyle(null), G.NODE_STYLE.DEFAULT);
/* 格式化与常量 */
assert.strictEqual(G.fmtCoord(30.5), "30.50000");
assert.strictEqual(G.fmtCoord(undefined), "--");
assert.strictEqual(G.fmtCoordPair(0, 0), "坐标未设");
assert.strictEqual(G.fmtCoordPair(30.5, 114.3), "30.50000, 114.30000");
assert.deepStrictEqual(G.DEFAULT_VIEW, { lat: 30.55, lon: 114.37, zoom: 11 });
assert.deepStrictEqual(G.ZONES, ["OPEN", "RESTRICTED", "CLOSED"]);
console.log("GEO_ASSERTS_OK 全部断言通过");
'
```

预期：`SYNTAX_OK` + `GEO_ASSERTS_OK 全部断言通过`。任何断言失败=修 geo.js 重跑（不改断言迁就实现，除非断言本身与 Produces 契约冲突）。

- [ ] **Step 3: 提交**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/data/geo.js
git diff --cached --stat   # 预期恰 1 个新文件
git commit -m "$(cat <<'MSG'
feat(frontend): geo.js 演示地理数据层——坐标红线纯函数 + zone 缓冲多边形（计划 B Task 3）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: map.js Leaflet 封装（天地图瓦片 + 退化 + 矢量层 API）

**Files:**
- Create: `frontend/js/map.js`

**Interfaces:**
- Consumes: `window.L`（vendor/leaflet/leaflet.js，Task 1）；`window.GEO`（Task 3 全部签名）；drone.css 的 `.d-map(.is-fallback)/.d-map-badge/.d-map-empty/.d-drone-ico/.d-wormhole-ico/.d-alert-pin`（Task 2）。topology/get 契约（已核实 act2.js:53-64 消费形状）：`data.nodes[]`=NetworkNode（含 lat/lon/status/node_type/risk_score）、`data.edges[]`=`{from,to,distance,advertised_latency_ms,wormhole_edge}`。
- Produces（Task 5-12 依赖，签名逐字）：
  - `window.MAPX.create(el, opts?) → mx`；el=已挂 `.d-map` 类的容器；opts=`{view:{lat,lon,zoom}, fit:[[lat,lon],...]}`
  - mx 方法（全部返回 mx 除注明外）：`fitPoints(pts,pad?)`、`setView(lat,lon,zoom?)`、`clear(kind?)`（kind∈'routes'|'zones'|'nodes'|'marks'，省略=全清但不动 drones）、`clearDrones()`、`drawZones(routes)`、`drawRoutes(routes,{onPick(route),active:[route_id],opacity})`、`drawNodes(nodes,{onPick(node)})`、`drawWormholes(edges,nodes)`、`drone(uavId,lat,lon,headingDeg)→bool`（坐标无效=移除既有标记并 false）、`removeDrone(uavId)`、`alertPin(lat,lon,text?,onClick?)→marker|null`、`setEmpty(text?)`/`clearEmpty()`、`onMapClick(fn(lat,lon,latlng))→退订函数`、`tempMarker(lat,lon,label?)→marker|null`、`destroy()`（置 `_destroyed` 防 rAF 回调打在已移除地图上）。**create 自带零尺寸容器校正**：创建后的下一帧 `requestAnimationFrame → map.invalidateSize()`——P.tabs 在 `item.render(box)` 时 box 尚未挂载，map-in-tab（Task 7 flight、Task 10 netsec 拓扑页签）依赖此行为，页面无需自行处理。
  - mx 属性：`leaflet`（原生 L.Map）、`el`、`degraded`（bool）、`degradeReason`
  - `MAPX.getKey()/setKey(k)/hasKey()`（localStorage `skytrust-tianditu-key`）、`MAPX.KEY_LS`、`MAPX.TILE_FAIL_LIMIT`（=3）、`MAPX.DRONE_SVG`
  - 退化契约：无 key → 不加瓦片立即退化；`tileerror` 累计 ≥3 → 移除瓦片退化；退化=容器加 `is-fallback` + `.d-map-badge` 徽章，**矢量层照常**。

- [ ] **Step 1: 写 `frontend/js/map.js`（全文逐字）**

```js
/* map.js — Leaflet 封装（计划 B Task 4，spec §4.1）
   依赖：vendor/leaflet/leaflet.js（全局 L）与 js/data/geo.js（window.GEO），加载顺序须在两者之后。
   天地图 key：localStorage['skytrust-tianditu-key']（Global Constraints #8：绝不入 git、绝不写死源码）。
   退化契约：无 key → 不加瓦片层立即退化；tileerror 累计 ≥3 → 移除瓦片层退化。
   两类退化均：容器加 is-fallback（CSS 中性网格）+ .d-map-badge 徽章说明原因，矢量层照常自绘。
   坐标红线（Global Constraints #9）：lat/lon 双零=未设 → 不画点不连线（GEO.* 为唯一裁决）。 */
(function () {
  'use strict';
  var G = window.GEO;
  var KEY_LS = 'skytrust-tianditu-key';
  var TILE_FAIL_LIMIT = 3;

  /* 四旋翼标记 SVG（spec §4.3 quadcopter 图标族；.d-drone-ico 经 --hdg 变量按航向旋转） */
  var DRONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">' +
    '<circle cx="5.5" cy="5.5" r="3.2"/><circle cx="18.5" cy="5.5" r="3.2"/>' +
    '<circle cx="5.5" cy="18.5" r="3.2"/><circle cx="18.5" cy="18.5" r="3.2"/>' +
    '<rect x="9.3" y="9.3" width="5.4" height="5.4" rx="1.4" fill="currentColor" stroke="none"/>' +
    '<line x1="7.8" y1="7.8" x2="9.8" y2="9.8"/><line x1="16.2" y1="7.8" x2="14.2" y2="9.8"/>' +
    '<line x1="7.8" y1="16.2" x2="9.8" y2="14.2"/><line x1="16.2" y1="16.2" x2="14.2" y2="14.2"/></svg>';

  function getKey() {
    try { return (localStorage.getItem(KEY_LS) || '').trim(); } catch (e) { return ''; }
  }
  function setKey(k) {
    try { localStorage.setItem(KEY_LS, String(k || '').trim()); } catch (e) { /* 隐私模式静默 */ }
  }
  function hasKey() { return getKey() !== ''; }

  /* 天地图 WMTS：底图 vec_w + 注记 cva_w（球面墨卡托 _w 套），子域 t0-t7 */
  function tiandituLayers(key) {
    function u(layer) {
      return 'https://t{s}.tianditu.gov.cn/' + layer + '_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
        '&LAYER=' + layer + '&STYLE=default&TILEMATRIX={z}&TILEMATRIXSET=w&FORMAT=tiles' +
        '&TILECOL={x}&TILEROW={y}&tk=' + encodeURIComponent(key);
    }
    var opts = { subdomains: '01234567', maxZoom: 18, attribution: '© 天地图' };
    return [L.tileLayer(u('vec'), opts), L.tileLayer(u('cva'), opts)];
  }

  function divIcon(html, size, anchor) {
    return L.divIcon({ className: '', html: html, iconSize: size, iconAnchor: anchor });
  }

  /* create(el, opts) → MapX 包装对象（页面负责在重渲染前调 destroy()，
     否则 Leaflet 报 "Map container is already initialized"） */
  function create(el, opts) {
    var o = opts || {};
    var view = o.view || G.DEFAULT_VIEW;
    var map = L.map(el, { center: [view.lat, view.lon], zoom: view.zoom });
    var mx = {
      leaflet: map,
      el: el,
      degraded: false,
      degradeReason: '',
      _layers: {
        routes: L.layerGroup().addTo(map),
        zones: L.layerGroup().addTo(map),
        nodes: L.layerGroup().addTo(map),
        marks: L.layerGroup().addTo(map),
        drones: L.layerGroup().addTo(map)   /* 无人机独立层组：clear/clear('marks') 均不触碰（Produces 契约「不动 drones」的物理保证） */
      },
      _drones: {},      /* uav_id → L.marker */
      _tiles: null,
      _tileFails: 0,
      _badge: null,
      _empty: null,
      _destroyed: false
    };

    function showBadge(text) {
      if (!mx._badge) {
        mx._badge = document.createElement('div');
        mx._badge.className = 'd-map-badge';
        el.appendChild(mx._badge);
      }
      mx._badge.textContent = text;
    }
    function removeTiles() {
      if (mx._tiles) {
        mx._tiles.forEach(function (t) { map.removeLayer(t); });
        mx._tiles = null;
      }
    }
    function degrade(reason) {
      if (mx.degraded) return;
      mx.degraded = true;
      mx.degradeReason = reason;
      el.classList.add('is-fallback');
      removeTiles();
      showBadge('退化底图 · ' + reason + '（矢量层照常）');
    }

    /* 瓦片层：有 key 才加；tileerror 计数超限即退化（无效 key 的 403 会快速触发） */
    var key = getKey();
    if (key) {
      mx._tiles = tiandituLayers(key);
      mx._tiles.forEach(function (t) {
        t.on('tileerror', function () {
          mx._tileFails += 1;
          if (mx._tileFails >= TILE_FAIL_LIMIT) degrade('天地图瓦片加载失败');
        });
        t.addTo(map);
      });
    } else {
      degrade('未配置天地图 key');
    }

    /* --- 视图控制 --- */
    mx.fitPoints = function (pts, pad) {
      var b = G.boundsOf(pts);
      if (!b) return mx;
      map.fitBounds(L.latLngBounds(b), { padding: [pad || 24, pad || 24] });
      return mx;
    };
    mx.setView = function (lat, lon, zoom) {
      map.setView([lat, lon], zoom || map.getZoom());
      return mx;
    };

    /* --- 图层清理（drones 独立管理，clear 不动） --- */
    mx.clear = function (kind) {
      if (!kind || kind === 'routes') mx._layers.routes.clearLayers();
      if (!kind || kind === 'zones') mx._layers.zones.clearLayers();
      if (!kind || kind === 'nodes') mx._layers.nodes.clearLayers();
      if (!kind || kind === 'marks') mx._layers.marks.clearLayers();
      return mx;
    };
    mx.clearDrones = function () {
      mx._layers.drones.clearLayers();
      mx._drones = {};
      return mx;
    };

    /* --- zone 缓冲多边形（corridor_status 着色，spec §5.1 flight 页勾选叙事的底色） --- */
    mx.drawZones = function (routes) {
      (routes || []).forEach(function (r) {
        var ring = G.zonePolygon(r);
        if (!ring) return;                       /* 红线：缺坐标不画 */
        var st = r.corridor_status || 'OPEN';
        var color = G.ZONE_COLOR[st] || G.ZONE_COLOR.OPEN;
        L.polygon(ring, {
          color: color, weight: 1, opacity: .55,
          fillColor: color, fillOpacity: .12,
          interactive: false
        }).addTo(mx._layers.zones);
      });
      return mx;
    };

    /* --- 航线折线 + tooltip + 点选回调；opts.active=[route_id] 加粗高亮 --- */
    mx.drawRoutes = function (routes, opts2) {
      var oo = opts2 || {};
      var active = {};
      (oo.active || []).forEach(function (id) { active[id] = true; });
      (routes || []).forEach(function (r) {
        var c = G.segmentCoords(r);
        if (!c) return;                          /* 红线：缺坐标不连线 */
        var st = r.corridor_status || 'OPEN';
        var line = L.polyline(c, {
          color: G.ZONE_COLOR[st] || '#0b4ea2',
          weight: active[r.route_id] ? 6 : 3,
          opacity: oo.opacity != null ? oo.opacity : .9,
          dashArray: st === 'CLOSED' ? '6 4' : null
        });
        line.bindTooltip(
          '<b>' + r.route_id + '</b> ' + (r.start_point || '') + ' → ' + (r.end_point || '') +
          '<br>空域 ' + (r.zone || '--') + ' · ' + (G.ZONE_LABEL[st] || st) +
          '<br>高度带 ' + (r.altitude_min != null ? r.altitude_min : '--') +
          '-' + (r.altitude_max != null ? r.altitude_max : '--') + ' m',
          { sticky: true }
        );
        if (oo.onPick) line.on('click', function () { oo.onPick(r); });
        line.addTo(mx._layers.routes);
      });
      return mx;
    };

    /* --- 节点 circleMarker：类型定色/半径，OFFLINE 空心、ISOLATED 红虚线+⛔、ATTACKER ⚠ --- */
    mx.drawNodes = function (nodes, opts2) {
      var oo = opts2 || {};
      (nodes || []).forEach(function (n) {
        var c = G.nodeCoord(n);
        if (!c) return;                          /* 红线：无地理坐标不画（不投影抽象 position） */
        var style = G.nodeStyle(n);
        var isolated = n.status === 'ISOLATED';
        var offline = n.status === 'OFFLINE';
        var m = L.circleMarker(c, {
          radius: style.radius,
          color: isolated ? '#b91c1c' : style.color,
          weight: 2,
          dashArray: isolated ? '4 3' : null,
          fillColor: style.color,
          fillOpacity: offline ? 0 : (n.node_type === 'ATTACKER' ? .55 : .35)
        });
        m.bindTooltip(
          (isolated ? '⛔ ' : (n.node_type === 'ATTACKER' ? '⚠ ' : '')) +
          '<b>' + n.node_id + '</b> · ' + (style.label || n.node_type || '节点') +
          '<br>状态 ' + (n.status || '--') +
          ' · 风险分 ' + (n.risk_score != null ? Number(n.risk_score).toFixed(2) : '--'),
          { sticky: true }
        );
        if (oo.onPick) m.on('click', function () { oo.onPick(n); });
        m.addTo(mx._layers.nodes);
      });
      return mx;
    };

    /* --- 虫洞伪造边：红虚线 + 中点 ⚠ 标记；任一端点缺地理坐标 → 跳过（红线） --- */
    mx.drawWormholes = function (edges, nodes) {
      var coord = {};
      (nodes || []).forEach(function (n) {
        var c = G.nodeCoord(n);
        if (c) coord[n.node_id] = c;
      });
      (edges || []).forEach(function (e) {
        if (!e || !e.wormhole_edge) return;
        var a = coord[e.from], b = coord[e.to];
        if (!a || !b) return;
        L.polyline([a, b], { color: '#b91c1c', weight: 2.5, dashArray: '5 5', opacity: .9 })
          .bindTooltip('⚠ 虫洞伪造边 ' + e.from + ' ⇄ ' + e.to, { sticky: true })
          .addTo(mx._layers.marks);
        L.marker([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], {
          icon: divIcon('<div class="d-wormhole-ico">⚠</div>', [26, 26], [13, 13]),
          interactive: false, keyboard: false
        }).addTo(mx._layers.marks);
      });
      return mx;
    };

    /* --- 无人机标记：uavId 唯一，重复调用=移动+转向（遥测轮询叙事）；
       坐标无效 → 移除既有标记并返回 false（不造假） --- */
    mx.drone = function (uavId, lat, lon, headingDeg) {
      if (!G.hasCoord(lat, lon)) { mx.removeDrone(uavId); return false; }
      var hdg = G.isNum(headingDeg) ? headingDeg : 0;
      var existing = mx._drones[uavId];
      if (existing) {
        existing.setLatLng([lat, lon]);
        var elm = existing.getElement();
        var ico = elm && elm.querySelector('.d-drone-ico');
        if (ico) ico.style.setProperty('--hdg', hdg + 'deg');
        return true;
      }
      var m = L.marker([lat, lon], {
        icon: divIcon('<div class="d-drone-ico" style="--hdg:' + hdg + 'deg">' + DRONE_SVG + '</div>',
          [30, 30], [15, 15]),
        zIndexOffset: 800,
        keyboard: false
      });
      m.bindTooltip('<b>' + uavId + '</b> · 飞行中', { direction: 'top', offset: [0, -16] });
      m.addTo(mx._layers.drones);
      mx._drones[uavId] = m;
      return true;
    };
    mx.removeDrone = function (uavId) {
      if (mx._drones[uavId]) { mx._layers.drones.removeLayer(mx._drones[uavId]); delete mx._drones[uavId]; }
      return mx;
    };

    /* --- 告警落点（监管端驾驶舱：点击 → 详情卡） --- */
    mx.alertPin = function (lat, lon, text, onClick) {
      if (!G.hasCoord(lat, lon)) return null;
      var m = L.marker([lat, lon], {
        icon: divIcon('<div class="d-alert-pin"></div>', [14, 14], [7, 7]),
        zIndexOffset: 600, keyboard: false
      });
      if (text) m.bindTooltip(text, { direction: 'top', offset: [0, -8] });
      if (onClick) m.on('click', onClick);
      m.addTo(mx._layers.marks);
      return m;
    };

    /* --- 空数据覆盖层（「不造假」的叙事配套：说明地图为何无内容） --- */
    mx.setEmpty = function (text) {
      if (!mx._empty) {
        mx._empty = document.createElement('div');
        mx._empty.className = 'd-map-empty';
        el.appendChild(mx._empty);
      }
      mx._empty.textContent = text || '暂无可绘制的地理坐标';
      mx._empty.style.display = '';
      return mx;
    };
    mx.clearEmpty = function () {
      if (mx._empty) mx._empty.style.display = 'none';
      return mx;
    };

    /* --- 地图点选（管理端 masterdata 建航线：依次点两点定起止坐标）；返回退订函数 --- */
    mx.onMapClick = function (fn) {
      var handler = function (ev) { fn(ev.latlng.lat, ev.latlng.lng, ev.latlng); };
      map.on('click', handler);
      return function () { map.off('click', handler); };
    };
    mx.tempMarker = function (lat, lon, label) {
      if (!G.hasCoord(lat, lon)) return null;
      var m = L.circleMarker([lat, lon], {
        radius: 6, color: '#0b4ea2', weight: 2, fillColor: '#0b4ea2', fillOpacity: .5
      });
      if (label) m.bindTooltip(label, { permanent: true, direction: 'right', offset: [8, 0] });
      m.addTo(mx._layers.marks);
      return m;
    };

    /* --- 销毁（页面重渲染前必须调用） --- */
    mx.destroy = function () { mx._destroyed = true; try { map.remove(); } catch (e) { /* 已销毁容忍 */ } };

    if (o.fit && o.fit.length) mx.fitPoints(o.fit);
    /* 脱离 DOM 的容器（P.tabs 的 box 在 item.render(box) 时未挂载）尺寸为零：
       Leaflet 不会自愈——挂载后的下一帧统一 invalidateSize 校正（对已挂载容器是无害空操作） */
    requestAnimationFrame(function () { if (!mx._destroyed) map.invalidateSize(); });
    return mx;
  }

  window.MAPX = {
    create: create,
    getKey: getKey, setKey: setKey, hasKey: hasKey,
    KEY_LS: KEY_LS,
    TILE_FAIL_LIMIT: TILE_FAIL_LIMIT,
    DRONE_SVG: DRONE_SVG
  };
})();
```

- [ ] **Step 2: 语法门 + 结构断言**

```bash
cd /root/codes/skytrust-uav-supervision
node --check frontend/js/map.js && echo SYNTAX_OK
# API 面齐备（Produces 清单逐项）
for f in 'MAPX.create\|create: create' 'fitPoints' 'setView' 'mx.clear =' 'clearDrones' 'drawZones' 'drawRoutes' 'drawNodes' 'drawWormholes' 'mx.drone =' 'removeDrone' 'alertPin' 'setEmpty' 'clearEmpty' 'onMapClick' 'tempMarker' 'mx.destroy' 'getKey' 'setKey' 'hasKey' 'TILE_FAIL_LIMIT' 'DRONE_SVG'; do
  grep -q "$f" frontend/js/map.js || echo "MISSING $f"
done; echo API_SCAN_DONE
# key 只从 localStorage 读，绝无写死值（红线 #8）
grep -n 'skytrust-tianditu-key' frontend/js/map.js     # 预期 2 处命中：头部红线注释 1 + KEY_LS 常量定义 1（代码级定义恰 1 处）
grep -c 'tk=' frontend/js/map.js                        # 预期 1（URL 模板拼接，运行时注入）
# 脱离 DOM 零尺寸容器校正（P.tabs box 挂载时序）
grep -c 'invalidateSize' frontend/js/map.js             # 预期 2（注释 1 + 功能调用 1）
grep -c '_layers\.drones' frontend/js/map.js            # 预期 3（drone 挂载 / clearDrones / removeDrone——drones 独立层组，clear 不动）
# 退化与红线关键词
grep -n 'is-fallback\|tileerror\|wormhole_edge' frontend/js/map.js | head
```

预期：`SYNTAX_OK`、`API_SCAN_DONE` 前零 MISSING、key 常量代码级恰 1 处（另有头部红线注释提及 1 次）、`_layers.drones` 恰 3 处。浏览器行为（瓦片加载/退化徽章/标记旋转/虫洞样式）= **DEFERRED-HUMAN**（记入实施报告，Task 15 汇总）。

- [ ] **Step 3: 提交**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/map.js
git diff --cached --stat   # 预期恰 1 个新文件
git commit -m "$(cat <<'MSG'
feat(frontend): map.js Leaflet 封装——天地图瓦片/退化底图/矢量层 API/无人机标记（计划 B Task 4）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---

### Task 5: portal.js 三端共享壳 + 三 HTML 入口 + 三端薄壳 + explain.js 词条

**Files:**
- Create: `frontend/js/portal.js`
- Create: `frontend/js/shell-op.js`、`frontend/js/shell-au.js`、`frontend/js/shell-rg.js`
- Create: `frontend/operator.html`、`frontend/authority.html`、`frontend/regulator.html`
- Modify: `frontend/js/data/explain.js`（纯加法：codes +3、paths +9）

**Interfaces:**
- Consumes（全局名已逐一核实）: `window.UI`（ui.js:398，toast(msg,kind,ms)，kind='ok'|'err'）；`window.PUI`（pui.js:551，27 导出，本任务用 h/chipBar/pageHead/empty）；`window.API`（api.js:53，call/onCall，永不 throw）；`window.STORE`（store.js:43）；`window.MAPX`（Task 4）；`window.GEO`（Task 3，portal.js 不直接用，仅同页加载）；drone.css 壳类与 `.d-lampwrap>.d-lamp[data-chain]`/`.d-backend(.ok/.bad)`/`.d-keyform`/`.d-linkbtn`/`.d-ico(-sm/-lg)`（Task 2）；product.css `p-modal-mask/p-modal/p-modal-title/p-modal-msg/p-modal-btns/p-btn(-primary/-ghost)/p-card/p-card-title`（已核实在档）。
- Produces（Task 6-12 依赖，签名逐字）：
  - `PORTAL.boot(opts) → {route, registry}`；opts=`{portal:'op'|'au'|'rg', registry:'OP_PAGES'|'AU_PAGES'|'RG_PAGES', defaultPage:string, mapPages:string[], nav:[{key,label,ico}]}`
  - **页面注册契约**：页面文件写 `window.OP_PAGES.<name> = { render(root, ctx) }`，ctx=`{query:URLSearchParams, name:string, portal:string}`；root=`#d-page`（route() 进入前已清空）；页面内 map 实例须自持引用并在重渲染入口先 `mx.destroy()`
  - `PORTAL.ico(name, extraCls?) → SVGElement`（引用雪碧图 `#d-ico-<name>`，16 个 symbol 见本任务 SPRITE 块）
  - `PORTAL.qrSVG(text) → string|null`（qrcode-generator 2.0.4；仅 operator.html 载库，其余端调用恒 null；异常/超长 → null 不抛）
  - `PORTAL.renderQR(el, text, noneText?) → bool`（成功 el.innerHTML=SVG 保留自身类；失败 el 变 `.d-qr-none`+兜底文案，红线 #9）
  - `PORTAL.CHAINS`（[{key,label}×3]）、`PORTAL.KEYGUIDE_FLAG`
  - `PORTAL.jp(str, fallback) → any`（响应侧 JSON 字符串字段统一解析，契约档案 §28 裁决 3：失败回退 fallback 不 throw；非字符串原样放行）
  - `PORTAL.fmtRate(x) → '99.5%'|'--'`（0..1 小数转百分比，裁决 2；新页禁止 `rate+'%'` 直拼）
  - `PORTAL.need(v, ...names) → v|null`（表单必填校验：缺字段 UI.toast 报错并返回 null；runOp body() 收到 null 即中止不发请求）
  - explain.js：codes 23→26（7001/7002/7003），paths 64→73（9 条新端点）
- 心跳语义 = app.js pollChains 逐行复刻（已核实 app.js:21-53）：`r.data.chains[chain]` 为状态串，'ONLINE'→灯 on；成功徽章 `后端 Xms`(ok)、业务失败 `后端异常 code=X`(bad)、异常 `后端不可达`(bad)+全灯 err；`API.onCall` 每次调用刷新徽章延迟；15s 轮询。

- [ ] **Step 1: 写 `frontend/js/portal.js`（全文逐字）**

```js
/* portal.js — 三端共享薄壳（计划 B Task 5，spec §4.1）
   职责：boot() 接管全部页面 chrome 逻辑——导航构建、hash 路由（#/name?tab=… → registry）、
   三链灯 + 后端徽章心跳（15s，复刻 app.js pollChains 语义）、上下文 chip 条挂载、
   天地图 key 引导（每会话一次，Global Constraints #8）。
   页面代码（js/pages/<portal>/<name>.js）只需注册 window.XX_PAGES.name = {render(root, ctx)}。
   依赖：ui.js(UI) / pui.js(PUI) / api.js(API) / map.js(MAPX)，加载顺序见三端 HTML。 */
(function () {
  'use strict';
  var h = window.PUI.h;

  /* 三链固定次序与 app.js / CLAUDE.md 一致：ChainMaker 监管 / Fabric 运营 / FISCO BCOS 管理 */
  var CHAINS = [
    { key: 'chainmaker', label: '监管链' },
    { key: 'fabric', label: '运营链' },
    { key: 'fisco-bcos', label: '管理链' }
  ];
  var KEYGUIDE_FLAG = 'skytrust-keyguide-shown';   /* sessionStorage：引导每会话只弹一次 */

  /* --- 图标：引用各端 HTML 内联 SVG symbol（三端各持一份完整雪碧图） --- */
  function ico(name, extraCls) {
    return h('svg', { class: ('d-ico ' + (extraCls || '')).trim() },
      h('use', { href: '#d-ico-' + name }));
  }

  /* --- 二维码：qrcode-generator 2.0.4（仅 operator.html 加载；其余端调用恒 null） --- */
  function qrSVG(text) {
    if (!text || typeof window.qrcode !== 'function') return null;
    try {
      var qr = window.qrcode(0, 'M');
      qr.addData(String(text));
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
    } catch (e) { return null; }   /* 内容超长等 → null，调用方渲染兜底文案，不 crash */
  }
  /* renderQR：成功把 SVG 写进 el（保留 el 自身类）；失败 el 变 .d-qr-none + 兜底文案。
     兜底文案默认对准登记标志为空的场景（Global Constraints #9：不 crash 不渲染空 QR）。 */
  function renderQR(el, text, noneText) {
    var svg = qrSVG(text);
    if (svg) { el.innerHTML = svg; return true; }
    el.className = 'd-qr-none';
    el.textContent = noneText || '未发放登记标志（无二维码内容）';
    return false;
  }

  /* ================= boot：门户唯一入口 ================= */
  function boot(opts) {
    var o = opts || {};
    var registry = window[o.registry] || (window[o.registry] = {});
    var navEl = document.getElementById('d-nav');
    var rootEl = document.getElementById('d-page');
    var chipsEl = document.getElementById('d-chips');
    var lampsEl = document.getElementById('d-lamps');
    var backendEl = document.getElementById('d-backend');

    /* --- 导航构建（top/side 布局共用 .d-nav-item，样式由容器决定） --- */
    var navItems = [];
    (o.nav || []).forEach(function (item) {
      var a = h('a', { class: 'd-nav-item', href: '#/' + item.key, 'data-page': item.key },
        item.ico ? ico(item.ico) : null,
        h('span', {}, item.label));
      navEl.append(a);
      navItems.push(a);
    });

    /* --- 上下文 chip 条（STORE 驱动；重绘/复制/清空由 pui.chipBar 自理） --- */
    if (chipsEl) chipsEl.append(window.PUI.chipBar({}));

    /* --- 三链状态灯（.d-lampwrap > .d-lamp + 文字标签，永不单靠颜色） --- */
    CHAINS.forEach(function (c) {
      lampsEl.append(h('span', { class: 'd-lampwrap' },
        h('span', { class: 'd-lamp', 'data-chain': c.key, title: c.key + ': 探测中…' }),
        c.label));
    });
    function lampsAll(state) {
      lampsEl.querySelectorAll('.d-lamp').forEach(function (l) {
        l.className = 'd-lamp ' + state;
      });
    }

    /* --- 心跳：立即 + 每 15s 轮询 chain/status（语义复刻 app.js pollChains） --- */
    async function heartbeat() {
      try {
        var r = await window.API.call('/api/chain/status', {});
        if (r.ok && r.data && r.data.chains) {
          backendEl.textContent = '后端 ' + r.latencyMs + 'ms';
          backendEl.className = 'd-backend ok';
          lampsEl.querySelectorAll('.d-lamp').forEach(function (l) {
            var st = r.data.chains[l.dataset.chain];
            l.className = 'd-lamp ' + (st === 'ONLINE' ? 'on' : 'off');
            l.title = l.dataset.chain + ': ' + st;
          });
        } else {
          backendEl.textContent = '后端异常 code=' + r.code;
          backendEl.className = 'd-backend bad';
          lampsAll('err');
        }
      } catch (err) {   /* API.call 永不 throw；此 catch 只兜 DOM 意外 */
        backendEl.textContent = '后端不可达';
        backendEl.className = 'd-backend bad';
        lampsAll('err');
      }
    }
    /* 每次业务调用刷新徽章延迟（app.js API.onCall 同语义） */
    window.API.onCall(function (r) {
      backendEl.textContent = '后端 ' + r.latencyMs + 'ms' + (r.ok ? '' : ' · code=' + r.code);
      backendEl.className = 'd-backend ' + (r.ok ? 'ok' : 'bad');
    });

    /* --- 天地图 key 引导（Global Constraints #8：每会话一次；无 key 跳过=退化底图） --- */
    function keyGuideOnce() {
      if (window.MAPX.hasKey()) return;
      try {
        if (sessionStorage.getItem(KEYGUIDE_FLAG)) return;
        sessionStorage.setItem(KEYGUIDE_FLAG, '1');
      } catch (e) { return; }   /* 隐私模式 sessionStorage 不可用 → 不弹引导 */
      var input = h('input', {
        type: 'text', placeholder: '粘贴天地图浏览器端 key（tk 参数）',
        value: window.MAPX.getKey()
      });
      var mask = h('div', { class: 'p-modal-mask' },
        h('div', { class: 'p-modal' },
          h('div', { class: 'p-modal-title' }, '🗺 配置天地图密钥'),
          h('div', { class: 'p-modal-msg' },
            '地图底图使用天地图（免费政务地图服务）。在天地图控制台（console.tianditu.gov.cn）申请「浏览器端」密钥，粘贴到此处保存。',
            '密钥只保存在本浏览器 localStorage（skytrust-tianditu-key），绝不写入代码仓库；未配置时地图自动退化（中性网格 + 矢量层照常），不影响任何业务操作。',
            h('div', { class: 'd-keyform' }, input)),
          h('div', { class: 'p-modal-btns' },
            h('button', { class: 'p-btn p-btn-ghost', onClick: close }, '跳过（退化底图）'),
            h('button', {
              class: 'p-btn p-btn-primary',
              onClick: function () {
                var v = input.value.trim();
                if (!v) { window.UI.toast('密钥不能为空', 'err'); return; }
                window.MAPX.setKey(v);
                close();
                location.reload();     /* 重载使地图以新 key 重建瓦片层 */
              }
            }, '保存并重载'))));
      function close() { document.removeEventListener('keydown', onEsc); mask.remove(); }
      function onEsc(ev) { if (ev.key === 'Escape') close(); }
      document.addEventListener('keydown', onEsc);
      document.body.append(mask);
    }

    /* --- hash 路由：#/name?tab=x → registry[name].render(rootEl, ctx) ---
       pui.setTabParam 写回 hash → hashchange → 重入 route()（tab 切换即重渲染语义不变）。 */
    function current() {
      var raw = (location.hash || '').replace(/^#\/?/, '');
      var qi = raw.indexOf('?');
      return {
        name: (qi >= 0 ? raw.slice(0, qi) : raw) || o.defaultPage,
        query: new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '')
      };
    }
    function route() {
      var cur = current();
      navItems.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-page') === cur.name);
      });
      rootEl.innerHTML = '';
      var page = registry[cur.name];
      if (!page || typeof page.render !== 'function') {
        rootEl.append(window.PUI.pageHead({
          title: '页面未注册',
          sub: '路由 #/' + cur.name + ' 在本端暂无页面（或页面脚本尚未加载）'
        }));
        rootEl.append(window.PUI.empty('请从导航选择功能'));
        return;
      }
      try {
        page.render(rootEl, { query: cur.query, name: cur.name, portal: o.portal });
      } catch (err) {   /* 页面崩溃不拖垮壳：错误卡 + 堆栈（Global Constraints #13） */
        rootEl.innerHTML = '';
        rootEl.append(h('section', { class: 'p-card' },
          h('h3', { class: 'p-card-title' }, '页面渲染异常'),
          h('pre', { class: 'json-block' }, String((err && err.stack) || err))));
      }
      window.scrollTo(0, 0);
      if ((o.mapPages || []).indexOf(cur.name) >= 0) keyGuideOnce();
    }

    window.addEventListener('hashchange', route);
    if (!location.hash || location.hash === '#') {
      history.replaceState(null, '', '#/' + o.defaultPage);   /* 不触发 hashchange，首屏只渲染一次 */
    }
    route();
    heartbeat();
    setInterval(heartbeat, 15000);
    return { route: route, registry: registry };
  }

  /* --- 共享数据助手（端点契约档案 §28 裁决 2/3：14+ 页面同用，收口在 PORTAL） --- */
  /* 响应侧 JSON 字符串字段（route_segments/zones/scope/position/neighbors/current_path/
     path/evidence/rules_hit/result/detail/suggestion/config/failure_reasons）统一经 jp 解析；
     解析失败回退 fallback（惯例传原文或 []），绝不 throw。 */
  function jp(str, fallback) {
    if (str === null || str === undefined) return fallback;
    if (typeof str !== 'string') return str;              /* 已是真数组/对象（少数端点）直接放行 */
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }
  /* success_rate / 比率类字段是 0..1 小数（旧页 +'%' 显示 "1%" 是缺陷，新页禁止重蹈） */
  function fmtRate(x) {
    return (typeof x === 'number' && isFinite(x)) ? (x * 100).toFixed(1) + '%' : '--';
  }
  /* 必填校验：缺字段 toast 并返回 null（runOp 收到 null 不发请求）——wb-* 同款惯例收口 */
  function need(v, ...names) {
    if (!v) return null;
    const miss = names.filter(n => v[n] === undefined || v[n] === '' ||
      (Array.isArray(v[n]) && !v[n].length));
    if (miss.length) { window.UI.toast('缺少必填项：' + miss.join('、'), 'err'); return null; }
    return v;
  }

  window.PORTAL = {
    boot: boot, ico: ico, qrSVG: qrSVG, renderQR: renderQR,
    jp: jp, fmtRate: fmtRate, need: need,
    CHAINS: CHAINS, KEYGUIDE_FLAG: KEYGUIDE_FLAG
  };
})();
```

- [ ] **Step 2: 写三个薄壳（全文逐字）**

`frontend/js/shell-op.js`：

```js
/* shell-op.js — 运营商门户薄壳（计划 B Task 5）：导航表 + 路由注册表 + PORTAL.boot。
   门户定位：UOM（民用无人驾驶航空器综合管理平台）风格政务办事窗口；theme-op.css 政务蓝白。
   页面文件 js/pages/op/*.js 在本文件之前加载（operator.html script 顺序保证）。 */
(function () {
  'use strict';
  window.PORTAL.boot({
    portal: 'op',
    registry: 'OP_PAGES',
    defaultPage: 'home',
    mapPages: ['home', 'flight', 'ops', 'airspace'],
    nav: [
      { key: 'home',     label: '服务首页',        ico: 'home' },
      { key: 'realname', label: '实名登记',        ico: 'id' },
      { key: 'aircraft', label: '我的航空器',      ico: 'drone' },
      { key: 'flight',   label: '飞行活动申请',    ico: 'map' },
      { key: 'license',  label: '电子飞行许可',    ico: 'cert' },
      { key: 'ops',      label: '运行识别·飞行动态', ico: 'radar' },
      { key: 'airspace', label: '空域查询',        ico: 'globe' }
    ]
  });
})();
```

`frontend/js/shell-au.js`：

```js
/* shell-au.js — 管理当局门户薄壳（计划 B Task 5）：审核签发 + 链网安全运营合并端。
   theme-au.css 深蓝权威浅色；页面文件 js/pages/au/*.js 在本文件之前加载。 */
(function () {
  'use strict';
  window.PORTAL.boot({
    portal: 'au',
    registry: 'AU_PAGES',
    defaultPage: 'queue',
    mapPages: ['queue', 'masterdata', 'netsec'],
    nav: [
      { key: 'queue',      label: '审核队列',      ico: 'audit' },
      { key: 'passes',     label: '许可管理',      ico: 'cert' },
      { key: 'records',    label: '审核留痕',      ico: 'doc' },
      { key: 'registry',   label: '登记与资质',    ico: 'id' },
      { key: 'masterdata', label: '主数据维护',    ico: 'db' },
      { key: 'netsec',     label: '链网安全运营',  ico: 'net' }
    ]
  });
})();
```

`frontend/js/shell-rg.js`：

```js
/* shell-rg.js — 监管当局门户薄壳（计划 B Task 5）：深藏青大屏（body data-theme="dark"）。
   theme-rg.css；告警只用红黄语义色（Global Constraints #7）；页面 js/pages/rg/*.js 先于本文件加载。 */
(function () {
  'use strict';
  window.PORTAL.boot({
    portal: 'rg',
    registry: 'RG_PAGES',
    defaultPage: 'cockpit',
    mapPages: ['cockpit'],
    nav: [
      { key: 'cockpit', label: '监管驾驶舱',  ico: 'radar' },
      { key: 'alerts',  label: '告警管理',    ico: 'alert' },
      { key: 'trace',   label: '身份追踪',    ico: 'search' },
      { key: 'authz',   label: '授权中心',    ico: 'key' },
      { key: 'inspect', label: '密文核验',    ico: 'shield' },
      { key: 'audit',   label: '监管审计',    ico: 'audit' },
      { key: 'crypto',  label: '密码工具箱',  ico: 'lock' }
    ]
  });
})();
```

- [ ] **Step 3: explain.js 词条追加（纯加法，锚点为现存文本行而非行号）**

先核对锚点（应各恰 1 处命中）：

```bash
cd /root/codes/skytrust-uav-supervision/frontend
grep -n "6002: '参数校验失败" js/data/explain.js
grep -n "'/api/experiment/export'" js/data/explain.js
```

Edit 1 —— old_string：

```
      6002: '参数校验失败：缺必填字段、格式错误、或目标记录不存在（入口层统一拒绝）。',
```

new_string（原行保留，其后插入三行；缩进与原文一致为 6 空格）：

```
      6002: '参数校验失败：缺必填字段、格式错误、或目标记录不存在（入口层统一拒绝）。',
      7001: '实名主体不存在：所提交 subject_id 没有已登记的实名主体——先在实名登记页创建主体（个人/企业）。',
      7002: '飞行员执照不存在或已失效：任务关联的 license_id 无执照记录或已过有效期——重新申请执照后再建任务。',
      7003: '遥测会话状态错误：飞行动态上报要求会话处于 ACTIVE——先起飞报备（session/open）再上报遥测。',
```

Edit 2 —— old_string：

```
      '/api/experiment/export': '成功 = 实验结果导出 CSV（可直接进论文/验收附件）。',
```

new_string（原行保留，其后插入九行）：

```
      '/api/experiment/export': '成功 = 实验结果导出 CSV（可直接进论文/验收附件）。',
      '/api/realname/register': '成功 = 实名主体建档（RNS- 前缀）。演示数据域：使用模拟证件号，不接真实认证系统。',
      '/api/realname/list': '成功 = 分页拉取实名主体台账，可按主体类型（个人/企业）过滤。',
      '/api/realname/query': '成功 = 按 subject_id 精确实名查证（主体不存在 → 7001）。',
      '/api/pilot/apply': '成功 = 飞行员执照即申即发（PIL- 前缀），执照内容含 SM9 签名，可经 sm9/verify 验签。',
      '/api/pilot/list': '成功 = 分页拉取飞行员执照台账，可按类别（多旋翼/固定翼/垂直起降）过滤。',
      '/api/pilot/query': '成功 = 按 license_id 精确查证执照（不存在或失效 → 7002）。',
      '/api/telemetry/report': '成功 = 飞行动态人工上报一条（source=MANUAL，seq 按会话自增）；会话须 ACTIVE（否则 → 7003）。',
      '/api/telemetry/list': '成功 = 按会话/航空器分页拉取遥测流水，证明飞行识别数据链完整。',
      '/api/telemetry/latest': '成功 = 取最新一条遥测（无记录亦 code=0 且 telemetry 为 null，适合轮询），驱动地图无人机实时移动。',
```

计数断言（codes 23→26、paths 64→73）：

```bash
cd /root/codes/skytrust-uav-supervision
node -e "global.window={};require('./frontend/js/data/explain.js');var E=global.window.EXPLAIN;var c=Object.keys(E.codes).length,p=Object.keys(E.paths).length;console.log('codes='+c,'paths='+p);if(c!==26||p!==73){console.error('COUNT_MISMATCH');process.exit(1)}console.log('EXPLAIN_COUNTS_OK')"
```

预期输出：`codes=26 paths=73` + `EXPLAIN_COUNTS_OK`。

---

- [ ] **Step 4: 三端共用 SPRITE 块（16 symbol；三份 HTML 在标记处逐字内嵌同一份——三端物理独立，不做跨文件引用）**

```html
<!-- 内联 SVG 图标雪碧图（stroke 线性图标族，.d-ico 统一 fill:none/stroke:currentColor） -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <symbol id="d-ico-drone" viewBox="0 0 24 24"><circle cx="5.5" cy="5.5" r="3.2"/><circle cx="18.5" cy="5.5" r="3.2"/><circle cx="5.5" cy="18.5" r="3.2"/><circle cx="18.5" cy="18.5" r="3.2"/><rect x="9.3" y="9.3" width="5.4" height="5.4" rx="1.4"/><line x1="7.8" y1="7.8" x2="9.8" y2="9.8"/><line x1="16.2" y1="7.8" x2="14.2" y2="9.8"/><line x1="7.8" y1="16.2" x2="9.8" y2="14.2"/><line x1="16.2" y1="16.2" x2="14.2" y2="14.2"/></symbol>
  <symbol id="d-ico-home" viewBox="0 0 24 24"><path d="M3 11.2 12 3.5l9 7.7"/><path d="M5.5 9.8V20a.8.8 0 0 0 .8.8h3.9v-6h3.6v6h3.9a.8.8 0 0 0 .8-.8V9.8"/></symbol>
  <symbol id="d-ico-id" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.3" cy="10.8" r="1.9"/><path d="M5.3 16.2c.6-1.6 1.8-2.5 3-2.5s2.4.9 3 2.5"/><line x1="14" y1="9.5" x2="19" y2="9.5"/><line x1="14" y1="12.5" x2="19" y2="12.5"/><line x1="14" y1="15.5" x2="17.5" y2="15.5"/></symbol>
  <symbol id="d-ico-cert" viewBox="0 0 24 24"><path d="M6 3h8.5L19 7.5V16H6z"/><path d="M14.5 3v4.5H19"/><line x1="9" y1="11" x2="16" y2="11"/><line x1="9" y1="14" x2="13" y2="14"/><circle cx="16.5" cy="18" r="3"/><path d="m15 20.5-.5 2.5 2-1 2 1-.5-2.5"/></symbol>
  <symbol id="d-ico-map" viewBox="0 0 24 24"><path d="M9 4 3.6 6.1a.6.6 0 0 0-.4.6v12.6a.6.6 0 0 0 .8.6L9 18l6 2.2 5.4-2.1a.6.6 0 0 0 .4-.6V5a.6.6 0 0 0-.8-.6L15 6z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20.2"/></symbol>
  <symbol id="d-ico-radar" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.6"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 15.5a5 5 0 0 0 0-7"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 18.4a9 9 0 0 0 0-12.8"/><line x1="12" y1="12" x2="17.5" y2="6.5"/></symbol>
  <symbol id="d-ico-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="3.2" y1="9.6" x2="20.8" y2="9.6"/><line x1="3.2" y1="14.4" x2="20.8" y2="14.4"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></symbol>
  <symbol id="d-ico-audit" viewBox="0 0 24 24"><rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3.2h6v1.3"/><path d="m8.8 12.4 2.2 2.2 4.2-4.2"/><line x1="9" y1="17.8" x2="15" y2="17.8"/></symbol>
  <symbol id="d-ico-doc" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></symbol>
  <symbol id="d-ico-net" viewBox="0 0 24 24"><circle cx="6" cy="7" r="2.3"/><circle cx="18" cy="7" r="2.3"/><circle cx="12" cy="17.5" r="2.3"/><line x1="8.3" y1="7" x2="15.7" y2="7"/><line x1="7.2" y1="9" x2="10.8" y2="15.6"/><line x1="16.8" y1="9" x2="13.2" y2="15.6"/></symbol>
  <symbol id="d-ico-alert" viewBox="0 0 24 24"><path d="M12 3.5 22 20H2z"/><line x1="12" y1="9.5" x2="12" y2="14"/><line x1="12" y1="17.2" x2="12" y2="17.3"/></symbol>
  <symbol id="d-ico-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.2"/><line x1="15.6" y1="15.6" x2="21" y2="21"/></symbol>
  <symbol id="d-ico-key" viewBox="0 0 24 24"><circle cx="8" cy="12" r="4.2"/><line x1="12.2" y1="12" x2="21" y2="12"/><line x1="17.5" y1="12" x2="17.5" y2="15"/><line x1="20.5" y1="12" x2="20.5" y2="14.2"/></symbol>
  <symbol id="d-ico-shield" viewBox="0 0 24 24"><path d="M12 3 20 5.8v5.4c0 4.7-3.3 8-8 9.8-4.7-1.8-8-5.1-8-9.8V5.8z"/></symbol>
  <symbol id="d-ico-db" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/></symbol>
  <symbol id="d-ico-lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/><line x1="12" y1="14.3" x2="12" y2="17"/></symbol>
</defs></svg>
```

- [ ] **Step 5: 写 `frontend/operator.html`（全文；`<!--SPRITE-->` 处替换为 Step 4 块逐字）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>云巡信链 SkyTrust · 民用无人驾驶航空器综合服务门户（运营商端）</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='13' font-size='13'>🛸</text></svg>">
<link rel="stylesheet" href="vendor/leaflet/leaflet.css">
<link rel="stylesheet" href="css/product.css">
<link rel="stylesheet" href="css/drone.css">
<link rel="stylesheet" href="css/theme-op.css">
</head>
<!-- 固定主题：政务蓝白（Global Constraints #7，无主题切换；data-theme 供 product.css 浅色选择器） -->
<body class="d-portal d-op" data-theme="light">

<!--SPRITE-->

<header class="d-topbar">
  <a class="d-brand" href="#/home">
    <svg class="d-ico d-ico-lg"><use href="#d-ico-drone"></use></svg>
    云巡信链 · 民用无人驾驶航空器综合服务<span class="d-brand-sub">运营商端</span>
  </a>
  <nav class="d-nav" id="d-nav"><!-- PORTAL.boot 构建导航项 --></nav>
  <div class="d-topbar-right">
    <span class="d-lamps" id="d-lamps"></span>
    <span class="d-backend" id="d-backend">后端探测中…</span>
    <a class="d-linkbtn" href="index.html" title="内部总控导航页（演示维护入口，非用户产品入口）">内部导航</a>
  </div>
</header>
<div class="d-chiprow" id="d-chips"></div>
<main class="d-main" id="d-page"></main>
<div id="toast-box"></div>

<script src="js/data/explain.js"></script>
<script src="js/api.js"></script>
<script src="js/store.js"></script>
<script src="js/ui.js"></script>
<script src="js/pui.js"></script>
<script src="vendor/leaflet/leaflet.js"></script>
<script src="vendor/qrcode/qrcode.js"></script>
<script src="js/data/geo.js"></script>
<script src="js/map.js"></script>
<script src="js/portal.js"></script>
<!-- 页面脚本 js/pages/op/*.js 由 Task 6-8 逐行插入到本注释与 shell 行之间 -->
<script src="js/shell-op.js"></script>
</body>
</html>
```

- [ ] **Step 6: 写 `frontend/authority.html`（全文；`<!--SPRITE-->` 处替换为 Step 4 块逐字）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>云巡信链 SkyTrust · 民用无人驾驶航空器管理当局（管理端）</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='13' font-size='13'>🏛️</text></svg>">
<link rel="stylesheet" href="vendor/leaflet/leaflet.css">
<link rel="stylesheet" href="css/product.css">
<link rel="stylesheet" href="css/drone.css">
<link rel="stylesheet" href="css/theme-au.css">
</head>
<!-- 固定主题：深蓝权威浅色（Global Constraints #7） -->
<body class="d-portal d-au" data-theme="light">

<!--SPRITE-->

<div class="d-layout">
  <aside class="d-side">
    <a class="d-brand" href="#/queue">
      <svg class="d-ico d-ico-lg"><use href="#d-ico-shield"></use></svg>
      云巡信链 · 管理当局<span class="d-brand-sub">管理端</span>
    </a>
    <nav class="d-sidenav" id="d-nav"><!-- PORTAL.boot 构建导航项 --></nav>
    <div class="d-side-foot">
      审核签发 · 链网安全运营<br>
      <a href="index.html" title="内部总控导航页（演示维护入口）">内部导航页</a>
    </div>
  </aside>
  <div class="d-body">
    <header class="d-subbar">
      <span class="d-lamps" id="d-lamps"></span>
      <span class="d-backend" id="d-backend">后端探测中…</span>
    </header>
    <div class="d-chiprow" id="d-chips"></div>
    <main class="d-main" id="d-page"></main>
  </div>
</div>
<div id="toast-box"></div>

<script src="js/data/explain.js"></script>
<script src="js/api.js"></script>
<script src="js/store.js"></script>
<script src="js/ui.js"></script>
<script src="js/pui.js"></script>
<script src="vendor/leaflet/leaflet.js"></script>
<script src="js/data/geo.js"></script>
<script src="js/map.js"></script>
<script src="js/portal.js"></script>
<!-- 页面脚本 js/pages/au/*.js 由 Task 9-10 逐行插入到本注释与 shell 行之间 -->
<script src="js/shell-au.js"></script>
</body>
</html>
```

- [ ] **Step 7: 写 `frontend/regulator.html`（全文；`<!--SPRITE-->` 处替换为 Step 4 块逐字）**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>云巡信链 SkyTrust · 跨域可信监管门户（监管端）</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='13' font-size='13'>📡</text></svg>">
<link rel="stylesheet" href="vendor/leaflet/leaflet.css">
<link rel="stylesheet" href="css/product.css">
<link rel="stylesheet" href="css/drone.css">
<link rel="stylesheet" href="css/theme-rg.css">
</head>
<!-- 固定主题：深藏青大屏（Global Constraints #7；data-theme="dark" 同时驱动 product.css 暗色令牌） -->
<body class="d-portal d-rg" data-theme="dark">

<!--SPRITE-->

<div class="d-layout">
  <aside class="d-side">
    <a class="d-brand" href="#/cockpit">
      <svg class="d-ico d-ico-lg"><use href="#d-ico-radar"></use></svg>
      云巡信链 · 跨域可信监管<span class="d-brand-sub">监管端</span>
    </a>
    <nav class="d-sidenav" id="d-nav"><!-- PORTAL.boot 构建导航项 --></nav>
    <div class="d-side-foot">
      全域态势 · 全生命周期审计<br>
      <a href="index.html" title="内部总控导航页（演示维护入口）">内部导航页</a>
    </div>
  </aside>
  <div class="d-body">
    <header class="d-subbar">
      <span class="d-lamps" id="d-lamps"></span>
      <span class="d-backend" id="d-backend">后端探测中…</span>
    </header>
    <div class="d-chiprow" id="d-chips"></div>
    <main class="d-main" id="d-page"></main>
  </div>
</div>
<div id="toast-box"></div>

<script src="js/data/explain.js"></script>
<script src="js/api.js"></script>
<script src="js/store.js"></script>
<script src="js/ui.js"></script>
<script src="js/pui.js"></script>
<script src="vendor/leaflet/leaflet.js"></script>
<script src="js/data/geo.js"></script>
<script src="js/map.js"></script>
<script src="js/portal.js"></script>
<!-- 页面脚本 js/pages/rg/*.js 由 Task 11-12 逐行插入到本注释与 shell 行之间 -->
<script src="js/shell-rg.js"></script>
</body>
</html>
```

- [ ] **Step 8: 语法门 + 结构断言**

```bash
cd /root/codes/skytrust-uav-supervision
# 1) node --check 全部新 JS + 被改的 explain.js
for f in frontend/js/portal.js frontend/js/shell-op.js frontend/js/shell-au.js frontend/js/shell-rg.js frontend/js/data/explain.js; do
  node --check "$f" || echo "SYNTAX FAIL $f"
done; echo SYNTAX_DONE
# 2) 三端 HTML 结构断言
for f in operator authority regulator; do
  n=$(grep -c 'symbol id="d-ico-' frontend/$f.html);  [ "$n" = 16 ] || echo "SPRITE FAIL $f=$n"
  grep -q 'id="toast-box"' frontend/$f.html            || echo "TOASTBOX FAIL $f"
  grep -q '<!--SPRITE-->' frontend/$f.html             && echo "SPRITE MARKER LEFT $f"
  grep -q 'js/data/endpoints.js' frontend/$f.html      && echo "ENDPOINTS LEAK $f"
  grep -q 'css/app.css' frontend/$f.html               && echo "APPCSS LEAK $f"
done; echo HTML_STRUCT_DONE
# 3) 固定主题：op/au=light，rg=dark（Global Constraints #7）
grep -l 'data-theme="light"' frontend/operator.html frontend/authority.html
grep -l 'data-theme="dark"' frontend/regulator.html
# 4) qrcode 仅运营商端加载
grep -l 'qrcode.js' frontend/operator.html frontend/authority.html frontend/regulator.html   # 预期仅 operator.html
# 5) 脚本顺序（每个文件行号须严格递增：explain<api<store<ui<pui<leaflet<geo<map<portal<shell）
for f in operator authority regulator; do echo "-- $f"; awk '/<script src=/{print NR": "$2}' frontend/$f.html; done
# 6) 红线 #8：任何新文件不得出现写死的天地图 key 字面量
grep -rn 'tk=' frontend/operator.html frontend/authority.html frontend/regulator.html frontend/js/portal.js && echo KEY_LEAK || echo NO_KEY_OK
```

预期：`SYNTAX_DONE` 前零 FAIL；`HTML_STRUCT_DONE` 前零 FAIL/LEFT/LEAK；(3) 列出 operator+authority / regulator；(4) 仅 operator.html；(5) 行号严格递增且 shell 恒为最后一行；(6) `NO_KEY_OK`。浏览器目检（导航渲染/心跳灯/key 引导弹窗/hash 路由兜底页）= **DEFERRED-HUMAN**（记入实施报告；此时三端 registry 均为空，打开任何路由应显示「页面未注册」兜底卡而非白屏）。

- [ ] **Step 9: 隔离端口静态 smoke（红线 #11：绝不触碰 :8090/:8080 生产）**

```bash
cd /root/codes/skytrust-uav-supervision
# 起第二实例：PORT=18099（BACKEND 指向空地址——本步只做静态 GET，不发任何 /api 请求）
PORT=18099 BACKEND=http://127.0.0.1:1 python3 scripts/serve-frontend.py >/tmp/serve-18099.log 2>&1 &
SERVE_PID=$!
sleep 1
for p in operator.html authority.html regulator.html js/portal.js js/shell-op.js js/shell-au.js js/shell-rg.js \
         js/map.js js/data/geo.js js/data/explain.js vendor/leaflet/leaflet.js vendor/leaflet/leaflet.css \
         vendor/qrcode/qrcode.js css/drone.css css/theme-op.css css/theme-au.css css/theme-rg.css \
         vendor/leaflet/images/marker-icon.png; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:18099/$p")
  [ "$code" = 200 ] && echo "OK  $p" || echo "FAIL($code) $p"
done
curl -s http://127.0.0.1:18099/operator.html | grep -c 'd-portal d-op'      # 预期 1
curl -s http://127.0.0.1:18099/regulator.html | grep -c 'data-theme="dark"' # 预期 1
kill $SERVE_PID   # 只杀本步骤自己起的隔离实例；生产 :8090/:8080 进程绝不触碰
```

预期：全部 `OK` + 两个 grep 各输出 1。serve-frontend.py 无 SPA fallback——每个 .html 显式命中即为通过（Global Constraints：三端为独立静态入口）。

- [ ] **Step 10: 提交**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/portal.js frontend/js/shell-op.js frontend/js/shell-au.js frontend/js/shell-rg.js \
        frontend/operator.html frontend/authority.html frontend/regulator.html frontend/js/data/explain.js
git diff --cached --stat   # 预期恰 8 个文件（7 新建 + 1 修改），无其他项
git commit -m "$(cat <<'MSG'
feat(frontend): 三端壳层——portal.js 路由/心跳/key 引导 + operator/authority/regulator 三入口 + explain.js 7xxx 与九端点词条（计划 B Task 5）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---

### Task 6: 运营商端 I —— home / realname / aircraft

**Files:**
- Create: `frontend/js/pages/op/home.js`、`frontend/js/pages/op/realname.js`、`frontend/js/pages/op/aircraft.js`
- Modify: `frontend/operator.html`（script 锚点注释与 shell 行之间插入 3 行）

**Interfaces:**
- Consumes: `PORTAL.{ico,qrSVG,renderQR,jp,fmtRate,need,CHAINS}`（Task 5）；`MAPX.create→mx{drawZones,drawRoutes,drawNodes,drawWormholes,drone,destroy,…}`（Task 4 签名逐字）；`GEO.{DEFAULT_VIEW,telemetryCoord,hasCoord}`（Task 3）；`PUI.{h,pageHead,tabs,form,dataTable,resultPanel,actionBar,runOp,drawer,kv,badge,statCards,errCard,empty,cxTrail,openCxDetail,confirm}`（pui.js 已核实行号）；`UI.{toast,trunc}`；`API.call`（永不 throw）；`STORE.{get,note}`（get(kind)→`{kind,id:String,extra,at}|null`）；drone.css `.d-hero*/.d-entry-*/.d-notice*/.d-cert*/.d-qr(.d-qr-none)/.d-seal/.d-idbar/.d-idchip/.d-linkbtn/.d-section/.d-row/.d-mt*/.d-muted/.d-small/.d-num/.d-small`（Task 2）。端点字段名一律照 `.git/sdd/planB-endpoint-contracts.md`（下称「契约档案」）§7/§8/§9/§25/§28/§29。
- Produces（Task 7-15 依赖）:
  - `window.OP_PAGES.home = {render(root,ctx)}`、`window.OP_PAGES.realname = {render}`、`window.OP_PAGES.aircraft = {render}`；ctx=`{query:URLSearchParams,name,portal}`（Task 5 页面契约；本任务用到 `ctx.query.get('subject_id')` 深链）。
  - **实名身份约定（Task 7-12 预填依赖）**：实名主体存 `STORE.note('OPERATOR', subject_id, {name, subject_type})`，subject_id 以 `RNS-` 开头；任何页面预填 realname_id/subject 前必须验 `String(s.id).indexOf('RNS-')===0`（OPERATOR 槽位与旧页 operator_id 共用，前缀是唯一判据）。
  - **操控员执照落点（spec §6 第 1 章、Task 7 flight/Task 10 registry/Task 14 剧本依赖）**：realname 页第三页签「操控员执照」——pilot/apply 即申即发 → `licenseCert(L)`（d-cert 凭证卡：执照编号 UAV-PILOT-2026-xxxx/ISSUED/失效=签发+2 年/SM9 签名）+ pilot/list 台账 + pilot/query 详情抽屉；category 中文枚举（多旋翼/固定翼/垂直起降，表单默认「垂直起降」=剧本值）；**无 STORE 落点**（13 kinds 无 LICENSE、pilot 域无旧页惯例）——flight 页关联执照走 pilot/list 下拉（Task 7 已有）。spec §5.1 realname 行端点列未含 pilot/*，但 §6 第 1 章要求运营商端「执照申请（即发+SM9 签名）」，落位本页页签（7 页 IA 不变）。
  - operator.html script 区新增（顺序）：`js/pages/op/home.js` → `realname.js` → `aircraft.js`（均在锚点注释后、shell-op.js 前）。

**页面文件公共惯例（Task 6-12 全部页面适用，此处记录一次）：**
1. 文件形态：IIFE + `'use strict'`；顶部 `const { h } = UI, P = PUI;`；`var OP = window.OP_PAGES = window.OP_PAGES || {};`（au/rg 端同理 AU_PAGES/RG_PAGES）；末尾 `OP.<name> = { render: render };`。
2. 局部 `card` 助手（p-card 复用，wb-* 同款）：`const card = (title, ...b) => h('section', { class: 'p-card' }, h('h3', { class: 'p-card-title' }, title), ...b);`
3. **不调用 `P.chipBar()`**——portal.boot 已全局挂载 `#d-chips`（pui chipBar 是单例订阅，页面重复挂载会失联）。
4. 地图页：模块级 `var mx = null;`，render 入口先 `if (mx) { mx.destroy(); mx = null; }`（Task 5 页面契约）。
5. 轮询页：模块级 timer + **DOM 脱离自清**——interval 回调首行 `if (!document.body.contains(hostEl)) { clearInterval(timer); timer = null; return; }`（portal route() 只清 innerHTML 不发 teardown 事件，自清防泄漏）。
6. 响应侧 JSON 字符串字段（route_segments/zones/scope/current_path/path/evidence/rules_hit/result/detail/suggestion/config/failure_reasons/neighbors/position）一律 `PORTAL.jp(str, 回退值)`；比率一律 `PORTAL.fmtRate`；必填校验一律 `PORTAL.need`。
7. 错误呈现：`P.errCard(r)`（code=-1 自动带启动指引，EXPLAIN 词条解说业务码）；写操作经 `P.runOp({...,rp})` 由 resultPanel 统一渲染成败 + 原始 JSON。
8. STORE 落点照契约档案 §29 旧页惯例表逐字沿用（新端点 realname/pilot/telemetry 的落点由本计划各任务明文规定）。

- [ ] **Step 1: 写 `frontend/js/pages/op/home.js`（全文逐字）**

```js
/* home.js — 运营商端·服务首页（计划 B Task 6，spec §5.1）
   hero 大地图（空域 zone 着色 + 航线网 + 网络节点（过滤 ATTACKER）+ 已登记航空器实时位置）+ 六张服务入口卡
   + 静态政策公告区。端点：topology/get、route/list、uav/list、telemetry/latest、chain/status。
   公告区为静态装饰（spec §5.1「政策公告装饰区（静态）」），不调端点、不编造新闻源。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  var mx = null;   /* 模块级地图引用：重渲染入口先 destroy（Task 5 页面契约） */

  var ENTRIES = [
    { page: 'realname', ico: 'id',    title: '实名登记',         desc: '个人/企业主体登记与操控员执照即申即发，选定身份后全端预填' },
    { page: 'aircraft', ico: 'drone', title: '航空器登记',       desc: '登记标志与二维码注册即发，跨链四段 TxID 全程留痕' },
    { page: 'flight',   ico: 'map',   title: '飞行活动申请',     desc: '地图勾选航段建任务，跨链提交跨域申请，冲突协调可视' },
    { page: 'license',  ico: 'cert',  title: '电子飞行许可',     desc: '电子许可卡 + 飞行前自查：valid 绿灯可以起飞，红灯列原因' },
    { page: 'ops',      ico: 'radar', title: '运行识别·飞行动态', desc: '起飞报备（SM9 挑战认证），无人机沿航线实时移动，降落报备' },
    { page: 'airspace', ico: 'globe', title: '空域查询',         desc: '全屏空域地图：zone 着色、航线网、网络节点图层开关' }
  ];

  var NOTICES = [
    { date: '2026-09-30', text: '依照《无人驾驶航空器飞行管理暂行条例》，民用无人驾驶航空器须完成实名登记并取得电子飞行许可后方可实施飞行活动。' },
    { date: '2026-09-18', text: '本平台已全面启用「登记即上链」：航空器登记、任务申请、许可签发均在三链留痕，跨链存证可在本页地图与各详情页查验。' },
    { date: '2026-09-02', text: '武汉演示空域走廊数据已更新（Zone-A / Zone-B），飞行前请在「空域查询」页确认走廊状态（OPEN / RESTRICTED / CLOSED）。' }
  ];

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    /* --- hero：政务门户题头 + 大地图 --- */
    var mapEl = h('div', { class: 'd-hero-map d-map' });
    root.append(h('section', { class: 'd-hero' },
      h('div', { class: 'd-hero-head' },
        h('h1', { class: 'd-hero-title' }, '民用无人驾驶航空器综合服务门户'),
        h('p', { class: 'd-hero-sub' }, '实名登记 · 航空器登记 · 飞行申请 · 电子许可 · 运行识别 · 空域查询 —— 一站式办理，登记即上链')),
      mapEl));
    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });

    /* --- 空域态势条（chain/status + 计数）--- */
    var strip = h('div', { class: 'd-mt' }, h('div', { class: 'p-empty' }, '⏳ 空域态势加载中…'));
    root.append(strip);

    /* --- 服务入口卡片（UOM 首页对位）--- */
    root.append(h('div', { class: 'd-entry-grid d-mt2' }, ENTRIES.map(function (e) {
      return h('div', { class: 'd-entry-card', title: '进入 ' + e.title,
        onClick: function () { location.hash = '#/' + e.page; } },
        h('span', { class: 'd-entry-ico' }, PORTAL.ico(e.ico)),
        h('div', {}, h('h3', {}, e.title), h('p', {}, e.desc)));
    })));

    /* --- 政策公告（静态装饰区）--- */
    root.append(h('div', { class: 'd-notice d-mt2' },
      h('h3', {}, '📢 政策公告'),
      h('ul', {}, NOTICES.map(function (n) {
        return h('li', {}, n.text, h('span', { class: 'd-notice-date' }, n.date));
      }))));

    loadLive(strip);
  }

  /* 数据装配：航线/节点画地图；每架航空器取 telemetry/latest 落无人机标记；态势条汇总。
     红线 #9：坐标未设（双零/NaN）的遥测点不落标记（GEO.telemetryCoord 返回 null 即跳过）。
     裁决 17：telemetry/latest 的 {telemetry:null} 是成功空结果，不走错误分支。 */
  async function loadLive(strip) {
    var routesR = await API.call('/api/route/list', { page: 1, page_size: 200 });
    var topoR = await API.call('/api/topology/get', {});
    if (mx && routesR.ok) {
      var routes = routesR.data.records || [];
      mx.drawZones(routes);
      mx.drawRoutes(routes, {});
    }
    /* Task 8 Produces 信息边界：运营商端不渲染 ATTACKER 节点与虫洞边——模拟攻击节点
       属管理当局 netsec 视角，运营商端只见正常网络（虫洞伪造边只随 ATTACKER 全量视图出现） */
    var visNodes = topoR.ok
      ? (topoR.data.nodes || []).filter(function (n) { return n.node_type !== 'ATTACKER'; })
      : [];
    if (mx && topoR.ok) {
      mx.drawNodes(visNodes, {});
    }
    var uavsR = await API.call('/api/uav/list', { page: 1, page_size: 200 });
    var drones = 0;
    if (uavsR.ok) {
      var uavs = uavsR.data.records || [];
      var latest = await Promise.all(uavs.map(function (u) {
        return API.call('/api/telemetry/latest', { uav_id: u.uav_id });
      }));
      latest.forEach(function (r, i) {
        var t = r.ok && r.data ? r.data.telemetry : null;
        if (!t) return;                        /* 无遥测=正常（未飞过的机） */
        var c = GEO.telemetryCoord(t);
        if (!c || !mx) return;                 /* 坐标未设不画（红线 #9） */
        if (mx.drone(uavs[i].uav_id, c[0], c[1], t.heading)) drones++;
      });
    }
    var chainR = await API.call('/api/chain/status', {});
    if (!strip.isConnected) return;            /* 加载中用户已离开本页 */
    strip.innerHTML = '';
    var cards = [];
    PORTAL.CHAINS.forEach(function (c) {
      var st = (chainR.ok && chainR.data && chainR.data.chains) ? chainR.data.chains[c.key] : '未知';
      cards.push({ label: c.label, value: st || '未知', tone: st === 'ONLINE' ? 'good' : 'critical' });
    });
    cards.push({ label: '空域走廊', value: routesR.ok ? String(routesR.data.total || 0) : '--', sub: 'route/list' });
    cards.push({ label: '网络节点', value: topoR.ok ? String(visNodes.length) : '--', sub: 'topology/get（不含 ATTACKER）' });
    cards.push({ label: '在飞航空器', value: String(drones), sub: 'telemetry/latest 有位置', tone: drones > 0 ? 'good' : null });
    strip.append(P.statCards(cards));
    if (!chainR.ok) strip.append(P.errCard(chainR));     /* -1 时 errCard 自带启动指引 */
    else if (!routesR.ok) strip.append(P.errCard(routesR));
  }

  OP.home = { render: render };
})();
```

- [ ] **Step 2: 写 `frontend/js/pages/op/realname.js`（全文逐字）**

```js
/* realname.js — 运营商端·实名登记与操控员执照（计划 B Task 6，spec §5.1 + §6 第 1 章）
   三页签：主体登记（模拟证件号，红线 #10）+ 操控员执照 + 登记台账。
   操控员执照——pilot/apply 即申即发（ISSUED + SM9 局方签名，expires_at=签发+2 年）；
   spec §6 第 1 章「执照申请」属运营商端（Task 10 管理端 registry 只读、不做登记动作）。
   身份 = STORE OPERATOR 槽位且 id 以 RNS- 开头（轻量「登录」叙事、无密码、非认证体系，spec §8）；
   选定后 aircraft/flight 等页按前缀判据预填。端点：realname/register·list·query、
   pilot/apply·list·query（契约档案 §8：register/apply 响应有 {subject}/{license} 包裹、
   query/list 平铺——不对称是后端事实，前端两处形状都要吃；category 是中文枚举
   多旋翼|固定翼|垂直起降；7002=执照不存在或已失效。pilot 域无 STORE 落点：
   13 kinds 无 LICENSE，flight 页关联执照走 pilot/list 下拉——Task 7 已有）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var idbarEl = null;   /* 当前身份条容器：登记/选择后局部重绘 */

  function isSubjectSlot(s) { return !!s && String(s.id).indexOf('RNS-') === 0; }

  function drawIdbar() {
    if (!idbarEl || !idbarEl.isConnected) return;
    var s = STORE.get('OPERATOR');
    idbarEl.innerHTML = '';
    if (isSubjectSlot(s)) {
      var name = (s.extra && s.extra.name) || s.id;
      var kind = (s.extra && s.extra.subject_type === 'ENTERPRISE') ? '🏢 企业' : '👤 个人';
      idbarEl.append(
        h('span', { class: 'd-idbar-label' }, '当前身份'),
        h('span', { class: 'd-idchip' }, kind + ' · ' + name + ' · ' + s.id),
        h('span', { class: 'd-small d-muted' }, '（登记/选择即替换；清空请用顶栏 chip 条「✕ 清空」）'));
    } else {
      idbarEl.append(
        h('span', { class: 'd-idbar-label' }, '当前身份'),
        h('span', { class: 'd-small d-muted' }, '未选定实名主体 —— 在下方登记新主体，或在台账中点「选为当前身份」'));
    }
  }

  function render(root, ctx) {
    idbarEl = h('div', { class: 'd-idbar' });
    root.append(P.pageHead({
      title: '实名登记',
      sub: '实名主体登记 · 操控员执照即申即发 · 演示环境仅收取模拟证件号，不采集任何真实证件信息' }));
    root.append(idbarEl);
    drawIdbar();
    root.append(P.tabs([
      { key: 'register', label: '主体登记', render: tabRegister },
      { key: 'pilot', label: '操控员执照', render: tabPilot },
      { key: 'list', label: '登记台账', render: tabList }
    ]));
    var sid = ctx.query.get('subject_id');       /* 深链 #/realname?subject_id=RNS-xxx */
    if (sid) openSubject(sid, null);
  }

  function tabRegister(box) {
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'subject_type', label: '主体类型', type: 'select', required: true, value: 'ENTERPRISE',
        options: [['ENTERPRISE', '企业'], ['INDIVIDUAL', '个人']] },
      { name: 'name', label: '主体名称', type: 'text', required: true,
        placeholder: '如：武汉应急医疗运输有限公司（演示）' },
      { name: 'id_number', label: '证件号码（模拟）', type: 'text', required: true,
        placeholder: '企业 91420100DEMO001X / 个人 420100199001010011',
        hint: '红线：仅收取演示用模拟证件号（格式示意统一社会信用代码/身份证号），系统不采集、不存储任何真实证件信息' },
      { name: 'contact', label: '联系方式', type: 'text', placeholder: '如 027-88880001（可选）' }
    ]);
    box.append(card('主体登记 realname/register', f.root,
      P.actionBar([{ label: '提交登记', kind: 'primary', run: P.runOp({
        path: '/api/realname/register',
        body: function () { return PORTAL.need(f.read(), 'subject_type', 'name', 'id_number'); },
        rp: rp, successText: '实名主体登记成功',
        render: function (d) { return subjectCert(d.subject); },   /* {subject:{…}} 包裹（§8） */
        note: { kind: 'OPERATOR', id: function (d) { return d.subject.subject_id; },
          extra: function (d) { return { name: d.subject.name, subject_type: d.subject.subject_type }; } },
        onOk: function () { drawIdbar(); UI.toast('已设为当前身份，全端预填'); }
      }) }]),
      rp.root));
  }

  /* 登记回执卡（d-cert 政务凭证样式；本页无 QR——二维码是航空器登记标志专属） */
  function subjectCert(s) {
    if (!s) return null;
    return h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title' }, '无人驾驶航空器实名登记回执'),
        h('span', { class: 'd-cert-no' }, s.subject_id)),
      h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' },
        P.kv([
          ['主体名称', s.name],
          ['主体类型', s.subject_type === 'ENTERPRISE' ? '企业' : '个人'],
          ['证件号码（模拟）', h('code', { class: 'p-mono' }, s.id_number)],
          ['联系方式', s.contact || '—'],
          ['状态', P.badge(s.status)],
          ['登记时间', s.created_at]
        ]))));
  }

  /* ============ 页签 2：操控员执照（pilot/apply 即申即发，spec §6 第 1 章） ============ */
  function tabPilot(box) {
    var tbl = null;   /* 申领成功后 reload 台账（runOp 点击时才解引用，前向声明安全） */
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'name', label: '姓名', type: 'text', required: true,
        placeholder: '如：医疗运输操控员（演示）' },
      { name: 'id_number', label: '证件号码（模拟）', type: 'text', required: true,
        placeholder: '如 420100199203054321',
        hint: '红线：仅收取演示用模拟证件号，系统不采集、不存储任何真实证件信息' },
      { name: 'category', label: '航空器类别', type: 'select', required: true, value: '垂直起降',
        options: ['多旋翼', '固定翼', '垂直起降'] }
    ]);
    box.append(card('执照申领 pilot/apply（即申即发 · SM9 局方签名）', f.root,
      P.actionBar([{ label: '提交执照申领', kind: 'primary', run: P.runOp({
        path: '/api/pilot/apply',
        body: function () { return PORTAL.need(f.read(), 'name', 'id_number', 'category'); },
        rp: rp, successText: '执照已即申即发（ISSUED · 失效时间=签发+2 年）',
        render: function (d) { return licenseCert(d.license); },   /* {license} 包裹（§8） */
        onOk: function () { if (tbl) tbl.reload(); }               /* pilot 域无 STORE 落点 */
      }) }]),
      rp.root,
      h('p', { class: 'd-small d-muted' }, '「飞行活动申请」页建任务时可关联本执照（pilot_license_id）；管理当局「登记与资质」页可对本执照做 SM9 验签（签发身份 SM9-ID-FISCO-ADMIN）。')));
    tbl = P.dataTable({
      endpoint: '/api/pilot/list', pageSize: 5,
      filters: [{ name: 'category', label: '类别', type: 'select',
        options: ['多旋翼', '固定翼', '垂直起降'] }],
      columns: [
        { title: '执照 ID', render: function (r) { return UI.trunc(r.license_id, 20); }, mono: true },
        { title: '执照编号', key: 'license_no', mono: true },
        { title: '姓名', key: 'name' },
        { title: '类别', render: function (r) { return P.badge(r.category); } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '签发 → 失效', render: function (r) {
            return UI.trunc(r.issued_at, 16) + ' → ' + UI.trunc(r.expires_at, 16); } },
        { title: '操作', render: function (r) {
            return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
              onClick: function (e) { e.stopPropagation(); openLicense(r.license_id, tbl); } }, '详情');
          } }
      ],
      onRow: function (r) { openLicense(r.license_id, tbl); },
      emptyText: '暂无执照 —— 在上方提交申领后即发'
    });
    box.append(card('执照台账 pilot/list', tbl));
  }

  /* 执照凭证卡（d-cert 政务凭证样式；申领回执与详情抽屉共用） */
  function licenseCert(L) {
    if (!L) return null;
    return h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title' }, '无人驾驶航空器操控员执照（演示）'),
        h('span', { class: 'd-cert-no' }, L.license_no)),
      h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' },
        P.kv([
          ['执照 ID', h('code', { class: 'p-mono' }, L.license_id)],
          ['持有人', L.name],
          ['证件号码（模拟）', h('code', { class: 'p-mono' }, L.id_number)],
          ['航空器类别', P.badge(L.category)],
          ['状态', P.badge(L.status)],
          ['签发时间', L.issued_at],
          ['失效时间（签发+2 年）', L.expires_at],
          ['SM9 签名', h('code', { class: 'p-mono' }, UI.trunc(L.signature, 48))]
        ]),
        h('p', { class: 'd-small d-muted' }, '演示数据域：证件号为模拟值；执照为演示环境即发，不构成真实资质。'))));
  }

  async function openLicense(lid, tbl) {
    var d = P.drawer('操控员执照 ' + lid, h('div', { class: 'p-empty' }, '⏳ pilot/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/pilot/query', { license_id: lid });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 7002 不存在或已失效 → EXPLAIN 解说 */
    body.append(licenseCert(r.data));                  /* query 平铺（§8 不对称） */
    if (tbl) tbl.reload();
  }

  function tabList(box) {
    box.append(P.dataTable({
      endpoint: '/api/realname/list', pageSize: 10,
      filters: [{ name: 'subject_type', label: '类型', type: 'select', options: ['ENTERPRISE', 'INDIVIDUAL'] }],
      columns: [
        { title: '主体 ID', key: 'subject_id', mono: true },
        { title: '名称', key: 'name' },
        { title: '类型', render: function (r) { return r.subject_type === 'ENTERPRISE' ? '企业' : '个人'; } },
        { title: '证件号（模拟）', key: 'id_number', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '登记时间', key: 'created_at' },
        { title: '操作', render: function (r) {
            return h('span', { class: 'd-row' },
              h('button', { class: 'p-btn p-btn-sm', title: '存入当前身份，全端预填',
                onClick: function (e) { e.stopPropagation(); pick(r); } }, '选为当前身份'),
              h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
                onClick: function (e) { e.stopPropagation(); openSubject(r.subject_id, null); } }, '详情'));
          } }
      ],
      onRow: function (r) { openSubject(r.subject_id, null); },
      emptyText: '暂无实名主体 —— 先在「主体登记」页办理登记'
    }));
  }

  function pick(s) {
    STORE.note('OPERATOR', s.subject_id, { name: s.name, subject_type: s.subject_type });
    drawIdbar();
    UI.toast('当前身份：' + s.name + '（' + s.subject_id + '）');
  }

  async function openSubject(sid, tbl) {
    var d = P.drawer('实名主体 ' + sid, h('div', { class: 'p-empty' }, '⏳ realname/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/realname/query', { subject_id: sid });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 7001 主体不存在 → EXPLAIN 解说 */
    body.append(subjectCert(r.data),                    /* query 平铺（§8 不对称） */
      P.actionBar([{ label: '选为当前身份', kind: 'primary',
        run: function () { pick(r.data); d.close(); } }]));
    if (tbl) tbl.reload();
  }

  OP.realname = { render: render };
})();
```

- [ ] **Step 3: 写 `frontend/js/pages/op/aircraft.js`（全文逐字）**

```js
/* aircraft.js — 运营商端·我的航空器（计划 B Task 6，spec §5.1）
   登记即上链：uav/register 成功即发登记标志 UAS-xxxxxxxx + 二维码 + 跨链四段 TxID。
   台账 / 详情抽屉 / 状态迁移 / 注销（spec §6 第 8 章 ACTIVATE 收尾戏依赖本页状态操作）。
   端点：uav/register·list·query·status·revoke、manufacturer/list、operator/list、
   crosschain/list（登记存证回查；裁决 16：无 business_id 过滤 → 拉回本地逐行匹配）。
   红线 #9：遗留行 registration_mark=NULL → 「未发放登记标志」回退文案，不渲染空 QR。
   契约档案 §9：register/status 响应 {uav,crosschain} 包裹、revoke/query 平铺——两处形状都吃；
   status 的 crosschain 可为 null（裁决 12：null 不画 cxTrail）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  function markOf(u) { return u.registration_mark || '未发放登记标志'; }
  function qrPayload(u) {
    return JSON.stringify({ mark: u.registration_mark, uav_id: u.uav_id, operator_id: u.operator_id });
  }
  /* 实名身份预填：OPERATOR 槽位且 RNS- 前缀（Task 6 Produces 约定） */
  function prefillSubject() {
    var s = STORE.get('OPERATOR');
    return (s && String(s.id).indexOf('RNS-') === 0) ? s.id : '';
  }
  function verifiedBadge(st) {
    return h('span', { class: 'd-row' }, P.badge(st),
      st === 'VERIFIED' ? h('span', { class: 'd-small d-muted' }, '实名核验通过') : null);
  }

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '我的航空器',
      sub: '登记即上链 —— 注册成功即发登记标志与二维码，跨链存证四段 TxID 全程可溯' }));
    root.append(P.tabs([
      { key: 'register', label: '航空器登记', render: tabRegister },
      { key: 'fleet', label: '航空器台账', render: tabFleet }
    ]));
  }

  function tabRegister(box) {
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'uav_id', label: '航空器 ID', type: 'text', placeholder: '留空自动生成；如 UAV-A-001' },
      { name: 'manufacturer_id', label: '生产厂商', type: 'select', required: true, options: [['', '选择厂商…']] },
      { name: 'operator_id', label: '运营企业', type: 'select', required: true, options: [['', '选择运营企业…']] },
      { name: 'model', label: '型号', type: 'text', placeholder: '如 DJI-M300（可选）' },
      { name: 'serial_no', label: '产品序列号', type: 'text', required: true, placeholder: '如 SN-A001' },
      { name: 'realname_id', label: '关联实名主体', type: 'text', value: prefillSubject(),
        placeholder: 'RNS-xxxxxxxx（可选）',
        hint: '在「实名登记」页选定当前身份后自动预填；填写但主体不存在 → 7001 拒绝' }
    ]);
    loadMasterData(f);
    box.append(card('航空器登记 uav/register（注册即核验 · 登记即上链）', f.root,
      P.actionBar([{ label: '提交登记', kind: 'primary', run: P.runOp({
        path: '/api/uav/register',
        body: function () { return PORTAL.need(f.read(), 'manufacturer_id', 'operator_id', 'serial_no'); },
        rp: rp, successText: '航空器登记成功，跨链存证已上链',
        render: function (d) { return regCert(d); },
        note: { kind: 'UAV', id: function (d) { return d.uav.uav_id; },
          extra: function (d) { return { operator_id: d.uav.operator_id }; } },
        onOk: function (d) {
          STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.crosschain.business_id });
        }
      }) }]),
      rp.root));
  }

  /* 主数据下拉：厂商/运营商台账一次拉全（page_size 200 上限，种子仅 3+3 条） */
  async function loadMasterData(f) {
    var mf = await API.call('/api/manufacturer/list', { page: 1, page_size: 200 });
    if (mf.ok) f.setOptions('manufacturer_id', [['', '选择厂商…']].concat(
      (mf.data.records || []).map(function (m) { return [m.manufacturer_id, m.name + '（' + m.manufacturer_id + '）']; })));
    var op = await API.call('/api/operator/list', { page: 1, page_size: 200 });
    if (op.ok) f.setOptions('operator_id', [['', '选择运营企业…']].concat(
      (op.data.records || []).map(function (o) { return [o.operator_id, o.name + '（' + o.operator_id + '）']; })));
  }

  /* 登记证书卡：政务凭证样式 + QR + 「登记即上链」印章 + 跨链四段 TxID */
  function regCert(d) {
    var u = d.uav, x = d.crosschain;
    var qrEl = h('div', { class: 'd-qr' });
    var cert = h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title' }, '民用无人驾驶航空器登记证明'),
        h('span', { class: 'd-cert-no' }, markOf(u))),
      h('div', { class: 'd-cert-body' },
        h('div', { class: 'd-cert-main' }, P.kv([
          ['航空器 ID', h('code', { class: 'p-mono' }, u.uav_id)],
          ['登记标志', h('b', { class: 'd-num' }, markOf(u))],
          ['状态', verifiedBadge(u.status)],
          ['厂商 / 企业', (u.manufacturer_id || '—') + ' / ' + (u.operator_id || '—')],
          ['型号 / 序列号', (u.model || '—') + ' / ' + (u.serial_no || '—')],
          ['实名主体', u.realname_id || '未关联'],
          ['SM9 身份', h('code', { class: 'p-mono' }, u.sm9_identity || '—')],
          ['登记时间', u.created_at]
        ])),
        qrEl),
      h('div', { class: 'd-seal' }, '登记即上链'));
    if (u.registration_mark) {
      PORTAL.renderQR(qrEl, qrPayload(u));       /* 失败自动变 .d-qr-none 兜底（Task 5 契约） */
    } else {
      qrEl.className = 'd-qr d-qr-none';
      qrEl.textContent = '未发放登记标志（遗留数据），二维码不生成';
    }
    return h('div', {}, cert,
      x ? h('div', { class: 'd-mt' },
          h('div', { class: 'd-section' }, '跨链存证 · 四段 TxID（运营链 fabric → 监管链 chainmaker 签收/中继 → 存证）'),
          P.cxTrail(x))
        : null);
  }

  function tabFleet(box) {
    var tbl = P.dataTable({
      endpoint: '/api/uav/list', pageSize: 10,
      filters: [
        { name: 'status', label: '状态', type: 'select',
          options: ['REGISTERED', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED'] },
        { name: 'operator_id', label: '运营企业 ID', type: 'text' }
      ],
      columns: [
        { title: '航空器 ID', key: 'uav_id', mono: true },
        { title: '登记标志', render: function (r) { return h('code', { class: 'p-mono' }, markOf(r)); } },
        { title: '型号', render: function (r) { return r.model || '—'; } },
        { title: '运营企业', key: 'operator_id' },
        { title: '实名主体', render: function (r) { return r.realname_id || '未关联'; } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '登记时间', key: 'created_at' }
      ],
      onRow: function (r) { openUav(r.uav_id, tbl); },
      emptyText: '暂无航空器 —— 先在「航空器登记」页办理登记'
    });
    box.append(tbl);
  }

  async function openUav(uavId, tbl) {
    var d = P.drawer('航空器 ' + uavId, h('div', { class: 'p-empty' }, '⏳ uav/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/uav/query', { uav_id: uavId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 1001 不存在 → EXPLAIN 解说 */
    var u = r.data;
    STORE.note('UAV', u.uav_id, { operator_id: u.operator_id });   /* 旧页惯例（§29） */
    var qrEl = h('div', { class: 'd-qr' });
    if (u.registration_mark) PORTAL.renderQR(qrEl, qrPayload(u));
    else { qrEl.className = 'd-qr d-qr-none'; qrEl.textContent = '未发放登记标志（遗留数据）'; }
    body.append(
      h('div', { class: 'd-row d-row-top d-mb' }, qrEl,
        h('div', { style: { flex: '1', 'min-width': '0' } }, P.kv([
          ['登记标志', h('b', { class: 'd-num' }, markOf(u))],
          ['状态', verifiedBadge(u.status)],
          ['厂商', u.manufacturer_id || '—'],
          ['运营企业', u.operator_id || '—'],
          ['型号 / 序列号', (u.model || '—') + ' / ' + (u.serial_no || '—')],
          ['实名主体', u.realname_id || '未关联'],
          ['SM9 身份', h('code', { class: 'p-mono' }, u.sm9_identity || '—')],
          ['创建 / 更新', u.created_at + ' → ' + u.updated_at]
        ]))),
      statePanel(u, tbl),
      cxPanel(u));
  }

  /* 状态迁移 + 注销（2004 幂等拒绝 / 1004 非法迁移均为设计内，errCard 中性展示） */
  function statePanel(u, tbl) {
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'action', label: '状态动作', type: 'select', required: true, value: 'ACTIVATE',
        options: [['VERIFY', 'VERIFY 核验'], ['ACTIVATE', 'ACTIVATE 激活'],
                  ['SUSPEND', 'SUSPEND 暂停'], ['RESUME', 'RESUME 恢复']] }
    ]);
    return h('div', {},
      h('div', { class: 'd-section' }, '状态迁移与注销'),
      h('p', { class: 'd-small d-muted' }, '提示：重复 VERIFY 已核验机 → 2004 幂等拒绝；非法迁移/不可注销状态 → 1004 —— 均为状态机设计内行为。'),
      f.root,
      P.actionBar([
        { label: '执行状态动作', kind: 'primary', run: P.runOp({
            path: '/api/uav/status',
            body: function () { return Object.assign({ uav_id: u.uav_id }, f.read()); },
            rp: rp, successText: '状态迁移成功',
            render: function (d) {
              return h('div', {},
                P.kv([['航空器', d.uav.uav_id], ['新状态', P.badge(d.uav.status)]]),
                d.crosschain ? P.cxTrail(d.crosschain) : null);   /* 可为 null（裁决 12） */
            },
            note: { kind: 'UAV', id: function (d) { return d.uav.uav_id; } },
            onOk: function () { if (tbl) tbl.reload(); }
          }) },
        { label: '注销航空器', kind: 'danger',
          confirm: { title: '确认注销', msg: '注销 ' + u.uav_id + ' 后状态变为 REVOKED，不可再用于任务申请。', ok: '确认注销' },
          run: P.runOp({
            path: '/api/uav/revoke',
            body: function () { return { uav_id: u.uav_id, reason: '运营方主动注销', operator: 'Operator Portal' }; },
            rp: rp, successText: '航空器已注销',
            render: function (d) { return P.kv([['航空器', d.uav_id], ['状态', P.badge(d.status)]]); },  /* revoke 平铺（§9） */
            note: { kind: 'UAV', id: function (d) { return d.uav_id; } },
            onOk: function () { if (tbl) tbl.reload(); }
          }) }
      ]),
      rp.root);
  }

  /* 登记跨链存证回查：crosschain/list 无 business_id 过滤（裁决 16）→ 拉回本地逐行匹配；
     段点击 → P.openCxDetail（内部走 crosschain/query，覆盖 spec §5.1 端点列） */
  function cxPanel(u) {
    var box = h('div', { class: 'p-empty' }, '⏳ 登记跨链存证查询中…');
    (async function () {
      var r = await API.call('/api/crosschain/list', { message_type: 'UAV_REGISTER_PROOF', page: 1, page_size: 200 });
      if (!box.isConnected) return;
      box.innerHTML = '';
      if (!r.ok) { box.append(P.errCard(r)); return; }
      var hit = (r.data.records || []).filter(function (x) { return x.business_id === u.uav_id; })[0];
      if (!hit) { box.append(P.empty('未找到该航空器的登记存证（可能为跨链域上线前的遗留数据）')); return; }
      box.append(P.cxTrail(hit));
    })();
    return h('div', {}, h('div', { class: 'd-section' }, '登记跨链存证（fabric → chainmaker）'), box);
  }

  OP.aircraft = { render: render };
})();
```

- [ ] **Step 4: operator.html 插入三行 script（Edit，锚点=Task 5 预留注释）**

对 `frontend/operator.html` 做精确替换（old_string 在文件中唯一）：

old_string：
```
<script src="js/portal.js"></script>
<!-- 页面脚本 js/pages/op/*.js 由 Task 6-8 逐行插入到本注释与 shell 行之间 -->
<script src="js/shell-op.js"></script>
```
new_string：
```
<script src="js/portal.js"></script>
<!-- 页面脚本 js/pages/op/*.js 由 Task 6-8 逐行插入到本注释与 shell 行之间 -->
<script src="js/pages/op/home.js"></script>
<script src="js/pages/op/realname.js"></script>
<script src="js/pages/op/aircraft.js"></script>
<script src="js/shell-op.js"></script>
```

- [ ] **Step 5: 语法门 + 结构断言**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
node --check js/pages/op/home.js && node --check js/pages/op/realname.js && node --check js/pages/op/aircraft.js && echo SYNTAX_OK

# 页面注册契约与公共惯例（惯例 1/3）
grep -c 'OP.home = { render' js/pages/op/home.js           # =1
grep -c 'OP.realname = { render' js/pages/op/realname.js   # =1
grep -c 'OP.aircraft = { render' js/pages/op/aircraft.js   # =1
grep -rn 'P.chipBar(' js/pages/op/ | wc -l                 # =0（chip 条由 portal 全局挂载）
grep -rn "tk=" js/pages/op/ | wc -l                        # =0（红线 #8：key 绝不进源码）

# 契约档案裁决落点抽查
grep -c 'd.subject.subject_id' js/pages/op/realname.js     # ≥1（register 包裹层）
grep -c 'd.uav.uav_id' js/pages/op/aircraft.js             # ≥2（register/status 包裹层）
grep -c '未发放登记标志' js/pages/op/aircraft.js            # ≥2（红线 #9 NULL 容忍）
grep -c "indexOf('RNS-')" js/pages/op/aircraft.js          # =1（身份预填前缀判据）

# 操控员执照页签（spec §6 第 1 章：pilot/apply 属运营商端）+ home 信息边界
grep -c "'/api/pilot/apply'" js/pages/op/realname.js       # =1
grep -c "'/api/pilot/list'" js/pages/op/realname.js        # =1
grep -c "'/api/pilot/query'" js/pages/op/realname.js       # =1
grep -c "label: '操控员执照'" js/pages/op/realname.js       # =1（第三页签）
grep -c '垂直起降' js/pages/op/realname.js                 # =2（表单默认值 + 台账过滤）
grep -c 'd.license' js/pages/op/realname.js                # ≥1（apply {license} 包裹层）
grep -c "node_type !== 'ATTACKER'" js/pages/op/home.js     # =1（运营端信息边界：hero 地图不画攻击节点）
grep -c 'drawWormholes' js/pages/op/home.js                # =0（虫洞伪造边属管理端 netsec 全量视图）

# script 顺序：三行位于锚点注释与 shell 之间且行号递增
awk '/页面脚本 js\/pages\/op/{c=NR} /pages\/op\/home.js/{h=NR} /pages\/op\/realname.js/{r=NR} /pages\/op\/aircraft.js/{a=NR} /shell-op.js/{s=NR} END{ if (c<h && h<r && r<a && a<s) print "ORDER_OK"; else print "ORDER_BAD", c,h,r,a,s }' operator.html
```
预期：`SYNTAX_OK` + 各计数如注 + `ORDER_OK`。

- [ ] **Step 6: 静态 smoke（生产红线 #11：BACKEND 指向空地址，绝不打 :8080/:8090）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
PORT=18099 BACKEND=http://127.0.0.1:1 python3 ../scripts/serve-frontend.py & SRV=$!
sleep 1
for p in operator.html js/pages/op/home.js js/pages/op/realname.js js/pages/op/aircraft.js; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:18099/$p"); echo "$p -> $code"
done
kill $SRV 2>/dev/null; wait $SRV 2>/dev/null; echo SMOKE_DONE
```
预期：四行全 `-> 200` + `SMOKE_DONE`。（serve-frontend.py 只代理 POST /api/*，本步无任何 /api 请求。）

- [ ] **Step 7: DEFERRED-HUMAN 清单（浏览器目检，Task 15 汇总）**

- operator.html#/home：hero 地图渲染（无 key → 网格底图 + 退化徽章 + 航线/zone/节点矢量照常）；**节点图层无红色 ATTACKER 节点、无虫洞红虚线边**（运营端信息边界）；六张入口卡点击跳路由；态势条三链 ONLINE + 计数（网络节点计数=过滤后数量，种子 8 节点应显示 6）。
- #/realname：登记一个企业主体 → 回执卡出现 + 顶栏 chip 条出现「运营商 RNS-…」+ 身份条刷新；台账「选为当前身份」生效；?subject_id= 深链开抽屉。「操控员执照」页签：填姓名+模拟证件号+类别（默认垂直起降）→ 提交执照申领 → d-cert 执照凭证卡（编号 UAV-PILOT-2026-xxxx · ISSUED · 失效=签发+2 年 · SM9 签名值）+ 台账刷新；台账行点击/详情 → pilot/query 抽屉（平铺形状同卡渲染）；缺必填 → toast 拦截不发请求；跨端联动：管理端 #/registry 执照台账可见新执照并 SM9 验签通过（Task 10 验收项）。
- #/aircraft：厂商/运营商下拉有种子数据；注册（关联 RNS- 主体）→ 证书卡 QR 可见、四段 TxID 全亮、点段开存证抽屉；台账行点击开抽屉（QR+状态操作+登记存证回查）；注销需确认弹窗。

- [ ] **Step 8: 提交**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/pages/op/home.js frontend/js/pages/op/realname.js frontend/js/pages/op/aircraft.js frontend/operator.html
git commit -m "$(cat <<'MSG'
feat(frontend): 运营商端 I——服务首页/实名登记（含操控员执照页签）/我的航空器三页（计划 B Task 6）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

### Task 7: 运营商端 II —— flight / license

**Files:**
- Create: `frontend/js/pages/op/flight.js`、`frontend/js/pages/op/license.js`
- Modify: `frontend/operator.html`（Task 6 三行之后、shell 行之前插入 2 行）

**Interfaces:**
- Consumes: Task 6 全部公共惯例 + `PORTAL.{jp,need}`；`MAPX.create→mx{clear('zones'|'routes'),drawZones,drawRoutes(routes,{active,onPick,opacity}),fitPoints,setEmpty,destroy}`；`GEO.{DEFAULT_VIEW,routePoints,ZONE_LABEL}`（ZONE_COLOR：OPEN=#15803d 绿 / RESTRICTED=#b45309 琥珀 / CLOSED=#b91c1c 红）；`UI.{datetimeLocal(offsetMin)→'YYYY-MM-DD HH:mm:ss',trunc,toast}`；契约档案 §10（Mission 平铺、route_segments/zones 为 JSON 字符串）、§12（conflict/detect 返回 {conflicts,count}、resolve 平铺、3004 重复消解）、§13（Pass 平铺 11 键、verify code 恒 0 + reasons 中文清单）、§8（pilot/list 执照 options 源）；STORE 槽位 MISSION/PASS/UAV。
- Produces:
  - `window.OP_PAGES.flight = {render}`、`window.OP_PAGES.license = {render}`。
  - operator.html script 区新增（顺序）：`flight.js` → `license.js`（aircraft.js 之后、shell-op.js 之前）。
  - 预填链：mission/create 成功 → `fSb.set('mission_id', …)`（同页跨链提交表单）；pass 台账行点击 → 验证表单 `pass_id` 预填；STORE UAV 槽位 → pass/list uav_id 过滤器初值。

- [ ] **Step 1: 写 `frontend/js/pages/op/flight.js`（全文逐字）**

```js
/* flight.js — 运营商端·飞行活动申请（计划 B Task 7，spec §5.1）
   地图勾选航段（zone 着色 OPEN/RESTRICTED/CLOSED，点选高亮入单，勾选框双向同步）
   → mission/create（描述 SM9 加密入库、界面只见 masked_value 脱敏值）
   → conflict/detect 冲突提示 + conflict/resolve 协调（重复消解 3004 = 设计内拒绝）
   → mission/submit 跨链提交（fabric → chainmaker → fisco-bcos）。
   端点：mission/create·submit·query·list、route/list、conflict/detect·resolve、pilot/list、
   crosschain/query（经 P.openCxDetail / P.cxTrail 段点击）。
   裁决 3：route_segments/zones/suggestion 响应侧是 JSON 字符串 → PORTAL.jp。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    root.append(P.pageHead({
      title: '飞行活动申请',
      sub: '地图勾选航段建任务 · 描述密文入库脱敏展示 · 冲突协调全程留痕 · 跨链提交跨域申请' }));
    root.append(P.tabs([
      { key: 'create', label: '新建申请', render: tabCreate },
      { key: 'missions', label: '我的任务', render: tabMissions }
    ]));
  }

  /* ============ Tab 1：新建申请（左地图右表单，UOM 对位） ============ */
  function tabCreate(box) {
    var routes = [], selected = [];
    var mapEl = h('div', { class: 'd-map d-map-lg' });
    var rpCr = P.resultPanel(), rpCf = P.resultPanel(), rpRs = P.resultPanel(), rpSb = P.resultPanel();

    var f = P.form([
      { name: 'operator_id', label: '运营企业', type: 'select', required: true, options: [['', '选择运营企业…']] },
      { name: 'uav_id', label: '航空器', type: 'select', required: true, options: [['', '选择航空器…']] },
      { name: 'mission_type', label: '任务类型', type: 'text', required: true, value: 'MEDICAL',
        placeholder: 'MEDICAL / POWER_INSPECTION / LOGISTICS…' },
      { name: 'payload_type', label: '载荷类型', type: 'text', required: true, value: 'MEDICAL_KIT',
        placeholder: 'MEDICAL_KIT / CAMERA / CARGO…' },
      { name: 'route_segments', label: '航段（地图点选或勾选）', type: 'multi', required: true, options: [],
        hint: '选项取自 route/list；地图点选与勾选框双向同步' },
      { name: 'altitude_min', label: '高度下限(m)', type: 'number', value: 60 },
      { name: 'altitude_max', label: '高度上限(m)', type: 'number', required: true, value: 120 },
      { name: 'start_time', label: '开始时间', type: 'datetime', required: true, value: UI.datetimeLocal(60),
        hint: '格式 YYYY-MM-DD HH:mm:ss（已预填「1 小时后」，可直接改）' },
      { name: 'end_time', label: '结束时间', type: 'datetime', required: true, value: UI.datetimeLocal(240),
        hint: '已预填「4 小时后」' },
      { name: 'pilot_license_id', label: '关联执照', type: 'select', options: [['', '不关联（可选）']],
        hint: '取自 pilot/list；执照不存在/过期 → 7002 拒绝' },
      { name: 'description', label: '任务描述', type: 'textarea', rows: 3,
        placeholder: '如：紧急医疗运输——特殊血样送达市一医院（演示剧情）',
        hint: '描述经 SM9 加密入库：管理端与台账只见脱敏值 masked_value，明文永不出运营商域' }
    ]);
    var slot = STORE.get('MISSION');
    var fCf = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, value: slot ? slot.id : '',
        placeholder: 'MISSION-2026-xxx（创建成功后自动预填）' }
    ]);
    var fRs = P.form([
      { name: 'conflict_id', label: '冲突 ID', type: 'text', required: true, placeholder: 'CFL-…（检测结果点「消解此冲突」预填）' },
      { name: 'resolution', label: '消解措施', type: 'text', required: true, placeholder: '如：时间窗后移 30 分钟' },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: 'Operator Portal' },
      { name: 'mission_id', label: '继续执行方任务号', type: 'text',
        placeholder: '留空 = 双方任务均回 REVIEWING（可选）' }
    ]);
    var fSb = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, value: slot ? slot.id : '',
        placeholder: 'MISSION-2026-xxx（创建成功后自动预填）' },
      { name: 'operator', label: '提交人/运营方', type: 'text', required: true, value: 'Operator Portal' }
    ]);

    box.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        h('div', { class: 'd-map-hint' }, '🗺️ 点击地图航线 = 勾选/取消（高亮即入单）。走廊着色：绿=开放 OPEN · 琥珀=限制 RESTRICTED · 红=关闭 CLOSED'),
        mapEl),
      h('div', { class: 'd-col' },
        card('① 任务创建 mission/create（描述密文入库 · 脱敏展示）', f.root,
          P.actionBar([{ label: '创建任务', kind: 'primary', run: P.runOp({
            path: '/api/mission/create',
            body: function () { return PORTAL.need(f.read(), 'operator_id', 'uav_id', 'mission_type',
              'payload_type', 'route_segments', 'altitude_max', 'start_time', 'end_time'); },
            rp: rpCr, successText: '任务已创建（DRAFT），描述已密文入库',
            render: function (d) {
              return h('div', {},
                P.kv([
                  ['任务号', h('code', { class: 'p-mono' }, d.mission_id)],
                  ['状态', P.badge(d.status)],
                  ['脱敏值', d.masked_value || '—'],
                  ['航段', PORTAL.jp(d.route_segments, []).join('、')],
                  ['涉及空域', PORTAL.jp(d.zones, []).join('、')],
                  ['高度带', d.altitude_min + '–' + d.altitude_max + ' m'],
                  ['时间窗', d.start_time + ' → ' + d.end_time],
                  ['关联执照', d.pilot_license_id || '未关联'],
                  ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(d.sm3_hash, 40))]
                ]),
                h('p', { class: 'd-small d-muted' }, '下一步：② 冲突检测（可选）→ ③ 跨链提交。任务号已自动预填。'));
            },
            note: { kind: 'MISSION', id: function (d) { return d.mission_id; },
              extra: function (d) { return { operator_id: d.operator_id, uav_id: d.uav_id }; } },
            onOk: function (d) { fSb.set('mission_id', d.mission_id); fCf.set('mission_id', d.mission_id); }
          }) }]),
          rpCr.root),
        card('② 冲突检测与协调 conflict/detect · resolve',
          h('p', { class: 'd-small d-muted' }, '同走廊重叠时窗会检出 TIME/ROUTE/ALTITUDE 冲突，主动方任务进 COORDINATING；重复消解同一冲突 → 3004 设计内拒绝。'),
          fCf.root,
          P.actionBar([{ label: '检测冲突', run: P.runOp({
            path: '/api/conflict/detect',
            body: function () { return PORTAL.need(fCf.read(), 'mission_id'); },
            rp: rpCf, successText: '冲突检测完成',
            render: function (d) { return conflictsView(d, fRs); } }) }]),
          rpCf.root, fRs.root,
          P.actionBar([{ label: '提交消解', kind: 'primary', run: P.runOp({
            path: '/api/conflict/resolve',
            body: function () { return PORTAL.need(fRs.read(), 'conflict_id', 'resolution', 'operator'); },
            rp: rpRs, successText: '冲突消解成功',
            render: function (d) { return P.kv([['冲突', d.conflict_id || '—'], ['消解后状态', P.badge(d.status || '—')]]); },
            note: { kind: 'CONFLICT', id: function (d) { return (d && d.conflict_id) || ''; } } }) }]),
          rpRs.root),
        card('③ 跨链提交 mission/submit（fabric → chainmaker → fisco-bcos）', fSb.root,
          P.actionBar([{ label: '提交跨域申请', kind: 'primary',
            confirm: { title: '提交跨域申请', msg: '任务将经运营链→监管链→管理链跨域提交，进入管理当局待审队列。', ok: '确认提交' },
            run: P.runOp({
              path: '/api/mission/submit',
              body: function () { return PORTAL.need(fSb.read(), 'mission_id', 'operator'); },
              rp: rpSb, successText: '跨域申请已提交（任务 DRAFT→SUBMITTED）',
              render: function (d) {
                return h('div', {},
                  P.kv([['申请号', h('code', { class: 'p-mono' }, d.application.application_id)],
                        ['任务号', d.application.mission_id],
                        ['申请状态', P.badge(d.application.status)]]),
                  P.cxTrail(d.crosschain));
              },
              note: { kind: 'APPLICATION', id: function (d) { return d.application.application_id; },
                extra: function (d) { return { mission_id: d.application.mission_id }; } },
              onOk: function (d) {
                STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.crosschain.business_id });
              } }) }]),
          rpSb.root))));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });

    function redraw() {
      if (!mx) return;
      mx.clear('zones'); mx.clear('routes');
      mx.drawZones(routes);
      mx.drawRoutes(routes, { active: selected, onPick: pick, opacity: 0.9 });
    }
    function pick(rt) {
      var i = selected.indexOf(rt.route_id);
      if (i >= 0) selected.splice(i, 1); else selected.push(rt.route_id);
      f.set('route_segments', selected);
      redraw();
    }
    /* 勾选框手动改动 → 地图高亮同步（事件委托，setOptions 重建 DOM 也不失效） */
    f.root.addEventListener('change', function (e) {
      if (e.target && e.target.matches && e.target.matches('input[data-mf="route_segments"]')) {
        selected = f.read().route_segments || [];
        redraw();
      }
    });
    loadPickers(); loadRoutes();

    async function loadPickers() {
      var op = await API.call('/api/operator/list', { page: 1, page_size: 200 });
      if (op.ok) f.setOptions('operator_id', [['', '选择运营企业…']].concat(
        (op.data.records || []).map(function (o) { return [o.operator_id, o.name + '（' + o.operator_id + '）']; })));
      var ua = await API.call('/api/uav/list', { page: 1, page_size: 200 });
      if (ua.ok) f.setOptions('uav_id', [['', '选择航空器…']].concat(
        (ua.data.records || []).map(function (u) {
          return [u.uav_id, u.uav_id + ' · ' + (u.model || '?') + ' · ' + (u.registration_mark || '未发放登记标志')];
        })));
      var pl = await API.call('/api/pilot/list', { page: 1, page_size: 200 });
      if (pl.ok) f.setOptions('pilot_license_id', [['', '不关联（可选）']].concat(
        (pl.data.records || []).map(function (l) {
          return [l.license_id, l.name + ' · ' + l.license_no + ' · ' + l.category];
        })));
    }
    async function loadRoutes() {
      var r = await API.call('/api/route/list', { page: 1, page_size: 200 });
      if (!r.ok) { if (mx) mx.setEmpty('航线加载失败 code=' + r.code + '（' + r.message + '）'); return; }
      routes = r.data.records || [];
      f.setOptions('route_segments', routes.map(function (x) {
        return [x.route_id, x.route_id + ' · ' + x.zone + ' · ' + (GEO.ZONE_LABEL[x.corridor_status] || x.corridor_status)];
      }));
      redraw();
      var pts = GEO.routePoints(routes);
      if (mx && pts.length) mx.fitPoints(pts);
    }
  }

  /* 冲突检测结果列表：点「消解此冲突」预填消解表单；suggestion 是 JSON 字符串（裁决 3）。
     fRs 可为 null（详情面板复用本视图时无预填目标）。 */
  function conflictsView(d, fRs) {
    var list = d.conflicts || [];
    if (!list.length) return P.empty('无冲突（count=' + (d.count || 0) + '）—— 可直接跨链提交');
    return h('div', {},
      h('div', { class: 'd-small d-muted d-mb' }, '检出 ' + list.length + ' 项冲突。类型：TIME 时窗重叠 / ROUTE 航路交叉 / ALTITUDE 高度冲突。'),
      h('div', { class: 'd-col' }, list.map(function (c) {
        var sug = PORTAL.jp(c.suggestion, null);
        return h('div', { class: 'p-card' },
          P.kv([
            ['冲突 ID', h('code', { class: 'p-mono' }, c.conflict_id)],
            ['类型', P.badge(c.conflict_type)],
            ['任务对', c.mission_id_a + ' ⇄ ' + c.mission_id_b],
            ['状态', P.badge(c.status)],
            ['系统建议', sug === null ? '—' : (typeof sug === 'string' ? sug : JSON.stringify(sug))]
          ]),
          fRs ? P.actionBar([{ label: '消解此冲突', run: function () {
            fRs.set('conflict_id', c.conflict_id);
            UI.toast('已预填冲突 ID：' + c.conflict_id + ' —— 填写消解措施后提交');
          } }]) : null);
      })));
  }

  /* ============ Tab 2：我的任务（台账 + 右侧详情/操作面板） ============ */
  function tabMissions(box) {
    var detail = h('div', { class: 'd-small d-muted' }, '点击左侧台账行查看任务详情与跨链操作');
    var tbl = P.dataTable({
      endpoint: '/api/mission/list', pageSize: 10,
      filters: [
        { name: 'status', label: '状态', type: 'select',
          options: ['DRAFT', 'SUBMITTED', 'REVIEWING', 'COORDINATING', 'APPROVED', 'REJECTED', 'EXECUTING', 'COMPLETED', 'ABORTED'] },
        { name: 'uav_id', label: '航空器 ID', type: 'text' }
      ],
      columns: [
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '运营企业', key: 'operator_id' },
        { title: '脱敏描述', render: function (r) { return r.masked_value || '—'; } },
        { title: '时间窗', render: function (r) { return r.start_time + ' → ' + r.end_time; } },
        { title: '创建时间', key: 'created_at' }
      ],
      onRow: function (r) { openMission(r.mission_id, detail, tbl); },
      emptyText: '暂无任务 —— 在「新建申请」页地图勾选航段创建'
    });
    box.append(h('div', { class: 'd-grid-side' }, tbl,
      h('div', { class: 'd-col' }, h('div', { class: 'd-section' }, '任务详情 · 状态追踪'), detail)));
  }

  async function openMission(mid, panel, tbl) {
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '⏳ mission/query 查询中…'));
    var r = await API.call('/api/mission/query', { mission_id: mid });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }    /* 6002 不存在 → EXPLAIN 解说 */
    var m = r.data;
    STORE.note('MISSION', m.mission_id, { operator_id: m.operator_id, uav_id: m.uav_id });  /* §29 惯例 */
    var rpSb = P.resultPanel(), rpCf = P.resultPanel();
    panel.append(
      P.kv([
        ['任务号', h('code', { class: 'p-mono' }, m.mission_id)],
        ['状态', P.badge(m.status)],
        ['脱敏描述', m.masked_value || '—'],
        ['航段', PORTAL.jp(m.route_segments, []).join('、') || '—'],
        ['涉及空域', PORTAL.jp(m.zones, []).join('、') || '—'],
        ['高度带', m.altitude_min + '–' + m.altitude_max + ' m'],
        ['时间窗', m.start_time + ' → ' + m.end_time],
        ['任务 / 载荷类型', m.mission_type + ' / ' + (m.payload_type || '—')],
        ['关联执照', m.pilot_license_id || '未关联'],
        ['SM9 身份', h('code', { class: 'p-mono' }, m.sm9_identity || '—')],
        ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(m.sm3_hash, 40))],
        ['创建 / 更新', m.created_at + ' → ' + m.updated_at]
      ]),
      h('p', { class: 'd-small d-muted' }, '描述明文经 SM9 加密入库，本页与管理端都只见脱敏值 —— 数据可用不可见。'),
      P.actionBar([
        { label: '提交跨域申请', kind: 'primary',
          confirm: { title: '提交跨域申请', msg: '任务 ' + m.mission_id + ' 将跨链提交（fabric → chainmaker → fisco-bcos）。非 DRAFT 状态 → 3004 设计内拒绝。', ok: '确认提交' },
          run: P.runOp({
            path: '/api/mission/submit',
            body: function () { return { mission_id: m.mission_id, operator: m.operator_id }; },
            rp: rpSb, successText: '跨域申请已提交',
            render: function (d) {
              return h('div', {},
                P.kv([['申请号', h('code', { class: 'p-mono' }, d.application.application_id)],
                      ['申请状态', P.badge(d.application.status)]]),
                P.cxTrail(d.crosschain));
            },
            note: { kind: 'APPLICATION', id: function (d) { return d.application.application_id; },
              extra: function (d) { return { mission_id: d.application.mission_id }; } },
            onOk: function (d) {
              STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.crosschain.business_id });
              if (tbl) tbl.reload();
            } }) },
        { label: '冲突检测', run: P.runOp({
            path: '/api/conflict/detect',
            body: function () { return { mission_id: m.mission_id }; },
            rp: rpCf, successText: '冲突检测完成',
            render: function (d) { return conflictsView(d, null); } }) }
      ]),
      rpSb.root, rpCf.root);
  }

  OP.flight = { render: render };
})();
```

- [ ] **Step 2: 写 `frontend/js/pages/op/license.js`（全文逐字）**

```js
/* license.js — 运营商端·电子飞行许可（计划 B Task 7，spec §5.1）
   pass/list 台账（STORE UAV 槽位预填 uav_id 过滤器）→ 点行在右侧渲染电子许可卡
   （证号/有效窗/许可航线/SM3 摘要/SM9 签名/QR 装饰 + 航线缩略图 mini-map）。
   飞行前自查 pass/verify：安全红线——对存在的许可 code 恒 0，valid/reasons 是数据不是错误，
   valid=true 绿灯「可以起飞」/ valid=false 红灯 reasons 中文清单（永不走 errCard 分支）；
   仅 pass_id 不存在 → 6002 由 runOp 自动错误卡。
   端点：pass/list·query·verify、route/list（缩略图，裁决 16 式全量拉取+本地过滤）。
   裁决 4：Pass.route 是 JSON 字符串 → PORTAL.jp。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mxMini = null;   /* 许可卡航线缩略图：页面级生命周期，render 入口与重建前必先 destroy */

  function render(root, ctx) {
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    root.append(P.pageHead({
      title: '电子飞行许可',
      sub: '许可由管理当局签发 · 飞行前请务必完成自查 —— valid 绿灯方可起飞' }));

    var panel = h('div', { class: 'd-col' },
      h('div', { class: 'p-empty' }, '点击左侧台账行查看电子许可卡'));
    var slot = STORE.get('PASS');
    var fVerify = P.form([
      { name: 'pass_id', label: '许可号', type: 'text', required: true, value: slot ? slot.id : '',
        placeholder: 'PASS-2026-xxx（点台账行自动预填）' }
    ]);
    var rpV = P.resultPanel();
    var uavSlot = STORE.get('UAV');
    var tbl = P.dataTable({
      endpoint: '/api/pass/list', pageSize: 10,
      filters: [
        { name: 'status', label: '状态', type: 'select',
          options: ['GENERATING', 'VALID', 'USED', 'EXPIRED', 'REVOKED'] },
        { name: 'uav_id', label: '航空器 ID', type: 'text', value: (uavSlot && uavSlot.id) || '' },
        { name: 'mission_id', label: '任务号', type: 'text' }
      ],
      columns: [
        { title: '许可号', key: 'pass_id', mono: true },
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '有效窗', render: function (r) { return r.valid_from + ' → ' + r.valid_to; } },
        { title: '签发时间', key: 'created_at' }
      ],
      onRow: function (r) { showPass(r.pass_id, panel, fVerify); },
      emptyText: '暂无许可 —— 任务经管理当局审核签发后出现在此'
    });

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' }, tbl,
        card('飞行前自查 pass/verify（code 恒 0：valid/reasons 是数据不是错误）',
          h('p', { class: 'd-small d-muted' }, '校验有效窗、状态与航空器匹配。红灯清单逐条给出中文原因——这正是系统按设计保护飞行安全。'),
          fVerify.root,
          P.actionBar([{ label: '起飞前验证', kind: 'primary', run: P.runOp({
            path: '/api/pass/verify',
            body: function () { return PORTAL.need(fVerify.read(), 'pass_id'); },
            rp: rpV, successText: '自查完成（结论见下方卡片）',
            render: function (d) { return verifyView(d); },
            note: { kind: 'PASS', id: function (d) { return d.pass_id; } } }) }]),
          rpV.root)),
      panel));
  }

  /* 裁决 6：valid=false 仍是 code=0 成功响应 —— 红灯是数据渲染，不是错误卡 */
  function verifyView(d) {
    if (d.valid) {
      return h('div', { class: 'd-cert' },
        h('div', { class: 'd-cert-head' },
          h('span', { class: 'd-cert-title', style: { color: '#15803d' } }, '✓ 自查通过 · 可以起飞'),
          h('span', { class: 'd-cert-no' }, d.pass_id)),
        h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' },
          P.kv([['许可状态', P.badge(d.status)], ['结论', 'valid = true · 无拒绝原因']])),
          h('div', { class: 'd-seal' }, '可以起飞')));
    }
    return h('div', { class: 'd-cert' },
      h('div', { class: 'd-cert-head' },
        h('span', { class: 'd-cert-title', style: { color: '#b91c1c' } }, '⛔ 自查未通过 · 禁止起飞'),
        h('span', { class: 'd-cert-no' }, d.pass_id)),
      h('div', { class: 'd-cert-body' }, h('div', { class: 'd-cert-main' },
        P.kv([['许可状态', P.badge(d.status)], ['结论', 'valid = false']]),
        h('ul', { class: 'd-mt' }, (d.reasons || []).map(function (x) {
          return h('li', { style: { color: '#b91c1c' } }, x);
        })))));
  }

  /* 许可卡：pass/query 平铺 11 键（§13）；QR 为证面装饰；缩略图 route/list 全量拉取
     后按许可航线本地过滤（无逐段查询端点，裁决 16 同理）；坐标未设（0/缺失）不画不猜 */
  async function showPass(passId, panel, fVerify) {
    if (fVerify) fVerify.set('pass_id', passId);
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '⏳ pass/query 查询中…'));
    var r = await API.call('/api/pass/query', { pass_id: passId });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }    /* 6002 → EXPLAIN 解说 */
    var p = r.data;
    STORE.note('PASS', p.pass_id);                        /* §29：查询即记 chip */
    var ids = PORTAL.jp(p.route, []);
    var qrEl = h('div', { class: 'd-qr' });
    var mapEl = h('div', { class: 'd-map d-map-sm' });
    panel.append(
      h('div', { class: 'd-cert' },
        h('div', { class: 'd-cert-head' },
          h('span', { class: 'd-cert-title' }, '无人机电子飞行许可'),
          h('span', { class: 'd-cert-no' }, p.pass_id)),
        h('div', { class: 'd-cert-body' },
          h('div', { class: 'd-cert-main' }, P.kv([
            ['许可状态', P.badge(p.status)],
            ['任务号', h('code', { class: 'p-mono' }, p.mission_id)],
            ['航空器', h('code', { class: 'p-mono' }, p.uav_id || '—')],
            ['有效窗', p.valid_from + ' → ' + p.valid_to],
            ['许可航线', ids.join(' → ') || '—'],
            ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(p.sm3_hash, 48))],
            ['SM9 签名', h('code', { class: 'p-mono' }, UI.trunc(p.signature, 48))],
            ['签发 / 更新', p.created_at + ' → ' + p.updated_at]
          ])),
          qrEl),
        h('div', { class: 'd-seal' }, '管理当局签发')),
      mapEl,
      h('div', { class: 'd-map-hint' }, '许可航线缩略图（' + ids.length + ' 段高亮）——起飞前对照空域'));
    PORTAL.renderQR(qrEl, JSON.stringify({
      pass_id: p.pass_id, mission_id: p.mission_id, uav_id: p.uav_id, valid_to: p.valid_to }));

    mxMini = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    var rr = await API.call('/api/route/list', { page: 1, page_size: 200 });
    if (!rr.ok || !mxMini) return;
    var mine = (rr.data.records || []).filter(function (x) { return ids.indexOf(x.route_id) >= 0; });
    if (mine.length) {
      mxMini.drawZones(mine);
      mxMini.drawRoutes(mine, { active: ids });
      var pts = GEO.routePoints(mine);
      if (pts.length) mxMini.fitPoints(pts);
    } else {
      mxMini.setEmpty('许可航线无结构化坐标（遗留数据）——不猜测、不绘制');
    }
  }

  OP.license = { render: render };
})();
```

- [ ] **Step 3: operator.html 插入两行 script（Edit，锚点=Task 6 已插入的 aircraft.js 行）**

对 `frontend/operator.html` 做精确替换（old_string 在文件中唯一）：

old_string：
```
<script src="js/pages/op/aircraft.js"></script>
<script src="js/shell-op.js"></script>
```
new_string：
```
<script src="js/pages/op/aircraft.js"></script>
<script src="js/pages/op/flight.js"></script>
<script src="js/pages/op/license.js"></script>
<script src="js/shell-op.js"></script>
```

- [ ] **Step 4: 语法门 + 结构断言**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
node --check js/pages/op/flight.js && node --check js/pages/op/license.js && echo SYNTAX_OK
grep -c 'OP.flight = { render' js/pages/op/flight.js       # =1
grep -c 'OP.license = { render' js/pages/op/license.js     # =1
grep -c 'P.chipBar(' js/pages/op/flight.js js/pages/op/license.js   # 全 0（惯例 ③）
grep -c 'tk=' js/pages/op/flight.js js/pages/op/license.js          # 全 0（红线：key 不入源码）
grep -c "input\[data-mf=" js/pages/op/flight.js            # =1（勾选↔地图双向同步委托）
grep -c 'PORTAL.jp(' js/pages/op/flight.js                 # ≥4（route_segments/zones/suggestion）
grep -c 'datetimeLocal(60)' js/pages/op/flight.js          # =1
grep -c 'datetimeLocal(240)' js/pages/op/flight.js         # =1
grep -c '可以起飞' js/pages/op/license.js                   # ≥1（绿灯证面）
grep -c '禁止起飞' js/pages/op/license.js                   # ≥1（红灯证面）
grep -c 'PORTAL.jp(p.route' js/pages/op/license.js         # =1（裁决 4）
awk '/pages\/op\/aircraft.js/{a=NR} /pages\/op\/flight.js/{f=NR} /pages\/op\/license.js/{l=NR} /shell-op.js/{s=NR} END{ if (a<f && f<l && l<s) print "ORDER_OK"; else print "ORDER_BAD", a,f,l,s }' operator.html
```
预期：`SYNTAX_OK` + 各计数如注 + `ORDER_OK`。

- [ ] **Step 5: 静态 smoke（生产红线 #11：BACKEND 指向空地址，绝不打 :8080/:8090）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
PORT=18099 BACKEND=http://127.0.0.1:1 python3 ../scripts/serve-frontend.py & SRV=$!
sleep 1
for p in operator.html js/pages/op/flight.js js/pages/op/license.js; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:18099/$p"); echo "$p -> $code"
done
kill $SRV 2>/dev/null; wait $SRV 2>/dev/null; echo SMOKE_DONE
```
预期：三行全 `-> 200` + `SMOKE_DONE`。

- [ ] **Step 6: DEFERRED-HUMAN 清单（浏览器目检，Task 15 汇总）**

- operator.html#/flight：左地图航线按走廊状态着色（绿/琥珀/红），点击航线高亮并入勾选框，勾选框改动反向同步地图；创建任务 → 回执卡（航段/空域为解析后的中文列表而非 JSON 串）且 ②③ 表单任务号自动预填；冲突检测出卡 → 点「消解此冲突」预填；跨链提交 → 四段 TxID 全亮 + CROSS_TX chip。
- #/flight 我的任务：台账行点击 → 右侧详情 kv（脱敏值、SM9 身份、SM3 摘要）+ 提交/冲突检测按钮；重复提交非 DRAFT 任务 → 3004 错误卡带解说。
- #/license：台账行点击 → 右侧电子许可卡（QR 可见、证号、有效窗、航线缩略图 mini-map 高亮本许可航段）+ 自查表单 pass_id 预填；起飞前验证 → 绿灯证面「可以起飞」或红灯 reasons 清单（绝不出现错误卡样式）；不存在的许可号 → 6002 错误卡带解说。

- [ ] **Step 7: 提交**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/pages/op/flight.js frontend/js/pages/op/license.js frontend/operator.html
git commit -m "$(cat <<'MSG'
feat(frontend): 运营商端 II——飞行活动申请/电子飞行许可两页（计划 B Task 7）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

### Task 8: 运营商端 III —— ops / airspace

**Files:**
- Create: `frontend/js/pages/op/ops.js`、`frontend/js/pages/op/airspace.js`
- Modify: `frontend/operator.html`（Task 7 两行之后、shell 行之前插入 2 行）

**Interfaces:**
- Consumes: Task 6 公共惯例；`MAPX.create→mx{drone(uavId,lat,lon,headingDeg),removeDrone(id),clearDrones(),clear('zones'|'routes'|'nodes'),drawZones(routes),drawRoutes(routes,{active,onPick,opacity}),drawNodes(nodes),fitPoints(pts),setEmpty(text),destroy()}`；`GEO.{DEFAULT_VIEW,ZONES,ZONE_COLOR,ZONE_LABEL,NODE_STYLE{color,radius,label},telemetryCoord(t)→[lat,lon]|null,hasCoord(lat,lon),fmtCoordPair(lat,lon)→'30.50000, 114.30000'|'坐标未设'}`；契约档案 §17（Telemetry 13 键 `{telemetry_id,uav_id,session_id,mission_id,lat,lon,alt,speed,heading,seq,source,reported_at,created_at}`；latest 可按 uav_id 查、`{telemetry:null}` code 0 = 裁决 17）、§7（Route 12 键，lat/lon 0=未设）、§14（topology/get nodes 含 ATTACKER 类型）、§15（session/open `{session,auth{nonce,sm9_identity,signature,verified},path 真数组}`——源节点缺省 `<uav_id>-NODE` 须已注册否则 6002、4002=认证失败、4004=无可达路径；session/close 必填 `{session_id*,operator*}`+reason 可选 → Session **平铺** status CLOSED、重复关闭 4002；session/list 六态过滤裁决 22；Session 对象 8 键 `{session_id,uav_id,mission_id,pass_id,status,current_path:str,created_at,updated_at}`）、§16（message/list 标准容器+stats，排序 created_at DESC；Message 对象 13 键）；UAV 对象 11 键（§3）；`dataTable(...).reload(extra)` 合并过滤键重载（pui.js:364）；`resultPanel().show(r, renderFn)` 二参形态（pui.js:66）。
- Produces:
  - `window.OP_PAGES.ops = {render}`、`window.OP_PAGES.airspace = {render}`。
  - operator.html script 区新增（顺序）：`ops.js` → `airspace.js`（license.js 之后、shell-op.js 前）。运营商端 7 页至此齐备。
  - 运营端信息边界惯例（后续端别引用）：**ATTACKER 类型节点不在运营商端渲染**（攻击节点属监管域内部信息），topology/get 结果前端过滤 `n.node_type !== 'ATTACKER'`；home hero 地图同样**不画虫洞红虚线边**（drawWormholes 属管理端 netsec 全量视图专用）。spec §5.1 airspace 端点列的 node/list 因服务端无法排除 ATTACKER（过滤键仅等值）而**不用于运营端**——信息边界优先，偏差在此记录（node/list 由 Task 10 管理端 netsec 使用）。
  - **飞行报备惯例（Task 14 剧本依赖）**：ops 页 session/open=起飞报备（SM9 挑战认证回显 auth.verified/sm9_identity/nonce/signature + path 初始可信路径真数组）、session/close=降落报备（`operator:'Operator Portal'`、`reason:'降落报备'`）；**mission_id 关联是自动驾驶飞行前提**（telemetry_autopilot 对 MissionID 为空的会话跳过、不生成遥测）；报备成功 `note('SESSION', session_id, {uav_id, mission_id})` + 会话/消息台账 reload；台账 ACTIVE/DEGRADED/RECOVERED 行点击=接管为当前会话（降落报备可用）。

- [ ] **Step 1: 写 `frontend/js/pages/op/ops.js`（全文逐字）**

```js
/* ops.js — 运营商端·运行识别·飞行动态（计划 B Task 8，spec §5.1）
   UOM「运行识别」实时视图：起飞报备（session/open，SM9 挑战认证回显）→ 全屏地图 +
   遥测轮询（每 3s 对全部在册航空器 telemetry/latest），航空器图标按 lat/lon/heading 移动；
   右侧运行识别（RID）卡展示登记标志/运营企业/实名主体/最新遥测；
   会话状态卡 + 降落报备（session/close）+ 会话台账（session/list）+ 会话消息（message/list）。
   起飞报备关联 mission_id 后，后端自动驾驶沿任务航段走廊生成遥测（source=SIM）——
   地图无人机实时移动即由此驱动（spec §5.1 飞行动态闭环；未关联 mission 只建会话不飞，
   telemetry_autopilot.go:91-139：MissionID 为空即跳过）。
   裁决 17：{telemetry:null} 是 code=0 合法响应 =「暂无遥测」，绝不走错误分支；
   红线：坐标双零/缺失 = 未设，不画不猜（GEO.telemetryCoord 已守卫）。
   惯例 ⑤：轮询 = 模块级 timer + DOM 脱离自清理；ATTACKER 节点不在运营端展示。
   端点：session/open·list·close、telemetry/latest·list、message/list、uav/list、
   route/list（底图走廊）、topology/get（底图节点）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var POLL_MS = 3000;
  var mx = null, poll = null, busy = false;
  var uavs = [], latestCache = {}, lastSeen = {};
  var curS = null;   /* 当前飞行会话（起飞报备建立，或点台账在飞行接管）——降落报备前提 */

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    if (poll) { clearInterval(poll); poll = null; }
    uavs = []; latestCache = {}; lastSeen = {}; busy = false; curS = null;

    root.append(P.pageHead({
      title: '运行识别 · 飞行动态',
      sub: '实时遥测轮询（3s）· 运行识别 RID 信息卡 —— 数据源 telemetry/latest（null=暂无遥测，属正常）' }));

    var mapEl = h('div', { class: 'd-map d-map-xl' });
    var ridBox = h('div', { class: 'd-col' }, P.empty('选择航空器查看运行识别信息'));
    var trailBox = h('div', { class: 'd-col' }, P.empty('选择航空器查看最近遥测'));
    var flyingEl = h('span', { class: 'd-strong' }, '0');
    var selEl = h('select', { class: 'p-input', onchange: function () { onPick(selEl.value, ridBox, trailBox); } });
    var autoEl = h('input', { type: 'checkbox', checked: true,
      onchange: function () { setPoll(autoEl.checked); } });

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        h('div', { class: 'd-toolbar' },
          h('span', { class: 'd-small' }, '航空器'), selEl,
          h('label', { class: 'd-small' }, autoEl, ' 自动刷新(3s)'),
          h('button', { class: 'p-btn', onclick: function () { loadBase(); tick(); } }, '立即刷新'),
          h('span', { class: 'd-spacer' }),
          h('span', { class: 'd-small d-muted' }, '在飞：'), flyingEl, h('span', { class: 'd-small d-muted' }, ' 架')),
        mapEl,
        h('div', { class: 'd-map-hint' }, '✈️ 图标朝向 = 遥测 heading；底图 = 走廊/航段/网络节点（攻击节点属监管域，不在运营端展示）。无遥测或坐标未设的航空器不画——不猜测。')),
      h('div', { class: 'd-col' },
        card('运行识别（RID）', ridBox),
        card('最近遥测 telemetry/list', trailBox))));

    /* --- 飞行报备（spec §5.1：session/open=起飞报备、session/close=降落报备） --- */
    var slotU = STORE.get('UAV'), slotM = STORE.get('MISSION'),
        slotP = STORE.get('PASS'), slotS = STORE.get('SESSION');
    var sessBox = h('div', {}, P.empty('暂无进行中的会话 —— 先「起飞报备」，或点下方会话台账的在飞行接管'));
    var rpSo = P.resultPanel();
    var fSo = P.form([
      { name: 'uav_id', label: '航空器', type: 'text', required: true, value: slotU ? slotU.id : '',
        placeholder: 'UAV-MED-01（顶栏 UAV 上下文 chip 可预填）',
        hint: '源节点缺省 <uav_id>-NODE，须已注册（否则 6002）' },
      { name: 'mission_id', label: '关联任务（强烈建议）', type: 'text', value: slotM ? slotM.id : '',
        hint: '关联后自动驾驶沿任务航段走廊生成遥测（地图无人机移动）；留空只建会话不飞' },
      { name: 'pass_id', label: '关联许可（可选留档）', type: 'text', value: slotP ? slotP.id : '' },
      { name: 'source_node', label: '源节点（可选）', type: 'text', placeholder: '缺省 <uav_id>-NODE' },
      { name: 'target_node', label: '目标节点（可选）', type: 'text', placeholder: '缺省 MGR' }
    ]);
    var tblS = null, tblM = null;   /* runOp/onRow 点击时才解引用，前向声明安全 */
    var soCard = card('起飞报备 session/open（SM9 挑战认证；4002=认证失败、4004=无可达路径）',
      fSo.root,
      P.actionBar([{ label: '起飞报备 · 建立会话', kind: 'primary', run: P.runOp({
        path: '/api/session/open',
        body: function () {
          var v = PORTAL.need(fSo.read(), 'uav_id');
          if (!v) return null;
          var body = { uav_id: v.uav_id };
          if (v.mission_id) body.mission_id = v.mission_id;
          if (v.pass_id) body.pass_id = v.pass_id;
          if (v.source_node) body.source_node = v.source_node;
          if (v.target_node) body.target_node = v.target_node;
          return body;
        },
        rp: rpSo, successText: '起飞报备完成（INIT→AUTHENTICATED→ACTIVE · SM9 挑战认证通过）',
        render: function (d) {
          return h('div', {},
            P.kv([
              ['会话号', h('code', { class: 'p-mono' }, d.session.session_id)],
              ['会话状态', P.badge(d.session.status)],
              ['航空器', d.session.uav_id],
              ['关联任务 / 许可', (d.session.mission_id || '—') + ' / ' + (d.session.pass_id || '—')],
              ['SM9 认证', d.auth.verified ? '✓ 挑战-应答通过' : '✗ 未通过'],
              ['SM9 身份', h('code', { class: 'p-mono' }, d.auth.sm9_identity)],
              ['Nonce', h('code', { class: 'p-mono' }, UI.trunc(d.auth.nonce, 40))],
              ['签名', h('code', { class: 'p-mono' }, UI.trunc(d.auth.signature, 40))],
              ['初始可信路径', (d.path || []).join(' → ')]
            ]),
            h('p', { class: 'd-small d-muted' }, '已关联任务时，自动驾驶随即沿航段走廊生成遥测——观察上方地图 ✈️ 图标实时移动（3s 轮询）。'));
        },
        note: { kind: 'SESSION', id: function (d) { return d.session.session_id; },
          extra: function (d) { return { uav_id: d.session.uav_id, mission_id: d.session.mission_id }; } },
        onOk: function (d) {
          setCur(d.session);
          if (tblS) tblS.reload();
          if (tblM) tblM.reload({ session_id: d.session.session_id });
          tick();
        }
      }) }]),
      rpSo.root);

    var rpCl = P.resultPanel();
    var closeBtn = h('button', { class: 'p-btn p-btn-danger', onclick: doClose }, '降落报备 · 关闭会话');
    async function doClose() {
      if (!curS) { UI.toast('暂无进行中的会话 —— 先起飞报备', 'err'); return; }
      var ok = await P.confirm('降落报备',
        '关闭后自动驾驶停止生成遥测，地图图标停在降落位置；对该会话 message/send → 4002（设计内拒绝）。会话号：' + curS.session_id,
        '确认降落');
      if (!ok) return;
      var r = await API.call('/api/session/close',
        { session_id: curS.session_id, operator: 'Operator Portal', reason: '降落报备' });
      rpCl.show(r, function (d) {                          /* close 响应 = Session 平铺（§15） */
        return P.kv([
          ['会话号', h('code', { class: 'p-mono' }, d.session_id)],
          ['会话状态', P.badge(d.status)],
          ['航空器', d.uav_id || '—'],
          ['降落报备方', 'Operator Portal'],
          ['更新时间', d.updated_at || '—']
        ]);
      });
      if (r.ok) {
        STORE.note('SESSION', r.data.session_id);
        UI.toast('降落报备完成（status=' + r.data.status + '）');
        setCur(null);
        if (tblS) tblS.reload();
        tick();
      }
    }

    function setCur(s) {
      curS = s;
      sessBox.innerHTML = '';
      if (!s) {
        sessBox.append(P.empty('暂无进行中的会话 —— 先「起飞报备」，或点会话台账的在飞行接管'));
        return;
      }
      sessBox.append(P.kv([
        ['会话号', h('code', { class: 'p-mono' }, s.session_id)],
        ['会话状态', P.badge(s.status)],
        ['航空器', s.uav_id || '—'],
        ['关联任务', s.mission_id || '—'],
        ['当前路径', PORTAL.jp(s.current_path, []).join(' → ') || '—'],
        ['建立时间', s.created_at || '—']
      ]));
    }

    root.append(h('div', { class: 'd-grid-2 d-mt2' },
      soCard,
      card('会话状态 · 降落报备 session/close', sessBox,
        h('div', { class: 'd-mt' }, closeBtn,
          h('span', { class: 'd-small d-muted', style: { 'margin-left': '8px' } },
            '关闭后自动驾驶停止生成遥测；重复关闭 → 4002（设计内）')),
        rpCl.root)));

    tblS = P.dataTable({
      endpoint: '/api/session/list', pageSize: 5,
      filters: [{ name: 'status', label: '状态', type: 'select',
        options: ['INIT', 'AUTHENTICATED', 'ACTIVE', 'DEGRADED', 'RECOVERED', 'CLOSED'] }],
      columns: [
        { title: '会话号', render: function (r) { return UI.trunc(r.session_id, 20); }, mono: true },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '关联任务', render: function (r) { return r.mission_id || '—'; } },
        { title: '建立时间', key: 'created_at' }
      ],
      onRow: function (r) {
        if (tblM) tblM.reload({ session_id: r.session_id });
        if (r.status === 'ACTIVE' || r.status === 'DEGRADED' || r.status === 'RECOVERED') {
          setCur(r);   /* 接管为当前会话 → 降落报备可用 */
          UI.toast('会话 ' + UI.trunc(r.session_id, 20) + ' 已接管为当前会话（可降落报备）');
        } else {
          UI.toast('会话号已过滤到会话消息台账');
        }
      },
      emptyText: '暂无会话（起飞报备后出现）'
    });
    tblM = P.dataTable({
      endpoint: '/api/message/list', pageSize: 5,
      filters: [
        { name: 'session_id', label: '会话号', type: 'text', placeholder: 'SESS-…（点会话台账行自动过滤）' },
        { name: 'msg_type', label: '类型', type: 'select',
          options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT'] }
      ],
      columns: [
        { title: '消息号', render: function (r) { return UI.trunc(r.message_id, 18); }, mono: true },
        { title: '类型', render: function (r) { return P.badge(r.msg_type); } },
        { title: '路由', render: function (r) { return r.source_node + ' → ' + r.target_node; }, mono: true },
        { title: '序号', key: 'seq', num: true },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '时间', key: 'created_at' }
      ],
      emptyText: '暂无消息（会话心跳/位置报会出现在这里）'
    });
    root.append(h('div', { class: 'd-grid-2 d-mt2' },
      card('会话台账 session/list（六态全列；点在飞行接管为当前会话）', tblS),
      card('会话消息 message/list（心跳/位置报流水）', tblM)));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    loadBase().then(tick);
    setPoll(true);

    function setPoll(on) {
      if (poll) { clearInterval(poll); poll = null; }
      if (on) poll = setInterval(tick, POLL_MS);
    }

    /* 惯例 ⑤：页面被路由销毁后 timer 自清理 */
    async function tick() {
      if (!document.body.contains(mapEl)) { if (poll) { clearInterval(poll); poll = null; } return; }
      if (busy || !uavs.length) return;
      busy = true;
      try {
        var res = await Promise.all(uavs.map(function (u) {
          return API.call('/api/telemetry/latest', { uav_id: u.uav_id });
        }));
        var seen = {};
        res.forEach(function (r, i) {
          var u = uavs[i];
          if (!r.ok || !r.data || !r.data.telemetry) return;   /* 裁决 17：null = 暂无遥测，正常 */
          var t = r.data.telemetry;
          latestCache[u.uav_id] = t;
          var c = GEO.telemetryCoord(t);
          if (!c) return;                                       /* 红线：坐标未设不画 */
          seen[u.uav_id] = true;
          if (mx) mx.drone(u.uav_id, c[0], c[1], t.heading);
        });
        Object.keys(lastSeen).forEach(function (id) {
          if (!seen[id] && mx) mx.removeDrone(id);              /* demo/reset 后图标同步清除 */
        });
        lastSeen = seen;
        flyingEl.textContent = String(Object.keys(seen).length);
        if (selEl.value && selEl.value in latestCache) onPick(selEl.value, ridBox, trailBox);
      } finally { busy = false; }
    }

    async function loadBase() {
      var rr = await API.call('/api/route/list', { page: 1, page_size: 200 });
      if (rr.ok && mx) {
        mx.clear('zones'); mx.clear('routes');
        mx.drawZones(rr.data.records || []);
        mx.drawRoutes(rr.data.records || []);
      }
      var tr = await API.call('/api/topology/get', {});
      if (tr.ok && mx) {
        mx.clear('nodes');
        mx.drawNodes((tr.data.nodes || []).filter(function (n) { return n.node_type !== 'ATTACKER'; }));
      }
      var ur = await API.call('/api/uav/list', { page: 1, page_size: 200 });
      if (!ur.ok) { UI.toast('航空器列表加载失败 code=' + ur.code, 'err'); return; }
      uavs = (ur.data.records || []).filter(function (u) { return u.status !== 'REVOKED'; });
      var keep = selEl.value;
      selEl.innerHTML = '';
      selEl.append(h('option', { value: '' }, '全部航空器（总览）'));
      uavs.forEach(function (u) {
        selEl.append(h('option', { value: u.uav_id },
          u.uav_id + ' · ' + (u.registration_mark || '未发放登记标志')));
      });
      if (keep && uavs.some(function (u) { return u.uav_id === keep; })) selEl.value = keep;
    }
  }

  /* RID 卡 + 最近遥测：选中变化与每轮轮询后刷新 */
  function onPick(uavId, ridBox, trailBox) {
    if (!uavId) {
      ridBox.innerHTML = ''; ridBox.append(P.empty('选择航空器查看运行识别信息'));
      trailBox.innerHTML = ''; trailBox.append(P.empty('选择航空器查看最近遥测'));
      return;
    }
    var u = null;
    for (var i = 0; i < uavs.length; i++) if (uavs[i].uav_id === uavId) { u = uavs[i]; break; }
    var t = latestCache[uavId] || null;
    ridBox.innerHTML = '';
    if (!u) { ridBox.append(P.empty('未找到航空器 ' + uavId)); return; }
    ridBox.append(P.kv([
      ['航空器', h('code', { class: 'p-mono' }, u.uav_id)],
      ['登记标志', h('code', { class: 'p-mono' }, u.registration_mark || '未发放登记标志')],
      ['型号 / 序列号', (u.model || '—') + ' / ' + (u.serial_no || '—')],
      ['运营企业', u.operator_id],
      ['实名主体', u.realname_id ? h('code', { class: 'p-mono' }, u.realname_id) : '未关联'],
      ['航空器状态', P.badge(u.status)],
      ['SM9 身份', h('code', { class: 'p-mono' }, UI.trunc(u.sm9_identity, 32))]
    ]));
    if (t) {
      ridBox.append(h('div', { class: 'd-section' }, '最新遥测'), P.kv([
        ['位置', GEO.fmtCoordPair(t.lat, t.lon)],
        ['高度 / 速度', t.alt + ' m / ' + t.speed + ' m/s'],
        ['航向', t.heading + '°'],
        ['序号 / 来源', 'seq ' + t.seq + ' · ' + t.source],
        ['会话', t.session_id ? h('code', { class: 'p-mono' }, UI.trunc(t.session_id, 24)) : '—'],
        ['上报时间', t.reported_at]
      ]));
    } else {
      ridBox.append(h('div', { class: 'd-section' }, '最新遥测'),
        P.empty('暂无遥测（telemetry:null，code=0 合法数据形态）'));
    }
    loadTrail(uavId, trailBox);
  }

  async function loadTrail(uavId, box) {
    var r = await API.call('/api/telemetry/list', { uav_id: uavId, page: 1, page_size: 8 });
    if (!box.isConnected) return;
    box.innerHTML = '';
    if (!r.ok) { box.append(P.errCard(r)); return; }
    var recs = r.data.records || [];
    if (!recs.length) { box.append(P.empty('该航空器尚无遥测记录')); return; }
    recs.forEach(function (t) {
      box.append(h('div', { class: 'd-row d-small' },
        h('span', { class: 'd-num' }, '#' + t.seq),
        h('span', { class: 'p-mono' }, GEO.fmtCoordPair(t.lat, t.lon)),
        h('span', {}, t.alt + 'm · ' + t.speed + 'm/s · ' + t.heading + '°'),
        h('span', { class: 'd-muted' }, t.reported_at)));
    });
  }

  OP.ops = { render: render };
})();
```

- [ ] **Step 2: 写 `frontend/js/pages/op/airspace.js`（全文逐字）**

```js
/* airspace.js — 运营商端·空域查询（计划 B Task 8，spec §5.1）
   走廊/航段/网络节点一张图：route/list（zone、corridor_status 服务端过滤）+ topology/get 节点叠加
   （ATTACKER 攻击节点属监管域，不在运营端展示）+「网络节点图层开关」复选框（spec §5.1）；
   地图点航线或右列列表项 → 航段详情卡 + 高亮。
   红线：lat/lon 0 = 未设 → fmtCoordPair 显示「坐标未设」，GEO 守卫不画不猜；
   zone 多边形宽度为示意值（GEO.zonePolygon widthDeg），非真实空域边界。
   端点：route/list、topology/get。spec §5.1 端点列还列了 node/list，但其过滤键仅
   node_type/status 等值、无法服务端排除 ATTACKER——运营端用它会把攻击节点泄进台账
   （违反信息边界），故节点数据源一律 topology/get 前端过滤（node/list 由管理端
   netsec 使用，Task 10 已用；偏差已在 Task 8 Produces 记录）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var OP = window.OP_PAGES = window.OP_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    var routes = [];

    root.append(P.pageHead({
      title: '空域查询',
      sub: '走廊状态 · 航段详情 · 网络节点一张图 —— 数据源 route/list + topology/get' }));
    var nodesOn = true;   /* 网络节点图层开关（spec §5.1） */
    var legend = legendBar();
    var nodesChk = h('input', { type: 'checkbox', checked: true,
      onchange: function () { nodesOn = nodesChk.checked; loadNodes(); } });
    legend.append(h('span', { class: 'd-idchip' },
      h('label', { class: 'd-small' }, nodesChk, ' 网络节点图层')));
    root.append(legend);

    var mapEl = h('div', { class: 'd-map d-map-xl' });
    var detail = h('div', { class: 'd-col' }, P.empty('点击地图航线或右侧列表项查看航段详情'));
    var listBox = h('div', { class: 'd-col' }, P.empty('尚未查询'));
    var countEl = h('span', { class: 'd-strong' }, '—');
    var f = P.form([
      { name: 'zone', label: '空域分区', type: 'text', placeholder: 'Zone-A / Zone-B（留空=全部）' },
      { name: 'corridor_status', label: '走廊状态', type: 'select',
        options: [['', '全部'], ['OPEN', 'OPEN · 开放走廊'], ['RESTRICTED', 'RESTRICTED · 限制走廊'], ['CLOSED', 'CLOSED · 关闭走廊']] }
    ]);

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' }, mapEl,
        h('div', { class: 'd-map-hint' }, '🗺️ 点击航线查看详情并高亮。走廊着色：绿=开放 OPEN · 琥珀=限制 RESTRICTED · 红=关闭 CLOSED。')),
      h('div', { class: 'd-col' },
        card('查询条件 route/list（服务端过滤）', f.root,
          P.actionBar([
            { label: '查询空域', kind: 'primary', run: doQuery },
            { label: '重置', run: function () { f.set('zone', ''); f.set('corridor_status', ''); doQuery(); } }]),
          h('div', { class: 'd-small d-muted d-mt' }, '命中航段：', countEl)),
        card('航段列表', listBox),
        card('航段详情', detail))));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    loadNodes();
    doQuery();

    async function doQuery() {
      var b = f.read();
      var body = { page: 1, page_size: 200 };
      if (b.zone) body.zone = b.zone;
      if (b.corridor_status) body.corridor_status = b.corridor_status;
      listBox.innerHTML = '';
      listBox.append(h('div', { class: 'p-empty' }, '⏳ route/list 查询中…'));
      var r = await API.call('/api/route/list', body);
      if (!listBox.isConnected) return;
      listBox.innerHTML = '';
      if (!r.ok) { listBox.append(P.errCard(r)); return; }
      routes = r.data.records || [];
      countEl.textContent = String(r.data.total || routes.length);
      redraw('');
      detail.innerHTML = '';
      detail.append(P.empty('点击地图航线或右侧列表项查看航段详情'));
      if (!routes.length) listBox.append(P.empty('无命中航段 —— 调整查询条件'));
      routes.forEach(function (rt) {
        listBox.append(h('div', { class: 'p-card', style: { cursor: 'pointer' },
          onclick: function () { showDetail(rt.route_id); } },
          h('div', { class: 'd-row' },
            h('code', { class: 'p-mono d-strong' }, rt.route_id),
            P.badge(rt.corridor_status),
            h('span', { class: 'd-small d-muted' }, rt.zone)),
          h('div', { class: 'd-small d-muted' }, rt.start_point + ' → ' + rt.end_point)));
      });
    }

    function redraw(activeId) {
      if (!mx) return;
      mx.clear('zones'); mx.clear('routes');
      mx.drawZones(routes);
      mx.drawRoutes(routes, {
        active: activeId ? [activeId] : [],
        opacity: 0.9,
        onPick: function (rt) { showDetail(rt.route_id); }
      });
    }

    function showDetail(rid) {
      var rt = null;
      for (var i = 0; i < routes.length; i++) if (routes[i].route_id === rid) { rt = routes[i]; break; }
      if (!rt) return;
      redraw(rid);
      detail.innerHTML = '';
      detail.append(P.kv([
        ['航段号', h('code', { class: 'p-mono' }, rt.route_id)],
        ['空域分区', rt.zone],
        ['走廊状态', h('span', {}, P.badge(rt.corridor_status),
          ' ' + (GEO.ZONE_LABEL[rt.corridor_status] || ''))],
        ['起止点', rt.start_point + ' → ' + rt.end_point],
        ['起点坐标', GEO.fmtCoordPair(rt.start_lat, rt.start_lon)],
        ['终点坐标', GEO.fmtCoordPair(rt.end_lat, rt.end_lon)],
        ['高度带', (rt.altitude_min || rt.altitude_max) ? rt.altitude_min + '–' + rt.altitude_max + ' m' : '未设'],
        ['登记时间', rt.created_at]
      ]));
    }

    async function loadNodes() {
      if (!nodesOn) { if (mx) mx.clear('nodes'); return; }   /* 图层开关关闭：只清节点层，走廊/航线不动 */
      var r = await API.call('/api/topology/get', {});
      if (!r.ok || !mx) return;
      mx.clear('nodes');
      mx.drawNodes((r.data.nodes || []).filter(function (n) { return n.node_type !== 'ATTACKER'; }));
    }
  }

  /* 图例条：走廊三色 + 运营端可见的三类节点（ATTACKER 不展示） */
  function legendBar() {
    function swatch(color) {
      return h('i', { style: { display: 'inline-block', width: '10px', height: '10px',
        'border-radius': '2px', background: color, 'margin-right': '4px' } });
    }
    var chips = GEO.ZONES.map(function (z) {
      return h('span', { class: 'd-idchip' }, swatch(GEO.ZONE_COLOR[z]), z + ' · ' + GEO.ZONE_LABEL[z]);
    });
    ['MANAGEMENT', 'EDGE', 'UAV'].forEach(function (t) {
      var s = GEO.NODE_STYLE[t];
      chips.push(h('span', { class: 'd-idchip' }, swatch(s.color), s.label));
    });
    return h('div', { class: 'd-row-wrap d-mb' }, chips);
  }

  OP.airspace = { render: render };
})();
```

- [ ] **Step 3: operator.html 插入两行 script（Edit，锚点=Task 7 已插入的 license.js 行）**

对 `frontend/operator.html` 做精确替换（old_string 在文件中唯一）：

old_string：
```
<script src="js/pages/op/license.js"></script>
<script src="js/shell-op.js"></script>
```
new_string：
```
<script src="js/pages/op/license.js"></script>
<script src="js/pages/op/ops.js"></script>
<script src="js/pages/op/airspace.js"></script>
<script src="js/shell-op.js"></script>
```

- [ ] **Step 4: 语法门 + 结构断言**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
node --check js/pages/op/ops.js && node --check js/pages/op/airspace.js && echo SYNTAX_OK
grep -c 'OP.ops = { render' js/pages/op/ops.js             # =1
grep -c 'OP.airspace = { render' js/pages/op/airspace.js   # =1
grep -c 'P.chipBar(' js/pages/op/ops.js js/pages/op/airspace.js      # 全 0（惯例 ③）
grep -c 'tk=' js/pages/op/ops.js js/pages/op/airspace.js             # 全 0（红线：key 不入源码）
grep -c "node_type !== 'ATTACKER'" js/pages/op/ops.js js/pages/op/airspace.js   # 各 =1（运营端信息边界）
grep -c 'document.body.contains(mapEl)' js/pages/op/ops.js           # =1（惯例 ⑤ 轮询自清理）
grep -c 'telemetry:null' js/pages/op/ops.js                          # ≥1（裁决 17 注释留痕）

# 飞行报备闭环（spec §5.1：session/open=起飞报备、session/close=降落报备）+ 图层开关
grep -c "'/api/session/open'" js/pages/op/ops.js            # =1
grep -c "'/api/session/close'" js/pages/op/ops.js           # =1
grep -c "'/api/session/list'" js/pages/op/ops.js            # =1
grep -c "'/api/message/list'" js/pages/op/ops.js            # =1
grep -c '起飞报备' js/pages/op/ops.js                        # ≥3（卡题+按钮+成功文案）
grep -c '降落报备' js/pages/op/ops.js                        # ≥3（按钮+确认框+回执）
grep -c "operator: 'Operator Portal'" js/pages/op/ops.js    # =1（降落报备操作方）
grep -c "kind: 'SESSION'" js/pages/op/ops.js                # =1（§29 note 惯例）
grep -c '网络节点图层' js/pages/op/airspace.js               # ≥1（spec §5.1 图层开关）
grep -c 'nodesOn' js/pages/op/airspace.js                   # ≥3（开关状态变量）
grep -c 'drawWormholes' js/pages/op/ops.js js/pages/op/airspace.js   # 全 0（虫洞边属管理端）
awk '/pages\/op\/license.js/{l=NR} /pages\/op\/ops.js/{o=NR} /pages\/op\/airspace.js/{a=NR} /shell-op.js/{s=NR} END{ if (l<o && o<a && a<s) print "ORDER_OK"; else print "ORDER_BAD", l,o,a,s }' operator.html
```
预期：`SYNTAX_OK` + 各计数如注 + `ORDER_OK`。

- [ ] **Step 5: 静态 smoke（生产红线 #11：BACKEND 指向空地址，绝不打 :8080/:8090）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
PORT=18099 BACKEND=http://127.0.0.1:1 python3 ../scripts/serve-frontend.py & SRV=$!
sleep 1
for p in operator.html js/pages/op/ops.js js/pages/op/airspace.js; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:18099/$p"); echo "$p -> $code"
done
kill $SRV 2>/dev/null; wait $SRV 2>/dev/null; echo SMOKE_DONE
```
预期：三行全 `-> 200` + `SMOKE_DONE`。

- [ ] **Step 6: DEFERRED-HUMAN 清单（浏览器目检，Task 15 汇总）**

- operator.html#/ops：底图走廊/节点出现且**无红色攻击节点**；「立即刷新」后在飞计数 ≥0 且不报错（无遥测时空图标区正常）；SIM 自动驾驶开启时（后端 OFFCHAIN_AUTOPILOT 生效）无人机图标随轮询移动、朝向随 heading；选择某航空器 → RID 卡（登记标志/实名主体/SM9）+ 最新遥测 + 最近 8 条轨迹列表；无遥测 → 「暂无遥测…」空态而非错误卡；切走页面 3s 后网络面板无继续轮询（惯例 ⑤）。
- #/ops 报备闭环：UAV chip 预填 uav_id、MISSION/PASS chip 预填关联键 → 起飞报备 → SM9 认证 ✓ 回显（SM9 身份/Nonce/签名）+ 初始可信路径 + SESSION chip + 会话状态卡显示；关联 mission_id 且自动驾驶生效 → 数秒后地图 ✈️ 沿航段移动、「在飞」计数 ≥1、RID 卡最新遥测 seq/source=SIM 递增、会话消息台账现心跳/位置报流水；降落报备 → 确认框 → CLOSED 回执 + 会话状态卡回空态 + 台账刷新 + 图标停住；点会话台账在飞行 → toast 接管、降落报备重新可用；无当前会话直接点降落报备 → toast 拦截不发请求。
- #/airspace：图例条三色走廊 + 三类节点；「网络节点图层」开关：关 → 节点圆点消失、走廊/航线不动，开 → 恢复（ATTACKER 全程不出现）；查询 zone=Zone-A → 列表与地图只剩 R101/R205；走廊状态过滤生效；点地图航线 → 高亮 + 详情卡（坐标 6 位小数、高度带、0=未设显示「坐标未设」）；重置恢复全量。

- [ ] **Step 7: 提交**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/pages/op/ops.js frontend/js/pages/op/airspace.js frontend/operator.html
git commit -m "$(cat <<'MSG'
feat(frontend): 运营商端 III——运行识别·飞行动态/空域查询两页，运营端 7 页齐（计划 B Task 8）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

### Task 9: 管理当局端 I —— queue / passes / records

**Files:**
- Create: `frontend/js/pages/au/queue.js`、`frontend/js/pages/au/passes.js`、`frontend/js/pages/au/records.js`
- Modify: `frontend/authority.html`（Task 5 预留锚点注释与 shell-au.js 行之间插入 3 行）

**Interfaces:**
- Consumes: Task 6 公共惯例（`AU` 替代 `OP`：`var AU = window.AU_PAGES = window.AU_PAGES || {};` + 末尾 `AU.<name> = { render: render };`，页面契约 `render(root, ctx)` 同 op 端）；`P.dataTable` 全 opts（wb-manager 已验证形态：`{endpoint, baseBody, pageSize, filters, columns, onRow, onLoaded(recs), emptyText}` → 返回对象含 `.reload()` 与 `.querySelector`）；`PORTAL.{jp,need}`；`MAPX/GEO`（queue 是 shell-au mapPages 之一）；契约档案 §11（review/submit `{review,mission,crosschain}` 包裹、review/query **{records,total} 无分页回显**、rules_hit 响应侧 JSON 字符串、3003/6002）、§13（pass/issue `{pass,crosschain}`、幂等 GENERATING 重试、3002；revoke `{pass,crosschain_status,crosschain}` 本地先行；verify code 恒 0）、§10（mission 对象）、§26（crosschain/list 过滤仅 status/message_type，**无 business_id 过滤**；message_type 枚举 `UAV_REGISTER_PROOF|MISSION_APPLICATION|MISSION_REVIEW_RESULT|FLIGHT_PASS|PASS_REVOKE`）；§29 note 惯例（review/submit→CROSS_TX；pass/issue→PASS+CROSS_TX；pass/revoke→PASS；mission/query→MISSION）。
- Produces:
  - `window.AU_PAGES.queue = {render}`、`AU_PAGES.passes = {render}`、`AU_PAGES.records = {render}`。
  - authority.html script 区新增（顺序）：`queue.js` → `passes.js` → `records.js`（锚点注释后、shell-au.js 前）。
  - **队列发现机制惯例**（Task 10-12 复用）：申请号 = crosschain/list（MISSION_APPLICATION·SUCCESS）行的 `business_id`；无 application/query 端点，mission→application 无直接连接，审核动作永远从跨链台账行发起。
  - 管理端表单默认值惯例：`reviewer:'Manager-A'`、`issuer:'FISCO-ADMIN'`、吊销 `operator:'FISCO-ADMIN'`（旧 wb-manager 同款，剧本 Task 14 引用）。

- [ ] **Step 1: 写 `frontend/js/pages/au/queue.js`（全文逐字）**

```js
/* queue.js — 管理当局端·审核队列（计划 B Task 9，spec §5.2）
   队列发现机制：跨链台账 crosschain/list（message_type=MISSION_APPLICATION, status=SUCCESS）的
   business_id 即申请号——以链上台账为准，不依赖本地缓存；逐行 review/query 标注已审/待审。
   右侧审核工作台：面板 A 行点击 → 申请存证 + 审核历史 + 裁决表单（review/submit 跨链回传源链）；
   面板 B 行点击 → 任务详情 + 航线 mini-map（管理方只见脱敏值 masked_value，明文永不出运营商域）。
   裁决 3：rules_hit/route_segments/zones 响应侧 JSON 字符串 → PORTAL.jp。
   端点：crosschain/list·query、mission/list·query、review/query·submit、route/list（mini-map）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mxMini = null;   /* 任务详情航线缩略图：页面级生命周期，render 入口与重建前必先 destroy */

  function render(root, ctx) {
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    root.append(P.pageHead({
      title: '审核队列',
      sub: '队列以跨链台账为准（MISSION_APPLICATION·SUCCESS 的 business_id 即申请号）· 裁决跨链回传源链' }));

    var panel = h('div', { class: 'd-col' },
      P.empty('点击左侧台账行进入审核工作台'));
    var tblA = null, tblB = null;
    function reloadAll() { if (tblA) tblA.reload(); if (tblB) tblB.reload(); }

    /* --- 面板 A：跨链申请台账（审核入口） --- */
    tblA = P.dataTable({
      endpoint: '/api/crosschain/list', pageSize: 10,
      baseBody: { message_type: 'MISSION_APPLICATION', status: 'SUCCESS' },
      columns: [
        { title: '申请号（business_id）', render: function (r) { return UI.trunc(r.business_id, 24); }, mono: true },
        { title: 'cross_tx_id', render: function (r) { return UI.trunc(r.cross_tx_id, 18); }, mono: true },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '申请时间', key: 'created_at' },
        { title: '审核状态', render: function (r) { return h('span', { 'data-rv': r.business_id }, '⏳'); } },
        { title: '操作', render: function (r) {
          return h('span', { class: 'd-row' },
            h('button', { class: 'p-btn p-btn-sm p-btn-primary',
              onClick: function (e) { e.stopPropagation(); openApplication(r.business_id, r.cross_tx_id, panel, reloadAll); } }, '工作台'),
            h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
              onClick: function (e) { e.stopPropagation(); P.openCxDetail(r.cross_tx_id); } }, '存证'));
        } }
      ],
      onLoaded: function (recs) {
        recs.forEach(function (rec) {
          API.call('/api/review/query', { application_id: rec.business_id }).then(function (r) {
            var el = tblA.querySelector('[data-rv="' + CSS.escape(rec.business_id) + '"]');
            if (!el) return;
            el.innerHTML = '';
            el.append(r.ok && r.data.total > 0 ? P.badge('REVIEWED') : P.badge('PENDING'));
            if (r.ok && r.data.total > 0) el.title = '已审 ' + r.data.total + ' 次';
          });
        });
      },
      onRow: function (r) { openApplication(r.business_id, r.cross_tx_id, panel, reloadAll); },
      emptyText: '暂无跨链申请（运营商提交任务后自动出现）'
    });

    /* --- 面板 B：待审任务详情面板（mission/list SUBMITTED） --- */
    tblB = P.dataTable({
      endpoint: '/api/mission/list', pageSize: 10,
      baseBody: { status: 'SUBMITTED' },
      columns: [
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '运营商', key: 'operator_id' },
        { title: '无人机', key: 'uav_id', mono: true },
        { title: '描述（脱敏）', render: function (r) { return r.masked_value || '—'; } },
        { title: '时窗', render: function (r) { return UI.trunc(r.start_time, 16) + ' → ' + UI.trunc(r.end_time, 16); } },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); openMission(r.mission_id, panel); } }, '详情');
        } }
      ],
      onRow: function (r) { openMission(r.mission_id, panel); },
      emptyText: '暂无待审任务'
    });

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        card('跨链申请台账（MISSION_APPLICATION · SUCCESS）', tblA),
        card('待审任务面板（mission/list · SUBMITTED；管理方只见脱敏值）', tblB)),
      h('div', { class: 'd-col' }, card('审核工作台', panel))));
  }

  /* ============ 申请工作台：存证 + 审核历史 + 裁决（review/submit） ============ */
  async function openApplication(appId, cxId, panel, reloadAll) {
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '⏳ 加载申请存证与审核历史…'));
    var cxR = cxId ? await API.call('/api/crosschain/query', { cross_tx_id: cxId }) : null;
    var hR = await API.call('/api/review/query', { application_id: appId });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    STORE.note('APPLICATION', appId);                  /* §29：进入工作台即记 chip */

    panel.append(P.kv([['申请号', h('code', { class: 'p-mono' }, appId)]]));
    if (cxR && cxR.ok) {
      panel.append(h('div', { class: 'd-section' }, '跨链存证（fabric → chainmaker → fisco-bcos）'),
        P.cxTrail(cxR.data));
    }
    var histWrap = h('div', {}, histBox(hR));
    panel.append(h('div', { class: 'd-section' }, '审核历史 review/query'), histWrap);

    /* 裁决表单 */
    var rp = P.resultPanel();
    var f = P.form([
      { name: 'result', label: '裁决', type: 'select', value: 'APPROVED',
        options: ['APPROVED', 'REJECTED', 'NEED_COORDINATION'] },
      { name: 'reviewer', label: '审核员', type: 'text', required: true, value: 'Manager-A' },
      { name: 'rules_hit', label: '命中规则（逗号分隔，可留空）', type: 'text',
        placeholder: '如 R-ALT-001,TIME_WINDOW' },
      { name: 'comment', label: '审核意见', type: 'textarea', rows: 2 }
    ]);
    panel.append(h('div', { class: 'd-section' }, '裁决 review/submit（MISSION_REVIEW_RESULT 跨链回传源链）'),
      f.root,
      P.actionBar([{ label: '提交裁决', kind: 'primary',
        confirm: { title: '提交裁决', msg: '裁决将跨链回传源链并推进任务状态机（APPROVED→APPROVED / REJECTED→REJECTED / NEED_COORDINATION→COORDINATING）。审核规则拒绝 → 3003 设计内。', ok: '提交' },
        run: P.runOp({
          path: '/api/review/submit',
          body: function () {
            var v = PORTAL.need(f.read(), 'result', 'reviewer');
            if (!v) return null;
            return {
              application_id: appId,
              result: v.result, reviewer: v.reviewer,
              comment: v.comment || '',
              rules_hit: v.rules_hit
                ? String(v.rules_hit).split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean) : []
            };
          },
          rp: rp, successText: '裁决已提交并跨链回传',
          render: function (x) {
            return h('div', {},
              P.kv([
                ['审核号', h('code', { class: 'p-mono' }, UI.trunc(x.review.review_id, 32))],
                ['裁决', P.badge(x.review.result)],
                ['任务号', x.mission.mission_id],
                ['任务新状态', P.badge(x.mission.status)],
                ['任务描述（管理方视角）', x.mission.masked_value || '—']
              ]),
              P.cxTrail(x.crosschain));
          },
          onOk: function (x) {
            STORE.note('CROSS_TX', x.crosschain.cross_tx_id, { business_id: appId });
            reloadAll();
            /* 就地刷新历史区 */
            API.call('/api/review/query', { application_id: appId }).then(function (r2) {
              if (!histWrap.isConnected) return;
              histWrap.innerHTML = '';
              histWrap.append(histBox(r2));
            });
          } }) }]),
      rp.root);
  }

  /* 审核历史渲染：review/query {records,total} 无分页回显；rules_hit 是 JSON 字符串（裁决 3） */
  function histBox(r) {
    if (!r || !r.ok) return r ? P.errCard(r) : P.empty('无存证信息');
    if (!r.data.total) return P.empty('尚无审核记录（待审）');
    var box = h('div', { class: 'd-col' });
    (r.data.records || []).forEach(function (x) {
      box.append(P.kv([
        ['审核号', h('code', { class: 'p-mono' }, UI.trunc(x.review_id, 32))],
        ['裁决', P.badge(x.result)],
        ['审核员', x.reviewer],
        ['规则', PORTAL.jp(x.rules_hit, []).join('、') || '—'],
        ['意见', x.comment || '—'],
        ['时间', x.review_time]
      ]));
    });
    return box;
  }

  /* ============ 任务详情 + 航线 mini-map（管理方只见脱敏值） ============ */
  async function openMission(mid, panel) {
    if (mxMini) { mxMini.destroy(); mxMini = null; }
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '⏳ mission/query 查询中…'));
    var r = await API.call('/api/mission/query', { mission_id: mid });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }
    var m = r.data;
    STORE.note('MISSION', m.mission_id, { operator_id: m.operator_id, uav_id: m.uav_id });  /* §29 */
    var ids = PORTAL.jp(m.route_segments, []);
    var mapEl = h('div', { class: 'd-map d-map-sm' });
    panel.append(
      h('p', { class: 'd-small d-muted' }, '隐私说明：任务描述以 SM9 密文入库，管理方视角仅见脱敏值——明文只在监管授权开箱后出现（密文核验页）。'),
      P.kv([
        ['任务号', h('code', { class: 'p-mono' }, m.mission_id)],
        ['状态', P.badge(m.status)],
        ['运营商 / 无人机', m.operator_id + ' / ' + m.uav_id],
        ['类型 / 载荷', m.mission_type + ' / ' + (m.payload_type || '—')],
        ['描述（脱敏）', m.masked_value || '—'],
        ['航段', ids.join('、') || '—'],
        ['空域', PORTAL.jp(m.zones, []).join('、') || '—'],
        ['高度带', m.altitude_min + '–' + m.altitude_max + ' m'],
        ['时窗', m.start_time + ' → ' + m.end_time],
        ['关联执照', m.pilot_license_id || '未关联']
      ]),
      mapEl,
      h('div', { class: 'd-map-hint' }, '任务航线缩略图（' + ids.length + ' 段高亮）'));
    mxMini = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    var rr = await API.call('/api/route/list', { page: 1, page_size: 200 });
    if (!rr.ok || !mxMini) return;
    var mine = (rr.data.records || []).filter(function (x) { return ids.indexOf(x.route_id) >= 0; });
    if (mine.length) {
      mxMini.drawZones(mine);
      mxMini.drawRoutes(mine, { active: ids });
      var pts = GEO.routePoints(mine);
      if (pts.length) mxMini.fitPoints(pts);
    } else {
      mxMini.setEmpty('任务航线无结构化坐标（遗留数据）——不猜测、不绘制');
    }
  }

  AU.queue = { render: render };
})();
```

- [ ] **Step 2: 写 `frontend/js/pages/au/passes.js`（全文逐字）**

```js
/* passes.js — 管理当局端·许可管理（计划 B Task 9，spec §5.2）
   签发 pass/issue（前提任务 APPROVED；同 pass_id 且 GENERATING=幂等续签不产生第二张证；
   已生效重复签发→3002 设计内拒绝）+ pass/list 台账 + 行抽屉：pass/query 详情 /
   pass/verify 验证（code 恒 0，valid/reasons 是数据）/ pass/revoke 吊销
   （本地先行立即生效；跨链重发失败仅留痕不回滚；仅 VALID 可吊销→3002）。
   裁决 4：Pass.route 是 JSON 字符串 → PORTAL.jp。
   端点：pass/issue·list·query·verify·revoke。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* Pass 对象 11 键 → kv（issue 回执与 query 抽屉共用；route JSON 字符串，裁决 4） */
  function passKv(p) {
    return P.kv([
      ['许可号', h('code', { class: 'p-mono' }, p.pass_id)],
      ['状态', P.badge(p.status)],
      ['任务号', h('code', { class: 'p-mono' }, p.mission_id)],
      ['航空器', p.uav_id ? h('code', { class: 'p-mono' }, p.uav_id) : '—'],
      ['有效窗', p.valid_from + ' → ' + p.valid_to],
      ['许可航线', PORTAL.jp(p.route, []).join(' → ') || '—'],
      ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(p.sm3_hash, 48))],
      ['SM9 签名', h('code', { class: 'p-mono' }, UI.trunc(p.signature, 48))],
      ['签发 / 更新', p.created_at + ' → ' + p.updated_at]
    ]);
  }

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '许可管理',
      sub: '电子飞行许可签发 / 验证 / 吊销 —— 签发前提：任务已 APPROVED；吊销本地先行立即生效' }));

    var tbl = null;   /* 签发成功后 reload 台账（runOp 点击时才解引用，前向声明安全） */
    var rp = P.resultPanel();
    var slot = STORE.get('MISSION');
    var f = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true, value: slot ? slot.id : '',
        placeholder: 'MISSION-2026-xxx（须已 APPROVED）' },
      { name: 'issuer', label: '签发人', type: 'text', required: true, value: 'FISCO-ADMIN' },
      { name: 'pass_id', label: '许可号（可选）', type: 'text',
        placeholder: '留空=自动生成 PASS-<年>-%03d；同号且 GENERATING=幂等续签' },
      { name: 'valid_from', label: '生效时间', type: 'datetime', value: UI.datetimeLocal(0),
        hint: '格式 YYYY-MM-DD HH:mm:ss（预填当前）' },
      { name: 'valid_to', label: '失效时间', type: 'datetime', value: UI.datetimeLocal(480),
        hint: '预填 8 小时后；两键均留空则用服务端默认窗口' }
    ]);
    root.append(card('签发许可 pass/issue（FLIGHT_PASS 跨链：fisco-bcos → fabric）',
      h('p', { class: 'd-small d-muted' }, '任务未 APPROVED → 6002（文案含 UAV 实际状态）；重复签发已生效许可 → 3002 设计内拒绝；跨链失败时许可停留 GENERATING 并留痕 FailData —— 修复后同 pass_id 重试为幂等续签，不产生第二张证。'),
      f.root,
      P.actionBar([{ label: '签发许可', kind: 'primary',
        confirm: { title: '确认签发', msg: '许可将签名（SM3 摘要 + SM9 签名）并经管理链上链回传运营链。', ok: '确认签发' },
        run: P.runOp({
          path: '/api/pass/issue',
          body: function () { return PORTAL.need(f.read(), 'mission_id', 'issuer'); },
          rp: rp, successText: '许可已签发（VALID）并上链',
          render: function (d) { return h('div', {}, passKv(d.pass), P.cxTrail(d.crosschain)); },
          note: { kind: 'PASS', id: function (d) { return d.pass.pass_id; },
            extra: function (d) { return { mission_id: d.pass.mission_id }; } },
          onOk: function (d) {
            STORE.note('CROSS_TX', d.crosschain.cross_tx_id, { business_id: d.pass.pass_id });
            if (tbl) tbl.reload();
          } }) }]),
      rp.root));

    tbl = P.dataTable({
      endpoint: '/api/pass/list', pageSize: 10,
      filters: [
        { name: 'status', label: '状态', type: 'select',
          options: ['GENERATING', 'VALID', 'USED', 'EXPIRED', 'REVOKED'] },
        { name: 'mission_id', label: '任务号', type: 'text' },
        { name: 'uav_id', label: '航空器 ID', type: 'text' }
      ],
      columns: [
        { title: '许可号', key: 'pass_id', mono: true },
        { title: '任务号', key: 'mission_id', mono: true },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '有效窗', render: function (r) { return UI.trunc(r.valid_from, 16) + ' → ' + UI.trunc(r.valid_to, 16); } },
        { title: '签发时间', key: 'created_at' },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); passDrawer(r.pass_id, tbl); } }, '详情 · 验证 · 吊销');
        } }
      ],
      onRow: function (r) { passDrawer(r.pass_id, tbl); },
      emptyText: '暂无许可 —— 任务审核通过并签发后出现在此'
    });
    root.append(card('许可台账 pass/list（点击行开详情抽屉）', tbl));
  }

  async function passDrawer(passId, tbl) {
    var d = P.drawer('许可 ' + passId, h('div', { class: 'p-empty' }, '⏳ pass/query 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/pass/query', { pass_id: passId });
    if (!body.isConnected) return;
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }    /* 6002 → EXPLAIN 解说 */
    var p = r.data;
    STORE.note('PASS', p.pass_id);                       /* §29 */
    var rpV = P.resultPanel(), rpR = P.resultPanel();
    var fRv = P.form([
      { name: 'reason', label: '吊销原因', type: 'text', required: true, placeholder: '如：任务终止 / 安全风险' },
      { name: 'operator', label: '操作人', type: 'text', required: true, value: 'FISCO-ADMIN' }
    ]);
    body.append(passKv(p),
      h('div', { class: 'd-section' }, '验证 pass/verify（code 恒 0：valid/reasons 是数据不是错误）'),
      P.actionBar([{ label: '验证许可', run: P.runOp({
        path: '/api/pass/verify',
        body: function () { return { pass_id: passId }; },
        rp: rpV, successText: '验证完成',
        render: function (x) {
          return h('div', {},
            P.statCards([{ label: 'valid', value: x.valid ? '✓ 有效' : '✗ 无效',
              tone: x.valid ? 'good' : 'critical', sub: 'status ' + x.status }]),
            x.reasons && x.reasons.length
              ? h('ul', {}, x.reasons.map(function (t) { return h('li', { style: { color: '#b91c1c' } }, t); }))
              : h('div', { class: 'd-small d-muted' }, '无拒绝原因'));
        } }) }]),
      rpV.root,
      h('div', { class: 'd-section' }, '吊销 pass/revoke（本地先行；仅 VALID 可吊销，否则 3002）'),
      fRv.root,
      P.actionBar([{ label: '吊销许可', kind: 'danger',
        confirm: { title: '确认吊销', msg: '吊销后 pass/verify 立即返回 valid=false（reason「许可已吊销」）。本地先行生效，跨链重发失败仅留痕不回滚。', ok: '确认吊销' },
        run: P.runOp({
          path: '/api/pass/revoke',
          body: function () {
            var v = PORTAL.need(fRv.read(), 'reason', 'operator');
            if (!v) return null;
            return { pass_id: passId, reason: v.reason, operator: v.operator };
          },
          rp: rpR, successText: '许可已吊销（本地生效）',
          render: function (x) {
            return h('div', {},
              P.kv([['许可号', h('code', { class: 'p-mono' }, x.pass.pass_id)],
                    ['状态', P.badge(x.pass.status)],
                    ['跨链重发', P.badge(x.crosschain_status)]]),
              h('p', { class: 'd-small d-muted' }, x.crosschain_status === 'FAILED'
                ? '本地吊销已生效；跨链重发失败仅留痕、不回滚（设计内语义，见安全红线）。'
                : '跨链吊销存证回传成功（PASS_REVOKE）。'),
              P.cxTrail(x.crosschain));
          },
          note: { kind: 'PASS', id: function (x) { return x.pass.pass_id; } },
          onOk: function () { if (tbl) tbl.reload(); } }) }]),
      rpR.root);
  }

  AU.passes = { render: render };
})();
```

- [ ] **Step 3: 写 `frontend/js/pages/au/records.js`（全文逐字）**

```js
/* records.js — 管理当局端·审核留痕（计划 B Task 9，spec §5.2）
   ① review/query：按申请号/审核号查审核记录（{records,total} 无分页回显，review_time ASC）；
   ② crosschain/list（baseBody MISSION_REVIEW_RESULT）：裁决跨链回传流水——business_id 即审核号，
      行点击 P.openCxDetail 四段存证抽屉（fisco-bcos → chainmaker → fabric）。
   裁决 3：Review.rules_hit 响应侧 JSON 字符串 → PORTAL.jp。
   全局审计 audit/query·export 属监管端 #/audit 页（spec §5.3），本页不做。
   端点：review/query、crosschain/list·query（经 openCxDetail）。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '审核留痕',
      sub: '审核记录 · 裁决跨链回传流水 —— 每一次裁决都可回溯到链上四段 TxID' }));

    /* ① review/query 审核记录 */
    var rpR = P.resultPanel();
    var fR = P.form([
      { name: 'application_id', label: '申请号', type: 'text', placeholder: 'APP-…（顶栏 chips 可复制）' },
      { name: 'review_id', label: '审核号', type: 'text', placeholder: 'REV-…（两键至少填一个）' }
    ]);
    root.append(card('审核记录 review/query（无分页回显，review_time ASC）', fR.root,
      P.actionBar([{ label: '查询审核记录', kind: 'primary', run: P.runOp({
        path: '/api/review/query',
        body: function () {
          var v = fR.read();
          if (!v.application_id && !v.review_id) {
            UI.toast('申请号与审核号至少填一个', 'err'); return null;
          }
          return v;
        },
        rp: rpR, successText: '查询完成',
        render: function (d) {
          if (!d.total) return P.empty('无匹配审核记录');
          var box = h('div', { class: 'd-col' },
            h('div', { class: 'd-small d-muted' }, '共 ' + d.total + ' 条'));
          (d.records || []).forEach(function (x) {
            box.append(P.kv([
              ['审核号', h('code', { class: 'p-mono' }, UI.trunc(x.review_id, 32))],
              ['申请号', h('code', { class: 'p-mono' }, x.application_id)],
              ['裁决', P.badge(x.result)],
              ['审核员', x.reviewer],
              ['命中规则', PORTAL.jp(x.rules_hit, []).join('、') || '—'],
              ['意见', x.comment || '—'],
              ['审核时间', x.review_time]
            ]));
          });
          return box;
        } }) }]),
      rpR.root));

    /* ② crosschain/list 裁决回传流水（MISSION_REVIEW_RESULT，business_id=审核号） */
    var tblC = P.dataTable({
      endpoint: '/api/crosschain/list', pageSize: 10,
      baseBody: { message_type: 'MISSION_REVIEW_RESULT' },
      filters: [
        { name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] }
      ],
      columns: [
        { title: 'cross_tx_id', render: function (r) { return UI.trunc(r.cross_tx_id, 20); }, mono: true },
        { title: '审核号（business_id）', render: function (r) { return UI.trunc(r.business_id, 26); }, mono: true },
        { title: '回传路由', render: function (r) {
          return h('span', {}, P.chainTag(r.source_chain), ' → ', P.chainTag(r.final_target_chain));
        } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '回传时间', key: 'created_at' },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); P.openCxDetail(r.cross_tx_id); } }, '四段存证');
        } }
      ],
      onRow: function (r) { P.openCxDetail(r.cross_tx_id); },
      emptyText: '暂无裁决回传记录（提交裁决后自动出现）'
    });
    root.append(card('裁决跨链回传流水 crosschain/list（MISSION_REVIEW_RESULT；点行开四段存证）', tblC));
  }

  AU.records = { render: render };
})();
```

- [ ] **Step 4: authority.html 插入三行 script（Edit，锚点=Task 5 预留注释）**

对 `frontend/authority.html` 做精确替换（old_string 在文件中唯一）：

old_string：
```
<!-- 页面脚本 js/pages/au/*.js 由 Task 9-10 逐行插入到本注释与 shell 行之间 -->
<script src="js/shell-au.js"></script>
```
new_string：
```
<!-- 页面脚本 js/pages/au/*.js 由 Task 9-10 逐行插入到本注释与 shell 行之间 -->
<script src="js/pages/au/queue.js"></script>
<script src="js/pages/au/passes.js"></script>
<script src="js/pages/au/records.js"></script>
<script src="js/shell-au.js"></script>
```

- [ ] **Step 5: 语法门 + 结构断言**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
node --check js/pages/au/queue.js && node --check js/pages/au/passes.js && node --check js/pages/au/records.js && echo SYNTAX_OK
grep -c 'AU.queue = { render' js/pages/au/queue.js         # =1
grep -c 'AU.passes = { render' js/pages/au/passes.js       # =1
grep -c 'AU.records = { render' js/pages/au/records.js     # =1
grep -c 'P.chipBar(' js/pages/au/*.js                      # 全 0（惯例 ③）
grep -c 'tk=' js/pages/au/*.js                             # 全 0（红线：key 不入源码）
grep -c 'histEl' js/pages/au/queue.js                      # =0（废名不得残留）
grep -c "MISSION_APPLICATION" js/pages/au/queue.js         # ≥1（队列发现机制）
grep -c 'PORTAL.jp(' js/pages/au/records.js                # ≥1（rules_hit 解析）
grep -c "Manager-A" js/pages/au/queue.js                   # =1（审核员默认值惯例）
grep -c "FISCO-ADMIN" js/pages/au/passes.js                # =2（issuer + 吊销 operator）
awk '/页面脚本 js\/pages\/au/{c=NR} /pages\/au\/queue.js/{q=NR} /pages\/au\/passes.js/{p=NR} /pages\/au\/records.js/{r=NR} /shell-au.js/{s=NR} END{ if (c<q && q<p && p<r && r<s) print "ORDER_OK"; else print "ORDER_BAD", c,q,p,r,s }' authority.html
```
预期：`SYNTAX_OK` + 各计数如注 + `ORDER_OK`。

- [ ] **Step 6: 静态 smoke（生产红线 #11：BACKEND 指向空地址，绝不打 :8080/:8090）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
PORT=18099 BACKEND=http://127.0.0.1:1 python3 ../scripts/serve-frontend.py & SRV=$!
sleep 1
for p in authority.html js/pages/au/queue.js js/pages/au/passes.js js/pages/au/records.js; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:18099/$p"); echo "$p -> $code"
done
kill $SRV 2>/dev/null; wait $SRV 2>/dev/null; echo SMOKE_DONE
```
预期：四行全 `-> 200` + `SMOKE_DONE`。

- [ ] **Step 7: DEFERRED-HUMAN 清单（浏览器目检，Task 15 汇总）**

- authority.html#/queue：运营商端提交任务后，面板 A 出现 MISSION_APPLICATION 行且「审核状态」列自动标注 PENDING/REVIEWED；点行 → 右侧工作台（四段存证 + 审核历史 + 裁决表单）；提交裁决 APPROVED → 回执 + MISSION_REVIEW_RESULT 四段 TxID + 队列刷新为 REVIEWED；面板 B 行点击 → 任务详情（只见脱敏值）+ 航线 mini-map 高亮任务航段。
- #/passes：对 APPROVED 任务签发 → 许可卡 kv + FLIGHT_PASS 四段 TxID + PASS chip；同任务重复签发 → 3002 错误卡带解说；台账行抽屉：验证（valid 绿/无效红 + reasons 清单）、吊销（确认弹窗 → REVOKED + crosschain_status 徽章）；吊销后再验证 → valid=false「许可已吊销」。
- #/records：审核记录按申请号查询命中（rules_hit 显示为解析后的规则列表而非 JSON 串）；两键全空点查询 → toast 提示不发请求；裁决回传流水只含 MISSION_REVIEW_RESULT 行，点行开四段存证抽屉（fisco-bcos → chainmaker → fabric）。

- [ ] **Step 8: 提交**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/pages/au/queue.js frontend/js/pages/au/passes.js frontend/js/pages/au/records.js frontend/authority.html
git commit -m "$(cat <<'MSG'
feat(frontend): 管理当局端 I——审核队列/许可管理/审核留痕三页（计划 B Task 9）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---

### Task 10: 管理当局端 II —— registry / masterdata / netsec

**Files:**
- Create: `frontend/js/pages/au/registry.js`、`frontend/js/pages/au/masterdata.js`、`frontend/js/pages/au/netsec.js`
- Modify: `frontend/authority.html`（Task 9 已插入 records.js 行与 shell-au.js 行之间再插 3 行）

**Interfaces:**
- Consumes: Task 6 公共惯例（`AU` 替代 `OP`：`var AU = window.AU_PAGES = window.AU_PAGES || {};` + 末尾 `AU.<name> = { render: render };`，页面契约 `render(root, ctx)`）；Task 8 运营端信息边界惯例的**反面**——管理端 netsec **要**渲染 ATTACKER 节点（拓扑全量），只有运营商端才过滤；`P.{form,dataTable,actionBar,runOp,resultPanel,kv,badge,chainTag,errCard,statCards,scoreBars,pathHops,topoSVG,cxTrail,openCxDetail,confirm,drawer,tabs,pageHead,empty,csvExport}`（签名以 pui.js 源码为准：`csvExport({endpoint,body,filters(),filename,label})`、`statCards([{label,value,sub,tone}])` tone→`p-tone-{tone}`、`scoreBars(dims{identity,adjacency,latency,challenge,path},threshold=0.7)`、`pathHops([{from,to,latency_ms}])`、`topoSVG(topo{nodes,edges},hlPath?)`）；`UI.{h,trunc,jsonBlock(obj,maxH),toast}`；`PORTAL.{jp,need,fmtRate}`；`MAPX/GEO`（masterdata、netsec 是 shell-au mapPages，render 入口必先 `if (mx) mx.destroy()`；MAPX.create(el,{view,fit}) → mx{drawZones,drawRoutes,drawNodes,drawWormholes,onMapClick,tempMarker,fitPoints,clear,setEmpty,destroy…}）；契约档案 §7（manufacturer/operator/route register+list；route/create **4 坐标键半套视为缺失**，commit 50c4a03）、§8（realname/list·query Subject 8 键；pilot/list·query License 11 键；pilot/query 平铺，7002 不存在/失效）、§5（crypto/sm9/verify `{sm9_identity,payload,signature}` → `{valid}` code 0，1002 签名非法 base64）、§14（node/register position 大写 X/Y、neighbors 逗号；node/list filter node_type×status；topology/get `{active_sessions,nodes 全量,edges,isolated[],wormhole_enabled}`，edges item `{from,to,distance,advertised_latency_ms,wormhole_edge}`）、§15（session/open `{session,auth{nonce,sm9_identity,signature,verified},path 真数组}`；session/close session_id*+operator* 平铺；session/list filter status 六态裁决 22）、§16（message/send `{message,path_detail 真数组}`；message/list stats`{count,success_count,success_rate 0..1,avg/p50/p95/max_latency_ms}`；4002 设计内）、§17（telemetry/latest `{telemetry:null}` code 0 合法，裁决 17）、§18（wormhole/toggle **enabled\* \*bool binding:required 关闭须显式 false**，4001 隔离残留只能 demo/reset；risk/evaluate `{risk_score,threshold:0.7,verdict PASS|DETECT|BLOCK,dimensions 5,events[],session_status}`；path/switch session_id*+operator* 仅 DEGRADED，4002 健康拒绝；event/list filter session_id/action）、§27（experiment/run 11 类枚举 count 1..1000 **scenario 双向严格：MESSAGE_FLOW 必填 NORMAL|ATTACK|DEFENSE 其余必须留空 → 6002**；experiment/list filter 仅 experiment_type/status 裁决 24；experiment/export 同 list 过滤键无分页 → `{format,content,rows}`）、§29 note 惯例（node/register→NODE；session/open·close·path/switch→SESSION；message/send 无 note；wormhole/toggle 无 note）。
- Produces:
  - authority.html script 区新增（顺序）：`registry.js` → `masterdata.js` → `netsec.js`（records.js 行后、shell-au.js 前）。
  - **管理端 SM9 验签惯例**（Task 11-12 复用）：局方执照签名身份恒为 `SM9-ID-FISCO-ADMIN`（pilot.go `pilotSignerUID = crypto.SM9IdentityOf("FISCO-ADMIN")`）；验签 canonical 材料 = pilotCanonical 七键 `{license_id, license_no, name, id_number, category, issued_at, expires_at}`，值逐字取自 pilot/query 响应；`crypto/sm9/verify` 对合法 base64 签名恒 code=0（valid true/false 都在 data）。
  - **管理端表单默认值惯例（续 Task 9）**：netsec 会话关闭/路径切换/虫洞 operator 恒 `'SecOps'`（旧 wb-security 同款，剧本 Task 14 引用）。
  - **地图点选定坐标惯例**（masterdata，Task 11-12 若需可复用）：`mx.onMapClick(fn(lat,lon))` 逐次落 `mx.tempMarker(lat,lon,label)` 并 `f.set` 回填 toFixed(6) 坐标字段；第三次点击清空重来。

- [ ] **Step 1: 写 `frontend/js/pages/au/registry.js`（全文逐字）**

```js
/* registry.js — 管理当局端·登记与资质（计划 B Task 10，spec §5.2）
   只读局方台账：实名主体（realname/list·query）+ 飞行员执照（pilot/list·query）。
   执照记录带 SM9 验签按钮：crypto/sm9/verify 以局方签发身份 SM9-ID-FISCO-ADMIN 复核
   pilotCanonical 七键 {license_id,license_no,name,id_number,category,issued_at,expires_at}——防篡改。
   本页不做登记动作（realname/register·pilot/apply 属运营商端）；管理当局只查看与复核。
   端点：realname/list·query、pilot/list·query、crypto/sm9/verify。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* 局方执照签发身份（pilot.go: pilotSignerUID = crypto.SM9IdentityOf("FISCO-ADMIN")） */
  const PILOT_SIGNER = 'SM9-ID-FISCO-ADMIN';

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '登记与资质',
      sub: '只读局方台账 · 实名主体 + 飞行员执照 · 执照可 SM9 验签防篡改' }));

    var panel = h('div', { class: 'd-col' }, P.empty('点击左侧台账行查看详情'));

    /* 实名主体台账（subject_type 过滤：ENTERPRISE/INDIVIDUAL 大写枚举） */
    var tblR = P.dataTable({
      endpoint: '/api/realname/list', pageSize: 10,
      filters: [{ name: 'subject_type', label: '主体类型', type: 'select',
        options: ['ENTERPRISE', 'INDIVIDUAL'] }],
      columns: [
        { title: '主体号', render: function (r) { return UI.trunc(r.subject_id, 22); }, mono: true },
        { title: '类型', render: function (r) { return P.badge(r.subject_type); } },
        { title: '名称', key: 'name' },
        { title: '证件号', render: function (r) { return UI.trunc(r.id_number, 20); }, mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } }
      ],
      onRow: function (r) { openSubject(r.subject_id, panel); },
      emptyText: '暂无实名主体（运营商端实名登记后出现）'
    });

    /* 飞行员执照台账（category 中文枚举过滤） */
    var tblP = P.dataTable({
      endpoint: '/api/pilot/list', pageSize: 10,
      filters: [{ name: 'category', label: '类别', type: 'select',
        options: ['多旋翼', '固定翼', '垂直起降'] }],
      columns: [
        { title: '执照号', render: function (r) { return UI.trunc(r.license_id, 20); }, mono: true },
        { title: '编号', key: 'license_no', mono: true },
        { title: '姓名', key: 'name' },
        { title: '类别', render: function (r) { return P.badge(r.category); } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); openLicense(r.license_id, panel); } }, '详情');
        } }
      ],
      onRow: function (r) { openLicense(r.license_id, panel); },
      emptyText: '暂无飞行员执照（运营商端执照申请后出现）'
    });

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        card('实名主体台账（realname/list）', tblR),
        card('飞行员执照台账（pilot/list）', tblP)),
      h('div', { class: 'd-col' }, card('详情', panel))));
  }

  /* 实名主体详情：realname/query 平铺 Subject（8 键） */
  async function openSubject(sid, panel) {
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '⏳ realname/query 查询中…'));
    var r = await API.call('/api/realname/query', { subject_id: sid });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }   /* 7001 主体不存在 */
    var s = r.data;
    panel.append(
      h('div', { class: 'd-section' }, '实名主体'),
      P.kv([
        ['主体号', h('code', { class: 'p-mono' }, s.subject_id)],
        ['类型', P.badge(s.subject_type)],
        ['名称', s.name],
        ['证件号', h('code', { class: 'p-mono' }, s.id_number)],
        ['联系方式', s.contact || '—'],
        ['状态', P.badge(s.status)],
        ['建档 / 更新', s.created_at + ' → ' + s.updated_at]
      ]),
      h('p', { class: 'd-small d-muted' }, '演示数据域：证件号为模拟值，不接真实认证系统。'));
  }

  /* 飞行员执照详情：pilot/query 平铺 License（11 键）+ SM9 验签 */
  async function openLicense(lid, panel) {
    panel.innerHTML = '';
    panel.append(h('div', { class: 'p-empty' }, '⏳ pilot/query 查询中…'));
    var r = await API.call('/api/pilot/query', { license_id: lid });
    if (!panel.isConnected) return;
    panel.innerHTML = '';
    if (!r.ok) { panel.append(P.errCard(r)); return; }   /* 7002 不存在或已失效 */
    var L = r.data;

    var verifyBox = h('div', { class: 'd-col' });
    panel.append(
      h('div', { class: 'd-section' }, '飞行员执照'),
      P.kv([
        ['执照号', h('code', { class: 'p-mono' }, L.license_id)],
        ['执照编号', h('code', { class: 'p-mono' }, L.license_no)],
        ['姓名', L.name],
        ['证件号', h('code', { class: 'p-mono' }, L.id_number)],
        ['类别', P.badge(L.category)],
        ['状态', P.badge(L.status)],
        ['签发 / 失效', L.issued_at + ' → ' + L.expires_at],
        ['SM9 签名', h('code', { class: 'p-mono' }, UI.trunc(L.signature, 40))]
      ]),
      h('div', { class: 'd-section' }, 'SM9 验签（局方签发身份 ' + PILOT_SIGNER + '）'),
      P.actionBar([{ label: 'SM9 验签', kind: 'primary', title: '以签发 canonical 材料复核签名',
        run: function (el) { verifyLicense(L, verifyBox, el); } }]),
      verifyBox,
      h('p', { class: 'd-small d-muted' }, '验签材料 = pilotCanonical 七键 {license_id, license_no, name, id_number, category, issued_at, expires_at}（与后端签名同一 canonical 序列化）。演示数据域：证件号为模拟值。'));
  }

  /* crypto/sm9/verify：payload = query 响应七键子集；合法签名 valid true/false 均 code=0 */
  async function verifyLicense(L, box, el) {
    box.innerHTML = '';
    box.append(h('div', { class: 'p-empty' }, '⏳ crypto/sm9/verify 验签中…'));
    if (el) el.disabled = true;
    var payload = {
      license_id: L.license_id, license_no: L.license_no, name: L.name,
      id_number: L.id_number, category: L.category,
      issued_at: L.issued_at, expires_at: L.expires_at
    };
    var r = await API.call('/api/crypto/sm9/verify',
      { sm9_identity: PILOT_SIGNER, payload: payload, signature: L.signature });
    if (el) el.disabled = false;
    if (!box.isConnected) return;
    box.innerHTML = '';
    if (!r.ok) { box.append(P.errCard(r)); return; }   /* 1002 签名 base64 非法 */
    var ok = !!r.data.valid;
    box.append(
      P.statCards([{ label: 'SM9 验签', value: ok ? '✓ 通过' : '✗ 未通过',
        sub: ok ? '签名与 canonical 材料一致' : '签名与材料不一致（疑篡改）',
        tone: ok ? 'good' : 'critical' }]),
      UI.jsonBlock(payload, 160));
  }

  AU.registry = { render: render };
})();
```

- [ ] **Step 2: 写 `frontend/js/pages/au/masterdata.js`（全文逐字）**

```js
/* masterdata.js — 管理当局端·主数据维护（计划 B Task 10，spec §5.2）
   厂商/运营商登记 + 航段登记（route/create）+ 航段台账。
   航段坐标：地图点选两点定起止（第 1 击=起点「起」，第 2 击=终点「止」，第 3 击清空重来），
   也可手填四个坐标字段；「半套视为缺失」红线（commit 50c4a03）——前端先拦再提交。
   台账全局共享：管理端登记的主数据运营商端同源可见（演示/维护场景）。
   端点：manufacturer/register·list、operator/register·list、route/create·list。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;          /* 页面级地图（shell-au mapPages 含 masterdata）：render 入口必先 destroy */
  var routes = [];        /* 航线缓存（地图全量拉取） */
  var activeId = [];      /* 地图高亮航段 id */

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    routes = []; activeId = [];
    root.append(P.pageHead({
      title: '主数据维护',
      sub: '厂商 / 运营商 / 航段登记 · 地图点选两点定起降坐标 · 台账全局共享' }));

    /* --- 航段登记（地图点选 + 手填坐标双通道） --- */
    var rpRt = P.resultPanel();
    var fRt = P.form([
      { name: 'route_id', label: '航段号', type: 'text', required: true, placeholder: 'R901' },
      { name: 'zone', label: '所属空域', type: 'text', required: true, placeholder: 'Zone-A / Zone-B / Zone-D' },
      { name: 'start_point', label: '起点名', type: 'text', required: true,
        placeholder: '可内嵌坐标：S9(30.510,114.310)' },
      { name: 'end_point', label: '终点名', type: 'text', required: true,
        placeholder: '可内嵌坐标：E9(30.620,114.420)' },
      { name: 'start_lat', label: '起点纬度', type: 'number', step: '0.000001', placeholder: '地图点选自动回填' },
      { name: 'start_lon', label: '起点经度', type: 'number', step: '0.000001', placeholder: '地图点选自动回填' },
      { name: 'end_lat', label: '终点纬度', type: 'number', step: '0.000001', placeholder: '地图点选自动回填' },
      { name: 'end_lon', label: '终点经度', type: 'number', step: '0.000001', placeholder: '地图点选自动回填' },
      { name: 'altitude_min', label: '最低高度(m)', type: 'number', value: 60 },
      { name: 'altitude_max', label: '最高高度(m)', type: 'number', value: 120 }
    ]);
    var clickStage = 0;   /* 0=下一击起点，1=下一击终点，2=已齐下一击重来 */
    var mapEl = h('div', { class: 'd-map d-map-lg' });
    var tblRt = null;     /* 前向声明：登记成功 onOk 里 reload（赋值先于任何点击） */

    function onPickPoint(lat, lon) {
      if (!mx) return;
      if (clickStage === 0) {
        mx.clear('marks');
        mx.tempMarker(lat, lon, '起');
        fRt.set('start_lat', lat.toFixed(6));
        fRt.set('start_lon', lon.toFixed(6));
        clickStage = 1;
      } else if (clickStage === 1) {
        mx.tempMarker(lat, lon, '止');
        fRt.set('end_lat', lat.toFixed(6));
        fRt.set('end_lon', lon.toFixed(6));
        clickStage = 2;
      } else {
        mx.clear('marks');
        ['start_lat', 'start_lon', 'end_lat', 'end_lon'].forEach(function (k) { fRt.set(k, ''); });
        clickStage = 0;
      }
    }

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        card('航段登记 route/create', fRt.root,
          P.actionBar([{ label: '登记航段', kind: 'primary',
            confirm: { title: '登记航段', msg: '航段入库后全局可见（运营商端空域查询/飞行申请同源台账）。', ok: '登记' },
            run: P.runOp({
              path: '/api/route/create',
              body: function () {
                var v = PORTAL.need(fRt.read(), 'route_id', 'zone', 'start_point', 'end_point');
                if (!v) return null;
                var filled = [v.start_lat, v.start_lon, v.end_lat, v.end_lon]
                  .filter(function (x) { return x !== undefined; }).length;
                if (filled > 0 && filled < 4) {
                  UI.toast('坐标半套视为缺失：四个坐标要么全填、要么全留空（留空=服务端从点名内嵌坐标解析）', 'err', 5200);
                  return null;
                }
                var body = { route_id: v.route_id, zone: v.zone,
                  start_point: v.start_point, end_point: v.end_point };
                if (v.altitude_min !== undefined) body.altitude_min = v.altitude_min;
                if (v.altitude_max !== undefined) body.altitude_max = v.altitude_max;
                if (filled === 4) {
                  body.start_lat = v.start_lat; body.start_lon = v.start_lon;
                  body.end_lat = v.end_lat; body.end_lon = v.end_lon;
                }
                return body;
              },
              rp: rpRt, successText: '航段已登记',
              render: function (d) {
                return P.kv([
                  ['航段号', h('code', { class: 'p-mono' }, d.route_id)],
                  ['空域', d.zone],
                  ['走廊', P.badge(d.corridor_status)],
                  ['起 → 止', d.start_point + ' → ' + d.end_point],
                  ['起点坐标', GEO.fmtCoordPair(d.start_lat, d.start_lon)],
                  ['终点坐标', GEO.fmtCoordPair(d.end_lat, d.end_lon)],
                  ['高度带', d.altitude_min + '–' + d.altitude_max + ' m']
                ]);
              },
              note: { kind: 'ROUTE', id: function (d) { return d.route_id; },
                extra: function (d) { return { zone: d.zone }; } },
              onOk: function (d) {
                clickStage = 0;
                if (mx) mx.clear('marks');
                activeId = [d.route_id];
                loadRoutes();
                if (tblRt) tblRt.reload();
              }
            }) }]),
          rpRt.root,
          h('p', { class: 'd-small d-muted' }, '坐标红线：0 值 = 未设，不猜测、不绘制；显式坐标半套（只给 lat 或只给 lon）后端视为缺失 → 6002。'))),
      h('div', { class: 'd-col' }, mapEl,
        h('div', { class: 'd-map-hint' }, '地图点选：第 1 击 = 起点「起」，第 2 击 = 终点「止」，第 3 击清空重来；点已有航线可高亮'))));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    mx.onMapClick(onPickPoint);
    loadRoutes();

    /* --- 航段台账（行点击 → 地图高亮 + 定位） --- */
    tblRt = P.dataTable({
      endpoint: '/api/route/list', pageSize: 10,
      filters: [
        { name: 'zone', label: '空域', type: 'text', placeholder: 'Zone-A' },
        { name: 'corridor_status', label: '走廊', type: 'select', options: ['OPEN', 'RESTRICTED', 'CLOSED'] }
      ],
      columns: [
        { title: '航段号', key: 'route_id', mono: true },
        { title: '空域', key: 'zone' },
        { title: '起 → 止', render: function (r) { return r.start_point + ' → ' + r.end_point; } },
        { title: '起点坐标', render: function (r) { return GEO.fmtCoordPair(r.start_lat, r.start_lon); }, mono: true },
        { title: '终点坐标', render: function (r) { return GEO.fmtCoordPair(r.end_lat, r.end_lon); }, mono: true },
        { title: '高度带', render: function (r) { return r.altitude_min + '–' + r.altitude_max + ' m'; } },
        { title: '走廊', render: function (r) { return P.badge(r.corridor_status); } }
      ],
      onRow: function (r) {
        activeId = [r.route_id];
        redraw();
        var pts = GEO.routePoints([r]);
        if (mx && pts.length) mx.fitPoints(pts);
      },
      emptyText: '暂无航段'
    });
    root.append(card('航段台账 route/list（点行 → 地图高亮定位）', tblRt));

    /* --- 厂商登记 --- */
    var tblMf = null;
    var rpMf = P.resultPanel();
    var fMf = P.form([
      { name: 'manufacturer_id', label: '厂商 ID', type: 'text', required: true, placeholder: 'Manufacturer-D' },
      { name: 'name', label: '厂商名称', type: 'text', required: true, placeholder: '样例无人机制造商' },
      { name: 'adapter_type', label: '适配类型（可选）', type: 'text', placeholder: '留空' }
    ]);
    tblMf = P.dataTable({
      endpoint: '/api/manufacturer/list', pageSize: 5,
      columns: [
        { title: '厂商 ID', key: 'manufacturer_id', mono: true },
        { title: '名称', key: 'name' },
        { title: '适配类型', render: function (r) { return r.adapter_type || '—'; } },
        { title: '状态', render: function (r) { return P.badge(r.status); } }
      ],
      emptyText: '暂无厂商'
    });
    var mfCard = card('厂商登记 manufacturer/register', fMf.root,
      P.actionBar([{ label: '注册厂商', kind: 'primary', run: P.runOp({
        path: '/api/manufacturer/register',
        body: function () {
          var v = PORTAL.need(fMf.read(), 'manufacturer_id', 'name');
          if (!v) return null;
          return { manufacturer_id: v.manufacturer_id, name: v.name, adapter_type: v.adapter_type || '' };
        },
        rp: rpMf, successText: '厂商已注册（status 服务端固定 ACTIVE）',
        render: function (d) {
          return P.kv([
            ['厂商 ID', h('code', { class: 'p-mono' }, d.manufacturer_id)],
            ['名称', d.name],
            ['状态', P.badge(d.status)]
          ]);
        },
        note: { kind: 'MANUFACTURER', id: function (d) { return d.manufacturer_id; } },
        onOk: function () { tblMf.reload(); }
      }) }]),
      rpMf.root, tblMf);

    /* --- 运营商登记 --- */
    var tblOp = null;
    var rpOp = P.resultPanel();
    var fOp = P.form([
      { name: 'operator_id', label: '运营商 ID', type: 'text', required: true, placeholder: 'Operator-D' },
      { name: 'name', label: '运营商名称', type: 'text', required: true, placeholder: '样例低空物流运营商' },
      { name: 'contact', label: '联系方式（可选）', type: 'text', placeholder: '027-88880000' },
      { name: 'chain_org_id', label: '链上组织 ID（可选）', type: 'text', placeholder: '留空' }
    ]);
    tblOp = P.dataTable({
      endpoint: '/api/operator/list', pageSize: 5,
      columns: [
        { title: '运营商 ID', key: 'operator_id', mono: true },
        { title: '名称', key: 'name' },
        { title: '联系方式', render: function (r) { return r.contact || '—'; } },
        { title: '链上组织', render: function (r) { return r.chain_org_id || '—'; }, mono: true },
        { title: '资质', render: function (r) { return P.badge(r.qualification_status); } }
      ],
      emptyText: '暂无运营商'
    });
    var opCard = card('运营商登记 operator/register', fOp.root,
      P.actionBar([{ label: '注册运营商', kind: 'primary', run: P.runOp({
        path: '/api/operator/register',
        body: function () {
          var v = PORTAL.need(fOp.read(), 'operator_id', 'name');
          if (!v) return null;
          return { operator_id: v.operator_id, name: v.name,
            contact: v.contact || '', chain_org_id: v.chain_org_id || '' };
        },
        rp: rpOp, successText: '运营商已注册（资质服务端固定 QUALIFIED）',
        render: function (d) {
          return P.kv([
            ['运营商 ID', h('code', { class: 'p-mono' }, d.operator_id)],
            ['名称', d.name],
            ['资质', P.badge(d.qualification_status)],
            ['状态', P.badge(d.status)]
          ]);
        },
        note: { kind: 'OPERATOR', id: function (d) { return d.operator_id; } },
        onOk: function () { tblOp.reload(); }
      }) }]),
      rpOp.root, tblOp);

    root.append(h('div', { class: 'd-grid-2' }, mfCard, opCard));
  }

  /* 航线全量拉取 → 地图重绘（走廊按 corridor_status 着色 + 航线可点选高亮） */
  async function loadRoutes() {
    if (!mx) return;
    var r = await API.call('/api/route/list', { page: 1, page_size: 200 });
    if (!mx) return;
    if (!r.ok) { mx.setEmpty('航线加载失败 code=' + r.code + '（' + r.message + '）'); return; }
    routes = r.data.records || [];
    redraw();
  }
  function redraw() {
    if (!mx) return;
    mx.clear('zones'); mx.clear('routes');
    mx.drawZones(routes);
    mx.drawRoutes(routes, {
      active: activeId, opacity: 0.85,
      onPick: function (rt) { activeId = [rt.route_id]; redraw(); }
    });
  }

  AU.masterdata = { render: render };
})();
```

- [ ] **Step 3: 写 `frontend/js/pages/au/netsec.js`（全文逐字）**

```js
/* netsec.js — 管理当局端·链网安全运营（计划 B Task 10，spec §5.2）
   系统二（链下可信网络）全量运营视图，四个页签：
   topo 拓扑·节点：topology/get 真地图（节点/虫洞伪造边/隔离集）+ node/register + node/list；
   traffic 会话·消息：session/open·close·list + message/send·list（统计卡 + 逐跳时延）；
   drill 攻防演练：wormhole/toggle + risk/evaluate + path/switch + event/list；
   exp 性能实验：experiment/run·result·list·export（CSV）。
   信息边界（Task 8 运营端惯例的反面）：管理端全量渲染 ATTACKER 节点——安全运营视角必须看到全貌。
   管理端表单默认值惯例：operator 恒 'SecOps'（会话关闭/虫洞/路径切换）。
   地图在页签 box 内创建（脱离 DOM 零尺寸）——依赖 MAPX.create 的 rAF invalidateSize 校正（Task 4）。
   端点：topology/get、node/register·list、session/open·close·list、message/send·list、
   wormhole/toggle、risk/evaluate、path/switch、event/list、experiment/run·result·list·export。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var AU = window.AU_PAGES = window.AU_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;   /* 拓扑真地图（tabTopo 专属；shell-au mapPages 含 netsec）：render 入口必先 destroy */

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    root.append(P.pageHead({
      title: '链网安全运营',
      sub: '系统二 · 链下可信网络 — 拓扑 / 会话消息 / 攻防演练 / 性能实验（安全运营视角：ATTACKER 节点全量可见）' }));
    root.append(P.tabs([
      { key: 'topo', label: '拓扑·节点', render: tabTopo },
      { key: 'traffic', label: '会话·消息', render: tabTraffic },
      { key: 'drill', label: '攻防演练', render: tabDrill },
      { key: 'exp', label: '性能实验', render: tabExp }
    ]));
  }

  /* 响应侧 path 类字段可能是 JSON 字符串数组（裁决 3 惯例）——解析后展示，双形态兼容 */
  function pathText(v) {
    var arr = PORTAL.jp(v, null);
    if (Array.isArray(arr)) return arr.length ? arr.join(' → ') : '—';
    return (v != null && v !== '') ? String(v) : '—';
  }
  /* failure_reasons 为 JSON 字符串（原因→次数）→ '原因×次数；…' */
  function fmtReasons(s) {
    var o = PORTAL.jp(s, null);
    if (!o || typeof o !== 'object') return (s != null && s !== '' && s !== '{}') ? String(s) : '—';
    var ks = Object.keys(o);
    if (!ks.length) return '—';
    return ks.map(function (k) { return k + '×' + o[k]; }).join('；');
  }
  function verdictLabel(v) {
    return v === 'PASS' ? '✓ PASS 无异常'
      : v === 'DETECT' ? '⚠ DETECT 检出攻击'
      : v === 'BLOCK' ? '⛔ BLOCK 已阻断' : (v || '—');
  }

  /* ============ 页签 1：拓扑·节点 ============ */
  function tabTopo(box) {
    var statsBox = h('div', {}, P.empty('⏳ topology/get 加载中…'));
    var mapEl = h('div', { class: 'd-map d-map-xl' });
    var tblNd = null;

    box.append(statsBox);
    box.append(h('div', { class: 'd-col' }, mapEl,
      h('div', { class: 'd-map-hint' }, '节点着色：紫=MANAGEMENT · 蓝=EDGE · 青=UAV · 红=ATTACKER（空心=OFFLINE、红虚线⛔=ISOLATED）；红虚线边=虫洞伪造边。无经纬度的节点不上图（红线：不猜测坐标）。')));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    loadTopo();

    /* 节点注册（position 大写 X/Y 是 SVG 拓扑坐标；lat/lon 才驱动真地图） */
    var rpNd = P.resultPanel();
    var fNd = P.form([
      { name: 'node_id', label: '节点 ID', type: 'text', required: true, placeholder: 'N5',
        hint: '无人机端节点约定 <uav_id>-NODE（session/open 建会话前须已注册，否则 6002）' },
      { name: 'node_type', label: '节点类型', type: 'select', required: true, value: 'EDGE',
        options: ['EDGE', 'MANAGEMENT', 'UAV', 'ATTACKER'] },
      { name: 'posX', label: '拓扑坐标 X（0-100）', type: 'number', required: true, value: 60 },
      { name: 'posY', label: '拓扑坐标 Y（0-100）', type: 'number', required: true, value: 60,
        hint: 'position 键为大写 X/Y（非经纬度）' },
      { name: 'neighbors', label: '邻居（逗号分隔，可空）', type: 'text', placeholder: 'N3,MGR' },
      { name: 'lat', label: '纬度（真地图需填）', type: 'number', step: '0.000001',
        hint: '不填则不上真地图（红线：无地理坐标不画）' },
      { name: 'lon', label: '经度（真地图需填）', type: 'number', step: '0.000001' }
    ]);
    tblNd = P.dataTable({
      endpoint: '/api/node/list', pageSize: 10,
      filters: [
        { name: 'node_type', label: '类型', type: 'select', options: ['MANAGEMENT', 'EDGE', 'UAV', 'ATTACKER'] },
        { name: 'status', label: '状态', type: 'select', options: ['ONLINE', 'OFFLINE', 'ISOLATED'] }
      ],
      columns: [
        { title: '节点', key: 'node_id', mono: true },
        { title: '类型', render: function (r) { return P.badge(r.node_type); } },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '风险分', render: function (r) { return r.risk_score != null ? Number(r.risk_score).toFixed(2) : '—'; }, num: true },
        { title: '邻居', render: function (r) { return PORTAL.jp(r.neighbors, []).join('、') || '—'; } },
        { title: '地图坐标', render: function (r) { return GEO.fmtCoordPair(r.lat, r.lon); }, mono: true },
        { title: 'SM9 身份', render: function (r) { return UI.trunc(r.sm9_identity, 24); }, mono: true }
      ],
      emptyText: '暂无节点（demo/init 灌种后出现）'
    });
    box.append(card('节点注册 node/register（ISOLATED 由攻防处置产生，注册不可指定；4003=节点身份校验失败）',
      fNd.root,
      P.actionBar([{ label: '注册节点', kind: 'primary', run: P.runOp({
        path: '/api/node/register',
        body: function () {
          var v = PORTAL.need(fNd.read(), 'node_id', 'node_type', 'posX', 'posY');
          if (!v) return null;
          var body = {
            node_id: v.node_id, node_type: v.node_type,
            position: { X: Number(v.posX) || 0, Y: Number(v.posY) || 0 }
          };
          if (v.neighbors) body.neighbors = String(v.neighbors).split(/[,，]/)
            .map(function (s) { return s.trim(); }).filter(Boolean);
          if (v.lat !== undefined) body.lat = v.lat;
          if (v.lon !== undefined) body.lon = v.lon;
          return body;
        },
        rp: rpNd, successText: '节点已注册（sm9_identity 自动派生 SM9-ID-<node_id>）',
        render: function (d) {
          var pos = PORTAL.jp(d.position, {});
          var px = pos.X != null ? pos.X : (pos.x != null ? pos.x : '?');
          var py = pos.Y != null ? pos.Y : (pos.y != null ? pos.y : '?');
          return P.kv([
            ['节点', h('code', { class: 'p-mono' }, d.node_id)],
            ['类型', P.badge(d.node_type)],
            ['状态', P.badge(d.status)],
            ['拓扑坐标', '(' + px + ', ' + py + ')'],
            ['邻居', PORTAL.jp(d.neighbors, []).join('、') || '—'],
            ['地图坐标', GEO.fmtCoordPair(d.lat, d.lon)],
            ['SM9 身份', h('code', { class: 'p-mono' }, UI.trunc(d.sm9_identity, 36))]
          ]);
        },
        note: { kind: 'NODE', id: function (d) { return d.node_id; },
          extra: function (d) { return { node_type: d.node_type }; } },
        onOk: function () { tblNd.reload(); loadTopo(); }
      }) }]),
      rpNd.root));
    box.append(card('节点台账 node/list（种子 position 小写 x/y 与 API 注册回显大写 X/Y 并存——展示层双兼容）', tblNd));

    /* 拓扑加载：统计卡 + 真地图（虫洞伪造边入 marks 层，节点入 nodes 层） */
    async function loadTopo() {
      var r = await API.call('/api/topology/get', {});
      if (statsBox.isConnected) {
        statsBox.innerHTML = '';
        if (!r.ok) { statsBox.append(P.errCard(r)); }
        else {
          var t = r.data;
          statsBox.append(P.statCards([
            { label: '活跃会话', value: t.active_sessions },
            { label: '节点', value: (t.nodes || []).length,
              sub: '隔离集：' + ((t.isolated || []).join('、') || '无') },
            { label: '网络边', value: (t.edges || []).length,
              sub: '虫洞边：' + (t.edges || []).filter(function (e) { return e.wormhole_edge; }).length },
            { label: '虫洞攻击', value: t.wormhole_enabled ? '⚠ 开启中' : '未开启',
              tone: t.wormhole_enabled ? 'critical' : 'good' }
          ]));
        }
      }
      if (!mx || !r.ok) return;
      mx.clear('nodes'); mx.clear('marks');
      mx.drawWormholes(r.data.edges || [], r.data.nodes || []);
      mx.drawNodes(r.data.nodes || [], { onPick: function (n) {
        UI.toast(n.node_id + ' · ' + n.node_type + ' · ' + n.status +
          (n.risk_score != null ? ' · 风险分 ' + Number(n.risk_score).toFixed(2) : ''), 'ok', 4200);
      } });
      var pts = (r.data.nodes || []).map(function (n) { return GEO.nodeCoord(n); }).filter(Boolean);
      if (pts.length) mx.fitPoints(pts);
    }
  }

  /* ============ 页签 2：会话·消息 ============ */
  function tabTraffic(box) {
    var slotS = STORE.get('SESSION'), slotM = STORE.get('MISSION'), slotP = STORE.get('PASS');

    /* --- 会话台账（行级关闭；CLOSED 行按钮 disabled） --- */
    var tblS = null;
    tblS = P.dataTable({
      endpoint: '/api/session/list', pageSize: 10,
      filters: [{ name: 'status', label: '状态', type: 'select',
        options: ['INIT', 'AUTHENTICATED', 'ACTIVE', 'DEGRADED', 'RECOVERED', 'CLOSED'] }],
      columns: [
        { title: '会话号', render: function (r) { return UI.trunc(r.session_id, 22); }, mono: true },
        { title: '航空器', key: 'uav_id', mono: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '当前路径', render: function (r) { return UI.trunc(PORTAL.jp(r.current_path, []).join(' → '), 40) || '—'; }, mono: true },
        { title: '关联任务', render: function (r) { return r.mission_id || '—'; } },
        { title: '建立时间', key: 'created_at' },
        { title: '操作', render: function (r) {
          var b = h('button', { class: 'p-btn p-btn-sm p-btn-danger', disabled: r.status === 'CLOSED' }, '关闭');
          b.addEventListener('click', function (e) { e.stopPropagation(); closeSession(r.session_id, tblS); });
          return b;
        } }
      ],
      onRow: function (r) { fMs.set('session_id', r.session_id); UI.toast('会话号已预填到消息发送表单'); },
      emptyText: '暂无会话'
    });

    async function closeSession(sid, tbl) {
      var ok = await P.confirm('关闭会话',
        '关闭后对该会话发消息 → 4002（设计内拒绝）。会话号：' + sid, '确认关闭');
      if (!ok) return;
      var r = await API.call('/api/session/close',
        { session_id: sid, operator: 'SecOps', reason: '手动关闭' });
      if (r.ok) {
        STORE.note('SESSION', r.data.session_id);
        UI.toast('会话已关闭（status=' + r.data.status + '）');
        tbl.reload();
      } else {
        UI.toast('关闭失败 code=' + r.code + '：' + r.message, 'err', 5200);
      }
    }

    /* --- 建立会话（SM9 挑战-应答 + Dijkstra 初始可信路径） --- */
    var rpSo = P.resultPanel();
    var fSo = P.form([
      { name: 'uav_id', label: '航空器', type: 'text', required: true, value: 'UAV-A-001',
        hint: '源节点缺省 <uav_id>-NODE，须已注册（否则 6002）' },
      { name: 'source_node', label: '源节点（可选）', type: 'text', placeholder: '缺省 <uav_id>-NODE' },
      { name: 'target_node', label: '目标节点（可选）', type: 'text', placeholder: '缺省 MGR' },
      { name: 'mission_id', label: '关联任务（可选留档）', type: 'text', value: slotM ? slotM.id : '' },
      { name: 'pass_id', label: '关联许可（可选留档）', type: 'text', value: slotP ? slotP.id : '' }
    ]);
    var soCard = card('建立会话 session/open（SM9 挑战-应答；4002=认证失败、4004=无可达路径）',
      fSo.root,
      P.actionBar([{ label: '起飞报备 · 建立会话', kind: 'primary', run: P.runOp({
        path: '/api/session/open',
        body: function () {
          var v = PORTAL.need(fSo.read(), 'uav_id');
          if (!v) return null;
          var body = { uav_id: v.uav_id };
          if (v.source_node) body.source_node = v.source_node;
          if (v.target_node) body.target_node = v.target_node;
          if (v.mission_id) body.mission_id = v.mission_id;
          if (v.pass_id) body.pass_id = v.pass_id;
          return body;
        },
        rp: rpSo, successText: '会话已建立（INIT→AUTHENTICATED→ACTIVE，审计留两条 STATE_TRANSITION）',
        render: function (d) {
          return h('div', {},
            P.kv([
              ['会话号', h('code', { class: 'p-mono' }, d.session.session_id)],
              ['状态', P.badge(d.session.status)],
              ['航空器', d.session.uav_id],
              ['SM9 认证', d.auth.verified ? '✓ 挑战-应答通过' : '✗ 未通过'],
              ['SM9 身份', h('code', { class: 'p-mono' }, d.auth.sm9_identity)],
              ['Nonce', h('code', { class: 'p-mono' }, UI.trunc(d.auth.nonce, 40))],
              ['签名', h('code', { class: 'p-mono' }, UI.trunc(d.auth.signature, 40))],
              ['初始可信路径', (d.path || []).join(' → ')]
            ]),
            h('p', { class: 'd-small d-muted' }, '虫洞开启期间建立的会话，初始路径可能含隧道边——到「攻防演练」页签评估风险并切换路径。'));
        },
        note: { kind: 'SESSION', id: function (d) { return d.session.session_id; },
          extra: function (d) { return { uav_id: d.session.uav_id, mission_id: d.session.mission_id }; } },
        onOk: function (d) {
          fMs.set('session_id', d.session.session_id);
          tblS.reload();
        }
      }) }]),
      rpSo.root);

    /* --- 消息发送（逐跳时延；投递失败 = 非 0 code + data 留痕行，原始 JSON 详情可见） --- */
    var rpMs = P.resultPanel();
    var fMs = P.form([
      { name: 'session_id', label: '会话号', type: 'text', required: true, value: slotS ? slotS.id : '',
        placeholder: 'SESS-…（点上方会话行或新建会话自动预填）' },
      { name: 'msg_type', label: '消息类型', type: 'select', required: true, value: 'POSITION_UPDATE',
        options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT'] },
      { name: 'source_node', label: '源节点', type: 'text', required: true, value: 'UAV-A-001-NODE' },
      { name: 'target_node', label: '目标节点', type: 'text', required: true, value: 'MGR' },
      { name: 'payload', label: '载荷（可选，JSON 对象）', type: 'textarea', rows: 2,
        placeholder: '{"lat":30.52,"lon":114.32}' }
    ]);
    var msCard = card('消息发送 message/send（会话须 ACTIVE；对 CLOSED 会话发送 → 4002 设计内）',
      fMs.root,
      P.actionBar([{ label: '发送', kind: 'primary', run: P.runOp({
        path: '/api/message/send',
        body: function () {
          var v = PORTAL.need(fMs.read(), 'session_id', 'msg_type', 'source_node', 'target_node');
          if (!v) return null;
          var body = { session_id: v.session_id, msg_type: v.msg_type,
            source_node: v.source_node, target_node: v.target_node };
          if (v.payload) {
            try { body.payload = JSON.parse(v.payload); }
            catch (e) { UI.toast('载荷不是合法 JSON：' + e.message, 'err', 5200); return null; }
          }
          return body;
        },
        rp: rpMs, successText: '消息已发送',
        render: function (d) {
          var m = d.message;
          return h('div', {},
            P.kv([
              ['消息号', h('code', { class: 'p-mono' }, UI.trunc(m.message_id, 28))],
              ['类型 / 序号', m.msg_type + ' · seq=' + m.seq],
              ['路由', m.source_node + ' → ' + m.target_node],
              ['状态 / 时延', h('span', { class: 'd-row' }, P.badge(m.status),
                (m.latency_ms != null ? m.latency_ms + ' ms' : '—'))],
              ['路径', PORTAL.jp(m.path, []).join(' → ') || '—'],
              ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(m.sm3_hash, 32))]
            ]),
            h('div', { class: 'd-section' }, '逐跳时延 path_detail'),
            P.pathHops(d.path_detail));
        },
        onOk: function () { tblM.reload(); }
      }) }]),
      rpMs.root);

    /* --- 消息台账 + 流量统计（stats 随 list 响应携带，裁决 2：success_rate 是 0..1 小数） --- */
    var statsM = h('div', {});
    var tblM = null;
    tblM = P.dataTable({
      endpoint: '/api/message/list', pageSize: 10,
      filters: [
        { name: 'msg_type', label: '类型', type: 'select',
          options: ['HEARTBEAT', 'POSITION_UPDATE', 'PASS_VERIFY', 'NODE_CHALLENGE', 'ROUTE_STATUS', 'EVENT_REPORT'] },
        { name: 'status', label: '状态', type: 'select', options: ['SUCCESS', 'FAILED'] },
        { name: 'session_id', label: '会话号', type: 'text' }
      ],
      columns: [
        { title: '消息号', render: function (r) { return UI.trunc(r.message_id, 22); }, mono: true },
        { title: '类型', render: function (r) { return P.badge(r.msg_type); } },
        { title: '路由', render: function (r) { return r.source_node + ' → ' + r.target_node; }, mono: true },
        { title: '序号', key: 'seq', num: true },
        { title: '时延(ms)', key: 'latency_ms', num: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '时间', key: 'created_at' }
      ],
      onRow: function (r) { msgDrawer(r); },
      emptyText: '暂无消息'
    });

    async function loadStats() {
      var r = await API.call('/api/message/list', { page: 1, page_size: 1 });
      if (!statsM.isConnected) return;
      statsM.innerHTML = '';
      if (!r.ok) { statsM.append(P.errCard(r)); return; }
      var s = r.data.stats || {};
      statsM.append(P.statCards([
        { label: '消息总数', value: s.count != null ? s.count : '—' },
        { label: '成功数', value: s.success_count != null ? s.success_count : '—' },
        { label: '成功率', value: PORTAL.fmtRate(s.success_rate),
          tone: (s.success_rate != null && s.success_rate < 1) ? 'critical' : 'good' },
        { label: '平均时延', value: s.avg_latency_ms != null ? s.avg_latency_ms + ' ms' : '—' },
        { label: 'p50 / p95',
          value: (s.p50_latency_ms != null ? s.p50_latency_ms : '—') + ' / ' + (s.p95_latency_ms != null ? s.p95_latency_ms : '—'),
          sub: '最大 ' + (s.max_latency_ms != null ? s.max_latency_ms + ' ms' : '—') }
      ]));
    }

    function msgDrawer(m) {
      P.drawer('消息详情 ' + UI.trunc(m.message_id, 24),
        P.kv([
          ['消息号', h('code', { class: 'p-mono' }, m.message_id)],
          ['会话', h('code', { class: 'p-mono' }, m.session_id || '—')],
          ['类型', P.badge(m.msg_type)],
          ['序号 / 时延', 'seq=' + m.seq + ' · ' + (m.latency_ms != null ? m.latency_ms + ' ms' : '—')],
          ['路由', m.source_node + ' → ' + m.target_node],
          ['路径', PORTAL.jp(m.path, []).join(' → ') || '—'],
          ['状态', P.badge(m.status)],
          ['SM3 摘要', h('code', { class: 'p-mono' }, m.sm3_hash || '—')],
          ['时间戳 / 入库', (m.timestamp || '—') + ' / ' + m.created_at]
        ]),
        h('div', { class: 'd-section' }, '存证原文（evidence JSON 字符串：逐跳明细 + 网关代签 proxy_signed + 签名）'),
        UI.jsonBlock(PORTAL.jp(m.evidence, m.evidence), 240));
    }

    box.append(h('div', { class: 'd-grid-2' }, soCard, msCard));
    box.append(card('会话台账 session/list（六态全列：INIT/AUTHENTICATED/ACTIVE/DEGRADED/RECOVERED/CLOSED——裁决 22）', tblS));
    box.append(card('消息台账 message/list（点行看存证原文）',
      P.actionBar([{ label: '加载流量统计', run: loadStats }]),
      statsM, tblM));
  }

  /* ============ 页签 3：攻防演练 ============ */
  function tabDrill(box) {
    var slotS = STORE.get('SESSION');
    var prefill = slotS ? slotS.id : '';

    /* --- 虫洞攻击模拟（enabled 是 *bool binding:required——关闭必须显式发 false） --- */
    var rpWh = P.resultPanel();
    function whRun(enabled) {
      return P.runOp({
        path: '/api/wormhole/toggle',
        body: function () { return { enabled: enabled, operator: 'SecOps' }; },
        rp: rpWh,
        successText: enabled ? '虫洞攻击已开启（NODE-X⇄NODE-Y 隧道边建立）' : '虫洞攻击已关闭',
        render: function (d) {
          return P.kv([
            ['虫洞状态', d.wormhole_enabled ? '⚠ 开启中' : '未开启'],
            ['受影响节点', (d.nodes_affected || []).join('、') || '—']
          ]);
        }
      });
    }
    var whCard = card('虫洞攻击模拟 wormhole/toggle',
      h('p', { class: 'd-small d-muted' }, '开启后 NODE-X⇄NODE-Y 建立伪造隧道边（拓扑图红虚线）。NODE-X/Y 已被 ISOLATED 后再开 → 4001：隔离残留只能 demo/reset 复原（设计内）。'),
      P.actionBar([
        { label: '⚠ 开启虫洞攻击', kind: 'danger',
          confirm: { title: '开启虫洞攻击', msg: '将建立 NODE-X⇄NODE-Y 伪造隧道边；期间新建会话的初始路径可能经过隧道。', ok: '开启' },
          run: whRun(true) },
        { label: '关闭虫洞攻击',
          confirm: { title: '关闭虫洞攻击', msg: '将移除隧道边（已隔离节点的隔离状态保留）。', ok: '关闭' },
          run: whRun(false) }
      ]),
      rpWh.root);

    /* --- 风险评估（5 维评分 + 阈值线） --- */
    var rpRk = P.resultPanel();
    var fRk = P.form([
      { name: 'session_id', label: '会话号', type: 'text', required: true, value: prefill,
        placeholder: 'SESS-…（SESSION 上下文 chip 自动预填）' },
      { name: 'node_x', label: '隧道端点 X（可选）', type: 'text', placeholder: '缺省取会话相关虫洞端点' },
      { name: 'node_y', label: '隧道端点 Y（可选）', type: 'text', placeholder: '缺省取会话相关虫洞端点' }
    ]);
    var rkCard = card('风险评估 risk/evaluate（5 维：身份/邻接/时延/挑战/路径）',
      fRk.root,
      P.actionBar([{ label: '评估风险', kind: 'primary', run: P.runOp({
        path: '/api/risk/evaluate',
        body: function () {
          var v = PORTAL.need(fRk.read(), 'session_id');
          if (!v) return null;
          var body = { session_id: v.session_id };
          if (v.node_x) body.node_x = v.node_x;
          if (v.node_y) body.node_y = v.node_y;
          return body;
        },
        rp: rpRk, successText: '风险评估完成',
        render: function (d) {
          return h('div', {},
            P.statCards([
              { label: '风险分', value: Number(d.risk_score || 0).toFixed(2),
                sub: '阈值 ' + d.threshold,
                tone: d.verdict === 'PASS' ? 'good' : 'critical' },
              { label: '裁定', value: verdictLabel(d.verdict) },
              { label: '会话状态', value: d.session_status || '—' }
            ]),
            P.scoreBars(d.dimensions || {}, d.threshold),
            (d.events || []).length
              ? h('div', {},
                  h('div', { class: 'd-section' }, '联动安全事件（' + d.events.length + '）'),
                  h('div', { class: 'd-col' }, d.events.map(function (ev) {
                    return P.kv([
                      ['事件', h('code', { class: 'p-mono' }, ev.event_id)],
                      ['动作', P.badge(ev.action)],
                      ['隧道端点', ev.node_x + ' ⇄ ' + ev.node_y],
                      ['风险分', Number(ev.risk_score || 0).toFixed(2)],
                      ['时间', ev.created_at]
                    ]);
                  })))
              : P.empty('无联动事件'));
        }
      }) }]),
      rpRk.root,
      h('p', { class: 'd-small d-muted' }, '评估检出攻击时会话可能迁 DEGRADED——用下方「路径切换」恢复（RECOVERED）。'));

    /* --- 路径切换（仅 DEGRADED 会话；健康会话切换被拒 4002 是设计内） --- */
    var rpPs = P.resultPanel();
    var fPs = P.form([
      { name: 'session_id', label: '会话号', type: 'text', required: true, value: prefill },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: 'SecOps' },
      { name: 'new_path', label: '新路径（逗号分隔，可空）', type: 'text',
        placeholder: '留空 = 服务端自动重算避让路径', hint: '如 UAV-A-001-NODE,N1,N2,N3,N4,MGR' }
    ]);
    var psCard = card('路径切换 path/switch（仅 DEGRADED 会话可切换；健康会话 → 4002、无替代路径 → 4004，均设计内）',
      fPs.root,
      P.actionBar([{ label: '切换路径', kind: 'primary',
        confirm: { title: '切换路径', msg: '将重算避让路径并产生 RECOVER 安全事件（会话 → RECOVERED）。', ok: '切换' },
        run: P.runOp({
          path: '/api/path/switch',
          body: function () {
            var v = PORTAL.need(fPs.read(), 'session_id', 'operator');
            if (!v) return null;
            var body = { session_id: v.session_id, operator: v.operator };
            if (v.new_path) body.new_path = String(v.new_path).split(/[,，]/)
              .map(function (s) { return s.trim(); }).filter(Boolean);
            return body;
          },
          rp: rpPs, successText: '路径切换成功（会话 → RECOVERED）',
          render: function (d) {
            return P.kv([
              ['会话状态', P.badge(d.session ? d.session.status : '—')],
              ['原路径', pathText(d.original_path)],
              ['新路径', pathText(d.new_path)],
              ['恢复时延', d.recovery_latency_ms != null ? d.recovery_latency_ms + ' ms' : '—'],
              ['恢复事件', d.event ? (d.event.event_id + ' · ' + d.event.action) : '—']
            ]);
          },
          note: { kind: 'SESSION', id: function (d) { return (d.session && d.session.session_id) || ''; } }
        }) }]),
      rpPs.root);

    /* --- 安全事件台账 --- */
    var tblEv = P.dataTable({
      endpoint: '/api/event/list', pageSize: 10,
      filters: [
        { name: 'action', label: '动作', type: 'select', options: ['DETECT', 'ISOLATE', 'RECOVER'] },
        { name: 'session_id', label: '会话号', type: 'text' }
      ],
      columns: [
        { title: '事件号', render: function (r) { return UI.trunc(r.event_id, 22); }, mono: true },
        { title: '动作', render: function (r) { return P.badge(r.action); } },
        { title: '隧道端点', render: function (r) { return r.node_x + ' ⇄ ' + r.node_y; }, mono: true },
        { title: '风险分', render: function (r) { return Number(r.risk_score || 0).toFixed(2); }, num: true },
        { title: '恢复时延(ms)', render: function (r) { return r.recovery_latency_ms != null ? r.recovery_latency_ms : '—'; }, num: true },
        { title: '会话', render: function (r) { return UI.trunc(r.session_id || '—', 20); }, mono: true },
        { title: '时间', key: 'created_at' }
      ],
      onRow: function (r) {
        P.drawer('安全事件 ' + r.event_id,
          P.kv([
            ['动作', P.badge(r.action)],
            ['隧道端点', r.node_x + ' ⇄ ' + r.node_y],
            ['风险分', Number(r.risk_score || 0).toFixed(2)],
            ['会话', h('code', { class: 'p-mono' }, r.session_id || '—')],
            ['原路径', pathText(r.original_path)],
            ['新路径', pathText(r.new_path)],
            ['恢复时延', r.recovery_latency_ms != null ? r.recovery_latency_ms + ' ms' : '—'],
            ['时间', r.created_at]
          ]));
      },
      emptyText: '暂无安全事件（开启虫洞攻击并评估风险后出现）'
    });

    box.append(h('div', { class: 'd-grid-2' }, whCard, rkCard));
    box.append(psCard);
    box.append(card('安全事件台账 event/list（DETECT 检出 / ISOLATE 隔离节点 / RECOVER 路径恢复）', tblEv));
  }

  /* ============ 页签 4：性能实验 ============ */
  function tabExp(box) {
    var EXP_TYPES = ['CROSSCHAIN_LOOP', 'SM3_INTEGRITY', 'SM9_VERIFY', 'CONFLICT_DETECT',
      'MESSAGE_FLOW', 'RISK_SCAN', 'STRESS', 'TRACE_BATCH',
      'INSPECT_UNAUTHORIZED', 'INSPECT_AUTHORIZED', 'ALERT_BATCH'];

    var rpEx = P.resultPanel();
    var fEx = P.form([
      { name: 'experiment_type', label: '实验类型', type: 'select', required: true, value: 'SM3_INTEGRITY',
        options: EXP_TYPES },
      { name: 'count', label: '次数（1-1000）', type: 'number', required: true, value: 5 },
      { name: 'scenario', label: '场景', type: 'select', value: '',
        options: [['', '（留空——仅 MESSAGE_FLOW 必选）'], ['NORMAL', 'NORMAL 正常'],
          ['ATTACK', 'ATTACK 攻击'], ['DEFENSE', 'DEFENSE 防御']],
        hint: '双向严格：MESSAGE_FLOW 必填 NORMAL/ATTACK/DEFENSE，其余类型必须留空（传了 → 6002）' },
      { name: 'concurrency', label: '并发（可选，1-20）', type: 'number', placeholder: '缺省串行' }
    ]);
    var tblEx = null;

    var runCard = card('运行实验 experiment/run（11 类）',
      fEx.root,
      P.actionBar([{ label: '运行实验', kind: 'primary', run: P.runOp({
        path: '/api/experiment/run',
        body: function () {
          var v = PORTAL.need(fEx.read(), 'experiment_type', 'count');
          if (!v) return null;
          var body = { experiment_type: v.experiment_type, count: Number(v.count) };
          if (v.experiment_type === 'MESSAGE_FLOW') {
            if (!v.scenario) {
              UI.toast('MESSAGE_FLOW 必须选择场景（NORMAL/ATTACK/DEFENSE），否则 6002', 'err', 5200);
              return null;
            }
            body.scenario = v.scenario;
          }
          /* 非 MESSAGE_FLOW 一律不发 scenario（双向严格：传了也 6002） */
          if (v.concurrency !== undefined) body.concurrency = Number(v.concurrency);
          return body;
        },
        rp: rpEx, successText: '实验完成',
        render: function (d) { return expView(d); },
        onOk: function () { if (tblEx) tblEx.reload(); }
      }) }]),
      rpEx.root,
      h('p', { class: 'd-small d-muted' }, 'MESSAGE_FLOW × ATTACK 场景低成功率不是故障——是虫洞检测在生效（设计内）；失败原因按「原因×次数」聚合展示。'));

    /* 导出过滤表单：experiment/export 过滤键只有 experiment_type/status（裁决 24：无 run_id） */
    var fEx2 = P.form([
      { name: 'experiment_type', label: '导出类型过滤', type: 'select', value: '',
        options: [['', '全部类型']].concat(EXP_TYPES) },
      { name: 'status', label: '导出状态过滤', type: 'select', value: '',
        options: [['', '全部状态'], 'DONE', 'FAILED'] }
    ]);

    tblEx = P.dataTable({
      endpoint: '/api/experiment/list', pageSize: 10,
      filters: [
        { name: 'experiment_type', label: '类型', type: 'select', options: EXP_TYPES },
        { name: 'status', label: '状态', type: 'select', options: ['DONE', 'FAILED'] }
      ],
      columns: [
        { title: 'Run ID', render: function (r) { return UI.trunc(r.run_id, 20); }, mono: true },
        { title: '类型', render: function (r) { return P.badge(r.experiment_type); } },
        { title: '场景', render: function (r) { return r.scenario || '—'; } },
        { title: '次数', key: 'count', num: true },
        { title: '成功率', render: function (r) { return PORTAL.fmtRate(r.success_rate); }, num: true },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '开始时间', key: 'started_at' },
        { title: '操作', render: function (r) {
          return h('button', { class: 'p-btn p-btn-sm p-btn-ghost',
            onClick: function (e) { e.stopPropagation(); openExp(r.run_id); } }, '结果');
        } }
      ],
      onRow: function (r) { openExp(r.run_id); },
      emptyText: '暂无实验记录'
    });

    box.append(runCard);
    box.append(card('实验台账 experiment/list（CSV 导出过滤键仅 experiment_type/status——裁决 24）',
      h('div', { class: 'd-row d-row-wrap' }, fEx2.root,
        P.csvExport({ endpoint: '/api/experiment/export',
          filters: function () { return fEx2.read(); },
          filename: 'experiments.csv', label: '⤓ 导出 CSV（experiment/export）' })),
      tblEx));
  }

  /* ExperimentRun（17 键）统一视图：统计卡 + 时延分位 kv + 失败原因（run 回执与 result 抽屉共用） */
  function expView(d) {
    return h('div', {},
      P.statCards([
        { label: '成功率', value: PORTAL.fmtRate(d.success_rate),
          tone: d.success_rate >= 1 ? 'good' : 'critical' },
        { label: '次数', value: d.count,
          sub: '成功 ' + d.success_count + ' / 失败 ' + d.failed_count },
        { label: '状态', value: d.status === 'DONE' ? '✓ DONE' : '✗ FAILED',
          tone: d.status === 'DONE' ? 'good' : 'critical' }
      ]),
      P.kv([
        ['实验编号', h('code', { class: 'p-mono' }, d.experiment_id)],
        ['Run ID', h('code', { class: 'p-mono' }, d.run_id)],
        ['类型 / 场景', d.experiment_type + (d.scenario ? ' · ' + d.scenario : '')],
        ['时延 avg/p50/p95/max', [d.avg_latency_ms, d.p50_latency_ms, d.p95_latency_ms, d.max_latency_ms]
          .map(function (x) { return x != null ? x + 'ms' : '—'; }).join(' / ')],
        ['失败原因', fmtReasons(d.failure_reasons)],
        ['开始 / 完成', d.started_at + ' → ' + (d.completed_at || '—')]
      ]));
  }

  /* 实验结果抽屉：experiment/result（run_id required；6002 = run_id 不存在） */
  async function openExp(runId) {
    var d = P.drawer('实验结果 ' + runId, h('div', { class: 'p-empty' }, '⏳ experiment/result 查询中…'));
    var body = d.root.querySelector('.p-drawer-body');
    var r = await API.call('/api/experiment/result', { run_id: runId });
    body.innerHTML = '';
    if (!r.ok) { body.append(P.errCard(r)); return; }
    var x = r.data;
    body.append(expView(x));
    body.append(h('div', { class: 'd-section' }, '配置原文（config JSON 字符串）'));
    body.append(UI.jsonBlock(PORTAL.jp(x.config, x.config), 200));
  }

  AU.netsec = { render: render };
})();
```

- [ ] **Step 4: 修改 `frontend/authority.html`——在 records.js 与 shell-au.js 之间插入三行**

Edit（old_string → new_string）：

old_string:
```html
<script src="js/pages/au/records.js"></script>
<script src="js/shell-au.js"></script>
```

new_string:
```html
<script src="js/pages/au/records.js"></script>
<script src="js/pages/au/registry.js"></script>
<script src="js/pages/au/masterdata.js"></script>
<script src="js/pages/au/netsec.js"></script>
<script src="js/shell-au.js"></script>
```

顺序说明：三页共享 `window.AU_PAGES`，先页面后 shell（shell-au.js 读注册表）；registry→masterdata→netsec 与导航项顺序一致。

- [ ] **Step 5: 静态断言（语法 + 惯例 + 红线 + 脚本顺序）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
node --check js/pages/au/registry.js && node --check js/pages/au/masterdata.js && node --check js/pages/au/netsec.js && echo SYNTAX_OK   # 预期 SYNTAX_OK
grep -c 'AU.registry = { render' js/pages/au/registry.js      # 预期 1
grep -c 'AU.masterdata = { render' js/pages/au/masterdata.js  # 预期 1
grep -c 'AU.netsec = { render' js/pages/au/netsec.js          # 预期 1
grep -c 'P.chipBar(' js/pages/au/registry.js js/pages/au/masterdata.js js/pages/au/netsec.js   # 预期全 0（惯例③：chipBar 仅 shell 单例）
grep -rn 'tk=' js/pages/au/registry.js js/pages/au/masterdata.js js/pages/au/netsec.js; echo "TK_EXIT=$?"   # 预期无输出 + TK_EXIT=1（红线：天地图 key 不入源码）
grep -c 'SM9-ID-FISCO-ADMIN' js/pages/au/registry.js          # 预期 1（管理端验签方身份 = crypto.SM9IdentityOf("FISCO-ADMIN")）
grep -c "'SecOps'" js/pages/au/netsec.js                      # 预期 ≥3（会话关闭/虫洞/路径切换 operator 惯例）
grep -c 'enabled: enabled' js/pages/au/netsec.js              # 预期 1（wormhole/toggle 显式 bool——关闭必须发 false）
grep -c 'MESSAGE_FLOW' js/pages/au/netsec.js                  # 预期 ≥3（scenario 双向严格守卫）
grep -c 'ATTACKER' js/pages/au/netsec.js                      # 预期 ≥3（管理端全量可见——Task 8 运营端过滤惯例的反面）
grep -c 'ATTACKER' js/pages/au/registry.js js/pages/au/masterdata.js   # 预期全 0（非安全页不涉及）
grep -c '半套' js/pages/au/masterdata.js                      # 预期 ≥1（坐标半套视为缺失前端守卫，commit 50c4a03 语义）
grep -c 'run_id' js/pages/au/netsec.js                        # 预期 ≥1（experiment/result 查询键）
awk '/records\.js/{q=NR} /registry\.js/{r=NR} /masterdata\.js/{s=NR} /netsec\.js/{t=NR} /shell-au\.js/{u=NR} END{if(q>0&&q<r&&r<s&&s<t&&t<u)print "ORDER_OK";else print "ORDER_BAD"}' authority.html   # 预期 ORDER_OK
```

- [ ] **Step 6: 冒烟——静态服务 200（后端 :8080 是生产实例，禁止触碰；BACKEND 指死端口即可，静态文件不经过代理）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
PORT=18099 BACKEND=http://127.0.0.1:1 python3 ../scripts/serve-frontend.py >/tmp/planB-t10-smoke.log 2>&1 & SRV=$!
sleep 1
for p in authority.html js/pages/au/registry.js js/pages/au/masterdata.js js/pages/au/netsec.js; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18099/$p)"   # 预期各 200
done
kill $SRV 2>/dev/null; wait $SRV 2>/dev/null; echo SMOKE_DONE
```

- [ ] **Step 7: 记录 DEFERRED-HUMAN 清单（浏览器人工验收项，追加到任务报告）**

```
【计划 B Task 10 DEFERRED-HUMAN】（浏览器访问 http://127.0.0.1:8090/authority.html，天地图 key 已存 localStorage）
- #/registry：实名主体台账类型过滤（ENTERPRISE/INDIVIDUAL）；点主体行 → 右侧 7 行详情 + 「模拟证件号」免责声明；执照台账类别过滤（多旋翼）；点执照行或「详情」按钮 → 8 行详情 + 「SM9 验签」按钮 → 统计卡「✓ 通过」（绿）+ 七键验签材料 JSON 块；验签失败时统计卡「✗ 未通过」（红）。
- #/masterdata：地图单击两次 → 「起」「止」蓝点标记 + 四坐标自动回填（6 位小数）；第三次单击 → 标记清除、坐标清空；只填两个坐标提交 → toast「坐标半套视为缺失」拦截不发请求；四坐标齐全提交 → 回执 kv 起终坐标非零 + ROUTE 上下文 chip + 台账/地图刷新（新航段高亮）；台账行点击 → 地图高亮 + fitPoints；「重置地图选点」→ 状态机归零；厂商/运营商注册 → 各自台账 reload + 对应 chip。
- #/netsec?tab=topo：4 统计卡（虫洞未开=绿色「未开启」）；真地图渲染 8 个种子节点全量——NODE-X/NODE-Y 红色 ⚠ ATTACKER 可见（管理端全貌，与运营端过滤相反）、离线空心；注册节点填 lat/lon → 地图刷新新节点可见；不填 lat/lon → 不上图（红线提示文案）；节点台账双过滤器 + ISOLATED 状态过滤。
- #/netsec?tab=traffic：建立会话 → SM9 认证 ✓ + 初始路径「A → B → …」+ SESSION chip；会话行点击 → session_id 预填消息表单；发送 POSITION_UPDATE → 消息 kv + 逐跳时延条；「关闭」按钮 → 确认框 → 行 badge CLOSED + 按钮 disabled；对 CLOSED 会话再发消息 → 4002 errCard（设计内）；「加载流量统计」→ 5 统计卡（成功率 = 小数×100 保留 1 位，非 100% 时红色）。
- #/netsec?tab=drill：「⚠ 开启虫洞攻击」→ danger 确认框 → 回执受影响节点列表；切到 topo 页签 → NODE-X⇄NODE-Y 红虚线 + 中点 ⚠（页签切换重渲染后加载）；建会话后「评估风险」→ 裁定标签 + 5 维评分条 + 阈值线 + 联动事件；对健康会话「切换路径」→ 4002 errCard（设计内）；会话 DEGRADED 后切换 → RECOVERED + 原/新路径 + 恢复时延 + RECOVER 事件；事件台账行点击 → 抽屉含原/新路径。
- #/netsec?tab=exp：SM3_INTEGRITY × 5 → 3 统计卡 + 时延 avg/p50/p95/max + run_id；MESSAGE_FLOW 不选场景 → toast 拦截不发请求；MESSAGE_FLOW × ATTACK → 低成功率（红色，检测生效——设计内）+ 失败原因「原因×次数」；台账「结果」按钮/行点击 → 抽屉 experiment/result + config JSON；CSV 导出（选类型过滤后）→ experiments.csv 下载带 BOM、Excel 中文不乱码。
```

- [ ] **Step 8: Commit**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/pages/au/registry.js frontend/js/pages/au/masterdata.js frontend/js/pages/au/netsec.js frontend/authority.html
git commit -m "$(cat <<'MSG'
feat(frontend): 管理当局端 II——登记与资质/主数据维护/链网安全运营三页，管理端 6 页齐（计划 B Task 10）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---

### Task 11: 监管端 I —— cockpit / alerts / trace

**Files:**
- Create: `frontend/js/pages/rg/cockpit.js`（监管驾驶舱：统计带 + 全屏态势地图 C 位）
- Create: `frontend/js/pages/rg/alerts.js`（告警管理：登记 + 状态机推进 + 五维台账）
- Create: `frontend/js/pages/rg/trace.js`（身份追踪：三入口七级时间线 + 5001 断点补渲）
- Modify: `frontend/regulator.html`（在锚点注释与 shell-rg.js 之间插入 3 行 script）

**Interfaces:**
- Consumes:
  - Task 6 页面公共惯例 8 条（`var RG = window.RG_PAGES = window.RG_PAGES || {};` 替代 OP；页面契约 `render(root, ctx)`；惯例③ 从不调 P.chipBar；惯例④ cockpit 是 shell-rg 唯一 mapPage——模块级 `var mx = null`，render 入口必先 `mx.destroy()`；惯例⑤ 轮询=模块 timer + DOM-detach 自清）。
  - `PORTAL.{jp,need}`（Task 5）；`UI.{h,toast,trunc,jsonBlock}`；`API.call`（永不 throw）；`STORE.{get,note}`（ALERT/MISSION 槽位预填）。
  - `MAPX.create(el,{view})→mx{drawZones(routes),drawRoutes(routes,{opacity,active,onPick}),drawNodes(nodes,{onPick}),drawWormholes(edges,nodes),drone(uavId,lat,lon,headingDeg)→bool,removeDrone(uavId),clearDrones(),alertPin(lat,lon,text?,onClick?)→marker|null,clear(kind),setEmpty(text),clearEmpty(),fitPoints(pts),destroy()}`（Task 4 签名逐字）。**alertPin/虫洞边在 marks 层；drone 在独立 `_layers.drones` 层组**（Task 4 评审 I1 修复：`clear('marks')` 不再摘下无人机标记，Produces 契约「省略=全清但不动 drones」成立）；本页 loadBase 仍固化「重绘 marks 前先 `clearDrones()`」顺序——属注册表卫生而非陷阱规避。create 自带 rAF invalidateSize 零尺寸校正（cockpit 地图直挂 root 非 tabs，本就用不到，但无害）。
  - `GEO.{DEFAULT_VIEW,telemetryCoord(t)→[lat,lon]|null,hasCoord(lat,lon),nodeCoord}`（Task 3）。
  - `PUI.{pageHead,tabs 不用,form,dataTable,statCards,hbars([{label,value,tone}]),badge,chainTag(chain),kv,drawer(title,...body)→{root,close},confirm(title,msg,okLabel)→Promise<bool>,actionBar([{label,kind,confirm,run(el)}]),runOp,resultPanel,errCard,empty}`（签名以 pui.js 源码为准，均已核实行号：hbars pui.js:397、chainTag pui.js:34、confirm pui.js:77）。
  - 契约档案（`.git/sdd/planB-endpoint-contracts.md`）§3（Alert 10 键 `{alert_id,created_at,event_type,evidence_hash,mission_id,risk_level,source_system,status,uav_pseudonym,updated_at}`；levels item `{level:1..7,name,value,source,status:RESOLVED|BROKEN,latency_ms,reason(仅断链)}`）、§10（mission/query → Mission 平铺 19 键，route_segments/zones 为 JSON 字符串）、§15（session/list status 六态过滤，裁决 22）、§17（telemetry/latest `{telemetry:null}` code 0 合法=裁决 17；按 session_id 查）、§19（alert/raise 必填 5=uav_pseudonym/event_type/risk_level/source_system/operator——**裁决 8：以后端 binding 为准，不学旧页把 alert_id/mission_id 也列必填**；event_type 封闭 6 枚举；alert/status 线性单步跨级 6002；alert/list 五维过滤）、§20（trace/identity 三入口 `{alert_id}|{pseudo}|{device_address}`+operator*，优先级 alert_id>pseudo>device_address；resp `{entry,entry_type,pseudonym,resolved,break_level,trace_latency_ms,levels[恰7]}`；七级 name 依次 PSEUDO/DEVICE_ADDRESS/PASS_ID/SM9_IDENTITY/UAV_ID/OPERATOR_ID/MANUFACTURER_ID；source L1-4=CHAINMAKER_INDEX、L5-6=FABRIC_DETAIL、L7=FISCO_BCOS_DETAIL；**5001=断链+data 部分 TraceResult 留痕：断点级 BROKEN+reason、后续级 reason='skipped: break at level N'、resolved:false、break_level:N——禁止拼造**）、§26（dashboard/summary body-ignoring → `{alerts:{total,open,identified,traced,reviewed,resolved,archived,high_open,by_type(类型→计数 map)},authorizations:{total,pending,authorized,denied,expired},sessions:{total,init,authenticated,active,degraded,recovered,closed},wormhole_events:{total,detect,isolate,recover},recent_alerts[最新5条完整Alert],generated_at}`——**裁决 1：没有 missions/passes 键**）、§29（alert/raise→note('ALERT', id, {mission_id})；alert/status→note('ALERT', id)；**trace note:null 明确不落 STORE**）。
  - Global Constraints #7（rg 深藏青大屏，告警红/黄语义色——by_type hbars 用 tone:'critical'）、#9（不造假坐标：告警落点解析链任一环缺失即跳过不画）、#13（拒绝类错误中性展示，无「◈ 预期」徽章）。
- Produces（Task 12 依赖）:
  - 脚本顺序：cockpit → alerts → trace →（Task 12：authz → inspect → audit → crypto）→ shell-rg.js。
  - **监管端 operator 惯例**：operator/regulator_id 恒 `'REG-01'`、reviewer_id 恒 `'REG-ADMIN'`（Task 12 authz/inspect 表单默认值沿用）。
  - alerts.js 导出 `RG.alerts = { render: render, alertKv: alertKv, alertDrawer: alertDrawer }`——cockpit 复用 alertKv/alertDrawer 渲染告警（零重复；cockpit 脚本序在前，但引用发生在运行时点击回调，届时 alerts.js 已加载）。`alertDrawer(a, fSt?)` 第二参可选（仅 alerts 页传入用于「预填推进表单」按钮）。
  - 告警→追踪跳转链：alertDrawer「转七级身份追踪」→ `STORE.note('ALERT', alert_id, {mission_id})` + `location.hash = '#/trace'` → trace render 读 `STORE.get('ALERT').id` 预填入口值。
  - 告警落点坐标解析链（cockpit 私有惯例，红线#9 的落地）：`alert.mission_id → mission/query → route_segments[0] → route/list 缓存查 start_lat/start_lon`，任一环缺失（无 mission/无航段/航段无坐标/坐标为 0）即跳过该落点——不画不猜。
  - 在飞判定：session.status ∈ {ACTIVE, DEGRADED, RECOVERED}（降级停摆的航空器监管端仍要看得见——跨端可见攻击后果，spec 第 5 章）。

- [ ] **Step 1: 写 `frontend/js/pages/rg/cockpit.js`（全文逐字）**

```js
/* cockpit.js — 监管当局端·监管驾驶舱（计划 B Task 11，spec §5.3）
   大屏 C 位布局：dashboard/summary 统计带 + 全屏态势真地图
   （走廊/航段/网络节点全量含 ATTACKER/虫洞伪造边/在飞无人机遥测/告警落点·点击→详情卡）
   + 告警类型分布 hbars + 最近告警（复用 alerts.js 的 alertKv/alertDrawer——脚本序 cockpit 在前，
   引用发生在运行时回调，届时已加载）。
   监管端信息边界：ATTACKER 节点与虫洞边全量可见（监管视角必须看到全貌）。
   告警落点坐标解析链（红线：任一环缺失即跳过，不画不猜）：
   alert.mission_id → mission/query → route_segments[0] → route 缓存 → start_lat/start_lon。
   在飞无人机 = session 状态 ∈ ACTIVE|DEGRADED|RECOVERED → telemetry/latest(session_id) → mx.drone；
   {telemetry:null}（裁决 17）= 暂无遥测跳过；坐标未设不画。
   marks 层重绘惯例：告警 pin/虫洞边在 marks 层；drone 在独立 drones 层组
   （clear/clear('marks') 均不触碰——Task 4 评审 I1 修复后）；重绘前先 clearDrones() 属注册表卫生。
   端点：dashboard/summary、route/list、topology/get、session/list、telemetry/latest、mission/query。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var mx = null;      /* 态势地图（shell-rg 唯一 mapPage）：render 入口必先 destroy */
  var poll = null;    /* 惯例⑤：模块级 timer，DOM 脱离后自清 */
  var POLL_MS = 5000;
  var FLYING = { ACTIVE: 1, DEGRADED: 1, RECOVERED: 1 };   /* 在飞状态（含降级——攻击后果跨端可见） */

  function render(root, ctx) {
    if (mx) { mx.destroy(); mx = null; }
    if (poll) { clearInterval(poll); poll = null; }

    var routes = [];      /* route/list 缓存（告警落点解析依赖） */
    var sessions = [];    /* 在飞会话缓存 */
    var lastSeen = {};    /* 上轮在图无人机（demo/reset 后同步清图标） */
    var busy = false;

    var statsBox = h('div', {}, P.empty('⏳ dashboard/summary 加载中…'));
    var hbarsBox = h('div', {}, P.empty('—'));
    var recentBox = h('div', {}, P.empty('—'));
    var pinBox = h('div', {}, P.empty('点击地图上的告警落点查看详情'));
    var genEl = h('span', { class: 'd-small d-muted' }, '');
    var flyingEl = h('b', {}, '0');
    var autoEl = h('input', { type: 'checkbox', checked: true });
    var mapEl = h('div', { class: 'd-map d-map-xl' });

    root.append(P.pageHead({
      title: '监管驾驶舱',
      sub: '跨域态势大屏 — 统计带 + 态势真地图（航线/节点/虫洞边/在飞无人机/告警落点）' }));
    root.append(statsBox);
    root.append(h('div', { class: 'd-toolbar' },
      h('label', { class: 'd-small' }, autoEl, ' 自动刷新(5s)'),
      h('button', { class: 'p-btn', onClick: function () { loadAll(); } }, '立即刷新'),
      h('span', { class: 'd-spacer' }),
      h('span', { class: 'd-small d-muted' }, '在飞：'), flyingEl, h('span', { class: 'd-small d-muted' }, ' 架'),
      genEl));
    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' }, mapEl,
        h('div', { class: 'd-map-hint' }, '✈️ = 在飞无人机（朝向=遥测 heading）；红虚线 = 虫洞伪造边；红色落点 = 告警（点击→详情卡）。ATTACKER 节点监管端全量可见。自动刷新只拉遥测（轻量）；统计/落点随「立即刷新」更新。无遥测或坐标未设的航空器不画——不猜测。')),
      h('div', { class: 'd-col' },
        card('告警类型分布 by_type', hbarsBox),
        card('最近告警 recent_alerts（前 5）', recentBox),
        card('告警落点详情', pinBox))));

    mx = MAPX.create(mapEl, { view: GEO.DEFAULT_VIEW });
    loadAll();
    setPoll(true);

    autoEl.addEventListener('change', function () { setPoll(autoEl.checked); });

    function setPoll(on) {
      if (poll) { clearInterval(poll); poll = null; }
      if (on) poll = setInterval(tick, POLL_MS);
    }

    async function loadAll() {
      await loadBase();      /* 先基础层（会清 marks），再落点（画进 marks）——顺序不可反 */
      await loadSummary();
    }

    /* 轻量轮询：只拉在飞无人机遥测（summary/落点走「立即刷新」） */
    async function tick() {
      if (!document.body.contains(mapEl)) { if (poll) { clearInterval(poll); poll = null; } return; }
      if (busy || !sessions.length) return;
      busy = true;
      try {
        var res = await Promise.all(sessions.map(function (s) {
          return API.call('/api/telemetry/latest', { session_id: s.session_id });
        }));
        var seen = {};
        res.forEach(function (r, i) {
          var s = sessions[i];
          if (!r.ok || !r.data || !r.data.telemetry) return;   /* 裁决 17：null = 暂无遥测，正常 */
          var t = r.data.telemetry;
          var c = GEO.telemetryCoord(t);
          if (!c) return;                                       /* 红线：坐标未设不画 */
          seen[s.uav_id] = true;
          if (mx) mx.drone(s.uav_id, c[0], c[1], t.heading);
        });
        Object.keys(lastSeen).forEach(function (id) {
          if (!seen[id] && mx) mx.removeDrone(id);
        });
        lastSeen = seen;
        flyingEl.textContent = String(Object.keys(seen).length);
      } finally { busy = false; }
    }

    /* 基础层：航段+走廊 / 拓扑全量（节点含 ATTACKER + 虫洞边）/ 在飞会话 → 立即画一轮无人机 */
    async function loadBase() {
      var rr = await API.call('/api/route/list', { page: 1, page_size: 200 });
      if (rr.ok) {
        routes = rr.data.records || [];
        if (mx) {
          mx.clear('zones'); mx.clear('routes');
          mx.drawZones(routes);
          mx.drawRoutes(routes, { opacity: 0.8 });
          if (!routes.length) mx.setEmpty('无航段数据——demo/init 灌种后出现');
          else mx.clearEmpty();
        }
      }
      var tr = await API.call('/api/topology/get', {});
      var sr = await API.call('/api/session/list', { page: 1, page_size: 200 });
      if (sr.ok) {
        sessions = (sr.data.records || []).filter(function (s) { return FLYING[s.status]; });
      }
      if (mx) {
        /* 顺序固化：clearDrones 清 drones 层组+注册表，再清 nodes/marks（告警 pin/虫洞边在 marks），tick() 重建 */
        mx.clearDrones();
        mx.clear('nodes'); mx.clear('marks');
        if (tr.ok) {
          mx.drawWormholes(tr.data.edges || [], tr.data.nodes || []);
          mx.drawNodes(tr.data.nodes || []);
        }
      }
      lastSeen = {};
      await tick();   /* 若恰逢轮询在途（busy）会早退——下一轮 interval（≤5s）自愈重建图标 */
    }

    async function loadSummary() {
      var r = await API.call('/api/dashboard/summary', {});
      if (!statsBox.isConnected) return;
      statsBox.innerHTML = '';
      if (!r.ok) { statsBox.append(P.errCard(r)); return; }
      var d = r.data;
      statsBox.append(P.statCards([
        { label: '告警 · 待处置', value: d.alerts.open,
          sub: '高危未决：' + d.alerts.high_open,
          tone: d.alerts.high_open > 0 ? 'critical' : null },
        { label: '告警 · 总数', value: d.alerts.total,
          sub: '认定 ' + d.alerts.identified + ' · 已追踪 ' + d.alerts.traced + ' · 已办结 ' + d.alerts.resolved },
        { label: '监管授权', value: d.authorizations.authorized,
          sub: '待审 ' + d.authorizations.pending + ' · 拒绝 ' + d.authorizations.denied + ' · 过期 ' + d.authorizations.expired,
          tone: d.authorizations.pending > 0 ? 'warning' : null },
        { label: '会话 · 活跃', value: d.sessions.active,
          sub: '降级 ' + d.sessions.degraded + ' · 恢复 ' + d.sessions.recovered + ' · 关闭 ' + d.sessions.closed,
          tone: d.sessions.degraded > 0 ? 'warning' : null },
        { label: '虫洞事件', value: d.wormhole_events.total,
          sub: '检出 ' + d.wormhole_events.detect + ' · 隔离 ' + d.wormhole_events.isolate + ' · 恢复 ' + d.wormhole_events.recover,
          tone: d.wormhole_events.detect > 0 ? 'critical' : null }
      ]));
      genEl.textContent = '汇总生成：' + (d.generated_at || '—');

      /* 告警类型分布（by_type map → hbars 数组；红黄语义 Global Constraints #7） */
      var bt = d.alerts.by_type || {};
      var keys = Object.keys(bt);
      hbarsBox.innerHTML = '';
      hbarsBox.append(keys.length
        ? P.hbars(keys.map(function (k) { return { label: k, value: bt[k], tone: 'critical' }; }))
        : P.empty('暂无告警'));

      /* 最近 5 条告警（复用 alerts.js 的抽屉） */
      var rec = d.recent_alerts || [];
      recentBox.innerHTML = '';
      recentBox.append(rec.length
        ? h('div', { class: 'd-col' }, rec.map(function (a) {
            return h('button', { class: 'p-btn p-btn-ghost d-row',
              onClick: function () { RG.alerts.alertDrawer(a); } },
              h('code', { class: 'p-mono d-small' }, UI.trunc(a.alert_id, 20)),
              P.badge(a.risk_level), P.badge(a.status));
          }))
        : P.empty('暂无告警'));

      await drawPins(rec);
    }

    /* 告警落点：坐标解析链任一环缺失即跳过（红线#9：不画不猜） */
    async function drawPins(alerts) {
      if (!mx) return;
      var byId = {};
      routes.forEach(function (rt) { byId[rt.route_id] = rt; });
      for (var i = 0; i < alerts.length; i++) {
        var a = alerts[i];
        if (!a.mission_id) continue;
        var mr = await API.call('/api/mission/query', { mission_id: a.mission_id });
        if (!mr.ok || !mr.data) continue;
        var segs = PORTAL.jp(mr.data.route_segments, []);
        if (!Array.isArray(segs) || !segs.length) continue;
        var rt = byId[segs[0]];
        if (!rt) continue;
        var lat = Number(rt.start_lat), lon = Number(rt.start_lon);
        if (!GEO.hasCoord(lat, lon)) continue;
        (function (al, la, lo) {
          mx.alertPin(la, lo, al.alert_id + ' · ' + al.event_type, function () { showPin(al); });
        })(a, lat, lon);
      }
    }

    function showPin(a) {
      if (!pinBox.isConnected) return;
      pinBox.innerHTML = '';
      pinBox.append(RG.alerts.alertKv(a),
        P.actionBar([{ label: '详情与追踪 →', run: function () { RG.alerts.alertDrawer(a); } }]));
    }
  }

  RG.cockpit = { render: render };
})();
```

- [ ] **Step 2: 写 `frontend/js/pages/rg/alerts.js`（全文逐字）**

```js
/* alerts.js — 监管当局端·告警管理（计划 B Task 11，spec §5.3）
   alert/raise 登记（event_type 封闭 6 枚举；必填 5 项——裁决 8：以后端 binding 为准，
   不学旧页把 alert_id/mission_id 也列为必填）
   + alert/status 线性状态机单步推进（OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED；
   跨级/重复推进 6002 设计内）
   + alert/list 五维过滤台账（行点击 → 抽屉 + 推进表单预填 + 转追踪入口）。
   库中只存伪名+证据摘要（匿名化）——真实身份走「身份追踪」七级跨链解析。
   监管端 operator 惯例：恒 'REG-01'。
   导出 RG.alerts.{alertKv,alertDrawer} 供 cockpit.js 复用（运行时引用，脚本序无关）。
   端点：alert/raise、alert/status、alert/list。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var EVENT_TYPES = ['ROUTE_DEVIATION', 'INVALID_PASS', 'UNKNOWN_NODE_ACCESS',
    'MISSION_MISMATCH', 'WORMHOLE_ALERT', 'IDENTITY_ANOMALY'];
  var STATUSES = ['OPEN', 'IDENTIFIED', 'TRACED', 'REVIEWED', 'RESOLVED', 'ARCHIVED'];

  function render(root, ctx) {
    var slotA = STORE.get('ALERT');
    root.append(P.pageHead({
      title: '告警管理',
      sub: '登记 → 线性状态机推进 → 五维台账（匿名化：库中只有伪名与证据摘要）' }));

    /* --- 告警登记 --- */
    var rpRa = P.resultPanel();
    var fRa = P.form([
      { name: 'uav_pseudonym', label: '航空器伪名', type: 'text', required: true,
        placeholder: 'PSEUDO-UAV-83921',
        hint: '对外只暴露伪名；真实身份经「身份追踪」七级解析' },
      { name: 'event_type', label: '事件类型', type: 'select', required: true, value: 'WORMHOLE_ALERT',
        options: EVENT_TYPES,
        hint: '封闭 6 枚举（非法值 6002）' },
      { name: 'risk_level', label: '风险等级', type: 'select', required: true, value: 'HIGH',
        options: ['LOW', 'MEDIUM', 'HIGH'] },
      { name: 'source_system', label: '来源系统', type: 'select', required: true, value: 'MANUAL',
        options: ['SYSTEM1', 'SYSTEM2', 'SYSTEM3', 'MANUAL'],
        hint: 'SYSTEM1=任务协同 SYSTEM2=链下攻防 SYSTEM3=密文核查 MANUAL=人工登记' },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: 'REG-01' },
      { name: 'alert_id', label: '告警号（可选）', type: 'text', placeholder: '留空自动生成 ALERT-…' },
      { name: 'mission_id', label: '关联任务（可选）', type: 'text',
        value: (slotA && slotA.extra && slotA.extra.mission_id) || '' },
      { name: 'evidence_hash', label: '证据摘要（可选）', type: 'text',
        placeholder: '64 位 hex；缺省服务端派生 SM3' },
      { name: 'wormhole_event_id', label: '虫洞事件号（可选）', type: 'text',
        placeholder: '仅 WORMHOLE_ALERT 有意义' }
    ]);
    var tblAl = null;
    var raiseCard = card('告警登记 alert/raise',
      fRa.root,
      P.actionBar([{ label: '登记告警', kind: 'primary', run: P.runOp({
        path: '/api/alert/raise',
        body: function () {
          var v = PORTAL.need(fRa.read(), 'uav_pseudonym', 'event_type', 'risk_level', 'source_system', 'operator');
          if (!v) return null;
          var body = { uav_pseudonym: v.uav_pseudonym, event_type: v.event_type,
            risk_level: v.risk_level, source_system: v.source_system, operator: v.operator };
          ['alert_id', 'mission_id', 'evidence_hash', 'wormhole_event_id'].forEach(function (k) {
            if (v[k]) body[k] = v[k];
          });
          return body;
        },
        rp: rpRa, successText: '告警已登记（status=OPEN）',
        render: function (d) { return alertKv(d); },
        note: { kind: 'ALERT', id: function (d) { return d.alert_id; },
          extra: function (d) { return { mission_id: d.mission_id }; } },
        onOk: function (d) {
          fSt.set('alert_id', d.alert_id);      /* 推进表单无缝预填 */
          if (tblAl) tblAl.reload();
        }
      }) }]),
      rpRa.root);

    /* --- 状态机推进 --- */
    var rpSt = P.resultPanel();
    var fSt = P.form([
      { name: 'alert_id', label: '告警号', type: 'text', required: true,
        value: slotA ? slotA.id : '', placeholder: 'ALERT-…（登记后自动预填）' },
      { name: 'to_status', label: '目标状态（单步）', type: 'select', required: true, value: 'IDENTIFIED',
        options: ['IDENTIFIED', 'TRACED', 'REVIEWED', 'RESOLVED', 'ARCHIVED'] },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: 'REG-01' },
      { name: 'reason', label: '推进理由', type: 'textarea', rows: 2,
        placeholder: '如：初步研判成立，启动跨链追踪',
        hint: '线性单步推进；跨级/重复推进 → 6002（设计内拒绝）' }
    ]);
    var statusCard = card('状态机推进 alert/status（OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED）',
      fSt.root,
      P.actionBar([{ label: '推进状态', kind: 'primary', run: P.runOp({
        path: '/api/alert/status',
        body: function () {
          var v = PORTAL.need(fSt.read(), 'alert_id', 'to_status', 'operator');
          if (!v) return null;
          var body = { alert_id: v.alert_id, to_status: v.to_status, operator: v.operator };
          if (v.reason) body.reason = v.reason;
          return body;
        },
        rp: rpSt, successText: '状态已推进',
        render: function (d) { return alertKv(d); },
        note: { kind: 'ALERT', id: function (d) { return d.alert_id; } },
        onOk: function () { tblAl.reload(); }
      }) }]),
      rpSt.root);

    /* --- 五维台账 --- */
    tblAl = P.dataTable({
      endpoint: '/api/alert/list', pageSize: 10,
      filters: [
        { name: 'event_type', label: '类型', type: 'select', options: EVENT_TYPES },
        { name: 'status', label: '状态', type: 'select', options: STATUSES },
        { name: 'risk_level', label: '风险', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
        { name: 'source_system', label: '来源', type: 'select', options: ['SYSTEM1', 'SYSTEM2', 'SYSTEM3', 'MANUAL'] },
        { name: 'mission_id', label: '任务号', type: 'text' }
      ],
      columns: [
        { title: '告警号', key: 'alert_id', mono: true },
        { title: '伪名', render: function (r) { return UI.trunc(r.uav_pseudonym, 20); }, mono: true },
        { title: '事件类型', render: function (r) { return P.badge(r.event_type); } },
        { title: '风险', render: function (r) { return P.badge(r.risk_level); } },
        { title: '来源', key: 'source_system' },
        { title: '状态', render: function (r) { return P.badge(r.status); } },
        { title: '任务', render: function (r) { return r.mission_id || '—'; } },
        { title: '创建时间', key: 'created_at' }
      ],
      onRow: function (r) { alertDrawer(r, fSt); },
      emptyText: '暂无告警（攻防演练/密文核查触发或手工登记后出现）'
    });

    root.append(h('div', { class: 'd-grid-2' }, raiseCard, statusCard));
    root.append(card('告警台账 alert/list（五维过滤；行点击 → 详情 + 推进预填 + 转追踪）', tblAl));
  }

  /* Alert 10 键完整 kv（cockpit.js 落点详情卡复用） */
  function alertKv(a) {
    return P.kv([
      ['告警号', h('code', { class: 'p-mono' }, a.alert_id)],
      ['事件类型', P.badge(a.event_type)],
      ['风险等级', P.badge(a.risk_level)],
      ['状态', P.badge(a.status)],
      ['来源系统', a.source_system],
      ['航空器伪名', h('code', { class: 'p-mono' }, a.uav_pseudonym)],
      ['关联任务', a.mission_id || '—'],
      ['证据摘要', h('code', { class: 'p-mono' }, UI.trunc(a.evidence_hash, 32))],
      ['创建 / 更新', a.created_at + ' / ' + a.updated_at]
    ]);
  }

  /* 告警抽屉（cockpit.js 最近告警/落点复用；fSt 仅 alerts 页传入 → 多一个「预填推进表单」按钮） */
  function alertDrawer(a, fSt) {
    P.drawer('告警 ' + a.alert_id,
      alertKv(a),
      h('p', { class: 'd-small d-muted' }, '库中只存伪名与证据摘要（匿名化）——真实身份请到「身份追踪」做七级跨链解析。'),
      P.actionBar([
        fSt ? { label: '预填推进表单', run: function () {
          fSt.set('alert_id', a.alert_id);
          UI.toast('已预填，下一步通常是 ' + nextOf(a.status));
        } } : null,
        { label: '转七级身份追踪 →', kind: 'primary', run: function () {
          STORE.note('ALERT', a.alert_id, { mission_id: a.mission_id });
          location.hash = '#/trace';
        } }
      ].filter(Boolean)));
  }

  function nextOf(s) {
    var i = STATUSES.indexOf(s);
    return (i >= 0 && i < STATUSES.length - 1) ? STATUSES[i + 1] : '（已终态）';
  }

  RG.alerts = { render: render, alertKv: alertKv, alertDrawer: alertDrawer };
})();
```

- [ ] **Step 3: 写 `frontend/js/pages/rg/trace.js`（全文逐字）**

```js
/* trace.js — 监管当局端·身份追踪（计划 B Task 11，spec §5.3）
   trace/identity 三入口（告警号/伪名/设备地址）→ 七级跨链身份解析时间线：
   L1 PSEUDO → L2 DEVICE_ADDRESS → L3 PASS_ID → L4 SM9_IDENTITY（以上 CHAINMAKER_INDEX 监管链索引）
   → L5 UAV_ID → L6 OPERATOR_ID（FABRIC_DETAIL 运营链）→ L7 MANUFACTURER_ID（FISCO_BCOS_DETAIL 管理链）。
   断链 5001 特判（spec 吸收旧终审 C14）：errCard 解说 + 其下补渲 data 里的部分时间线——
   断点级 status=BROKEN+reason、后续级 reason='skipped: break at level N'。
   宁可展示断链，也不拼造身份（红线）；「查不到」本身也是可审计的监管结论。
   note:null——追踪结果不落 STORE（契约档案 §29 惯例）。追踪不做授权门禁，但行为被审计（TRACE_IDENTITY）。
   监管端 operator 惯例：恒 'REG-01'。
   端点：trace/identity。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var SOURCE_CHAIN = { CHAINMAKER_INDEX: 'chainmaker', FABRIC_DETAIL: 'fabric', FISCO_BCOS_DETAIL: 'fisco-bcos' };

  function render(root, ctx) {
    var slotA = STORE.get('ALERT');
    var resultBox = h('div', {}, P.empty('选择入口后开始追踪——七级时间线将显示在这里'));

    root.append(P.pageHead({
      title: '身份追踪',
      sub: '伪名 → 七级跨链解析：设备地址 / 通行许可 / SM9 身份 / 航空器 / 运营商 / 厂商' }));

    var fTr = P.form([
      { name: 'entry_type', label: '追踪入口', type: 'select', required: true, value: 'ALERT_ID',
        options: [['ALERT_ID', '告警号（alert_id）'], ['PSEUDO', '航空器伪名（pseudo）'],
          ['DEVICE_ADDRESS', '设备地址（device_address）']],
        hint: '服务端优先级 alert_id > pseudo > device_address（本表单只发单键，不触发多键裁决）' },
      { name: 'entry', label: '入口值', type: 'text', required: true,
        value: slotA ? slotA.id : '',
        placeholder: 'ALERT-2026-… / PSEUDO-UAV-83921 / 0xADDR83921' },
      { name: 'operator', label: '操作方', type: 'text', required: true, value: 'REG-01' }
    ]);

    /* 手写 run（非 runOp）：5001 需要拿 r.data 补渲断点时间线，runOp 的 rp 只渲染成功态 */
    async function doTrace(el) {
      var v = PORTAL.need(fTr.read(), 'entry_type', 'entry', 'operator');
      if (!v) return;
      var body = { operator: v.operator };
      if (v.entry_type === 'ALERT_ID') body.alert_id = v.entry;
      else if (v.entry_type === 'PSEUDO') body.pseudo = v.entry;
      else body.device_address = v.entry;
      el.disabled = true;
      var r = await API.call('/api/trace/identity', body);
      el.disabled = false;
      if (!resultBox.isConnected) return;
      resultBox.innerHTML = '';
      if (r.code === 0) {
        resultBox.append(traceView(r.data));
      } else if (r.code === 5001 && r.data) {
        /* 断链特判：错误解说 + 断点时间线补渲（后端已留痕，前端有义务展示） */
        resultBox.append(P.errCard(r), traceView(r.data));
      } else {
        resultBox.append(P.errCard(r));
      }
      /* note:null——追踪结果不落 STORE（§29） */
    }

    root.append(card('发起追踪 trace/identity（三入口任选其一）',
      fTr.root,
      P.actionBar([{ label: '开始七级追踪', kind: 'primary', run: doTrace }]),
      h('p', { class: 'd-small d-muted' }, '断链（5001）不是失败——「查不到」本身也是可审计的监管结论。追踪行为已写入全局审计（TRACE_IDENTITY / 断链 TRACE_IDENTITY_BROKEN）。')));
    root.append(card('追踪结果（七级时间线）', resultBox));
  }

  function traceView(d) {
    var levels = d.levels || [];
    return h('div', {},
      P.statCards([
        { label: '追踪结论', value: d.resolved ? '✓ 全链可溯' : '⛔ 断链 L' + d.break_level,
          sub: d.resolved ? '七级全部解析（break_level=0）' : '第 ' + d.break_level + ' 级中断——后续级不拼造',
          tone: d.resolved ? 'good' : 'critical' },
        { label: '追踪时延', value: d.trace_latency_ms != null ? d.trace_latency_ms + ' ms' : '—' },
        { label: '解析伪名', value: d.pseudonym || '—' }
      ]),
      P.kv([
        ['入口', h('span', { class: 'd-row' }, P.badge(d.entry_type), h('code', { class: 'p-mono' }, d.entry))],
        ['resolved / break_level', String(d.resolved) + ' / ' + String(d.break_level) + '（0=七级全通）']
      ]),
      h('div', { class: 'd-col' }, levels.map(function (lv) {
        return h('div', { class: 'd-section' },
          h('div', { class: 'd-row' },
            h('b', {}, 'L' + lv.level + ' · ' + lv.name),
            P.badge(lv.status),
            SOURCE_CHAIN[lv.source] ? P.chainTag(SOURCE_CHAIN[lv.source])
              : h('span', { class: 'd-small d-muted' }, lv.source || '—'),
            h('span', { class: 'd-small d-muted' }, lv.latency_ms != null ? lv.latency_ms + ' ms' : '')),
          h('div', { class: 'p-mono d-small' }, lv.value || '—'),
          lv.reason ? h('div', { class: 'd-small d-muted' }, '⛔ ' + lv.reason) : null);
      })));
  }

  RG.trace = { render: render };
})();
```

- [ ] **Step 4: 修改 `frontend/regulator.html`——在锚点注释与 shell-rg.js 之间插入三行**

Edit（old_string → new_string）：

old_string:
```html
<!-- 页面脚本 js/pages/rg/*.js 由 Task 11-12 逐行插入到本注释与 shell 行之间 -->
<script src="js/shell-rg.js"></script>
```

new_string:
```html
<!-- 页面脚本 js/pages/rg/*.js 由 Task 11-12 逐行插入到本注释与 shell 行之间 -->
<script src="js/pages/rg/cockpit.js"></script>
<script src="js/pages/rg/alerts.js"></script>
<script src="js/pages/rg/trace.js"></script>
<script src="js/shell-rg.js"></script>
```

- [ ] **Step 5: 静态断言（语法 + 惯例 + 红线 + 契约关键词）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
node --check js/pages/rg/cockpit.js && node --check js/pages/rg/alerts.js && node --check js/pages/rg/trace.js && echo SYNTAX_OK   # 预期 SYNTAX_OK
grep -c 'RG.cockpit = { render' js/pages/rg/cockpit.js       # 预期 1
grep -c 'RG.alerts = { render' js/pages/rg/alerts.js         # 预期 1
grep -c 'RG.trace = { render' js/pages/rg/trace.js           # 预期 1
grep -c 'P.chipBar(' js/pages/rg/cockpit.js js/pages/rg/alerts.js js/pages/rg/trace.js   # 预期全 0（惯例③）
grep -rn 'tk=' js/pages/rg/*.js; echo "TK_EXIT=$?"           # 预期无输出 + TK_EXIT=1（红线：key 不入源码）
grep -c 'clearDrones' js/pages/rg/cockpit.js                 # 预期 2（头部惯例注释 1 + loadBase 调用 1——重绘 marks 前先清无人机注册表，注册表卫生）
grep -c "node_type !== 'ATTACKER'" js/pages/rg/cockpit.js    # 预期 0（监管端全量可见——运营端过滤惯例的反面）
grep -c "'REG-01'" js/pages/rg/alerts.js js/pages/rg/trace.js   # 预期各 ≥1（监管端 operator 惯例）
grep -c '5001' js/pages/rg/trace.js                          # 预期 ≥1（断链特判）
grep -c 'skipped\|拼造' js/pages/rg/trace.js                 # 预期 ≥1（断点留痕红线文案）
grep -c 'RG.alerts.alertKv\|RG.alerts.alertDrawer' js/pages/rg/cockpit.js   # 预期 ≥2（复用 alerts.js 导出，零重复）
grep -c 'telemetry/latest' js/pages/rg/cockpit.js            # 预期 1
awk '/cockpit\.js/{a=NR} /alerts\.js/{b=NR} /trace\.js/{c=NR} /shell-rg\.js/{d=NR} END{if(a>0&&a<b&&b<c&&c<d)print "ORDER_OK";else print "ORDER_BAD"}' regulator.html   # 预期 ORDER_OK
```

- [ ] **Step 6: 冒烟——静态服务 200（BACKEND 指死端口，静态文件不经代理；生产 :8080/:8090 禁止触碰）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
PORT=18099 BACKEND=http://127.0.0.1:1 python3 ../scripts/serve-frontend.py >/tmp/planB-t11-smoke.log 2>&1 & SRV=$!
sleep 1
for p in regulator.html js/pages/rg/cockpit.js js/pages/rg/alerts.js js/pages/rg/trace.js; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18099/$p)"   # 预期各 200
done
curl -s http://127.0.0.1:18099/regulator.html | grep -c 'data-theme="dark"'   # 预期 1（深藏青大屏固定主题）
kill $SRV 2>/dev/null; wait $SRV 2>/dev/null; echo SMOKE_DONE
```

- [ ] **Step 7: 记录 DEFERRED-HUMAN 清单（浏览器人工验收项，追加到任务报告）**

```
【计划 B Task 11 DEFERRED-HUMAN】（浏览器访问 http://127.0.0.1:8090/regulator.html，天地图 key 已存 localStorage）
- #/cockpit：5 统计卡（高危未决>0 红/待审授权>0 黄/降级会话>0 黄/虫洞检出>0 红）+「汇总生成」时间戳；地图 C 位渲染走廊多边形+航段+8 节点全量（NODE-X/Y 红色 ⚠ ATTACKER 可见——监管端全貌）；有在飞会话时 ✈️ 图标随遥测移动（heading 朝向）、5s 自动刷新；告警类型分布红条；最近告警行点击 → 抽屉（含「转七级身份追踪」按钮 → 跳 #/trace 且入口值已预填）；有带任务的告警时地图出现红色落点，点击 → 右下详情卡；「立即刷新」→ 统计/落点更新；无航段数据时地图 setEmpty 覆盖层文案。
- #/cockpit 跨端联动（需管理端配合）：管理端 netsec 开虫洞后回驾驶舱「立即刷新」→ 红虚线虫洞边出现；管理端关闭会话/演示 reset 后 → ✈️ 图标消失（lastSeen 清理）。
- #/alerts：登记表单 9 字段（5 必填星标；来源系统 hint）；伪名 PSEUDO-UAV-83921 + WORMHOLE_ALERT + HIGH + MANUAL 登记 → 回执 9 行 kv（状态 OPEN）+ ALERT chip + 推进表单 alert_id 已预填 + 台账刷新；台账五维过滤（类型/状态/风险/来源下拉 + 任务号文本）；行点击 → 抽屉三按钮语义（预填推进表单→toast 提示下一步状态；转追踪→跳页预填）；推进 IDENTIFIED→TRACED 逐步成功；跨级（OPEN 直接 RESOLVED）→ 6002 errCard 中性展示（无「◈ 预期」徽章）。
- #/trace：入口下拉三项；告警号入口（预填 chip 值）追踪故事机 → 7 级全 RESOLVED + statCard「✓ 全链可溯」绿 + break_level=0 + 各级 chainTag 三色（L1-4 紫 ChainMaker / L5-6 蓝 Fabric / L7 青 FISCO）+ 各级时延；伪名入口 PSEUDO-UAV-83921 同链可溯；未登记伪名 PSEUDO-UNKNOWN-999 → 5001 errCard + 其下断点时间线：L1 断点「chainmaker 索引无此身份映射」红色 ✕ BROKEN、L2-7「skipped: break at level 1」——不拼造（这是断链红线的标准演示，非 6002）；追踪后 chip 条无新增（note:null 不落 STORE）；「监管审计」页可查到 TRACE_IDENTITY / TRACE_IDENTITY_BROKEN 留痕（Task 12 audit 页验收）。
```

- [ ] **Step 8: Commit**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/pages/rg/cockpit.js frontend/js/pages/rg/alerts.js frontend/js/pages/rg/trace.js frontend/regulator.html
git commit -m "$(cat <<'MSG'
feat(frontend): 监管当局端 I——驾驶舱大屏/告警管理/身份追踪三页（计划 B Task 11）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---

### Task 12: 监管端 II —— authz / inspect / audit / crypto

**Files:**
- Create: `frontend/js/pages/rg/authz.js`（授权中心：申请 + 审批上链）
- Create: `frontend/js/pages/rg/inspect.js`（密文核验：封缄/开箱双态）
- Create: `frontend/js/pages/rg/audit.js`（监管审计：双台账 + 双 CSV）
- Create: `frontend/js/pages/rg/crypto.js`（密码工具箱：SM3/SM9 篡改检测闭环）
- Modify: `frontend/regulator.html`（在 trace.js 与 shell-rg.js 之间插入 4 行 script）

**Interfaces:**
- Consumes:
  - Task 6 页面公共惯例 8 条（RG 注册表；本页组无 mapPage——shell-rg mapPages 仅 cockpit，四页都不建地图，无 mx 生命周期负担）。
  - Task 11 Produces：监管端 operator 惯例 `regulator_id/operator 恒 'REG-01'`、`reviewer_id 恒 'REG-ADMIN'`；脚本顺序 cockpit→alerts→trace→authz→inspect→audit→crypto→shell-rg。
  - `PORTAL.{jp,need}`；`UI.{h,toast,trunc,jsonBlock,datetimeLocal(offsetMin)→'YYYY-MM-DD HH:mm:ss'}`；`API.call`；`STORE.{get,note}`（MISSION/AUTHORIZATION 槽位跨页预填：authz apply→review 同页预填；inspect 读两个槽位）。
  - `PUI.{pageHead,tabs,form(含 type:'multi' 复选组：field.value 数组=初始勾选，read() 非空才出数组，set(name,arr) 回填),dataTable,csvExport({endpoint,body,filters(),filename,label}),statCards,badge,chainTag,kv,drawer,actionBar([{label,kind,confirm:{title,msg,ok},run}]),runOp,resultPanel,errCard,empty}`（form multi 初始值支持已核实 pui.js:220-223/247-252）。
  - 契约档案 §3（Authorization 12 键 `{audit_hash,authorization_id,created_at,reason,regulator_id,scope:str,status:PENDING|AUTHORIZED|DENIED|EXPIRED,target_id,target_type,updated_at,valid_from,valid_to}`——**scope 响应侧是 JSON 字符串**；RegAudit 10 键 `{action,alert_id,audit_hash,audit_id,authorization_id,chain_tx_id,created_at,operator_id,result:str,target}`——**目标键名是 target 单键**；AuditLog 8 键 `{action,actor,created_at,detail:str,id,target_id,target_type,trace_id}`）、§5（crypto/sm3 → `{canonical,sm3_hash}`；sm9/keygen `{entity_id}` → `{sm9_identity:"SM9-ID-"+entity_id}` 确定性；sm9/sign `{sm9_identity,payload}` → `{signature,sm3_hash}`；sm9/verify 三字段必填 → `{valid}` **code 恒 0 即使 false**，签名非法 base64 → 1002）、§21（apply：regulator_id*/scope* 请求侧真数组 min=1 枚举 `MISSION|ROUTE|PAYLOAD|IDENTITY|EVIDENCE` 重复→6002/target_type* `MISSION|UAV|ALERT`/target_id*，authorization_id·reason·valid_from·valid_to 可选缺省 now→+24h，resp Authorization 平铺 PENDING；review：authorization_id*/decision* `APPROVE|DENY`/reviewer_id*，resp `{auth,audit,chain_tx_id(顶层快捷=audit.chain_tx_id)}`，**APPROVE 上链 ChainMaker、DENY 本地不上链 chain_tx_id 空**，复审已裁决→6002、上链失败→2001 停留 PENDING 可同单重试）、§22（inspect/ciphertext：mission_id* 必填，authorization_id 留空→**5002 封缄拒绝**，trajectory 严格枚举 `""|"NORMAL"|"DEVIATION"` 非法值→6002、申报需 scope 含 ROUTE 否则 5003，payload_type 申报需 scope 含 PAYLOAD 否则 5003，窗口外→**5004 惰性迁 EXPIRED**，结论上链失败→2001；**5002/5003/5004/2001 四种 code≠0 的 data=`{authorized:false, sealed:{mission_id,ciphertext_status:"SEALED",sm3_hash,masked_value,has_ciphertext}}`——明文绝不进错误信封**（sealed 键已对 inspection.go:60/92 核实）；成功 data=`{authorized:true,scope 响应侧唯一真数组,decrypted_view 纯文本(空=scope 无 MISSION 或无密文即未开箱),mission:Mission 平铺(密文字段仍不可见),sealed(ciphertext_status:"OPENED"),verification:{digest_match,signature_valid,audit_hash},conclusion:{route_verdict:ROUTE_OK|ROUTE_DEVIATION|NOT_CHECKED,payload_verdict:PAYLOAD_OK|MISSION_MISMATCH|NOT_CHECKED,raised_alerts:[]},chain_tx_id,reg_audit_id}`）、§23（regulatory/audit/list 过滤键 alert_id/authorization_id/action/operator_id + 分页；export 同过滤键无分页 → `{format:"csv",content,rows}`）、§24（audit/query 过滤键 business_id/action/actor；**resp `{records,total}` 无 page/page_size 回显——dataTable 只消费 records/total 天然兼容**；export 同过滤键 → `{format,content,rows}`）、§29（authorize/apply→note('AUTHORIZATION', id, {target_id})；authorize/review→note('AUTHORIZATION', d.auth.authorization_id)；inspect 成功→note('MISSION', d.mission.mission_id)；crypto/audit 域无 note）。
  - Global Constraints #13（拒绝中性展示）、#17（**trajectory 全程留空**——NORMAL 会撞硬编码基线必报偏航；**授权有效窗相对时间** valid_from=now−1h、valid_to=now+4h，用 `UI.datetimeLocal(-60)`/`UI.datetimeLocal(240)` 预填，不写死钟点）。
- Produces（Task 14 演示脚本引用）:
  - 监管端 7 页齐（cockpit/alerts/trace/authz/inspect/audit/crypto），regulator.html 脚本区定稿。
  - **inspect 双态渲染惯例**：code=0 → openedView（授权 statCard + digest/signature 双验证 + scope 真数组 + decrypted_view 明文卡 + conclusion 双裁定 + chain_tx_id/reg_audit_id）；5002/5003/5004/2001 → errCard + sealedCard 补渲（封缄五键）；6002 → 仅 errCard。手写 run（非 runOp）——rp 只渲染成功态，封缄补渲必须直接访问 r.data.sealed。
  - **audit 双 CSV 文件名**：`regulatory-audit.csv`（监管动作）/ `audit-all.csv`（全局审计）——demo-script 第 8 章「双 CSV 导出」台词引用。
  - **crypto 篡改演示闭环**：签名 → 「填入验签表单」→ 验签 valid=true → 「⚠ 篡改 payload 并回填验签（altitude_max→999）」→ 再验签 valid=false 且 code 仍 0；非法 base64 签名 → 1002 errCard。demo-script 第 7 章「工具箱篡改检测」引用。
  - authz 审批 confirm 文案「APPROVE 将上链存证（ChainMaker），不可撤销；DENY 仅本地记录不上链」。

- [ ] **Step 1: 写 `frontend/js/pages/rg/authz.js`（全文逐字）**

```js
/* authz.js — 监管当局端·授权中心（计划 B Task 12，spec §5.3）
   authorize/apply：scope 请求侧真数组 min=1（5 枚举 MISSION|ROUTE|PAYLOAD|IDENTITY|EVIDENCE，
   重复元素→6002）；authorization_id 省略自动生成；有效窗按 Global Constraints #17
   相对时间预填（now−1h → now+4h，不写死钟点；服务端缺省 now→+24h）。
   authorize/review：APPROVE 上链 ChainMaker（chain_tx_id 留痕）；DENY 本地记录不上链；
   复审已裁决授权→6002；APPROVE 上链失败→2001 停留 PENDING 可同单重试（幂等）。
   授权生命周期：PENDING → AUTHORIZED | DENIED | EXPIRED（惰性迁移：核验窗口外触发 5004）。
   监管端惯例：regulator_id 恒 'REG-01'、reviewer_id 恒 'REG-ADMIN'（Task 11 Produces）。
   端点：authorize/apply、authorize/review。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);
  var SCOPES = ['MISSION', 'ROUTE', 'PAYLOAD', 'IDENTITY', 'EVIDENCE'];

  /* Authorization.scope 响应侧是 JSON 字符串（§3）——解析回数组展示 */
  function scopeArr(s) {
    var a = PORTAL.jp(s, null);
    return Array.isArray(a) ? a : [];
  }
  function authKv(a) {
    return P.kv([
      ['授权号', h('code', { class: 'p-mono' }, a.authorization_id)],
      ['状态', P.badge(a.status)],
      ['监管方', a.regulator_id],
      ['目标', a.target_type + ' · ' + h('code', { class: 'p-mono' }, a.target_id)],
      ['授权范围', scopeArr(a.scope).join('、') || '—'],
      ['理由', a.reason || '—'],
      ['有效窗', a.valid_from + ' → ' + a.valid_to],
      ['审计摘要', h('code', { class: 'p-mono' }, UI.trunc(a.audit_hash, 32))],
      ['创建 / 更新', a.created_at + ' / ' + a.updated_at]
    ]);
  }

  function render(root, ctx) {
    var slotM = STORE.get('MISSION'), slotAz = STORE.get('AUTHORIZATION');
    root.append(P.pageHead({
      title: '授权中心',
      sub: '监管授权申请 → 审批上链（APPROVE 上 ChainMaker 存证 / DENY 本地不上链）→ 持授权号到「密文核验」开箱' }));

    /* --- 授权申请 --- */
    var rpAp = P.resultPanel();
    var fAp = P.form([
      { name: 'regulator_id', label: '监管方', type: 'text', required: true, value: 'REG-01' },
      { name: 'scope', label: '授权范围（多选，至少 1 项）', type: 'multi', required: true,
        options: SCOPES, value: ['ROUTE', 'PAYLOAD'],
        hint: '重复元素→6002；核验开箱需含 MISSION（明文视图）、申报轨迹需 ROUTE、申报载荷需 PAYLOAD' },
      { name: 'target_type', label: '目标类型', type: 'select', required: true, value: 'MISSION',
        options: ['MISSION', 'UAV', 'ALERT'] },
      { name: 'target_id', label: '目标单号', type: 'text', required: true,
        value: slotM ? slotM.id : '', placeholder: 'MISSION-2026-…（MISSION 上下文 chip 自动预填）' },
      { name: 'authorization_id', label: '授权号（可选）', type: 'text',
        placeholder: '留空自动生成 AUTH-…' },
      { name: 'reason', label: '申请理由', type: 'textarea', rows: 2,
        placeholder: '如：核查告警 ALERT-2026-001 涉及的医疗运输任务',
        hint: 'ALERT 目标可省；建议始终填写（进审计）' },
      { name: 'valid_from', label: '生效时间', type: 'text', value: UI.datetimeLocal(-60),
        hint: '相对时间惯例：当前−1 小时（Global Constraints #17）' },
      { name: 'valid_to', label: '失效时间', type: 'text', value: UI.datetimeLocal(240),
        hint: '当前+4 小时；窗口外核验 → 5004（惰性迁 EXPIRED）' }
    ]);
    var fRv = null;   /* 审批表单前向声明（申请成功回调预填） */
    var applyCard = card('授权申请 authorize/apply',
      fAp.root,
      P.actionBar([{ label: '提交授权申请', kind: 'primary', run: P.runOp({
        path: '/api/authorize/apply',
        body: function () {
          var v = PORTAL.need(fAp.read(), 'regulator_id', 'scope', 'target_type', 'target_id');
          if (!v) return null;
          var body = { regulator_id: v.regulator_id, scope: v.scope,
            target_type: v.target_type, target_id: v.target_id };
          ['authorization_id', 'reason', 'valid_from', 'valid_to'].forEach(function (k) {
            if (v[k]) body[k] = v[k];
          });
          return body;
        },
        rp: rpAp, successText: '授权申请已提交（status=PENDING，audit_hash 预生成）',
        render: function (d) { return authKv(d); },
        note: { kind: 'AUTHORIZATION', id: function (d) { return d.authorization_id; },
          extra: function (d) { return { target_id: d.target_id }; } },
        onOk: function (d) { if (fRv) fRv.set('authorization_id', d.authorization_id); }
      }) }]),
      rpAp.root);

    /* --- 授权审批（APPROVE 上链 / DENY 不上链） --- */
    var rpRv = P.resultPanel();
    fRv = P.form([
      { name: 'authorization_id', label: '授权号', type: 'text', required: true,
        value: slotAz ? slotAz.id : '', placeholder: 'AUTH-…（申请成功后自动预填）' },
      { name: 'decision', label: '裁决', type: 'select', required: true, value: 'APPROVE',
        options: ['APPROVE', 'DENY'] },
      { name: 'reviewer_id', label: '审批人', type: 'text', required: true, value: 'REG-ADMIN' },
      { name: 'comment', label: '批注', type: 'textarea', rows: 2, placeholder: '如：情况属实，同意开箱核验' }
    ]);
    var reviewCard = card('授权审批 authorize/review（复审已裁决授权 → 6002；上链失败 → 2001 停留 PENDING 可同单重试）',
      fRv.root,
      P.actionBar([{ label: '裁决', kind: 'primary',
        confirm: { title: '授权审批',
          msg: 'APPROVE 将上链存证（ChainMaker），不可撤销；DENY 仅本地记录不上链。',
          ok: '确认裁决' },
        run: P.runOp({
          path: '/api/authorize/review',
          body: function () {
            var v = PORTAL.need(fRv.read(), 'authorization_id', 'decision', 'reviewer_id');
            if (!v) return null;
            var body = { authorization_id: v.authorization_id, decision: v.decision,
              reviewer_id: v.reviewer_id };
            if (v.comment) body.comment = v.comment;
            return body;
          },
          rp: rpRv, successText: '裁决完成',
          render: function (d) {
            var denied = d.auth.status === 'DENIED';
            return h('div', {},
              P.statCards([{ label: '裁决结果',
                value: denied ? '✕ DENIED（不上链）' : '✓ AUTHORIZED（已上链）',
                tone: denied ? 'critical' : 'good' }]),
              authKv(d.auth),
              h('div', { class: 'd-section' }, '审计留痕（RegAudit）'),
              P.kv([
                ['审计号', h('code', { class: 'p-mono' }, d.audit.audit_id)],
                ['动作', P.badge(d.audit.action)],
                ['审批人', d.audit.operator_id],
                ['目标（target 单键）', h('code', { class: 'p-mono' }, d.audit.target || '—')],
                ['裁决原文', h('code', { class: 'p-mono' }, UI.trunc(String(d.audit.result || '—'), 60))],
                ['链上存证', d.chain_tx_id
                  ? h('span', { class: 'd-row' }, P.chainTag('chainmaker'),
                      h('code', { class: 'p-mono' }, UI.trunc(d.chain_tx_id, 30)))
                  : '—（DENY 不上链，本地留痕）']
              ]));
          },
          note: { kind: 'AUTHORIZATION', id: function (d) { return d.auth.authorization_id; } }
        }) }]),
      rpRv.root);

    root.append(h('div', { class: 'd-grid-2' }, applyCard, reviewCard));
    root.append(card('授权生命周期',
      P.kv([
        ['PENDING', '已申请待裁决（audit_hash 已预生成）'],
        ['AUTHORIZED', 'APPROVE 裁决 + ChainMaker 上链存证（chain_tx_id 留痕）'],
        ['DENIED', 'DENY 裁决——本地记录，不上链（chain_tx_id 为空）'],
        ['EXPIRED', 'valid_to 已过——惰性迁移：下次核验触发 5004 时才落状态']
      ]),
      h('p', { class: 'd-small d-muted' }, '拿到 AUTHORIZED 授权号后，到「密文核验」页填 mission_id + authorization_id 开箱；授权范围决定能看到什么：无 MISSION → decrypted_view 为空（未开箱），申报轨迹/载荷需 ROUTE/PAYLOAD 在范围内（否则 5003）。')));
  }

  RG.authz = { render: render };
})();
```

- [ ] **Step 2: 写 `frontend/js/pages/rg/inspect.js`（全文逐字）**

```js
/* inspect.js — 监管当局端·密文核验（计划 B Task 12，spec §5.3）
   inspect/ciphertext 双态渲染（手写 run，非 runOp——rp 只渲染成功态，封缄补渲必须直接访问 r.data.sealed）：
   code=0 → 开箱态 openedView：authorized / scope（响应侧唯一真数组）/ decrypted_view 明文卡
   （SM9 解密临时视图，仅本次响应不落库；空=scope 无 MISSION 或无密文即未开箱）/ mission（密文字段仍不可见）/
   sealed(OPENED) / verification（digest_match+signature_valid 双验证+audit_hash）/
   conclusion（route/payload 双裁定+raised_alerts）/ chain_tx_id（结论上链）/ reg_audit_id；
   5002（未授权）/5003（scope 或目标违规）/5004（窗口外，惰性迁 EXPIRED）/2001（结论上链失败）
   → errCard + sealedCard 补渲——data 只有 {authorized:false, sealed:{封缄五键}}，明文绝不进错误信封；
   6002（mission 不存在 / trajectory 非法值）→ 仅 errCard。
   trajectory 用下拉 ""/NORMAL/DEVIATION（spec 吸收旧终审 BUG-4：消除误导 placeholder）；
   演示全程留空（Global Constraints #17：NORMAL 会撞硬编码基线必报偏航+污染驾驶舱）。
   监管端惯例：regulator_id 恒 'REG-01'。
   端点：inspect/ciphertext。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  function fmtBool(b) { return b === true ? '✓' : b === false ? '✗' : '—'; }

  /* 开箱态（code=0）：授权+双验证+明文+双裁定+上链留痕 */
  function openedView(d) {
    var m = d.mission || {};
    var v = d.verification || {};
    var c = d.conclusion || {};
    var s = d.sealed || {};
    return h('div', {},
      P.statCards([
        { label: '授权核验', value: d.authorized ? '✓ 已开箱' : '✗ 未授权',
          tone: d.authorized ? 'good' : 'critical' },
        { label: '完整性双验证',
          value: (v.digest_match && v.signature_valid) ? '✓✓ 双通过' : '⚠ 验证未通过',
          sub: 'digest_match=' + fmtBool(v.digest_match) + ' · signature_valid=' + fmtBool(v.signature_valid),
          tone: (v.digest_match && v.signature_valid) ? 'good' : 'critical' },
        { label: '授权范围', value: (d.scope || []).length + ' 项',
          sub: (d.scope || []).join('、') || '—' }
      ]),
      h('div', { class: 'd-section' }, '解密明文视图 decrypted_view（SM9 解密临时视图——仅本次响应，不落库）'),
      h('div', { class: 'p-mono d-cert' }, d.decrypted_view || '（空 = scope 无 MISSION 或无密文——未开箱）'),
      P.kv([
        ['任务', h('code', { class: 'p-mono' }, m.mission_id || '—')],
        ['任务状态', P.badge(m.status)],
        ['脱敏值', m.masked_value || '—'],
        ['航段 / 区域', PORTAL.jp(m.route_segments, []).join('、') + ' / ' + PORTAL.jp(m.zones, []).join('、')],
        ['密文状态', P.badge(s.ciphertext_status)],
        ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(s.sm3_hash, 32))],
        ['审计摘要', h('code', { class: 'p-mono' }, UI.trunc(v.audit_hash, 32))],
        ['航线裁定', P.badge(c.route_verdict)],
        ['载荷裁定', P.badge(c.payload_verdict)],
        ['触发告警', (c.raised_alerts || []).join('、') || '无'],
        ['结论上链', h('span', { class: 'd-row' }, P.chainTag('chainmaker'),
          h('code', { class: 'p-mono' }, UI.trunc(d.chain_tx_id, 28)))],
        ['核验审计号', h('code', { class: 'p-mono' }, d.reg_audit_id || '—')]
      ]));
  }

  /* 封缄态（5002/5003/5004/2001 的 data.sealed）：只可见元信息——这恰是最小授权的证明 */
  function sealedCard(s) {
    return h('div', {},
      h('div', { class: 'd-section' }, '🔒 封缄视图 sealed-only（明文绝不进错误信封）'),
      P.kv([
        ['任务', h('code', { class: 'p-mono' }, s.mission_id || '—')],
        ['密文状态', P.badge(s.ciphertext_status)],
        ['有密文', fmtBool(s.has_ciphertext)],
        ['脱敏值', s.masked_value || '—'],
        ['SM3 摘要', h('code', { class: 'p-mono' }, UI.trunc(s.sm3_hash, 32))]
      ]),
      h('p', { class: 'd-small d-muted' }, '「看不到」本身就是监管结论：未授权/越权/过窗时系统只回封缄元信息——隐私保护由错误路径证明。'));
  }

  function render(root, ctx) {
    var slotM = STORE.get('MISSION'), slotAz = STORE.get('AUTHORIZATION');
    var resultBox = h('div', {}, P.empty('填写左侧表单执行核验——双态结果（开箱/封缄）显示在这里'));

    root.append(P.pageHead({
      title: '密文核验',
      sub: 'SM9 任务密文：封缄（5002/5003/5004）↔ 开箱（授权+双验证+结论上链）双态' }));

    var fIn = P.form([
      { name: 'mission_id', label: '任务号', type: 'text', required: true,
        value: slotM ? slotM.id : '', placeholder: 'MISSION-2026-…（MISSION 上下文 chip 自动预填）' },
      { name: 'authorization_id', label: '授权号（可空）', type: 'text',
        value: slotAz ? slotAz.id : '',
        placeholder: 'AUTH-…（AUTHORIZATION chip 自动预填）',
        hint: '留空 → 5002 封缄拒绝——这正是最小授权的演示入口' },
      { name: 'regulator_id', label: '监管方（审计用）', type: 'text', value: 'REG-01' },
      { name: 'trajectory', label: '申报轨迹', type: 'select', value: '',
        options: [['', '（留空——不申报）'], ['NORMAL', 'NORMAL 正常申报'],
          ['DEVIATION', 'DEVIATION 偏航申报']],
        hint: '严格枚举 ""|NORMAL|DEVIATION（非法值 6002）；申报需授权 scope 含 ROUTE（否则 5003）。演示全程留空——NORMAL 会撞硬编码基线必报偏航（Global Constraints #17）' },
      { name: 'payload_type', label: '申报载荷类型（可选）', type: 'text',
        placeholder: '如 MEDICAL_KIT（与任务载荷比对）',
        hint: '申报需授权 scope 含 PAYLOAD（否则 5003）；不符 → conclusion.payload_verdict=MISSION_MISMATCH + 触发告警' }
    ]);

    /* 手写 run：5002/5003/5004/2001 的 data.sealed 补渲必须直接访问错误响应 */
    async function doInspect(el) {
      var v = PORTAL.need(fIn.read(), 'mission_id');
      if (!v) return;
      var body = { mission_id: v.mission_id };
      if (v.authorization_id) body.authorization_id = v.authorization_id;
      if (v.regulator_id) body.regulator_id = v.regulator_id;
      if (v.trajectory) body.trajectory = v.trajectory;
      if (v.payload_type) body.payload_type = v.payload_type;
      el.disabled = true;
      var r = await API.call('/api/inspect/ciphertext', body);
      el.disabled = false;
      if (!resultBox.isConnected) return;
      resultBox.innerHTML = '';
      if (r.code === 0) {
        resultBox.append(openedView(r.data));
        if (r.data.mission && r.data.mission.mission_id) {
          STORE.note('MISSION', r.data.mission.mission_id);   /* §29：仅成功落 STORE */
        }
      } else if ((r.code === 5002 || r.code === 5003 || r.code === 5004 || r.code === 2001)
                 && r.data && r.data.sealed) {
        resultBox.append(P.errCard(r), sealedCard(r.data.sealed));
      } else {
        resultBox.append(P.errCard(r));   /* 6002 等：无封缄数据可补渲 */
      }
    }

    root.append(h('div', { class: 'd-grid-side' },
      h('div', { class: 'd-col' },
        card('发起核验 inspect/ciphertext',
          fIn.root,
          P.actionBar([{ label: '执行核验', kind: 'primary', run: doInspect }])),
        card('双态说明',
          P.kv([
            ['封缄（拒绝路径）', '5002 未授权 / 5003 scope·目标违规 / 5004 窗口外（惰性迁 EXPIRED）/ 2001 结论上链失败——只回封缄五键'],
            ['开箱（授权路径)', 'scope 定可见性：MISSION→明文视图、ROUTE→轨迹比对、PAYLOAD→载荷比对'],
            ['核验即审计', '开箱与拒绝都写 RegAudit（INSPECT）；开箱结论上链 ChainMaker（chain_tx_id）']
          ]))),
      card('核验结果', resultBox)));
  }

  RG.inspect = { render: render };
})();
```

- [ ] **Step 3: 写 `frontend/js/pages/rg/audit.js`（全文逐字）**

```js
/* audit.js — 监管当局端·监管审计（计划 B Task 12，spec §5.3）
   双台账 + 双 CSV 导出（P.tabs；本页非 mapPage，tabs 无 Leaflet 零尺寸问题）：
   reg 页 regulatory/audit/list·export —— 监管动作留痕（INSPECT / AUTH_APPROVE /
   AUTH_DENY / TRACE_IDENTITY_BROKEN 等；RegAudit 目标键名是 target 单键，
   不是 target_type/target_id 一对——§3）；
   all 页 audit/query·export —— 全局 AuditLog（三维 business_id/action/actor；
   响应只有 {records,total} 无 page/page_size 回显——dataTable 只消费
   records/total（pui.js:338），天然兼容）。
   CSV 导出过滤键 = 各 list 的过滤键（export 无分页）。
   端点：regulatory/audit/list、regulatory/audit/export、audit/query、audit/export。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* RegAudit.result 是 JSON 字符串（如 {"comment":"…","decision":"APPROVE"}）——
     列表列做可读压缩，抽屉里给原文 */
  function resultText(s) {
    var o = PORTAL.jp(s, null);
    if (o && typeof o === 'object') {
      return [o.decision, o.comment].filter(Boolean).join(' · ') || JSON.stringify(o);
    }
    return (s != null && s !== '') ? String(s) : '—';
  }

  function regDrawer(r) {
    P.drawer('监管审计 ' + r.audit_id,
      P.kv([
        ['审计号', h('code', { class: 'p-mono' }, r.audit_id)],
        ['动作', P.badge(r.action)],
        ['操作方', r.operator_id],
        ['目标（target 单键）', h('code', { class: 'p-mono' }, r.target || '—')],
        ['告警号', r.alert_id || '—'],
        ['授权号', r.authorization_id || '—'],
        ['链上存证', r.chain_tx_id ? h('code', { class: 'p-mono' }, r.chain_tx_id) : '—（DENY 不上链）'],
        ['审计摘要', h('code', { class: 'p-mono' }, UI.trunc(r.audit_hash, 32))],
        ['时间', r.created_at]
      ]),
      h('div', { class: 'd-section' }, '结果原文（result JSON 字符串）'),
      UI.jsonBlock(PORTAL.jp(r.result, r.result), 160));
  }

  /* --- 页签一：监管审计台账（regulatory/audit/list·export） --- */
  function tabReg(box) {
    var fEx = P.form([
      { name: 'alert_id', label: '告警号过滤', type: 'text', placeholder: 'ALERT-…' },
      { name: 'authorization_id', label: '授权号过滤', type: 'text', placeholder: 'AUTH-…' },
      { name: 'action', label: '动作过滤', type: 'text', placeholder: 'INSPECT / AUTH_APPROVE / …' },
      { name: 'operator_id', label: '操作方过滤', type: 'text', placeholder: 'REG-01' }
    ]);
    var tbl = P.dataTable({
      endpoint: '/api/regulatory/audit/list', pageSize: 10,
      filters: [
        { name: 'action', label: '动作', type: 'text', placeholder: '如 INSPECT' },
        { name: 'operator_id', label: '操作方', type: 'text' },
        { name: 'alert_id', label: '告警号', type: 'text' },
        { name: 'authorization_id', label: '授权号', type: 'text' }
      ],
      columns: [
        { title: '审计号', render: function (r) { return UI.trunc(r.audit_id, 20); }, mono: true },
        { title: '动作', render: function (r) { return P.badge(r.action); } },
        { title: '操作方', key: 'operator_id' },
        { title: '目标', render: function (r) { return UI.trunc(r.target, 24); }, mono: true },
        { title: '结果', render: function (r) { return UI.trunc(resultText(r.result), 30); } },
        { title: '链上存证', render: function (r) { return r.chain_tx_id ? UI.trunc(r.chain_tx_id, 22) : '—'; }, mono: true },
        { title: '时间', key: 'created_at' }
      ],
      onRow: function (r) { regDrawer(r); },
      emptyText: '暂无监管动作留痕——先去「密文核验」或「授权中心」产生动作'
    });
    box.append(card('监管审计导出 regulatory/audit/export（过滤键同台账四维，无分页）',
      h('div', { class: 'd-row d-row-wrap' }, fEx.root,
        P.csvExport({ endpoint: '/api/regulatory/audit/export',
          filters: function () { return fEx.read(); },
          filename: 'regulatory-audit.csv', label: '⤓ 导出 CSV' }))));
    box.append(card('监管动作台账 regulatory/audit/list（INSPECT / AUTH_APPROVE / AUTH_DENY / TRACE_IDENTITY_BROKEN …）', tbl));
  }

  /* --- 页签二：全局审计台账（audit/query·export） --- */
  function tabAll(box) {
    var fEx = P.form([
      { name: 'business_id', label: '业务单号过滤', type: 'text',
        placeholder: 'MISSION-… / SESS-… / PSEUDO-UAV-…' },
      { name: 'action', label: '动作过滤', type: 'text', placeholder: '如 TRACE_IDENTITY' },
      { name: 'actor', label: '行为方过滤', type: 'text', placeholder: 'REG-01' }
    ]);
    var tbl = P.dataTable({
      endpoint: '/api/audit/query', pageSize: 10,
      filters: [
        { name: 'business_id', label: '业务单号', type: 'text' },
        { name: 'action', label: '动作', type: 'text' },
        { name: 'actor', label: '行为方', type: 'text' }
      ],
      columns: [
        { title: 'ID', key: 'id', num: true },
        { title: 'trace_id', render: function (r) { return UI.trunc(r.trace_id, 18); }, mono: true },
        { title: '行为方', key: 'actor' },
        { title: '动作', render: function (r) { return P.badge(r.action); } },
        { title: '目标', render: function (r) {
            return UI.trunc((r.target_type || '') + (r.target_id ? ':' + r.target_id : ''), 28);
          }, mono: true },
        { title: '明细', render: function (r) { return UI.trunc(r.detail, 30); } },
        { title: '时间', key: 'created_at' }
      ],
      onRow: function (r) {
        P.drawer('审计日志 #' + r.id,
          P.kv([
            ['ID / trace', h('span', { class: 'd-row' }, String(r.id),
              h('code', { class: 'p-mono' }, r.trace_id || '—'))],
            ['行为方 / 动作', h('span', { class: 'd-row' }, r.actor || '—', P.badge(r.action))],
            ['目标', (r.target_type || '—') + ' : ' + (r.target_id || '—')],
            ['时间', r.created_at]
          ]),
          h('div', { class: 'd-section' }, '明细原文（detail JSON 字符串）'),
          UI.jsonBlock(PORTAL.jp(r.detail, r.detail), 200));
      },
      emptyText: '暂无全局审计记录'
    });
    box.append(card('全局审计导出 audit/export（过滤键 business_id/action/actor，无分页）',
      h('div', { class: 'd-row d-row-wrap' }, fEx.root,
        P.csvExport({ endpoint: '/api/audit/export',
          filters: function () { return fEx.read(); },
          filename: 'audit-all.csv', label: '⤓ 导出 CSV' }))));
    box.append(card('全局审计台账 audit/query（响应无 page/page_size 回显——dataTable 兼容；排序 id DESC）', tbl));
  }

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '监管审计',
      sub: '双台账：监管动作留痕（RegAudit，含链上存证）+ 全局审计（AuditLog，三维过滤）——均可导 CSV' }));
    root.append(P.tabs([
      { key: 'reg', label: '监管审计台账', render: tabReg },
      { key: 'all', label: '全局审计台账', render: tabAll }
    ]));
  }

  RG.audit = { render: render };
})();
```

- [ ] **Step 4: 写 `frontend/js/pages/rg/crypto.js`（全文逐字）**

```js
/* crypto.js — 监管当局端·密码工具箱（计划 B Task 12，spec §5.3）
   SM3 摘要 / SM9 身份派生 / 签名→验签闭环 / 篡改检测——监管取证与演示支撑工具。
   契约要点（§5）：
   sm3 {payload 对象} → {canonical 键排序规范化串, sm3_hash 64hex}——键序不同摘要相同；
   keygen {entity_id} → {sm9_identity:"SM9-ID-"+entity_id} 确定性派生；
   sign {sm9_identity,payload} → {signature base64, sm3_hash}；
   verify {sm9_identity,payload,signature} → {valid}——**code 恒 0 即使 valid=false**：
   「验签不通过」是合法业务结论；只有签名不是合法 base64 才 1002（errCard 路径）。
   篡改演示闭环：签名 → 填入验签 → valid=true → 篡改按钮（altitude_max→999）→ 再验签
   valid=false 且 code 仍 0。端点：crypto/sm3、crypto/sm9/keygen、crypto/sm9/sign、crypto/sm9/verify。 */
(function () {
  'use strict';
  const { h } = UI, P = PUI;
  var RG = window.RG_PAGES = window.RG_PAGES || {};
  const card = (title, ...b) => h('section', { class: 'p-card' },
    h('h3', { class: 'p-card-title' }, title), ...b);

  /* textarea 文本 → JSON 对象（守卫：非对象/数组/解析失败 toast+null） */
  function readPayload(txt) {
    var o = PORTAL.jp(txt, null);
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      UI.toast('payload 必须是 JSON 对象（如 {"altitude_max":120,…}）', 'err');
      return null;
    }
    return o;
  }

  var DEFAULT_PAYLOAD = '{"altitude_max":120,"mission_id":"MISSION-2026-001","operator_id":"Operator-A"}';

  function render(root, ctx) {
    root.append(P.pageHead({
      title: '密码工具箱',
      sub: 'SM3 摘要 · SM9 身份派生 · 签名→验签闭环 · 篡改检测（valid=false 仍是 code=0）' }));

    /* --- SM3 摘要 --- */
    var rpSm = P.resultPanel();
    var fSm = P.form([
      { name: 'payload', label: 'payload（JSON 对象）', type: 'textarea', required: true, rows: 4,
        value: DEFAULT_PAYLOAD,
        hint: '服务端按键排序规范化（canonical）后做 SM3——键序不同摘要相同' }
    ]);
    var smCard = card('SM3 摘要 crypto/sm3',
      fSm.root,
      P.actionBar([{ label: '计算摘要', kind: 'primary', run: P.runOp({
        path: '/api/crypto/sm3',
        body: function () {
          var v = PORTAL.need(fSm.read(), 'payload');
          if (!v) return null;
          var p = readPayload(v.payload);
          return p ? { payload: p } : null;
        },
        rp: rpSm, successText: 'SM3 摘要完成',
        render: function (d) {
          return h('div', {},
            P.kv([['SM3 摘要（64hex）', h('code', { class: 'p-mono' }, d.sm3_hash)]]),
            h('div', { class: 'd-section' }, '规范化串 canonical（键排序——摘要的真正输入）'),
            UI.jsonBlock(d.canonical, 120));
        }
      }) }]),
      rpSm.root);

    /* --- SM9 身份派生 --- */
    var rpKg = P.resultPanel();
    var fKg = P.form([
      { name: 'entity_id', label: '实体 ID', type: 'text', required: true, value: 'UAV-A-001',
        hint: '确定性派生：sm9_identity = "SM9-ID-" + entity_id（同一实体永远同一身份）' }
    ]);
    var kgCard = card('SM9 身份派生 crypto/sm9/keygen',
      fKg.root,
      P.actionBar([{ label: '派生身份', run: P.runOp({
        path: '/api/crypto/sm9/keygen',
        body: function () {
          var v = PORTAL.need(fKg.read(), 'entity_id');
          return v ? { entity_id: v.entity_id } : null;
        },
        rp: rpKg, successText: 'SM9 身份已派生',
        render: function (d) {
          return P.kv([['SM9 身份', h('code', { class: 'p-mono' }, d.sm9_identity)]]);
        },
        onOk: function (d) { fSg.set('sm9_identity', d.sm9_identity); }   /* fSg 后声明，var 提升，运行时已赋值 */
      }) }]),
      rpKg.root);

    /* --- SM9 签名（含篡改按钮，依赖验签表单 fVf——后声明同 var 提升模式） --- */
    var rpSg = P.resultPanel();
    var lastBody = null;      /* 最近一次签名的请求体（填入验签/篡改用） */
    var lastSigned = null;    /* {identity,payload,signature}——签名成功后解锁篡改按钮 */
    var fSg = P.form([
      { name: 'sm9_identity', label: 'SM9 身份', type: 'text', required: true,
        value: 'SM9-ID-UAV-A-001' },
      { name: 'payload', label: 'payload（JSON 对象）', type: 'textarea', required: true, rows: 4,
        value: DEFAULT_PAYLOAD }
    ]);
    var tamperBtn = h('button', { class: 'p-btn p-btn-danger', disabled: true,
      title: '先完成一次签名' }, '⚠ 篡改 payload 并回填验签（altitude_max→999）');
    var sgCard = card('SM9 签名 crypto/sm9/sign',
      fSg.root,
      P.actionBar([
        { label: '签名', kind: 'primary', run: P.runOp({
          path: '/api/crypto/sm9/sign',
          body: function () {
            var v = PORTAL.need(fSg.read(), 'sm9_identity', 'payload');
            if (!v) return null;
            var p = readPayload(v.payload);
            if (!p) return null;
            lastBody = { sm9_identity: v.sm9_identity, payload: p };
            return lastBody;
          },
          rp: rpSg, successText: '签名完成',
          render: function (d) {
            return P.kv([
              ['签名（base64）', h('code', { class: 'p-mono' }, UI.trunc(d.signature, 48))],
              ['SM3 摘要', h('code', { class: 'p-mono' }, d.sm3_hash)]
            ]);
          },
          onOk: function (d) {
            lastSigned = { identity: lastBody.sm9_identity, payload: lastBody.payload,
              signature: d.signature };
            tamperBtn.disabled = false;
            tamperBtn.title = '复制载荷 → altitude_max 改 999 → 回填验签表单';
          }
        }) },
        { label: '填入验签表单 →', run: function () {
          if (!lastSigned) { UI.toast('请先完成一次签名', 'err'); return; }
          fVf.set('sm9_identity', lastSigned.identity);
          fVf.set('payload', JSON.stringify(lastSigned.payload));
          fVf.set('signature', lastSigned.signature);
          UI.toast('已填入——直接点「验签」应得 valid=true');
        } }
      ]),
      rpSg.root);

    /* --- SM9 验签（篡改检测） --- */
    var rpVf = P.resultPanel();
    var fVf = P.form([
      { name: 'sm9_identity', label: 'SM9 身份', type: 'text', required: true,
        value: 'SM9-ID-UAV-A-001' },
      { name: 'payload', label: 'payload（JSON 对象）', type: 'textarea', required: true, rows: 4,
        value: DEFAULT_PAYLOAD },
      { name: 'signature', label: '签名（base64）', type: 'textarea', required: true, rows: 2,
        placeholder: '从签名卡「填入验签表单」带入，或手工粘贴（非法 base64 → 1002）' }
    ]);
    tamperBtn.addEventListener('click', function () {
      if (!lastSigned) return;
      var t = JSON.parse(JSON.stringify(lastSigned.payload));
      if ('altitude_max' in t) { t.altitude_max = 999; } else { t._tampered = true; }
      fVf.set('sm9_identity', lastSigned.identity);
      fVf.set('payload', JSON.stringify(t));
      fVf.set('signature', lastSigned.signature);
      UI.toast('已篡改并回填——点「验签」：预期 valid=false 且 code 仍为 0', 'ok', 5200);
    });
    var vfCard = card('SM9 验签 crypto/sm9/verify（篡改检测）',
      fVf.root,
      P.actionBar([{ label: '验签', kind: 'primary', run: P.runOp({
        path: '/api/crypto/sm9/verify',
        body: function () {
          var v = PORTAL.need(fVf.read(), 'sm9_identity', 'payload', 'signature');
          if (!v) return null;
          var p = readPayload(v.payload);
          if (!p) return null;
          return { sm9_identity: v.sm9_identity, payload: p, signature: v.signature };
        },
        rp: rpVf, successText: '验签完成（有效性以 valid 为准——code 恒 0）',
        render: function (d) {
          return h('div', {},
            P.statCards([{ label: 'SM9 验签',
              value: d.valid ? '✓ valid=true' : '✗ valid=false',
              sub: d.valid ? '签名与载荷一致' : '签名与载荷不一致（被篡改或用错身份）',
              tone: d.valid ? 'good' : 'critical' }]),
            h('p', { class: 'd-small d-muted' },
              'valid=false 时 code 仍为 0——「验签不通过」是合法业务结论；只有签名不是合法 base64 才是 1002（走上方错误卡）。'));
        }
      }) }]),
      h('div', { class: 'd-mt' }, tamperBtn),
      rpVf.root);

    root.append(h('div', { class: 'd-grid-2' }, smCard, kgCard));
    root.append(h('div', { class: 'd-grid-2' }, sgCard, vfCard));
  }

  RG.crypto = { render: render };
})();
```

- [ ] **Step 5: 修改 `frontend/regulator.html`——在 trace.js 与 shell-rg.js 之间插入四行**

Edit（old_string → new_string）：

old_string:
```html
<script src="js/pages/rg/trace.js"></script>
<script src="js/shell-rg.js"></script>
```

new_string:
```html
<script src="js/pages/rg/trace.js"></script>
<script src="js/pages/rg/authz.js"></script>
<script src="js/pages/rg/inspect.js"></script>
<script src="js/pages/rg/audit.js"></script>
<script src="js/pages/rg/crypto.js"></script>
<script src="js/shell-rg.js"></script>
```

- [ ] **Step 6: 静态断言（语法 + 惯例 + 红线 + 契约关键词）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
node --check js/pages/rg/authz.js && node --check js/pages/rg/inspect.js && node --check js/pages/rg/audit.js && node --check js/pages/rg/crypto.js && echo SYNTAX_OK   # 预期 SYNTAX_OK
grep -c 'RG.authz = { render' js/pages/rg/authz.js            # 预期 1
grep -c 'RG.inspect = { render' js/pages/rg/inspect.js        # 预期 1
grep -c 'RG.audit = { render' js/pages/rg/audit.js            # 预期 1
grep -c 'RG.crypto = { render' js/pages/rg/crypto.js          # 预期 1
grep -c 'P.chipBar(' js/pages/rg/authz.js js/pages/rg/inspect.js js/pages/rg/audit.js js/pages/rg/crypto.js   # 预期全 0（惯例③）
grep -rn 'tk=' js/pages/rg/authz.js js/pages/rg/inspect.js js/pages/rg/audit.js js/pages/rg/crypto.js; echo "TK_EXIT=$?"   # 预期无输出 + TK_EXIT=1
grep -c "'REG-01'" js/pages/rg/authz.js js/pages/rg/inspect.js   # 预期各 ≥1（监管端 operator 惯例）
grep -c "'REG-ADMIN'" js/pages/rg/authz.js                   # 预期 ≥1（审批人惯例）
grep -c 'UI.datetimeLocal(-60)' js/pages/rg/authz.js         # 预期 1（Global #17 相对时间窗，不写死钟点）
grep -c "r.data.sealed" js/pages/rg/inspect.js               # 预期 ≥1（封缄补渲必须直接访问 data.sealed——inspection.go:60 已核实形状）
grep -c "\['', '（留空——不申报）'\]" js/pages/rg/inspect.js   # 预期 1（trajectory 严格枚举含空项）
grep -c 'MEDICAL_KIT' js/pages/rg/inspect.js                 # 预期 ≥1（载荷演示故事值 placeholder）
grep -c 'DENY 不上链' js/pages/rg/authz.js                    # 预期 ≥1（审批语义文案）
grep -c 'regulatory-audit.csv' js/pages/rg/audit.js          # 预期 1
grep -c 'audit-all.csv' js/pages/rg/audit.js                 # 预期 1
grep -c 'altitude_max = 999' js/pages/rg/crypto.js           # 预期 1（篡改演示）
grep -c 'valid=false' js/pages/rg/crypto.js                  # 预期 ≥1（code 恒 0 语义文案）
awk '/trace\.js/{a=NR} /authz\.js/{b=NR} /inspect\.js/{c=NR} /audit\.js/{d=NR} /crypto\.js/{e=NR} /shell-rg\.js/{f=NR} END{if(a>0&&a<b&&b<c&&c<d&&d<e&&e<f)print "ORDER_OK";else print "ORDER_BAD"}' regulator.html   # 预期 ORDER_OK
```

- [ ] **Step 7: 冒烟——静态服务 200（BACKEND 指死端口；生产 :8080/:8090 禁止触碰）**

```bash
cd /root/codes/skytrust-uav-supervision/frontend
PORT=18099 BACKEND=http://127.0.0.1:1 python3 ../scripts/serve-frontend.py >/tmp/planB-t12-smoke.log 2>&1 & SRV=$!
sleep 1
for p in regulator.html js/pages/rg/authz.js js/pages/rg/inspect.js js/pages/rg/audit.js js/pages/rg/crypto.js; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18099/$p)"   # 预期各 200
done
kill $SRV 2>/dev/null; wait $SRV 2>/dev/null; echo SMOKE_DONE
```

- [ ] **Step 8: 记录 DEFERRED-HUMAN 清单（浏览器人工验收项，追加到任务报告）**

```
【计划 B Task 12 DEFERRED-HUMAN】（浏览器访问 http://127.0.0.1:8090/regulator.html）
- #/authz：申请表单 scope 复选组默认勾 ROUTE+PAYLOAD（multi 初始值）；有效窗预填 now−1h/now+4h（相对时间）；MISSION 上下文 chip 存在时 target_id 自动预填；提交 → PENDING 回执 9 行 kv（scope 字符串解析为「ROUTE、PAYLOAD」）+ AUTHORIZATION chip + 审批表单授权号自动预填；勾全 5 项 scope 提交另一单 → scope 全量回显；裁决 APPROVE（confirm 弹窗「APPROVE 将上链存证…DENY 仅本地记录不上链」）→ 绿色 statCard「✓ AUTHORIZED（已上链）」+ RegAudit kv（动作 AUTH_APPROVE）+ chain_tx_id 紫 ChainMaker 链标；裁决另一单 DENY → 红色「✕ DENIED（不上链）」+ 链上存证行「—（DENY 不上链，本地留痕）」；复审已裁决授权 → 6002 errCard 中性展示；生命周期说明卡四态文案。
- #/inspect：授权号留空执行 → 5002 errCard + 其下「🔒 封缄视图 sealed-only」卡五键（mission_id/SEALED 徽章/has_ciphertext ✓/脱敏值/SM3 截断）——明文不出现；填入 AUTHORIZED 授权号（scope 含 MISSION）→ 开箱态：3 statCard（✓已开箱绿 / ✓✓双通过绿 / N 项范围）+ decrypted_view 明文卡（p-mono）+ 12 行 kv（OPENED 徽章/route_verdict NOT_CHECKED/payload_verdict NOT_CHECKED/结论上链紫链标/reg_audit_id）+ MISSION chip 更新；scope 只含 ROUTE+PAYLOAD 的授权开箱 → decrypted_view 空文案「（空 = scope 无 MISSION 或无密文——未开箱）」；trajectory 选 NORMAL 且 scope 无 ROUTE → 5003 errCard+封缄卡；valid_to 已过（改表单时间重申请）→ 5004 errCard+封缄卡；mission 不存在 → 6002 仅 errCard（无封缄卡）；payload_type=MEDICAL_KIT 且 scope 含 PAYLOAD 且与任务载荷一致 → payload_verdict=PAYLOAD_OK。
- #/audit：reg 页签——四维文本过滤（动作填 INSPECT 只见核验留痕；operator_id REG-01）；Task 11 追踪产生的 TRACE_IDENTITY(_BROKEN) 行可见；行点击 → 抽屉 9 行 kv + result 原文 JSON 块（AUTH_APPROVE 行 result 含 decision+comment）；DENY 行链上存证「—（DENY 不上链）」；导出 CSV（regulatory-audit.csv，BOM 头 Excel 可开）；all 页签——三维过滤（business_id 填 MISSION 单号）；分页翻页正常（响应无 page 回显但 dataTable 兼容）；行点击 → 抽屉含 detail JSON 原文；导出 audit-all.csv；空结果 → emptyText 文案。
- #/crypto：SM3 卡默认 payload 计算 → 64hex 摘要 + canonical 键排序串（altitude_max 在 mission_id 前）；keygen UAV-A-001 → SM9-ID-UAV-A-001 且自动填入签名表单；签名 → signature base64 截断 + 摘要；「填入验签表单」→ 验签 ✓ valid=true 绿 statCard；篡改按钮（签名前 disabled，签名后解锁）→ 回填 altitude_max:999 → 验签 ✗ valid=false 红 statCard 且 code 仍 0（提示文案「valid=false 时 code 仍为 0」）；signature 粘贴非法串（如「不是base64!!」）→ 1002 errCard；keygen 同实体二次派生 → 同身份（确定性）。
```

- [ ] **Step 9: Commit**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/js/pages/rg/authz.js frontend/js/pages/rg/inspect.js frontend/js/pages/rg/audit.js frontend/js/pages/rg/crypto.js frontend/regulator.html
git commit -m "$(cat <<'MSG'
feat(frontend): 监管当局端 II——授权中心/密文核验/监管审计/密码工具箱四页，监管端 7 页齐（计划 B Task 12）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---
### Task 13: index.html 内部总控导航改造 + 文档同步

**Files:**
- Modify: `frontend/index.html`（仅导航结构与文案——Global Constraints #4；SPA 脚本区/app.js 零改动）
- Modify: `frontend/README.md`（全文替换）
- Modify: `CLAUDE.md`（仓库根，**仅工作树编辑，永不 git add**——它是预存 untracked 脏文件，Global Constraints #15）

**Interfaces:**
- Consumes: Task 5 的三入口 HTML（operator/authority/regulator.html 已存在）；Task 6-12 的 20 个页面文件名（README 结构树引用：`js/pages/op/{home,realname,aircraft,flight,license,ops,airspace}.js`、`js/pages/au/{queue,passes,records,registry,masterdata,netsec}.js`、`js/pages/rg/{cockpit,alerts,trace,authz,inspect,audit,crypto}.js`）；explain.js 计数 codes=26/paths=73（Task 5 断言已锁定）。
- Produces: 无代码接口。index.html 顶部三端入口卡片 = 产品入口的权威导航；frontend/README.md = 前端权威文档。
- 前提核对（执行时先跑）：`grep -c '64' frontend/README.md` 预期 3（:3/:29/:48 三处旧计数）；根 `CLAUDE.md` 的端点计数已在计划 A 同步为 73（勿重复改），只剩「前端」段与「文档地图」段两处过时。

- [ ] **Step 1: index.html 七处精确编辑（old_string 均为现存整行/整块，锚文本匹配，不依赖行号）**

Edit 1 —— 标题降格：

old_string：
```
<title>云巡信链 SkyTrust · 无人机跨域协同与可信监管平台</title>
```
new_string：
```
<title>云巡信链 SkyTrust · 内部总控导航（三端产品入口）</title>
```

Edit 2 —— head 末尾加 index 专用 pc-* 样式块（不进任何冻结样式表）：

old_string：
```
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='13' font-size='13'>🛰️</text></svg>">
</head>
```
new_string：
```
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='13' font-size='13'>🛰️</text></svg>">
<style>
/* 三端入口卡片（index 专用 pc- 前缀：不写入任何冻结样式表；Global Constraints #4——index.html 仅动导航结构与文案） */
.pc-note { padding: 14px 20px 0; font-size: 12.5px; color: var(--ink-3); }
.pc-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; padding: 14px 20px 0; }
.pc-card { display: flex; flex-direction: column; gap: 5px; padding: 15px 18px; text-decoration: none; color: var(--ink);
  background: var(--surface); border: 1px solid var(--border); border-top: 4px solid var(--pc-accent); border-radius: 10px;
  box-shadow: var(--shadow); transition: transform .15s ease; }
.pc-card:hover { transform: translateY(-2px); }
.pc-ico { font-size: 24px; line-height: 1; }
.pc-title { font-size: 15px; font-weight: 700; }
.pc-title small { font-weight: 400; font-size: 11px; color: var(--ink-3); margin-left: 6px; }
.pc-sub { font-size: 12px; color: var(--ink-2); line-height: 1.55; }
</style>
</head>
```

Edit 3 —— 顶栏副标文案：

old_string：
```
    <span class="brand-sub">无人机跨域协同与可信监管 · 真实三链演示台</span>
```
new_string：
```
    <span class="brand-sub">无人机跨域协同与可信监管 · 内部总控导航（三端产品入口见下方卡片）</span>
```

Edit 4 —— `</header>` 与 `<div class="layout">` 之间插入三端入口卡片区：

old_string：
```
</header>

<div class="layout">
```
new_string：
```
</header>

<!-- 三端产品入口（产品 = 三个独立门户；本页 SPA 为演示维护与参考流程，index.html 已降为内部总控导航页） -->
<div class="pc-note">产品入口：三个独立门户（严扣无人机主题，固定主题不切换）。本页为内部总控导航——平台总览、冻结的旧工作台、三幕参考流程与 API 浏览器仅供演示维护。</div>
<section class="pc-strip">
  <a class="pc-card" style="--pc-accent:#0b4ea2" href="operator.html">
    <span class="pc-ico">🛸</span>
    <span class="pc-title">运营商端<small>operator.html</small></span>
    <span class="pc-sub">民用无人驾驶航空器综合服务门户（UOM 风格）：实名登记 · 航空器登记 · 飞行活动申请 · 电子许可 · 运行识别与飞行动态 · 空域查询</span>
  </a>
  <a class="pc-card" style="--pc-accent:#143d75" href="authority.html">
    <span class="pc-ico">🏛️</span>
    <span class="pc-title">管理当局端<small>authority.html</small></span>
    <span class="pc-sub">审核签发 + 链网安全运营：审核队列 · 许可管理 · 审核留痕 · 登记与资质 · 主数据维护 · 链网安全运营</span>
  </a>
  <a class="pc-card" style="--pc-accent:#3d7fd6" href="regulator.html">
    <span class="pc-ico">📡</span>
    <span class="pc-title">监管当局端<small>regulator.html</small></span>
    <span class="pc-sub">跨域可信监管大屏：监管驾驶舱 · 告警管理 · 身份追踪 · 授权中心 · 密文核验 · 监管审计 · 密码工具箱</span>
  </a>
</section>

<div class="layout">
```

Edit 5 —— 侧栏分组改名（旧工作台降为参考）：

old_string：
```
    <div class="nav-group">四方角色工作台</div>
```
new_string：
```
    <div class="nav-group">旧工作台 · 参考（已冻结）</div>
```

Edit 6 —— 工具组端点计数刷新：

old_string：
```
      <a class="nav-item" href="#/explorer" data-page="explorer"><span class="nav-ico">⇄</span>API 浏览器（64 端点）</a>
```
new_string：
```
      <a class="nav-item" href="#/explorer" data-page="explorer"><span class="nav-ico">⇄</span>API 浏览器（73 端点）</a>
```

Edit 7 —— 侧栏脚注：

old_string：
```
      <div>契约：docs/apifox</div>
```
new_string：
```
      <div>契约：docs/apifox（73 端点）</div>
```

**明令不动**：`<div id="chain-lamps">` 三链灯、`#backend-badge`、`#theme-toggle`（index.html 保留 data-theme 主题机制，Global Constraints #7）、全部 `<script>` 行、`js/app.js`。

- [ ] **Step 2: frontend/README.md 全文替换（新文本逐字）**

````markdown
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
````

- [ ] **Step 3: 根 CLAUDE.md 两处工作树编辑（**永不 git add**——预存 untracked 脏文件；端点计数 73 已在计划 A 同步，勿动）**

Edit A —— 「前端（frontend/）」段（:97 附近，锚文本匹配）：

old_string：
```
零构建零依赖 SPA：`js/api.js`（统一 POST 客户端，永不 throw）、`js/pages/`（dashboard / act1 / act2 / act3 / explorer 五页）、`js/data/endpoints.js`（由 openapi.json 生成，**勿手改**）、`js/data/explain.js`（成功/失败解说词典）。「一键实跑」剧本含 7 个**理论失败步**（安全系统按设计拒绝，如 3004/4002/4001/5002），带「◈ 预期」徽章——改动剧本时保持该语义。
```
new_string：
```
零构建零依赖前端。**产品入口 = 三个独立门户**：`operator.html`（运营商端，UOM 风格政务蓝白）、`authority.html`（管理当局端，深蓝权威浅色）、`regulator.html`（监管当局端，深藏青暗色大屏）——共享底座 `js/api.js`（统一 POST 客户端，永不 throw）/`store.js`/`pui.js`，加 `portal.js`（hash 路由/三链心跳/天地图 key 引导）、`map.js`（vendor Leaflet 1.9.4 + 天地图瓦片，key 只存 localStorage 绝不入 git，无 key 自动退化底图）、`data/geo.js`（坐标红线：lat/lon 双零不画不连不猜）；三端页面在 `js/pages/{op,au,rg}/`，样式 `css/drone.css`（d-* 命名空间）+ `css/theme-{op,au,rg}.css`（令牌覆盖，固定主题不切换）。`index.html` 为**内部总控导航页**（顶部三端入口卡片 + SPA：平台总览 / 冻结旧工作台 wb-* / 三幕参考流程 dashboard·act1-3 / explorer），`js/app.js` 与旧页冻结勿动。`js/data/endpoints.js`（由 openapi.json 生成，**勿手改**）、`js/data/explain.js`（成功/失败解说词典）。旧「一键实跑」剧本含 7 个**理论失败步**（安全系统按设计拒绝，如 3004/4002/4001/5002），带「◈ 预期」徽章——改动剧本时保持该语义；新三端页面无此徽章，设计内拒绝以错误卡 + 解说词典呈现。
```

Edit B —— 「文档地图」段占位文件行（:113 附近；demo-script.md 已非占位）：

old_string：
```
- `docs/architecture.md`、`demo-script.md`、`deployment.md`、`repository-plan.md` 为空占位文件；项目总览见 `任务清单与报告.md`。
```
new_string：
```
- `docs/demo-script.md` —— **验收故事脚本**（《紧急医疗运输》九章，覆盖三端全流程与地图操作）；`docs/architecture.md`、`deployment.md`、`repository-plan.md` 为空占位文件；项目总览见 `任务清单与报告.md`。
```

（Edit B 在 Task 14 重写 demo-script.md 之前执行也没问题——文案描述的是 Task 14 的既定产出；若 Task 13 先于 Task 14 执行，该行在 Task 14 完成前短暂超前于事实，属可接受次序噪声，终审时已为真。）

- [ ] **Step 4: 验证**

```bash
cd /root/codes/skytrust-uav-supervision
# 1) index.html 结构断言
grep -c 'pc-card' frontend/index.html                    # 预期 5（style 块 .pc-card/.pc-card:hover 两处 + 卡片 3 处）
grep -c '64 端点\|64 个 API' frontend/index.html frontend/README.md   # 两文件均预期 0
grep -q 'operator.html' frontend/index.html && grep -q 'authority.html' frontend/index.html && grep -q 'regulator.html' frontend/index.html && echo PORTAL_LINKS_OK
grep -q '四方角色工作台' frontend/index.html && echo GROUP_RENAME_FAIL || echo GROUP_RENAMEED_OK
# script 区零改动（13 个 js 脚本行仍在，app.js 仍最后）
grep -c '<script src=' frontend/index.html               # 预期 13
tail -3 frontend/index.html | grep -q app.js && echo APPJS_LAST_OK
# 2) README 计数
grep -c '73' frontend/README.md                          # 预期 ≥4（73 个 API/73 端点全量/26 错误码 + 73 端点 ×2）
grep -q '26 错误码' frontend/README.md && echo README_COUNTS_OK
# 3) CLAUDE.md 仅工作树（提交前核验暂存区绝不含它）
git status --short CLAUDE.md                             # 预期 '?? CLAUDE.md'（untracked，保持）
# 4) 隔离端口 smoke（红线 #11：只起 18099 第二实例，只 GET，用完杀掉自己起的进程）
PORT=18099 BACKEND=http://127.0.0.1:1 python3 scripts/serve-frontend.py >/tmp/serve-18099.log 2>&1 &
SERVE_PID=$!; sleep 1
curl -s http://127.0.0.1:18099/index.html | grep -c 'pc-strip'   # 预期 1
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:18099/index.html   # 预期 200
kill $SERVE_PID
```

预期：5、两处 0、`PORTAL_LINKS_OK`、`GROUP_RENAMEED_OK`、13、`APPJS_LAST_OK`、`README_COUNTS_OK`、`?? CLAUDE.md`、1、200。浏览器目检（卡片布局/暗色主题下卡片可读性/旧 SPA 路由不受影响）= **DEFERRED-HUMAN**。

- [ ] **Step 5: 提交（暂存区只准两个文件；CLAUDE.md 永不 stage）**

```bash
cd /root/codes/skytrust-uav-supervision
git add frontend/index.html frontend/README.md
git diff --cached --stat          # 预期恰 2 个文件；出现 CLAUDE.md 即红线违规，立即 git reset
git commit -m "$(cat <<'MSG'
docs(frontend): index.html 降为内部总控导航页（三端入口卡片+旧工作台冻结改名+73 计数）+ README 三端全量重写（计划 B Task 13）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---

### Task 14: docs/demo-script.md 覆盖重写——《紧急医疗运输：一次跨域飞行的全程可信监管（三端版）》

**Files:**
- Modify: `docs/demo-script.md`（整文件覆盖重写——现 189 行旧版单端剧本全部作废；旧固定值 OP-MED-01/MF-MED-01/PS-MED-01/固定钟点时窗等废弃，R-MED-01/Zone-M 命名沿用）

**Interfaces:**
- Consumes:
  - spec §6 权威大纲（章 0–8 + 附录三件：①验收前检查清单含相对时间窗守则、②设计内拒绝汇总表每条配「为什么拒绝恰恰证明系统在保护你」台词、③预计时长约 30 分钟；trajectory 参数全程留空）。
  - Task 6–12 三端页面的**真实 UI 标签/表单默认值**（本任务全文引用的每个控件都已对照计划内页面代码核实：起飞报备 · 建立会话 / 降落报备 / 飞行前验证 / 提交登记 / 提交执照申领 / 提交跨域申请 / 冲突检测 / 消解此冲突 / 提交裁决 / 确认签发 / 吊销 / 注册节点 / ⚠ 开启虫洞攻击 / 评估风险 / 切换路径 / 登记告警 / 转七级身份追踪 / 开始七级追踪 / 推进状态 / 提交授权申请 / 裁决 / 执行核验 / 篡改；netsec 消息表单源节点默认 `UAV-A-001-NODE`——剧本第 5 章须显式改为 `UAV-MED-01-NODE`）。
  - 后端机制裁定（写剧本前已逐一核源码，防止剧本指挥出与后端不符的操作）：
    - `uav.go:197`：uav/register 跨链证明成功即自动 VERIFIED（「注册即核验」是字面事实，无 VERIFY 步）；
    - `pass.go:99`：pass/issue 要求任务 APPROVED（3004）且 UAV 恰为 VERIFIED（6002）——第 8 章 ACTIVATE 必须排在签发/吊销之后；
    - `topology.go:116`：虫洞开启后**凡触及 NODE-X/Y 的边通告时延恒 1ms**（不止 X↔Y 隧道边）——诱入消息路径时延 ≈19ms，低于地理下限 35.4ms（(0,0)→(50,50)×0.5）；正常路径 ≈40ms；
    - `message.go:92+syncSession`：message/send 按**实时拓扑**路由并覆盖会话 CurrentPath（虫洞开启后发消息必入隧道）；RECOVERED 会话发消息成功自动回归 ACTIVE；
    - `detection.go`：risk/evaluate 5 维——邻接 0.35（N1→NODE-X 真实距离 41>30）+ 时延 0.25 + 挑战 0.25（隧道两端时差恒 0）= 0.85，有心跳历史再 +0.15 路径维 → ≥阈值 0.7 必 DETECT；联动 ISOLATE（X/Y ONLINE→ISOLATED）+ ACTIVE 会话→DEGRADED；
    - `telemetry_autopilot.go:91`：自动驾驶只推进 **ACTIVE** 会话且 mission_id 非空、任务航段有结构化坐标——DEGRADED 即停摆（第 5 章跨端停摆机制）、RECOVERED 也不动（须第 7 步确认消息回归 ACTIVE 后才恢复）；
    - `recover.go`：path/switch 仅 DEGRADED 可用，重算图排除 ISOLATED 节点；
    - `wormhole.go`：X/Y 任一 ISOLATED 时重开虫洞 → 4001（隔离态优先于攻击开关，只能 demo/reset 复位）；
    - `trace.go` + 种子映射 IDM-DEMO-0001（PSEUDO-UAV-83921 → UAV-A-001/Operator-A/Manufacturer-B/PassID=PASS-2026-001）：L3 = flight_pass 中 pass_id 存在性检查（仅计数）——**第 3 章显式签发 PASS-2026-001 是第 6 章 break_level=0 全链可走通的前提**；未知伪名 → 5001 L1 BROKEN + L2–7 skipped；
    - `tc2_test.go attackSession`（P5-R11 固定顺序）：开洞→诱入消息→评估 是验收过的攻防链路，剧本第 5 章照此编排（差别：对既有医疗会话诱入而非新建会话——message/send 实时路由使既有会话同样入洞）；
    - 种子数据（`internal/demo/seed.go`）：厂商 3 / 运营商 3（含 Operator-B）/ 航空器 7（含 UAV-B-001 VERIFIED、UAV-A-001）/ 航段 5 / 节点 8（UAV-A-001-NODE(0,0)→N1→N2→N3→N4→MGR(50,50) 链 + NODE-X(1,50)/NODE-Y(99,51) ATTACKER OFFLINE）。
  - Global Constraints #8（天地图 key 只存 localStorage）、#9（不造假坐标）、#10（模拟证件号红线）、#11（生产进程红线——正式验收由人在 :8080/:8090 部署实例上手动进行；自动化排练只走 Task 15 隔离环境，两者绝不混用）。
- Produces:
  - **剧情固定值速查表 = Task 15 verify 脚本的输入值权威**（UAV-MED-01、PASS-2026-001、PSEUDO-UAV-83921、PSEUDO-UNKNOWN-999、ALERT-2026-001、AUTH-2026-001、R-MED-01/Zone-M、Operator-MED/Manufacturer-MED、UAV-MED-01-NODE(X=0,Y=0,邻居 N1,30.510/114.310)、企业/操控员/航空器登记值、医疗任务描述含「特殊血样」、B 任务 Operator-B/UAV-B-001/CARGO/CAMERA/80-120）；
  - 附录 A 检查清单（Task 15 的 DEFERRED-HUMAN 汇总引用）；附录 B 七行设计内拒绝表（3004/4001/5001/5002×2/valid=false×2/1004）；
  - 两条全局纪律的成文权威：**相对时间窗守则**（全脚本零固定钟点）与 **trajectory 全程留空**。

- [ ] **Step 1: 整文件覆盖写入 docs/demo-script.md（完整全文如下，Write 一次替换，189 行旧版作废）**

````markdown
# 紧急医疗运输：一次跨域飞行的全程可信监管（三端版）

> 本脚本既是**操作手册**也是**解说词**：每章由「台词要点」（讲解用）→「操作」（精确到端/页/按钮/字段值）→「预期证据」（验收核对）三部分组成。
> 三端 = 三个浏览器标签页：运营商端 `operator.html`（政务蓝白，UOM 风格）、管理当局端 `authority.html`（深蓝权威浅色）、监管当局端 `regulator.html`（深藏青大屏）——切换标签页即换视角。三端同源共享后端与 localStorage 上下文：顶栏 chip（身份/任务/许可/会话/告警/授权）跨端自动预填，剧本大量依赖这一点。
> 界面本身无剧情文案：所有故事台词都在本脚本里，界面呈现的是政务通用的表单、台账与地图。
> 时间输入一律**相对指令**（如「当前时间 −1 小时」），全脚本零固定钟点；第 7 章「申报轨迹」参数**全程留空**。两条纪律的原因见附录 A。
> 预计总时长约 30 分钟（附录 C）。排练可用 `scripts/verify-three-portals-story.sh` 一键实跑 API 层（隔离仿真环境，绝不触碰生产实例）；正式验收全程手动按本脚本执行。

## 角色与固定值速查

**端与角色常量**

| 端 | 入口 | 主题 | 角色常量 |
|---|---|---|---|
| 运营商端 | `operator.html` | 政务蓝白 | 运营方操作者 `Operator Portal`；冲突戏兼任物流商 B 操作者 `Operator-B` |
| 管理当局端 | `authority.html` | 深蓝权威浅色 | 审核员 `Manager-A`；签发/吊销方 `FISCO-ADMIN`；链网安全运营 `SecOps` |
| 监管当局端 | `regulator.html` | 深藏青大屏 | 监管方 `REG-01`；授权审批人 `REG-ADMIN` |
| 内部导航页 | `index.html` | 现有机制不动 | 仅第 0 章后台整备用，**不算产品叙事** |

**剧情固定值（照抄即可；均已与种子数据和后端机制核对）**

| 项 | 值 |
|---|---|
| 企业主体 | 紧急医疗运输企业 · 统一社会信用代码（模拟）`91420100MED0001X` · 联系方式 `027-88880002` |
| 操控员 | 医疗运输操控员 · 证件号（模拟）`420100199203054321` · 类别「垂直起降」 |
| 航空器 | `UAV-MED-01` · 型号 DJI-M350-RTK · 序列号 `SN-MED-001` |
| 主数据 | 运营商 `Operator-MED`（名称：紧急医疗运输运营商）；厂商 `Manufacturer-MED`（名称：医疗航空装备厂商） |
| 医疗走廊 | 航段 `R-MED-01` · 区域 `Zone-M` · 地图点选真实坐标 · 高度带 60–120 米 |
| 链下接入点 | 节点 `UAV-MED-01-NODE` · 类型 UAV · 拓扑坐标 X=0、Y=0 · 邻居 `N1` · 经纬度 = 走廊起点 |
| 飞行许可 | **显式许可号 `PASS-2026-001`**（第 3 章签发；第 6 章全链追踪 L3 依赖它） |
| 监管剧情 | 伪名 `PSEUDO-UAV-83921`（种子索引 IDM-DEMO-0001 的剧情航空器伪名）；断链对照 `PSEUDO-UNKNOWN-999`；告警号 `ALERT-2026-001`；授权号 `AUTH-2026-001` |
| 任务描述 | 特殊血样（RH 阴性）紧急运输，全程冷链箱专用，市一医院直达血液中心 |
| B 任务（冲突戏） | 运营商 `Operator-B` · 航空器 `UAV-B-001` · 类型 CARGO · 载荷 CAMERA · 同走廊 `R-MED-01` · 高度 80–120 |

**两条全局纪律**
1. **时间窗一律相对**：任务窗 = 表单默认（当前 +1 小时 ～ +4 小时）；许可窗 = 当前 −1 小时 ～ +4 小时（第 3 章手动改）；授权窗 = 表单默认（当前 −1 小时 ～ +4 小时）。无论几点演示都不用改脚本。
2. **「申报轨迹」全程留空**（第 7 章密文核验）：填 NORMAL 会撞硬编码基线必报偏航、污染驾驶舱统计——红线。

**剧情编号约定**：医疗任务号与 B 任务号由系统自动生成（MISSION-2026-xxxx），剧本中分别称「医疗任务号」「B 任务号」——创建后顶栏 chip 自动收录，全端预填，无需手抄。

## 第 0 章 · 开场整备（内部导航页——不算产品叙事）

**台词要点**
- 这是演出前的后台检查，不属于产品叙事：三链状态、演示数据复位、地图密钥三件事。
- 整备完成的标准：三链 ONLINE、种子计数核对、三端标签页就绪。

**操作**
1. 打开 `index.html`（内部总控导航页），顶部三端入口大卡片依次点开三个标签页：`operator.html`、`authority.html`、`regulator.html`。**指**：三端主题一眼可辨——政务蓝白 / 深蓝权威浅色 / 深藏青大屏。
2. 在 SPA「平台总览」（#/overview）核对**三链状态条**：chainmaker（监管链）/ fabric（运营链）/ fisco-bcos（管理链）三链 `ONLINE`。
3. 同页「演示维护」区：先点「复位演示数据 demo/reset」（红色确认框——清空全部业务表并复位模拟链；**真实链上数据不受影响**），再点「灌注演示数据 demo/init」。
4. 天地图 key：任一端首次进地图页会弹配置引导——粘贴 key（只存本浏览器 localStorage `skytrust-tianditu-key`，绝不入仓库）；三端同源，配一次全端生效。无 key 可跳过：地图自动退化为中性网格底图并挂退化徽章，矢量层（航线/区域/节点/无人机）恒自绘照常——演示不砸场。

**预期证据**
- demo/reset 与 demo/init 均 code=0；种子计数：**厂商 3 / 运营商 3 / 航空器 7 / 航段 5 / 节点 8**。
- 三个标签页各自呈现本端主题与侧边栏（运营商 7 页 / 管理端 6 页 / 监管端 7 页）。
- 地图页瓦片正常显示，或退化徽章 + 矢量层照常。

## 第 1 章 · 建档（管理当局端 → 运营商端）

**台词要点**
- 故事从「建档」开始：管理当局先建主数据与医疗走廊，运营商再完成企业实名、操控员执照、航空器登记。
- 核心台词：**注册即核验、登记即上链**——航空器登记成功即 VERIFIED 并附二维码与跨链四段 TxID，没有人工核验步。
- 红线台词：演示环境仅收取**模拟证件号**（格式示意统一社会信用代码/身份证号），系统不采集、不存储任何真实证件信息。

**操作**
1. **管理当局端 #/masterdata「主数据维护」**：注册运营商 `Operator-MED`（名称：紧急医疗运输运营商）、厂商 `Manufacturer-MED`（名称：医疗航空装备厂商）。
2. **同页「航段主数据」**：建医疗走廊——航段 ID `R-MED-01`、区域 `Zone-M`、高度下限 60 / 上限 120，起终点名称填 `S9(30.510,114.310)` 与 `MED-CENTER(30.590,114.390)`。**在表单内嵌地图上点选两击**：第 1 击 = 走廊起点（武汉市一医院方向，参考 30.510, 114.310），第 2 击 = 终点（血液中心方向，参考 30.590, 114.390），第 3 击 = 清空重选；四坐标键自动填入。**指**：坐标来自真实底图上的鼠标点选——系统从不造假坐标，点到哪儿走廊就在哪儿；只填一半坐标会被前端直接拦截。
3. **运营商端 #/realname「主体登记」页签**：主体类型「企业」、主体名称 `紧急医疗运输企业`、证件号码（模拟）`91420100MED0001X`、联系方式 `027-88880002` → 「提交登记」。回执卡显示 `RNS-` 主体号；顶部身份条自动变为「当前身份 🏢 企业 · 紧急医疗运输企业」——**选定即全端预填**。
4. **「操控员执照」页签**：姓名 `医疗运输操控员`、证件号码（模拟）`420100199203054321`、航空器类别「垂直起降」→ 「提交执照申领」。**即申即发**：执照凭证卡 `ISSUED`、失效时间 = 签发 + 2 年、附 SM9 局方签名。
5. **管理当局端 #/registry「登记与资质」**：找到该执照做 SM9 验签（验签身份 `SM9-ID-FISCO-ADMIN`，七键规范载荷）→ valid=true。**台词**：运营商端即发的执照，管理端可当场验签——签名即凭证，跨端互认不靠电话核实。
6. **运营商端 #/aircraft「航空器登记」页签**：航空器 ID **显式填 `UAV-MED-01`**（留空会自动生成，本剧情必须显式）、生产厂商选 `Manufacturer-MED（医疗航空装备厂商）`、运营企业选 `Operator-MED（紧急医疗运输运营商）`、型号 `DJI-M350-RTK`、产品序列号 `SN-MED-001`、关联实名主体已自动预填（RNS-）→ 「提交登记」。

**预期证据**
- 航段台账出现 R-MED-01（Zone-M，四坐标齐全，地图可见走廊线）。
- 实名回执卡（RNS-）+ 身份条；执照台账 1 行：PIL- 执照 ID / UAV-PILOT-2026- 编号 / ISSUED / 失效 = 签发 + 2 年。
- 登记证明卡：登记标志 `UAS-2026xxxx` + 二维码 + 状态 **VERIFIED**（旁注「实名核验通过」）+ 跨链存证四段 TxID（fabric → chainmaker 签收/中继 → 存证，全 SUCCESS）。
- 管理端验签 valid=true。

## 第 2 章 · 任务申请（运营商端）

**台词要点**
- 任务描述里有「特殊血样」四个字——但提交之后，任何端的任何界面都只见脱敏值：**明文永不出域，密文入库**。
- 冲突协调不是否决权：同走廊、时窗重叠、高度带交叉会被三维冲突检测识别，然后**协调消解**，不是谁抢谁。

**操作**
1. **运营商端 #/flight「新建申请」**：运营企业 `Operator-MED`、航空器 `UAV-MED-01`、任务类型 `MEDICAL`（默认）、载荷类型 `MEDICAL_KIT`（默认）、航段勾选 `R-MED-01`、高度 60/120（默认）、时间窗保持默认（**当前 +1 小时 ～ +4 小时**，相对值）、关联执照选「医疗运输操控员」、任务描述填固定值表全文 → 「创建任务」。顶栏 MISSION chip 自动收录**医疗任务号**。
2. 「我的任务」台账点该行进详情抽屉：**指**描述字段显示的是**脱敏值**，找不到「特殊血样」明文。**台词**：明文只存在于表单填写的那一刻——隐私是设计出来的，不是承诺出来的。
3. 该行点「提交跨域申请」→ 跨链 MISSION_APPLICATION 四段 TxID 全 `SUCCESS`，状态徽章推进 SUBMITTED。
4. **物流商 B 戏份**（同一端操作，身份切换纯属剧情）：「新建申请」——运营企业 `Operator-B`、航空器 `UAV-B-001`、任务类型改 `CARGO`、载荷 `CAMERA`、航段同勾 `R-MED-01`、高度改 **80/120**（与医疗任务 60–120 交叉）、时间窗保持默认（与医疗任务自然重叠）、描述：常规走廊物流运输 → 「创建任务」→ 台账行「提交跨域申请」。
5. 回到**医疗任务**行点「冲突检测」→ 命中列表出现 B 任务：ROUTE 冲突（同走廊 R-MED-01 + 时窗重叠 + 高度带 80–120 与 60–120 交叉）+ 消解建议。
6. 命中行点「消解此冲突」→ 消解表单 conflict_id 已预填：消解措施 `时间窗后移 30 分钟`、操作方改为 `Operator-B`、继续执行方任务号 = B 任务号 → 「提交消解」。
7. **设计内拒绝**：对同一冲突再点一次「提交消解」→ **3004 冲突已消解**。**台词**：协调有账本——同一冲突只能消解一次，重复「消解」被拦截，这是对操作重放的防护。

**预期证据**
- 两任务跨域提交均 SUCCESS（四段 TxID）；冲突检测命中 1 条（ROUTE/三维重叠）；消解成功后冲突状态闭环；重复消解 3004 错误卡 + 解说词典释义（无「◈ 预期」徽章——新三端页面以错误卡 + 解说呈现设计内拒绝）。

## 第 3 章 · 审核与许可（管理当局端）

**台词要点**
- 审核员看到的同样是脱敏值——**隐私边界对所有角色一致**；审核权来自链上证据与规则命中，不来自偷看明文。
- 许可号**显式指定 `PASS-2026-001`**：与监管链身份索引（种子映射）同源，第 6 章七级追踪的 L3 许可级全靠这次上链走通。

**操作**
1. **管理当局端 #/queue「审核队列」**：待审队列（跨链 MISSION_APPLICATION · SUCCESS 流水）出现医疗与 B 两条申请。点医疗任务行 → 工作台：**脱敏详情 + 小窗地图**（医疗走廊与区域按比例渲染）+ 规则命中列表。
2. 裁决表单：结果 `APPROVED`、审核员 `Manager-A`、批注：剧情相符，走廊可用，同意跨域执行 → 「提交裁决」→ MISSION_REVIEW_RESULT 跨链回传 `SUCCESS`。
3. 同法裁决 B 任务 `APPROVED`（审核员 Manager-A，批注：时间窗已后移，同意）。
4. **#/passes「许可管理 · 签发」**：任务号 = 医疗任务号（chip 预填）、签发方 `FISCO-ADMIN`（默认）、**许可号显式填 `PASS-2026-001`**（留空会自动生成，本剧情必须显式）、valid_from = **当前时间 −1 小时**、valid_to = **当前时间 +4 小时**（相对时间窗见附录 A；−1 小时保证核验时已生效）→ 「确认签发」。
5. 台账点 PASS-2026-001 行 → 抽屉：九行许可详情 + 「验证」（pass/verify → valid=true 绿灯）+ 跨链 FLIGHT_PASS 存证四段。

**预期证据**
- 两条裁决 APPROVED；#/records「审核留痕」按医疗任务号可查 MISSION_REVIEW_RESULT 流水。
- PASS-2026-001 状态 VALID、有效窗 = 相对指令值、关联医疗任务号与 UAV-MED-01；抽屉验证 valid=true。
- **台词素材（后端守卫）**：签发要求任务 APPROVED（否则 3004）且航空器恰为 VERIFIED（否则 6002）——第 1 章「注册即核验」在此兑现价值。

## 第 4 章 · 起飞（运营商端，含管理端接入整备）

**台词要点**
- 起飞报备的第一步是接入链下可信网络：安全运营为医疗航空器开接入点，SM9 挑战-应答认证，初始可信路径当场建立。
- **关联任务是飞行的前提**：自动驾驶沿任务航段走廊生成遥测——任务号留空则只建会话不飞。

**操作**
1. **运营商端 #/license「电子飞行许可」**：许可号 chip 预填 `PASS-2026-001` → 电子许可卡（二维码 + 小窗地图）→ 「飞行前验证」→ **绿灯**：valid=true、reasons 空。**台词**：起飞前自查通过，放行。
2. **管理当局端 #/netsec「拓扑·节点」**（接入整备）：「节点注册」——节点 ID `UAV-MED-01-NODE`、节点类型 `UAV`、拓扑坐标 X=0、Y=0、邻居 `N1`、纬度 `30.510`、经度 `114.310`（= 走廊起点，落真地图）→ 「注册节点」。**台词**：没有这个接入点，起飞报备会被 6002 拒绝——链下网络不认无接入点的航空器。
3. **运营商端 #/ops「运行识别·飞行动态」**：「起飞报备 · 建立会话」表单——航空器 `UAV-MED-01`，关联任务/关联许可已由 chip 预填（若空则手填医疗任务号与 `PASS-2026-001`），源/目标节点留空（缺省 `UAV-MED-01-NODE` → `MGR`）→ 「起飞报备 · 建立会话」。
4. 回执核对：会话号 + 状态徽章 **ACTIVE** + SM9 认证「✓ 挑战-应答通过」+ Nonce/签名回显 + **初始可信路径** `UAV-MED-01-NODE → N1 → N2 → N3 → N4 → MGR`（6 节点）。
5. 盯住地图**飞行动态**：无人机图标从走廊起点起飞，**沿 R-MED-01 实时移动**（3 秒轮询 telemetry/latest，source=SIM）；遥测台账 seq 递增、经纬度/高度/航向逐行刷新；会话消息台账同时出现心跳流水（后端消息自动驾驶对 ACTIVE 会话持续发 HEARTBEAT）。
6. 会话台账点该 ACTIVE 行 → 「飞行接管」：顶部当前会话卡显示会话号/状态/关联任务/当前路径。

**预期证据**
- valid=true 绿灯；节点台账 9 条（种子 8 + UAV-MED-01-NODE ONLINE，地图可见）。
- 会话 ACTIVE、路径 6 节点；地图无人机沿走廊平滑移动（无天地图 key 时矢量层照常移动）；遥测 source=SIM、坐标落在走廊附近（不造假坐标）。
- 会话消息台账心跳流水增长、时延 ≈40ms 量级（第 5 章对照基线）。

## 第 5 章 · 攻防（管理当局端 + 运营商端）

**台词要点**
- 管理端是全量视角：攻击节点 NODE-X/NODE-Y 一直看得见；运营商端地图上**从不显示**它们——信息边界即角色边界。
- 虫洞 = 谎报时延极短的伪造隧道：消息被诱入后时延骤降——**「太快」本身就是物理矛盾**。
- 5 维风险引擎（身份/邻接/时延/挑战/路径，阈值 0.7）检出即隔离 + 会话降级 → **运营商端飞行动态同步停摆**（攻击影响的跨端可视化）→ 路径重算恢复 → 飞行动态恢复。

**操作**
1. **管理当局端 #/netsec「拓扑·节点」**：真地图拓扑 9 节点，其中 `NODE-X`/`NODE-Y` 红色 ATTACKER（OFFLINE）。**切运营商端 #/airspace**：勾开「网络节点图层」复选框——没有这两个节点。**台词**：运营商只见正常网络，攻击者属于安全运营视角。切回管理端。
2. **「攻防演练」页签**：点「⚠ 开启虫洞攻击」（红色确认框）→ X/Y 上线 + 虚假邻接写入（N1↔NODE-X、NODE-Y↔N4）+ 拓扑图出现红色虚线隧道边 + 统计卡「虫洞攻击 ⚠ 开启中」、网络边 5→8。
3. **「会话·消息」页签**：向医疗会话发诱入消息——会话号 chip 预填（医疗会话）、消息类型 `POSITION_UPDATE`、**源节点改为 `UAV-MED-01-NODE`**（表单默认是 UAV-A-001-NODE，必须改）、目标节点 `MGR` → 「发送」。**指**：消息 path 已变为 `UAV-MED-01-NODE → N1 → NODE-X → NODE-Y → N4 → MGR`（隧道段），时延从第 4 章心跳的 ≈40ms **骤降到 ≈19ms**。**台词**：路由引擎只看通告时延——虫洞谎报「我更快」，消息就被自动诱入；但两端真实距离摆在那儿，时延低于地理下限，「太快」就是破绽。
4. **「攻防演练」页签**：「风险评估」——会话号 = 医疗会话（chip 预填）、隧道端点 X/Y 留空（缺省取会话相关虫洞端点）→ 「评估风险」：**风险分 ≥ 0.70（典型 0.85，有心跳历史则 1.00）**、裁定 **DETECT**、5 维分数条点亮（邻接 0.35：X→Y 真实距离 98 远超阈值 30；时延 0.25：实测低于地理下限；挑战 0.25：隧道两端挑战-响应时差恒 0——共享时钟）、联动安全事件 **DETECT + ISOLATE**、会话状态 **DEGRADED**；节点台账 X/Y 变 `ISOLATED` 并带风险分。
5. **切运营商端 #/ops**：地图无人机**停摆**、遥测台账 seq 不再增长。**台词**：降级会话 = 自动驾驶停止推进——安全运营端的一次攻防，就是运营商端的一次停摆；两端看到的是同一件事。
6. **切回管理端「攻防演练」**：「切换路径」——会话号预填、操作方 `SecOps`（默认）、新路径留空（自动重算）→ 「切换路径」：会话 **RECOVERED** + 新路径天然排除 X/Y（隔离节点不进可信图）+ 恢复时延 + RECOVER 事件留痕。
7. **「会话·消息」**：再发一条 `POSITION_UPDATE`（同第 3 步参数）→ 消息走干净路径（不含 NODE-X/Y），会话**自动回归 ACTIVE**（消息流通即恢复完成）。切运营商端 #/ops：**无人机恢复移动**。
8. **设计内拒绝**：「攻防演练」再点「⚠ 开启虫洞攻击」→ **4001**——隔离残留不可由开关复位（隔离态优先于攻击开关），只有 demo/reset 能整体还原。**台词**：攻击者不能自我平反，处置记录不可抹除。（此刻**不要** reset——X/Y 隔离残留不影响后续章节。）

**预期证据**
- 运营商端空域页无 ATTACKER 节点、管理端拓扑全量可见（信息边界对照成立）。
- 隧道开启后网络边 5→8；诱入消息 path 含 NODE-X→NODE-Y、时延约减半。
- DETECT（≥0.70）+ ISOLATE 事件留痕（事件台账 DETECT/ISOLATE/RECOVER 三事件齐全）；X/Y `ISOLATED`。
- 运营商端停摆 → 恢复全程可见（seq 停增 → 复增）；重开虫洞 4001 错误卡 + 解说。

## 第 6 章 · 追踪（监管当局端）

**台词要点**
- 监管方收到系统二上报的攻击告警，里面只有一个**匿名伪名**——七级追踪把伪名逐级解析回真实身份：跨链索引是证据枢纽。
- 全链可走通（break_level=0）是高光；未登记伪名则**宁可展示断链也不拼造身份**（5001 + 断点留痕）——断链本身就是最诚实的监管结论。

**操作**
1. **监管当局端 #/alerts「告警管理 · 登记告警」**：航空器伪名 `PSEUDO-UAV-83921`、事件类型 `WORMHOLE_ALERT`（默认）、风险等级 `HIGH`（默认）、来源系统 `SYSTEM2`（攻击证据来自系统二）、操作方 `REG-01`（默认）、告警号**显式填 `ALERT-2026-001`**、关联任务 = 医疗任务号（chip 预填）、虫洞事件号可从管理端 netsec 事件台账抄 DETECT 事件号（可选）→ 「登记告警」。
2. 台账行点「转七级身份追踪 →」（或 **#/trace「身份追踪」**）：追踪入口「告警号（alert_id）」已预填 `ALERT-2026-001`、操作方 `REG-01` → 「开始七级追踪」。
3. **高光时刻**：追踪结论卡 **「✓ 全链可溯」（break_level=0）**——七级时间线逐级绿灯：L1 伪名 → 映射 `IDM-DEMO-0001`；L2 设备地址；L3 **许可 `PASS-2026-001`**——正是第 3 章显式签发的那张；L4 SM9 身份验签；L5 航空器登记（`UAV-A-001`）；L6 运营商（`Operator-A`）；L7 厂商（`Manufacturer-B`）。**台词**：从匿名伪名到实名主体，七级证据链逐级可溯，没有一级靠猜。**诚实注记（照实讲）**：种子索引把该伪名绑定在平台内置剧情航空器 UAV-A-001 上，其许可号与第 3 章医疗许可 PASS-2026-001 同号同源——演示环境共用同一条剧情证据链；追踪能力本身与绑定对象无关。
4. **断链红线**：追踪入口改「航空器伪名（pseudo）」、入口值 `PSEUDO-UNKNOWN-999` → 「开始七级追踪」→ **5001** 错误卡：L1 `BROKEN`（「chainmaker 索引无此身份映射」）+ L2–L7 全部 `skipped: break at level 1`（断点时间线留痕）。**台词**：系统宁可给你一个断链，也不拼造一个假身份——对未登记航空器，断点处没有任何「看起来像」的痕迹，这就是监管的诚实。
5. **#/alerts「状态推进」**：对 `ALERT-2026-001` 单步推进四段——`IDENTIFIED`（伪名已定位）→ `TRACED`（七级追踪完成，全链可溯）→ `REVIEWED`（人工复核：攻击已隔离）→ `RESOLVED`（路径已恢复，告警闭环）；每步填推进理由、操作方 `REG-01`，台账徽章逐步同步。**指**：状态机只许单步——跳级推进会被 1004 拒绝。

**预期证据**
- ALERT-2026-001 登记成功（WORMHOLE_ALERT / HIGH / SYSTEM2 / 关联医疗任务号）。
- 追踪 resolved=true、break_level=0，七级全 RESOLVED，L3 命中 PASS-2026-001。
- PSEUDO-UNKNOWN-999 → 5001 + 断点时间线（L1 BROKEN、L2–7 skipped）。
- 告警终态 RESOLVED，四段推进理由留痕。

## 第 7 章 · 授权开箱（监管当局端）

**台词要点**
- 开箱任务明文需要**授权 + scope + 有效窗**三者同时满足；未授权只见封缄——**明文绝不进错误信封**。
- 篡改检测闭环：签名 → 验证 → 篡改 → 复验。**code=0 是「核验动作成功」，业务结论在 valid**——这是全平台 API 铁律的缩影。

**操作**
1. **监管当局端 #/authz「授权中心 · 授权申请」**：监管方 `REG-01`（默认）、授权范围**四项全勾**（`MISSION`+`ROUTE`+`PAYLOAD`+`IDENTITY`；表单默认只勾 ROUTE+PAYLOAD，补勾另两项）、目标类型 `MISSION`（默认）、目标单号 = 医疗任务号（chip 预填）、授权号**显式填 `AUTH-2026-001`**、申请理由：虫洞告警排查：需核对医疗任务申报与载荷一致性、生效/失效时间保持默认（**当前 −1 小时 ～ +4 小时**，已是相对值）→ 「提交授权申请」。
2. 同页「裁决」区：授权号 chip 预填 `AUTH-2026-001`、裁决 `APPROVE`（默认）、审批人 `REG-ADMIN`（默认）、批注：情况属实，同意开箱核验 → 「裁决」→ **✓ AUTHORIZED（已上链）** + ChainMaker 存证回显。
3. **#/inspect「密文核验」——先无授权**：清空授权号字段（顶栏 AUTHORIZATION chip「✕ 清空」）、任务号保持医疗任务号、申报载荷类型与**申报轨迹均留空** → 「执行核验」→ **设计内拒绝 5002**：只返回封缄元数据（密文摘要等），响应里**没有任何明文字段**。**台词**：未授权不开箱——数据最小化；即便监管方自己误操作，看到的也只是「已封缄」这个事实。
4. **带授权开箱**：授权号重新填 `AUTH-2026-001`（chip 自动恢复）、任务号 = 医疗任务号、申报载荷类型 `MEDICAL_KIT`、**申报轨迹留空**（全局纪律，见附录 A）→ 「执行核验」：**✓ 已开箱**——任务描述明文「特殊血样」重现 + 授权核验 ✓ + scope 4 项回显 + **完整性双验证 ✓✓ 双通过**（摘要匹配 + 签名有效）+ 载荷一致性结论 PAYLOAD_OK（申报 MEDICAL_KIT 与任务一致）+ 核验结论上链留痕。**台词**：第 2、3 章处处脱敏的明文，此刻凭授权开箱——明文只对这个人、在这个 scope、在这个时间窗内可见。
5. **#/crypto「密码工具箱」**：走一遍篡改检测闭环——SM3 哈希任意文本（如医疗任务号）记下摘要 → SM9 生成密钥/签名 → 签名贴入验证 → valid=true → 点「篡改」按钮（自动把 altitude_max 改成 999）→ 再次验证 → **valid=false，而 code 仍为 0**。**台词**：改一个字符，签名立刻失效；「验证成功但结论为否」正是安全系统的常态——code 说的是「核验这个动作完成了」，valid 说的才是「数据可信吗」。

**预期证据**
- AUTH-2026-001：scope 四项、目标 = 医疗任务号、有效窗 = 相对值；APPROVE 后 AUTHORIZED + 上链存证。
- 无授权核验 → 5002 封缄卡，无明文；带授权 → 明文「特殊血样」+ ✓✓ 双通过 + PAYLOAD_OK + 上链留痕。
- 篡改后 valid=false 且 code=0（API 铁律现场教学）。

## 第 8 章 · 收尾（管理当局端 → 运营商端 → 监管当局端）

**台词要点**
- 运输任务完成：降落报备闭环飞行、吊销许可闭环授权、航空器 ACTIVATE 闭环状态机。
- 红灯不是界面出错——吊销后复验 valid=false 而 code 仍为 0（铁律：verify 对存在的许可永远 code=0，有效性看 valid/reasons）。

**操作**
1. **运营商端 #/ops**：「降落报备」（红色确认框：关闭后自动驾驶停止生成遥测，向已关闭会话再发消息 → 4002 设计内）→ 「确认降落」：会话 **CLOSED** + 回执（会话号/状态/降落报备方 Operator Portal）+ 地图无人机停驻。
2. **管理当局端 #/passes**：许可台账点 `PASS-2026-001` 行 → 抽屉先「验证」（最后一次绿灯 valid=true）→ 「吊销」：吊销理由 `运输完成，许可回收`、操作方 `FISCO-ADMIN` → 「确认吊销」→ 状态 **REVOKED** + 跨链 PASS_REVOKE 存证（本地先行立即生效）。
3. **运营商端 #/license**：再点「飞行前验证」→ **红灯**：valid=false、reasons 含 REVOKED、**code 仍为 0**。**台词**：许可生命周期走完了闭环——红灯不是故障，是系统在诚实说话。
4. **运营商端 #/aircraft「航空器台账」**：点 `UAV-MED-01` 行 → 状态动作选 `ACTIVATE` → 「执行状态动作」：**VERIFIED → ACTIVE**。**台词**：状态机收尾展示——第 1 章「注册即核验」自动完成了 REGISTERED→VERIFIED，今天人工 ACTIVATE 完成激活：任务收官，航空器转入运行态。可选加演：对 ACTIVE 机重复 `ACTIVATE` → **1004** 非法迁移；选 `VERIFY` → 同样 **1004**（VERIFY 仅允许 REGISTERED 起点——「注册即核验」已替你走完那一步）。**台词**：每一条非法路径都被显式拒绝并给出理由——状态机从不静默吞掉操作。
5. **监管当局端 #/audit「监管审计」**：导出双 CSV——「监管审计流水 regulatory-audit.csv」+「全量审计日志 audit-all.csv」。**#/cockpit「监管驾驶舱」**：汇总卡核对——告警统计含 ALERT-2026-001（RESOLVED）、追踪结论、授权 AUTH-2026-001、任务/许可计数与本剧情一致。
6. **管理当局端 #/records「审核留痕」**：跨链流水盘点——按医疗任务号查 MISSION_REVIEW_RESULT 裁决回传流水；再抽查**五类报文**四段 TxID 存证齐全：queue 工作台「存证」按钮（MISSION_APPLICATION）、运营商端航空器抽屉（UAV_REGISTER_PROOF）、passes 抽屉（FLIGHT_PASS / PASS_REVOKE）、records 流水（MISSION_REVIEW_RESULT）。

**预期证据**
- 会话六态收官（INIT→AUTHENTICATED→ACTIVE→DEGRADED→RECOVERED→…→CLOSED 全程都出现过）；许可 VALID→REVOKED + 复验红灯 code=0；UAV-MED-01 终态 ACTIVE（对 ACTIVE 机重复 ACTIVATE 或 VERIFY 均 1004，守卫可复现）。
- 双 CSV 下载成功、行数非零；驾驶舱数字与本剧情逐项对得上；五类报文四段 TxID 全 SUCCESS。

## 结束语

一次紧急医疗运输，三个浏览器标签页：运营商端得到**便利**（即申即发、一键报备、飞行可见），管理端得到**裁决权**（脱敏审核、许可签发、链网安全运营），监管端得到**证据链**（告警、追踪、授权开箱、审计）。三端共享同一份数据、三种视角——**便利从不绕过监管，监管从不阻碍合规**。而故事里的每一次「拒绝」（附录 B），恰恰都是系统在保护你的时刻。

## 附录 A · 验收前检查清单

- [ ] 三链 ONLINE：部署机 `./scripts/start-chains.sh` 幂等启动 + 双层探活；`index.html` SPA 平台总览三链状态条全绿。
- [ ] 后端 :8080 与前端代理 :8090 运行中（`./scripts/serve-frontend.sh`）。**生产进程红线**：正式验收在 :8080/:8090 部署实例上由人手动进行；一切自动化排练只走隔离环境（`scripts/verify-three-portals-story.sh`，:18080/:18090 + /tmp 数据目录），两者绝不混用。
- [ ] 第 0 章已执行：demo/reset + demo/init，种子计数核对（厂商 3 / 运营商 3 / 航空器 7 / 航段 5 / 节点 8）。
- [ ] 天地图 key 已配置（或确认走退化模式）：localStorage `skytrust-tianditu-key`，三端同源配一次全生效；key 绝不入 git。
- [ ] 三端标签页就绪：operator.html / authority.html / regulator.html，各端主题与侧边栏正常，顶栏三链心跳正常。
- [ ] **时间窗守则**：本脚本所有时间输入均为相对指令——任务窗 = 表单默认（当前 +1h ～ +4h）；许可窗 = 当前 −1h ～ +4h（第 3 章手动改）；授权窗 = 表单默认（当前 −1h ～ +4h）。全脚本零固定钟点，无论几点演示都不需要改脚本。
- [ ] **轨迹守则**：第 7 章「申报轨迹」参数全程留空——填 NORMAL 会撞硬编码基线必报偏航、污染驾驶舱统计（红线）。
- [ ] 排练中断复位：从第 0 章重跑（demo/reset 清空全部业务状态，含虫洞隔离残留；真实链上数据不受影响——P6-R6）。

## 附录 B · 设计内拒绝汇总表

| 章 | 触发操作 | 预期拒绝 | 一句话台词（为什么拒绝恰恰证明系统在保护你） |
|---|---|---|---|
| 2 | 对已消解冲突再次提交消解 | **3004** 冲突已消解 | 协调有账本——同一冲突只能消解一次，重复「消解」被拦截，这是对操作重放的防护 |
| 5 | 隔离后重开虫洞攻击 | **4001** 隔离残留（只能 demo/reset 复位） | 隔离残留不可由开关洗白——攻击者不能自我平反，处置记录不可抹除 |
| 6 | 追踪未登记伪名 PSEUDO-UNKNOWN-999 | **5001** 断链（L1 BROKEN + L2–7 skipped） | 宁可展示断链也不拼造身份——断点本身就是最诚实的监管结论 |
| 7 | 无授权号执行密文核验 | **5002** 封缄（明文绝不进错误信封） | 未授权不开箱——数据最小化，误操作也只看到「已封缄」这个事实 |
| 7 | 篡改后复验 | **valid=false**（code 仍 0） | 改一个字符签名立刻失效——code=0 是核验动作成功，结论在 valid；篡改只能藏，不能过验证 |
| 8 | 吊销许可后飞行前验证 | **valid=false + reasons 含 REVOKED**（code 仍 0——铁律） | 红灯不是界面出错——许可生命周期走完闭环，verify 铁律保证「查询永远成功，有效性说真话」 |
| 8 | 对 ACTIVE 机重复 ACTIVATE，或选 VERIFY | **1004** 非法迁移（VERIFY 仅允许 REGISTERED 起点） | 状态机守卫——每条非法路径都被显式拒绝并给出理由，从不静默吞掉 |

## 附录 C · 预计时长

| 章 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 合计 |
|---|---|---|---|---|---|---|---|---|---|---|
| 分钟 | 2 | 5 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | **31** |

约 30 分钟（含讲解与切端）；纯操作不讲解约 15 分钟。排练用 `scripts/verify-three-portals-story.sh` 一键实跑 API 层（隔离仿真环境 :18080/:18090，绝不触碰生产实例）；浏览器层行为按各章「预期证据」人工核对。
````

- [ ] **Step 2: 一致性断言（剧情常量/纪律/结构；全部对 docs/demo-script.md）**

```bash
cd /root/codes/skytrust-uav-supervision
f=docs/demo-script.md
grep -c '^## 第' $f                          # 预期 9（第 0–8 章）
grep -c 'UAV-MED-01' $f                      # 预期 ≥8
grep -c 'PASS-2026-001' $f                   # 预期 ≥6
grep -c 'PSEUDO-UAV-83921' $f                # 预期 ≥2
grep -c 'PSEUDO-UNKNOWN-999' $f              # 预期 ≥3
grep -c 'ALERT-2026-001' $f                  # 预期 ≥3
grep -c 'AUTH-2026-001' $f                   # 预期 ≥3
grep -c 'R-MED-01' $f                        # 预期 ≥3
grep -c 'UAV-MED-01-NODE' $f                 # 预期 ≥3
grep -c '91420100MED0001X' $f                # 预期 ≥2
grep -c '420100199203054321' $f              # 预期 ≥2
grep -c 'SN-MED-001' $f                      # 预期 ≥2
grep -c 'DJI-M350-RTK' $f                    # 预期 ≥2
grep -c 'Operator-MED' $f                    # 预期 ≥2
grep -c 'Manufacturer-MED' $f                # 预期 ≥2
grep -c 'Manager-A' $f; grep -c 'FISCO-ADMIN' $f; grep -c 'SecOps' $f   # 各预期 ≥2 / ≥3 / ≥2
grep -c 'REG-01' $f; grep -c 'REG-ADMIN' $f  # 各预期 ≥4 / ≥2
grep -c 'Operator Portal' $f                 # 预期 ≥2
grep -c 'operator\.html' $f; grep -c 'authority\.html' $f; grep -c 'regulator\.html' $f  # 各预期 ≥3
grep -c '特殊血样' $f                        # 预期 ≥4（描述/脱敏台词/开箱/结束语）
grep -c '申报轨迹' $f                        # 预期 ≥3，且每处都是「留空」语义：
grep '申报轨迹' $f | grep -vc '留空'         # 预期 0
grep -c '3004' $f; grep -c '4001' $f; grep -c '5001' $f; grep -c '5002' $f  # 各预期 ≥2
grep -c 'valid=false' $f                     # 预期 ≥3
grep -c '当前时间\|当前 +1\|当前 −1\|当前−1\|当前 +4\|当前+1' $f   # 预期 ≥6（相对时间窗）
grep -cE '(0[0-9]|1[0-9]|2[0-3]):00' $f      # 预期 0（固定钟点清零——相对时间窗守则）
grep -c '附录 A\|附录 B\|附录 C' $f          # 预期 ≥6（标题+正文引用）
wc -l $f                                     # 预期 280–480 行
```

预期：各计数达标、`grep '申报轨迹' | grep -vc '留空'` 为 0、固定钟点为 0。任何一项不达标 = 剧本被改漏，回 Step 1 修正后重跑。

- [ ] **Step 3: DEFERRED-HUMAN 清单（浏览器/人工，Task 15 汇总）**

- 全程约 30 分钟三标签页手动排练一遍（第 0–8 章逐章「操作」+「预期证据」核对）；
- 地图目检：R-MED-01 走廊点选两击成形、第 4 章无人机沿走廊平滑移动、第 5 章停摆→恢复肉眼可见、隧道红色虚线边、拓扑 SVG 与真地图双视图；
- 跨端 chip 预填链路目检（身份→任务→许可→会话→告警→授权 六类 chip 在三端间自动预填）；
- 台词顺口度与「指/台词」标注点位走查（讲解人视角）；
- 排练替代：`scripts/verify-three-portals-story.sh`（Task 15 产出）一键实跑 API 层。

- [ ] **Step 4: 提交（只含 demo-script.md 一个文件）**

```bash
cd /root/codes/skytrust-uav-supervision
git add docs/demo-script.md
git diff --cached --stat          # 预期恰 1 个文件
git commit -m "$(cat <<'MSG'
docs(demo): 验收故事脚本三端版全量重写——紧急医疗运输全程可信监管九章三附录（计划 B Task 14）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---

### Task 15: scripts/verify-three-portals-story.sh —— 隔离 sim 一键实跑 + 逐章 curl 断言 + 全量语法门 + 验证报告

**Files:**
- Create: `scripts/verify-three-portals-story.sh`（可执行；隔离仿真环境 :18080/:18090，DB/SM9 密钥全在 /tmp，绝不触碰生产 :8080/:8090）
- Create: `docs/three-portals-verify-report.md`（Step 4 由首跑输出生成的运行报告——先例：docs/demo-api-report.md）

**Interfaces:**
- Consumes:
  - **Task 14「剧情固定值速查表」= 本脚本输入值权威**（UAV-MED-01 / DJI-M350-RTK / SN-MED-001 / R-MED-01 / Zone-M / Operator-MED / Manufacturer-MED / UAV-MED-01-NODE(X=0,Y=0,邻居 N1,30.510/114.310) / PASS-2026-001 / ALERT-2026-001 / AUTH-2026-001 / PSEUDO-UAV-83921 / PSEUDO-UNKNOWN-999 / 企业与操控员与任务描述与 B 任务全部固定值）——两处若有分歧，以 demo-script.md 为准并同步修改本脚本；
  - Tasks 1–13 全部产物文件（存在性门清单见脚本「产物存在性门」段）；端点请求/响应形状以 `frontend/js/data/endpoints.js` + 契约档案为准（本任务写脚本前已逐一核源码：node/register 的 lat/lon 为 float64 数字、position 键为大写 X/Y（`offchain/topology.go:22` 无 json tag 导出名原样）、route/create 四坐标 float64（`api/masterdata_handler.go:135`）、inspect 裁定枚举 PAYLOAD_OK/NOT_CHECKED（`regulatory/inspection.go:50-51`）、VERIFY 仅 REGISTERED 起点重复即 1004（`uavbusiness/uav.go:276-291`）、csvExport 响应 {content,rows}（pui.js:370）、chain/status 响应 data.chains 为链键→状态映射（home.js）、telemetry 记录 {seq,source,lat,lon,heading,session_id}（offchain/telemetry.go））；
  - 后端隔离启动 env（`internal/config/config.go`）：`SERVER_ADDR` / `DB_PATH` / `CHAIN_MODE=sim` / `SM9_KEY_DIR` / `OFFCHAIN_AUTOPILOT_MS` / `TELEMETRY_AUTOPILOT_MS`；前端代理 env（`scripts/serve-frontend.py`）：`PORT` / `BACKEND`；
  - Global Constraints #11（生产进程红线——脚本硬编码拒绝 :8080/:8090）、#14（Go env：PATH=/usr/local/go/bin + GOPROXY）、#12（node --check 语法门 + DEFERRED-HUMAN 诚实验证）、#16（提交纪律）。
- Produces:
  - **ALL_GREEN 门**：本脚本 0 FAIL 是计划 B 完成与 spec §7.5 收尾（旧 SDD 核销 + finishing）的前置条件；
  - `docs/three-portals-verify-report.md`：首跑运行报告（PASS/FAIL 计数 + 全量输出）；
  - 脚本末尾打印的 **DEFERRED-HUMAN 汇总清单**（Tasks 5–14 浏览器目检项 + demo-script.md 附录 A 全流程排练）——收尾阶段人工核对的唯一清单。

- [ ] **Step 1: 写脚本（完整全文如下）**

```bash
#!/usr/bin/env bash
# verify-three-portals-story.sh —— 三端验收故事 API 层一键实跑（计划 B Task 15）
#
# 干什么：在**隔离仿真环境**里起一个专属后端（:18080，DB/SM9 密钥全在 /tmp）+ 前端代理
# （:18090），按 docs/demo-script.md 第 0-8 章的 API 等价操作逐章 curl 断言（含全部
# 设计内拒绝回归：3004/4001/5001/5002/4002/1004），附带前端产物存在性门 + 全量
# node --check 语法门 + 三端 HTML 经代理可达性检查，最后打印 DEFERRED-HUMAN 人工清单。
#
# 生产红线（Global Constraints #11）：本脚本硬编码拒绝 :8080/:8090；绝不读写
# services/skytrust-backend/data/ 生产 DB 与密钥；绝不向生产实例发任何请求。
#
# 用法：./scripts/verify-three-portals-story.sh            # 跑完自动清理 /tmp 现场
#       KEEP_SIM=1 ./scripts/verify-three-portals-story.sh # 保留现场（含 backend.log）
#       BACK_PORT=18180 FRONT_PORT=18190 ./scripts/...     # 端口冲突时换口
# 依赖：go(/usr/local/go/bin) curl jq node python3；首跑含 go build 约 3-6 分钟。
# 退出码：0 = ALL_GREEN；1 = 存在 FAIL（明细见 ✗ 行）。
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACK_PORT="${BACK_PORT:-18080}"
FRONT_PORT="${FRONT_PORT:-18090}"
SIM_DIR="${SIM_DIR:-/tmp/skytrust-verify-$$}"
BACKEND="http://127.0.0.1:${BACK_PORT}"
FRONTEND="http://127.0.0.1:${FRONT_PORT}"
export PATH="/usr/local/go/bin:$PATH"
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"

# ---------- 生产红线自检 ----------
if [ "$BACK_PORT" = "8080" ] || [ "$FRONT_PORT" = "8090" ]; then
  echo "FAIL: 生产进程红线——禁止把本脚本指向 :8080/:8090"; exit 1
fi
for dep in curl jq node python3 go; do
  command -v "$dep" >/dev/null 2>&1 || { echo "FAIL: 缺依赖 $dep"; exit 1; }
done
for p in "$BACK_PORT" "$FRONT_PORT"; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then
    echo "FAIL: 端口 $p 已被占用（换口：BACK_PORT=/FRONT_PORT=）"; exit 1
  fi
done

# ---------- 断言原语 ----------
PASS_N=0; FAIL_N=0; LAST_RESP=''; LAST_CODE='ERR'
ok(){ PASS_N=$((PASS_N+1)); printf '  ✓ %s\n' "$1"; }
bad(){ FAIL_N=$((FAIL_N+1)); printf '  ✗ FAIL: %s\n' "$1"; }
chapter(){ printf '\n══ %s ══\n' "$1"; }
assert_eq(){ if [ "$1" = "$2" ]; then ok "$3（= $2）"; else bad "$3：期望 [$2] 实际 [$1]"; fi; }
assert_ne(){ if [ "$1" != "$2" ]; then ok "$3"; else bad "$3：不应为 [$2]"; fi; }
assert_ge(){ if awk -v a="$1" -v b="$2" 'BEGIN{exit !(a+0>=b+0)}'; then ok "$3（$1 ≥ $2）"; else bad "$3：$1 < $2"; fi; }
assert_lt(){ if awk -v a="$1" -v b="$2" 'BEGIN{exit !(a+0<b+0)}'; then ok "$3（$1 < $2）"; else bad "$3：$1 ≥ $2"; fi; }
assert_contains(){ case "$1" in *"$2"*) ok "$3（含「$2」）";; *) bad "$3：未找到「$2」";; esac; }
assert_not_contains(){ case "$1" in *"$2"*) bad "$3：不应含「$2」但出现了";; *) ok "$3（不含「$2」）";; esac; }
api(){ # api <子路径> <JSON 体> → LAST_RESP / LAST_CODE
  LAST_RESP=$(curl -sS -m 30 -X POST "$BACKEND/api/$1" -H 'Content-Type: application/json' -d "$2" 2>/dev/null)
  LAST_CODE=$(printf '%s' "$LAST_RESP" | jq -r '.code // "ERR"' 2>/dev/null); [ -n "$LAST_CODE" ] || LAST_CODE=ERR
}
jqr(){ printf '%s' "$LAST_RESP" | jq -r "$1" 2>/dev/null; }
expect_code(){ assert_eq "$LAST_CODE" "$1" "$2 → code"; }
stime(){ TZ=Asia/Shanghai date -d "$1" '+%Y-%m-%d %H:%M:%S'; }   # 相对时间窗（demo-script 附录 A 守则）

# ---------- 剧情固定值（= docs/demo-script.md 速查表，改动须两处同步） ----------
UAV_MED=UAV-MED-01; PASS_MED=PASS-2026-001; ALERT=ALERT-2026-001; AUTHZ=AUTH-2026-001
PSEUDO_KNOWN=PSEUDO-UAV-83921; PSEUDO_UNKNOWN=PSEUDO-UNKNOWN-999
DESC='特殊血样（RH 阴性）紧急运输，全程冷链箱专用，市一医院直达血液中心'

# ---------- 隔离环境起停 ----------
mkdir -p "$SIM_DIR"
cleanup(){
  [ -n "${BACK_PID:-}" ] && kill "$BACK_PID" 2>/dev/null
  [ -n "${FRONT_PID:-}" ] && kill "$FRONT_PID" 2>/dev/null
  if [ "${KEEP_SIM:-0}" = "1" ] || [ "$FAIL_N" -gt 0 ]; then
    echo "现场保留：$SIM_DIR（backend.log / frontend.log）"
  else
    rm -rf "$SIM_DIR"
  fi
}
trap cleanup EXIT

chapter "环境准备：隔离 sim 后端 :$BACK_PORT（DB/密钥 → $SIM_DIR）"
(cd "$ROOT/services/skytrust-backend" && go build -o "$SIM_DIR/skytrust-sim" ./cmd/server) \
  || { echo "FAIL: go build 失败"; exit 1; }
ok "go build ./cmd/server（hermetic sim 构建）"
SERVER_ADDR=":$BACK_PORT" DB_PATH="$SIM_DIR/sim.db" SM9_KEY_DIR="$SIM_DIR/sm9" CHAIN_MODE=sim \
  OFFCHAIN_AUTOPILOT_MS=2000 TELEMETRY_AUTOPILOT_MS=2000 \
  "$SIM_DIR/skytrust-sim" >"$SIM_DIR/backend.log" 2>&1 &
BACK_PID=$!
UP=0
for _ in $(seq 1 60); do
  r=$(curl -sS -m 2 -X POST "$BACKEND/api/health/ping" -H 'Content-Type: application/json' -d '{}' 2>/dev/null)
  [ "$(printf '%s' "$r" | jq -r '.code // empty' 2>/dev/null)" = "0" ] && { UP=1; break; }
  sleep 1
done
assert_eq "$UP" "1" "隔离后端 60s 内就绪（health/ping）"
PORT="$FRONT_PORT" BACKEND="$BACKEND" python3 "$ROOT/scripts/serve-frontend.py" >"$SIM_DIR/frontend.log" 2>&1 &
FRONT_PID=$!
sleep 2

chapter "前端产物门：文件存在性 + node --check + 三端 HTML 经代理可达"
MISS=0
for f in \
  frontend/operator.html frontend/authority.html frontend/regulator.html frontend/index.html \
  frontend/css/drone.css frontend/css/theme-op.css frontend/css/theme-au.css frontend/css/theme-rg.css \
  frontend/js/api.js frontend/js/store.js frontend/js/portal.js frontend/js/map.js \
  frontend/js/shell-op.js frontend/js/shell-au.js frontend/js/shell-rg.js \
  frontend/js/data/geo.js frontend/js/data/explain.js frontend/js/data/endpoints.js \
  frontend/vendor/leaflet/leaflet.js frontend/vendor/leaflet/leaflet.css frontend/vendor/qrcode/qrcode.js \
  frontend/js/pages/op/home.js frontend/js/pages/op/realname.js frontend/js/pages/op/aircraft.js \
  frontend/js/pages/op/flight.js frontend/js/pages/op/license.js frontend/js/pages/op/ops.js \
  frontend/js/pages/op/airspace.js \
  frontend/js/pages/au/queue.js frontend/js/pages/au/passes.js frontend/js/pages/au/records.js \
  frontend/js/pages/au/registry.js frontend/js/pages/au/masterdata.js frontend/js/pages/au/netsec.js \
  frontend/js/pages/rg/cockpit.js frontend/js/pages/rg/alerts.js frontend/js/pages/rg/trace.js \
  frontend/js/pages/rg/authz.js frontend/js/pages/rg/inspect.js frontend/js/pages/rg/audit.js \
  frontend/js/pages/rg/crypto.js \
  docs/demo-script.md ; do
  [ -f "$ROOT/$f" ] || { bad "缺文件 $f"; MISS=1; }
done
[ "$MISS" = "0" ] && ok "三端全部产物文件存在（4 HTML + 4 CSS + 共享底座 + vendor + 20 页 + demo-script）"
JSFAIL=0
while IFS= read -r f; do
  node --check "$f" >/dev/null 2>&1 || { bad "node --check $f"; JSFAIL=1; }
done < <(find "$ROOT/frontend/js" -name '*.js' -type f | sort)
[ "$JSFAIL" = "0" ] && ok "frontend/js 全部 JS node --check 通过"
for p in operator authority regulator index; do
  hc=$(curl -sS -m 5 -o "$SIM_DIR/$p.html" -w '%{http_code}' "$FRONTEND/$p.html" 2>/dev/null)
  assert_eq "$hc" "200" "GET :$FRONT_PORT/$p.html"
done
grep -q 'shell-op.js' "$SIM_DIR/operator.html" && ok "operator.html 引用 shell-op.js" || bad "operator.html 未引用 shell-op.js"
grep -q 'shell-au.js' "$SIM_DIR/authority.html" && ok "authority.html 引用 shell-au.js" || bad "authority.html 未引用 shell-au.js"
grep -q 'shell-rg.js' "$SIM_DIR/regulator.html" && ok "regulator.html 引用 shell-rg.js" || bad "regulator.html 未引用 shell-rg.js"
api_via_proxy=$(curl -sS -m 5 -X POST "$FRONTEND/api/health/ping" -H 'Content-Type: application/json' -d '{}' 2>/dev/null | jq -r '.code // "ERR"')
assert_eq "$api_via_proxy" "0" "代理链路 :$FRONT_PORT/api/* → :$BACK_PORT"

chapter "第 0 章 · 开场整备（demo/reset + demo/init + 三链 + 种子计数）"
api demo/reset '{}'; expect_code 0 "demo/reset"
api demo/init '{}';  expect_code 0 "demo/init"
api chain/status '{}'; expect_code 0 "chain/status"
for k in chainmaker fabric fisco-bcos; do
  assert_eq "$(jqr ".data.chains[\"$k\"]")" "ONLINE" "链 $k 状态"
done
api manufacturer/list '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "3" "种子厂商数"
api operator/list     '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "3" "种子运营商数"
api uav/list          '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "7" "种子航空器数"
api route/list        '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "5" "种子航段数"
api node/list         '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "8" "种子节点数"

chapter "第 1 章 · 建档（主数据 + 走廊 + 实名 + 执照 + 验签 + 航空器注册即核验）"
api operator/register '{"operator_id":"Operator-MED","name":"紧急医疗运输运营商","contact":"","chain_org_id":""}'
expect_code 0 "operator/register Operator-MED"
api manufacturer/register '{"manufacturer_id":"Manufacturer-MED","name":"医疗航空装备厂商","adapter_type":""}'
expect_code 0 "manufacturer/register Manufacturer-MED"
api route/create '{"route_id":"R-MED-01","zone":"Zone-M","start_point":"S9(30.510,114.310)","end_point":"MED-CENTER(30.590,114.390)","altitude_min":60,"altitude_max":120,"start_lat":30.510,"start_lon":114.310,"end_lat":30.590,"end_lon":114.390}'
expect_code 0 "route/create R-MED-01（显式四坐标）"
assert_eq "$(jqr '.data.route_id')" "R-MED-01" "回执航段号"
api realname/register '{"subject_type":"ENTERPRISE","name":"紧急医疗运输企业","id_number":"91420100MED0001X","contact":"027-88880002"}'
expect_code 0 "realname/register（模拟证件号）"
RNS=$(jqr '.data.subject.subject_id // empty')
case "$RNS" in RNS-*) ok "主体号 RNS- 前缀（$RNS）";; *) bad "主体号前缀异常：$RNS";; esac
api pilot/apply '{"name":"医疗运输操控员","id_number":"420100199203054321","category":"垂直起降"}'
expect_code 0 "pilot/apply 即申即发"
assert_eq "$(jqr '.data.license.status')" "ISSUED" "执照状态"
LIC_ID=$(jqr '.data.license.license_id // empty')
case "$(jqr '.data.license.license_no')" in UAV-PILOT-2026-*) ok "执照编号 UAV-PILOT-2026- 前缀";; *) bad "执照编号异常";; esac
SIGN_PAYLOAD=$(printf '%s' "$LAST_RESP" | jq -c '{sm9_identity:"SM9-ID-FISCO-ADMIN", payload:{license_id:.data.license.license_id, license_no:.data.license.license_no, name:.data.license.name, id_number:.data.license.id_number, category:.data.license.category, issued_at:.data.license.issued_at, expires_at:.data.license.expires_at}, signature:.data.license.signature}')
api crypto/sm9/verify "$SIGN_PAYLOAD"
expect_code 0 "crypto/sm9/verify（pilotCanonical 七键）"
assert_eq "$(jqr '.data.valid')" "true" "局方签名验签 valid"
api uav/register "{\"uav_id\":\"$UAV_MED\",\"manufacturer_id\":\"Manufacturer-MED\",\"operator_id\":\"Operator-MED\",\"model\":\"DJI-M350-RTK\",\"serial_no\":\"SN-MED-001\",\"realname_id\":\"$RNS\"}"
expect_code 0 "uav/register UAV-MED-01（显式 ID）"
assert_eq "$(jqr '.data.uav.status')" "VERIFIED" "注册即核验（无 VERIFY 步）"
case "$(jqr '.data.uav.registration_mark')" in UAS-*) ok "登记标志 UAS- 前缀";; *) bad "登记标志异常";; esac
assert_eq "$(jqr '.data.crosschain.status')" "SUCCESS" "UAV_REGISTER_PROOF 跨链"
for f in source_chain_tx_id reg_receive_tx_id reg_relay_tx_id target_chain_tx_id; do
  assert_ne "$(jqr ".data.crosschain.$f // empty")" "" "四段 TxID $f"
done

chapter "第 2 章 · 任务申请（医疗任务 + B 任务 + 冲突检出/消解 + 3004 防重放）"
T1=$(stime '+1 hour'); T4=$(stime '+4 hours')
api mission/create "{\"operator_id\":\"Operator-MED\",\"uav_id\":\"$UAV_MED\",\"mission_type\":\"MEDICAL\",\"payload_type\":\"MEDICAL_KIT\",\"route_segments\":[\"R-MED-01\"],\"altitude_min\":60,\"altitude_max\":120,\"start_time\":\"$T1\",\"end_time\":\"$T4\",\"pilot_license_id\":\"$LIC_ID\",\"description\":\"$DESC\"}"
expect_code 0 "mission/create 医疗任务（相对时窗 +1h~+4h）"
MED=$(jqr '.data.mission_id // empty')
assert_ne "$MED" "" "医疗任务号生成"
api mission/query "{\"mission_id\":\"$MED\"}"
expect_code 0 "mission/query"
assert_not_contains "$LAST_RESP" "特殊血样" "查询响应无明文（明文永不出域，只见脱敏值）"
api mission/submit "{\"mission_id\":\"$MED\",\"operator\":\"Operator Portal\"}"
expect_code 0 "mission/submit 医疗任务跨域"
assert_eq "$(jqr '.data.crosschain.status')" "SUCCESS" "MISSION_APPLICATION 跨链"
api mission/create "{\"operator_id\":\"Operator-B\",\"uav_id\":\"UAV-B-001\",\"mission_type\":\"CARGO\",\"payload_type\":\"CAMERA\",\"route_segments\":[\"R-MED-01\"],\"altitude_min\":80,\"altitude_max\":120,\"start_time\":\"$T1\",\"end_time\":\"$T4\",\"description\":\"常规走廊物流运输\"}"
expect_code 0 "mission/create B 任务（同走廊/高度交叉/时窗重叠）"
BMIS=$(jqr '.data.mission_id // empty')
assert_ne "$BMIS" "" "B 任务号生成"
api mission/submit "{\"mission_id\":\"$BMIS\",\"operator\":\"Operator-B\"}"
expect_code 0 "mission/submit B 任务跨域"
api conflict/detect "{\"mission_id\":\"$MED\"}"
expect_code 0 "conflict/detect"
assert_ge "$(jqr '.data.count')" "1" "冲突命中数"
CFL=$(jqr '.data.conflicts[0].conflict_id // empty')
assert_ne "$CFL" "" "冲突 ID 生成"
assert_contains "$(jqr '.data.conflicts[0] | tostring')" "$BMIS" "冲突任务对含 B 任务"
api conflict/resolve "{\"conflict_id\":\"$CFL\",\"resolution\":\"时间窗后移 30 分钟\",\"operator\":\"Operator-B\",\"mission_id\":\"$BMIS\"}"
expect_code 0 "conflict/resolve 提交消解"
api conflict/resolve "{\"conflict_id\":\"$CFL\",\"resolution\":\"时间窗后移 30 分钟\",\"operator\":\"Operator-B\",\"mission_id\":\"$BMIS\"}"
expect_code 3004 "重复消解（设计内拒绝·附录 B）"

chapter "第 3 章 · 审核与许可（双 APPROVED + 显式 PASS-2026-001 签发 + 验证绿灯）"
api review/submit "{\"application_id\":\"$MED\",\"result\":\"APPROVED\",\"reviewer\":\"Manager-A\",\"comment\":\"剧情相符，走廊可用，同意跨域执行\",\"rules_hit\":[]}"
expect_code 0 "review/submit 医疗任务裁决"
assert_eq "$(jqr '.data.mission.status')" "APPROVED" "医疗任务状态"
assert_eq "$(jqr '.data.crosschain.status')" "SUCCESS" "MISSION_REVIEW_RESULT 跨链回传"
api review/submit "{\"application_id\":\"$BMIS\",\"result\":\"APPROVED\",\"reviewer\":\"Manager-A\",\"comment\":\"时间窗已后移，同意\",\"rules_hit\":[]}"
expect_code 0 "review/submit B 任务裁决"
assert_eq "$(jqr '.data.mission.status')" "APPROVED" "B 任务状态"
TM1=$(stime '-1 hour')
api pass/issue "{\"mission_id\":\"$MED\",\"issuer\":\"FISCO-ADMIN\",\"pass_id\":\"$PASS_MED\",\"valid_from\":\"$TM1\",\"valid_to\":\"$T4\"}"
expect_code 0 "pass/issue（显式许可号 + 相对窗 −1h~+4h）"
assert_eq "$(jqr '.data.pass.pass_id')" "$PASS_MED" "许可号"
assert_eq "$(jqr '.data.crosschain.status')" "SUCCESS" "FLIGHT_PASS 跨链"
api pass/verify "{\"pass_id\":\"$PASS_MED\"}"
expect_code 0 "pass/verify（铁律：存在的许可恒 code=0）"
assert_eq "$(jqr '.data.valid')" "true" "签发后验证绿灯"

chapter "第 4 章 · 起飞（接入点注册 + 起飞报备 + SIM 遥测自动驾驶）"
api node/register "{\"node_id\":\"$UAV_MED-NODE\",\"node_type\":\"UAV\",\"position\":{\"X\":0,\"Y\":0},\"neighbors\":[\"N1\"],\"lat\":30.510,\"lon\":114.310}"
expect_code 0 "node/register $UAV_MED-NODE（session/open 前置）"
assert_eq "$(jqr '.data.status')" "ONLINE" "节点状态"
api session/open "{\"uav_id\":\"$UAV_MED\",\"mission_id\":\"$MED\",\"pass_id\":\"$PASS_MED\"}"
expect_code 0 "session/open 起飞报备（关联任务+许可）"
SESS=$(jqr '.data.session.session_id // empty')
assert_ne "$SESS" "" "会话号生成"
assert_eq "$(jqr '.data.session.status')" "ACTIVE" "会话状态"
assert_eq "$(jqr '.data.auth.verified')" "true" "SM9 挑战-应答"
assert_eq "$(jqr '.data.path | length')" "6" "初始可信路径节点数"
assert_contains "$(jqr '.data.path | join(",")')" "$UAV_MED-NODE" "路径含接入点"
TL=0
for _ in $(seq 1 12); do
  api telemetry/latest "{\"uav_id\":\"$UAV_MED\"}"
  [ -n "$(jqr '.data.seq // empty')" ] && { TL=1; break; }
  sleep 2
done
assert_eq "$TL" "1" "SIM 遥测 24s 内出现（自动驾驶沿 R-MED-01 走廊）"
assert_eq "$(jqr '.data.source')" "SIM" "遥测来源"
assert_ge "$(jqr '.data.seq')" "1" "遥测 seq"

chapter "第 5 章 · 攻防（开洞诱入 → DETECT/DEGRADED → 遥测停摆 → 恢复 → 4001 残留）"
api topology/get '{}'
assert_eq "$(jqr '.data.edges | length')" "5" "开洞前网络边"
api wormhole/toggle '{"enabled":true,"operator":"SecOps"}'
expect_code 0 "wormhole/toggle 开启"
assert_eq "$(jqr '.data.wormhole_enabled')" "true" "虫洞开启中"
assert_eq "$(jqr '.data.nodes_affected | length')" "4" "受影响节点数"
api topology/get '{}'
assert_eq "$(jqr '.data.edges | length')" "8" "开洞后网络边 5→8"
api message/send "{\"session_id\":\"$SESS\",\"msg_type\":\"POSITION_UPDATE\",\"source_node\":\"$UAV_MED-NODE\",\"target_node\":\"MGR\"}"
expect_code 0 "message/send 诱入消息"
assert_contains "$(jqr '.data.message.path | tostring')" "NODE-X" "消息被诱入隧道（path 含 NODE-X）"
assert_lt "$(jqr '.data.message.latency_ms')" "35" "隧道时延低于地理下限 35.36ms（快得反常）"
api risk/evaluate "{\"session_id\":\"$SESS\"}"
expect_code 0 "risk/evaluate"
assert_eq "$(jqr '.data.verdict')" "DETECT" "裁定 DETECT"
assert_ge "$(jqr '.data.risk_score')" "0.7" "风险分 ≥ 阈值"
assert_eq "$(jqr '.data.session_status')" "DEGRADED" "会话降级"
assert_ge "$(jqr '.data.events | length')" "2" "联动事件（DETECT+ISOLATE）"
api telemetry/latest "{\"uav_id\":\"$UAV_MED\"}"; SEQ1=$(jqr '.data.seq // 0')   # 降级后取样，杜绝 2s tick 竞态
sleep 6
api telemetry/latest "{\"uav_id\":\"$UAV_MED\"}"; SEQ2=$(jqr '.data.seq // 0')
assert_eq "$SEQ2" "$SEQ1" "DEGRADED 期间遥测停摆（seq 冻结——跨端停摆机制）"
api path/switch "{\"session_id\":\"$SESS\",\"operator\":\"SecOps\"}"
expect_code 0 "path/switch 自动重算"
assert_eq "$(jqr '.data.session.status')" "RECOVERED" "会话 RECOVERED"
assert_not_contains "$(jqr '.data.new_path | tostring')" "NODE-X" "新路径排除隔离节点"
api message/send "{\"session_id\":\"$SESS\",\"msg_type\":\"POSITION_UPDATE\",\"source_node\":\"$UAV_MED-NODE\",\"target_node\":\"MGR\"}"
expect_code 0 "message/send 确认消息（干净路径）"
assert_not_contains "$(jqr '.data.message.path | tostring')" "NODE-X" "确认消息不入隧道"
api session/list '{"page":1,"page_size":50}'
assert_eq "$(jqr ".data.records[] | select(.session_id==\"$SESS\") | .status")" "ACTIVE" "消息流通后会话自动回归 ACTIVE"
TL2=0
for _ in $(seq 1 8); do
  api telemetry/latest "{\"uav_id\":\"$UAV_MED\"}"
  awk -v a="$(jqr '.data.seq // 0')" -v b="$SEQ2" 'BEGIN{exit !(a+0>b+0)}' && { TL2=1; break; }
  sleep 2
done
assert_eq "$TL2" "1" "ACTIVE 回归后遥测恢复增长（无人机复飞）"
api wormhole/toggle '{"enabled":true,"operator":"SecOps"}'
expect_code 4001 "隔离后重开虫洞（设计内拒绝·附录 B）"

chapter "第 6 章 · 追踪（告警登记 + 全链可溯 + 5001 断链红线 + 状态机推进）"
api event/list '{"action":"DETECT","page":1,"page_size":10}'
EV=$(jqr '.data.records[0].event_id // empty')
api alert/raise "{\"uav_pseudonym\":\"$PSEUDO_KNOWN\",\"event_type\":\"WORMHOLE_ALERT\",\"risk_level\":\"HIGH\",\"source_system\":\"SYSTEM2\",\"operator\":\"REG-01\",\"alert_id\":\"$ALERT\",\"mission_id\":\"$MED\",\"wormhole_event_id\":\"$EV\"}"
expect_code 0 "alert/raise（显式告警号）"
assert_eq "$(jqr '.data.alert_id')" "$ALERT" "告警号"
assert_eq "$(jqr '.data.status')" "OPEN" "告警初始状态"
api trace/identity "{\"operator\":\"REG-01\",\"alert_id\":\"$ALERT\"}"
expect_code 0 "trace/identity 告警入口"
assert_eq "$(jqr '.data.resolved')" "true" "全链可溯 resolved"
assert_eq "$(jqr '.data.break_level')" "0" "break_level=0"
assert_eq "$(jqr '.data.levels | length')" "7" "七级时间线"
assert_contains "$(jqr '.data.levels | tostring')" "$PASS_MED" "L3 命中第 3 章显式签发的许可"
api trace/identity "{\"operator\":\"REG-01\",\"pseudo\":\"$PSEUDO_UNKNOWN\"}"
expect_code 5001 "追踪未登记伪名（断链红线·附录 B）"
assert_contains "$(jqr '.data.levels | tostring')" "skipped: break at level 1" "L2-7 skipped 不拼造"
for st in IDENTIFIED TRACED REVIEWED RESOLVED; do
  api alert/status "{\"alert_id\":\"$ALERT\",\"to_status\":\"$st\",\"operator\":\"REG-01\",\"reason\":\"验收推进：$st\"}"
  expect_code 0 "alert/status → $st"
  assert_eq "$(jqr '.data.status')" "$st" "推进后状态"
done

chapter "第 7 章 · 授权开箱（AUTH-2026-001 + 5002 封缄 + 开箱明文 + 篡改闭环）"
api authorize/apply "{\"regulator_id\":\"REG-01\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\"target_type\":\"MISSION\",\"target_id\":\"$MED\",\"authorization_id\":\"$AUTHZ\",\"reason\":\"虫洞告警排查：需核对医疗任务申报与载荷一致性\",\"valid_from\":\"$TM1\",\"valid_to\":\"$T4\"}"
expect_code 0 "authorize/apply（显式授权号 + 四项 scope + 相对窗）"
assert_eq "$(jqr '.data.authorization_id')" "$AUTHZ" "授权号"
api authorize/review "{\"authorization_id\":\"$AUTHZ\",\"decision\":\"APPROVE\",\"reviewer_id\":\"REG-ADMIN\",\"comment\":\"情况属实，同意开箱核验\"}"
expect_code 0 "authorize/review APPROVE"
assert_contains "$LAST_RESP" "AUTHORIZED" "裁决后 AUTHORIZED（已上链）"
api inspect/ciphertext "{\"mission_id\":\"$MED\",\"regulator_id\":\"REG-01\"}"
expect_code 5002 "无授权核验（封缄·附录 B）"
assert_eq "$(jqr '.data.authorized')" "false" "authorized=false"
assert_eq "$(jqr '.data.sealed.has_ciphertext')" "true" "封缄元数据可见"
assert_not_contains "$LAST_RESP" "特殊血样" "明文绝不进错误信封"
api inspect/ciphertext "{\"mission_id\":\"$MED\",\"authorization_id\":\"$AUTHZ\",\"regulator_id\":\"REG-01\",\"payload_type\":\"MEDICAL_KIT\"}"
expect_code 0 "inspect/ciphertext 带授权开箱（申报轨迹留空）"
assert_eq "$(jqr '.data.authorized')" "true" "authorized=true"
assert_contains "$(jqr '.data.decrypted_view')" "特殊血样" "明文重现（仅此角色仅此授权）"
assert_eq "$(jqr '.data.verification.digest_match')" "true" "完整性·摘要匹配"
assert_eq "$(jqr '.data.verification.signature_valid')" "true" "完整性·签名有效"
assert_eq "$(jqr '.data.conclusion.payload_verdict')" "PAYLOAD_OK" "载荷一致裁定"
assert_eq "$(jqr '.data.conclusion.route_verdict')" "NOT_CHECKED" "轨迹留空 → 航线不裁定（纪律成文）"
assert_ne "$(jqr '.data.chain_tx_id // empty')" "" "核验结论上链"
api crypto/sm3 "{\"payload\":{\"mission_id\":\"$MED\",\"altitude_max\":120}}"
expect_code 0 "crypto/sm3"
assert_eq "$(jqr '.data.sm3_hash | length')" "64" "SM3 摘要 64hex"
api crypto/sm9/keygen '{"entity_id":"VERIFY-TAMPER-DEMO"}'
expect_code 0 "crypto/sm9/keygen"
EID=$(jqr '.data.sm9_identity // empty')
api crypto/sm9/sign "{\"sm9_identity\":\"$EID\",\"payload\":{\"mission_id\":\"$MED\",\"altitude_max\":120}}"
expect_code 0 "crypto/sm9/sign"
SIG=$(jqr '.data.signature // empty')
api crypto/sm9/verify "{\"sm9_identity\":\"$EID\",\"payload\":{\"mission_id\":\"$MED\",\"altitude_max\":120},\"signature\":\"$SIG\"}"
expect_code 0 "crypto/sm9/verify 原载荷"
assert_eq "$(jqr '.data.valid')" "true" "验签通过"
api crypto/sm9/verify "{\"sm9_identity\":\"$EID\",\"payload\":{\"mission_id\":\"$MED\",\"altitude_max\":999},\"signature\":\"$SIG\"}"
expect_code 0 "篡改后复验（code 仍 0——铁律）"
assert_eq "$(jqr '.data.valid')" "false" "altitude_max→999 验签失败"

chapter "第 8 章 · 收尾（降落 + 4002 + 吊销红灯 + ACTIVATE + 1004 守卫 + 审计/流水盘点）"
api session/close "{\"session_id\":\"$SESS\",\"operator\":\"Operator Portal\",\"reason\":\"降落报备\"}"
expect_code 0 "session/close 降落报备"
assert_eq "$(jqr '.data.status')" "CLOSED" "会话 CLOSED"
api message/send "{\"session_id\":\"$SESS\",\"msg_type\":\"POSITION_UPDATE\",\"source_node\":\"$UAV_MED-NODE\",\"target_node\":\"MGR\"}"
expect_code 4002 "对 CLOSED 会话发消息（设计内拒绝）"
api pass/revoke "{\"pass_id\":\"$PASS_MED\",\"reason\":\"运输完成，许可回收\",\"operator\":\"FISCO-ADMIN\"}"
expect_code 0 "pass/revoke（本地先行）"
assert_contains "$LAST_RESP" "REVOKED" "许可 REVOKED"
api pass/verify "{\"pass_id\":\"$PASS_MED\"}"
expect_code 0 "吊销后 pass/verify（铁律：code 恒 0）"
assert_eq "$(jqr '.data.valid')" "false" "红灯 valid=false"
assert_contains "$(jqr '.data.reasons | tostring')" "吊销" "reasons 说明吊销"
api uav/status "{\"uav_id\":\"$UAV_MED\",\"action\":\"ACTIVATE\"}"
expect_code 0 "uav/status ACTIVATE（VERIFIED→ACTIVE 收尾）"
assert_eq "$(jqr '.data.uav.status')" "ACTIVE" "航空器终态"
api uav/status "{\"uav_id\":\"$UAV_MED\",\"action\":\"ACTIVATE\"}"
expect_code 1004 "重复 ACTIVATE（状态机守卫·附录 B）"
api uav/status "{\"uav_id\":\"$UAV_MED\",\"action\":\"VERIFY\"}"
expect_code 1004 "对 ACTIVE 机 VERIFY（仅 REGISTERED 起点·附录 B）"
api regulatory/audit/export '{}'
expect_code 0 "regulatory/audit/export"
assert_ge "$(jqr '.data.rows')" "1" "监管审计流水行数"
api audit/export '{}'
expect_code 0 "audit/export"
assert_ge "$(jqr '.data.rows')" "1" "全量审计日志行数"
for mt in MISSION_APPLICATION UAV_REGISTER_PROOF MISSION_REVIEW_RESULT FLIGHT_PASS PASS_REVOKE; do
  api crosschain/list "{\"message_type\":\"$mt\",\"page\":1,\"page_size\":200}"
  assert_ge "$(jqr '.data.total')" "1" "跨链流水 $mt 条数"
  assert_eq "$(jqr '[.data.records[] | select(.status!="SUCCESS")] | length')" "0" "$mt 全 SUCCESS"
  assert_eq "$(jqr '[.data.records[] | select((.source_chain_tx_id//"")=="" or (.reg_receive_tx_id//"")=="" or (.reg_relay_tx_id//"")=="" or (.target_chain_tx_id//"")=="")] | length')" "0" "$mt 四段 TxID 齐全"
done
api dashboard/summary '{}'
expect_code 0 "dashboard/summary"
assert_ge "$(jqr '.data.alerts.total')" "1" "驾驶舱·告警总数"
assert_ge "$(jqr '.data.wormhole_events.detect')" "1" "驾驶舱·虫洞检出"
assert_ge "$(jqr '.data.sessions.closed')" "1" "驾驶舱·关闭会话"
assert_ge "$(jqr '.data.authorizations.authorized')" "1" "驾驶舱·已授权"

chapter "DEFERRED-HUMAN 汇总清单（Tasks 5-14 浏览器目检——API 断言不覆盖，人工按项核对）"
cat <<'HUMAN'
【三端通用】
- 各端主题/侧边栏/顶栏 chip：op 政务蓝白 7 页、au 深蓝权威 6 页、rg 深藏青 7 页；六类 chip 跨端预填
- 天地图 key 引导弹窗 + 退化徽章 + 矢量层恒自绘；三链心跳灯；hash 路由兜底「页面未注册」卡（非白屏）
【运营商端 operator.html】
- home：hero 地图、节点层无红色 ATTACKER/无虫洞边（信息边界）、六入口卡、态势条计数（网络节点=过滤后 6）
- realname：回执卡+身份条+「选为当前身份」、执照凭证卡、?subject_id= 深链、缺必填 toast 拦截
- aircraft：QR 可见、四段 TxID 全亮可点开存证抽屉、注销确认弹窗、遗留 NULL 标志回退文案
- flight：走廊三色着色、地图点选⇄勾选框双向同步、回执中文列表、冲突预填、3004 错误卡带解说
- license：电子许可卡 QR+mini-map、绿/红灯证面（绝不错误卡样式）、6002 解说
- ops：✈️ 沿走廊移动+heading 朝向、RID 卡、降落停驻、会话接管 toast、切页 3s 后轮询停止
- airspace：图例三色、节点层开关、zone/走廊过滤、航线详情卡、「坐标未设」文案
【管理当局端 authority.html】
- queue：审核状态列、工作台四段存证+历史+裁决表单、mini-map 高亮任务航段
- passes：许可卡、3002 重复签发解说、抽屉验证/吊销、吊销后 valid=false「许可已吊销」
- records：rules_hit 解析列表、空键 toast、MISSION_REVIEW_RESULT 流水抽屉
- registry：类型/类别过滤、七键验签材料 JSON 块、「模拟证件号」免责声明
- masterdata：两击蓝点+坐标回填（6 位小数）、第三击清空、半套坐标拦截、台账行高亮联动
- netsec：topo 统计卡+NODE-X/Y 红色可见（全量视角）、drill 红虚线隧道边+中点 ⚠、风险 5 维评分条+阈值线、逐跳时延条、experiment 成功率红绿+CSV BOM
【监管当局端 regulator.html】
- cockpit：5 统计卡 tone、地图 C 位全量节点+走廊多边形、✈️ 5s 刷新、告警红色落点、转追踪跳转预填
- alerts：9 字段表单、回执+推进预填、跨级 6002 中性错误卡（无「◈ 预期」徽章）
- trace：七级 chainTag 三色+时延、断点时间线 L1 BROKEN 红✕ + L2-7 skipped
- authz：scope 默认勾 ROUTE+PAYLOAD、相对窗预填、APPROVE 绿卡上链/DENY 红卡不上链、复审 6002
- inspect：5002 封缄卡五键无明文、开箱 3 统计卡+明文卡+12 行 kv、scope 无 MISSION → 明文空文案
- audit：四维/三维过滤、抽屉 JSON 原文、CSV 导出 BOM 头 Excel 可开
- crypto：canonical 键排序串、keygen 确定性同身份、篡改 valid=false 红卡、1002 非法签名解说
【验收故事全流程】
- 按 docs/demo-script.md 第 0-8 章完成约 30 分钟三标签页实演（附录 A 检查清单逐项勾选、
  附录 B 七行设计内拒绝现场复现、附录 C 时长核对）——正式验收以人工实演为准，本脚本仅 API 层
HUMAN

printf '\n════════════════ 验证汇总 ════════════════\n'
printf 'PASS=%d  FAIL=%d\n' "$PASS_N" "$FAIL_N"
if [ "$FAIL_N" -eq 0 ]; then
  echo "ALL_GREEN —— 三端验收故事 API 层断言全部通过（浏览器目检见上方 DEFERRED-HUMAN 清单）"
  exit 0
else
  echo "HAS_FAILURES —— 排查上方 ✗ 项；现场日志已保留：$SIM_DIR/backend.log"
  exit 1
fi
```

- [ ] **Step 2: 静态门 + 执行位**

```bash
cd /root/codes/skytrust-uav-supervision
bash -n scripts/verify-three-portals-story.sh && echo SYNTAX_OK
chmod +x scripts/verify-three-portals-story.sh
```

预期：`SYNTAX_OK`。

- [ ] **Step 3: 实跑（隔离环境，绝不触碰 :8080/:8090）**

```bash
cd /root/codes/skytrust-uav-supervision
./scripts/verify-three-portals-story.sh 2>&1 | tee /tmp/verify-three-portals.out | tail -5
```

预期：末段 `FAIL=0` + `ALL_GREEN`（含 go build 约 3-6 分钟）。若 FAIL：现场自动保留在 `/tmp/skytrust-verify-*`，读 backend.log 排查——**只许改脚本断言与后端事实不符之处或修前端产物缺陷，禁止为凑绿放宽断言语义**（断言值权威 = demo-script.md 速查表）。修复后重跑至 ALL_GREEN。

- [ ] **Step 4: 生成验证报告 docs/three-portals-verify-report.md**

```bash
cd /root/codes/skytrust-uav-supervision
{
  echo '# 三端验收故事 API 层验证报告（计划 B Task 15）'
  echo
  echo "- 运行时间：$(TZ=Asia/Shanghai date '+%Y-%m-%d %H:%M:%S')（Asia/Shanghai）"
  echo '- 运行环境：隔离 sim（后端 :18080 + 前端代理 :18090，DB/SM9 密钥在 /tmp，未触碰生产 :8080/:8090）'
  echo '- 复现方式：`./scripts/verify-three-portals-story.sh`（失败自动保留现场；`KEEP_SIM=1` 强制保留）'
  echo '- 断言输入值权威：`docs/demo-script.md`「剧情固定值速查表」'
  echo
  echo '## 运行输出（全量）'
  echo
  echo '```text'
  cat /tmp/verify-three-portals.out
  echo '```'
} > docs/three-portals-verify-report.md
grep -c 'ALL_GREEN' docs/three-portals-verify-report.md   # 预期 ≥1
grep -c '✗ FAIL' docs/three-portals-verify-report.md      # 预期 0
```

预期：两个 grep 计数达标（报告如实收录 ALL_GREEN 输出，零 FAIL 行）。

- [ ] **Step 5: DEFERRED-HUMAN（收尾核对，记入台账）**

- 脚本已打印汇总清单并收录进验证报告——收尾阶段（spec §7.5）人工按清单逐项核对三端浏览器行为；
- 人工完成一次 demo-script.md 全流程实演（约 30 分钟，附录 A 检查清单勾满）；
- 本任务无法自动化的目检项（地图瓦片/图标移动流畅度/主题观感/CSV Excel 打开）一律如实标注，禁止臆造结果。

- [ ] **Step 6: 提交（恰 2 个新文件）**

```bash
cd /root/codes/skytrust-uav-supervision
git add scripts/verify-three-portals-story.sh docs/three-portals-verify-report.md
git diff --cached --stat          # 预期恰 2 个文件
git commit -m "$(cat <<'MSG'
test(scripts): 三端验收故事 API 层一键实跑脚本（隔离 sim :18080/:18090）+ 首跑验证报告（计划 B Task 15）

Co-Authored-By: Claude Code <noreply@anthropic.com>
MSG
)"
```

---
