# contracts/fisco — FISCO BCOS 管理方 Solidity 合约源（uav_management）

**状态：部署期校验（hermetic 环境无 solc / FISCO 工具链、不编译）。**
本目录是 FISCO BCOS 管理方业务链的 Solidity 合约源，位于 `services/skytrust-backend`
Go module 之外。hermetic 环境**没有** Solidity 编译器（solc）与 FISCO Console / 节点 /
go-sdk 工具链，本目录**不**运行任何 `solc` / `go` / 编译命令——合约源仅在真实链迁移的
部署环境用 FISCO Console 编译、部署并验证。后端全量测试门（在 `services/skytrust-backend`
运行）不下降至本目录（Solidity 在 module 之外），保持 315 PASS / 0 FAIL 零影响。部署与
校验流程以 `docs/real-chain-migration.md` §3-§4 为准（Task 21 交付，前向指针）；仓库根
`contracts/README.md` 为跨链总览（Task 20 交付）。

## ⚠ v3 版本对齐警告（部署前置硬条件）

当前仓库 FISCO BCOS 子模块版本**不匹配**，必须按迁移指南 §2 统一至 **v3.x** 后方可
编译部署本合约：

| 子模块 | 角色 | 当前 tag | 目标 |
|---|---|---|---|
| `platforms/fisco-node` | 节点源码 | `v2.7.0-2853-gfec58e693` | v3.x |
| `platforms/fisco-console` | 控制台 | `v3.8.0-2-gfc2a37b` | v3.x |
| `platforms/fisco-bcos` | Go SDK | `v3.0.2-2-g50bbbee` | v3.x |

本合约 `pragma solidity ^0.8.0;` 对应 FISCO BCOS **v3.x** 形态。FISCO BCOS Console 官方
要求 v3.x Console 与 v3.x 节点配套；当前节点为 v2.7.0，与 v3.8.0 Console / v3.0.2 SDK
不配套——**版本未统一前部署会失败**。核对与统一流程见 `docs/real-chain-migration.md` §2
（Task 21 交付，前向指针）。核对命令（部署环境执行）：

```bash
git -C platforms/fisco-node    describe --tags --always   # 期望 v3.x（当前 v2.7.0，须升级）
git -C platforms/fisco-console describe --tags --always   # v3.8.0
git -C platforms/fisco-bcos    describe --tags --always   # v3.0.2
```

## 目录布局

```
contracts/fisco/
├── uav_management.sol   # contract UavManagement（FISCO BCOS v3，Solidity ^0.8）
└── README.md            # 本文件
```

> 文件名 `uav_management.sol` = 后端固化合约名 `ContractFiscoManage`（policy.go:70）=
> 后端 `SubmitTx(ctx, "uav_management", method, params)` 的合约实参；Solidity 合约标识符为
> `UavManagement`（FISCO 编译/部署用此名）。部署期须将部署后的 `UavManagement` 以
> CNS 名 `uav_management` 注册，使后端按名调用可解析（见下「Console 编译部署」第 4 步
> 与迁移指南 §3-§4）。

## 方法 × 后端调用点对照（P6-R9 逐字转录）

合约名与后端固化常量逐字对应：合约 `uav_management` =
`internal/crosschain/policy.go:70` `ContractFiscoManage`；`CrosschainSubmit` =
`policy.go:74` `SourceSubmitMethod`。本合约对外表面恰为下列 **3 个写方法**（无查询
方法、无自动 getter——存证映射均为 `private`）；状态核验经 Console / 链上查询工具在
部署期执行。

| 方法 | 角色 | params 键集（逐字） | 主键 | 事件 | 后端调用点 |
|---|---|---|---|---|---|
| `SubmitApplication` | TARGET（任务申请落管理链） | `mission_id`、`application_id`、`operator_id`、`uav_id`、`mission_type`、`start_time`、`end_time`、`route_segments`、`sm3_hash` | `mission_id` | `SUBMITAPPLICATION` | `internal/crosschain/gateway.go:330` 经 `targetContractMethod` `policy.go:82-83`；键集 = `requiredFields[MISSION_APPLICATION]` `policy.go:45` |
| `CrosschainSubmit` | SOURCE（代提交源链） | `cross_tx_id`、`message_type`、`business_id` | `cross_tx_id` | `CROSSCHAINSUBMIT` | `internal/crosschain/gateway.go:214`（合约经 `sourceContract("fisco-bcos")` `policy.go:99-100`；方法名 `SourceSubmitMethod` `policy.go:74`；键集 `gateway.go:215`） |
| `CrosschainAck` | SOURCE（统一回执确认） | `cross_tx_id`、`reg_record_id`、`target_chain_tx_id`、`status` | `cross_tx_id` | `CROSSCHAINACK` | `internal/crosschain/gateway.go:365`（合约经 `sourceContract("fisco-bcos")` `policy.go:99-100`；键集 `gateway.go:366-367`） |

行号基线：backend HEAD `fdc198e`（定位请以常量 / 方法名锚点为准，行号会随代码演进漂移）。

### 唯一性核验：fisco 侧只有这 3 个方法（无臆造表面）

- **TARGET 面**：`targetContractMethod`（policy.go:78-92）唯一返回 `ContractFiscoManage`
  的分支是 `MsgMissionApplication` → `"SubmitApplication"`（policy.go:82-83）。其余分支
  返回 ChainMaker（`RegisterIndex`）或 Fabric（`RecordReview` / `RecordPass` /
  `RecordPassRevoke`）合约——故作为 TARGET，fisco 仅承载 `SubmitApplication`。
- **SOURCE 面**：`sourceContract`（policy.go:95-104）仅当链名为 `"fisco-bcos"` 时返回
  `ContractFiscoManage`（policy.go:99-100）。在 `sourceContract("fisco-bcos")` 上调用的源链方法
  恰为两个：`SourceSubmitMethod`=`"CrosschainSubmit"`（gateway.go:214）与 `"CrosschainAck"`
  （gateway.go:365）。二者在 SourceChain=="fisco-bcos"（消息类型 MISSION_REVIEW_RESULT /
  FLIGHT_PASS / PASS_REVOKE，routingTable policy.go:14-17）时命中本合约。
- **无遗漏**：gateway.go 其余 `SubmitTx` 调用点（:265 `RegisterReceive`、:287
  `VerifyCredential`、:308 `RegisterRelay`、:348 `RegisterReceipt`）的目标合约恒为
  ChainMaker 监管链适配器（`reg`，RegChainName），从不为 fisco。
- **结论**：fisco `uav_management` 完整方法表面 = {`SubmitApplication`,
  `CrosschainSubmit`, `CrosschainAck`}，恰 3 个，全部有源支撑，无臆造。

## 参数序列化约定（迁移期传输适配）

后端调用面 `SubmitTx(ctx, contract, method, params)` 的 `params` 为 `map[string]any`，
而本合约方法签名按**逐字 params 键**展开为命名的 `string memory` 形参（每位对应一个键，
顺序见上表）。real 传输实现时：

- 标量字符串值（各 ID、`message_type`、`mission_type`、`status`、`sm3_hash` 等）直接传入；
- 复杂 / 列表值（`route_segments`）与时间戳类值（`start_time` / `end_time`）由传输层
  **序列化为字符串**后传入对应 `string memory` 形参（与 Fabric `recordJSON` 约定一致，
  见 `contracts/fabric/README.md` 与 `docs/real-chain-migration.md` §5，Task 21 交付）。

合约内对每个必备键 `require(bytes(<key>).length > 0, "<key> required")` 校验非空（与网关
`CheckPayload` policy.go:52-64 同源），随后按固定键序经内部 `_encode` 组装为 JSON-ish
存证字符串（`{"k0":"v0","k1":"v1"}`，键名逐字）写入对应 `private mapping`，并 `emit` 同名大写
事件。值为传输层序列化后的 JSON-safe 字符串（ID / 十六进制摘要 / 序列化 route_segments），
故 `_encode` 不做额外转义。三类证据用独立映射（`applications` / `submits` / `acks`），
避免 `CrosschainSubmit` 与 `CrosschainAck` 同以 `cross_tx_id` 为主键时相互覆盖。

## FISCO Console 编译部署（部署环境执行；`<placeholder>` 由部署者填写）

以下命令在部署环境执行，权威流程与确切参数以 `docs/real-chain-migration.md` §3-§4 为准。
hermetic 环境**禁止**运行第 0 步及任何 `solc` / `go` / Console 命令。

```bash
# 0) 版本对齐（迁移指南 §2，前置硬条件）：node / Console / go-sdk 统一到 v3.x（见上文警告）

# 1) 放置合约源到 Console 合约目录
cp contracts/fisco/uav_management.sol <fisco-console-dir>/contracts/solidity/uav_management.sol

# 2) 编译 Solidity → ABI / bin（sol2java）
cd <fisco-console-dir>
bash sol2java.sh -v <solc-version>      # 或 Console 启动时自动编译 contracts/solidity/*.sol
#    产物：contracts/sdk/<sdk-out-dir>/UavManagement.java + ABI/bin（确切路径以 §3 部署期实测为准）

# 3) 启动 Console 并部署合约（Console 交互内）
bash start.sh
#   [console]# deploy UavManagement           # 返回合约地址 <contract-address>

# 4) 以 CNS 名 uav_management 注册部署后的 UavManagement，
#    使后端 SubmitTx(ctx, "uav_management", method, params) 可按名解析（确切命令以 §3-§4 为准）
#   [console]# <cns-register-cmd> uav_management UavManagement <contract-address> <version>
```

### 部署后校验（逐字键集冒烟）

对每个方法各执行一次写，params 键与位序必须与上表逐字一致（任何键名 / 位序不匹配都
视为部署校验失败）。Console 交互内（参数为位置式 `string`，尖括号内为冒烟值）：

```text
# SubmitApplication（9 参，主键 mission_id）
[console]# callByName uav_management SubmitApplication \
  <mission_id> <application_id> <operator_id> <uav_id> <mission_type> \
  <start_time> <end_time> <route_segments> <sm3_hash>

# CrosschainSubmit（3 参，主键 cross_tx_id）
[console]# callByName uav_management CrosschainSubmit \
  <cross_tx_id> <message_type> <business_id>

# CrosschainAck（4 参，主键 cross_tx_id）
[console]# callByName uav_management CrosschainAck \
  <cross_tx_id> <reg_record_id> <target_chain_tx_id> <status>
```

校验断言（详见 `docs/real-chain-migration.md` §4）：

1. node / Console / go-sdk 已统一 v3.x，`uav_management.sol` 经 `sol2java` 编译成功；
2. `UavManagement` 部署成功并以 CNS 名 `uav_management` 注册；
3. 三个方法用上表逐字键集 / 位序调用均成功上链，对应 `private mapping` 落存证、
   同名大写事件（`SUBMITAPPLICATION` / `CROSSCHAINSUBMIT` / `CROSSCHAINACK`）可在
   交易回执 logs 中查到；
4. 任一必备键传空串时对应方法 `revert`，错误文案为 `<key> required`；
5. 后端 real 传输适配器以 `SubmitTx(ctx, "uav_management", <method>, <params>)` 全链路打通。

## 目录约定

- 单文件单合约：`uav_management.sol` 内 `contract UavManagement`，文件名 = 后端合约常量值。
- 本目录文件**永远不**被 `services/skytrust-backend` 的 `go build` / `go vet` / `go test`
  触及，也不被任何 hermetic 自动化门编译（无 solc / FISCO 工具链）；结构自查
  （SPDX / pragma / contract / mapping / 3 event / 3 完整方法 / require 校验 / 无桩内容）
  代替编译门，记录于 Task 19 报告。

## 前向指针

- `docs/real-chain-migration.md` §2：FISCO BCOS v3 版本对齐（node / Console / go-sdk 统一，Task 21 交付）。
- `docs/real-chain-migration.md` §3：Console `sol2java` 编译与 `deploy` / CNS 注册流程实例化（Task 21 交付）。
- `docs/real-chain-migration.md` §4：部署后逐字键集冒烟与校验断言（Task 21 交付）。
- `docs/real-chain-migration.md` §5：params → string 形参传输适配约定（Task 21 交付）。
- `contracts/README.md`：跨链合约总览（Task 20 交付）。
