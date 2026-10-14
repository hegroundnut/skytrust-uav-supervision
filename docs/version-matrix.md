# docs/version-matrix.md — 真实三链部署版本矩阵 / TxID 登记 / 性能实录（工作包 A 交付物）

> 依据：`docs/real-chain-migration.md` §1.3（端口核定回填）、§4.4（部署 TxID 登记表）、
> §6.5-⑤（真实链 p95 重测记录）。本文件为部署环境的**权威实测记录**——所有值均为
> 部署期实际核验结果，非参考默认值。首次部署完成日期：2026-09-17。
>
> 安全红线（§5-④）：真实证书、私钥、数据库密码和生产地址**不入本文件、不入 Git**——
> 运行环境一律经 `services/skytrust-backend/.env`（.gitignore 覆盖）注入；
> 本文件只记录路径与端口等非敏感事实。

---

## 1. 部署主机与工具链（实测）

| 项 | 实测值 | 备注 |
|---|---|---|
| OS | Debian GNU/Linux 11.3（glibc 2.31） | 内核 5.10.0-15-amd64 |
| CPU / 内存 | 2 vCPU / 1740 MB 总量 + 2048 MB swap | **低于指南 §1.2 建议的 8-16GB**——三链+后端可稳定运行（实测）；gchain 管理平台于 2026-09-17 借助 swap 在本机部署（MySQL 5.7 容器 + Go 管理后端 + vite 构建，见 §10），叠加后 §6.5-⑤ 复测 p95=623ms 仍达标 |
| Docker / Compose | 29.5.3 / v5.1.4 | Fabric CA/peer/orderer/chaincode 容器、ChainMaker docker-go 合约 VM |
| Go | go1.25.14 linux/amd64（/usr/local/go） | 后端 module 要求 go 1.25.0 ✓；`GOTOOLCHAIN=auto`、`GOPROXY=https://goproxy.cn,direct` |
| Java | OpenJDK 17.0.20.1（/opt/jdk17） | FISCO Console v3.8.0（JVM `-Xmx384m`） |
| C/C++ | gcc（Debian 11 默认）+ `CGO_ENABLED=1` | FISCO go-sdk cgo 依赖 `/usr/local/lib/libbcos-c-sdk.so`（已安装 ✓） |
| 构建约束 | `GOFLAGS=-p=2 GOGC=50` | 低内存主机并发/GC 限制 |
| 代理 | http://127.0.0.1:7890（clash，按需用） | 仅部署下载期使用；链上通信全部本机回环 |

## 2. 子模块指针与部署二进制版本（实测）

| 子模块 | git describe | commit（日期） | 部署形态 |
|---|---|---|---|
| `platforms/chainmaker/chainmaker-go` | v2.3.10 | 140a76ef4（2026-09-02） | solo 节点（wx-org.chainmaker.org / chain1），docker-go 合约运行时；`cmc` v2.3.10（/opt/chains/chainmaker/bin/cmc） |
| `platforms/fabric-samples` | v2.4.0-215-g134c582 | 134c582（2026-09-08） | test-network（mychannel，etcdraft，Org1+Org2）；peer/orderer 为**源码静态构建**二进制（`peer version` = latest / development build / go1.26.4），链码跑 dev 容器 |
| `platforms/fisco-node` | v3.17.0（源码指针） | fec58e693（2026-08-24） | **运行节点二进制 v3.16.4**（Build 20260114，commit fb90450）——节点 v3.x 与 Console v3.8.0 / go-sdk v3.0.2 同主版本 ✓（指南 §2.3-1 满足；指针与二进制差异见 §8-D13） |
| `platforms/fisco-console` | v3.8.0-2-gfc2a37b | fc2a37b（2024-10-08） | /opt/fisco/console（sol 编译/部署/BFS 注册/查询） |
| `platforms/fisco-bcos`（go-sdk） | v3.0.2-2-g50bbbee | 50bbbee（2024-12-25） | 后端 `github.com/FISCO-BCOS/go-sdk/v3 v3.0.2` |
| `platforms/gchain-back` | 9fa9ef7 | 2025-11-21 | **已部署**（2026-09-17）：`src` 编译二进制（67MB）运行于 /opt/chains/gchain/bin（:9999）；chainmaker SDK 依赖线与 v2.3.10 节点兼容（指南 §2.3-2 核对完成，chain1 订阅全量同步成功，见 §10） |
| `platforms/gchain-web` | d0fc0f1 | 2026-08-15 | **已部署**（2026-09-17）：`vite build` 产物经 `vite preview` 服务（:4173，`/chainmaker` 代理→9999）；构建偏差见 §8-D20 |

## 3. 后端 SDK 依赖（`services/skytrust-backend/go.mod`，realchains 构建）

冻结依赖**零升级**核验通过（go 1.25.0、gin v1.12.0、gorm v1.31.2、glebarez/sqlite v1.11.0、
gmsm v0.44.1 逐字未动）。`-tags realchains` 新增直接依赖：

| 模块 | 版本 | 用途 |
|---|---|---|
| `chainmaker.org/chainmaker/sdk-go/v2` | v2.4.0 | 监管链传输（节点 v2.3.10，SDK 向后兼容实测 ✓） |
| `chainmaker.org/chainmaker/pb-go/v2` | v2.4.0 | 长安链 pb 类型 |
| `github.com/FISCO-BCOS/go-sdk/v3` | v3.0.2 | 管理链传输（cgo + libbcos-c-sdk） |
| `github.com/ethereum/go-ethereum` | v1.13.10 | FISCO go-sdk 的 common/abi/ethereum 类型 |
| `github.com/hyperledger/fabric-gateway` | v1.12.1 | 运营链传输 |
| `github.com/hyperledger/fabric-protos-go-apiv2` | v0.3.7 | Fabric pb 类型（**无独立 protos 包**，Payload/ChannelHeader 等在 common） |
| `google.golang.org/grpc` | v1.83.2（协调升级） | fabric-gateway v1.12.1 要求 |
| `google.golang.org/protobuf` | v1.36.12（协调升级） | 同上 |
| `cloud.google.com/go` | v0.110.10（协调升级） | 消除 chainmaker sdk-go→tidb 测试依赖链的 compute/metadata 二义（v0.93.3 嵌套路径问题） |

构建命令（指南 §6.4-2）：
```bash
CGO_ENABLED=1 GOFLAGS=-p=2 GOGC=50 go build -tags realchains -o /tmp/server-realchains ./cmd/server
```
hermetic 测试门（无 tag）：`go test ./... -count=1` → **全部 ok、零失败**（realchains 文件被
build tag 排除，315 用例基线零影响，指南 §5-① 满足）。

## 4. 端口矩阵（§1.3「部署时核定」列回填——全部实测 LISTEN）

| 健康检查对象 | 实测端口 | 证据 |
|---|---|---|
| ChainMaker 节点 RPC | **12301**（TLS，tls_host_name=chainmaker.org）；p2p 11301 | `ss -tlnp` chainmaker 进程；sdk.yml node_addr 127.0.0.1:12301 |
| Fabric orderer | **7050**（客户端 TLS）；7053（osnadmin） | docker-proxy LISTEN |
| Fabric peer0.org1 / peer0.org2 | **7051** / 9051 | 同上 |
| FISCO BCOS 节点 | **20200**（channel/RPC，SSL）；p2p 30300 | `ss -tlnp` fisco-bcos 进程 |
| crosschain-gateway / uav-business / offchain（单进程） | **8080**（仓库固化） | `SERVER_ADDR` 默认；实测 LISTEN |
| 数据库 | SQLite（`data/skytrust-real.db`，仓库固化形态）；MySQL **3306**（容器 cm_db / chainmaker_dev，仅 gchain 用） | `.env` DB_PATH；cm_db 为官方 mysql:5.7 镜像（§8-D19） |
| gchain-back 管理后端 | **9999**（API 单入口 `POST /chainmaker?cmb=*`） | `ss -tlnp`；Login/UploadFile/ImportCert/SubscribeChain/GetBlockList 实测 |
| gchain-web 监管前端 | **4173**（vite preview；`/chainmaker` 代理→127.0.0.1:9999） | index 200；登录与链注册全流程经代理实测 |

三链状态自检：`POST /api/chain/status` → 三链全 **ONLINE**（真实 `Health()` 探测：
ChainMaker `GetCurrentBlockHeight`、Fabric `qscc.GetChainInfo`、FISCO `GetBlockNumber`）。

## 5. §4.4 部署 TxID 登记表（回填完成——全部链上可查询，验收 §6.5-②  PASS）

操作者：root（Claude Code 部署会话）。权威回执文件：`/opt/chains/chainmaker/{deploy,upgrade,upgrade2}-*.json`、
FISCO console `getTransactionReceipt`、Fabric qscc。工作稿底账：`/opt/chains/txid-registry.md`。

| 链 | 合约 | 部署工具 | deploy TxID | 区块高度 | 操作者 | 时间 |
|---|---|---|---|---|---|---|
| chainmaker | regulatory_record（v1.0.0→1.0.1→**1.0.2**） | cmc docker-go | v1.0.0 `18d5df9867ee27feca8c90c83c22fa9e38e1c55462e044a8a99c930dde147909`；v1.0.1 `18d5e0359418cff4ca41ac27d3f4b68fbf22df76021f4da8b33190439679ac15`；**v1.0.2 `18d60243cccc93c6ca621b7b246fd1846cadca2994a645d786491c1f80b013a6`** | 2 → **30** | root | 2026-09-16/17 |
| chainmaker | crosschain_trace（同上三版） | cmc docker-go | v1.0.0 `18d5dfa0189b7e89ca72fe14263491a3529bfd727cde4b96b2f797d9819d18a6`；v1.0.1 `18d5e0362b885803caf94e127f5a5a498577a62da5544e449c534fd8657c6d0e`；**v1.0.2 `18d602446c190c5cca8bc5f2cd5036a3f09cc0402c6d4486878b679bddf4e71b`** | **31** | root | 同上 |
| chainmaker | identity_mapping | cmc docker-go | v1.0.0 `18d5dfa09a8d19a7ca9331896a688413894c01c2c0114fd3b45384892c026623`；v1.0.1 `18d5e036b94d433dca3c4a5537fefd531de394a847334156b6c28970eb3f5989`；**v1.0.2 `18d6024523b4c949ca277fdbfc95d22fc0d31b7c908247918e5a717081cf41e9`** | **32** | root | 同上 |
| chainmaker | regulatory_authorization | cmc docker-go | v1.0.0 `18d5dfa11563fe03ca5a2f682b2ef0d58f0f9bb50c6e463295c466d1e419c315`；v1.0.1 `18d5e0376c0cba18ca93e15961aa935d262b4f4bfade4c34b1cf39a075ce287b`；**v1.0.2 `18d60245fd86414aca165a1fd2f1a408c6a40f1dfca243f09254271cf6b195b1`** | **33** | root | 同上 |
| chainmaker | audit_record | cmc docker-go | v1.0.0 `18d5dfa19cd30045ca42bde5b10953fac506be959dc24f5a883c6aa0e12e72d0`；v1.0.1 `18d5e03819fe95dbcad7efa0d5acb000ff866f52d42d46dabf5ffae48e2a461d`；**v1.0.2 `18d602470e0412eaca47143af577d42b1428925c83054e8ba105e51dc06d64c9`** | **34** | root | 同上 |
| fabric | operator_business（v1.0, sequence 1，含部署期 QueryState） | peer lifecycle commit | `9f59ca68bb8f51fddcd6aa098f90251d6541a2a6b2184fa1cf8ae73e27dc760a`（部署冒烟 invoke `704ae9119be532d7888d2daae27061714152be33403e1c4fd903be715ba35b5e`） | 5（冒烟 6） | root | 2026-09-16 |
| fisco-bcos | uav_management（BFS 名 `/apps/uav_management`；初次部署 `0x75fb1c77…`→`0x6849f21d…` 已被最终版取代） | Console deploy（sol 自动编译） | **最终 `0x7ab040267bb7b8fba57b503981f2add36fd684716a06bd1ec36ed7dff4c31fd2` → 合约地址 `0x6546c3571f17858ea45575e7c6457dad03e53dbb`** | 7 | root | 2026-09-17 |

链上复核（2026-09-17，验收 §6.5-②）：
- ChainMaker 5 笔 v1.0.2 TxID `cmc query tx` 全部命中（block 30-34，`UPGRADE_CONTRACT`，
  result.code=0 SUCCESS，CONTRACT_VERSION=1.0.2 逐一对应）；
- Fabric 2 笔经 `qscc GetBlockByTxID` 返回完整区块（exit 0，~13KB）；
- FISCO 最终部署笔 console `getTransactionReceipt`：block 7、status 0、
  contractAddress=0x6546c357…、statusOK=true。

合约版本演进说明：ChainMaker v1.0.1（SDK API 适配 + stateKey 消毒）、v1.0.2（QueryState 读方法）
与 Fabric/FISCO 的 QueryState 均为**部署期合约演进**（指南 §5-② 授权），后端调用面
（6 写方法名/参数键）零改动。

## 6. 真实链性能实录（验收 §6.5-⑤——p95 重测，链侧调优，协议/业务代码零改动）

### 6.1 逐跳探针（`internal/chainadapter/real/latency_probe_test.go`，realchains tag，不进 hermetic 门）

CROSSCHAIN_LOOP 单次 Send = 7 个链上写跳（与 gateway.go 步 3-12 逐字一致）。调优前后对比（每跳 5 次取均值）：

| 跳 | 调优前 | 调优后 | 调优动作 |
|---|---|---|---|
| fabric.CrosschainSubmit（步3） | 2074ms | **172ms** | 通道配置更新：BatchTimeout 2s→0.1s |
| chainmaker.RegisterReceive（步7） | 25ms | 26ms | 无需调优 |
| chainmaker.VerifyCredential（步8） | 27ms | 23ms | 无需调优 |
| chainmaker.RegisterRelay（步9） | 51ms | 22ms | 无需调优 |
| fisco.SubmitApplication（步10） | 424ms | **85ms** | 节点 config.ini `min_seal_time` 500→100ms |
| chainmaker.RegisterReceipt（步11） | 28ms | 26ms | 无需调优 |
| fabric.CrosschainAck（步12） | 2033ms | **138ms** | 同 BatchTimeout |
| **合计** | **4665ms** | **495ms** | |

链侧调优明细（均为指南 §6.5-⑤ 授权的「出块间隔/连接池/重试参数」类操作）：
1. **Fabric**：mychannel 在位配置更新（`peer channel fetch config` → 修改
   `/Channel/Orderer/BatchTimeout=0.1s` → configtxlator 差分 → **OrdererMSP Admin 签名**
   （/Channel/Orderer 的 Admins 隐式策略=OrdererOrg 多数派，应用组织签名不满足——实测踩坑）
   → `peer channel update` 成功，链上复核 BatchTimeout=0.1s）。**不重建通道**——§5 表内
   TxID 必须在册可查。
2. **FISCO**：`/opt/fisco/nodes/127.0.0.1/node0/config.ini` `[consensus] min_seal_time=100`
   （原 500；备份 /tmp/fisco-config.ini.bak），节点重启，数据/BFS/合约无损。
3. ChainMaker solo 出块本身 ~25ms/写，未调。

### 6.2 正式验收度量（与 tc1_test.go:209 TestTC1_08 同构入口）

`POST /api/experiment/run {"experiment_type":"CROSSCHAIN_LOOP","count":100}`（真实三链，2026-09-17 14:55）：

| 指标 | 实测 | 门槛 | 判定 |
|---|---|---|---|
| status | DONE | DONE | ✓ |
| success_count / count | **100 / 100** | 全成 | ✓ |
| success_rate | 1 | 1 | ✓ |
| failed_count / failure_reasons | 0 / `{}` | 0 | ✓ |
| avg_latency_ms | 505.04 | — | 记录 |
| p50_latency_ms | 503 | — | 记录 |
| **p95_latency_ms** | **527** | **< 1000** | **✓ PASS** |
| max_latency_ms | 650 | — | 记录 |

RUN-db871f2ecea5（EXP-20260917-f3df2d），总耗时 50.6s。**hermetic 低时延契约（chains.go:16-20
仿真时延）未参与本度量**——数据全部来自真实链上交易。

### 6.3 业务全流程实录（验收 §6.5-③④，真实链）

demo/init → mission/create（MISSION-2026-001）→ mission/submit → review/submit → pass/issue（PASS-2026-001 VALID），
三笔跨链全部 SUCCESS、四段 TxID 齐全且经链上工具复核存在：

| cross_tx_id | 消息 | 路径 | status | latency | 链上复核 |
|---|---|---|---|---|---|
| CX-b14a571f41be | MISSION_APPLICATION | fabric→fisco-bcos | SUCCESS | 2420ms（调优前） | CM reg_receive block 40 Success ✓；FISCO source block 15 status 0 ✓ |
| CX-2e7f906c1adc | MISSION_REVIEW_RESULT | fisco-bcos→fabric | SUCCESS | 2374ms（调优前） | 四段齐全（/api/crosschain/query）✓ |
| CX-e60e7e0dc8d0 | FLIGHT_PASS | fisco-bcos→fabric | SUCCESS | 2363ms（调优前） | fabric target 6881e171… qscc 命中 ✓ |

负例语义契约（transport.go:12，realchains 探针 TestRealNegativePaths 实测）：
FISCO 真·空串 revert → **Status=16、error=nil**（console 无法表达空串参数，唯真实传输可验）；
ChainMaker 业务失败 → Status=1、error=nil；QueryState 无值键 → 非 nil error。
即「任何一跳失败不得 SUCCESS」在真实链上成立（确定性业务失败不重试、置 FAILED）。

## 7. 运行环境与启动基线（.env 键清单——值不入库）

`services/skytrust-backend/.env`（gitignore ✓，`git check-ignore` 核验）键集合：
`CHAIN_MODE=real`、`SERVER_ADDR`、`DB_PATH=data/skytrust-real.db`、`SM9_KEY_DIR`；
ChainMaker：`CHAINMAKER_RPC_URL/CHAIN_ID/ORG_ID/USER_KEY_FILE/USER_CERT_FILE/USER_SIGN_KEY_FILE/USER_SIGN_CERT_FILE/CA_CERT_FILE/TLS_HOST_NAME`；
Fabric：`FABRIC_PEER_ENDPOINT/MSP_ID/CHANNEL_NAME/CERT_PATH/KEY_PATH/TLS_CERT_PATH/TLS_HOST_NAME`；
FISCO：`FISCO_RPC_URL/GROUP_ID/CA_CERT_PATH/SDK_CERT_PATH/SDK_KEY_PATH/ACCOUNT_KEYSTORE/CONTRACT_CNS_NAME`。
可提交基线模板见 `services/skytrust-backend/.env.example`。一键脚本见 `scripts/`（§9）。

## 8. 偏差与踩坑记录（部署实况 vs 指南/参考文档——全部已按指南授权路径处置）

| # | 偏差 | 处置 |
|---|---|---|
| D1 | ChainMaker 部署为 **solo 单组织**（wx-org.chainmaker.org），非 4 组织联盟 | 部署环境资源约束；监管链语义（四写留痕）不受影响，验收全过 |
| D2 | 节点 chainmaker-go v2.3.10 vs 后端 SDK sdk-go/v2 **v2.4.0** | SDK 向后兼容实测通过（全部部署/升级/查询/业务交易成功） |
| D3 | 指南 §5-② 骨架 API 名 `CreateTxRequest` → SDK v2.4.0 实名 **`GetTxRequest`** | 指南授权「编译前核对 API 名」；语义一致 |
| D4 | fabric-gateway **v1.12.1** API 漂移 ×6：`NewPrivateKeySign` 收 crypto.PrivateKey（先 `identity.PrivateKeyFromPEM`）；`Connect` 收 `identity.Identity`（`identity.NewX509Identity(mspID,cert)`，骨架 `WithIdentity` 选项已不存在）；`Endorse()` 无参；`commit.StatusWithContext(ctx)` 返回纯结构体 `*Status`（骨架 `commit.Result()` 不存在）；`EvaluateWithContext` 实参经 `client.WithArguments(...)`；fabric-protos-go-apiv2 v0.3.7 **无 protos 包**（Payload/ChannelHeader 在 common） | 全部按实际版本适配，语义不变；已在 realfabric 包注释逐条记录 |
| D5 | ChainMaker 双证书对（TLS 对 + 签名对，cert/privkey 分离模式） | 新增可选 env `CHAINMAKER_USER_SIGN_KEY_FILE/SIGN_CERT_FILE`（对应 sdk.yml user_sign_* 语义）；未提供时 SDK 以 TLS 对兼签 |
| D6 | `CHAINMAKER_CA_CERT_FILE` 必须是**信任根目录**（SDK conn_pool 对路径 readdir） | 传目录 /opt/chains/chainmaker/trust-roots-solo；传单文件报 not a directory（realchainmaker 注释已记录） |
| D7 | cmc upgrade 旗标为 **`--runtime-type DOCKER_GO`**（无 `--vm-type`） | 脚本已改 |
| D8 | FISCO v3 无 CNS——等价机制为 **BFS**（`/apps/uav_management`，precompile 0x100e Readlink） | realfisco 构造期解析；BFS 名为稳定句柄，合约重部署仅重指链接 |
| D9 | `FISCO_GROUP_ID=group0`（参考基线写 1；v3 air 形态实名 group0） | .env 按实测 group0 |
| D10 | Console v3.8.0 调用语法：`start.sh <groupID>`（**交互式**，命令走 stdin）；call 形式 `call /apps/<name> <func> <params>` 或 `call <name> <addr> <func> <params>`；**空串参数无法经 console 表达** | 冒烟/负例分别经 console 与真实传输验证 |
| D11 | 三链合约部署期各补充只读 **QueryState**（指南 §5-② 授权演进；FISCO 因此重部署并重指 BFS） | 后端调用面零改动；FISCO 最终部署笔见 §5 表 |
| D12 | `go mod tidy` 连带 `cloud.google.com/go` 升 v0.110.10（chainmaker sdk-go→tidb 测试依赖二义） | 冻结四项依赖核验未动；hermetic 门全绿 |
| D13 | fisco-node 子模块指针 v3.17.0（源码）vs 运行二进制 **v3.16.4** | 二进制为 v3 发行线，与 Console/go-sdk 同主版本（指南 §2.3-1 满足）；指针未回退（子模块管理规则：仅版本负责人可动） |
| D14 | **gchain 管理平台初未部署**（1740MB 内存预算）；核心验收通过后于 2026-09-17 在本机借助 swap 部署（见 §10） | 核心验收（§6.5 五项）不依赖 gchain；部署后 §6.5-⑤ 复测 ×5 全 PASS（RUN-36238a7936fb，p95=623ms），链侧无退化 |
| D15 | Fabric qscc `GetBlockNumberByTxID` 被通道策略拒（Unmapped policy）| 部署期核验改用 `GetBlockByTxID`（后端传输即用此方法，不受影响） |
| D18 | 本环境 peer/qscc（fabric-samples latest，3.x 线）`GetBlockByTxID` 实参签名为 `(channel, txID)`——仅传 txID 报 `missing 3rd argument` | 部署核验命令统一带 channel 实参（`scripts/run-acceptance.sh` ② / `scripts/deploy-contracts.sh` fabric 冒烟已按此实现）；后端传输走 fabric-gateway Evaluate 直调 qscc，实参构造独立、不受影响 |
| D16 | Fabric peer/orderer 为源码静态构建（Version: latest, development build, go1.26.4），非官方发行镜像 | test-network 以本机二进制 + docker 容器混合形态运行，实测稳定 |
| D17 | Fabric 通道 BatchTimeout 经**在位配置更新**调至 0.1s（签名方=OrdererMSP Admin，非应用组织）；FISCO min_seal_time 调至 100ms | §6.5-⑤ 授权链侧调优；配置备份 /tmp/fisco-config.ini.bak、/tmp/cfg*.json；协议与业务代码零改动 |
| D19 | gchain docker-compose 钉 mysql:8.0.29（hub-dev 镜像）；本环境分类器拦截第三方 registry 镜像，且 hub-dev 未缓存 mysql | 改用**官方本地镜像 mysql:5.7**（容器 cm_db，`--innodb-buffer-pool-size=64M --performance-schema=OFF`）；gorm 迁移 23 表全绿，管理后端业务 SQL 无 8.0 专属语法 |
| D20 | gchain-web 源码快照自带类型缺陷（裸 `SizeType` 无 antd 依赖、TS6133/TS2322/TS2304），`npm run build` 的 `tsc -b` 必败；绕 tsc 后 lightningcss 对源 CSS 畸形 `@keyframes` 报错，且 vite 8（rolldown）不附带 esbuild、`cssMinify:'esbuild'` 不可用 | 构建改 `vite build` + 外部配置 `cssMinify:false`（esbuild 剥类型、CSS 不压缩——管理控制台可接受）；子模块源码零改动 |
| D21 | 管理平台以 `withRWSet:true` 回放历史块；验收压测块 RW 集峰值 15.8MB > 节点 subscribe 服务缺省 10MB gRPC 上限 → ResourceExhausted 断流、同步卡块 1 | 节点 chainmaker.yml 增 `rpc.max_send_msg_size/max_recv_msg_size: 200`（v2.3 官方模板本有此二键，本部署模板缺失）；优雅重启节点后 0..1369 全量入库 |
| D22 | gchain 登录协议：`Login` 的 Password 字段须传**明文 MD5 hex**（种子哈希 = sha256(salt-md5hex(config password))，登录侧比对 sha256(salt-<字段值>)）；图形验证码答案仅存服务端内存 | 脚本化验证 = 取验证码 PNG 目读四字符 + 同会话 cookie 提交；常规使用经 web 前端正常交互 |

## 9. 一键脚本（scripts/，工作包 A/C 交付物——已交付并于 2026-09-17 实测验证）

| 脚本 | 作用 |
|---|---|
| `scripts/env.sh` | 公共环境（路径/端口/证书位置变量 + fabric_env_org{1,2}/fisco_console_cmd/port_up 工具函数），被其余脚本 source ✓实测 |
| `scripts/start-chains.sh` | 依序启动/核验三链（幂等：已运行则跳过），端口 + 真实 RPC 双层探活（cmc/peer/console）✓实测（热跳过 + 全冷启动往返；CM 节点经 setsid 脱离脚本会话，脚本退出/被杀不牵连节点） |
| `scripts/stop-chains.sh` | 依序优雅停止三链（docker stop / 端口 PID 检测停 CM 节点 / FISCO stop.sh；**绝不** network.sh down 等破坏性清理）✓实测（全停后端口清零） |
| `scripts/build-backend-real.sh` | 以 `-tags realchains`（CGO_ENABLED=1）构建后端 + vet + 冻结依赖核对 ✓实测 |
| `scripts/start-backend-real.sh` | 按 PID 停旧进程、载入 `.env` 启动、`/api/chain/status` 三链 ONLINE 自检 ✓实测（冷重启后） |
| `scripts/deploy-contracts.sh` | 三链合约部署/升级一键入口（chainmaker-{build,deploy,upgrade} / fabric / fisco / all；命令与部署实况逐字一致；本环境已部署、重跑按「已存在」拒绝属预期保护） |
| `scripts/seed-demo-data.sh` | `POST /api/demo/init`（重复 init 容忍并打印响应）✓实测 |
| `scripts/probe-latency.sh` | 逐跳延迟探针 + 语义契约负例（realchains test，§6.5-⑤ 度量工具）✓实测（7 跳 avg 合计 592ms，双负例契约成立） |
| `scripts/run-acceptance.sh` | §6.5 五项验收一键复测（①-⑤ 全项，TxID 常量源本文件 §5）✓实测两轮：×100 全 PASS（RUN-ed4aa68d5e82，p95=536ms）；stop→冷启动→后端重启后 ×5 全 PASS（p95=590ms） |

（指南 §3.2 允许「脚本名称可按实现调整」；Windows PowerShell 形态未提供——部署环境为 Linux。）

## 10. gchain 管理平台部署实录（ChainMaker 管理后端 v2.4.0 线 + Web，2026-09-17）

| 组件 | 形态 | 端口 | 实测证据 |
|---|---|---|---|
| 管理后端 | `platforms/gchain-back`（9fa9ef7）`src` 编译二进制；运行目录 /opt/chains/gchain（configs 中 db host→127.0.0.1） | 9999 | gorm 迁移全绿；`Login`（admin，D22）/`GetChainList` 实测 |
| MySQL | 官方 mysql:5.7 容器 cm_db（卷 cm_db_data；D19） | 3306 | chainmaker_dev 23 表 |
| Web | `platforms/gchain-web`（d0fc0f1）`vite build`（D20）产物 + `vite preview` | 4173 | index 200；登录/传证/订阅全流程经 `/chainmaker` 代理实测 |

链订阅与监控（permissionedWithCert）：`UploadFile`（表单字段 `File`）上传 wx-org 根 CA
（ca.crt/ca.key）与 admin1 sign/tls 四件套换取 upload key → `ImportCert`（Type=0 组织 /
Type=2 用户；Algorithm=1 ECDSA；CaType=0 单 CA；证书字段收 upload key 而非 PEM 原文）→
`SubscribeChain`（chain1 / 127.0.0.1:12301 / TlsHostName=chainmaker.org）成功。同步初因
D21 卡块 1；节点 rpc 尺寸上限修复后 **0..1369 全量入库**，`GetContractList` 见五合约
v1.0.2（与 §5 登记一致），`GetTxList`/`GetBlockList` 可用（`PageNum` 0 起始）。

叠加栈验收：`COUNT=5 ./scripts/run-acceptance.sh` → **ACCEPTANCE_ALL_PASS**
（RUN-36238a7936fb，success 5/5，p95=623ms < 1000ms）。

## 11. 新机部署登记 —— 2026-10-12（47.97.154.110，阿里云 ECS 2C/7.2G，Ubuntu 24.04）

> 本节为**新机全量登记**（Phase 0-B 完整交付）；§1-§10 为老机 2026-09-17 证据，一字未动。
> 过程实录与设计修订：`docs/superpowers/specs/2026-10-12-skytrust-local-fullstack-deployment-design.md` 修订 1-7。

### 11.1 三链拓扑（用户要求：每链足够节点确保不可篡改——全部 4 节点 BFT，f=1 已实证）

| 链 | 共识 | 节点 | f=1 容错实证 |
|---|---|---|---|
| FISCO BCOS 管理链（group0，v3.16.4，非国密） | PBFT 4-sealer | /opt/fisco/nodes/127.0.0.1/node0 + nodes_expand/node{1,2,3} | ✅（修订 3：kill 1 节点仍出块） |
| ChainMaker 监管链（chain1，v2.3.10，tjfoc ecc_p256） | TBFT 4 组织（wx-org1..4，3/4 quorum） | /opt/chains/chainmaker，RPC :12301，VM 引擎容器 ×4 | ✅（合约 4-admin 联签部署） |
| Fabric 运营链（mychannel，3.1.5 线 dev 构建二进制） | **SMARTBFT 4-orderer**（orderer..orderer4，:7050/7052/7056/7058）+ 2 peer | test-network compose-bft | ✅（修订 6：停 orderer3 → 块 8 签名 [2 4 1] 仍提交；恢复 → 块 10 签名 [2 3 1]） |

后端 :8080（pid 1316977 起）三链 `MODE=real`，前端统一入口 :15001。**Fabric 特别说明**：首拉为
etcdraft 单 orderer（real 已通），后经用户批准 A 方案（一次性豁免 "never network.sh down" 红线，
该链 TxID 当时未登记）重建为 BFT——etcdraft 期账本（块 0-12）及其中间 TxID（commit `bc6585f2…`/
冒烟 `cca5a04d…`）**作废不登记**，以下为 BFT 链正式值。

### 11.2 §4.4 部署 TxID 登记表（新机值——全部链上可查询，验收 §6.5-② 复跑 PASS 2026-10-12）

| 链 | 合约 | 部署工具 | deploy TxID | 区块 | 时间 |
|---|---|---|---|---|---|
| chainmaker | regulatory_record v1.0.2（DOCKER_GO，4-admin 联签，4 endorser） | cmc | `18ddbdb2e2d74146ca85e66d84982bdec19cae39bb3d4c049fe891e2f865f6f7` | 2 | 2026-10-12 |
| chainmaker | crosschain_trace v1.0.2 | cmc | `18ddbdbac8807d54ca981081b661d357a0d62fa1d06c4512ac43694eb8fd3c01` | 3 | 同上 |
| chainmaker | identity_mapping v1.0.2 | cmc | `18ddbe2aed734463cad462e16028baefd8c26bd1b5b94eb3b8b4e56c945d575b` | 4 | 同上 |
| chainmaker | regulatory_authorization v1.0.2 | cmc | `18ddbea6c52c057aca0efba4696ed886227bd67259194a34b9b2d0e1e6bdb051` | 5 | 同上 |
| chainmaker | audit_record v1.0.2 | cmc | `18ddbf15a5758e9ccafdb095f3f7a3efa59d367fba1744afb12bf6204063340e` | 6 | 同上 |
| fabric（BFT 链） | operator_business v1.0 seq1（Org1+Org2 approve） | peer lifecycle | commit `d165208cd7414aa6df463ec1fa6b8d5ef6f5b86ebefe472736080fd394678479`；冒烟 `2208bb13c9b43e62df184cb89fc3f4cb0723d5d413fa2843448069a5da96fbc1` + `aab373ca109faad8a9a3be5624dd2eee8f7fdce12a2b042b2b29cba78f88745b`（QueryState 读回=VALID 证明） | 5（冒烟 6/7） | 2026-10-12 |
| fisco-bcos | UavManagement（BFS `/apps/uav_management`） | console deploy（solc 0.8.11） | `0x172514d300b6e148a3b1630bb5c1dd7a85f038ff3ac10d720bc957ba9e2e76af` → 合约地址 `0x6849f21d1e455e9f0712b1e99fa4fcd23758e8f1`（deploylog.txt；地址由字节码确定，与老机中间态一致=源码同一性旁证） | 1 | 2026-10-12 |

CM 部署核验以**链上区块 rwset 为准**（4/5 cmc 回执 0 字节 = `--sync-result` 挂起缺陷，修订 4）。
Fabric BFT 每块含 3/4 consenter 签名（orderer 日志 `signatures from [2 3 1]`）= quorum 链上实证。

### 11.3 验收复跑（run-acceptance.sh，隔离 :18180 全新弃用 DB，2026-10-12 22:26-23:08）

- **① PASS**：三链 ONLINE（真实 Health 探针）。
- **② PASS**：上表 8 笔 TxID 全部链上可查询（CM×5 cmc query tx；Fabric×2 qscc GetBlockByTxID——BFT 链上命中；FISCO×1 RPC 块 1 完整交易体包含证明）。
- **③ PASS**：13 步闭环三笔全 SUCCESS——CX-f48cf7b7be53（1410ms）/CX-86e21686d6ae（1301ms）/CX-8767547c53a6。
- **④ PASS**：两跳四段 TxID 持久化齐全（src=真实 fabric 64-hex / fisco 0x…，reg/relay=CM 18dd…，tgt 各异）。
- **⑤ 未达标（如实记录，链侧调优已穷尽，协议/业务代码零放宽）**：
  - COUNT=100 于 load 46.77 触发 2 核机负载红线**主动中止**（机器保护优先；中止后三链健康核查全绿：FISCO height 81/sealer 4/零 viewchange，CM height 290 探针 OK，:8080 三链 ONLINE）；
  - COUNT=10 两次：RUN-a9ccd7a45955 success **10/10** rate=1 avg 1294ms p95 **1524ms**；RUN-fd7ee6965720 success **10/10** avg 1487ms p95 **1658ms**——均 > 1000ms 门槛；
  - 逐跳探针（latency_probe_test.go，7 跳 ×5 迭代全实链）：fabric 80-128ms ×2、**chainmaker ~218-253ms ×4（合计 ~960ms，主导项）**、fisco 182-195ms；合计 1309-1473ms；
  - 根因：2 核 CPU 上 12 个 BFT 共识进程（4 TBFT+4 SMARTBFT+4 PBFT，用户要求的不可篡改拓扑）持续互争；老机 §6.2 官方记录（p95=527ms @COUNT=100）系较轻拓扑（CM solo + 单 orderer，6 进程）下取得，**继续作为正式性能证据**；
  - 已执行的链侧调优（§6.5-⑤ 授权类）：FISCO `min_seal_time` 500→100（备份 config.ini.bak-sealtime ×4）；CM `batch_create_timeout` 50→10（备份 chainmaker.yml.bak-batchtime ×4，滚动重启，探针合计 1473→1309ms）；Fabric SMARTBFT 原生 RequestBatchMaxInterval=50ms（无需调优，修订 5 遗留的 BatchTimeout 2s 调优项作废）。

### 11.4 新机偏差记录（补充 §8）

1. **FISCO v3.16 JSON-RPC 怪癖**：`getBlockByNumber` 在 (onlyHeader=true, onlyTxHash=false) 下**忽略 blockNumber 恒返块 1** 但含完整交易体（部署 Tx 恰在块 1 → 可作包含证明）；(false,…) 组合交易列表恒空；`getTransactionReceipt` 对链上有效交易恒报 3008。console 因 libproviders.so 缺失彻底不可用 → **curl JSON-RPC + 节点日志为一等诊断工具**（heartBeat connected count / getSealerList / getSyncStatus 正常可用）。
2. **Fabric dev 构建 CLI**（老机同源二进制，修订 5 详录）：invoke 不打印 `Transaction ID:`（deploy-contracts.sh 冒烟假阴性——**链上实际成功**，块 6 解码证实）；`peer channel fetch latest` 非法（只收数字）；qscc GetChainInfo 返 protobuf。权威旁证 = orderer `writing block`（SMARTBFT 含签名者集合）+ peer `Committed block` + configtxlator 解码 + QueryState 读回。
3. **ChainMaker SDK gRPC 4MB 默认上限**：5 合约部署后 GetCurrentBlockHeight 响应 7.9MB → ResourceExhausted 假 OFFLINE；transport.go 已加 WithRPCClientConfig(100MB)（唯一后端代码改动，对齐 cmc sdk.yml）。
4. **cmc**：`--enable-cert-hash=false` 必须显式；block-by-height 高度为位置参数；`--sdk-conf-path`（非 --sdk-conf）。
5. **负载红线实证两次**（修订 4 并行构建 load 85 事故；本次 COUNT=100 load 46.77 主动中止）：2 核机重活必须串行，load>4 停手。

### 11.5 全实链重放证据（13 步跨域网关，三链全 real）

- BFT 切换前（etcdraft，修订 5）：CX-54edb4488520 / CX-0847fefe2b6c；
- **BFT 链正式重放（修订 6，登记用）**：UAV_REGISTER_PROOF `CX-5862df45d53b`（fabric 源 `a419036a…`，CM 两跳 `18ddcd32…`×3，verify PASS，1468ms）；MISSION_APPLICATION `CX-31c266ebb9b2`（fabric 源 `4c5b3ba5…`，CM 中继 `18ddcd33…`，FISCO 目标 `0x261cc523…`，verify PASS，1231ms）；链高齐涨 CM+9/FISCO+1/Fabric+4。

## 12. 第四链（证照链 IRITA）部署登记与四链验收 —— 2026-10-13/14（§11 同机四链化）

> 本节为**追加登记**；§1-§11 一字未动（其中「三链」字样为 2026-10-12 时点事实，历史证据不改写）。
> 设计权威 `docs/superpowers/specs/2026-10-13-fourth-chain-license-explorer-design.md`；
> 实施计划与校准实录 `docs/superpowers/plans/2026-10-13-fourth-chain-license-explorer.md`。

### 12.1 四链拓扑总表（验收要求①「至少 3 种异构链」——现 4 链，每链多节点 BFT，f=1 全实证）

| 链 | 角色 | 平台/版本 | 共识 | 节点 | f=1 容错实证 |
|---|---|---|---|---|---|
| ChainMaker | 监管链（跨链中继不可绕过） | v2.3.10 | TBFT 4 组织（3/4 quorum） | 4 | §11.1（4-admin 联签部署） |
| Fabric | 运营链 | 3.1.5 线 dev 构建 | SMARTBFT 4-orderer + 2 peer | 4+2 | §11.1（停 orderer3 仍提交） |
| FISCO BCOS | 管理链（审核裁决） | v3.16.4 | PBFT 4-sealer | 4 | §11.1（kill 1 节点仍出块） |
| **IRITA（本节新增）** | **证照链（飞行通行证签发/吊销源链）** | **v4.0.0（SM2 国密原生）** | Tendermint BFT 4-validator（f=1） | 4 | §12.4（滚动重启 ×3 链不停摆） |

商密证据链更硬一层：IRITA 链本体即 **SM2 两层原生**——共识层 `node_key`/`priv_validator_key`
type=`tendermint/PrivKeySm2`；账户层验证人 X.509 证书曲线 OID `1.2.156.10197.1.301` + 签名
`SM2withSM3`，keyring 公钥 `/cosmos.crypto.sm2.PubKey`——叠加后端 SM3 摘要 / SM9 签名加密跨链层。

### 12.2 IRITA 平台身份与源码自持（新机重建配方完整）

- 来源 `https://github.com/bianjieai/irita`，tag **v4.0.0**，commit **4c8c4c9**；`make build`（ldflags 注入 algo.Algo=sm2）。
- 二进制 sha256 **`c93be88cbf7f3d19bca33c97ffefe62b481d457d4c6ee2dcdb7915a81ee3e0aa`**（`/opt/irita/bin/irita`，2026-10-14 复核吻合）。
- 源码自持 `/opt/irita-src`（用户裁定⑨：不加第 4 个 git submodule）；PoC 证据与产线配置脚本在 `/opt/irita/{poc-artifacts,rewrite_configs_prod.py}`。
- 网络：chain-id `skytrust-license`，denom uirita、零 fee；节点 `/opt/irita/net/node{0..3}`，rpc 127.0.0.1:26657/26667/26677/26687，p2p 26656+10i；timeout_commit=1s（实测出块 ~1.45-1.5s，空块 ~1.5-2.4s）。
- 业务账户 `skytrust-biz`（SM2，keyring test backend，CLI HOME=`/opt/irita/cli-home`），注资 1000 IRITA：txhash `73E80A03910352B3CAE48CEED28EABF8C35B33F2CA55BC37882D1D6BCBCF2FDC`。
- **无合约工件、无部署交易**：证照登记走 IRITA 内置 `record` 模块（逻辑合约），权威说明 `contracts/irita/README.md`。
- 上游维护停滞（2024-06 后无更新）风险处置：锁 tag + sha256 登记 + 源码自持——与三链版本矩阵同一实践。

### 12.3 启用锚点（§4.4 登记表证照链行——链上可查询，验收 §6.5-② 四链化 PASS）

| 链 | 工件 | TxID | 区块 | 时间 |
|---|---|---|---|---|
| irita | record 启用锚点（record_id `9939a8aa6a67e43aadc9fcc93f6d2655fb25d5990e138257e65638e1d436f173`） | `8FD32506345441825A5398BE2CC06F4664F7F3A934A53B4647603CB14681B08A` | 822 | 2026-10-13 14:32 |

锚点材料 SM3 摘要 `2676c21a7c00f11d575d3f8602063387898fd761cff25928ad084b1bccea5464`
（`/opt/irita/net/ANCHOR_DIGEST.txt`）。2026-10-14 15:2x 经 TM RPC `/tx?hash=0x…` 复核仍
code=0 可验（Task 14 实弹）——账本永不复位（P6-R6 同源），此锚点即四链化 §6.5-② 的验收依据。

### 12.4 浸泡与 f=1 容错实证（6.2h，2026-10-13 14:50–21:06，soak-log 原始记录）

- 稳定出块：h 1590→15455，~1.5-2s/块（16:37–17:01 段实测 981 块/24min ≈ **1.47s/块**）；零宕机、零分叉、app_hash 全程一致、4 节点高度零落后。
- RSS 曲线：Gate-1 基线 145-178MB → 定态爬升 253-291MB。**GC 螺旋发现**：GOMEMLIMIT=280MiB 下 ~5-6h 堆触顶 → RSS 钉 280-291MB、单节点 CPU 37-44%、2 核机 load ~10（链健康无损，机器负载不可持续——处置即滚动重启）。
- **f=1 滚动重启实证 ×3（全程链不停摆，每节点重启期间 3/4 投票权在线、4/4 catching_up=false）**：

| 时间 | 触发 | 高度推进 | 效果 |
|---|---|---|---|
| 10-13 21:00–21:03 | GC 螺旋（load 10.6，用户裁决滚动重启） | h 15325→15343 持续出块 | RSS 291→166-172MB、load 10.6→2.65、生产 3×ONLINE 零影响 |
| 10-14 01:41–01:46 | RSS 271-274MB 越 270 阈值前置干预 | h 26349→26750 零中断 | RSS→146-165MB、available 974→1581MB |
| 10-14 15:1x | CPU 硬限整改（§12.5）限额重启 | 四节点一致恢复 ~1.45s/块 | cpu.max=30000/100000 ×4 核验 |

- 运维约定（已成文 `scripts/start-irita.sh` 头注）：RSS>270MB→滚动重启；实测/演示前必重启；滚动重启逐节点待同步完成再下一节点；重启窗口避生产高峰。

### 12.5 CPU 硬限整改（2026-10-14 生产事故，用户裁定 —— commit 3ba5e6a）

- 事故：01:46 生产后端 :8080 静默死亡；用户现场观察 = **IRITA 无 CPU 限制占满整机 CPU 拖死后端**（与当晚 ⑤ 负载风暴 load 峰 16→40→93 同源；fabric cc 容器风暴中优雅退出 → endorse「no combination of peers」空窗）。
- 整改：节点一律经 systemd-run 瞬态单元启动，**CPUQuota=30%/节点（4 节点舰队硬上限 1.2 核 / 物理 2 核）+ CPUWeight=80 + MemoryHigh=280M**；单元创建失败 = 启动失败（**绝不回退无限制启动**）。
- 验证：cpu.max=30000/100000 ×4；出块 ~1.45s/块不变；RSS 174-196MB。
- **保护效果实证**（§12.6 两轮正式验收期间）：⑤ 风暴 load 峰 ≤8.3（整改前 40-93）、fabric cc 容器零死亡、生产 :8080 两轮全程无恙（4×ONLINE、RSS 43MB）。
- 隔夜事实登记：create_empty_blocks=true 空块 ~1.5-2.4s/块，12h +~21000 块（28896→49900，**~40-50k 块/日**）——**四端浏览器显示的证照链块高含空块**，数值偏大且增长快属预期；账本连续、时间戳与真实时间吻合、无业务含义（磁盘/巡检注意项）。

### 12.6 四链正式验收（run-acceptance.sh v2 四链化，隔离 :18180 全新弃用 DB，real 四链，2026-10-14 ×2 轮）

| 项 | Run 1 | Run 2 |
|---|---|---|
| ① 四链 ONLINE | PASS（4/4） | PASS（4/4） |
| ② §4.4 部署 TxID 链上可查询 | PASS（**9/9**：CM×5 + fabric×2 + fisco 块1包含证明 + IRITA 锚点 @h=822 code=0） | PASS（9/9） |
| ③ 13 步闭环（四链化：签发源段上 IRITA） | PASS：MISSION-2026-001 → PASS-2026-001 VALID；**CX3 源段 `04CE57AF…999A` IRITA 链上核验 code=0** | PASS：MISSION-2026-002 → PASS-2026-002 VALID；CX3 源段 `DB2D79A6…0F47` 链上核验 code=0 |
| ④ 两跳四段 TxID 持久化 ×3 | PASS（src/reg/relay/tgt 全齐全 SUCCESS） | PASS |
| ⑤ CROSSCHAIN_LOOP ×10，p95<1000ms | **FAIL 如实**：9/10 rate=0.9（2001×1），avg 18959.6ms，p50 **1572ms**，p95=max **88155ms** | **FAIL 如实**：9/10 rate=0.9（2001×1），avg 17349.8ms，p50 **1700ms**，p95=max **103931ms** |

- ⑤ 两轮唯一受害者同型：**ChainMaker SDK gRPC「connections unavailable」停滞 76-95s**（Run1 = reg relay submit 76439ms；Run2 = reg receive submit 95125ms）→ 该迭代 2001。**不放宽协议、不钓鱼重试**（R13 裁定：正式记录 = ①-④ PASS ×2 + ⑤ 如实双记）。
- 下一杠杆（§6.5 授权调优类）：CM SDK 连接池/keepalive 专项调优，或 CM 容器 CPU 配额——需专项窗口。
- 性能证据谱系（全部如实、不互相顶替）：老机 §6.2 **p95=527ms@COUNT=100 仍为正式性能证据**（较轻拓扑）；新机三链时代 §11.3 rate=1 ×2（p95 1524/1658ms）；本节四链双轮 rate=0.9 ×2（p50 1572/1700ms）。
- 证据留档：`/tmp/acceptance-four-chain-final.log`、`/tmp/acceptance-four-chain-final-run2.log`、`/tmp/acceptance-four-chain-final/{server.log,skytrust.db,sm9}`。

### 12.7 逐跳探针与签发延迟（四链化 8 跳）

- `probe-latency.sh`（2026-10-14 15:4x，PROBE_OK）：8 跳 avg 合计 **3241ms**（≈ 单次 13 步 Send 期望时延）；其中 irita.CrosschainSubmit（证照链源步，record 模块）avg **1498ms**（迭代 1164-1636ms）。负路径全如实：fisco revert Status=16（tx `0x8c4f58f2…`）、CM business fail Status=1（tx `18de557e…`）、fisco/CM QueryState absent → error。
- pass/issue 签发全链（**irita→chainmaker→fabric**）：Task 12 实测 3972 / 4977 / 4690ms；正式验收样本 **4532ms**（Run1 `CX-3ba993d6d400`）/ **4278ms**（Run2 `CX-e77d690c4930`）——全部落在 timeout_commit=1s 档 3-6s 预期档内。

### 12.8 2005 能力降级实弹（errcode.ChainUnsupportedFeature，Task 4 校准自旧编号 5003）

- fisco-bcos `explorer/blocks` + `explorer/block` → **code=2005**「该链 RPC 不支持区块列表查询/块详情查询」——如实降级绝不拼造（v3.16 怪癖见 §12.9-5）。
- irita / chainmaker / fabric explorer 各路径 code=0 真数据；`explorer/overview` chains=4。

### 12.9 偏差登记（补充 §8 / §11.4——四链化增量，全部已按授权路径处置）

1. **IRITA 维护停滞锁 tag**：v4.0.0 + sha256 + 源码 /opt 自持（部署期决定，见 §12.2）。
2. **CM/IRITA CLI shell-out**：`cmc query tx` / `irita tx record create` 走 exec.CommandContext——SDK 缺口的既定实现方式（spec §5 登记）。
3. **C16 断代**：CM batch 配置调整史造成的块高断代语义（§11.4 同源，四链期维持）。
4. **双身份过渡**：审批 `FISCO-ADMIN`（管理链角色）/ 签发·吊销 `REGISTRY-ADMIN`（证照链角色）——四方分权语义（申请→审批→签发→验证），旧签发身份不迁移。
5. **fisco 区块浏览降级 → 2005**：v3.16 `getBlockByNumber` 忽略块号恒回块 1、`getTransactionByHash` 对不存在 TxID 回 -32601、`getTransactionReceipt` 恒 3008（§11.4-1 怪癖的浏览器侧后果；§12.8 实弹证明）。
6. **ui.js legacy tag 不显新链**：index.html 旧壳心跳仍 3 盏（冻结资产 additive-only 约束）；四门户壳（portal.js）心跳 4 盏含 IRITA。
7. **timeout_commit=1s、实测出块 ~1.45-1.5s/块**（空块 ~1.5-2.4s）——出块即延迟下限，签发 3-6s 档由此而来。
8. **D2 校准**：real 传输返回**链原生 TxID**（irita = 裸 64hex 大写 txhash；`IRITA-` 前缀为 sim 工件，real 不拼前缀）。
9. **D3 校准**：`cmc query tx` 对不存在 TxID 打印错误文本但 exit=0——验收脚本②收紧为 JSON 内含判据（`i>=0`），杜绝空过。
10. **⑤ 负载风暴机制**：2 核/20 BFT 进程机上 CROSSCHAIN_LOOP ×10 自触发风暴（无限制期 load 16→40→93；fabric cc 容器优雅退出 → endorse 空窗 = 失败直接机制）；IRITA CPU 硬限后风暴收敛（load ≤8.3、cc 零死亡），残余受害者 = CM SDK gRPC 停滞（§12.6）。
11. **IRITA 隔夜空块增长 ~40-50k 块/日**：磁盘与巡检注意项；浏览器块高注记见 §12.5。

### 12.10 生产切换记录（Task 13，用户单独确认「四链切换重启」—— 2026-10-14 15:17:24）

- :8080 由三链二进制切换为**四链 real 二进制**（HEAD 3ba5e6a 构建；BUILD_OK：冻结依赖断言 5/5 + go vet clean），新 pid 137676；启动自检 4×ONLINE；四门户（operator/authority/regulator/license-center）+ :15001 代理全 200；只读冒烟（explorer/overview chains=4、pass/list）通过。
- 切换窗口**零业务写 = 零断代**：生产 DB 业务表本为空（仅 2026-10-12 种子 7 架 UAV）。验收产物 PASS-2026-001/002 存在于隔离 /tmp DB（证据留档，见 §12.6）——生产演示数据由前端 `demo/init` 灌注；`verify-three-portals-story.sh` 剧情固定值 PASS-2026-002 系隔离 sim 复跑自动生成，与生产 DB 无关。
- 旧三链二进制保留 `bin/server-realchains.bak-task5`（如实命名：Task 5 时点备份）；回退路径未动用。

### 12.11 FISCO 块浏览可用性复核与实装（§11.4-①/§12.8/§12.9-5 怪癖复核 —— 2026-10-14，用户裁定「需要变成可用」）

- **再诊断**：§11.4-① 登记的块查询怪癖**仅存在于 JSON-RPC curl 面**——该面复核另见 `getTransactionByHash` 方法缺失（-32601）、`getBlockHashByNumber` 恒回创世哈希、`getBlockByNumber` 忽略块号、收据查询恒 3008；四节点（:20200-20203）行为一致，系软件面行为而非单节点故障。
- **SDK 通道完全可用**：go-sdk v3.0.2（后端 QueryTx/SubmitTx 一直在用的 websocket 通道）实测——`GetBlockByNumber(100/1/181)` 按号回真实数据（唯一哈希/毫秒时间戳/sealer 索引）；`(onlyHeader=false, onlyTxHash=true)` 回交易哈希列表（块 1 永含部署 Tx `0x172514d3…`，账本不可变）；`GetBlockHashByNumber(100)` 与块哈希互证一致；`TransactionReceipt(部署Tx)` → blockNumber=1 status=0（§11.4-① 的 3008 亦仅 curl 面）。
- **实装**：`real/fisco/transport.go` `GetBlockByHeight`/`ListRecentBlocks` 由 2005 桩改为 SDK 实查（Time=链上毫秒时间戳归一 timex；Proposer=sealerList[sealer] nodeID 原样；字段缺失如实留空绝不猜测）。TDD：`real/fisco_smoke_test.go`（realchains 标签、**只读**零链上写入）五项断言 RED→GREEN——高度回显（钉死「恒返块 1」不复存在）、块 1 含部署 Tx、块 0 拒绝、新→旧严格降序、limit≤0 防御。fisco `explorer/blocks`/`explorer/block` 自此 code=0 真实块；§12.8 的 2005 实弹记录随之成为历史（2005 哨兵保留为通用能力缺口，现四链无触发者）。
- **块 0 边界（无假数据红线）**：节点对 0 号返回**合成应答**（hash `0xdc19ce48…` ≠ 块 1 parentInfo 链上承诺的父哈希 `0x14acbcd6…`）——非账本数据；`GetBlockByHeight(0)` 显式拒绝、`ListRecentBlocks` 永不入列 0 号（与 irita 惯例一致；API 面 `binding:"required"` 本就挡 0）。
- **冻结面处置**：§11.4-① 原文一字不动，本节复核其适用范围（仅 curl 面）；`run-acceptance.sh` ② 的 `fisco_tx_in_block1` 包含证明仍走 JSON-RPC 面（怪癖在该面依旧成立、证明依旧有效），逻辑零改动仅注释加注。前端同步：chainview.js 降级卡移除 fisco 怪癖注记、explain.js 2005/explorer/block 词条、demo-script 第 9 章步骤 4 改「管理链实弹」。
- **生产切换**：:8080 四链二进制重启待用户确认窗口（生产进程红线），执行后本节追记。


---

*本文件与 `docs/real-chain-migration.md`（迁移指南）、`contracts/README.md`（合约权威索引）配套；
每次部署/升级/调优后回填并随代码提交（参考文档 §2.1 原则 4）。*
