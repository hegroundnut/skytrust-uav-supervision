# SkyTrust Docker 部署总文档（含后端 / 节点分离部署）

> 版本：2026-10-21 · 适用仓库：skytrust-uav-supervision（main）
> 读者：准备在**新机器**上复现真实链部署、或把**后端与链节点分开部署**的运维/开发人员。
>
> **图例（全文一致，诚实标注）**
> - ✓ **实测**：当前生产部署机上真实在跑、被 `scripts/*.sh` 编排、经过验收验证的形态。
> - ◇ **模板·待验证**：本仓库从未跑过的容器化方案，仅供新机器/分离部署试点；上线前必须按 §4.9 / §3 验收清单自行验证。
>
> 权威依据：`docs/real-chain-migration.md`（迁移与验收）、`docs/version-matrix.md`（版本矩阵 / TxID 登记 / 偏差与教训）、`services/skytrust-backend/README.md`（后端规格）、`scripts/env.sh`（路径与端口真源）。

---

## §0 一页结论（先看这里）

1. **本项目现行生产部署不是全容器化，而是混合形态（✓ 实测）**：
   - 用 Docker 的：Fabric test-network 全网络（SMARTBFT 4-orderer + peers）、ChainMaker 合约 VM 引擎（每 org 一个 `chainmaker-vm-engine:v2.3.9`）、Fabric peer1×2 扩容容器、cm_db（MySQL 5.7，gchain 管理平台数据库，可选组件）。
   - 用原生进程的：ChainMaker 5 节点、FISCO BCOS 4 节点、IRITA 4 节点、skytrust-backend 二进制、前端 python3 代理。
   - 仓库根 `docker-compose.yml` 头部有**红线注释**：不要把 CM/FISCO 节点与 backend 容器化进该文件——任何 `compose down`/重建都可能触碰账本（同 `network.sh down` 禁令）。
2. **新机复现推荐「路线 A：混合形态」（§3）**——与实测生产一致，风险最低；全容器化链节点（路线 B）仅有官方模板可参考，本项目未验证。
3. **后端与节点分离部署（§4，本文核心）**：
   - 四链中 CM / FISCO / Fabric 的节点端口已实测绑定 `0.0.0.0` 或做了宿主端口映射，跨机可达；
   - **唯一的硬阻塞是 IRITA**：rpc `laddr = tcp://127.0.0.1:26657` 仅回环，且后端写路径是 **shell-out 调用 `irita` CLI + cli-home 钥匙环**——跨机部署必须在后端机安装 irita 二进制并分发 cli-home（私钥物料！），再解决 rpc 暴露（推荐 SSH 隧道，其次改 laddr + 防火墙白名单）。
   - 分离部署的本质工作量 = **证书物料分发（§4.4）+ TLS SNI 主机名（§4.5）+ `.env` 重写（附录 B）+ 端口放行（§4.3）**，后端代码零改动。

---

## §1 现行生产形态盘点（✓ 实测）

### 1.1 组件 → 运行形态对照

| 组件 | 形态 | 位置 / 镜像 | 编排入口 |
|---|---|---|---|
| ChainMaker 监管链 ×5（wx-org1..5，TBFT） | **原生二进制** | `/opt/chains/chainmaker/`（源码构建 v2.3.10） | `scripts/start-chains.sh` |
| ChainMaker 合约 VM 引擎 ×5 | **Docker 容器** | `hub-dev.cnbn.org.cn/chainmakerofficial/chainmaker-vm-engine:v2.3.9`，`--network host`，engine 2235N / sandbox 3235N，容器名 `VM-GO-wx-orgN.chainmaker.org-chain1` | `scripts/start-chains.sh`（docker run/start） |
| Fabric 运营链（test-network，SMARTBFT 4-orderer + peer0×2） | **Docker Compose** | `platforms/fabric-samples/test-network/compose/compose-bft-test-net.yaml`，docker 网络 `fabric_test`，官方镜像（`:latest` tag） | `network.sh`（首建）→ 此后仅 `docker start` |
| Fabric peer1.org1 / peer1.org2（扩容） | **Docker 容器** | 物料 `/opt/skytrust-nodes/fabric/`，宿主口 7061/9061，`-m 350m` + `GOMEMLIMIT=280MiB` | `scripts/run-peers-local.sh`（幂等） |
| FISCO BCOS 管理链 ×4（PBFT，group0） | **原生二进制** | node0 `/opt/fisco/nodes/127.0.0.1/node0` + `nodes_expand/node{1,2,3}`，各节点 `start.sh` | `scripts/start-chains.sh` |
| FISCO console v3.8.0（Java，合约部署/CNS） | **原生进程**（按需） | `/opt/fisco/console` | `scripts/env.sh: fisco_console_cmd` |
| IRITA 证照链 ×4（Tendermint BFT，chain-id `skytrust-license`） | **原生二进制**（源码自持构建 v4.0.0） | `/opt/irita/bin/irita`，数据 `/opt/irita/net/node{0..3}` | `scripts/start-irita.sh`（systemd-run 瞬态单元，**强制 CPUQuota=30% / MemoryHigh=420M**，绝不无限额启动） |
| skytrust-backend | **原生二进制** | `services/skytrust-backend/bin/server-realchains`（`CGO_ENABLED=1 -tags realchains`），:8080 | `scripts/build-backend-real.sh` + `start-backend-real.sh` |
| 前端（三门户 + 浏览器） | **python3 stdlib 静态服务 + /api 同源代理** | `scripts/serve-frontend.py`（生产统一入口 :15001） | `scripts/serve-frontend.sh` |
| cm_db（MySQL 5.7，gchain 管理平台数据库，**可选**） | **Docker 容器** | 根 `docker-compose.yml`，仅回环 `127.0.0.1:3306`，external volume `cm_db_data`，密码环境变量注入 | 手工 `docker compose up -d cm_db` |
| gchain 管理平台（可选） | 原生（gchain-back :9999 + gchain-web vite preview :4173） | 自带 compose **刻意弃用**（偏差 D14/D19） | 见 `docs/version-matrix.md` |

### 1.2 启停纪律（✓ 实测红线）

- 启动顺序：FISCO → ChainMaker（先 VM 容器后节点）→ Fabric → IRITA（`start-chains.sh`）。
- 停止顺序：IRITA → Fabric（**只 `docker stop`，绝不 `network.sh down`**）→ ChainMaker（按端口 PID kill + VM 容器 stop）→ FISCO（`stop-chains.sh`）。
- **账本即验收证据（P6-R6）**：`demo/reset` 只清业务表 + 重置模拟链；真实链数据永不重置；任何链的数据目录（`/opt/chains`、`/opt/fisco/nodes*`、`/opt/irita/net`、`test-network/organizations|channel-artifacts`、volumes）不得删除。
- CM VM 引擎挂载源目录必须**先以当前用户 mkdir**——docker run 会把缺失的源目录建成 root，导致节点写失败（start-chains.sh 已内置处理）。

---

## §2 Docker 资产盘点（按平台，✓/◇ 分标）

| 资产 | 位置 | 状态 |
|---|---|---|
| Fabric test-network compose（bft/非bft/ca/couch 变体） | `platforms/fabric-samples/test-network/compose/` | ✓ 在用（bft 变体） |
| CM 合约 VM 引擎镜像 | `chainmaker-vm-engine:v2.3.9`（官方 registry） | ✓ 在用 |
| CM 官方全容器起链模板 | `platforms/chainmaker/chainmaker-go/scripts/docker/{solo,four-nodes}.docker-compose.yml` + `*_up.sh`（镜像 `chainmakerofficial/chainmaker:v2.3.10`）；`DOCKER/Dockerfile`（源码构建镜像） | ◇ 本项目未用（生产为原生二进制） |
| FISCO 节点容器化 | 源码树 `platforms/fisco-node` **不带** docker-compose（仅 CI Dockerfile）；官方发行包另有 docker 方案 | ◇ 本项目未用（生产为 air 二进制 + build_chain.sh） |
| IRITA 容器化 | 无子模块；源码自持于部署机 `/opt/irita/src`（commit 4c8c4c9，sha256 登记于 version-matrix §12.2） | ◇ 无镜像，需自建 |
| skytrust-backend 镜像 | 无 | ◇ 本文 §4.7 提供模板 |
| 前端代理镜像 | 无（python3 stdlib，无需构建即可容器化） | ◇ 本文 §4.8 提供模板 |
| cm_db（MySQL 5.7） | 根 `docker-compose.yml`（**唯一**被本仓库编排的容器） | ✓ 在用 |
| gchain-back 官方 compose | `platforms/gchain-back/docker-compose.yml`（management v2.4.0 镜像 + mysql 8.0.29） | ✗ 刻意弃用（D14/D19） |

> ⚠ 子模块命名易混淆：`platforms/fisco-bcos` 是 **FISCO Go SDK**（后端 cgo 依赖），不是节点；节点源码在 `platforms/fisco-node`（v3.17.0 源码树，部署节点为 v3.16.4 二进制）。IRITA **没有**子模块。

---

## §3 新机器部署总方案

### 3.1 前置条件（✓ 实测口径，migration §1）

> 📋 向团队/管理员申请服务器时，直接提交 **`docs/server-requirements.md`**（按四链 ≥4 节点的实测负载逐项给出核数/内存/磁盘预算与环境形态硬要求：systemd + sudo + 嵌套 Docker）。

| 项 | 要求 | 备注 |
|---|---|---|
| CPU/内存 | 官方口径 8–16 GB RAM；**推荐 ≥4C/16G** | 旧生产机 2C/1.7G 靠全链路内存限额硬撑（教训见 version-matrix §12.5/§12.12）；新机内存充足可放宽限额但**IRITA CPUQuota 红线保留** |
| 磁盘 | ≥50 GB | 四链账本 + 镜像 |
| Docker / Compose | 部署机实测 Docker 28.1.1 / Compose v2.35.1 | 需能访问 Docker Hub + `hub-dev.cnbn.org.cn` |
| Go | 1.25.x（冻结，`build-backend-real.sh` 断言） | `/usr/local/go`，`source scripts/env.sh` 设 PATH + GOPROXY=goproxy.cn |
| GCC / CGO | gcc + glibc 头文件 | 后端 FISCO go-sdk 需 cgo |
| JDK | 14+（FISCO console / Fabric cc 用，部署机实测 OpenJDK 17） | |
| libbcos-c-sdk.so | `/usr/local/lib/libbcos-c-sdk.so`（部署机实测 18 MB，root:root） | FISCO go-sdk 运行时依赖；随 §3.2 步骤安装 |
| python3 | 3.8+（前端代理，仅 stdlib） | |
| 时区 | Asia/Shanghai（后端时间戳铁律） | |

### 3.2 路线 A（推荐）：复现实测混合形态

> 完整步骤以 `docs/real-chain-migration.md` §2–§6 为权威（本文不重复其细节），此处给骨架 + Docker 相关要点：

1. **代码**：clone 主仓 + `git submodule update --init`（fabric-samples、chainmaker、fisco-node、fisco-console、fisco-bcos(go-sdk)）。
2. **基础设施容器**：仅当启用 gchain 管理平台时才需要 cm_db——
   `docker volume create cm_db_data && CM_DB_ROOT_PASSWORD=… CM_DB_PASSWORD=… docker compose up -d cm_db`（密码只走环境变量）。
3. **建链**（原生）：FISCO `build_chain.sh`（4 节点，p2p 30300-30303 / rpc 20200-20203）；CM `prepare.sh` 生成 5 org 证书与配置（落点 `chainmaker-go/build/`）后源码构建节点；IRITA 从自持源码构建二进制 + 4 validator 配置（**rpc laddr 若要跨机见 §4.3**）。
4. **Fabric**：`test-network/network.sh up --bft`（首建，compose-bft-test-net.yaml，4-orderer 宿主口 7050/7052/7056/7058）→ `scripts/run-peers-local.sh` 拉起 peer1×2 → 建通道 `mychannel`、部署 cc `operator_business`。**首建之后永远只 `docker start`，不再 network.sh down/up**。
5. **启动四链**：`scripts/start-chains.sh`（含 CM VM 引擎容器 docker run，见 §1.1；IRITA 走 `start-irita.sh` 限额单元）。
6. **部署合约**：CM 5 个 docker-go 合约（`deploy-contracts.sh`，cmc）；FISCO `UavManagement`（console sol2java → deploy → CNS `uav_management`）；Fabric cc；IRITA 用内置 `record` 模块（无合约工件）。
7. **后端**：`scripts/build-backend-real.sh` → 复制 `.env.example` 为 `.env`（gitignored）逐项填证书路径 → `scripts/start-backend-real.sh`（自检 `/api/chain/status` 无 OFFLINE）。
8. **前端**：`PORT=15001 BACKEND=http://127.0.0.1:8080 scripts/serve-frontend.sh`（或开发口 8090）。
9. **验收**：`scripts/run-acceptance.sh`（migration §6.5 五项）+ `docs/acceptance-manual.md` 彩排。

### 3.3 路线 B：链节点全容器化（◇ 模板·待验证，不推荐在承载账本的机器上采用）

- CM 可用官方 `scripts/docker/four-nodes.docker-compose.yml`（镜像 `chainmaker:v2.3.10`）——但**与本项目 5-org TBFT + docker-go VM + 已部署合约的形态不同**，直接套用等于换链，需重新走建链/部署合约全流程。
- FISCO / IRITA 无仓库内 compose；IRITA 若容器化，用 `/opt/irita/src` 同 commit 源码构建镜像并**把 CPUQuota/MemoryHigh 等价翻译成 `--cpus`/`mem_limit`**（红线语义不变）。
- **无论哪种容器化，账本必须落 named volume 或 bind mount，且永远不执行 `down -v`**。根 compose 的红线注释同样适用于任何新编排文件。
- 结论：新机器如无强诉求，请按路线 A；容器化收益（环境一致性）主要在后端侧（§4.7），不在链节点侧。

---

## §4 后端与节点分离部署（核心章节）

### 4.1 两种分离形态

| 形态 | 说明 | 适用 |
|---|---|---|
| **同机双栈** | 节点保持原生（§1 形态），后端/前端放进容器栈，用 docker 网络与限额隔离 | 单机资源够、想要「后端可独立重启/回滚」的部署纪律 |
| **跨机分离** | 节点机（链 A 机）+ 后端机（B 机，可再带前端） | 节点机资源紧张、或后端要独立伸缩/对外服务；用户新机场景 |

两者后端配置工作量相同；跨机额外多出 **网络暴露 + 物料分发 + SNI 主机名** 三件事。**建议先在同机双栈验证容器化后端（§4.7），再拆跨机**——把「容器化风险」和「跨网风险」分开排除。

### 4.2 跨机拓扑（目标状态）

```
┌────────────── 节点机 A（链节点，全部原生进程）──────────────┐
│ FISCO ×4      :20200-20203 rpc / :30300-30303 p2p  (0.0.0.0 ✓) │
│ ChainMaker ×5 :12301-12305 rpc / :11301-11305 p2p  (host 0.0.0.0 ✓) │
│  └ VM 引擎容器 ×5（--network host，2235N/3235N，仅 A 机内部）      │
│ Fabric compose（fabric_test 网络）:7050/7052/7056/7058 orderer    │
│  :7051 peer0.org1 / :9051 peer0.org2 / :7061,:9061 peer1×2 (映射 ✓) │
│ IRITA ×4      :26657/26667/26677/26687 rpc —— 默认仅 127.0.0.1 ✗  │
│ （可选）cm_db :3306 仅回环，不对外                                  │
└──────────────────────────┬─────────────────────────────────────┘
              防火墙/安全组：仅放行 B 机 IP → 上述链端口
┌──────────────────────────▼─────────────────────────────────────┐
│ 后端机 B：skytrust-backend :8080（原生或容器 ◇）                  │
│   + 前端代理 :15001（BACKEND=http://127.0.0.1:8080）              │
│   + irita CLI 二进制 + cli-home（IRITA 写路径，见 §4.6）           │
│   + 四链证书物料（§4.4）+ .env（附录 B）+ /etc/hosts（§4.5）       │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 节点机侧：网络暴露（✓ 实测绑定情况）

| 链 | 现状 | 跨机需要做的事 |
|---|---|---|
| ChainMaker | org 配置 `rpc.host: 0.0.0.0`（实测 org1 核对） | 无需改；放行 12301-12305 |
| FISCO | `config.ini listen_ip=0.0.0.0`（实测 node0 核对），rpc 20200 | 无需改；放行 20200-20203 |
| Fabric | compose 端口映射 7050/7051/9051 + `LISTENADDRESS 0.0.0.0`（实测核对），peer1 7061/9061 | 无需改；放行 7051（后端最少只需 peer0.org1 7051；网关发现会再要 orderer 7050 与其余 peer 口——**建议整组放行 7050-7061/9051/9061**） |
| **IRITA** | `laddr = tcp://127.0.0.1:26657`（实测 node0 config.toml 核对）——**仅回环** | 二选一：<br>**方案 1（推荐，安全）**：保持 loopback，B 机建 SSH 隧道 `ssh -N -L 26657:127.0.0.1:26657 user@A机`（systemd/autossh 常驻），B 机 `.env` 仍写 `127.0.0.1:26657`。<br>**方案 2**：新建链时把 4 节点 `config.toml [server] rpc laddr` 改 `tcp://0.0.0.0:2665X`（改后需重启节点；已运行的生产链不建议改）+ **安全组只允许 B 机 IP**——Tendermint rpc **无鉴权**，裸露公网等于把链交出去。 |
| 防火墙总原则 | — | p2p 口（11301-11305/30300-30303/26656+10i）**绝不对 B 机之外的任何源开放**；所有链端口仅放行 B 机固定 IP；cm_db 3306、gchain 9999/4173 不出 A 机。 |

### 4.4 证书 / 物料分发清单（A 机 → B 机）

> 全部是**私钥级物料**：走 scp/rsync over SSH，权限 600/700，绝不进 Git、绝不进镜像层（容器方案用只读 bind mount，见 §4.7）。分发后在 B 机核对文件存在性再改 `.env`。

| 链 | B 机需要的物料 | A 机来源（.env.example 基线路径） | 对应 .env 变量 |
|---|---|---|---|
| ChainMaker | client1 **TLS 证书对** + client1 **签名证书对**（4 个文件） | `/opt/chains/chainmaker/chainmaker-go/config/wx-org-solo/certs/wx-org.chainmaker.org/user/client1/client1.{tls,sign}.{crt,key}`（以 A 机在用 `.env` 为准） | `CHAINMAKER_USER_CERT_FILE` / `CHAINMAKER_USER_KEY_FILE`、`CHAINMAKER_USER_SIGN_CERT_FILE` / `CHAINMAKER_USER_SIGN_KEY_FILE` |
| ChainMaker | **trust-roots 目录**（⚠ 是目录不是文件——SDK readdir 加载其中全部 .crt） | `/opt/chains/chainmaker/trust-roots-solo`（按实际组网选 trust-roots*，与在用 sdk.yml 一致） | `CHAINMAKER_CA_CERT_FILE=<目录>` |
| Fabric | Org1 Admin **签名证书 pem + 私钥 priv_sk**（2 个文件） | `$TN/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/{signcerts/Admin@org1.example.com-cert.pem, keystore/priv_sk}`（TN=`platforms/fabric-samples/test-network`） | `FABRIC_CERT_PATH`、`FABRIC_KEY_PATH` |
| Fabric | peer0.org1 **TLS ca.crt**（单文件） | `$TN/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt` | `FABRIC_TLS_CERT_PATH` |
| Fabric | （若走 orderer 直连/发现排障）orderer TLS ca.crt | `$TN/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt` | 按需（CLI 排障用） |
| FISCO | `ca.crt` + `sdk.crt` + `sdk.key`（SDK 证书三件套） | `/opt/fisco/console/conf/`——后端经 go-sdk 直连，**console 本体留在 A 机即可，B 机不需要 Java** | `FISCO_CA_CERT_PATH`、`FISCO_SDK_CERT_PATH`、`FISCO_SDK_KEY_PATH` |
| FISCO | 交易账户 keystore pem | `/opt/fisco/console/account/ecdsa/<account-address>.pem` | `FISCO_ACCOUNT_KEYSTORE` |
| IRITA | **`irita` CLI 二进制**（同版本 v4.0.0） + **cli-home 整目录**（keyring-test 文件钥匙环，内含 `skytrust-biz` 账户私钥！） | `/opt/irita/bin/irita`、`/opt/irita/cli-home/` | `IRITA_CLI_BIN`、`IRITA_CLI_HOME`、`IRITA_KEY_NAME=skytrust-biz` |
| — | libbcos-c-sdk.so | A 机 `/usr/local/lib/libbcos-c-sdk.so` → B 机同路径（`ldconfig`） | —（cgo 运行时） |

> 💡 最省事的 Fabric 物料做法：把整个 `$TN/organizations/` rsync 到 B 机相同相对路径——`.env.example` 的 Fabric 三个证书变量（`FABRIC_CERT_PATH`/`FABRIC_KEY_PATH`/`FABRIC_TLS_CERT_PATH`）是**仓库相对路径**，B 机 clone 同版本仓库后原样可用，无需重写。

### 4.5 后端机侧：主机名与 SNI（✓ 实测必需）

CM 与 Fabric 的 TLS 证书按主机名签发，SDK 校验 SNI，`.env` 已用 `*_TLS_HOST_NAME` 做名称覆盖（拨号走 IP、校验走名字），但仍建议 B 机 `/etc/hosts` 补齐：

```
<A机IP>  chainmaker.org
<A机IP>  peer0.org1.example.com
```

对应 `.env`：`CHAINMAKER_TLS_HOST_NAME=chainmaker.org`、`FABRIC_TLS_HOST_NAME=peer0.org1.example.com`（默认值不变）。容器化后端时改在容器内生效：compose `extra_hosts`（§4.7）。

### 4.6 IRITA 写路径特殊性（务必理解）

IRITA 没有合约工件（用内置 `record` 模块），后端写链方式是 **shell-out 执行 `irita tx record create … --node $IRITA_RPC --chain-id skytrust-license --keyring-backend test --home $IRITA_CLI_HOME`**：

- 所以 B 机必须有：① `irita` 二进制（与 A 机同 commit 构建，避免交易编码差异）；② cli-home（含 skytrust-biz 私钥）；③ 可达的 rpc 端点（§4.3 隧道或放行）。
- 读路径走 rpc（HTTP），写路径 CLI 也走同一 rpc——**隧道方案下 CLI 与后端读路径共用 `127.0.0.1:26657`，`.env` 零改动**，这是推荐方案 1 的第二个理由。
- 验证：B 机手工 `irita query block latest --node tcp://127.0.0.1:26657`（隧道内）能出块即通。

### 4.7 容器化后端（◇ 模板·待验证）

**Dockerfile（放 `services/skytrust-backend/Dockerfile`，构建上下文 = 该目录；证书不打进镜像）**：

```dockerfile
# syntax=docker/dockerfile:1
# ◇ 模板·待验证：生产实测为原生二进制；本文件用于分离部署/资源隔离试点。
# 红线：镜像内不含任何证书/私钥/.env —— 全部运行时 bind mount（只读）。
FROM golang:1.25-bookworm AS build
WORKDIR /src
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc-dev
ENV GOPROXY=https://goproxy.cn,direct
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# 冻结依赖断言与 build-backend-real.sh 同口径；GOFLAGS/GOGC 同实测参数
RUN CGO_ENABLED=1 GOFLAGS=-p=2 GOGC=50 go build -tags realchains -o /out/server ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates tzdata python3 curl && rm -rf /var/lib/apt/lists/*
ENV TZ=Asia/Shanghai
# FISCO go-sdk cgo 运行时依赖（从构建上下文 deploy/ 放入，或构建期下载官方 release）
COPY deploy/libbcos-c-sdk.so /usr/local/lib/libbcos-c-sdk.so
RUN ldconfig
COPY --from=build /out/server /usr/local/bin/server
# irita CLI（IRITA 写路径 shell-out 需要，版本必须与节点机一致 v4.0.0）
COPY deploy/irita /usr/local/bin/irita
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/server"]
```

**compose（后端机 B，`deploy/app-compose.yml`；与前端同栈）**：

```yaml
# ◇ 模板·待验证。红线：db/SM9 密钥落 named volume；证书只读挂载；绝不把账本类数据放容器内。
services:
  skytrust-backend:
    build: ../services/skytrust-backend        # 或 image: 私有 registry tag
    restart: unless-stopped
    env_file: /opt/skytrust/backend/.env       # 唯一注入点，600 权限
    ports: ["127.0.0.1:8080:8080"]             # 仅回环，前端代理同源转发
    volumes:
      - /opt/skytrust/certs/chainmaker:/certs/chainmaker:ro   # §4.4 分发落点
      - /opt/skytrust/certs/fabric:/certs/fabric:ro
      - /opt/skytrust/certs/fisco:/certs/fisco:ro
      - /opt/skytrust/irita-cli-home:/certs/irita-cli-home    # 钥匙环需可写? test 钥匙环读即可，:ro 试跑
      - skytrust_data:/app/data                               # sqlite + SM9 密钥
    extra_hosts:
      - "chainmaker.org:<A机IP>"
      - "peer0.org1.example.com:<A机IP>"
    mem_limit: 1g
  skytrust-frontend:
    image: python:3.12-slim
    restart: unless-stopped
    working_dir: /app
    command: python3 scripts/serve-frontend.py
    environment: { PORT: "15001", BACKEND: "http://skytrust-backend:8080" }
    ports: ["15001:15001"]
    volumes:
      - ../frontend:/app/frontend:ro
      - ../scripts/serve-frontend.py:/app/scripts/serve-frontend.py:ro
volumes:
  skytrust_data:
```

要点：
- `.env` 里所有证书路径改为**容器内路径**（`/certs/...`），见附录 B。
- 后端**无 CORS**，前端必须同源代理——两容器同 compose 网络即可（`BACKEND=http://skytrust-backend:8080`）。
- `IRITA_RPC`：SSH 隧道方案下隧道跑在 **B 机宿主**，容器内需指向宿主——用 `extra_hosts: host.docker.internal` 或容器网络 `host` 模式（择一，模板默认 bridge + `http://host.docker.internal:26657`，需在 extra_hosts 补 `host.docker.internal:host-gateway`）。
- SQLite 文件 + SM9 密钥在 named volume 中，容器重建不丢；`demo/reset` 语义不变。
- 同机双栈（§4.1 形态一）时：`.env` 各链地址仍写 `127.0.0.1` 不可用（bridge 网络下回环是容器自身）——要么 `network_mode: host`，要么统一写宿主 docker0 地址。**分离部署反而比同机容器化更少踩网络坑**，这是推荐先跨机试点容器后端的原因之一；同机双栈建议直接 `network_mode: host`。

### 4.8 前端部署位置

前端永远跟**后端**同机（同源代理铁律）：B 机 `:15001`（生产统一入口）或 `:8090`（开发）。B 机只需 `frontend/` + `scripts/serve-frontend.py` + python3，**不需要**任何链证书、Java、Go。浏览器直连 B 机；三门户 + 浏览器首屏的 `/api` 全部由代理转发。

### 4.9 验证清单（分离部署验收，按序执行）

**A 机（节点机）自检**：
1. `scripts/start-chains.sh` 全绿；`ss -tln | grep -E '12301|20200|7051|26657'` 四链在听。
2. CM：`cmc rpc GetBlockHeader --config sdk.yml` 出块。
3. Fabric：`docker exec cli peer channel list` 含 mychannel。
4. FISCO：`curl -s http://127.0.0.1:20200 -X POST -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"getNodeInfo","id":1,"params":["group0"]}'` 有响应。
5. IRITA：`irita status --node tcp://127.0.0.1:26657` 出块高。

**B 机（后端机）连通性**：
6. 端口探测：`for p in 12301 20200 7051; do nc -zv <A机IP> $p; done` 全通；隧道方案则 `nc -zv 127.0.0.1 26657`。
7. IRITA CLI 远查：`irita query block latest --node tcp://127.0.0.1:26657`（经隧道）。
8. `/etc/hosts` 生效后 `openssl s_client -connect <A机IP>:12301 -servername chainmaker.org </dev/null` 证书校验不报 hostname 错（Fabric 同理换 7051/peer0.org1.example.com）。

**后端联调**：
9. `scripts/start-backend-real.sh` 自检 `POST /api/chain/status` → **4×ONLINE**（fail-fast：real 模式无 transport 会启动即退，绝不静默回落 sim）。
10. `scripts/run-acceptance.sh` 五项全绿（migration §6.5）；再按 `docs/acceptance-manual.md` 走人工彩排。
11. 浏览器验证：`http://B机:15001/operator.html` 等四门户可开，`/api` 代理正常。

### 4.10 常见坑（全部有实测/文档出处）

| 坑 | 症状 | 解法 |
|---|---|---|
| `CHAINMAKER_CA_CERT_FILE` 指向文件 | SDK readdir 失败，CM OFFLINE | 必须指向 trust-roots **目录** |
| 忘配 TLS_HOST_NAME/hosts | 拨号通、TLS 握手失败 | §4.5 |
| IRITA rpc 裸露公网 | 无鉴权 TM rpc 可被任意读写 | 只允许隧道或安全组单 IP |
| cli-home 未分发/keyring 不对 | IRITA 写全部失败、读正常 | §4.6；keyring-backend=test |
| B 机没装 libbcos-c-sdk.so | 后端启动即 `error while loading shared libraries` | §4.4 末行；容器方案已 COPY |
| Fabric 网关发现拿不到容器内地址 | 首调成功、发现后连接超时 | test-network 证书 SAN 为 `peer0.orgN.example.com`——B 机 /etc/hosts 需给**所有会被发现的 peer/orderer 主机名**指向 A 机 IP（orderer.example.com、peer0.org2.example.com 等） |
| NODE_LIST 未配 | 浏览器/资源面节点枚举缺行 | `CHAINMAKER_NODE_LIST=name=addr,…`、`FABRIC_NODE_LIST=…`（TCP 探测，source=static+probe） |
| bridge 网络下写 127.0.0.1 | 同机容器后端连不上本机链 | §4.7 要点 4（host 网络或宿主地址） |
| 容器重建丢 sqlite/SM9 | 业务数据清零、验签失败 | named volume（skytrust_data） |

---

## §5 红线与安全总则（分离部署不豁免任何一条）

1. **账本红线**：A 机上永不 `network.sh down`、永不 `docker compose down -v`、永不删链数据目录；停机只走 `stop-chains.sh`（优雅、逆序）。B 机 `demo/reset` 只清业务表——但**跨机后 reset 依旧不得触碰 A 机任何数据**（它本来也只连业务库与 sim 链）。
2. **IRITA 限额红线**：A 机 IRITA 只经 `start-irita.sh`（systemd-run CPUQuota=30%/MemoryHigh=420M）启动；容器化等价物必须带 `--cpus`/`mem_limit`。
3. **密钥红线**：四链证书/私钥、cli-home、`.env`、cm_db 密码——只走 SSH 分发 + 600 权限 + 环境变量注入；不进 Git、不进镜像、不打日志。分发清单见 §4.4（其中 IRITA cli-home 与 Fabric Admin keystore 是**可直接签名交易**的最高敏物料）。
4. **生产端口红线**：现部署机 :8080/:15001（及 :8090）为生产——分离试点一律在新机/新端口做；任何联调不得向生产口 POST。
5. **冻结版本红线**：Go 1.25.0、gin v1.12.0、gorm v1.31.2、glebarez/sqlite v1.11.0、gmsm v0.44.1 不升级（`build-backend-real.sh` 断言）；irita CLI 与节点同 commit（4c8c4c9）。
6. **失败即停**：`real` 模式缺 transport = 启动即 fail-fast，绝不静默回落模拟——分离部署排障时把它当**特性**：chain/status 出现 OFFLINE 就按 §4.9 顺序二分（A 机自检 → 网络 → 物料 → .env）。

---

## 附录 A：端口矩阵（跨机放行清单）

| 端口 | 组件 | 对 B 机 | 对公网 |
|---|---|---|---|
| 12301-12305 | CM rpc（org1-5） | 放行（最少 12301；枚举需全部） | ✗ |
| 11301-11305 | CM p2p | ✗ | ✗ |
| 2235N/3235N | CM VM 引擎/sandbox | ✗（A 机内部） | ✗ |
| 7050/7052/7056/7058 | Fabric orderer | 放行（网关发现） | ✗ |
| 7051 / 9051 / 7061 / 9061 | Fabric peer0.org1 / peer0.org2 / peer1×2 | 放行 7051 起全组 | ✗ |
| 7054/8054/9054 | Fabric CA（如启用） | ✗ | ✗ |
| 20200-20203 | FISCO rpc | 放行（最少 20200） | ✗ |
| 30300-30303 | FISCO p2p | ✗ | ✗ |
| 26657/26667/26677/26687 | IRITA rpc | **默认拒绝**——仅隧道；改 laddr 后仅 B 机 IP | ✗✗（无鉴权） |
| 26656+10i | IRITA p2p | ✗ | ✗ |
| 3306 / 9999 / 4173 | cm_db / gchain | ✗（A 机回环） | ✗ |
| 8080 / 15001 | 后端 / 前端代理（B 机） | — | 15001 按业务需要；8080 仅回环 |

## 附录 B：`.env` 跨机重写对照（基线 = `services/skytrust-backend/.env.example`）

| 变量 | 单机值（基线） | 跨机值（B 机） |
|---|---|---|
| `CHAINMAKER_RPC_URL` | `127.0.0.1:12301` | `<A机IP>:12301` |
| `CHAINMAKER_USER_{CERT,KEY}_FILE`、`CHAINMAKER_USER_SIGN_{CERT,KEY}_FILE` | A 机 /opt 路径 | B 机分发落点（容器：`/certs/chainmaker/...`） |
| `CHAINMAKER_CA_CERT_FILE` | `/opt/chains/chainmaker/trust-roots-solo`（目录） | B 机 trust-roots **目录** |
| `CHAINMAKER_TLS_HOST_NAME` | `chainmaker.org` | 不变（+ /etc/hosts） |
| `FABRIC_PEER_ENDPOINT` | `localhost:7051` | `<A机IP>:7051` |
| `FABRIC_TLS_HOST_NAME` | `peer0.org1.example.com` | 不变（+ /etc/hosts） |
| `FABRIC_CERT_PATH` / `FABRIC_KEY_PATH` / `FABRIC_TLS_CERT_PATH` | 仓库相对路径 | B 机同版本仓库相对路径（或 /certs/fabric/...） |
| `FISCO_RPC_URL` | `http://127.0.0.1:20200` | `http://<A机IP>:20200` |
| `FISCO_CA_CERT_PATH` / `FISCO_SDK_CERT_PATH` / `FISCO_SDK_KEY_PATH` / `FISCO_ACCOUNT_KEYSTORE` | `/opt/fisco/console/...` | B 机分发落点（/certs/fisco/...） |
| `IRITA_RPC` | `http://127.0.0.1:26657` | 隧道方案：**不变**；放行方案：`http://<A机IP>:26657` |
| `IRITA_CLI_BIN` / `IRITA_CLI_HOME` | `/opt/irita/bin/irita` / `/opt/irita/cli-home` | B 机安装落点（两样都要！） |
| `CHAINMAKER_NODE_LIST` / `FABRIC_NODE_LIST` | 本机口枚举 | `name=<A机IP>:port,…` 全量枚举 |
| `SERVER_ADDR` / `DB_PATH` / `SM9_KEY_DIR` | `:8080` / `data/skytrust-real.db` / `data/sm9` | 不变（B 机本地/volume） |

## 附录 C：版本钉死表（与 version-matrix.md 同步维护）

| 件 | 版本 | 来源 |
|---|---|---|
| ChainMaker | v2.3.10（节点）/ VM 引擎镜像 v2.3.9 | 源码构建 / 官方 registry |
| Fabric | test-network（官方 `:latest` 镜像，首建时点决定）+ SMARTBFT | fabric-samples 子模块 |
| FISCO BCOS | 节点 v3.16.4 / console v3.8.0 / go-sdk v3.0.2-2 | 二进制 + 子模块 |
| IRITA | v4.0.0，commit 4c8c4c9（源码自持，sha256 登记 §12.2） | /opt/irita/src |
| libbcos-c-sdk.so | 部署机 /usr/local/lib 现存版本 | 随迁移分发 |
| Go / Docker / Compose | 1.25.x（冻结）/ 28.1.1 / v2.35.1（部署机实测） | — |
| JDK | 17（console） | — |
| MySQL（cm_db，可选） | 5.7（gchain 官方 8.0.29 弃用，D14/D19） | 根 compose |
