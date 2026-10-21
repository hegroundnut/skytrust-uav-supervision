# 裸机全栈部署执行手册（AI Agent 直接执行版）

> **读者**：在一台**全新物理裸机**上执行 SkyTrust 全栈部署的 AI agent（或操作员）。
> **目标**：从裸 Ubuntu 到四链真实部署 + 合约 + 后端 + 前端全绿，完成 §6.5 五项验收并登记。
> **裁定记录（2026-10-21，用户）**：① 目标机为物理裸机、CPU/内存充足——取消团队服务器申请方案（原 `docs/server-requirements.md` 已删除）；② **取消 IRITA 历史限额**（CPUQuota/MemoryHigh/GOMEMLIMIT 默认不再下发，`scripts/start-irita.sh` 已按此修改；资源不足的小机器例外，见 §2 注）。
>
> **文档权威顺序**：本手册只管**顺序、门禁、红线**；操作细节以下列文档为准，冲突时以下列为准并登记偏差：
> 1. `docs/real-chain-migration.md` —— 建链/合约部署/模式切换/验收的**权威**（§2-§6 逐节照做）
> 2. `docs/version-matrix.md` —— 版本矩阵、TxID 登记、偏差 D1-D22、扩容配方与实测教训（§11/§12）
> 3. `docs/deployment.md` —— 部署形态盘点、分离部署方案、常见坑（§4.10 坑表排障时必查）
> 4. `services/skytrust-backend/README.md` —— 后端 73+ 端点、错误码、环境变量权威规格
> 5. `scripts/env.sh` —— 全部路径/端口/拓扑变量的**唯一真源**
>
> 工作方式要求：每个阶段结束跑门禁；门禁不过 → 停下诊断（§9 索引）→ 仍无解则**报告用户，不要自创绕过**。全程遵守下节铁律。

---

## §0 铁律（任何一条被违反 = 立即停工报告）

1. **账本不可毁**：从建链第一分钟起，所有链数据目录按生产数据对待。**永远不允许「删掉数据重来一遍」**——失败只能诊断后重试或向用户报告（P6-R6：真实链数据永不重置；账本 = 验收证据）。
2. Fabric 首建（`network.sh up --bft`）之后**绝不 `network.sh down`**，此后只 `docker start`。
3. 证书/私钥/密码只进 `.env`（gitignored）与 /opt 物料目录；**绝不入 Git、绝不留日志、绝不写进任何会提交的文件**。
4. 生成物绝不手改：`docs/apifox/*.json`、`frontend/js/data/endpoints.js`（再生成命令见 CLAUDE.md / 后端 README）。
5. 依赖版本冻结：Go 1.25.x、gin v1.12.0、gorm v1.31.2、glebarez/sqlite v1.11.0、gmsm v0.44.1（`build-backend-real.sh` 会断言并拒绝漂移）；不碰 `go.mod`/`go.sum`。
6. Git 提交：中文 conventional commit，直接提交 main，每条以 trailer 结尾：`Co-Authored-By: Claude Code <noreply@anthropic.com>`；`CLAUDE.md` 按项目约定不跟踪不提交；子模块指针噪音、既有脏文件不 stage。
7. IRITA 限额已取消（2026-10-21 裁定），但 **`start-irita.sh` 的其余纪律不变**：只 start/stop、SIGTERM 优雅停机、绝不删 `/opt/irita/net`。
8. 部署过程中对链的任何参数改动（如 gRPC 消息上限、超时）必须对照 version-matrix 偏差表登记为新偏差——**不许静默改**。

## §1 机器前置核查（全勾才开工）

- [ ] 物理裸机，root 或 sudo，systemd 可用（`systemctl --version`）
- [ ] Ubuntu 22.04/24.04 LTS（现生产实测 24.04）；时区 `Asia/Shanghai`；NTP/chrony 已同步（BFT 共识依赖时钟）
- [ ] CPU ≥8 核、内存 ≥16 GB、磁盘 ≥100 GB SSD（裸机充足是本裁定前提；**若实测 <8C 或 <16G，停工报告**——IRITA 限额必须重新启用，且整体预算需按 version-matrix §12 教训重估）
- [ ] Docker Engine ≥24 + Compose 插件（`docker info` / `docker compose version`；Fabric 网络、CM VM 引擎、cm_db 必需）
- [ ] 出站可达：Docker Hub、`hub-dev.cnbn.org.cn`（CM VM 引擎镜像）、`goproxy.cn`、github.com；不通则停工报告改走离线导入（docker save/load + GOPROXY 缓存）
- [ ] 端口空闲：12301-12305、11301-11305、2235x/3235x、7050-7061、9051/9061、20200-20203、30300-30303、26656-26697、3306、8080、15001
- [ ] 迁移物料到位（从旧机/备份介质取得，**永不入 Git**）：`libbcos-c-sdk.so`（→ `/usr/local/lib/` + `ldconfig`）
- [ ] **默认全新建链**（新证书、新创世、新账本）；不复制旧机账本——除非用户明确要求迁移旧链数据（那属于另一份方案，先问）

## §2 基础软件安装（版本冻结，见 §0-5）

Go 1.25.x → `/usr/local/go`（`export PATH=/usr/local/go/bin:$PATH`，`GOPROXY=https://goproxy.cn,direct`）· gcc/glibc-dev（后端 CGO）· OpenJDK 17（FISCO console / Fabric 工具）· python3 ≥3.8（前端代理，仅 stdlib）· git/jq/curl/tmux · Docker + Compose 插件。

> **IRITA 限额注**：`scripts/start-irita.sh` 默认无 CPUQuota/MemoryHigh/GOMEMLIMIT（2026-10-21 裁定，裸机资源充足）。若后续发现机器资源不足或 IRITA CPU 失控（历史事故：2 核机上无限制 IRITA 占满 CPU 拖死生产后端，version-matrix §12.5），显式重新启用：
> `IRITA_CPUQUOTA=30% IRITA_MEMORY_HIGH=420M IRITA_GOMEMLIMIT=350MiB scripts/start-irita.sh`

## §3 代码与目录骨架

1. clone 本仓库 + `git submodule update --init`（fabric-samples、chainmaker、fisco-node、fisco-console、fisco-bcos(go-sdk)、gchain-back、gchain-web）。
2. 目录骨架以 `scripts/env.sh` 为真源：`/opt/chains/chainmaker`（CM_ROOT）、`/opt/fisco`（nodes/nodes_expand/console/sdk）、`/opt/irita`（src/bin/cli-home/net）、`/opt/skytrust-nodes/fabric`（peer1 物料，如启用 4-peer 拓扑）。机器路径与 env.sh 不一致时改 env.sh 变量，**不要**在各处硬编码。
3. `source scripts/env.sh` 应无错并导出全部拓扑变量。

**门禁 G3**：`source scripts/env.sh && echo $CM_ROOT $IRITA_BIN $BACKEND_BIN` 输出正确路径。

## §4 建链（四链；细节照 migration §2-§3，此处只钉顺序与门禁）

按 `scripts/start-chains.sh` 的启动顺序建设：**FISCO → ChainMaker → Fabric → IRITA**。

1. **FISCO BCOS**：fisco-node 源码构建 v3.16.4 air 二进制；`build_chain.sh` 生成 4 节点（p2p 30300-30303 / rpc 20200-20203，group0，listen_ip=0.0.0.0）；节点目录落 `/opt/fisco/nodes*`（注意 node1-3 的 `start.sh` 硬依赖 `../fisco-bcos` 符号链接——env.sh FISCO_NODES 注释有登记）。
2. **ChainMaker**：v2.3.10 源码构建；证书/配置用 `prepare.sh` 生成——**首建直接生成 5-org 拓扑**（若所用 prepare.sh 版本支持 org 数参数；否则走 4-org 首建 + version-matrix §12.12 登记的 org5 链上扩容配方：trustroot/consensusnodeorg/consensusnodeid 三连 + 4-admin 多签，两者取一并在部署报告注明）。节点配置补 `rpc.max_send_msg_size/max_recv_msg_size: 200`（偏差 D21，防 gRPC 4MB/10MB 上限假 OFFLINE）。VM 引擎容器由 `start-chains.sh` 拉起——**挂载源目录先以当前用户 mkdir**（docker 会 root 建缺失目录 → 节点写失败，实测坑）。
3. **Fabric**：test-network `network.sh up --bft`（SMARTBFT 4-orderer，宿主口 7050/7052/7056/7058）→ 创建/加入 `mychannel` → 部署链码 `operator_business`（tar.gz 物料在 `contracts/fabric/`）。如需 4-peer 拓扑：peer1×2 按 version-matrix §12.12 配方生成物料落 `/opt/skytrust-nodes/fabric`，`scripts/run-peers-local.sh` 幂等拉起（宿主口 7061/9061；**绝不给 peer 加 vm.docker.hostConfig.ExtraHosts——cc 容器 DNS 污染实测坑**）。首建完成后 network.sh down 进入禁令（§0-2）。
4. **IRITA**：源码自持构建（commit `4c8c4c9`，构建物 sha256 对照 version-matrix §12.2 登记核对）→ 4-validator 配置（chain-id `skytrust-license`，timeout_commit=1s，rpc/p2p/grpc 全部保持 `127.0.0.1` 回环——单机全栈无需对外暴露，IRITA rpc 无鉴权）→ `scripts/start-irita.sh` 启动（无限额，§2 注）。

**门禁 G4（逐链健康探测，命令详表在 migration §5）**：
- FISCO：`curl` rpc `getNodeInfo`（group0）有响应
- CM：`cmc rpc GetBlockHeader --config sdk.yml` 出块；5 org 全探（12301-12305）
- Fabric：`docker exec cli peer channel list` 含 mychannel；peer0.org1/org2（如启用 peer1 一并）getinfo 高度一致
- IRITA：`start-irita.sh status` 4 节点 height 出数、catching_up=false
- 总门禁：`scripts/start-chains.sh` 输出 **ALL_CHAINS_UP**

## §5 合约部署（migration §4；部署 TxID 当场登记）

1. **CM 5 合约**（DOCKER_GO：audit_record、crosschain_trace、identity_mapping、regulatory_authorization、regulatory_record）：`scripts/deploy-contracts.sh` / cmc 部署；回执 JSON 落盘（对齐旧机 `deploy-*.json` 命名）。
2. **FISCO UavManagement**：console `sol2java` → deploy → CNS 注册名 `uav_management`（Java 17；console 挂死看 env.sh `fisco_console_cmd` 的 timeout 语义）。
3. **Fabric**：`operator_business` cc install/approve/commit（package ID 记入部署报告）。
4. **IRITA**：无合约工件（内置 `record` 模块）；写入**启用锚点 record**，TxID 落 `net/ANCHOR_TXID.txt`。

**门禁 G5**：每链试调用一笔返回 receipt/status；**全部部署 TxID + 锚点 TxID 写入 `docs/version-matrix.md` TxID 登记表**（新机器新账本 = 新登记行；缺登记即流程未完成），并按 §0-6 提交。

## §6 后端

1. `source scripts/env.sh && scripts/build-backend-real.sh` → 输出 **BUILD_OK**（冻结依赖断言 + go vet；CGO_ENABLED=1 -tags realchains）。裸机资源足，无需旧机的 `-p=2 GOGC=50` 妥协参数（脚本内已按环境处理，勿手改冻结断言）。
2. `cp services/skytrust-backend/.env.example services/skytrust-backend/.env`，逐变量按本机真实路径填写。高危核对项：
   - `CHAINMAKER_CA_CERT_FILE` 必须指向 trust-roots **目录**（SDK readdir 加载全部 .crt，指文件必失败）
   - CM client1 四件证书（tls.crt/tls.key/sign.crt/sign.key）路径与实际 org 命名一致（.env.example 基线是 `wx-org.chainmaker.org`/`trust-roots-solo`，按你首建的实际拓扑改）
   - `CHAINMAKER_TLS_HOST_NAME=chainmaker.org`、`FABRIC_TLS_HOST_NAME=peer0.org1.example.com` 保持默认（单机 localhost 拓扑无需改 /etc/hosts）
   - Fabric 三证书变量是仓库相对路径——同版本仓库原地可用
   - `FISCO_ACCOUNT_KEYSTORE` 指向 console 实际生成的账户 pem；`IRITA_CLI_BIN`/`IRITA_CLI_HOME`/`IRITA_KEY_NAME=skytrust-biz` 按 §4-4 建链产物填写（cli-home 里必须先 `irita keys add skytrust-biz --keyring-backend test`）
   - `CHAINMAKER_NODE_LIST`/`FABRIC_NODE_LIST` 配全量枚举（浏览器四链泳道计数用）
3. `scripts/start-backend-real.sh` → 自检 `POST /api/chain/status`。

**门禁 G6**：chain/status 返回 **4×ONLINE，count=4**。fail-fast 语义提醒：real 模式缺 transport 会启动即退、绝不静默回落 sim——这是诊断信息不是 bug，按 §9 排查。

## §7 前端

`PORT=15001 BACKEND=http://127.0.0.1:8080 ./scripts/serve-frontend.sh`（生产统一入口；开发备用 8090）。后端无 CORS——前端必须走同源代理，禁止 file:// 直开页面。

**门禁 G7**：`operator.html`/`authority.html`/`regulator.html` + 浏览器首屏 HTTP 可达；经代理 `POST /api/health/ping` 返回 `code=0`。

## §8 验收与收尾登记

1. `scripts/run-acceptance.sh` **五项全绿**（migration §6.5）。
2. 隔离预演：`./scripts/verify-three-portals-story.sh`（自带 :18080/:18090 隔离 sim，硬拒生产口，安全）。
3. 人工演示验收：`docs/acceptance-manual.md`（按三条研制目标分章、每步五要素）——是否实走由用户定，agent 把彩排登记行留给用户。
4. （可选，用户点头再做）gchain 管理平台：cm_db（根 `docker-compose.yml`，密码环境变量注入）+ gchain-back 源码构建 :9999 + gchain-web——配方 version-matrix §10，官方 compose 弃用（D14/D19）。
5. **收尾登记**：`docs/version-matrix.md` 追加「新机部署登记」节：机器规格、四链版本/拓扑、全部 TxID、验收五项结果与延迟实测、部署期偏差项；按 §0-6 提交。
6. 交付部署报告给用户：各门禁证据（命令+输出摘录）、遗留问题清单、密钥物料存放位置（路径即可，**不含内容**）。

## §9 故障速查索引（先查这里，再查 deployment.md §4.10 坑表）

| 症状 | 首查 |
|---|---|
| 后端启动即退 | fail-fast 设计：real transport 未注册 / .env 路径错（migration §5-④ 有逐字错误对照） |
| CM OFFLINE 但节点在跑 | CA_CERT_FILE 是否目录；gRPC 消息上限（D21：chainmaker.yml `rpc.max_send_msg_size: 200`；后端 transport.go 已带 100MB 客户端配置，核对代码版本） |
| CM 合约执行失败 | VM 引擎容器：`docker logs VM-GO-*`；挂载目录属主是否 root（§4-2 坑） |
| Fabric 高度不一致/gossip 不通 | peer 容器日志 `peers went online`；peer1 物料与 mychannel.block（§12.12 验证链） |
| IRITA /status 挂起或全组断链 | 裸机无限额下先查整机 load 与 `node$i.log`；历史断链机理=内存回收风暴（限额时代，§12.12）——若复现说明机器资源不达标，回 §1 核查并报告 |
| IRITA 出块高度含大量空块 | 预期行为（create_empty_blocks=true，~4-5 万块/日，§12.5 登记）；注意日志/磁盘轮转 |
| FISCO console 无响应 | Java 版本；`fisco_console_cmd` 的 timeout -k 语义（env.sh） |
| chain/status 某链 intermittent | 探活是 TCP+业务双层——先看 start-chains.sh 的 port_up 三点采样，再看业务探测 |

## §10 完成定义（DoD）

- [ ] G3-G7 门禁全过 + ALL_CHAINS_UP + 4×ONLINE
- [ ] run-acceptance.sh 五项 PASS + verify-three-portals-story.sh 通过
- [ ] TxID 登记 + 新机部署登记节写入 version-matrix.md 并已提交（含 trailer）
- [ ] `.env` 与 /opt 物料权限收敛（600/700），git status 无密钥类未跟踪文件被误 stage
- [ ] 部署报告交付用户
