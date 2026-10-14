# SkyTrust 第四期设计：第 4 条异构链（证照链 IRITA）× 四端区块链浏览器 × 虫洞拓扑可视化

- 日期：2026-10-13
- 状态：待批准（builder-check 后提交用户审批）
- 前置：`2026-10-12-skytrust-local-fullstack-deployment-design.md`（修订 1-7，三链 4 节点 BFT 已交付）
- 验收锚点（用户提供的三条正式验收要求）：
  1. 研制支持**至少 3 种异构链**的基于**商密算法**的原型跨链系统
  2. 研制基于商密算法的能够**抵抗虫洞攻击**的秒级链下交易网络原型系统
  3. 研制**秒级身份追踪**及**密文内容监管**原型系统

## 1. 意图（Why）

用户的验收解读：跨链系统交互的「3 种异构链」指**业务链**；长安链作为监管链（中继基础设施）不计入。当前业务链只有 Fabric（运营）+ FISCO（管理）两条，缺一条。同时验收演示需要**直观展示**：四端各有一个精简区块链浏览器（节点情况、链上数据追踪），虫洞攻击用拓扑图呈现。

本期完成后：
- 四链拓扑 = 运营链 Fabric + 管理链 FISCO BCOS + **证照链 IRITA（新）** + 监管链 ChainMaker；System 1 主流程一条线贯穿 3 条异构业务链：**申请（Fabric）→ 审批（FISCO）→ 签发（IRITA）→ 跨域验证**，全程监管链非旁路中继。
- IRITA 链本体即 SM2 国密（共识/账户两层实证），叠加后端 SM3/SM9 跨链层——「基于商密算法」的证据链更硬。
- 第 4 门户「证照中心端」是有真实业务操作的角色端（独立签发/吊销/验证），不是展示壳。

## 2. 已锁定的用户决策

| # | 决策点 | 结论 |
|---|---|---|
| 1 | 新链角色 | **拆分管理链 → 证照链**：pass 签发/验证/吊销迁入新链；审批留 FISCO |
| 2 | 签发主体 | **证照中心独立签发**（四方故事：运营商→当局→证照中心→验证方） |
| 3 | 业务接入范围 | **仅 System 1 pass**（System 2/3 不动） |
| 4 | 界面范围 | **三端门户 + 新增第 4 门户**（证照中心端），四端各嵌浏览器 |
| 5 | 链平台 | 用户授权「我调研后定」→ **IRITA v4.0.0**（Gate-1 实测 GO，见 §3） |
| 6 | 验收⑤性能口径 | **COUNT=10 轻实测如实登记**；正式性能证据仍引用老机 §6.2（p95=527ms） |

## 3. 平台选型：IRITA v4.0.0（bianjieai，Apache-2.0）

### 3.1 选型矩阵（调研代理四路对比摘要）

| 维度 | **IRITA v4.0.0 ⭐** | xuperchain v5.4.0 | PlatON v1.5.1 | Ontology v3.1.5 |
|---|---|---|---|---|
| 共识/终局性 | Tendermint BFT，4 验证人 f=1，**提交即终局** | Chained-BFT「3 块后」终局 | CBFT（优秀） | VBFT |
| 构建 | **本机实测通过**（go1.25/go1.20 双工具链，纯 Go 无 CGO） | 带 C++ xvm 风险未验证 | 有预编译二进制 | 有预编译二进制 |
| 国密 | **SM2 两层原生**（Gate-1 密钥文件/证书实证） | SM2/SM3/SM4 全套 | 零 | 零 |
| 内存 | **实测 ~126MB/节点** | 推断 150-300MB | 官方门槛 8GB，判超 | 推断 500MB+ |
| 维护 | 停滞 2024-06（锁 tag 自持，同三链先例） | 停滞 2024-05 | 活跃 | 活跃 |

落选原因如实登记：xuperchain（构建风险+终局性弱于提交即终局）→ 备选 1；PlatON（内存超标+零国密）→ 末位；Ontology（无国密+内存未证）→ 备选 2。

### 3.2 Gate-1 PoC 实测证据（/tmp 隔离 4 节点，2026-10-13，已拆除）

- **SM2**：node_key/priv_validator_key type=`tendermint/PrivKeySm2`；验证人 X.509 证书曲线 OID 1.2.156.10197.1.301 + 签名 OID SM2withSM3；keyring 公钥 `/cosmos.crypto.sm2.PubKey`。二进制 sha256 `c93be88c…e3e0aa`（v4.0.0 commit 4c8c4c9，`make build` ldflags 注入 algo.Algo=sm2）
- **内存**：GOMEMLIMIT=280MiB 下均值 ~126MB/节点、峰值 132MB（门槛 300MB，余量 56%）；机器 available 最低 1686MB
- **f=1**：TERM node3 → **+7s 出块零中断**（3/4=75% 投票权）→ 重启 **+9s 追平**；四节点终态高度一致 h=335
- **RPC 四方法**：/status ✓、/block+/blockchain ✓、tx bank send→/tx?hash code=0 ✓、/abci_query **带 ics23 Merkle 证明** ✓（三链都没有的加分项）
- **延迟**：CLI 提交全程中位 122ms；广播→上链可查中位 5.4s（=出块间隔，timeout_commit=5s 主导）；裸 HTTP 读 1-2ms
- **踩坑清单**（正式部署必须映射，9 条）：`[json-rpc]` 默认绑 0.0.0.0:8545 必关；testnet 子命令端口/peers 写死需逐节点重写（`rewrite_configs.py` 可复用）；清 data/ 后须手工补 priv_validator_state.json；keys/tx 无视 --home → **HOME 环境变量覆盖隔离 keyring（已实证）**；单机多节点需 addr_book_strict=false + allow_duplicate_ip=true；denom uirita、零 fee 可用；setsid 后真实 PID 用 pgrep -f 重抓；grpc-web 禁用；构建瞬时 load 5.57 → 低峰预构建

### 3.3 止损路径

Gate-2（正式部署）若 timeout_commit=1s 复测内存/负载超线 → 阶梯回退 2s/5s 并如实登记签发延迟；若 IRITA 生产化失败 → 切 xuperchain（先实测再定，不盲切）；双双失败 → 如实报告「2GB 硬天花板，建议硬件扩容」，本期其余部分（浏览器/拓扑图）不依赖新链仍可交付。

## 4. 目标 / 非目标 / 反目标

**目标**
1. IRITA 4 验证人生产部署（f=1 实证、SM2、timeout_commit 调优复测），登记 version-matrix §12
2. 后端第 4 链接入：链注册（sim+real）+ pass 签发/吊销路由迁移 + 证照中心签发身份 + 浏览器端点组
3. 前端：第 4 门户「证照中心端」（真实业务操作）+ 四端精简浏览器 + 虫洞攻击 SVG 拓扑图
4. 验收脚本/文档/生成物四链化，验收复跑 ①-④ PASS、⑤ 轻实测如实登记

**非目标**
- System 2/3 的业务逻辑变更（L7 溯源标签保持 FISCO_BCOS_DETAIL 不动）
- CROSSCHAIN_LOOP 压测路由变更（仍 fabric→fisco，⑤ 基线不被新链拖垮）
- 通用区块链浏览器（只做本项目聚焦的精简版）；IRITA EVM/智能合约（用内置 record 模块）
- 老机证据回填（§1-§11 一字不动）

**反目标（做成即失败）**
- 为「好看」给攻击节点编造经纬度（坐标红线）；浏览器展示无来源的假块/假节点数据
- 触碰 frozen 资产 / frozen 四依赖 / :8080 生产红线（除 C-4 受控切换窗口）
- 新链 real 传输实现 Resettable（P6-R6）；`network.sh down` 类不可逆操作（本期无豁免需求）

## 5. 继承约束（全部沿用，不重述细节）

生产红线（:8080/:15001 不杀不重启不 POST，除 C-4 受控切换）；隔离验证 :18080-:18190 + /tmp 数据目录；frozen 前端资产清单 + `js/pui.js` additive-only + `d-`/`--d-*` 命名空间；frozen Go 依赖（gin/gorm/sqlite/gmsm/go1.25.0）；新 SDK 只能在 `//go:build realchains` 文件内 import（hermetic 零 SDK）；域隔离（offchain 不 import crosschain/uavbusiness）；全 POST + 恒 200 + envelope；生成物（docs/apifox、endpoints.js）只经命令再生成；中文 conventional commits + Co-Authored-By trailer；CLAUDE.md 不入库；秘密只走 .env。

**新增资源红线**：16 个共识进程后，任何压测/构建前查 `free -m` 与 load；available <300MB 或 load>4 即止损。IRITA 4 节点预算 ≤600MB（GOMEMLIMIT=280MiB/节点）。

## 6. 架构设计

### 6.1 四链角色与迁移后业务流

```
运营域(Fabric 运营链#2563eb)      管理域(FISCO 管理链#0891b2)     证照域(IRITA 证照链#15803d·新)
  UAV注册/任务申请 ──────────────► 审批(通过/驳回) ──────────────► 通行证签发/吊销/验证台账
        ▲  MISSION_APPLICATION         ▲  MISSION_REVIEW_RESULT        ▲  FLIGHT_PASS / PASS_REVOKE
        │  (fabric→fisco-bcos 不变)     │  (fisco-bcos→fabric 不变)     │  (源链改: irita→fabric)
        └────────────── 监管链 ChainMaker 非旁路中继（13 步协议不变） ──┘
```

- 路由表仅改 2 行：`FLIGHT_PASS`、`PASS_REVOKE` 的 Source 由 `fisco-bcos` → 新链键
- 13 步协议、监管链 4 次写、幂等/重试/SM3/SM9 校验逻辑**零改动**（与源/目标链无关）
- 签发操作主体 = 证照中心（第 4 门户），审批通过的任务出现在其「待签发队列」

### 6.2 链键与命名（builder 裁定）

- **链键 `"irita"`**（与平台名一致的既有惯例；sim TxID 前缀 `IRITA-`；≤32 字符合规）
- 显示名 `IRITA 证照链`；链色 **绿 `#15803d`**（色相 145°，与紫 262°/蓝 221°/青 192° 及状态绿 #22c55e 拉开明度差；铁律「图标+文字」兜底色觉混淆）
- 逻辑合约名 **`license_registry`**（IRITA 内置 record 模块承载，见 6.4）

### 6.3 IRITA 生产部署（C-1）

- 路径：源码 `/opt/irita-src`（v4.0.0，`make build` SM2 二进制 → `/opt/irita/bin/irita`，sha256 登记）；节点 `/opt/irita/net/node{0..3}`
- 端口（PoC 预检全空闲）：node i → p2p 26656+10i / rpc 127.0.0.1:26657+10i / proxy_app 26658+10i / gRPC 9090+10i；**全关**：json-rpc(8545/8546)、api(1317)、rosetta、grpc-web、pprof、prometheus
- 配置：persistent_peers 互指、addr_book_strict=false、allow_duplicate_ip=true、iavl-cache-size=65536、GOMEMLIMIT=280MiB、**timeout_commit 目标 1s**（阶梯 2s/5s 回退）
- chain-id：`skytrust-license`；denom uirita、零 fee；业务账户 `skytrust-biz`（SM2，keyring test backend，HOME 覆盖目录 `/opt/irita/cli-home`）
- 进程管理：setsid nohup + pgrep -f 抓真实 PID（沿用 FISCO 手工滚动模式）；`scripts/start-irita.sh` 新建；start-chains.sh 挂第 4 序、stop-chains.sh 补 irita 段
- **源码入库方式（用户已裁定）**：不加第 4 个 git submodule；`/opt/irita/src` 源码自持（2026-10-13 已从易失 /tmp 抢救落位，SM2 二进制 sha256 复核吻合 `c93be88c…e3e0aa`；`/opt/irita/poc-artifacts` 含 rewrite_configs.py 与 PoC 证据）；version-matrix §12 登记 github URL / tag v4.0.0 / commit 4c8c4c9 / sha256——新机重建配方完整
- **Gate-2 验收**（登记前完成）：4 节点高度同步、/net_info peers=3、f=1 杀节点复测（timeout_commit=1s 下）、RSS 复测、RPC 四方法 + record 模块写读冒烟、业务账户首笔上链 TxID 留存
- 初始化业务数据：record 模块写入首条「证照链启用登记」记录（作为 §12 部署 TxID 锚点）

### 6.4 后端集成（C-2）

**契约等价物**：IRITA 无「合约部署」概念，用内置 **record 模块**作 license_registry 的承载——
- `SubmitTx("license_registry", method, params)` → `irita tx record create-record --record-id <确定性键> --contents <JSON> --digest <SM3>`（CLI shell-out，HOME 覆盖）；record-id 规则 = `<METHOD>/<business_key>` 消毒（沿用 stateKey 语义）
- `QueryState("license_registry", key)` → 裸 HTTP `/abci_query path="/store/record/key" prove=true`（**Merkle 证明随收据返回，Ret 附 proof 摘要**）
- `QueryTx(txID)` → `/tx?hash=0x…`；`Health()` → `/status` catching_up=false + 高度递增
- real 传输 `internal/chainadapter/real/irita/transport.go`（realchains tag）：读=net/http（1-2ms），写=exec.CommandContext CLI（~120ms+出块等待）；env `IRITA_RPC/IRITA_CHAIN_ID/IRITA_CLI_BIN/IRITA_CLI_HOME/IRITA_KEY_NAME`，缺失 fail-fast；**不实现 Resettable**；实施首日先冒烟验证 record 模块 CLI 形态（若 v4.0.0 record 命令签名有出入，以实测为准调整并在本节登记偏差）
- sim 传输复用 `chainadapter/sim`（参数化，零新代码）+ 新适配器包装 `internal/chainadapter/irita/adapter.go`（白名单 `{license_registry}`）

**装配点**（阶段 A 清单，防两处 default 地雷）：
- `chains.go`：simLatencies + 迭代表 + **wrapAdapter 显式 case（并把 default 改为报错）**
- `policy.go`：sourceContract 加 irita case（**default 改报错**）；路由表 2 行
- `config.go`：IritaMode 字段 + `IRITA_MODE` env + ChainModeFor case；`.env.example`
- `transports_real.go` 注册一行

**pass 迁移**：
- `pass.go:181,326` 源链字面量 `"fisco-bcos"`→`"irita"`
- **签名身份**：`passSignerUID` 由 `SM9IdentityOf("FISCO-ADMIN")` → `SM9IdentityOf("REGISTRY-ADMIN")`（证照中心管理员）；**verify 做双身份兼容**：验签先试 REGISTRY-ADMIN、失败回退 FISCO-ADMIN（存量 VALID pass 不失效，过渡语义如实登记 version-matrix §12 偏差）
- C16 断代：路由切换后旧 FAILED FLIGHT_PASS/PASS_REVOKE 行重试必 6002 → 登记「迁移即断代」偏差；生产库存量行盘点后如实处置（不伪造重试成功）
- issuer 入参：第 4 门户签发时传 `issuer=REGISTRY-ADMIN`；既有端点契约不变（无新必填字段）

**浏览器端点组（阶段 C，新增 5 个 → 73+5=78）**：
- 新可选接口 `chainadapter.BlockQuerier`：`GetBlockHeight/GetBlockByHeight/ListRecentBlocks/ListNodes`；sim 实现（由 blockNum 计数构造块结构，mode=sim 如实标注）；四 real 传输各自实现：CM SDK GetBlockByHeight、fabric qscc GetBlockByNumber/GetChainInfo、fisco GetBlockByNumber（**受 v3.16 RPC 怪癖限制的能力如实降级标注「该链 RPC 不支持」**）、irita /block+/blockchain+/net_info
- `internal/api/explorer_handler.go` 新文件 + router 5 行：
  | 端点 | 入参 | 出参要点 |
  |---|---|---|
  | /api/explorer/overview | {} | 每链 {chain,name,mode,status,consensus,node_count,block_height} |
  | /api/explorer/nodes | {chain} | [{name,role,address,online,source}]（source=rpc 实测/静态配置+探活，如实标注） |
  | /api/explorer/blocks | {chain,page,page_size} | 最近块列表 {height,hash,time,tx_count,proposer} |
  | /api/explorer/block | {chain,height} | 块详情 + tx 列表 |
  | /api/explorer/tx | {chain,tx_id} | QueryTx 收据 +（irita）Merkle 证明摘要 |
- 节点清单数据源优先级：链原生接口（fisco getGroupPeers、irita /net_info 实测可用）> 静态配置+逐节点探活；**绝不虚构节点**
- apidoc：endpoints.go 加 5 行（末行仍 /api/demo/reset）、storylines 酌情、计数断言 73→78/24→N、`APIFOX_GEN=1` 再生成 + `gen-endpoints.sh`、README 端点表

**测试矩阵改动**：9 处三链 boot 加第 4 sim；`tc1_test.go:13` count 3→4；pass 前缀断言批改（FISCO-BCOS-→IRITA-）：pass_test.go:65,268,412、tc1_test.go:195-198、gateway_test.go:88-94,290-305、policy_test.go:39-42；chains_test/demo_handler_test 名单+1；explorer 新端点单测（sim 全链 + BlockQuerier 能力探测降级路径）；hermetic 全绿是 C-2 完成门。

### 6.5 前端（C-3）

**第 4 门户 `license-center.html`（证照中心端）**——克隆 authority 侧栏骨架配方：
- 新文件：`license-center.html`、`css/theme-ct.css`（仅 token 覆盖；深绿暗色主题 `body.d-ct data-theme="dark"`——与 rg 深海军蓝区分）、`js/shell-ct.js`（PORTAL.boot portal:'ct' registry:'CT_PAGES'）、`js/pages/ct/*.js`
- 页面：`home`（概览：待签发数/有效证照数/链状态）、`issue`（待签发队列=mission/list APPROVED ⋈ pass/list 客户端比对 → 签发操作 issuer=REGISTRY-ADMIN + SM9/SM3 摘要展示）、`ledger`(证照台账 pass/list + 状态机徽章 + openCxDetail 四段 TxID)、`verify`（pass/verify 查验 + 双身份过渡说明）、`revoke`（吊销 + 链上 FAILED 如实展示）、`chainview`（浏览器 ct 全量版）；qrcode script 行随 HTML 引入（证照 QR）
- 链色新变量 `--d-chain-irita:#15803d` 定义于 drone.css（additive，product.css frozen 不动）；`d-` 类 `[data-chain="irita"]` 证照链 tag 样式同落 drone.css

**au/passes.js 降级改造（用户已裁定）**：管理当局端「许可管理·签发」页降为**证照台账只读 + 验证入口**（签发/吊销按钮移除，硬编码文案「FLIGHT_PASS 跨链：fisco-bcos → fabric」改「irita → fabric」）；签发/吊销操作**专属 ct 端**——「证照中心独立签发」决策的直接后果。`docs/demo-script.md` 第 3 章签发步骤同步移至第 4 个浏览器标签页；verify 脚本 DEFERRED-HUMAN【authority】分组相应改写、新增【证照中心端】分组。

**四端浏览器（共享模块 `js/chainview.js`，window.CXV）**：
- 两块：①节点情况 = explorer/overview + nodes + health/check（statCards + 图标文字徽章 + 链色）；②链上数据追踪 = crosschain/list（5 类 message_type + status 过滤、服务端分页、行点击 openCxDetail 四段 TxID 时间线）+ explorer/tx 直查（按链选 TxID）
- 每端薄注册页裁剪：op（聚焦 MISSION_APPLICATION/FLIGHT_PASS + 本方证照）、au（全量+签发链路）、rg（暗色大屏风格全量+监管中继段高亮）、ct（证照链深钻：record/Merkle 证明展示）、index（`PAGES.chainview`，script 插 app.js 之前，纯 DOM/SVG 不依赖 MAPX/PORTAL）
- portal.js CHAINS 数组 +irita 条目（四端链灯自动 4 盏；非 frozen，改动 1 行）；pui.js CHAIN_NAME additive +1；ui.js frozen 不动 → index legacy 页面链 tag 不显示新链（接受，登记偏差）
- 数据诚实原则：crosschain/list 无 business_id/chain 服务端过滤 → 客户端过滤处标注「最近 N 条」；fisco 块浏览降级文案直出

**虫洞拓扑图（`js/wormhole-topo.js`，window.WTOPO）**：
- 纯 SVG（createElementNS，零新依赖），坐标源 = topology/get 的抽象 position{x,y}（攻击节点 NODE-X/Y 无经纬度也能画——解决 Leaflet 画不出攻击者的死结；**绝不编造经纬度**）
- 视觉：边三态（正常灰实线/虫洞红虚线 dasharray+⚠图标/当前会话路径高亮）复用 frozen `.p-topo*` 类；节点按类型着色、ISOLATED 红虚线描边、ATTACKER ⚠标签；新动画只加 `@keyframes d-*` 于 drone.css（虫洞边流动虚线动画、检测命中脉冲）
- 联动：wormhole/toggle 开关 → risk/evaluate 结果用现成 `P.scoreBars`（5 维+阈值线）→ path/switch 后路径高亮重绘 → event/list 时间线
- 挂载：`au/netsec tabTopo` 在 Leaflet 地理图下方追加「抽象拓扑（含攻击节点）」SVG 块（主验收展示位）；act2/wb-* frozen 不动

**index.html（约束 #4：仅导航结构与文案 + 内联样式先例）**：pc-strip +1 张证照中心入口卡（内联 `pc-` 样式）、侧栏 +1 nav-item（**置于 nav-fold 之外**）、script 区（app.js 前）+chainview 行

**verify 脚本四端化**：`verify-three-portals-story.sh` 原名保留（文档引用连续性），内容扩四端：产物清单 +license-center 组、GET 200 +1、shell-ct grep、故事值 +REGISTRY-ADMIN 签发线（PASS 签发经证照链断言 IRITA- 前缀）、DEFERRED-HUMAN +【证照中心端】分组；`node --check` 自动覆盖新 JS

### 6.6 脚本/部署面（随 C-2/C-4）

`scripts/env.sh` +IRITA 段（路径/端口/CLI HOME）；`start-irita.sh` 新建；`start-chains.sh` 第 4 序；`start-backend-real.sh` 端口预检 +26657、「三链」文案→「四链」；`run-acceptance.sh`：① ONLINE==4、② +IRITA 部署锚点 TxID（record 首笔）+  override 机制沿用、③④ 签发闭环断言 IRITA- 前缀段、⑤ COUNT 默认 10；`probe-latency.sh` +irita 探针；`deploy-contracts.sh` 注明 irita 无合约部署（record 模块内置）+ 业务账户初始化步骤

## 7. 性能与资源预算

- 内存：+4×~130MB(IRITA) ≈ +520MB；当前 available ~2.0GB → 部署后预期 ~1.4GB，红线内
- CPU：16 共识进程；timeout_commit=1s 使 IRITA 提交频率 ×5 → Gate-2 实测 load，超线走阶梯回退
- **签发延迟预算**（FLIGHT_PASS 全链）：irita submit(~1-2s 出块等待) + CM 4 写(~1s) + fabric(~0.15s) + irita ACK(~1-2s) ≈ **3-6s/次签发**——一次性操作可接受，UI 做进行中态提示；revoke 同理（链上失败仍本地优先，语义不变）
- **⑤ 不受影响**：CROSSCHAIN_LOOP 仍走 fabric→fisco；COUNT=10 轻实测预期与 §11.3 同量级（p95 ~1.5s），如实登记
- 构建/压测窗口遵守负载红线（load>4 止损；go build 瞬时 5.57 先例 → 低峰执行）

## 8. 验收复跑口径（四链版）

① 4×ONLINE（chain/status count=4）② 部署 TxID 链上可查：CM 5 笔 + Fabric 4 笔 + FISCO 1 笔 + **IRITA 锚点 record 1 笔**（override 机制两机可复现）③ 13 步闭环三笔 SUCCESS 且 FLIGHT_PASS 四段前缀 = IRITA-/CHAINMAKER-/CHAINMAKER-/FABRIC- ④ 四段 TxID 持久化 ⑤ COUNT=10 轻实测如实登记（成功率必须 1；p95 与老机 §6.2 口径偏差照实写）。前端门：verify 脚本四端产物+故事断言 ALL_GREEN；人工验收单 +【证照中心端】【四端浏览器】【虫洞拓扑】分组。

## 9. 分阶段实施与停下点（沿用「逐阶段停下汇报」协议）

| 阶段 | 内容 | 完成门 | 停下汇报 |
|---|---|---|---|
| **C-1** | IRITA 生产部署：/opt 构建、4 节点组网、timeout_commit=1s 复测、f=1 复测、record 冒烟、锚点 TxID、start-irita.sh | Gate-2 全过 + 三链无恙 + 负载红线内 + **浸泡观察半天**（1s 档 RSS/负载/高度同步无异常，用户已裁定质量优先）方进 C-2 | ✓ |
| **C-2** | 后端：链注册(A)+pass 迁移(B)+explorer 端点(C)+测试全绿+生成物再生成 | hermetic `go test ./... -count=1` 全绿（四链 sim）+ realchains 构建过 | ✓ |
| **C-3** | 前端：第 4 门户+四端浏览器+虫洞拓扑+index 入口+au/passes 降级+verify 四端化 | node --check 全过 + 隔离 :18090 四端故事 ALL_GREEN | ✓ |
| **C-4** | 真链联调（隔离 :18180 real 四链）→ 受控切换 :8080（**执行前单独经用户确认**，停机分钟级，旧二进制保留，失败前滚修复优先）→ 验收复跑 → 文档登记（version-matrix §12、README、demo-script、contracts/README）→ 提交 | ①-④ PASS + ⑤ 如实 + 生产 4×ONLINE + 门户 200 | ✓（终版报告） |

## 10. Builder 裁定清单（my calls，审批时可推翻）

1. 链键 `irita`、显示名 `IRITA 证照链`、链色 `#15803d`、门户深绿暗色主题
2. 门户文件名 `license-center.html`、命名空间 `ct`（d-ct/theme-ct/shell-ct/CT_PAGES）
3. 契约等价物 = record 模块承载 `license_registry`；record-id 规则 `<METHOD>/<key>` 消毒
4. SM9 双身份兼容验签（新 REGISTRY-ADMIN / 旧 FISCO-ADMIN 回退）
5. explorer 5 端点形态与「能力如实降级」原则；节点清单 source 标注
6. verify 脚本保留原名扩四端；L7 溯源标签不动；wrapAdapter/sourceContract default 改报错（顺手拆雷）
7. C16 断代处置 = 登记偏差不做数据迁移；生产库存量行盘点后如实处置
8. timeout_commit 阶梯 1s→2s→5s 回退权

## 11. 风险登记（top）

| 风险 | 缓解 |
|---|---|
| record 模块 CLI 形态与设想有出入 | C-2 首日冒烟实测，偏差登记；极端情况退 bank-tx+memo 锚定（QueryState 语义受损则如实降级并汇报） |
| IRITA 维护停滞（2024-06） | 锁 tag v4.0.0 + sha256 登记 + 源码自持 /opt/irita-src（同三链版本矩阵实践） |
| 16 进程负载推高 ⑤/签发延迟 | Gate-2 复测 + timeout_commit 阶梯 + 负载红线止损；⑤ 口径已获用户确认 |
| CLI shell-out 写路径的进程管理复杂度（HOME 覆盖/pgrep） | PoC 已实证方案；real transport 单测 + 隔离联调先于切换 |
| 前端四端改动回归三端 | portal.js 仅 CHAINS +1 行；pui.js additive；CXV/WTOPO 全新模块；verify 脚本四端全量回归 |
| apidoc 计数网（78/场景数/末行）联动碎 | C-2 内一次性批改 + TestApifoxArtifacts 过门再提交 |

## 12. Builder-check 分诊记录（2026-10-13）

fresh 视角审查代理对 spec 关键声明逐条核到源码（pass.go:181,326 / policy.go 路由表 / 两处 default 地雷 / sim 前缀规则 / SM9IdentityOf 纯字符串派生 / VerifyPass 仅本地校验 / L7 全程本地表 / NODE-X,Y 抽象 Position / crosschain/list 过滤面 / apidoc 计数网 / portal.js 与 app.js 挂载机制），全部吻合；**并当场实证 IRITA v4.0.0 record 模块在 app/app.go 完整 wiring**（StoreKey/ModuleBasics/keeper），最大技术疑虑排除。

**已由对话/既有决策回答**：record 模块存在性（实证）；pilot 执照签名留 FISCO-ADMIN（决策 #3「仅 pass」锁定，pilot.go 注释届时如实改写）；index.html 加 script 行与旧计划 Task 13 冲突（本 spec 明文覆盖，随审批生效）。

**用户拍板（2026-10-13，四项均取推荐项）**：
1. au/passes.js **降级只读+验证**，签发/吊销专属 ct 端（已并入 §6.5）
2. C-4 切换窗口**到时单独确认**，不预授权（已并入 §9）
3. IRITA 源码 **/opt 自持 + version-matrix 登记**，不加 submodule；/tmp 产物已抢救至 /opt/irita（sha256 复核吻合）（已并入 §6.3）
4. **无硬日期，质量优先**：Gate-2 过后浸泡半天再进 C-2（已并入 §9）

**实施细节归 plan**（builder 可自行裁定）：stop-chains.sh 补段、explain.js 路由文案、experiment/apidoc 样例中 FISCO-ADMIN 残留值清理、record CLI flag 形态首日冒烟校准。


## 13. 实施修订（2026-10-14 Task 15 追记）

权威偏差登记 = `docs/version-matrix.md` §12.9（11 条）；本节只摘与 spec 正文相抵的顶层偏差。

1. **record 模块 CLI 形态**（兑现 §4「偏差在本节登记」承诺）：真实命令为 `irita tx record create <digest> SM3 --uri … --meta …`（spec 设想的 `create-record --record-id --contents` 子命令/旗标不存在）；record-id 链上派生、客户端不可指定 → 业务键移由 `Content.URI` 承载（`skytrust://license_registry/<METHOD>/<key>`）、contents JSON 移由 `Content.Meta` 承载；QueryState 按 record-id/txhash 查询，业务键形态显式报错（全代码库零业务调用点，grep 证据，无静默破坏面）。ics23 双段 Merkle 证明经 `abci_query prove=true` 实证可用——spec 承诺的证明 bonus 兑现。校准全文：计划「实施偏差记录」Task 1 节。
2. **验收断言 ③ 校准**（§8 门表「四段前缀 = IRITA-/…」措辞对 real 模式为假）：real 传输返回链原生 TxID，`IRITA-` 前缀是 sim 传输工件（§11.3-④ 同源先例）——real 验收 ③ 改为 SRC3 经 IRITA TM RPC `/tx?hash=0x…` 链上实证 `tx_result.code=0`（Run1 `C1A55DF0…`、Run2 `35356B59…` 均实证）；sim 侧 verify 脚本保留前缀断言（两世界各自正确）。
3. **能力降级错误码 = 2005**（非计划早期钉死的 5003）：5003 已被 `errcode.AuthScope` 占用且在线使用，复用即一码两义（触数据红线）→ 落位 2005（2xxx 跨链段，与 2004 幂等同段）。README 错误码表 / explain.js / 前端降级卡文案全部按 2005。
4. **CPU 硬限整改**（§9 C-1 风险「16 进程负载推高」以事故形式落地）：IRITA 4 节点无限制启动占满 2 核机，生产后端 01:46 静默死亡 → `start-irita.sh` 改 systemd-run 瞬态单元 CPUQuota=30%/节点 + CPUWeight=80 + MemoryHigh=280M（commit 3ba5e6a），**绝不回退无限制启动**；保护效果经正式验收 Run2 实证（负载风暴 ≤8.3 vs 整改前实测 40-93）。version-matrix §12.5。
5. **空块常态**：create_empty_blocks 留默认 true → ~1.47s/块，IRITA 块高比其余三链大一个量级（~40-50k 块/日）——如实登记，四端浏览器块高区同屏注记「空块预期、账本连续」。
6. **验收 ⑤ 如实**（§8「成功率必须 1」未达成，裁定⑥口径）：Run1/Run2 均 9/10，败笔恒为 ChainMaker SDK gRPC stall 受害者（76-95s，与 IRITA 无关，风暴下受害者轮转 fabric↔CM 实证）；跨链性能正式谱系仍以老机 §6.2（527ms@100 连发）为准——§12.6 rate/p95 双记如实登记，绝不放宽协议、绝不调小 COUNT 造好看数字。
