# SkyTrust 本机全栈部署 —— 设计与分阶段方案

- **日期**:2026-10-12
- **机器**:阿里云 ECS,Ubuntu 24.04,主机名 `iZbp1cpqvqmx5fa35znbgwZ`,**2 核 / 7.2GB RAM(+4GB swap)/ 23GB 可用磁盘**
- **仓库**:`/home/hetong/codes/skytrust-uav-supervision`(全新部署机,无 `/opt/chains`、`/opt/fisco`)
- **地位**:本文件是"在本机把整个项目跑起来"的**部署适配方案**,以 `docs/real-chain-migration.md`(权威迁移手册)为骨架,针对本机(全新、低于官方最低配)做落地裁剪。它**不修改**任何产品代码,只涉及安装、provisioning、配置、启动与验证。

## 1. 意图与缘由

用户要在本机把**整个 SkyTrust 项目**跑起来,统一前端入口在 **:15001**,三条链各用自己的端口,并最终让**每条链都有"足够节点、确保不可更改"**(BFT 语义 = 每链 4 节点,3f+1)。

但硬探查发现本机**低于官方最低配**(`real-chain-migration.md` §1.2 要求内存 8–16GB、磁盘 ≥50GB),且是**全新机器**(链平台二进制/证书/配置均未 provision),外加 **FISCO 节点版本错配**(§2:子模块 node v2.7 vs console/SDK v3.x)。一次性硬上"真实三链 × 4 节点"在 7GB 上大概率 OOM/跑不动。

因此采用**分阶段、可恢复、以里程碑交付**的策略:先用 **sim 模式**把整个项目可靠地跑在 :15001(快、稳、在资源之内),再利用后端**分链混跑**能力(`CHAINMAKER_MODE`/`FABRIC_MODE`/`FISCO_MODE` 各自 sim/real)**逐条链**迁移到 real,最后在内存允许范围内把每条 real 链**扩到多节点**。

## 2. 目标 / 非目标 / 反目标

**目标**
- **G1(里程碑一,可靠)**:整个项目以 **sim 模式**跑在本机——后端 73 API(:8080)+ 前端三端门户经统一入口 **:15001** 可访问,三幕演示与 `verify-three-portals-story.sh` 功能门通过。
- **G2(里程碑二,逐链)**:三条链**逐条**切到 **real**(分链混跑),各自部署合约、健康探活通过,跨链闭环在已迁移链上跑通。
- **G3(里程碑三,尽力)**:每条 real 链扩到**多节点共识**(目标 4 节点 BFT),在硬件上限内尽量逼近"不可更改";达不到 4 节点时如实记录实际节点数与原因。

**非目标**
- **NG1**:不追求在本机通过**性能验收**(跨链 `p95<1000ms`)——2 核达不到;**功能正确性优先于性能**。
- **NG2**:**不部署 gchain 管理平台**(gchain-back/gchain-web + cm_db MySQL)——省资源,核心系统不依赖;留作可选后续。
- **NG3**:不动机器上既有的 1Panel/GeoServer/postgres 等(已停止)容器;不碰与本部署无关的进程。

**反目标(即便技术上也算失败)**
- 用 sim 静默冒充 real(后端本身 fail-fast,严格尊重 `CHAIN_MODE` 诚实性)。
- 毁账:`fabric network.sh down`、删链目录等(账本载有部署 TxID)。
- 泄露/提交机密:sudo 密码、证书、私钥、`.env`、天地图 key 一律不入库、不写死。
- 把机器或既有服务 OOM 打挂。

## 3. 约束

- **硬件**:2 核 / 7.2GB RAM / 23GB 磁盘——低于官方最低配;swap 现 4GB,可再加(磁盘允许)。
- **全新机**:Go / Java / pkg-config 未装;`platforms/fabric-samples/bin/` 为空;`/opt/chains`、`/opt/fisco` 不存在。
- **FISCO 版本**:需 v3.x 节点(与 console v3.8.0 / go-sdk v3.0.2 配套);子模块源码是 v2.7,**不从源码编译**(2 核不现实),改为**下载官方 v3.x 预编译节点二进制**。
- **Docker**:28.1.1 + Compose v2,**需 sudo**(用户提供密码,仅经 stdin 使用,绝不存储/提交)。Fabric `network.sh`、ChainMaker VM 容器等脚本内部频繁调 docker——优先把用户加入 `docker` 组(或 `sg docker`)以消除 sudo 摩擦,否则逐命令 sudo。
- **网络**:代理 `127.0.0.1:7890` 可用;`goproxy.cn` 直连可用。**docker daemon 需配 7890 代理**(systemd drop-in)才能拉镜像;ChainMaker VM 镜像走 `hub-dev.cnbn.org.cn`(国内源,可能直连或经代理)。
- **仓库红线**(见 `CLAUDE.md`):生产进程保护(本机 :8080/:15001 起来后即视为本机 live 实例,集成验证走隔离端口)、real 链永不 reset、机密卫生、冻结资产不改、`CLAUDE.md` 不提交。
- **提交纪律**:中文 conventional commits + `Co-Authored-By` trailer,直接提交 main;本方案文档是否入库由用户定。

## 4. 目标拓扑与端口映射

| 组件 | 端口 | 说明 |
|---|---|---|
| **前端统一入口** | **:15001** | `serve-frontend.py`(PORT=15001),静态站 + `/api` 同源代理 → 后端 |
| 后端 skytrust-backend | :8080 | 前端代理转发目标;`CHAIN_MODE` 分链混跑 |
| ChainMaker 监管链 | RPC 12301 / p2p 11301 | solo → 4 org(TBFT);+ VM 引擎容器 |
| Fabric 运营链 | orderer 7050 / peer0.org1 7051 / peer0.org2 9051 | test-network → BFT(4 orderer)+ ≥2 peer |
| FISCO BCOS 管理链 | RPC 20200 / p2p·channel 30300 | group0:1 节点 → 4 节点 |

链端口尽量仅回环监听。数据库/密钥落 `/opt/chains`、`/opt/fisco`、仓库 `platforms/fabric-samples/test-network`(与 `scripts/env.sh` 一致);后端数据落 `services/skytrust-backend/data/`(gitignore)。

## 5. 分阶段方案

### Phase 0 —— 前置安装(共享)
1. 装 **Go 1.25** → `/usr/local/go`(经代理/直连下载 tarball;`env.sh` 已指 `/usr/local/go/bin`)。
2. 装 **Java(OpenJDK 17)** + **pkg-config**(apt;FISCO console 需要 Java)。
3. 配 **docker daemon 代理**:systemd drop-in `HTTP(S)_PROXY=http://127.0.0.1:7890` → `systemctl daemon-reload && restart docker`;验证 `sudo docker pull hello-world`。
4. 把用户加入 **docker 组**(`sudo usermod -aG docker hetong`),后续 docker 脚本用 `sg docker -c` 或新会话免 sudo。
5. **加 swap**(如 +8GB swapfile)作 OOM 缓冲;`vm.swappiness` 适度。
- **门 0**:`go version`≥1.25、`java -version`、`docker info`(经代理)、`free -h`(swap 增大)全部 OK。

### Phase A —— sim 模式全栈上 :15001(里程碑一,可靠)
1. 后端:仓库根 `cd services/skytrust-backend && go run ./cmd/server`(默认 `CHAIN_MODE=sim`,首启建 `data/skytrust.db` + SM9 密钥)。监听 :8080。
2. 前端:`PORT=15001 BACKEND=http://127.0.0.1:8080 ./scripts/serve-frontend.sh`。
3. 验证:`POST :8080/api/chain/status`(三 sim 链)、`/api/health/check`;浏览器开 `:15001/operator.html`、`/authority.html`、`/regulator.html`;跑 `./scripts/verify-three-portals-story.sh`(隔离 :18080/:18090,不碰 :8080/:15001)作功能回归门。
- **门 A**:三端门户可加载、三幕/验收故事功能门 ALL_GREEN、`chain/status` 三链在线(sim)。
- **交付**:一个**完整可用**的项目(全 73 API + 三端),链为 sim。这是可靠的可见成果。

### Phase B —— 逐链迁移到 real(增量、有风险,一次一条)
> 顺序:Phase A 后按"最易 provision"评估决定(倾向 **Fabric(network.sh 自动化程度高)→ ChainMaker → FISCO(版本错配最后攻)**;也可按 §3.1 启动序 FISCO→CM→Fabric)。每条链迁移后立即用**分链混跑**只把该链切 real、其余留 sim,跑通涉及该链的跨链闭环再进下一条。每条链的通用步骤:
- **B-Fabric**:`install-fabric.sh`/下载二进制入 `bin/` + 拉镜像(经代理)→ `network.sh up createChannel`(先默认 2 org/1 orderer)→ peer lifecycle 部署链码 `operator_business`(package→install→approve→commit)→ 配 `FABRIC_*` env(证书/端点)→ `FABRIC_MODE=real` → 验证。
- **B-ChainMaker**:构建/下载 `chainmaker-go` 节点二进制 + `cmc`;拉 `chainmaker-vm-engine:v2.3.9`;生成 solo 证书/配置;起节点 + VM 容器;经 cmc/docker 部署 **5 个 Docker-Go 合约**(regulatory_record / crosschain_trace / identity_mapping / regulatory_authorization / audit_record)→ 配 `CHAINMAKER_*` env → `CHAINMAKER_MODE=real` → 验证。
- **B-FISCO**:下载 **v3.x** 预编译节点(对齐 console v3.8/go-sdk v3.0.2)→ `build_chain.sh` 建 group0(先 1 节点)→ 构建 console(Java)→ `sol2java`+`deploy`+CNS 注册 `uav_management` → 配 `FISCO_*` env → `FISCO_MODE=real` → 验证。
- 后端切 real 前:按 `.env.example` 落地 `services/skytrust-backend/.env`(路径按本机 provision 实况改),用 `scripts/build-backend-real.sh`(CGO + `-tags realchains`)构建、`scripts/start-backend-real.sh` 启动。
- **门 B**:三链全 real,`/api/chain/status` 三链 ONLINE(真实 Health 探针),`run-acceptance.sh` 中本机可行项通过;跨链闭环 SUCCESS。若某链受阻(尤其 FISCO 版本),**保留该链 sim、其余 real**(混跑),如实记录并继续。

### Phase C —— 扩多节点(不可更改,尽力,受硬件上限约束)
- 逐链扩,每扩一步**盯内存**(`free -h`、`docker stats`),必要时加 swap / 设容器内存上限:
  - **FISCO**:group0 扩到 **4 节点**(PBFT/Raft,3f+1 拜占庭容错)。
  - **ChainMaker**:重生成 **4 org TBFT** 集群配置/证书,起 4 节点,重部署合约(或按官方扩容流程加节点)。
  - **Fabric**:切 **BFT ordering(4 orderer)** + ≥2 org peer(可用 `addOrg3`、`bft-config`)。
- **门 C**:每条链达成多节点共识、跨链仍闭环、演示"单方无法篡改账本";如实记录每链**实际达到的节点数**(若 7GB 不足以 4×3 并发,停在可行节点数并说明)。

## 6. 资源缓解
- swap 扩到 8–12GB;docker 容器设 `--memory` 上限;后端构建用 `GOFLAGS=-p=2 GOGC=50`(同 `build-backend-real.sh`);不跑 gchain/MySQL;链多节点分批起、非并发压测;优先**下载预编译二进制/镜像**而非源码编译(FISCO 节点、Fabric 二进制)。

## 7. 风险与回退
| 风险 | 级别 | 缓解 / 回退 |
|---|---|---|
| 多节点 OOM(7GB) | 高 | 加 swap + 容器内存上限;达不到 4 节点就停在可行数;`CHAIN_MODE=sim` 全局回退零风险 |
| FISCO v3.x 节点获取/对齐失败 | 中高 | 下载官方 v3.x release;若仍不通,**FISCO 留 sim**、其余 real(混跑),记录 |
| 全新 Linux provisioning 有未文档化步骤 | 中 | 以 `real-chain-migration.md` + 各链官方文档为准,边做边adapt;每链单独规划 |
| 23GB 磁盘耗尽(镜像/账本) | 中 | `docker system prune`、监控 `df`;镜像按需拉 |
| 2 核构建/共识慢 | 中 | 预编译优先;耐心;性能验收列为非目标 |
| 镜像源需代理/国内源不可达 | 中 | docker daemon 代理;ChainMaker VM 走 `hub-dev.cnbn.org.cn`;必要时找镜像 |

## 8. 决策

**我方决定(记录在案,可否决)**
- Go→`/usr/local/go`;Java=OpenJDK 17(apt);pkg-config(apt);docker daemon 走 7890 代理(systemd drop-in);用户加入 docker 组。
- 链数据落 `/opt/chains`、`/opt/fisco`、仓库 `test-network`(对齐 `env.sh`);后端 `:8080`,前端 `:15001`。
- **默认跳过 gchain 管理平台 + cm_db MySQL**(省资源)。
- **功能优先于性能**(不追 `p95<1s`)。
- 逐链混跑迁移;provision 顺序 Phase A 后按"最易"评估定(倾向 Fabric→ChainMaker→FISCO)。
- sudo 密码仅经 stdin 使用、绝不存储/提交;证书/密钥/`.env` 不入库。

**需你确认(会改变交付物)**
1. **跳过 gchain 管理平台 + cm_db MySQL** —— 同意?(默认:跳过)
2. **功能优先、不追性能验收(NG1)** —— 同意?
3. **Phase B provision 顺序**交给我按"最易"定,还是你指定先攻某条链?
4. 后端用 **:8080**、前端 **:15001** —— 端口分配 OK?

## 9. 参考
- `docs/real-chain-migration.md`(权威迁移手册:§1 前置、§2 FISCO 版本、§3 逐链 bootstrap、§4 合约部署、§6 切换验收、§7 回退)
- `contracts/README.md`(三链合约交付索引:合约名/方法/工具链差异)
- `services/skytrust-backend/.env.example`(real 模式连接参数模板)
- `scripts/`(`env.sh` / `start-chains.sh` / `build-backend-real.sh` / `start-backend-real.sh` / `deploy-contracts.sh` / `run-acceptance.sh` / `serve-frontend.sh` / `verify-three-portals-story.sh`)
- `docs/version-matrix.md`(版本矩阵 / TxID 登记 / 性能实录)

## 10. 修订 1 —— builder-check 审阅后 + 用户"继续"(2026-10-12)

**用户已"继续"。** Phase 0a/Phase A(sim 里程碑)**不依赖任何未决问题**,先做;涉及 real 链(Phase B/C)与老机工件的部分,**停在边界等 🔑Q2 回答 + 单独放行**再动。

**🔑 Q2(仍待用户回答,进入 Phase B 前必需)**:老部署机(Debian 11)或其归档(`/opt/chains`、`/opt/fisco`、`platforms/fabric-samples/bin/`、`/usr/local/lib/libbcos-c-sdk.so`、FISCO 节点 v3.16.4、ChainMaker `wx-org-solo` 证书配置)现在能否 `scp` 到?**能**→搬运适配(glibc 2.31 二进制在 24.04 可跑),Phase B 风险/时间砍半;**不能**→每样独立重建/重找,**FISCO 极可能长期停 sim**。

**已确认处置(按建议,随"继续"生效,可翻)**
1. provisioning 期把链当工作部署、**允许重建**;只在**最终多节点形态**达成后才跑验收 + 回填 TxID;"永不毁账"红线只约束**最终权威账本**。ChainMaker 终态 = **4-org TBFT 重建**(solo 非 BFT;TBFT 需 ≥3/4 节点在跑才出块);三链中**仅 FISCO 1→4 为原地扩容**。
2. 允许为本机改 `scripts/env.sh`、`run-acceptance.sh`(老机硬编码 TxID 新链对不上);`version-matrix.md` **追加"新机 2026-10-12"段**,不覆盖 2026-09-17 证据。
3. 性能 p95:做链侧调优(Fabric `BatchTimeout` 2s→0.1s、FISCO `min_seal_time`),但 **p95 当尽力项、不作硬门**(NG1 修正:仓库自证更弱机器 2vCPU/1.7GB 曾达 527ms)。

**关键修正(builder-check 揪出,已核实)**
- **【命门】`libbcos-c-sdk`**:`build-backend-real.sh` 用 `-tags realchains` 把**三条链传输编进同一二进制**;FISCO go-sdk v3 经 cgo 依赖原生库 `libbcos-c-sdk`(`version-matrix.md:22`,老机 `/usr/local/lib/libbcos-c-sdk.so`,**来历全仓无记录**)。**缺此 .so + 头文件,任何 real 构建都无法链接**(连只转 Fabric 也不行)→ Phase 0b 必须先解决(来源取决于 Q2:老机归档 / 官方预编译 / 源码编译需 cmake+boost+openssl-dev)。
- **Fabric**:钉死子模块(v2.4.0-215/main)**无 `install-fabric.sh`**(原方案引用有误);compose 钉 `:latest`(漂移)。冻结传输 `real/fabric/transport.go` 要求 **3.x qscc 签名** `GetBlockByTxID(channel,txID)`(D18)→ 用官方 **Fabric 3.x 发行二进制 + 钉死 3.x 镜像**,**不从源码编译**(避免 Phase 0 引入 Go 1.26 + fabric 源)。
- **ChainMaker**:仓库只记 solo **形态**(`wx-org.chainmaker.org` 无数字、TLS+签名双证书对、`trust-roots` 为**目录**、`sdk.yml`、合约 scaffold `$CM_BUILD/<name>/go.mod`),**未记生成命令**;原生 `prepare.sh` 产 `wx-org1..4`。→ 用原生工具重生成 + 按实况改 `env.sh`/`.env`(依赖第 2 条已确认)。

**Phase 0 拆分(更快到里程碑、更少系统改动)**
- **0a(A 需要,现在做)**:仅装 **Go 1.25** → `/usr/local/go`。
- **0b(B 需要,待 Q2 后)**:Java(OpenJDK 17)、pkg-config、cmake/boost/openssl-dev(若 libbcos-c-sdk 需源建)、docker daemon 7890 代理、用户入 docker 组、加 swap。

**我方工程判断(生效,否决请说)**:Fabric 3.x 发行二进制;FISCO 兜底可停 sim(混跑);跳过 gchain+cm_db;端口 后端 :8080 / 前端 :15001;provision 顺序 ChainMaker+Fabric 先、FISCO 最后。

## 11. 修订 2 —— Phase 0a/A 执行完成 + 老机工件到手(2026-10-12)

**🔑 Q2 已解决:老机可访问**(root@121.41.54.226,Debian 11,glibc 2.31/OpenSSL 1.1.1n)。已只读侦察 + 选择性 scp,工件落 `/home/hetong/skytrust-oldbox/`(**仓库外**,不入库;ChainMaker 包内含私钥/证书,**仅参考**,最终链重生成新证书)。

**已到手并验证的工件**
- `lib/libbcos-c-sdk.so`(18M):sha256 两端一致 `b26c9844…5b2f1`;24.04 上 `ldd` 全解析、**无外部 OpenSSL 依赖**(静态自包含),本机 GLIBCXX 3.4.33 ≥ 老机 3.4.28 → **可直接加载**(命门去风险)。
- `fisco/`:`fisco-bcos-v3.16.4.tar.gz`(24M)+ `console-v3.8.0.tar.gz`(258M)+ `build_chain.sh`(97K)——官方 release,对齐 go-sdk v3.0.2/console v3.8,**§2 版本错配消除**。
- `chainmaker/chainmaker-essentials.tar.gz`(111M/666 项):节点 `chainmaker` + `cmc` + `config`(含 `wx-org-solo`/`crypto-config`/模板)+ `sdk.yml` + `trust-roots(-solo)` + `deploy-*.json`(5 合约)。
- `images/chainmaker-vm-engine-v2.3.9.tar.gz`(79M):小众国内源 `docker save` 抢下,gzip 完整 + manifest 在。
- **Fabric 决策变更**:老机 `bin/peer` 是 development-build(go1.26.4 自编),**不搬**;改用官方 **Fabric 3.1.5 发行二进制 + 拉 3.1.5 镜像**(老机已证 3.1.5 镜像可用,满足冻结传输 3.x qscc 签名)。

**Phase 0a 完成**:Go 1.25.14 → `/usr/local/go`(经 go.dev 官方 JSON sha256 校验);node v18.19.1 + jq 1.7 已补(verify 依赖)。

**Phase A 完成(Gate A PASSED)**:sim 后端 :8080 + 前端 `0.0.0.0:15001` 在跑(三端+index 全 HTTP 200)。`verify-three-portals-story.sh`(隔离 :18180/:18190)→ **PASS=182 FAIL=0 ALL_GREEN**:前端产物门 + 全量 JS `node --check` + demo-script 第 0–8 章逐章 API 断言 + 全部设计内拒绝(3004/4001/5001/5002/4002/1004)+ 5 类跨链流水全 SUCCESS 且四段 TxID 齐全。**G1 达成。**

**Gate A 修正(守 CLAUDE.md 红线)**:原 Gate A 写"POST :8080/api/chain/status"与红线"never POST :8080"冲突 → live 实例**只做非 POST 探活**(GET/端口监听),功能验证一律走隔离 :18180/:18190。

**机器实况(共享机)**:用户 `codexdev` 的 rootless-docker 占 :18080/:8081/:29200/:29391/:19391;另有 :15000/:15002/:14998(python)、:5433(postgres)、:27449(1panel)、:7890(clash-linux 代理)、pmproxy/pmcd。**我的 :8080/:15001 + 链目标端口(12301/11301/7050/7051/9051/20200/30300)全空闲、无冲突**;系统 docker(`sudo docker`)当前无容器 → 链走系统 docker。

**Phase B 顺序调整(工件到手后)**:原"CM+Fabric 先、FISCO 最后" → 改 **FISCO 先**(工件最全、命门已验、`build_chain.sh` 一键建链)→ **ChainMaker**(config+VM 镜像齐)→ **Fabric**(需下 3.1.5 二进制+拉镜像+链码 lifecycle)。每链前先过**命门门**:`build-backend-real.sh`(CGO+`-tags realchains`)成功链接 `libbcos-c-sdk.so` = 三链 real 传输全部编得过。

**Phase B/C 待用户放行**(本修订记录至 Phase A 完成;Phase B 具体走法待用户定夺后补记)。

## 12. 修订 3 —— Phase B-1 FISCO 管理链完成:单节点 real 已切 + 4 节点 PBFT 已达(2026-10-12)

**命门门 PASSED**:`build-backend-real.sh` → `bin/server-realchains`(86M),go vet 干净,冻结依赖断言全过;`ldd` 证实链接 `libbcos-c-sdk.so`(老机工件 → `/usr/local/lib`)。三链 real 传输全部编得过。

**FISCO 单节点 real 链**(v3.16.4,group0,非国密,RPC :20200 **TLS**(enable_ssl=true,curl 需带 ca/sdk 证书),p2p :30300):
- 合约 `UavManagement.sol`(console 内文件名必须 CamelCase)deploy 成功:tx `0x172514d3…e2e76af`,addr `0x6849f21d…58e8f1`,block 1。合约地址由字节码确定 → 与老机中间态地址一致(源码 294 行 IDENTICAL)。
- BFS 链接 `/apps/uav_management`:**go-sdk v3.0.2 `Link()` 对 v3.16.4 节点静默失败**(tx 上链但 output=0x000…,无目录项)→ 改用 console `ln <path> <addr>` 成功;transport 同款 `Readlink` 验证通过。`bfs.List(path,nil,nil)` 会 reflect panic,用 `List0`。
- console 调用式:`printf '<cmd>\n' | timeout -k 10 120 bash start.sh group0`;退出时 `libproviders.so` 报错为无害噪声。`getTransactionReceipt` 走 console(curl JSON-RPC 报 3008)。
- build_chain.sh 前置:`~/.fisco/get_account.sh` 需预置(raw.githubusercontent.com 被墙;console tarball 内有同款);必须在 `/opt/fisco` 下运行(CWD 污染)。

**混合模式切换(正式 :8080)**:`.env` = `CHAIN_MODE=sim` + `FISCO_MODE=real`;server-realchains(DB `data/skytrust-real.db`,日志 `/tmp/server-real.log`)自检 3×ONLINE;`demo/init` 已灌;四门户经 :15001 全 200。隔离 :18180 重放 ch0-2:MISSION_APPLICATION 跨链 SUCCESS,真实目标 tx `0xda9e4389…124111b9` 上链 block 5,receipt status=0 + SUBMITAPPLICATION 事件;sim 腿保持 FABRIC-/CHAINMAKER- 前缀(混合模式语义正确)。

**4 节点扩容(BFT 达成)**——两条弯路记录:
1. **首次失败:忘 `-C expand`**(默认 deploy)→ 自建了新 CA(`0d15ba43`)→ 与原链 CA(`4df334ee`)TLS 互不认(`unknown ca`/`certificate verify failed`,getGroupPeers 只有 1)。扩展节点无账本数据,推倒重建安全。
2. **正确姿势**:`-C expand` **每次调用只产一个节点包**(`-o nodes_expand/nodeN`),config 从模板 `-c <原node0目录>` 复制(端口须手改:p2p 30301-30303,rpc 20201-20203;web3_rpc 默认关),`-d /opt/fisco/nodes/ca` 复用原 CA。启动绕过 start.sh(其 `ps|grep` 对同路径二进制误判"已在跑"),手动 `setsid nohup`。
3. **治理顺序铁律**:`addObserver <nodeId>` ×3 → 账本同步到等高 → `addSealer <nodeId> 1` ×3(直接 addSealer 报 `-51104 Only observer can be set in sealer`;语法要 weight 参数)。

**BFT 容错实证(4 节点容忍 1 宕)**:真杀 node3(⚠ `$!` 记的是 wrapper 子壳 pid,真身经 `/proc/<pid>/cwd` 映射)→ 20203 无监听 → `setSystemConfigByKey tx_count_limit 1000`(原值回写,语义空操作)3/4 quorum 照常出块 12→13 → node3 重启 ~12s 追平 13。终态:**getSealerList=4、getGroupPeers=4、四节点等高、后端 fisco-bcos ONLINE(real)、内存 4.4Gi 可用**。

**遗留给后续 Phase**:节点日志为按小时分片 `log/log_YYYYMMDDHH.N.log`;扩容节点目录 `/opt/fisco/nodes_expand/node{1,2,3}`(nodeid 存 `conf/node.nodeid`);`min_seal_time` 500→100 调优与 TxID 注册(§4.4)留到三链全 real 之后;ChainMaker(B-2)、Fabric(B-3)未动。

## 13. 修订 4 —— Phase B-2 ChainMaker 监管链完成:4 组织 TBFT 原生多节点 + 5 合约上链 + real 已切(2026-10-12)

**与 FISCO 路线不同**:ChainMaker 用 `prepare.sh` 直接从创世生成 4 组织 TBFT 链(wx-org1..4.chainmaker.org / chain1,v2.3.10,tjfoc 非国密 ecc_p256),**无需扩容**——4 节点即 BFT(3/4 quorum,创世起即具不可篡改性)。

**prepare.sh 两个缺口(手工补齐)**:
1. **RPC TLS 默认关闭**:生成的 chainmaker.yml `rpc.tls.mode: disable`,而 backend transport 硬编码 `WithNodeUseTLS(true)` → 4 节点统一 patch 为 `twoway` + 优雅重启,cmc/SDK 才通。
2. **VM 引擎容器不会自动创建**:节点 START 卡死在 4/7 "start docker vm…"(vm-go instance_manager 无限重试 2235N),TxPool 永不启动("The tx pool has stopped");strace 证实节点零 docker API 调用。手工 `docker run`(host 网络,镜像 chainmaker-vm-engine:v2.3.9 本地 load)每 org 一个:`CHAIN_RPC_PORT=2235N`(缺省全抢 22351 → org2 容器 Exited(0),strace+strings /bin/startvm 逆向得出)、`SANDBOX_RPC_PORT=3235N`、`CGROUP_DISABLE=true`,挂载 node 的 data/log_mount_path 绝对路径 → /mount、/log,容器名 `VM-GO-wx-orgN.chainmaker.org-chain1`。补齐后 4 节点 START 7/7。

**5 个 Docker-Go 合约全部上链(v1.0.2,4 组织 admin 联签,4 endorser 背书)**:contract-sdk-go v2.3.10 goproxy.cn 可得;`CGO_ENABLED=0 go build -buildvcs=false -trimpath`;py7zr 打包(清华 pip 镜像失效 → 阿里镜像)。cmc 教训:①`--enable-cert-hash` 默认 true → 必须显式 `=false`,否则报 "user cert havenot on chain yet";②`query block-by-height` 高度是**位置参数**;③`--sync-result` 可能在 tx 已提交后仍挂住(timeout 杀出 0 字节回执)——**部署核验一律以链上区块查询为准,不信客户端回执**(本次 4/5 回执 0 字节但区块 2-6 rwset 证实全部部署成功)。部署 TxID(regulatory_record `18ddbdb2…`,crosschain_trace `18ddbdba…`,identity_mapping `18ddbe2a…`,regulatory_authorization `18ddbea6…`,audit_record `18ddbf15…`)与合约地址表留待 §4.4 TxID 注册。

**backend SDK 修复(唯一代码改动)**:`real/chainmaker/transport.go` NewFactory 增加 `WithRPCClientConfig(100MB recv/send, 60s timeouts)`——合约部署后 `GetCurrentBlockHeight` 响应达 7.9MB,gRPC 默认 4MB 上限 → `ResourceExhausted` → chainmaker 假 OFFLINE(cmc 通而 backend 不通的原因;cmc sdk.yml `max_receive_message_size:100` 单位是 MB)。独立探针 `/tmp/cmprobe` 先证实修复方向(height 6, err nil)再改 transport;重建 `server-realchains` 过冻结依赖断言 + vet。

**负载饥饿事故(2 核机红线教训)**:5 个合约并行构建+部署叠加 8 链进程 → load average **85** → 17:34 全局 OOM(误杀他人 java 容器,非本项目)、:8080 生产后端 18:10:25 静默死亡(死前单条 SQL 1491s)、新进程 cgo init 间歇 SIGSEGV(strace 下反而存活——典型饥饿竞态)。**教训:重活必须串行,盯 `uptime`/`free -h`,load>4 停手。**

**FISCO 共识停摆(负载事故后遗症,已全恢复)**:症状链——backend FISCO 腿挂死(健康探测 GetBlockNumber 通,SendEncodedTransaction 等回执永不到)。逐层排查:①node0 ws 服务退化(TLS+WS 握手成功但不应答业务消息,c-sdk 报 "websocket connection handshake timeout";SIGTERM/SIGINT 均无反应 → SIGKILL);②node1/node3 p2p accept 线程挂死(:30301/:30303 LISTEN Recv-Q 69/75,日志停更 40+ 分钟)→ 全网状只余 2/4,低于 quorum,18:10 起停止出块;③仅存未重启的 node2 携带陈旧共识视图 → PBFT viewchange 死循环(toView=17,weight=2 凑不齐 3)。**修复:4 节点逐一重启(TERM 无反应一律升级 KILL;rocksdb WAL 崩溃可恢复)→ 全网状即时重建,滞留交易落块 13→14,账本连续无损(genesis hash 一致)。**诊断抓手:`ss -tln` Recv-Q、`heartBeat,connected count`、`getSyncStatus`/`getSealerList`(curl RPC 是一等工具;console 重启后 libproviders.so 噪声变本加厉,不可靠)。

**混合重放验证(隔离 :18180,弃用 DB)**:UAV_REGISTER_PROOF 跨链 SUCCESS——监管链两跳真实 TxID(`18ddc268…`×3)+ SM3/SM9 verify PASS + 时延 2320ms;MISSION_APPLICATION SUCCESS——fabric(sim)→chainmaker(real)→fisco(real) 全 13 步走通,目标链真实 tx `0x98e90de2…`;CM 高度 6→18(+12),FISCO 13→14。一条 REG_RELAYED 孤儿记录 = 停摆期丢 tx 所致(隔离库,无害;其挂死 goroutine 在区块 14 产出后自动补完了第二条)。

**正式切换(:8080)**:`.env` = `CHAIN_MODE=sim` + `FISCO_MODE=real` + `CHAINMAKER_MODE=real`(org1 client1 双证书对 + trust-roots-4org 目录);start-backend-real.sh 自检 **3×ONLINE**(fabric 仍 sim-ONLINE),四门户经 :15001 全 200。终态资源:内存 2.3Gi 可用,load <1,swap 0B。

**遗留给 Phase B-3(Fabric)**:7051 未监听为预期(sim);test-network 拉起 + operator_business chaincode(需 vendor/)+ `FABRIC_MODE=real`;**吸取教训:镜像拉取/构建全部串行**。TxID 注册(§4.4,含本修订 5 个 CM 部署 TxID)仍留到三链全 real 之后。

## 14. 修订 5 —— Phase B-3 Fabric 运营链 real 已切:三链全 real 达成(2026-10-12)

**工件全部来自老机 scp(零下载,内网 13MB/s)**:①`platforms/fabric-samples/bin/` 8 个二进制(peer/orderer/configtxgen/configtxlator/cryptogen/osnadmin/discover/ledgerutil,225M,源码静态构建 dev 版 go1.26.4,`peer version` 与 version-matrix 记录逐字一致);②docker 镜像 4×2 标签(peer/orderer:3.1.5+latest,ccenv/baseos:3.1+latest,gzip -1 打包仅 348MB,27s 传完;save/load 跨 docker 29.5.3→28.1.1 后 image ID 变化但内容同一);③`platforms/fabric-samples/config/`(configtx/core/orderer.yaml——**不在 git 追踪内**,源自官方 release tarball);④`contracts/fabric/vendor/`(19M,gitignored,deploy 脚本硬依赖)。

**test-network 拉起**:`sg docker -c "./network.sh up createChannel -c mychannel"` 一次通过——orderer(:7050/:7053)+peer0.org1(:7051)+peer0.org2(:9051),etcdraft 单 orderer,双 org anchor 配好,mychannel joined。

**链码 operator_business v1.0 seq1**:`deploy-contracts.sh fabric` 走到 commit 成功(Approvals Org1+Org2 true),但**冒烟步骤解析失败**——dev 构建 peer invoke 不打印 `Transaction ID:` 行,脚本 `tail -1` 抓到 grpc JSON 垃圾 → 假阴性。手工复跑:invoke status:200、区块解码证实落块、`QueryState("SUBMIT/SMOKE-…")` 读回原文(世界状态只反映 VALID tx,即有效性证明)。**部署证据(切 BFT 前,etcdraft 期)**:commit TxID `bc6585f224883dc8d4fa1794ec6da8d0f2de92d50bc6a438f42ec017d79a1efa`(block 5,approve=block 3/4),冒烟 TxID `cca5a04df38bccb959f1d262147f5d4da9a251349cf9615a59798cd202b97503`(block 8)。

**dev 构建 CLI 怪癖(记录以免再踩)**:`peer channel fetch latest` 报 "fetch target illegal"(只收数字);osnadmin 旗标漂移(`-o/--orderer-address`,无 `--cert/--key` 长名);qscc `GetChainInfo` 返回 protobuf 二进制而非 JSON。权威旁证一律走 `docker logs orderer`("Writing block [N]")与 peer("Committed block [N] … commitHash")。

**全实链闭环验证(隔离 :18180,弃用 DB)**:UAV_REGISTER_PROOF 与 MISSION_APPLICATION 双流 **SUCCESS**——source_chain_tx_id 为**真实 Fabric 64-hex txid**(不再有 FABRIC- 模拟前缀),监管链两跳 `18ddcaaf…`/`18ddcab0…`,目标链分别为 ChainMaker `18ddcaaf6404…` 与 FISCO `0x17d228cd…`;verify PASS;时延 5559ms/3006ms(含 Fabric 默认 BatchTimeout 2s,调优留待收尾)。链高变化:CM 18→27(+9)、FISCO 14→15(+1)、Fabric 8→12(+4:2 源链写入+2 ACK)。**13 步跨域网关三链全实达成。**

**正式切换(:8080)**:`.env` 三链 MODE 全 real(FABRIC_* 路径与新生成 organizations 核对全 OK);start-backend-real.sh 三链端口预检(12301/7051/20200)全过,自检 **3×ONLINE(真实 Health 探针)**,pid 1249499;四门户 :15001 全 200。资源:内存 2.1Gi 可用、load<1、swap 0B 未动。

**Fabric 多节点(BFT)待用户决策**:现状 etcdraft 单 orderer+双 peer(账本 3 副本但排序单点,不满足"4 节点 BFT"要求)。三条路:**A)** `network.sh down` + `up createChannel -bft`(compose-bft 原生 4 orderer SMARTBFT)+链码重部署——脚本化低风险,但触碰"never network.sh down"红线(该红线本意是保护**已登记** TxID 的账本;本机 TxID 尚未登记,重建后以 BFT 链的新 TxID 登记反而更干净);**B)** 在役 mychannel 原地 etcdraft→SMARTBFT 迁移(4 orderer 增量 join+配置更新)——保账本但 2 核机上复杂度/风险最高;**C)** 保留单 orderer 如实记录(不满足用户要求,不推荐)。

## 15. 修订 6 —— Fabric 重建为 4-orderer SMARTBFT:三链全部达成 BFT(2026-10-12)

**用户选定 A 方案**(AskUserQuestion 2026-10-12):`network.sh down` → `up createChannel -c mychannel -bft` → 链码重部署。**一次性红线豁免**仅限本条未登记 TxID 的新链;etcdraft 期账本(块 0-12)与旧证据(commit `bc6585f2…`/冒烟 `cca5a04d…`,修订 5)随重建作废,**最终登记以本节 BFT 链 TxID 为准**。2026-09-17 老机证据不动。

**BFT 网络**:compose-bft-test-net.yaml 原生 4 orderer——orderer(:7050/:7053)、orderer2(:7052/:7055)、orderer3(:7056/:7057)、orderer4(:7058/:7059)+ peer0.org1(:7051)+ peer0.org2(:9051);bft-config/configtx.yaml `ChannelUsingBFT`:`OrdererType: BFT`(SMARTBFT),ConsenterMapping ID 1-4,cryptogen 模板本就含 4 orderer 主机。一次拉起成功,mychannel joined,orderer 日志 `orderer.consensus.smartbft` + "Local consenter id is 1" 证实共识类型。资源:4 orderer 增量 ~300MB,内存 2.0-2.1Gi 可用、load ≤1.3、swap 0B。

**链码重部署(operator_business v1.0 seq1,双 org approve + commit)**:脚本冒烟再次假阴性(dev 构建不打印 TxID 行,修订 5 已录);且脚本冒烟 invoke 实际**已成功上链**(block 6 解码见 `SUBMIT/SMOKE-1791813494` 写集)——假阴性仅解析层。**BFT 链正式证据(登记用)**:
- commit(lifecycle,Approvals Org1+Org2 true):**block 5 TxID `d165208cd7414aa6df463ec1fa6b8d5ef6f5b86ebefe472736080fd394678479`**(approve=block 3 `221f910b…`/block 4 `dd237b24…`)
- 脚本冒烟:block 6 TxID `2208bb13c9b43e62df184cb89fc3f4cb0723d5d413fa2843448069a5da96fbc1`(SMOKE-1791813494)
- 手工冒烟:block 7 TxID `aab373ca109faad8a9a3be5624dd2eee8f7fdce12a2b042b2b29cba78f88745b`(SMOKE-BFT-1791813541);两条均 QueryState 读回原文(VALID 证明)
- 排序签名者集合直接写在块日志:`writing block 7 … signatures from [2 3 1]`——**每块 3/4 consenter 签名为 BFT quorum 的链上实证**

**f=1 容错实证(对齐 FISCO 4-sealer 的证明标准)**:`docker stop orderer3` → invoke 仍成功,block 8 签名 `[2 4 1]`(3 号缺席,3/4 quorum 达成);排序时延 **29ms**;`docker start orderer3` 后 ~45s 自愈重入,block 10 签名回到 `[2 3 1]`。**不可篡改性(n=4,f=1)在 Fabric 运营链实测成立。**

**性能红利**:SMARTBFT `RequestBatchMaxInterval: 50ms` 取代 etcdraft BatchTimeout 2s——修订 5 遗留的"Fabric 出块 2s 调优"**无需再做**(原地 config-update 方案作废)。全实链重放时延从 5559/3006ms 降至 **1468/1231ms**。

**全实链重放(隔离 :18180,全新弃用 DB,实体 FAB2 系)**:双流 SUCCESS——UAV_REGISTER_PROOF `CX-5862df45d53b`(fabric 源 `a419036a…`,CM 两跳 `18ddcd32…`×3,verify PASS,1468ms);MISSION_APPLICATION `CX-31c266ebb9b2`(fabric 源 `4c5b3ba5…`,CM 中继 `18ddcd33…`,FISCO 目标 `0x261cc523…`,verify PASS,1231ms)。链高:CM 27→36(+9)、FISCO 15→16(+1)、Fabric 11→15(+4)。

**正式切换(:8080)**:organizations 证书已随重建轮换,旧 pid 1249499 持有的 MSP 材料过期 → start-backend-real.sh 重载切换,pid **1316977**,自检 **3×ONLINE**;四门户 :15001 全 200。

**三链节点终态(用户"足够节点确保不可更改"要求全部达成)**:FISCO BCOS 4-sealer PBFT(group0,f=1 已实证)· ChainMaker 4 组织 TBFT(chain1,3/4 quorum,合约 4-admin 联签)· Fabric 4-orderer SMARTBFT(mychannel,f=1 已实证)+2 peer。**Phase B 三链逐链 real+多节点全部完成**;遗留收尾:FISCO `min_seal_time` 500→100 调优(可选)、验收复跑、§4.4 TxID 登记(version-matrix 新增"新机 2026-10-12"节:5 个 CM 部署 TxID + FISCO 部署事实 + 本节 BFT Fabric TxID + 重放证据)。

## 16. 修订 7 —— 收尾:链侧调优穷尽 + 验收复跑(①-④ PASS,⑤ 如实偏差) + §11 登记完成(2026-10-12)

**FISCO `min_seal_time` 500→100(4 节点滚动)**:配置在 `config.ini`(非 config.toml,v3.16 用 .ini;`[consensus]` 行 79)。节点自带 start/stop.sh 为 build_chain.sh 标准布局生成(pgrep 模式匹配不到本机手工 setsid 启动的进程)→ 弃用,手工滚动:备份 `config.ini.bak-sealtime` → sed → TERM(3s 不退升 KILL)→ `setsid nohup /opt/fisco/fisco-bcos -c config.ini -g config.genesis`。顺序 node1→2→3→0(node0 RPC 最后)。重启后全健康:heartBeat connected=3、sealer 4、viewchange 一次性恢复即停(22:23:54 后零新增)、:8080 c-sdk 自动重连三链 ONLINE。

**FISCO v3.16 JSON-RPC 怪癖(部署交易完整取证时踩出)**:`getBlockByNumber` 仅在 (onlyHeader=true,onlyTxHash=false) 组合下返回完整交易体、且**忽略 blockNumber 恒返块 1**;其余组合交易列表恒空;`getTransactionReceipt` 对链上有效交易恒报 3008(去 0x 同样)。部署交易恰在块 1 → "块 1 完整交易体含该 hash"即上链证明。完整值:**tx `0x172514d300b6e148a3b1630bb5c1dd7a85f038ff3ac10d720bc957ba9e2e76af`,合约地址 `0x6849f21d1e455e9f0712b1e99fa4fcd23758e8f1`(console deploylog.txt)**。

**run-acceptance.sh 适配(增量,老机默认值原样保留)**:①TxID 常量支持 `CM_TXIDS_OVERRIDE`/`FAB_TXIDS_OVERRIDE`/`FISCO_TXID` 环境覆盖(默认=老机 2026-09-17 登记值,两机证据均可复现);②FISCO 回执检查改为 RPC 块 1 包含证明优先、console 回退(新机 console libproviders.so 损坏)。

**验收复跑(隔离 :18180 全新弃用 DB)**:**①②③④ PASS**——8 笔部署 TxID 全部链上可查询(含 qscc GetBlockByTxID 在 BFT 新链命中);13 步闭环三笔全 SUCCESS(CX-f48cf7b7be53/CX-86e21686d6ae/CX-8767547c53a6,四段 TxID 齐全)。**⑤ 未达标,如实记录**:COUNT=100 在 load 46.77 触发负载红线**主动中止**(kill 隔离后端即停;中止后三链健康全绿、生产 :8080 无恙);COUNT=10 两次均 10/10 success rate=1,p95 1524/1658ms > 1000ms 门槛。

**链侧调优穷尽(§6.5-⑤ 授权类,协议/业务代码零放宽)**:逐跳探针(35 笔真实写)定位主导项 = **CM 4 跳 ~218-253ms/跳(合计 ~960ms)**;fabric 80-128ms(SMARTBFT 原生 50ms 批,已优于老机调优后 172ms)、fisco 182-195ms(min_seal_time=100 后)。CM `batch_create_timeout` 50→10(备份 chainmaker.yml.bak-batchtime ×4,滚动重启 org2→3→4→1)→ 探针合计 1473→1309ms;TBFT 无更多出块定时器旋钮(yml tbft 段仅 broadcaster_interval),~240ms/跳 = 2 核上 4 节点 TBFT 共识轮(docker-VM 执行+leveldb fsync 互争)的物理下限。**根因=用户要求的不可篡改拓扑(12 个 BFT 共识进程)与 2 核 CPU 的固有矛盾;老机 §6.2 官方记录(p95=527ms@COUNT=100,轻拓扑 6 进程)继续作为正式性能证据。**

**§4.4 TxID 登记完成**:version-matrix 新增 **§11 新机部署登记**(11.1 拓扑与 BFT 实证/11.2 部署 TxID 表/11.3 验收复跑/11.4 新机偏差 5 条/11.5 重放证据),§1-§10 老机 2026-09-17 证据一字未动。etcdraft 期中间 TxID 作废说明已写入 §11.1。

**遗留**:无(部署主线全部完成)。仓库改动待提交:scripts/env.sh、real/chainmaker/transport.go(100MB 修复)、scripts/run-acceptance.sh(override 适配)、本设计文档、version-matrix §11。
