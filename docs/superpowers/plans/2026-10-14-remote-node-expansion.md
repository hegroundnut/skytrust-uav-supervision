# 老机器节点扩容 Implementation Plan（ChainMaker wx-org5 + Fabric peer1×2）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在生产机（47.97.154.110）之外的老机器（121.41.54.226，2C/1.7GB）上为 ChainMaker 监管链扩 1 个共识组织节点（wx-org5，TBFT 4→5 org）、为 Fabric 运营链扩 2 个 peer（peer1.org1/peer1.org2，既有 org ⇒ 零通道配置变更），提升节点数与跨机容灾。

**Architecture:** 老机器先全停旧部署（迁移前旧栈+闲置 claude 进程，用户已裁定「全停含 claude」，只停不删）释放 ~1.3GB；镜像/二进制一律从生产机转移（digest 已证两机同 tag 不同构建）；Fabric 走 cryptogen extend + docker run + join mychannel + install cc；ChainMaker 走 chainmaker-cryptogen 生成 org5 + `cmc client chainconfig trustroot/consensusnodeorg/consensusnodeid add`（permissionedWithCert，4-admin 多签）+ 原生节点进程 + VM 引擎容器。

**Tech Stack:** Fabric peer v3.1.5（SMARTBFT 4-orderer 不动）、ChainMaker v2.3.10 TBFT（vm-engine v2.3.9）、cryptogen/configtxlator/cmc v2.3.10、docker。

**Spec:** 本计划即设计裁定记录——用户 AskUserQuestion 裁定（2026-10-14）：「3 节点全上」+「全停含 claude」；端口矩阵已在会话中呈报用户（老机器 inbound：11305/12305/7051/9051 ← 47.97.154.110/32；本机 inbound：11301-11304/12301-12304/7050,7052,7056,7058/7051,9051 ← 121.41.54.226/32）。

## Global Constraints

- **生产红线：** 本机 :8080/:15001 进程绝不触碰；唯一例外 = Task 5 的 .env 节点清单更新，需用户单独确认 ~5s 重启窗口。本机四链绝不做任何破坏性操作；扩节点只经正常链上配置交易（可回退：consensusnodeid delete）。
- **老机器只停不删：** 数据目录/旧账本全部保留（docker stop + `docker update --restart=no`，kill 进程）；绝不 rm 数据。
- **秘密红线：** ssh/sudo 密码 stdin-only 绝不落文件（ssh key 已装，后续免密）；证书/私钥只存两机 /opt 路径，绝不入 Git；仓库只进脚本/文档。
- **内存红线（老机器 1.7GB）：** chainmaker org5 `GOMEMLIMIT=450MiB`；peer 容器 `-m 350m` + `GOMEMLIMIT=280MiB`；VM 引擎容器 `-m 250m`。部署后 available<300MB 持续 → 触发回退（停 peer1.org2）并如实记录 ledger。
- **版本一致性：** fabric-peer:3.1.5 / ccenv:3.1 / baseos:3.1 / vm-engine:v2.3.9 / chainmaker 原生二进制全部从生产机 save/scp 转移（两机同 tag digest 已实测不同）。
- **冻结面：** go.mod/go.sum、api.Deps、冻结前端资产零改动；无 API 契约变更（endpoints.js/apifox 不涉及）。
- **提交：** 中文 conventional commit 直提 main + trailer `Co-Authored-By: Claude Code <noreply@anthropic.com>`；CLAUDE.md/contracts tarball/子模块噪声永不入库。
- **诚实数据：** 任何一步失败如实上报登记，绝不伪造同步/验证结果；version-matrix §1-§11 一字不动，新增只进 §12.12。

## Review Focus

1. **quorum 数学：** org5 加入后 TBFT 5-validator——老机器整机宕 → 本机 4/5 仍出块；本机单节点宕 → 3+1=4/5 仍出块。任何一步链上配置变更前后本机出块必须连续（height 前进）。
2. **WAN 断连自愈：** peer1/org5 与本机间断连后 gossip/p2p 自动重连补块，无需人工。
3. **TLS/SNI：** 两机 /etc/hosts 映射缺一 → 证书主机名校验失败；连不通先查 hosts。
4. **配置交易半途失败：** consensusnodeid/org/trustroot add 失败或 org5 行为异常 → 链上 delete 回退路径必须验证存在。
5. **内存尖峰：** 老机器合约执行（VM 引擎）/peer cc 容器瞬时 RSS；限额+swap 兜底+回退预案。

---

### Task 1: 老机器清理与就绪

**Files:** 老机器 `/etc/hosts`、`/opt/skytrust-nodes/`（骨架）；本机 `/etc/hosts`（sudo）

- [ ] **Step 1: 停旧栈（只停不删）**：docker stop 旧 orderer/peer0×2/dev-peer×2/VM-GO-wx-org-chain1/cm_db 并 `docker update --restart=no`；kill 原生 chainmaker solo、chainmaker-management、旧 backend server-realchains、旧 fisco 进程；kill 3 个闲置 claude 进程（用户裁定）。检查 systemd 自启单元并 disable（防重启复活）。
- [ ] **Step 2: 验证释放**：`free -m` available ≥ ~1.2GB；`ss -tln` 确认 7050/7051/9051/11301/12301/20200/8080/8090 已释放（7890 clash 保留）。
- [ ] **Step 3: hosts 双向**：老机器加 `47.97.154.110 orderer.example.com orderer2..4.example.com peer0.org1.example.com peer0.org2.example.com` + `121.41.54.226 peer1.org1.example.com peer1.org2.example.com`；本机（sudo）加 `121.41.54.226 peer1.org1.example.com peer1.org2.example.com`。
- [ ] **Step 4: 目录骨架**：老机器 mkdir -p /opt/skytrust-nodes/{fabric/{peer1.org1,peer1.org2},chainmaker/wx-org5.chainmaker.org}。
- [ ] **Step 5: 延迟基线**：两机互 ping ×5 记录均值（登记用）。

### Task 2: 镜像与二进制转移

- [ ] **Step 1:** 本机 `docker save hyperledger/fabric-peer:3.1.5 hyperledger/fabric-ccenv:3.1 hyperledger/fabric-baseos:3.1 hub-dev.cnbn.org.cn/chainmakerofficial/chainmaker-vm-engine:v2.3.9 | gzip | ssh root@121.41.54.226 'gunzip | docker load'`（~1.2GB，先查老机磁盘余量 ≥3G）。
- [ ] **Step 2:** scp 本机 `/opt/chains/chainmaker/chainmaker-go/bin/chainmaker` → 老机器 `/opt/skytrust-nodes/chainmaker/bin/`；两机 `docker image inspect --format {{.Id}}` 对比 4 镜像 digest 一致 + chainmaker 二进制 sha256 一致。
- [ ] **Step 3:** 老机器 tag 核对：fabric-peer:latest→3.1.5 同 digest（旧 latest 若不同则重打 tag 防误用）。

### Task 3: Fabric peer1.org1 / peer1.org2 部署

**Files:** 本机 test-network `organizations/cryptogen/crypto-config-org{1,2}.yaml`（Count 1→2，extend 用）；老机器 docker run 命令固化进 Task 5 脚本

- [ ] **Step 1: cryptogen extend**（本机 test-network 目录）：两 yaml `Count: 2` → `cryptogen extend --config ... --input organizations/peerOrganizations/orgX.example.com`；验证 peer1 材料生成且 **peer0 材料零变化**（extend 前快照 find -newer 对照 / sha256 抽查）。
- [ ] **Step 2:** scp peer1 材料（msp/tls 证书+私钥）+ `channel-artifacts/mychannel.block` + `contracts/fabric/operator_business_1.0.tar.gz` → 老机器对应目录（私钥 600 权限）。
- [ ] **Step 3: docker run peer1.org1**：`-m 350m --restart unless-stopped`，env：CORE_PEER_ID/ADDRESS=peer1.org1.example.com:7051、LISTENADDRESS=0.0.0.0:7051、CHAINCODEADDRESS/LISTENADDRESS=:7052、GOSSIP_EXTERNALENDPOINT=peer1.org1.example.com:7051、GOSSIP_BOOTSTRAP=peer0.org1.example.com:7051、TLS_ENABLED=true+证书路径、OPERATIONS_LISTENADDRESS=127.0.0.1:9444、GOMEMLIMIT=280MiB；peer1.org2 同理（9051/9052/9445、BOOTSTRAP=peer0.org2）。
- [ ] **Step 4: join mychannel**：容器内 `peer channel join -b mychannel.block`；`peer channel getinfo -c mychannel` 高度 → 与本机 peer0 高度对齐（追平容差 ±1，等待收敛）。
- [ ] **Step 5: gossip 验证**：peer1 日志无 TLS/handshake 错误；本机 peer0 日志出现 peer1 gossip 建连；`peer gossip` 状态或 channel getinfo 双侧一致。
- [ ] **Step 6: cc install + 查询**：peer1.org1 install operator_business_1.0.tar.gz → package id 与本机 querycommitted 一致；dev-peer 容器起（-m 由 peer env CORE_VM_DOCKER_HOSTCONFIG_MEMORY 尝试 150m，不支持则记录不限）；容器内 QueryState 读回 = VALID（与生产数据一致，只读查询）。peer1.org2 同。
- [ ] **Step 7:** 老机器 `free -m` 检查；available<300MB → 回退预案评估（记录 ledger）。

### Task 4: ChainMaker wx-org5 共识节点

**Files:** 本机 `/opt/chains/chainmaker/chainmaker-go/config/wx-org5.chainmaker.org/`（证书+配置母本，admin 私钥留本机备份）；老机器 `/opt/skytrust-nodes/chainmaker/`

- [ ] **Step 1: 取 chainmaker-cryptogen**：老机器 chainmaker:v2.3.10 镜像内 find/提取 → scp 本机（或代理下载同版本）；`--version` 验证 v2.3.x。
- [ ] **Step 2: 生成 org5 材料**（本机）：按 org1-4 同构 cryptogen 配置生成 wx-org5.chainmaker.org/{ca,node/consensus1,user/admin1}；org5 ca/ 目录补齐 org1-4 CA 证书（trust-roots-4org 来源）。
- [ ] **Step 3: 节点配置**：复制 org4 的 chainmaker.yml/bc1.yml/log.yml → org5 版：org_id/node_id 换、rpc 12305、p2p 11305、VM engine 22355、nodes 列表 = 本机 4 节点 47.97.154.110:1130{1..4} + 自身 121.41.54.226:11305、tls_host_name 按 org4 模式。
- [ ] **Step 4: 链上查询前置**：`cmc client chainconfig query` 读当前链配置（validator 4 节点、enable_trust_root_update 值、auth 策略）——**裁定点：** trust_root_update 禁用 → 先链上开启（4-admin 投票）；若开启路径受阻 → 回退方案 = 在 wx-org4 CA 下签发第二共识节点（consensusnodeid add 即可，无 trustroot/org 变更），ledger 记 Ruling。
- [ ] **Step 5: 链上三连**（本机 cmc，每步前后查本机 height 连续前进）：trustroot add org5 CA → consensusnodeorg add wx-org5（admin cert）→ consensusnodeid add org5 nodeID（地址 121.41.54.226:11305/12305）；4 org admin 逐一投票至生效；`chainconfig query` 复核 validator=5、org=5。
- [ ] **Step 6: 本机 trust 文件分发**：org5 CA crt 复制到本机 4 节点 `certs/ca/`（belt-and-braces；节点链上配置同步为准，无需重启本机节点——height 必须持续前进验证）。
- [ ] **Step 7: 老机器起节点**：VM 引擎容器 `docker run --network host -m 250m --restart unless-stopped --name VM-GO-wx-org5.chainmaker.org-chain1 <vm-engine> sleep infinity`；原生节点 `GOMEMLIMIT=450MiB setsid ./chainmaker start -c ../config/wx-org5.chainmaker.org/chainmaker.yml`（目录结构镜像本机布局）。
- [ ] **Step 8: 同步验证**：org5 日志无证书/TLS 错误；`cmc query`（org5 rpc 12305，经老机器本机 curl）块高追平本机；`cmc consensus validators` = 5；本机 height 持续前进（全程生产无感）。
- [ ] **Step 9: 回退路径验证（只读）**：确认 `consensusnodeid delete`/`trustroot delete` 子命令存在（--help），登记回退手册，不实际执行。

### Task 5: 运维固化 + 后端节点清单

**Files:** Create `scripts/start-remote-nodes.sh`（本机仓库）；Modify `services/skytrust-backend/.env`（不入库）

- [ ] **Step 1:** 写 `scripts/start-remote-nodes.sh {start|stop|status}`：ssh 老机器幂等拉起/停/查 3 节点（含限额 env），bash -n + node 无关；本机验证 status 输出。
- [ ] **Step 2:** `.env` 加 `CHAINMAKER_NODE_LIST`（org1-4 @127.0.0.1 + org5 @121.41.54.226:12305）与 `FABRIC_NODE_LIST`（peer0×2 本地 + peer1×2 远端，格式照 transport.go 注释）。
- [ ] **Step 3:** **用户确认 :8080 ~5s 重启窗口** → start-backend-real.sh → 自检 4×ONLINE → explorer/nodes chainmaker=5、fabric peer=4、source 列如实（static+probe）。

### Task 6: 验收与登记

- [ ] **Step 1: 容错演练（安全侧）**：老机器停 org5 → 本机链继续出块（height 前进，quorum 4/5）→ 恢复 org5 → 自动追块；记录前后 height。peer1.org1 停/恢复同（gossip 自愈）。
- [ ] **Step 2:** 生产门户目检指引（用户侧）：explorer/nodes 计数、块列表跨机一致。
- [ ] **Step 3:** version-matrix §12.12 登记（拓扑表更新注记、nodeID/证书指纹、端口矩阵、quorum 证据、内存限额、回退手册指针）；ledger 完成行；提交（plan + start-remote-nodes.sh + version-matrix，中文 conventional + trailer）。
