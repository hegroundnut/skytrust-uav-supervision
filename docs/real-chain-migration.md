# 真实三链迁移指南（real-chain migration playbook）

> **地位**：本文件是本仓库从 hermetic 原型切换到真实三链（长安链 ChainMaker + Hyperledger Fabric + FISCO BCOS）
> 部署的**权威迁移手册**（GC10 交付物白名单，Plan 6 Task 21）。后端代码中的迁移缝
> （`internal/chainadapter/transport.go`）与 fail-fast 错误文案均指向本文件。
>
> **三链角色**（与 `contracts/README.md` ① 一致）：监管链 = ChainMaker，运营链 = Fabric，管理链 = FISCO BCOS。
>
> **行号基线**：backend HEAD `a04a7d4`（定位请以符号名锚点为准，行号会随代码演进漂移）。
> 文中引用的「参考文档」指开发实施文档（磁盘可读、不入 git）；其 §2.1/§9.1/§11.2/§11.3 事实已只读转写入本文。

---

## §1 前置环境清单

### 1.1 现状声明（必读）

本仓库的开发环境为 **2026-09-13 硬探查实测：`CGO_ENABLED=0`、无 Docker、无 Java**。因此：

- hermetic 构建（后端全量测试门 `go test` 全包，315 PASS / 0 FAIL）**不携带任何链 SDK**——
  `services/skytrust-backend/go.mod` 直接依赖仅 4 项：
  `gin v1.12.0`、`gorm v1.31.2`、`glebarez/sqlite v1.11.0`、`emmansun/gmsm v0.44.1`（go 1.25.0）。
- 三链在 hermetic 环境一律走 inproc 仿真传输（`chainadapter/sim`），**绝不**静默冒充真实链。
- `CHAIN_MODE=real` 而未注册真实传输时，后端 fail-fast 显式报错（原文见 §6.3）。
- 真实三链部署必须在满足下表全部条件的环境中进行，与 hermetic 测试门物理隔离。

### 1.2 软硬件前置条件

| # | 条件 | 说明 |
|---|---|---|
| 1 | Docker Desktop（含 WSL2 后端） | ChainMaker Docker-Go 合约部署、Fabric test-network、MySQL/Redis 等基础设施均依赖容器运行时 |
| 2 | C/C++ 工具链 + `CGO_ENABLED=1` | Windows 下安装 MinGW-w64（gcc）。**FISCO BCOS go-sdk 需要 cgo**（签名/加密底层库），cgo 关闭则 FISCO 传输无法编译 |
| 3 | Java JDK（建议 14+） | FISCO BCOS Console v3.x 为 Java 程序（sol2java / deploy / CNS 注册均在 Console 中执行）；确切版本要求以 `platforms/fisco-console` 子模块 README 为准 |
| 4 | Go ≥ 1.25.0 | 后端 module（go 1.25.0）与 Fabric 链码独立 module（`skytrust-contracts/fabric`，go 1.25.0）一致 |
| 5 | 内存 8-16GB | 三链 + 容器基础设施 + gchain 管理平台同机启动的下限/推荐值 |
| 6 | 磁盘 ≥ 50GB 可用 | 链数据、容器镜像、子模块源码 |

### 1.3 端口矩阵（健康检查对象 × 端口）

参考文档 §11.3 规定启动完成后必须逐项健康检查的对象如下表。端口列中标注「平台默认」的，
部署时以 `docs/version-matrix.md`（工作包 A 交付物）核定后回填实际值——参考文档明确
「开发人员应在首次环境核验后补充实际端口」；标注「仓库固化」的，以本仓库代码为准。

| 健康检查对象（参考文档 §11.3 逐项） | 默认端口 | 依据 |
|---|---|---|
| 数据库健康（MySQL） | 3306 | 参考文档 §11.1 `DATABASE_URL=mysql://root:password@127.0.0.1:3306/skytrust` |
| ChainMaker 节点健康 | 12301（节点 RPC，平台默认） | chainmaker-go 默认单节点 RPC 端口，部署时核定 |
| Fabric peer/orderer 健康 | orderer 7050、peer0.org1 7051、peer0.org2 9051（平台默认） | fabric-samples test-network 默认端口，部署时核定 |
| FISCO BCOS 节点和群组健康 | RPC 20200、p2p/channel 30300（平台默认） | FISCO BCOS v3 默认端口，部署时核定 |
| gchain-back HTTP 健康 | 部署时核定 | 参考文档未固化，按其子模块 README/配置核定 |
| gchain-web 页面可访问 | 部署时核定 | 同上 |
| crosschain-gateway 健康（本后端进程内网关） | 8080（仓库固化） | `internal/config/config.go:29` `SERVER_ADDR` 默认 `:8080` |
| uav-business-service 健康（本后端进程内） | 8080（同上，单进程） | 同上 |
| offchain-network-service 健康（本后端进程内） | 8080（同上，单进程） | 同上 |
| 监管前端 API 可访问 | 部署时核定 | 业务前端经本后端 `/api` 路由访问 |

本后端三链状态自检入口：`POST /api/chain/status`（`internal/api/router.go:15`），
处理器逐链调用适配器 `Health()` 返回 ONLINE/OFFLINE（`internal/api/health_handler.go:108-120`）。

### 1.4 子模块清单（7 项，`.gitmodules` 逐字）

| 路径 | URL | 角色（参考文档 §4） |
|---|---|---|
| `platforms/gchain-back` | `https://gitee.com/rwolf07/gchain-back.git` | ChainMaker 管理后台后端 |
| `platforms/gchain-web` | `https://gitee.com/rwolf07/gchain-web.git` | ChainMaker 管理后台前端 |
| `platforms/fisco-bcos` | `https://github.com/FISCO-BCOS/go-sdk.git` | FISCO BCOS Go SDK |
| `platforms/fisco-console` | `https://github.com/FISCO-BCOS/console.git` | FISCO BCOS 控制台（编译/部署 Solidity） |
| `platforms/fisco-node` | `https://github.com/FISCO-BCOS/FISCO-BCOS.git` | FISCO BCOS 节点源码 |
| `platforms/fabric-samples` | `https://github.com/hyperledger/fabric-samples.git` | Fabric 示例网络与链码样例 |
| `platforms/chainmaker/chainmaker-go` | `https://git.chainmaker.org.cn/chainmaker/chainmaker-go.git` | ChainMaker 核心节点 |

初始化（参考文档 §2.2）：

```powershell
cd E:\workcode\skytrust-uav-supervision
git submodule sync --recursive
git submodule update --init --recursive
git submodule status
```

子模块管理规则（转写参考文档 §2.2）：总仓库只保存子模块指向的 commit；对外部仓库的修改必须在
对应子模块分支中完成并在总仓库更新指针。**禁止**把 `git submodule update --remote --merge`
作为日常更新方式——它会把子模块移动到远程最新提交、破坏团队环境一致性；只有版本负责人确认
兼容性后，才允许更新并提交新的子模块指针。

---

## §2 FISCO 版本对齐（部署前置硬条件）

### 2.1 现状：版本错配，**不得作为验收环境**

当前子模块状态（参考文档 §2 实测）：

| 子模块 | 角色 | 当前 tag | 目标 |
|---|---|---|---|
| `platforms/fisco-node` | 节点源码 | `v2.7.0-2853-gfec58e693` | **v3.x（必须升级）** |
| `platforms/fisco-console` | 控制台 | `v3.8.0-2-gfc2a37b` | v3.x（已满足） |
| `platforms/fisco-bcos` | Go SDK | `v3.0.2-2-g50bbbee` | v3.x（已满足） |

即 **Go SDK 3.x、Console 3.x、节点源码 2.x** 的错配组合。FISCO BCOS Console 官方要求
v3.x Console 与 v3.x 节点配套；本仓库 Solidity 合约 `pragma solidity ^0.8.0`（v3 形态）。
**版本未统一前部署会失败**；如暂时保留当前组合用于探索，必须在 README 标记「未经兼容性确认」，
不得作为验收环境。

### 2.2 核对命令（参考文档 §2.1，部署环境执行）

```powershell
cd E:\workcode\skytrust-uav-supervision

git -C platforms/fisco-bcos describe --tags --always
git -C platforms/fisco-console describe --tags --always
git -C platforms/fisco-node describe --tags --always
git -C platforms/chainmaker/chainmaker-go describe --tags --always
git -C platforms/gchain-back log -1 --oneline

Select-String -Path platforms/gchain-back/go.mod -Pattern "chainmaker"
Get-Content platforms/fisco-bcos/go.mod -TotalCount 80
```

### 2.3 版本处理原则（转写参考文档 §2.1，逐条）

1. **FISCO BCOS 节点、Console、Go SDK 必须使用同一主版本。** 推荐统一到 v3.x——
   即把 `platforms/fisco-node` 指针升级到 v3.x 发行线，与 Console v3.8.0 / go-sdk v3.0.2 配套。
2. **ChainMaker 节点版本必须与 `gchain-back` 的 SDK 依赖兼容。** **先读取
   `platforms/gchain-back/go.mod`**（其中 `chainmaker` 相关 require 即管理后台锁定的 SDK 版本），
   再决定 ChainMaker 节点版本——顺序不可颠倒。
3. **不要在业务代码中修改第三方子模块源码**来解决版本问题（仅底层缺陷修复例外：在独立分支修改，
   并记录上游 commit、修改原因和回滚方式）。
4. 版本调整完成后，**必须在总仓库提交子模块指针和 `docs/version-matrix.md`**。
5. 如果暂时保留当前版本用于探索，必须在 README 中标记为「未经兼容性确认」，不得作为验收环境。

---

## §3 逐链 bootstrap（启动顺序 × 命令清单 × 健康检查）

### 3.1 启动和初始化顺序（转写参考文档 §9.1，顺序固定）

```text
检查依赖
  → 加载环境变量
  → 启动数据库/缓存/消息服务
  → 启动 ChainMaker 监管链
  → 启动 Fabric 运营方链
  → 启动 FISCO BCOS 管理方链
  → 部署监管合约、运营方链码和 Solidity 合约
  → 启动 gchain-back
  → 启动 gchain-web
  → 启动自研业务服务
  → 初始化 Manufacturer/Operator/UAV/Route/Node/REG-01
  → 执行健康检查
```

要点：三链全部就绪并**完成合约部署**之后，才启动 gchain 管理平台与自研服务；
演示数据初始化（本后端 Seeder）在自研服务启动之后执行。注意 P6-R6：
**Seeder 绝不重置真实链**——真实链模式下 demo/reset 只清链下可重建数据，链上存证保留。

### 3.2 建议 PowerShell 执行顺序（转写参考文档 §11.2）

```powershell
cd E:\workcode\skytrust-uav-supervision

# 检查工具和子模块
.\scripts\check-prerequisites.ps1
git submodule update --init --recursive

# 启动基础设施
docker compose up -d

# 启动三条链
.\scripts\start-chainmaker.ps1
.\scripts\start-fabric.ps1
.\scripts\start-fisco.ps1

# 启动合约和链码
.\scripts\deploy-contracts.ps1

# 启动长安链管理平台
.\scripts\start-gchain.ps1

# 初始化演示数据
.\scripts\seed-demo-data.ps1

# 启动自研服务和前端
# 按各服务 README 中的端口启动
```

说明：`scripts/` 下各脚本为参考文档工作包 A/C 的交付物，**当前仓库尚未创建**（hermetic
仓库不依赖它们）；部署环境按上述清单落地为稳定入口，脚本名称可按实现调整，但必须提供
一键脚本或一键说明。环境变量基线见参考文档 §11.1（`.env.example` 至少含
`CHAINMAKER_RPC_URL`、`CHAINMAKER_CHAIN_ID=chain1`、`FABRIC_PROFILE_PATH`、
`FABRIC_CHANNEL_NAME`、`FISCO_RPC_URL`、`FISCO_GROUP_ID=1` 等；真实证书、私钥、数据库密码
和生产地址**不得提交 Git**）。本后端自有变量（`CHAIN_MODE` 等）见 §6。

### 3.3 健康检查（转写参考文档 §11.3）

启动完成后必须逐项检查（端口对照 §1.3 矩阵）：

```text
数据库健康
ChainMaker 节点健康
Fabric peer/orderer 健康
FISCO BCOS 节点和群组健康
gchain-back HTTP 健康
gchain-web 页面可访问
crosschain-gateway 健康
uav-business-service 健康
offchain-network-service 健康
监管前端 API 可访问
```

链级探测命令（部署环境常用形态）：

```bash
# ChainMaker：节点 RPC 探活（cmc 工具随 chainmaker-go 提供）
cmc client rpc call --chain-id chain1 --contract-name system-contract-chain-query \
  --method GetChainInfo --params '{}'

# Fabric：peer 探活
docker exec cli peer channel list          # 或 peer0 容器内执行
peer channel getinfo -c <channel-name>

# FISCO BCOS v3：节点/群组探活
curl -s http://127.0.0.1:20200/v1/getNodeInfo -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"getNodeInfo","params":["group0"],"id":1}'

# 本后端：三链状态（real 模式下逐链反映真实 Health()）
curl -s -X POST http://127.0.0.1:8080/api/chain/status
```

---

## §4 合约/链码部署（三链工件 → 各工具链步骤）

合约工件权威索引见 `contracts/README.md`。三链合约名与后端固化常量逐字一致：

| 链 | 合约名（= 后端 `SubmitTx` 的 contract 实参） | 常量出处 |
|---|---|---|
| ChainMaker 监管链 | `regulatory_record`、`crosschain_trace`、`identity_mapping`、`regulatory_authorization`、`audit_record` | `internal/crosschain/policy.go:69-74`（前三者）、`internal/regulatory/service.go:61-64`（后二者） |
| Fabric 运营链 | `operator_business` | `internal/crosschain/policy.go:69`（`ContractFabricOperator`） |
| FISCO 管理链 | `uav_management` | `internal/crosschain/policy.go:70`（`ContractFiscoManage`） |

### 4.1 ChainMaker 监管链（5 个 Docker-Go 合约，经 cmc/docker 部署）

> **部署实况更新（2026-09-17）**：本节原命令形态与 cmc v2.3.10 实际 CLI 存在漂移，
> 已按实测修正——入口约定为 `InitContract`/`InvokeContract` 方法对 + `main()`
> （contract-sdk-go v2.3.10 形态，**无** `//export` 注释）；cmc 子命令为
> `client contract user create|upgrade|invoke|get`；字节码经 py7zr 打 `.7z` 后由
> `--byte-code-path` 上传（**无需** `docker cp` 进节点容器）；`--runtime-type` 取
> 大写 `DOCKER_GO`；管理员签名材料用 `--admin-key-file-paths`/`--admin-crt-file-paths`/
> `--admin-org-ids`。逐字可执行版本见 `scripts/deploy-contracts.sh chainmaker-*` 与
> `contracts/chainmaker/README.md`「Docker-Go 部署」；偏差记录 `docs/version-matrix.md` §8。

源路径 `contracts/chainmaker/<name>/contract.go`（每合约独立目录，依赖
`chainmaker.org/chainmaker/contract-sdk-go/v2`）。对 5 个合约逐一执行：

```bash
# 1) 构建（脚手架目录含 go.mod；CGO_ENABLED=0 静态构建 + py7zr 打 7z）
#    然后管理员身份创建合约（实测全参数见 scripts/deploy-contracts.sh）
cmc client contract user create --chain-id chain1 --org-id <org-id> \
  --contract-name <name> --version 1.0.0 --runtime-type DOCKER_GO \
  --byte-code-path <build-dir>/<name>.7z --params '{}' \
  --sdk-conf-path <cmc-sdk-conf-path> \
  --admin-key-file-paths <admin1.sign.key> --admin-crt-file-paths <admin1.sign.crt> \
  --admin-org-ids <org-id> --sync-result --timeout 30

# 2) 校验合约已登记 / 交易回执可查（protobuf-JSON 省略零值：result.code 缺省即 SUCCESS）
cmc query tx <deploy-txid> --chain-id chain1 --sdk-conf-path <cmc-sdk-conf-path> \
  --with-rw-set=false --truncate-value=false

# 3) 试调读方法（写=user invoke，读=user get --result-to-string；QueryState 为 v1.0.2 通用读）
cmc client contract user get --chain-id chain1 --org-id <org-id> --contract-name <name> \
  --method QueryTrace --params '{"cross_tx_id":"<probe-cross-tx-id>","seq":"1"}' \
  --sdk-conf-path <cmc-sdk-conf-path> --result-to-string --timeout 30
```

`<name>` 依次取 `regulatory_record`、`crosschain_trace`、`identity_mapping`、
`regulatory_authorization`、`audit_record`——**必须与上表常量逐字一致**，后端白名单
（`internal/chainadapter/chainmaker` 适配器 `RegisteredContracts`）按同名校验。

### 4.2 Fabric 运营链（peer lifecycle：package → install → approve → commit）

链码源 `contracts/fabric/chaincode/main.go`（独立 Go module `skytrust-contracts/fabric`，
依赖 `github.com/hyperledger/fabric-contract-api-go v1.2.2`；仓库不提交半成品 go.sum，
部署期 `go mod tidy && go build` 实际解析为准）。

```bash
cd contracts/fabric

# 0) 部署期解析依赖并确认链码可编译
go mod tidy && go build ./chaincode

# 1) package —— 从含 go.mod 的 module 根执行；--path ./chaincode 在部署时确认
#    （链码 main 包位于 chaincode/ 子目录，打包路径必须相对 go.mod 所在目录）
peer lifecycle chaincode package operator_business.tar.gz \
  --path ./chaincode --lang golang --label operator_business_1.0

# 2) install（org1、org2 各 peer 分别执行）
peer lifecycle chaincode install operator_business.tar.gz
peer lifecycle chaincode queryinstalled

# 3) approve（每个组织一次；SEQUENCE 从 1 起）
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile <orderer-ca-path> --channelID <channel-name> --name operator_business \
  --version 1.0 --package-id <installed-package-id> --sequence 1

# 4) commit（双方 approve 后执行一次）
peer lifecycle chaincode checkcommitreadiness --channelID <channel-name> --name operator_business --version 1.0 --sequence 1
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile <orderer-ca-path> --channelID <channel-name> --name operator_business --version 1.0 --sequence 1 \
  --peerAddresses localhost:7051 --tlsRootCertFiles <org1-peer-tls-ca> \
  --peerAddresses localhost:9051 --tlsRootCertFiles <org2-peer-tls-ca>

# 5) 试调：chaincode 名必须为 operator_business（与后端白名单逐字一致）
peer chaincode query -C <channel-name> -n operator_business -c '{"function":"CrosschainSubmit","Args":["{}"]}'
```

**recordJSON 约定（迁移期传参契约，必须遵守）**：`operator_business` 链码的全部 6 个方法
（`CrosschainSubmit`、`CrosschainAck`、`SubmitApplication`、`RecordReview`、`RecordPass`、
`RecordPassRevoke`）签名统一接收单一 `recordJSON string` 参数；后端真实传输实现负责把
`SubmitTx` 的 `params map[string]any` **JSON 编码为该单一字符串实参**（见 §5-②）。
键集对照表见 `contracts/fabric/README.md`。

### 4.3 FISCO BCOS 管理链（Console：sol2java → deploy → CNS 注册）

合约源 `contracts/fisco/uav_management.sol`（`contract UavManagement`，`pragma solidity ^0.8.0`）。
**前置硬条件：§2 版本已统一到 v3.x。**

```bash
cd platforms/fisco-console

# 1) 拷贝合约源到 Console 的 contracts 目录后编译生成 Java 封装
#    （Console 命令：sol2java，输入 uav_management.sol）
# 2) 部署（Console deploy 命令，部署 UavManagement，构造参数按合约构造函数核对）
# 3) CNS 注册：将部署所得合约地址以 CNS 名 uav_management 注册——
#    后端按合约名 "uav_management"（policy.go:70 ContractFiscoManage）调用，
#    go-sdk 经 CNS 名解析地址；CNS 名必须与后端常量逐字一致。
# 4) 校验：经 Console 查询 CNS 列表确认 uav_management 可解析，
#    并对 SubmitApplication / CrosschainSubmit / CrosschainAck 各发一笔探测交易
#    （事件 SUBMITAPPLICATION / CROSSCHAINSUBMIT / CROSSCHAINACK 可在回执 logs 中核对）。
```

FISCO 回执语义：go-sdk 交易回执 `status == 0` 即链上执行成功，直接映射
`TxReceipt.Status == 0`（见 §5-②）。

### 4.4 部署 TxID 登记表（模板——部署时逐行回填）

每次部署/升级合约后，操作者将实际值回填本表并随 `docs/version-matrix.md` 一并提交
（参考文档 §2.1 原则 4）。`<placeholder>` 为部署期回填标记：

| 链 | 合约 | 部署工具 | deploy TxID | 区块高度 | 操作者 | 时间 |
|---|---|---|---|---|---|---|
| chainmaker | regulatory_record | cmc docker-go | `<deploy-txid>` | `<block-num>` | `<operator>` | `<date>` |
| chainmaker | crosschain_trace | cmc docker-go | `<deploy-txid>` | `<block-num>` | `<operator>` | `<date>` |
| chainmaker | identity_mapping | cmc docker-go | `<deploy-txid>` | `<block-num>` | `<operator>` | `<date>` |
| chainmaker | regulatory_authorization | cmc docker-go | `<deploy-txid>` | `<block-num>` | `<operator>` | `<date>` |
| chainmaker | audit_record | cmc docker-go | `<deploy-txid>` | `<block-num>` | `<operator>` | `<date>` |
| fabric | operator_business（v1.0, sequence 1） | peer lifecycle commit | `<deploy-txid>` | `<block-num>` | `<operator>` | `<date>` |
| fisco-bcos | uav_management（CNS 名） | Console sol2java/deploy | `<deploy-txid>` | `<block-num>` | `<operator>` | `<date>` |

验收要求（§6.5 清单第 2 项）：上表全部 TxID 在对应链上**可查询**。

---

## §5 精确代码改动（与 Plan 6 迁移缝一一对应，逐文件）

> **总原则（强调）：业务代码、13 步跨链协议、状态机、全部测试——零改动。**
> 迁移缝（`ChainTransport` 接口 + 注册表 + `buildChains` 分支 + 按链适配器白名单）
> 已由 Plan 6 交付并固化（315 PASS / 0 FAIL）。真实链迁移只新增下列 ①-④，
> 不修改任何既有文件的行为。

### ① `services/skytrust-backend/go.mod`：添加三链 SDK + 传递依赖协调

新增直接依赖（版本以 §2 版本对齐结果为准）：

| 链 | SDK module | 备注 |
|---|---|---|
| ChainMaker | `chainmaker.org/chainmaker/chainmaker-sdk-go/v2` | 版本必须与 `platforms/gchain-back/go.mod` 锁定的 SDK 线一致（§2.3 原则 2） |
| Fabric | `github.com/hyperledger/fabric-gateway`（连带 `github.com/hyperledger/fabric-protos-go-apiv2`、`google.golang.org/grpc`） | gateway API 与网络所选 Fabric 版本配套 |
| FISCO BCOS | `github.com/FISCO-BCOS/go-sdk`（v3.x） | **需要 cgo**：构建时 `CGO_ENABLED=1` + MinGW-w64（§1.2 条目 2） |

**传递依赖协调提示**：三链 SDK 会引入/抬升 `google.golang.org/grpc` 与
`google.golang.org/protobuf`（当前 go.mod 中 protobuf v1.36.10 为 indirect）。Go MVS 取
各路径最大版本，执行 `go mod tidy` 后必须核对 4 个冻结直接依赖**版本不变**：
`gin v1.12.0`、`gorm v1.31.2`、`glebarez/sqlite v1.11.0`、`emmansun/gmsm v0.44.1`，且
`go 1.25.0` 指令不动。若某 SDK 强行要求更高的 protobuf/grpc 导致 gin/gorm 行为漂移，
优先降 SDK 补丁版或按 §7 保持该链 sim 模式，**不得**反向升迁冻结依赖。

**hermetic 保护**：三链 SDK 的 import 只允许出现在带构建标签（见 ③）的新增文件/新增包中。
默认构建（无标签）下 `go mod tidy` 不应把 SDK 拉入主依赖图——建议把真实传输实现放在
`//go:build realchains` 标签文件内（③ 详述），hermetic 测试门保持 315/0 零影响。

### ② 每链实现 `chainadapter.ChainTransport`（接口逐字，transport.go:13-18）

```go
type ChainTransport interface {
	SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*TxReceipt, error)
	QueryTx(ctx context.Context, txID string) (*TxReceipt, error)
	QueryState(ctx context.Context, contract, key string) ([]byte, error)
	Health() error
}
```

回执结构（adapter.go:8-14，逐字字段）：

```go
type TxReceipt struct {
	TxID      string
	BlockNum  uint64
	Status    int // 0 = success
	Ret       []byte
	Timestamp time.Time
}
```

**语义契约（transport.go:12 逐字）**：回执 `Status==0` 表示成功；传输级错误返回**非 nil
error**（触发上层 `withRetry` 重试）。即：链上业务失败（验证码/状态码非 0）→ 返回
`Status!=0` 的回执、error 为 nil；网络/提交/提交超时等传输级失败 → error 非 nil。
三链映射：Fabric `peer.TxValidationCode_VALID == 0`；FISCO 回执 `status == 0`；
ChainMaker 回执 `contract_result.code == 0`——均恰好落入 `Status==0` 语义。

补充事实：`Resettable`（transport.go:22，`interface{ ResetState() }`）为 inproc 传输专属；
**真实链传输不实现该接口**——Seeder 绝不重置真实链（P6-R6）。`QueryState` 当前无活跃业务
调用点（接口契约成员，Plan 6 已核验），真实传输仍须给出可工作的实现（见下方骨架注释）。

**Fabric 传输完整示例骨架**（fabric-gateway Submit → TxReceipt 映射；迁移期参考实现，
编译前按所选 fabric-gateway 版本核对 API 名与 import 路径）：

```go
//go:build realchains

// Package realfabric 提供 Fabric 运营链真实 SDK 传输（docs/real-chain-migration.md §5-②）。
package realfabric

import (
	"context"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/hyperledger/fabric-gateway/pkg/client"
	"github.com/hyperledger/fabric-gateway/pkg/identity"
	"github.com/hyperledger/fabric-protos-go-apiv2/common"
	"github.com/hyperledger/fabric-protos-go-apiv2/protos"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/protobuf/proto"

	"skytrust-backend/internal/chainadapter"
)

// contractName 与后端固化常量逐字一致（internal/crosschain/policy.go:69
// ContractFabricOperator；白名单 internal/chainadapter/fabric/adapter.go:17）。
const contractName = "operator_business"

// Transport 以 fabric-gateway 实现 chainadapter.ChainTransport。
type Transport struct {
	conn      *grpc.ClientConn
	gateway   *client.Gateway
	network   *client.Network
	contract  *client.Contract
	channelID string
}

// NewFactory 即 chainadapter.TransportFactory（transport.go:25：func() (ChainTransport, error)）。
func NewFactory() (chainadapter.ChainTransport, error) {
	certPEM, err := os.ReadFile(os.Getenv("FABRIC_CERT_PATH"))
	if err != nil {
		return nil, fmt.Errorf("fabric: read client cert: %w", err)
	}
	cert, err := identity.CertificateFromPEM(certPEM)
	if err != nil {
		return nil, fmt.Errorf("fabric: parse client cert: %w", err)
	}
	keyPEM, err := os.ReadFile(os.Getenv("FABRIC_KEY_PATH"))
	if err != nil {
		return nil, fmt.Errorf("fabric: read client key: %w", err)
	}
	sign, err := identity.NewPrivateKeySign(keyPEM)
	if err != nil {
		return nil, fmt.Errorf("fabric: parse client key: %w", err)
	}
	tlsCertPEM, err := os.ReadFile(os.Getenv("FABRIC_TLS_CERT_PATH"))
	if err != nil {
		return nil, fmt.Errorf("fabric: read tls cert: %w", err)
	}
	tlsPool := x509.NewCertPool()
	if !tlsPool.AppendCertsFromPEM(tlsCertPEM) {
		return nil, fmt.Errorf("fabric: tls cert pool invalid")
	}
	endpoint := os.Getenv("FABRIC_PEER_ENDPOINT")
	conn, err := grpc.NewClient(endpoint,
		grpc.WithTransportCredentials(credentials.NewClientTLSFromCert(tlsPool, os.Getenv("FABRIC_TLS_HOST_NAME"))))
	if err != nil {
		return nil, fmt.Errorf("fabric: grpc connect %s: %w", endpoint, err)
	}
	gw, err := client.Connect(cert,
		client.WithSign(sign),
		client.WithIdentity(os.Getenv("FABRIC_MSP_ID"), cert),
		client.WithClientConnection(conn),
		client.WithEvaluateTimeout(15*time.Second),
		client.WithEndorseTimeout(30*time.Second),
		client.WithSubmitTimeout(30*time.Second),
		client.WithCommitStatusTimeout(60*time.Second))
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("fabric: gateway connect: %w", err)
	}
	channel := os.Getenv("FABRIC_CHANNEL_NAME")
	network := gw.GetNetwork(channel)
	return &Transport{
		conn:      conn,
		gateway:   gw,
		network:   network,
		contract:  network.GetContract(contractName),
		channelID: channel,
	}, nil
}

// SubmitTx 提交交易。recordJSON 约定（§4.2）：params map JSON 编码为单一字符串实参，
// 对应链码方法签名 recordJSON string（contracts/fabric/chaincode/main.go）。
func (t *Transport) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	if contract != contractName {
		return nil, fmt.Errorf("fabric: contract %q not registered (allowed: %s)", contract, contractName)
	}
	recordJSON, err := json.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("fabric: encode recordJSON: %w", err)
	}
	proposal, err := t.contract.NewProposal(method, client.WithArguments(string(recordJSON)))
	if err != nil {
		return nil, fmt.Errorf("fabric: new proposal %s: %w", method, err)
	}
	// Endorse(nil)：nil 表示使用 Connect 时 WithSign 注入的签名器。
	transaction, err := proposal.Endorse(nil)
	if err != nil {
		return nil, fmt.Errorf("fabric: endorse %s: %w", method, err) // 传输级错误 → withRetry
	}
	commit, err := transaction.Submit()
	if err != nil {
		return nil, fmt.Errorf("fabric: submit %s: %w", method, err) // 传输级错误 → withRetry
	}
	result, err := commit.Result()
	if err != nil {
		return nil, fmt.Errorf("fabric: commit %s: %w", method, err) // 传输级错误 → withRetry
	}
	receipt := &chainadapter.TxReceipt{
		TxID:      transaction.TransactionID(),
		BlockNum:  result.BlockNumber(),
		Status:    int(result.Status()), // peer.TxValidationCode：0 = VALID = 成功
		Ret:       transaction.Result(), // 链码返回值（operator_business 各方法回显主键）
		Timestamp: time.Now(),           // 提交确认时刻；链上精确时间戳可经 QueryTx 解块获得
	}
	return receipt, nil
}

// QueryTx 经系统链码 qscc.GetBlockByTxID 取回区块并解出该交易的验证码/时间戳。
func (t *Transport) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	qscc := t.network.GetContract("qscc")
	blockBytes, err := qscc.EvaluateWithContext(ctx, "GetBlockByTxID", t.channelID, txID)
	if err != nil {
		return nil, fmt.Errorf("fabric: qscc GetBlockByTxID %s: %w", txID, err)
	}
	block := &common.Block{}
	if err := proto.Unmarshal(blockBytes, block); err != nil {
		return nil, fmt.Errorf("fabric: decode block: %w", err)
	}
	filter := block.Metadata.Metadata[common.BlockMetadataIndex_TRANSACTIONS_FILTER]
	for i, raw := range block.Data.Data {
		envelope := &common.Envelope{}
		if err := proto.Unmarshal(raw, envelope); err != nil {
			continue
		}
		payload := &protos.Payload{}
		if err := proto.Unmarshal(envelope.Payload, payload); err != nil {
			continue
		}
		channelHeader := &protos.ChannelHeader{}
		if err := proto.Unmarshal(payload.Header.ChannelHeader, channelHeader); err != nil {
			continue
		}
		if channelHeader.TxId != txID {
			continue
		}
		receipt := &chainadapter.TxReceipt{
			TxID:     txID,
			BlockNum: block.Header.Number,
			Status:   int(filter[i]), // TxValidationCode：0 = VALID
		}
		if channelHeader.Timestamp != nil {
			receipt.Timestamp = channelHeader.Timestamp.AsTime()
		}
		return receipt, nil
	}
	return nil, fmt.Errorf("fabric: tx %s not found in block returned by qscc", txID)
}

// QueryState 按键读链上状态。operator_business 当前对外表面为 6 个写方法（无读方法，
// 见 contracts/fabric/README.md），且后端无活跃 QueryState 调用点；部署期需为链码补充
// 一个读方法（按状态键 GetState 直读，如 QueryState(key string) (string, error)）后
// 经 EvaluateWithContext 调用——补充读方法属于部署期链码演进，不触碰后端任何代码。
func (t *Transport) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	if contract != contractName {
		return nil, fmt.Errorf("fabric: contract %q not registered (allowed: %s)", contract, contractName)
	}
	return t.contract.EvaluateWithContext(ctx, "QueryState", key)
}

// Health 经 qscc.GetChainInfo 探活（/api/chain/status 的数据来源，§6.5）。
func (t *Transport) Health() error {
	qscc := t.network.GetContract("qscc")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := qscc.EvaluateWithContext(ctx, "GetChainInfo", t.channelID); err != nil {
		return fmt.Errorf("fabric: health qscc GetChainInfo: %w", err)
	}
	return nil
}

// Close 释放 gateway 与连接（进程退出钩子调用）。
func (t *Transport) Close() {
	t.gateway.Close()
	t.conn.Close()
}

var _ chainadapter.ChainTransport = (*Transport)(nil)
```

ChainMaker / FISCO 传输同型实现（同一接口、同一回执语义）：ChainMaker 用
chainmaker-sdk-go/v2 的 `ChainClient.CreateTxRequest` + `SendTxRequest`（回执
`contract_result.code` → `Status`，`contract_result.result` → `Ret`）；FISCO 用 go-sdk 的
CNS 名解析 `uav_management` 地址后 `CallContract`（回执 `status` → `Status`，`output` →
`Ret`）。两链实现结构与上述骨架一致，不再重复展开。

### ③ 启动早期注册：`chainadapter.RegisterRealTransport`（三链同型）

签名（transport.go:34）：`func RegisterRealTransport(chain string, f TransportFactory)`，
其中 `TransportFactory`（transport.go:25）= `func() (ChainTransport, error)`。
注册必须在 `buildChains` 执行前完成（即 `main` 之前经 `init` 生效）。新增文件
`services/skytrust-backend/cmd/server/transports_real.go`：

```go
//go:build realchains

package main

import (
	"skytrust-backend/internal/chainadapter"
	realchainmaker "skytrust-backend/internal/chainadapter/real/chainmaker"
	realfabric "skytrust-backend/internal/chainadapter/real/fabric"
	realfisco "skytrust-backend/internal/chainadapter/real/fisco"
)

// 链键与 buildChains（chains.go:30）的字面量逐字一致：
// "fabric" / "chainmaker" / "fisco-bcos"（注意 fisco 键含连字符，不是 "fisco"）。
func init() {
	chainadapter.RegisterRealTransport("fabric", realfabric.NewFactory)
	chainadapter.RegisterRealTransport("chainmaker", realchainmaker.NewFactory)
	chainadapter.RegisterRealTransport("fisco-bcos", realfisco.NewFactory)
}
```

真实链构建：`go build -tags realchains ./cmd/server`（此时 `CGO_ENABLED=1`，FISCO SDK 需 cgo）。
hermetic 构建（默认无标签）：注册表为空——这正是 fail-fast 的设计前提（§6.3），
hermetic 测试门 315/0 不受影响。

### ④ 连接配置 env 清单（每链一张表）

命名基线沿用参考文档 §11.1 `.env.example` 既有变量（`CHAINMAKER_RPC_URL`、
`CHAINMAKER_CHAIN_ID`、`FABRIC_CHANNEL_NAME`、`FISCO_RPC_URL`、`FISCO_GROUP_ID`），
证书/密钥类为本指南新增迁移期约定。全部经 `.env` 注入（**不得提交 Git**），
由各链 `NewFactory` 在构造时读取。

**ChainMaker 监管链：**

| 环境变量 | 含义 | 示例/默认 |
|---|---|---|
| `CHAINMAKER_RPC_URL` | 节点 RPC 地址 | `<host>:12301`（平台默认端口，部署核定） |
| `CHAINMAKER_CHAIN_ID` | 链 ID | `chain1` |
| `CHAINMAKER_ORG_ID` | 组织 ID | `wx-org1.chainmaker.org` |
| `CHAINMAKER_USER_KEY_FILE` | 用户私钥路径（证书模式） | `<path>/client.key` |
| `CHAINMAKER_USER_CERT_FILE` | 用户证书路径 | `<path>/client.cert` |
| `CHAINMAKER_CA_CERT_FILE` | 链 CA/TLS 根证书路径 | `<path>/ca.cert` |
| `CHAINMAKER_TLS_HOST_NAME` | TLS SNI 主机名 | `chainmaker.org` |

**Fabric 运营链：**

| 环境变量 | 含义 | 示例/默认 |
|---|---|---|
| `FABRIC_PEER_ENDPOINT` | peer gRPC 端点 | `localhost:7051`（平台默认，部署核定） |
| `FABRIC_MSP_ID` | 组织 MSP ID | `Org1MSP` |
| `FABRIC_CHANNEL_NAME` | 通道名 | `<channel-name>` |
| `FABRIC_CERT_PATH` | 客户端签名证书路径 | `<path>/cert.pem` |
| `FABRIC_KEY_PATH` | 客户端私钥路径 | `<path>/key.pem` |
| `FABRIC_TLS_CERT_PATH` | peer TLS CA 证书路径 | `<path>/tls-ca.pem` |
| `FABRIC_TLS_HOST_NAME` | TLS SNI 主机名 | `peer0.org1.example.com` |

**FISCO BCOS 管理链：**

| 环境变量 | 含义 | 示例/默认 |
|---|---|---|
| `FISCO_RPC_URL` | 节点 RPC 地址 | `http://127.0.0.1:20200`（平台默认，部署核定） |
| `FISCO_GROUP_ID` | 群组 ID（v3 为 group 名） | `1`（v3.x 形态下取 `group0`，以版本对齐结果为准） |
| `FISCO_CA_CERT_PATH` | 链 CA 证书路径 | `<path>/ca.crt` |
| `FISCO_SDK_CERT_PATH` | SDK 证书路径（国密双证书时含签名/加密两套） | `<path>/sdk.crt` |
| `FISCO_SDK_KEY_PATH` | SDK 私钥路径 | `<path>/sdk.key` |
| `FISCO_ACCOUNT_KEYSTORE` | 交易签名账户 keystore（pem/p12）路径 | `<path>/account.pem` |
| `FISCO_CONTRACT_CNS_NAME` | 管理方合约 CNS 名（§4.3 注册值） | `uav_management` |

---

## §6 切换与验证

### 6.1 模式开关语义（config.go:28-41、config.go:52 `ChainModeFor`）

| 环境变量 | 默认 | 语义 |
|---|---|---|
| `CHAIN_MODE` | `sim` | 全局模式：`sim` = hermetic inproc 仿真；`real` = 真实 SDK 传输 |
| `CHAINMAKER_MODE` | `""`（空） | 分链覆盖：非空时**优先于**全局 `CHAIN_MODE` |
| `FABRIC_MODE` | `""`（空） | 同上 |
| `FISCO_MODE` | `""`（空） | 同上 |

生效逻辑（`ChainModeFor`，config.go:52）：按链名查分链覆盖，非空即用；为空回落全局
`ChainMode`（默认 `sim`）。取值只认 `sim`/`real`，其他值启动即报错
（chains.go:44 逐字：`chain %s: unknown mode %q (want sim|real)`）。

### 6.2 buildChains 装配（chains.go:27）

`buildChains` 迭代固定链名列表 `[]string{"fabric", "chainmaker", "fisco-bcos"}`
（chains.go:30——链键字面量即此三者，**fisco 键含连字符**）：

- 模式 `sim`：`sim.New(name)` inproc 传输 → `wrapAdapter(name, s)`，并把传输登记进
  resets 表（demo/reset 用）。
- 模式 `real`：`chainadapter.NewRealTransport(name)`（transport.go:42）从注册表取工厂
  构造真实传输 → `wrapAdapter(name, t)`；**不进 resets 表**（P6-R6）。
- `wrapAdapter`（chains.go:51）按链名套迁移稳定层适配器：`adpchainmaker.New(t)` /
  `adpfabric.New(t)` / `adpfisco.New(t)`——适配器附加链身份与已注册合约白名单校验（P6-R3）。

### 6.3 fail-fast 错误原文（transport.go:47，逐字——运维第一现场）

`CHAIN_MODE=real` 但本构建未注册任何真实 SDK 传输（即 hermetic 构建、或未按 §5-③
以 `-tags realchains` 构建/注册）时，`NewRealTransport` 返回、服务启动失败，运维看到：

```
chain %q: CHAIN_MODE=real but no real SDK transport is registered in this build; hermetic builds carry no chain SDKs — see docs/real-chain-migration.md
```

（`%q` 为链键；注意 `SDKs — see` 中为 em-dash U+2014。此设计为验收诚实性 R0'：
绝不静默仿真冒充真实链。）

### 6.4 切换步骤

```powershell
# 1) 部署环境完成 §1-§4（环境、版本对齐、三链启动、合约部署并回填 §4.4 表）
# 2) 以真实链标签构建（CGO_ENABLED=1）
cd services/skytrust-backend
$env:CGO_ENABLED = "1"
go build -tags realchains ./cmd/server

# 3) 切换模式（全局或分链）
$env:CHAIN_MODE = "real"            # 全局；或分链：
$env:FABRIC_MODE = "real"           # 仅运营链走真实链，其余跟随全局

# 4) 启动并验证
./server.exe
curl -s -X POST http://127.0.0.1:8080/api/chain/status
```

### 6.5 验收清单（全项通过才算迁移完成）

1. **三链真实在线**：`POST /api/chain/status` 返回三链全 `ONLINE`，且其数据来自真实传输
   `Health()`（health_handler.go:108-120 逐链探测），不是静态文字。
2. **部署 TxID 全可查**：§4.4 登记表内 7 行 deploy TxID 在对应链上逐笔可查询。
3. **跨链闭环 SUCCESS**：13 步协议完整跑通（任务申请 → 监管登记 → 管理方审核 →
   通行证签发），终态 SUCCESS，任何一跳失败不得 SUCCESS（gateway.go:23 契约）。
4. **两跳四段 TxID 齐全**：每笔跨链交易的 `source_chain_tx_id`、`reg_record_id`、
   `target_chain_tx_id` 与回执登记四段全部落库可查（model/crosschain.go 字段，
   `/api/crosschain/query` 可验证）。
5. **p95 < 1000ms 在真实链下重测**：hermetic 的低时延契约（chains.go:16-20：
   fabric 10ms / chainmaker 5ms / fisco-bcos 10ms 仿真时延）不再适用，真实链下重新
   度量端到端 p95 并记录于 `docs/version-matrix.md`；不达标先优化链侧（出块间隔、
   连接池、重试参数），**不得**放宽协议或改动业务代码。

---

## §7 回退

### 7.1 全局回退：`CHAIN_MODE=sim`（零风险）

```powershell
$env:CHAIN_MODE = "sim"     # 或直接清除该变量（默认即 sim）
# 重启后端进程
```

- 回到 hermetic inproc 仿真链（`chainadapter/sim`），与迁移前完全同构，**零风险**；
  315 PASS / 0 FAIL 测试门行为不变。
- 真实链上的存证数据原样保留（回退不销毁任何链上数据）；sim 模式的状态在链下
  SQLite 演示库内，可经 demo/reset 重建。
- 回退后 `CHAIN_MODE=real` 的 fail-fast（§6.3）依然成立：sim/real 判定每次启动重新装配。

### 7.2 分链混跑支持矩阵

`buildChains` 对三链**逐链独立**装配（chains.go:30-46），任意组合合法——真实链迁移可
逐链灰度（推荐顺序：先 ChainMaker 监管链，再 FISCO 管理链，最后 Fabric 运营链，与
合约复杂度/调用频度匹配）：

| 组合（示例） | CHAINMAKER_MODE | FABRIC_MODE | FISCO_MODE | 效果 |
|---|---|---|---|---|
| 全 sim（默认） | `""` | `""` | `""` | 三链 hermetic inproc；回退终态 |
| 仅监管链真实 | `real` | `""` | `""` | chainmaker 走 SDK，fabric/fisco-bcos 仿真 |
| 仅运营链真实 | `""` | `real` | `""` | fabric 走 SDK，其余仿真 |
| 仅管理链真实 | `""` | `""` | `real` | fisco-bcos 走 SDK，其余仿真 |
| 两链真实 | `real` | `real` | `""` | chainmaker+fabric 走 SDK，fisco-bcos 仿真 |
| 全 real（验收态） | `real` | `real` | `real` | 或等价地仅设 `CHAIN_MODE=real` 三分链留空 |

混跑语义与约束：

- 分链值非空即覆盖全局（`ChainModeFor`）；`CHAIN_MODE=real` + 单链 `FABRIC_MODE=sim`
  同样合法（该链回落仿真）。
- 跨链闭环（13 步协议）在混跑下依然完整可跑——迁移缝在传输层，协议/状态机对
  sim/real 无感知；但**验收判定（§6.5）只认全 real 组合**。
- 任一链置 `real` 都要求该链传输已注册（§5-③），否则启动即 fail-fast（§6.3）——
  不存在「设了 real 却悄悄仿真」的中间态。
- demo/reset 只重置 sim 链（resets 表仅含 inproc 传输，P6-R6）；混跑下真实链数据不受
  重置影响，演示前请确认链上数据留存策略。

---

*本指南与 `contracts/README.md`（合约权威索引）、`docs/version-matrix.md`（部署期版本/端口/性能
记录，工作包 A 交付）配套使用。迁移缝源码锚点：`internal/chainadapter/transport.go`、
`internal/chainadapter/adapter.go`、`internal/config/config.go`、`cmd/server/chains.go`。*
