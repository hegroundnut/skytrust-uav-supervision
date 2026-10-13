# 第 4 条异构链（证照链 IRITA）× 四端区块链浏览器 × 虫洞拓扑 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 部署 IRITA v4.0.0 四验证人 SM2 证照链作为第 4 条业务链（pass 签发/吊销迁入），后端四链接入 + 5 个浏览器端点，前端新增证照中心门户 + 四端精简区块链浏览器 + 虫洞攻击 SVG 拓扑，四链验收复跑并登记 version-matrix §12。

**Architecture:** 链平台层复用既有 ChainAdapter/ChainTransport 缝隙（sim 参数化传输零新代码；real 传输 = 裸 TM RPC HTTP 读 + irita CLI shell-out 写，纯 stdlib 零新依赖）；13 步跨链网关只改路由表 2 行（FLIGHT_PASS/PASS_REVOKE 源链 fisco-bcos→irita），监管链非旁路中继逻辑零改动；前端全部走新文件 + 非 frozen 增量（CXV/WTOPO 新模块、license-center.html 新门户、pui.js 仅 additive）。

**Tech Stack:** Go 1.25（hermetic sim + realchains tag）、IRITA v4.0.0（Tendermint BFT、SM2、record 模块）、原生 HTML/CSS/JS 零构建前端（SVG 拓扑）、bash 部署/验收脚本。

**Spec:** `docs/superpowers/specs/2026-10-13-fourth-chain-license-explorer-design.md`（含 §12 builder-check 分诊与用户四项裁定；执行者必读）

## Global Constraints

- **生产红线**：`:8080`（真链后端）与 `:15001`（前端）绝不 kill/restart/POST——唯一例外 = Task 13 受控切换窗口且**执行前单独经用户确认**；一切联调/验收用隔离 `SERVER_ADDR=:18180`、代理 `:18090`、`DB_PATH`/`SM9_KEY_DIR` 指向 /tmp 弃用目录；`demo/reset` 只打隔离 sim
- **负载/内存红线**：任何构建/压测前查 `free -m` + `uptime`；1min load>4 或 available<300MB 立即止损；IRITA 每节点 `GOMEMLIMIT=280MiB`
- **frozen Go 依赖**：gin v1.12.0 / gorm v1.31.2 / glebarez-sqlite v1.11.0 / gmsm v0.44.1 / `go 1.25.0`；**本计划全程禁止改 go.mod/go.sum**（real/irita 传输只用 stdlib：net/http、os/exec、encoding/json）
- **hermetic 硬约束**：链 SDK/外部 import 只允许出现在 `//go:build realchains` 文件内；`cd services/skytrust-backend && go test ./... -count=1` 必须零外部依赖全绿
- **api.Deps 十字段 frozen**（不加不改）；域隔离：offchain 不 import crosschain/uavbusiness；链上新 SDK 传输不实现 `Resettable`（P6-R6）
- **API 铁律**：全 POST+JSON、HTTP 恒 200、envelope `{code,message,data,trace_id,timestamp}`、时间一律 `internal/timex`（Asia/Shanghai `2006-01-02 15:04:05.000`）、列表 `{records,total,page,page_size}`（page≤0→1；page_size≤0→20、>200→200）、错误码单一来源 `internal/errcode`
- **frozen 前端资产零触碰**：`css/app.css`、`css/product.css`、`js/app.js`、`js/api.js`、`js/store.js`、`js/ui.js`、`js/pages/wb-*`、legacy 页面（dashboard/act1/act2/act3/explorer/overview/pui-lab）；`js/pui.js` 仅 additive；新 CSS 一律 `d-` 前缀/`--d-*` token；`:root` legacy token 与 `--p-*` 定义不动（theme-*.css 只覆盖值）；每个新/改 JS 过 `node --check`
- **链色语义（永不互换）**：chainmaker `#7c3aed` / fabric `#2563eb` / fisco-bcos `#0891b2` / **irita `#15803d`（新，暗色主题提亮 `#4ade80`）**；状态永远图标+文字
- **数据/坐标红线**：lat/lon=0 = 未设 → Leaflet 永不落点、绝不编造坐标（虫洞拓扑用抽象 `position{x,y}`）；浏览器节点/块数据必须有真实来源并标注 `source`，链能力缺口如实返回明示错误，绝不造假
- **生成物只经命令再生成**：`APIFOX_GEN=1 go test ./tests/ -run 'TestApifox' -count=1` → `docs/apifox/*.json`；`./scripts/gen-endpoints.sh` → `frontend/js/data/endpoints.js`；产物与代码同 commit
- **version-matrix §1-§11 一字不动**；新证据只进 §12
- **提交**：中文 conventional commits 直提 main，每条以 `Co-Authored-By: Claude Code <noreply@anthropic.com>` 结尾；CLAUDE.md、`contracts/fabric/operator_business_1.0.tar.gz`、platforms 子模块噪声**永不 stage**；sudo 密码只走 stdin 永不落文件
- **每阶段末停下汇报**：Task 1（C-1+浸泡）、Task 5（C-2 门）、Task 11（C-3 门）、Task 13 切换前、Task 15（终版）

## Review Focus

1. **存量 VALID pass（FISCO-ADMIN 签名）迁移后 verify 必须仍通过**（双身份回退），篡改/过期仍拒 → Task 3 `TestPassVerifyLegacySignerCompat`
2. **IRITA CLI 异常（bin 缺失/HOME 错/keyring 坏/超时）→ SubmitTx 必须返回传输级 error（触发 withRetry），绝不静默成功或伪造 TxID** → Task 5 `TestIritaRealTransportFailFast`（realchains tag，env 守卫）
3. **链无块浏览能力（fisco v3.16 RPC 怪癖）→ explorer 返回明示能力错误码，绝不造块** → Task 4 `TestExplorerCapabilityDegradation`
4. **未设坐标节点（NODE-X/Y lat/lon=0）绝不出现在 Leaflet 图层、必须出现在 WTOPO SVG；position 缺失的节点列入「未布点」清单不画** → Task 9 渲染规则 + Task 11 verify 断言（topology/get 含 NODE-X position）
5. **crosschain/list 服务端无 business_id/chain 过滤且 page_size≤200 → 浏览器客户端过滤处必须标注「最近 N 条」** → Task 8 CXV 固定文案 + Task 11 grep 断言

---

### Task 1: IRITA 生产部署（C-1 / Gate-2）+ 脚本面 + 浸泡

**Files:**
- Create: `/opt/irita/bin/irita`（从 `/opt/irita/src/build/irita` 复制，sha256 必须 = `c93be88cbf7f3d19bca33c97ffefe62b481d457d4c6ee2dcdb7915a81ee3e0aa`）
- Create: `/opt/irita/net/node{0..3}/`（testnet 初始化 + 配置重写）、`/opt/irita/cli-home/`（CLI keyring HOME）
- Create: `scripts/start-irita.sh`
- Modify: `scripts/env.sh`（+IRITA 段）、`scripts/start-chains.sh`（第 4 序）、`scripts/stop-chains.sh`（+irita 段，若无此文件则查实际停链脚本名）、`scripts/start-backend-real.sh:21-24`（端口预检 +26657；:39 文案「三链」→「四链」）

**Interfaces:**
- Produces: 链 `skytrust-license` 4 验证人在线（rpc 127.0.0.1:26657/26667/26677/26687）；业务账户 `skytrust-biz`（SM2、keyring test、HOME=`/opt/irita/cli-home`、有余额）；锚点 record TxID（Task 12 ② 与 §12 登记用）；env.sh 变量 `IRITA_BIN/IRITA_NET/IRITA_RPC/IRITA_CHAIN_ID/IRITA_CLI_HOME/IRITA_KEY_NAME`

- [ ] **Step 1: 预检**——`free -m`（available>1GB）、`uptime`（load<2）、`ss -tln` 确认 26656-26696/9090-9120 空闲、`sha256sum /opt/irita/src/build/irita` 比对预期值；不符即停并报告
- [ ] **Step 2: 二进制落位 + testnet 初始化**——`mkdir -p /opt/irita/bin && cp /opt/irita/src/build/irita /opt/irita/bin/ && /opt/irita/bin/irita testnet --v 4 --output-dir /opt/irita/net --chain-id skytrust-license --keyring-backend test`
- [ ] **Step 3: 配置重写**——改编 `/opt/irita/poc-artifacts/rewrite_configs.py` 对 4 节点 config.toml/app.toml：node i → p2p `26656+10i`、rpc `127.0.0.1:26657+10i`、proxy_app `26658+10i`、grpc `9090+10i`；persistent_peers 互指（nodeID 从 node_key.json）；`addr_book_strict=false`、`allow_duplicate_ip=true`、**`timeout_commit="1s"`**、`iavl-cache-size=65536`、prometheus=false、pprof 清空；app.toml：`[api] enable=false`、**`[json-rpc] enable=false`（PoC 最大坑：默认绑 0.0.0.0:8545）**、`[rosetta] enable=false`、grpc-web 关
- [ ] **Step 4: CLI HOME 与业务账户**——`mkdir -p /opt/irita/cli-home/.irita`；拷 node0 keyring-test 目录入内；`HOME=/opt/irita/cli-home /opt/irita/bin/irita keys add skytrust-biz --keyring-backend test`（默认 SM2，验证 `--output json` 里 pubkey `@type=/cosmos.crypto.sm2.PubKey`）；用 node0 创世账户 `tx bank send skytrust-biz 100000000000uirita`；`q bank balances` 确认到账
- [ ] **Step 5: 启动 4 节点**——逐节点 `GOMEMLIMIT=280MiB setsid nohup /opt/irita/bin/irita start --home /opt/irita/net/node$i/irita >> /opt/irita/net/node$i.log 2>&1 </dev/null &`；`pgrep -f` 重抓真实 PID 存 `node$i.pid`（PoC 坑 #7）
- [ ] **Step 6: Gate-2 验证**——4 节点 `/status` 高度同步递增且 `catching_up=false`、`/net_info` n_peers=3、连续 10 块实测间隔 ≈1s（timeout_commit=1s 生效）、`ss -tln` 恰好预期端口全 127.0.0.1、8545/1317/9091/6060 未绑定；任何一项不过 → 排查或按阶梯回退 timeout_commit=2s（登记），仍不过 → 止损报告
- [ ] **Step 7: record 模块冒烟（首日校准）**——`HOME=/opt/irita/cli-home $BIN tx record create-record --record-id "SMOKE/1" --contents '{"k":"v"}' --from skytrust-biz --chain-id skytrust-license --node tcp://127.0.0.1:26657 --keyring-backend test -y --output json`；若 flag 形态与设想不符，以 `tx record --help` 实测为准校准并**把实际命令形态记录进本计划文件末尾「实施偏差」**；`/tx?hash=0x…` code=0；`q record` 与 `/abci_query path="/store/record/key" prove=true` 读回一致（ics23 proofOps 存在）
- [ ] **Step 8: 锚点 record**——create-record `--record-id "LICENSE_CHAIN_ANCHOR/skytrust-license"`、contents = `{"purpose":"证照链启用登记","chain_id":"skytrust-license","consensus":"tendermint-bft-4val","crypto":"SM2","deployed":"<timex 格式当前时间>"}`；**TxID（64hex 大写）+ 块高记入实施记录**（Task 12/§12 引用）
- [ ] **Step 9: f=1 复测（1s 档）**——记 H0 → TERM node3 → 轮询 node0 确认继续出块（记录中断秒数，预期 ≤2s）→ 重启 node3 → 追平时间；时间线全记录
- [ ] **Step 10: RSS/负载复测**——T+5m/T+15m/T+30m `ps -o rss` × 4 节点 + `free -m` + load；门槛：单节点 ≤300MB、available ≥800MB、load ≤3；超线 → timeout_commit 阶梯回退后复测
- [ ] **Step 11: 脚本面**——写 `scripts/start-irita.sh`（start/stop/status 三动作，pgrep -f 管理 PID，GOMEMLIMIT 注入）；env.sh 追加 IRITA 段（6 变量，值=实际路径）；start-chains.sh 尾部 +`bash "$REPO/scripts/start-irita.sh" start`；停链脚本对应补段；start-backend-real.sh 端口预检 +26657、文案四链；`bash -n` 全部通过
- [ ] **Step 12: 三链无恙复核 + 提交**——`:8080 /api/chain/status` 仍 3×ONLINE（GET 语义状态查询属只读自检，允许）、load 正常；`git add scripts/ && git commit -m "feat(scripts): IRITA 证照链生产部署脚本面——start-irita/env/start-chains/stop-chains/start-backend-real 四链化

Co-Authored-By: Claude Code <noreply@anthropic.com>"`
- [ ] **Step 13: 浸泡 + STOP 汇报**——启动 ≥半天浸泡（期间每 1-2h 抽查高度同步/RSS/load 一次并记录）；向用户汇报 Gate-2 全部数字（f=1 时间线、RSS、块间隔、锚点 TxID），**并询问浸泡期间是否允许并行开工 C-2 的 sim 侧任务（Task 2-4，不触链不触生产）**；未获同意则等浸泡结束

### Task 2: 后端链注册（sim 侧，hermetic 全绿）

**Files:**
- Create: `services/skytrust-backend/internal/chainadapter/irita/adapter.go`、`adapter_test.go`
- Modify: `services/skytrust-backend/cmd/server/chains.go:16-20,28-30,51-60`、`cmd/server/chains_test.go:19,31`、`cmd/server/transports_real.go`（本任务只留注释位，注册行在 Task 5）、`internal/config/config.go:16-18,42-44,60-76`、`internal/config/config_test.go:51` 附近
- Modify（9 处三链 boot + 断言）: `internal/api/router_test.go:47-56`、`internal/api/demo_handler_test.go:47-48`、`internal/regulatory/service_test.go:39`、`internal/experiment/service_test.go:38`、`internal/demo/seed_test.go:17`、`internal/uavbusiness/uav_test.go:22-27`、`internal/crosschain/gateway_test.go:49-55`、`tests/acceptance/acceptance_test.go:46-53`、`tests/foundation_e2e_test.go:48-55`、`tests/system1_e2e_test.go:52-59`、`tests/acceptance/tc1_test.go:13,17-21`
- Modify: `internal/apidoc/endpoints.go:40`（chain/status 摘要「三链」→「四链」）

**Interfaces:**
- Produces: `adirita.ChainName == "irita"`；`adirita.RegisteredContracts == map[string]bool{"license_registry":true}`；`adirita.New(transport chainadapter.ChainTransport) chainadapter.ChainAdapter`（签名照抄 `internal/chainadapter/fisco/adapter.go` 的构造形态）；chain/status `count=4`；config `IritaMode`/`IRITA_MODE`/`ChainModeFor("irita")`
- Consumes: `chainadapter/sim`（参数化 New，零新代码，TxID 前缀自动 `IRITA-`）

- [ ] **Step 1: 白名单适配器 + 对表测试**——`adapter.go` 拷 fisco 模板（ChainName/RegisteredContracts/SubmitTx 白名单校验）；`adapter_test.go` 三件套照抄 fisco/adapter_test.go（ChainNameAndDelegation / RejectsUnregisteredContract / RegisteredContractsMatchCodifiedConstants——对表常量指向 Task 3 将加的 `crosschain.ContractLicenseRegistry`，本任务先在测试内以字面量 `"license_registry"` 断言并留 TODO(Task 3) 注释）；跑 `go test ./internal/chainadapter/irita/ -v` 先红后绿
- [ ] **Step 2: 装配三处 + 拆雷**——chains.go：simLatencies +`"irita": 10*time.Millisecond`；迭代表 +`"irita"`；wrapAdapter +`case "irita":` 且 **default 改为 `return nil, fmt.Errorf("unknown chain %q", name)`**（地雷①）；config.go 三处 + config_test；跑 `go test ./cmd/server/ ./internal/config/ -count=1` 绿
- [ ] **Step 3: 测试基座四链化**——9 处 boot 各 +第 4 个 sim（键 `"irita"`）；tc1_test.go:13 `count==3`→`==4`、:17-21 名单 +irita；demo_handler_test 名单 +irita；`go test ./... -count=1` 全绿（此时 pass 路由仍 fisco→fabric，业务断言不破）
- [ ] **Step 4: apidoc 文案 + 产物再生成**——endpoints.go:40 摘要改四链；`APIFOX_GEN=1 go test ./tests/ -run 'TestApifox' -count=1`；`./scripts/gen-endpoints.sh`；`go test ./tests/ -count=1` 绿
- [ ] **Step 5: Commit**——`git commit -m "feat(backend): 第 4 链 irita 链注册（sim 侧）——白名单适配器/装配/配置/9 处测试基座四链化/wrapAdapter default 拆雷

Co-Authored-By: Claude Code <noreply@anthropic.com>"`（add 仅本任务文件 + docs/apifox + frontend/js/data/endpoints.js）

### Task 3: pass 迁移（路由 + 双身份 + 断代登记）

**Files:**
- Modify: `internal/crosschain/policy.go:12-18`（FLIGHT_PASS/PASS_REVOKE Source→`"irita"`）、`:68-75`（+`ContractLicenseRegistry = "license_registry"`）、`:95-104`（sourceContract +`case "irita"`，**default 改报错**，地雷②）
- Modify: `internal/uavbusiness/pass.go:21`（passSignerUID→`crypto.SM9IdentityOf("REGISTRY-ADMIN")`；+`legacyPassSignerUID = crypto.SM9IdentityOf("FISCO-ADMIN")`）、`:181,326`（源链字面量→`"irita"`）、`:244-287` VerifyPass 双身份回退
- Modify: `internal/uavbusiness/pilot.go`（「与 passSignerUID 对齐」注释如实改写：pilot 仍 FISCO-ADMIN）
- Modify（断言批改）: `internal/uavbusiness/pass_test.go:65,268,412`（前缀 `IRITA-`、`sims["irita"]`）、`tests/acceptance/tc1_test.go:195-198`（TC1-07 四段前缀 = `IRITA-`/`CHAINMAKER-`/`CHAINMAKER-`/`FABRIC-`）、`internal/crosschain/gateway_test.go:88-94`（路由表副本 2 行）+`:290-305`（FLIGHT_PASS 用例源链）、`internal/crosschain/policy_test.go:39-42`
- Modify: `internal/apidoc/storylines.go`（pass 相关样例 `issuer`/`FISCO-ADMIN` 残留值 → `REGISTRY-ADMIN`；TC1-07 描述）、`internal/apidoc/endpoints.go:71-75`（pass 行摘要 fisco-bcos→irita）、`services/skytrust-backend/README.md:110-114`
- Test（新增）: `internal/uavbusiness/pass_test.go` 追加 `TestPassVerifyLegacySignerCompat`

**Interfaces:**
- Produces: FLIGHT_PASS/PASS_REVOKE 路由 `("irita","fabric")`；新签发 pass 由 `SM9-ID-REGISTRY-ADMIN` 签；VerifyPass 兼容两代签名；`crosschain.ContractLicenseRegistry`
- Consumes: Task 2 的 `"irita"` sim 装配

- [ ] **Step 1: 写失败测试**——`TestPassVerifyLegacySignerCompat`：构造 pass 用 `legacyPassSignerUID` 签名入库（模拟存量）→ `VerifyPass` 通过；再用 `passSignerUID` 签 → 通过；篡改字段 → 3002。同时改 TC1-07/pass_test 前缀断言为 `IRITA-`。跑测试确认红（路由/身份未改）
- [ ] **Step 2: 实施迁移**——policy.go 2 行 + 常量 + sourceContract case/default 报错；pass.go 身份/字面量/双身份回退（回退逻辑：先 `passSignerUID` 验，失败再 `legacyPassSignerUID`，双败→3002；注释注明过渡语义与 §12 登记义务）
- [ ] **Step 3: 全量断言批改 + apidoc**——上列测试文件逐一改；storylines/endpoints 样例值与摘要；`go test ./... -count=1` 全绿
- [ ] **Step 4: 产物再生成 + Commit**——`APIFOX_GEN=1 go test ./tests/ -run 'TestApifox' -count=1` + `./scripts/gen-endpoints.sh` + `go test ./tests/ -count=1` 绿；`git commit -m "feat(backend): 通行证签发/吊销迁移证照链——路由 fisco-bcos→irita、签发身份 REGISTRY-ADMIN、双身份兼容验签（存量证照不失效）

Co-Authored-By: Claude Code <noreply@anthropic.com>"`

### Task 4: explorer 端点组（BlockQuerier + 5 端点 + apidoc 78）

**Files:**
- Create: `internal/chainadapter/blockquery.go`（类型 + 接口）、`internal/chainadapter/sim/blockquery.go`（sim 实现）、`internal/api/explorer_handler.go`、`internal/api/explorer_handler_test.go`
- Modify: `internal/chainadapter/sim/sim.go`（SubmitTx 时追加块记录，供 sim BlockQuerier）、`internal/api/router.go`（crosschain 组后 +5 行）、`internal/errcode`（+`ErrChainUnsupportedFeature = 5003`，先核对 5003 未占用，README 错误码表同步）、`internal/apidoc/endpoints.go`（+5 行，**末行仍 /api/demo/reset**）、`internal/apidoc/table_test.go:29,81-83`（73→78；probe0 7→8：overview 空 body）、`tests/apifox_replay_test.go:133,146,191,204` 计数、`services/skytrust-backend/README.md:67` 端点计数与分组表

**Interfaces:**
- Produces（后续任务/前端依赖的精确形状）:
```go
// internal/chainadapter/blockquery.go
type BlockInfo struct {
    Height uint64 `json:"height"`; Hash string `json:"hash"`; Time string `json:"time"` // timex 格式
    TxCount int `json:"tx_count"`; Proposer string `json:"proposer"`; TxIDs []string `json:"tx_ids"`
}
type NodeInfo struct {
    Name string `json:"name"`; Role string `json:"role"`; Address string `json:"address"`
    Online bool `json:"online"`; Source string `json:"source"` // rpc | static+probe | sim
}
type BlockQuerier interface {
    GetBlockHeight(ctx context.Context) (uint64, error)
    GetBlockByHeight(ctx context.Context, height uint64) (*BlockInfo, error)
    ListRecentBlocks(ctx context.Context, limit int) ([]BlockInfo, error) // 新→旧
    ListNodes(ctx context.Context) ([]NodeInfo, error)
}
```
- 端点契约（全 POST，envelope 内 data）：`/api/explorer/overview {}` → `{chains:[{chain,name,mode,status,consensus,node_count,block_height}],count}`；`/api/explorer/nodes {chain}` → `{chain,nodes:[NodeInfo]}`；`/api/explorer/blocks {chain,limit}` → `{chain,height,blocks:[BlockInfo]}`（limit≤0→20，>200→200）；`/api/explorer/block {chain,height}` → `{chain,block}`；`/api/explorer/tx {chain,tx_id}` → `{chain,tx:{tx_id,block_num,status,timestamp}}`。未知链/缺参→6002；能力缺失→5003 带 message「该链 RPC 不支持…」
- 固定显示值：`name/consensus` map = chainmaker→`ChainMaker 监管链`/`TBFT（4 节点）`、fabric→`Fabric 运营链`/`SMARTBFT（4 orderer）`、fisco-bcos→`FISCO BCOS 管理链`/`PBFT（4 sealer）`、irita→`IRITA 证照链`/`Tendermint BFT（4 验证人）`；`mode` 判定 = 适配器实现 `Resettable` → `sim`，否则 `real`
- Consumes: `deps.Gateway.Chain(name)`（先例 regulatory/authorization.go:177-181）、`deps.Chains`（键集合）

- [ ] **Step 1: 写失败测试**——explorer_handler_test.go：sim 四链 overview（count=4、height>0、mode=sim、consensus 字符串精确匹配）；blocks/block/tx round-trip（sim 提交一笔后按 TxID/高度可查，Hash 非空）；nodes source=sim；**TestExplorerCapabilityDegradation**：fake adapter 不实现 BlockQuerier → block 端点 code=5003 且 message 含「不支持」；未知链 → 6002。跑 → 红
- [ ] **Step 2: 实现**——blockquery.go 类型/接口；sim.go 块记录（`blocks []BlockInfo` 追加：height=blockNum、hash=`SM3hex("SIM-BLOCK-"+chain+"-"+height)` 前 64 位、time=timex.NowT 格式化、tx 追加进对应块）+ sim/blockquery.go 四方法 + ListNodes 返回单节点 `{chain+"-sim-node0", "sim", "in-process", true, "sim"}`；explorer_handler.go（能力探测 `if bq, ok := adt.(chainadapter.BlockQuerier)`；tx 端点走既有 QueryTx）；router.go +5；errcode +5003；跑 → 绿
- [ ] **Step 3: apidoc + 计数网 + 再生成**——endpoints.go +5 行（tag 统一 `explorer`，TAG_ORDER 相应 +1）、table_test/apifox_replay 计数批改、README:67 计数与分组表、errcode README 表 +5003；`APIFOX_GEN=1 go test ./tests/ -run 'TestApifox' -count=1`；`./scripts/gen-endpoints.sh`；`go test ./... -count=1` 全绿
- [ ] **Step 4: Commit**——`git commit -m "feat(backend): 区块链浏览器端点组 /api/explorer/*（overview/nodes/blocks/block/tx，73→78）——BlockQuerier 可选接口 + sim 实现 + 能力如实降级 5003

Co-Authored-By: Claude Code <noreply@anthropic.com>"`

### Task 5: real/irita 传输 + 四 real 传输 BlockQuerier（C-2 门）

**Files:**
- Create: `internal/chainadapter/real/irita/transport.go`（`//go:build realchains`，**仅 stdlib**）、`internal/chainadapter/real/irita/failfast_test.go`（同 tag）
- Modify: `cmd/server/transports_real.go:14-18`（+`chainadapter.RegisterRealTransport("irita", realirita.NewFactory)`）、`internal/chainadapter/real/{chainmaker,fabric,fisco}/transport.go`（各 +BlockQuerier 四方法）、`internal/chainadapter/real/latency_probe_test.go`（+irita 跳）、`services/skytrust-backend/.env.example`（+IRITA 块）、`contracts/README.md`（+irita 条目：无合约工件，record 模块承载 license_registry 映射说明）、Create: `contracts/irita/README.md`（映射说明 + record-id 规则）
- Modify: `internal/chainadapter/irita/adapter_test.go`（TODO(Task 3) 处改引 `crosschain.ContractLicenseRegistry`——注意域导入方向合规）

**Interfaces:**
- Produces: `realirita.NewFactory() (chainadapter.ChainTransport, error)`；env（缺失即 fail-fast）：`IRITA_RPC`（http://127.0.0.1:26657）、`IRITA_CHAIN_ID`、`IRITA_CLI_BIN`、`IRITA_CLI_HOME`、`IRITA_KEY_NAME`；写路径 = `exec.CommandContext(bin, "tx","record","create-record", …)` 注入 `env HOME=<IRITA_CLI_HOME>`（PoC 实证方案）；record-id = `<METHOD>/<cross_tx_id 或 business 键>` 按 stateKey 规则消毒；contents = params JSON；读路径全部裸 HTTP（QueryTx `/tx?hash=0x<upper>`、QueryState `/abci_query path="/store/record/key" prove=true`（若 Task 1 Step 7 校准发现 store key 不可构造 → 退 CLI `q record` 并登记偏差）、Health `/status` catching_up=false）；SubmitTx 成功判据 = CLI exit 0 且输出 JSON `code==0`，取 `txhash` 大写为 TxID，随后轮询 `/tx?hash` 至 inclusion（超时 30s → 传输级 error）
- 四 real 传输 BlockQuerier：chainmaker=SDK GetCurrentBlockHeight/GetBlockByHeight；fabric=qscc GetChainInfo/GetBlockByNumber；fisco=GetBlockNumber + getBlockByNumber（**受 v3.16 怪癖限制：块详情不可靠时 GetBlockByHeight 返回 5003 语义错误，绝不拼凑**）；irita=`/status`、`/block?height=`、`/blockchain`、`/net_info`+validators。ListNodes：irita/fisco 走链原生 RPC（source=rpc）；chainmaker/fabric 读可选 env `CHAINMAKER_NODE_LIST`/`FABRIC_NODE_LIST`（`name=addr` 逗号分隔）+ 逐地址 TCP 探活（source=static+probe），未配置则只返回当前已知节点

- [ ] **Step 1: fail-fast 测试先行**——`TestIritaRealTransportFailFast`（tag realchains，`testing.Short()` 跳过网络部分）：缺任一 env → NewFactory error；`IRITA_CLI_BIN=/nonexistent` → SubmitTx 返回 error（非 nil error、零伪造 TxID）；`go test -tags realchains ./internal/chainadapter/real/irita/ -run FailFast -v` 红→实现→绿
- [ ] **Step 2: 实现 transport.go**——按上接口；**go.mod/go.sum 零改动核验**：`git diff --exit-code go.mod go.sum`
- [ ] **Step 3: 三既有 real 传输 +BlockQuerier**——按上数据源；fisco 降级路径注释引 version-matrix §11 RPC 怪癖；`./scripts/build-backend-real.sh` 通过（frozen 依赖断言 + go vet）
- [ ] **Step 4: 真链冒烟（隔离，不触生产）**——`set -a; source .env; source ../../scripts/env.sh; set +a` 后 `go test -tags realchains ./internal/chainadapter/real/ -run TestIrita -v`：对 :26657 实链跑 Health/QueryTx(锚点 TxID)/QueryState(锚点 record)/SubmitTx(冒烟 record，record-id `SMOKE/task5-<ts>`)；latency_probe +irita 跳实测记录
- [ ] **Step 5: .env.example/contracts/README + Commit + C-2 STOP 汇报**——`git commit -m "feat(backend): IRITA 证照链 real 传输（CLI shell-out 写 + 裸 TM RPC 读，SM2）+ 四 real 传输 BlockQuerier——零新依赖，hermetic 不破

Co-Authored-By: Claude Code <noreply@anthropic.com>"`；汇报：hermetic 全绿证据、realchains 构建证据、真链冒烟四方法结果与延迟数字、浸泡期链健康曲线

### Task 6: 第 4 门户骨架（license-center.html）

**Files:**
- Create: `frontend/license-center.html`、`frontend/css/theme-ct.css`、`frontend/js/shell-ct.js`、`frontend/js/pages/ct/home.js`
- Modify: `frontend/js/portal.js:12-16`（CHAINS 末尾 +`{key:'irita', label:'IRITA 证照链'}`）、`frontend/js/pui.js:33`（CHAIN_NAME +`irita:'IRITA 证照链'`，仅 additive）、`frontend/css/drone.css`（文件尾追加：`:root{--d-chain-irita:#15803d}`、`body[data-theme="dark"]{--d-chain-irita:#4ade80}`、`[data-chain="irita"]` 链 tag 规则仿 product.css `.p-chain-tag` 形态但用 `d-` 类名）、`frontend/index.html:45-61`（pc-strip +1 张证照中心入口卡，内联 `pc-` 样式先例，accent=绿）
- Test: `node --check` 全部新/改 JS；隔离伺服 GET 200

**Interfaces:**
- Produces: `window.CT_PAGES`（home 已注册）；`PORTAL.boot({portal:'ct', registry:'CT_PAGES', defaultPage:'home', mapPages:[], nav:[…]})` 约定；四端链灯 4 盏（backend chain/status count=4 驱动）
- Consumes: portal.js 既有 boot/heartbeat（心跳逐链建灯，CHAINS +1 即自动 4 盏）

- [ ] **Step 1: HTML 壳**——克隆 authority.html 侧栏骨架：head CSS 序 `vendor/leaflet/leaflet.css → css/product.css → css/drone.css → css/theme-ct.css`；sprite 16 symbol 整段复制；`body class="d-portal d-ct" data-theme="dark"`；挂载点 id 全齐（#d-nav/#d-lamps/#d-backend/#d-chips/#d-page/#toast-box）；script 链 = authority.html 同序 + `vendor/qrcode/qrcode.js`（仿 operator.html:58）+ 页面脚本插入锚点注释 + `js/pages/ct/home.js` + `js/shell-ct.js`（最后）
- [ ] **Step 2: theme-ct.css**——结构 1:1 仿 theme-rg.css（暗色特例）：深绿黑底色板（bg ≈ `#08120e`、panel ≈ `#0f1f18`、brand ≈ `#34d399`），`body[data-theme="dark"]` 段覆盖 `--p-*` 暗色值 + 三链色提亮（照抄 theme-rg.css:48-50 值）+ `--d-chain-irita:#4ade80`；不新增类
- [ ] **Step 3: shell-ct.js + home.js**——boot nav：`home(证照总览)/issue(通行证签发)/ledger(证照台账)/verify(证照查验)/revoke(证照吊销)/chainview(链上浏览器)`（icon 用既有 sprite：home/cert/db/search/lock/db）；home.js 首版 = chain/status 四链卡（`P.statCards`）+ pass/list 计数（有效/已吊销）+ 待签发数（mission/list APPROVED ⋈ pass/list 客户端比对，标注「最近 200 条内」）；issue/ledger/verify/revoke/chainview 未注册前由 portal.js 兜底「页面未注册」卡（Task 7/8 补齐）
- [ ] **Step 4: 公共件增量**——portal.js CHAINS +1 行；pui.js CHAIN_NAME +1 属性；drone.css 尾部追加块；index.html pc-card +1
- [ ] **Step 5: 验证**——`node --check` ×（shell-ct/home/portal/pui）；隔离环境（/tmp sim 后端 :18080 + 代理 :18090，仿 verify 脚本模式）`curl -s http://127.0.0.1:18090/license-center.html | head -1` 200、`curl -s -X POST http://127.0.0.1:18090/api/chain/status -d '{}'` count=4；DEFERRED-HUMAN：暗绿主题视觉核对
- [ ] **Step 6: Commit**——`git commit -m "feat(frontend): 第 4 门户证照中心端骨架——license-center.html/theme-ct/shell-ct/home + 四端链灯 irita 条目 + index 入口卡

Co-Authored-By: Claude Code <noreply@anthropic.com>"`

### Task 7: ct 业务页（签发/台账/查验/吊销）

**Files:**
- Create: `frontend/js/pages/ct/issue.js`、`ledger.js`、`verify.js`、`revoke.js`
- Modify: `frontend/license-center.html`（script 区 +4 行，锚点注释内）、`frontend/js/data/explain.js`（additive：新页面用到的路径话术补缺）

**Interfaces:**
- Consumes: 既有端点契约（README §pass 组）：`pass/issue {mission_id, issuer, valid_from, valid_to, pass_id?}`、`pass/list`、`pass/query {pass_id}`、`pass/verify`、`pass/revoke`、`mission/list`、`crosschain/query`；`PUI.openCxDetail`、`P.dataTable/P.statCards/P.errCard/P.badge`、`PORTAL.renderQR`
- Produces: `CT_PAGES.issue/ledger/verify/revoke`

- [ ] **Step 1: issue.js**——待签发表格（APPROVED 任务 ⋈ 无 pass，列：mission_id/申请人/时间窗/操作）；签发弹窗（issuer 固定 `REGISTRY-ADMIN` 只读展示、valid_from/to 默认 ±1h、SM3 摘要预览）；提交后**进行中态**（「跨链签发约 3-6s：证照链→监管链中继→运营链」spinner，Review Focus：一次性操作延迟预期管理）；成功卡 = pass_id + QR（renderQR）+ 四段 TxID（openCxDetail 入口）；失败 = P.errCard + explain 文案 + 「同 pass_id 可重试」提示（prevFailedSourceTxID 语义）
- [ ] **Step 2: ledger.js**——pass/list 服务端分页表（状态徽章 STATUS_MAP 图标+文字；GENERATING/VALID/USED/EXPIRED/REVOKED）；行展开 = pass/query 详情 + QR + SM9 签名身份显示（REGISTRY-ADMIN / FISCO-ADMIN（历史））+ openCxDetail
- [ ] **Step 3: verify.js**——pass_id 输入 → pass/verify → 结果卡（有效/无效原因 3002、时间窗、签名身份、双身份过渡说明小字：「2026-10-13 迁移前证照由管理链身份签发，验证兼容」）；链上证据区 = 关联 crosschain/query 四段时间线
- [ ] **Step 4: revoke.js**——VALID 证照列表 + 吊销确认（后果文案）→ pass/revoke；`crosschain_status=FAILED` 时如实黄条展示「本地已吊销，链上吊销未达——将自动补发」（revokeNeedsResend 语义），绝不掩饰
- [ ] **Step 5: 验证 + Commit**——node --check ×4；隔离 sim 环境走通「签发→台账→查验→吊销」全流程（curl 驱动 + DEFERRED-HUMAN 页面核对）；`git commit -m "feat(frontend): 证照中心端业务四页——独立签发(REGISTRY-ADMIN)/台账/查验(双身份过渡说明)/吊销(链上失败如实展示)

Co-Authored-By: Claude Code <noreply@anthropic.com>"`

### Task 8: CXV 浏览器模块 + 四端挂载

**Files:**
- Create: `frontend/js/chainview.js`（window.CXV）、`frontend/js/pages/op/chainview.js`、`frontend/js/pages/au/chainview.js`、`frontend/js/pages/rg/chainview.js`、`frontend/js/pages/ct/chainview.js`、`frontend/js/pages/chainview.js`（index 用）
- Modify: `frontend/operator.html:65`、`authority.html:71`、`regulator.html:71`、`license-center.html`（各 +script 行：chainview.js + 本页注册文件，锚点注释内）；`frontend/index.html`（侧栏 +`a.nav-item[data-page="chainview"]` **置于所有 details.nav-fold 之外**；92-108 区段 app.js 之前 +2 script 行）；`js/shell-{op,au,rg,ct}.js`（nav 各 +chainview 项）；`frontend/css/drone.css`（尾部 +`.d-cxv-*` 样式块）；`frontend/js/data/explain.js`（+5 explorer 路径话术）

**Interfaces:**
- Consumes: Task 4 五端点契约（精确形状见 Task 4 Interfaces）、`crosschain/list`（过滤仅 status/message_type）、`PUI.openCxDetail`、`P.dataTable/statCards/badge`；**禁用依赖：PORTAL/MAPX**（index.html 不加载它们）——只允许 API/STORE/UI/PUI
- Produces: `CXV.render(root, opts)`；`opts = {portal:'op'|'au'|'rg'|'ct'|'index', defaultChain?, defaultMsgTypes?}`；四端裁剪：op→defaultMsgTypes `['MISSION_APPLICATION','FLIGHT_PASS']`、ct→defaultChain `'irita'`、rg→监管中继段高亮（cxTrail 里 CHAINMAKER 段加 `d-cxv-reg-hl` 类）、au/index→全量

- [ ] **Step 1: CXV 模块**——三区：①节点情况 = explorer/overview 四链卡（链色边条 `--p-chain-*`/`--d-chain-irita` var、绝不硬编码 hex；高度/节点数/共识/mode 徽章、状态图标+文字）+ 选中链 nodes 表（source 列如实展示 rpc/static+probe/sim）；②块浏览 = explorer/blocks（最近 20，行点击 → explorer/block 抽屉：hash/time/tx_count/proposer/tx 列表，tx 点击 → explorer/tx 详情，irita 附「Merkle 证明可用」标注）；③链上数据追踪 = crosschain/list 过滤条（message_type 5 类 + status）+ 分页表 + 行点击 openCxDetail；直查表单（链选 + TxID → explorer/tx）；客户端过滤处固定小字**「服务端仅支持状态/类型过滤，其余为最近 200 条内客户端筛选」**（Review Focus 5）；能力降级 5003 → 区块显示「该链 RPC 不支持块详情（v3.16 怪癖，见 version-matrix §11）」
- [ ] **Step 2: 六处薄注册 + 挂载**——每端注册文件 3-5 行（`window.<X>_PAGES.chainview = {render:(root)=>CXV.render(root,{portal:'<x>',…})}`）；HTML script 行与 shell nav 项；index 版确认 index.html 已加载 pui.js（若未加载则 CXV 的 index 分支只用 API/UI 自绘表格，不改 index 既有 script 序）
- [ ] **Step 3: 验证**——node --check ×6；隔离 sim :18090 四端 + index `#/chainview` 均渲染（curl 200 + DEFERRED-HUMAN 视觉）；explorer/overview 在 sim 下 mode=sim 徽章正确
- [ ] **Step 4: Commit**——`git commit -m "feat(frontend): 四端区块链浏览器——共享 CXV 模块（节点情况/块浏览/跨链数据追踪）× 三端+证照中心+index 五处挂载，能力缺口如实降级

Co-Authored-By: Claude Code <noreply@anthropic.com>"`

### Task 9: WTOPO 虫洞拓扑模块 + au/netsec 集成

**Files:**
- Create: `frontend/js/wormhole-topo.js`（window.WTOPO）
- Modify: `frontend/js/pages/au/netsec.js:54-166`（tabTopo：Leaflet 容器下方追加「抽象拓扑（含攻击节点）」区块 + 联动刷新）、`frontend/authority.html:71`（+script 行）、`frontend/css/drone.css`（尾部 +`.d-wtopo-*` 与 `@keyframes d-wormhole-flow`（dashoffset 流动）、`d-pulse-hit`（检测命中脉冲））

**Interfaces:**
- Consumes: `/api/topology/get` 返回的 nodes（含 `position{x,y}` 大小写双兼容、type ∈ MANAGEMENT/EDGE/UAV/ATTACKER、status ISOLATED/OFFLINE）与 edges（wormhole 标志、advertised_latency_ms、distance）；`/api/wormhole/toggle`、`/api/risk/evaluate`（dimensions/threshold）、`/api/path/switch`；`P.scoreBars`
- Produces: `WTOPO.svg(topo, opts) → SVGElement`；`opts = {hlPath?: string[], onPickNode?: fn}`；viewBox 700×470，position 线性归一化（min-max 缩放置边距 40px）；**无 position 的节点不入图，列入图侧「未布点」清单**（诚实规则）；**绝不读写经纬度**

- [ ] **Step 1: 模块实现**——边三态：正常（`p-topo-edge` 灰实线）/虫洞（`p-topo-wormhole` 红虚线 + `d-wormhole-flow` 流动动画 + 中点 ⚠）/会话路径（`p-topo-active` + hlPath 加粗）；节点：type 着色走 CSS var（MANAGEMENT 紫/EDGE 蓝/UAV 青/ATTACKER `--d-critical` 红 + ⚠ 标签）、ISOLATED 红虚线描边、OFFLINE 空心；hover `UI.showTip`（distance/advertised_latency_ms/「⚠ 虫洞伪造边」）；图例块（图标+文字，链色语义不挪用）
- [ ] **Step 2: netsec 集成**——tabTopo loadTopo() 成功后同时渲染 WTOPO 区块；wormhole/toggle、path/switch、risk/evaluate 操作后重绘（hlPath=当前会话路径）；risk 结果沿用既有 `P.scoreBars`（不动）；Leaflet 图保留（地理层=合法节点），区块标题注明分工「上图：地理分布（未设坐标节点不落图）；下图：抽象拓扑（全节点含攻击者）」
- [ ] **Step 3: 验证**——node --check；隔离 sim 环境：seed 后 topology/get 含 NODE-X/NODE-Y（ATTACKER、有 position、lat/lon=0）→ 断言 WTOPO 输入数据含二者且 Leaflet drawNodes 输入不含（Review Focus 4）；DEFERRED-HUMAN：开虫洞后红虚线流动 + 隔离态描边视觉核对
- [ ] **Step 4: Commit**——`git commit -m "feat(frontend): 虫洞攻击抽象拓扑图 WTOPO——纯 SVG 零依赖，攻击节点可见（坐标红线：抽象 position，不编造经纬度），au/netsec 集成三态联动

Co-Authored-By: Claude Code <noreply@anthropic.com>"`

### Task 10: au/passes.js 降级只读+验证

**Files:**
- Modify: `frontend/js/pages/au/passes.js`

**Interfaces:**
- Consumes: 既有 pass/list、pass/query、pass/verify；`PUI.openCxDetail`
- Produces: au「许可管理」页 = 只读台账 + 验证入口（签发/吊销按钮与表单移除）

- [ ] **Step 1: 降级改造**——移除签发/吊销操作件；顶部通告条：「通行证签发/吊销已移交证照中心端（四方分权：申请→审批→签发→验证）」+ `license-center.html` 链接；卡片硬编码文案「FLIGHT_PASS 跨链：fisco-bcos → fabric」→「FLIGHT_PASS 跨链：irita → fabric（证照链签发）」；保留 pass/verify 表单与结果展示（验证是当局监管职责）
- [ ] **Step 2: 验证 + Commit**——node --check；隔离环境 au `#/passes` 无签发按钮、验证可用；`git commit -m "feat(frontend): 管理当局端许可页降级只读+验证——签发/吊销专属证照中心端，跨链文案 irita→fabric

Co-Authored-By: Claude Code <noreply@anthropic.com>"`

### Task 11: verify 脚本四端化 + C-3 门

**Files:**
- Modify: `scripts/verify-three-portals-story.sh`（99-116 产物清单、117 文案、123-126 GET 循环、127-129 shell grep、133-139 链灯断言、391-422 DEFERRED-HUMAN；原名保留）
- Create: `docs/four-portals-verify-report.md`（本次 ALL_GREEN 输出留档）

**Interfaces:**
- Consumes: 全部 C-2/C-3 产物；脚本自起隔离 sim :18080 + 代理 :18090（拒绝 :8080/:8090 硬编码保留）
- Produces: 四端故事 ALL_GREEN 证据

- [ ] **Step 1: 脚本扩展**——产物清单 +（license-center.html、theme-ct.css、shell-ct.js、js/pages/ct/*.js ×5、chainview.js、wormhole-topo.js、js/pages/{op,au,rg,ct}/chainview.js、js/pages/chainview.js）；GET 200 循环 +license-center；grep shell-ct.js 被引用；链灯断言 4 链（chain/status count=4 + irita ONLINE）；**新故事断言**：pass/issue（issuer=REGISTRY-ADMIN）成功且 crosschain source_chain_tx_id 前缀 `IRITA-`；pass/verify 通过；topology/get 含 NODE-X 且 position 非空（Review Focus 4 数据面）；chainview 页面文件 grep「最近 200 条」文案存在（Review Focus 5）；explorer/overview 返回 4 链且 consensus 字符串精确匹配；成功文案改「四端全部产物文件存在…」；DEFERRED-HUMAN +【证照中心端】【四端浏览器】【虫洞拓扑】分组
- [ ] **Step 2: 全量跑**——`./scripts/verify-three-portals-story.sh` → ALL_GREEN（182+ 断言，失败逐一修复重跑）；`find frontend/js -name '*.js' -exec node --check {} \;` 全过
- [ ] **Step 3: Commit + C-3 STOP 汇报**——报告留档 docs/four-portals-verify-report.md；`git commit -m "test(scripts): 三端验收脚本四端化——证照中心端产物/故事/浏览器/虫洞拓扑断言，隔离复跑 ALL_GREEN

Co-Authored-By: Claude Code <noreply@anthropic.com>"`；向用户汇报 C-3 完成 + 四端截图级描述 + 浸泡期链健康总结

### Task 12: run-acceptance 四链化 + 隔离真链联调

**Files:**
- Modify: `scripts/run-acceptance.sh`（:38-42 ONLINE==3→==4；② +IRITA 锚点 TxID 检查 `IRITA_ANCHOR_TXID` env（默认=Task 1 Step 8 值）：`curl /tx?hash=0x<anchor>` code=0；:101 pass/issue `issuer` `FISCO-ADMIN`→`REGISTRY-ADMIN`（Task 3 后签发主体变更；:95 review 的 reviewer 不动——审批仍属管理链角色）；③ 签发闭环断言 CX3 源段前缀 `IRITA-`；⑤ `COUNT=${COUNT:-10}`；头部注释注明「v2=新机四链默认值；老机三链复现走 override（时代注记）」）、`scripts/probe-latency.sh:12,17-20`（+26657 探活 + irita 探针段）
- Modify: `services/skytrust-backend/.env`（**生产 .env，gitignored**：+`IRITA_MODE=real` + IRITA_* 5 变量——只改文件不重启，切换在 Task 13）

**Interfaces:**
- Consumes: Task 1 部署（:26657 在线）、Task 5 real 传输、隔离启动脚本模式（/tmp/fab-verify/start.sh 先例：SERVER_ADDR=:18180 + /tmp DB/SM9）
- Produces: 隔离四链 real 验收首跑日志 `/tmp/acceptance-four-chain.log`

- [ ] **Step 1: 脚本四链化**——按上述点改；`bash -n` 过
- [ ] **Step 2: 隔离 real 后端起 :18180**——`set -a; source .env; set +a` + SERVER_ADDR/DB_PATH/SM9_KEY_DIR 覆盖 /tmp；启动自检 4×ONLINE
- [ ] **Step 3: 验收首跑**——`BACKEND_URL=http://127.0.0.1:18180 COUNT=10 bash scripts/run-acceptance.sh 2>&1 | tee /tmp/acceptance-four-chain.log`；预期 ①②③④ PASS、⑤ 如实记录（成功率必须 1；p95 数字登记）；失败逐一排查（链侧问题按 §6.5 授权调链，不放宽协议）
- [ ] **Step 4: 签发延迟专项**——隔离环境 3 次 pass/issue 全链耗时记录（预期 3-6s，timeout_commit=1s 档）；异常则核对 record inclusion 时间并登记
- [ ] **Step 5: Commit**——`git commit -m "test(scripts): run-acceptance 四链化（ONLINE==4/IRITA 锚点/签发前缀断言/COUNT=10）+ probe-latency irita 探针——隔离真链首跑 ①-④ PASS ⑤ 如实

Co-Authored-By: Claude Code <noreply@anthropic.com>"`（.env 永不 stage，提交前 `git status` 复核）

### Task 13: 受控生产切换（前置：用户单独确认）

**Files:**
- Modify: 无仓库文件（运维操作）；产物 = 新 `bin/server-realchains` 二进制 + 切换记录

**Interfaces:**
- Consumes: `./scripts/build-backend-real.sh`（frozen 依赖断言门）、Task 12 隔离全绿、生产 .env 已含 IRITA_*（Task 12 Step 2）
- Produces: :8080 运行四链 real 新二进制

- [ ] **Step 1: STOP——向用户申请切换窗口**（汇报隔离验收数字；明示停机分钟级、旧二进制保留回退但前滚优先；**未获确认绝不执行后续步骤**）
- [ ] **Step 2: 构建 + 保留旧二进制**——`./scripts/build-backend-real.sh`；`cp bin/server-realchains bin/server-realchains.bak-3chain`
- [ ] **Step 3: 切换**——记录旧 pid → 优雅停 :8080 → `./scripts/start-backend-real.sh`（四链自检 4×ONLINE）→ `curl -X POST :8080/api/chain/status` code=0 count=4 → `:15001` 四门户 GET 200 → 只读冒烟（explorer/overview、pass/list——**不 POST 业务写**）
- [ ] **Step 4: 失败处置**——4×ONLINE 不达且 5 分钟内不可修复 → 回退旧二进制（登记回退原因与生产 DB 影响评估：窗口内无业务写则零断代）；成功 → 记录新 pid 与时间线

### Task 14: 正式验收复跑 + §12 数据收集

**Files:**
- Create: `/tmp/acceptance-four-chain-final.log`（隔离 :18180 正式复跑，real 四链）

**Interfaces:**
- Consumes: Task 12 脚本、Task 13 后生产稳定运行
- Produces: ①-⑤ 正式数字 + f=1/RSS/延迟汇总（§12 登记输入）

- [ ] **Step 1: 隔离正式复跑**——重起 :18180 隔离 real 后端（全新 /tmp DB）→ `COUNT=10 bash scripts/run-acceptance.sh | tee /tmp/acceptance-four-chain-final.log`；跑两次取全绿一次为正式记录（诚实：两次都跑，数字都留）
- [ ] **Step 2: 生产健康终检**——:8080 4×ONLINE、四门户 200、load/available 正常、IRITA 高度持续增长
- [ ] **Step 3: 汇总 §12 素材**——锚点 TxID、Gate-2 数字（f=1 时间线/RSS/块间隔）、验收 ①-④ 证据（CX 号、四段前缀）、⑤ 数字（avg/p95×2 次）、签发延迟专项、偏差清单（维护停滞锁 tag、CLI shell-out、C16 断代、双身份过渡、fisco 块浏览降级、ui.js legacy tag 不显新链、timeout_commit 实际值）

### Task 15: 文档登记 + 终版提交（C-4 STOP 汇报）

**Files:**
- Modify: `docs/version-matrix.md`（+§12 新机四链登记：拓扑与 SM2 实证/部署 TxID/验收复跑/偏差/浸泡记录；**§1-§11 一字不动**）、`services/skytrust-backend/README.md`（78 端点表、四链清单、IRITA env 块、errcode 5003、pass 流程序列图更新）、`frontend/README.md`（门户表 +1、结构树、CSS 命名空间、CXV/WTOPO 约定）、`docs/demo-script.md`（四端版：签发步骤移证照中心端、浏览器演示动线、虫洞拓扑演示动线）、`contracts/README.md`（Task 5 已改则复核）、设计文档（如有实施偏差 → 追加修订节）
- Create: 无

- [ ] **Step 1: version-matrix §12**——按 Task 14 Step 3 素材写入（拓扑表/SM2 两层证据/sha256/锚点 TxID/f=1 时间线/RSS 表/⑤ 数字/偏差 7 条/浸泡曲线摘要）
- [ ] **Step 2: README×2 + demo-script + 设计文档修订**——端点计数 73→78 全文一致性 grep 核对（`grep -rn "73 个端点\|73 endpoints" docs/ services/ frontend/ scripts/ | grep -v version-matrix`）
- [ ] **Step 3: 终检 + 提交**——`go test ./... -count=1` 全绿、`node --check` 全过、`git status` 复核（CLAUDE.md/tar.gz 不 stage）、分文档提交：`git commit -m "docs: version-matrix §12 四链登记 + README/demo-script 四端化——第 4 链证照链 IRITA 部署与验收全证据（①-④ PASS ⑤ 如实）

Co-Authored-By: Claude Code <noreply@anthropic.com>"`
- [ ] **Step 4: C-4 STOP 终版汇报**——四链拓扑总表（4×4 节点 BFT 全 f=1 实证）、验收 ①-⑤ 结果、四端门户与浏览器/拓扑图演示入口、§12 登记摘要、遗留事项（如有）

---

## 实施偏差记录（执行中如实追加）

（空——Task 1 Step 7 record CLI 形态校准结果、Task 5 QueryState 路径取舍、Task 13 切换时间线等落地后补记于此）

### Task 1 Step 7 校准实录（record 模块真实接口形态，Task 5 实现必须以此为准）

1. **CLI 写路径**：`irita tx record create <SM3hex(contentsJSON)> SM3 --uri "skytrust://<contract>/<method>/<business-key>" --meta '<contentsJSON>' --from <key> --chain-id <id> --node tcp://127.0.0.1:26657 --keyring-backend test -y --output json`。子命令是 `create`（非 create-record）；位置参数 = digest + digest-algo；验证仅要求 digest/digest_algo 非空（无算法白名单、uri/meta 无模块级长度限制）。零 fee 可上链（fee 事件属性为 null 实证）。默认 gas 200000 够用。
2. **record-id 链上派生，客户端不可指定**：`recordID = hash(record字节 || intraTxCounter)`，hex 形态经 `create_record` 事件属性 `record_id` 返回（RPC events：type 明文、attribute key/value 均 base64；record_id 的 value 解码后是 64-hex 字符串）。设计中的"业务键 record-id"改由 `Content.URI` 承载（`skytrust://license_registry/<METHOD>/<key>`），contents JSON 由 `Content.Meta` 承载，digest=SM3(contents JSON)。
3. **QueryState 读路径**：必须 JSON-RPC POST `/` `{"method":"abci_query","params":{"path":"/store/record/key","data":"01<recordIDhex>","prove":true,"height":"<字符串形态 int64，0=latest>"}}`。GET 形态的 data 参数不做 hex 解码（按 ASCII 透传）不可用；int64 参数必须 JSON 字符串；height=1+prove 被 SDK guard 拒绝（code=18），height=0 会被 baseapp 归一化为 latest 后正常。**响应字段名为 camelCase `proofOps`**（非 proof_ops）；prove=true 返回完整 ics23 双段证明（ics23:iavl 记录包含证明 + ics23:simple 多 store 提交证明）——设计承诺的 Merkle 证明 bonus 真实可用。value = base64(protobuf Record{tx_hash, contents[]{digest,digest_algo,uri,meta}, creator})。
4. **业务键无法直接反查**（record 模块无二级索引；QueryState(contract,业务key) 无法经链上查询实现）——但 **QueryState 在全代码库零业务调用点**（grep 证据：仅接口定义+各 adapter 透传，gateway/uavbusiness/regulatory 均不调用）。Task 5 的 irita QueryState 实现：key 接受 record-id(64-hex) 或 txhash（后者经 /tx?hash 提取 create_record 事件再查）；业务键形态 → 明示错误「irita record 模块不支持业务键反查」，绝不静默。§12 登记偏差。
5. **bank send 收件人必须 bech32 地址**（key 名会报 `decoding bech32 failed`）；创世账户余额 5000 IRITA/户 → skytrust-biz 实注资 1000 IRITA（txhash 73E80A03910352B3CAE48CEED28EABF8C35B33F2CA55BC37882D1D6BCBCF2FDC）。

### Task 4 校准实录（能力降级错误码 5003→2005，Task 5/8/11/15 必须以此为准）

计划钉死的 `ErrChainUnsupportedFeature = 5003` **不可实施**：5003 已被 `errcode.AuthScope`（System 3 授权范围越界）占用且在线使用（regulatory_handler.go:118 sealed 透传、inspection.go:68），前端 `js/data/explain.js:31` 将 5003 全局映射为「授权范围越界」——复用会令同一码承载两种语义，违反全局码表语义唯一（=造假解释，触数据红线）。计划该处 gate「先核对 5003 未占用」即为让路指令。

**已落位（commit b51181c）**：`errcode.ChainUnsupportedFeature = 2005`（2xxx 链基础设施段，与 2004 幂等重复同段；已核验 2005 全仓未占用）。explorer 5 端点、apidoc 摘要、README 错误码表均已用 2005；errcode.go:21 注释记录改号缘由。

**下游传播（brief 文本仍写 5003 处一律以本节为准）**：
- Task 5：real/irita 传输能力缺失路径返回 2005（含 abci_query/证明能力如实降级）。
- Task 8：CXV 浏览器前端按 2005 渲染「该链 RPC 不支持…」如实降级文案。
- Task 11：验收脚本断言能力降级码 = 2005（非 5003）。
- Task 15：README/错误码表核对 2005 行；「73 个端点」残留清点含 gen-endpoints.sh 注释与 frontend/README。

### Task 9 校准实录（NODE-X/Y 经纬度前提已过时，Task 11/15 必须以此为准）

Review Focus 4 与 Task 9 Step 3 的前提「NODE-X/Y lat/lon=0（Leaflet 缺席）」已失效——commit 0c4d461（早于 Task 9）为种子攻击节点回填了真实模拟经纬度（NODE-X 30.556/114.356、NODE-Y 30.640/114.440，seed.go:120-121），二者合法地同时出现在地理层与 WTOPO。机制断言不变：lat/lon 双零节点经 GEO.nodeCoord 判 null 永不落 Leaflet；有可解析 position 必入 WTOPO；无 position 入「未布点」清单。Task 11 verify 不得断言 NODE-X/Y ∉ Leaflet 输入；改为断言 (a) topology/get 含 NODE-X/Y 且 position 非空（Step 1 原文仍成立），(b) 注册一个仅含 position（无 lat/lon）的 probe 节点后其 ∉ Leaflet 输入且 ∈ WTOPO 布点集，(c) 未布点节点入清单不画。Task 15 验收/演示口播改按「抽象层全量可见（含攻击者），地理层按经纬度红线落点」措辞。
