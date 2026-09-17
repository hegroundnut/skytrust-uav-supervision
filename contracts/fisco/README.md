# contracts/fisco — FISCO BCOS 管理方 Solidity 合约源（uav_management）

**状态：已部署（2026-09-17）。** 合约经 FISCO Console（v3.8.0）部署于管理链 `group0`
（节点 v3.16.4，非国密），BFS 链接 `/apps/uav_management` →
`0x6546c3571f17858ea45575e7c6457dad03e53dbb`；最终部署笔
`0x7ab040267bb7b8fba57b503981f2add36fd684716a06bd1ec36ed7dff4c31fd2`（block 7，
statusOK=true），登记 `docs/version-matrix.md` §5（验收 §6.5-② PASS）。一键脚本：
`scripts/deploy-contracts.sh fisco`。
本目录是 FISCO BCOS 管理方业务链的 Solidity 合约源，位于 `services/skytrust-backend`
Go module 之外。hermetic 环境**没有** Solidity 编译器（solc）与 FISCO Console / 节点 /
go-sdk 工具链，本目录**不**运行任何 `solc` / `go` / 编译命令——合约源仅在真实链迁移的
部署环境用 FISCO Console 编译、部署并验证。后端全量测试门（在 `services/skytrust-backend`
运行）不下降至本目录（Solidity 在 module 之外），保持 315 PASS / 0 FAIL 零影响。部署与
校验流程以 `docs/real-chain-migration.md` §3-§4 为准（Task 21 交付，前向指针）；仓库根
`contracts/README.md` 为跨链总览（Task 20 交付）。

## v3 版本对齐（部署前置硬条件——部署环境已满足）

本合约 `pragma solidity ^0.8.0;` 对应 FISCO BCOS **v3.x** 形态，Console 官方要求
v3.x Console 与 v3.x 节点配套。部署环境实况（`docs/version-matrix.md` §2/§8-D13）：

| 组件 | 角色 | 部署实况 | 备注 |
|---|---|---|---|
| 节点二进制 | `/opt/fisco/nodes/127.0.0.1/node0` | **v3.16.4**（Build 20260114，fb90450） | 子模块指针 `v3.17.0-…-gfec58e693` 与运行二进制存在偏差（D13），版本线一致（v3.x） |
| `platforms/fisco-console` | 控制台 | v3.8.0-2-gfc2a37b | 交互式（`start.sh <groupID>`） |
| `platforms/fisco-bcos` | Go SDK | v3.0.2-2-g50bbbee | 后端 `-tags realchains` 传输依赖 |

原「当前节点为 v2.7.0 不配套」的警告针对迁移前仓库指针状态，部署时已以 v3.16.4
二进制解决；核对命令（部署环境执行）：

```bash
git -C platforms/fisco-node    describe --tags --always   # 指针 v3.17.0 线
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
> `UavManagement`（FISCO 编译/部署用此名）。**部署实况**：v3 以 **BFS 链接**（非 v2 CNS）
> 提供按名解析——`ln /apps/uav_management <contract-address>` 后，go-sdk 按名
> `uav_management` 调用即经 `/apps/uav_management` 解析（见下「Console 编译部署」）。

## 方法 × 后端调用点对照（P6-R9 逐字转录）

合约名与后端固化常量逐字对应：合约 `uav_management` =
`internal/crosschain/policy.go:70` `ContractFiscoManage`；`CrosschainSubmit` =
`policy.go:74` `SourceSubmitMethod`。本合约**写表面**恰为下列 **3 个写方法**（存证映射
均为 `private`、无自动 getter）；另有部署期演进（指南 §5-② 授权）补充的通用读方法
**`QueryState(string key) view returns (string)`**——按前缀路由 `APP/`→applications、
`SUBMIT/`→submits、`ACK/`→acks，未知前缀或无值 `revert`；后端
`ChainTransport.QueryState`（`internal/chainadapter/real/fisco/transport.go`）即经此
实现（无值 revert → 映射为非 nil error，读路径约定）。

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

## FISCO Console 编译部署（部署实况，2026-09-17；一键化 `scripts/deploy-contracts.sh fisco`）

Console v3.8.0 为**交互式**：`start.sh` 只收一个参数 groupID，命令经 stdin 送入
（脚本化形如 `echo "<cmd>" | bash start.sh group0`）。deploy 命令自动用内置 solc
（按 pragma 匹配 `contracts/solidity/` 下 0.8.x 工具链）编译，**无需手工 sol2java**：

```bash
cd /opt/fisco/console    # 部署实况 console 目录

# 1) 放置合约源（文件名 = 合约标识符 UavManagement.sol）
cp contracts/fisco/uav_management.sol /opt/fisco/console/contracts/solidity/UavManagement.sol

# 2) 部署（自动编译；亦支持 `deploy solidity/UavManagement.sol -l /apps/uav_management`
#    一步完成部署+BFS 链接。回执含 transactionHash 与 contractAddress）
echo "deploy solidity/UavManagement.sol" | bash start.sh group0
#    → 合约地址以 deploylog.txt 末行为权威（console 输出含多地址），部署实况：
#      2026-09-17 12:54:37  [group:group0]  UavManagement  0x6546c3571f17858ea45575e7c6457dad03e53dbb

# 3) BFS 链接（v3 的按名解析，取代 v2 CNS；ln 恰收 2 参 <path> <address>）
echo "ln /apps/uav_management 0x6546c3571f17858ea45575e7c6457dad03e53dbb" | bash start.sh group0

# 4) 校验：链接可解析 + 部署回执上链（statusOK=true, blockNumber=7）
echo "ls /apps" | bash start.sh group0
echo "getTransactionReceipt 0x7ab040267bb7b8fba57b503981f2add36fd684716a06bd1ec36ed7dff4c31fd2" | bash start.sh group0
```

### 部署后校验（逐字键集冒烟，部署实况命令）

对每个方法各执行一次写，params 键与位序必须与上表逐字一致（任何键名 / 位序不匹配都
视为部署校验失败）。Console v3 的调用命令为 **`call`**（按 BFS 路径寻址，参数为
位置式 `string`，尖括号内为冒烟值）：

```text
# SubmitApplication（9 参，主键 mission_id）
[group0]# call /apps/uav_management SubmitApplication \
  <mission_id> <application_id> <operator_id> <uav_id> <mission_type> \
  <start_time> <end_time> <route_segments> <sm3_hash>

# CrosschainSubmit（3 参，主键 cross_tx_id）
[group0]# call /apps/uav_management CrosschainSubmit \
  <cross_tx_id> <message_type> <business_id>

# CrosschainAck（4 参，主键 cross_tx_id）
[group0]# call /apps/uav_management CrosschainAck \
  <cross_tx_id> <reg_record_id> <target_chain_tx_id> <status>

# QueryState（1 参，部署期演进补充的通用读；前缀 APP/ SUBMIT/ ACK/）
[group0]# call /apps/uav_management QueryState APP/<mission_id>
```

⚠ **console 无法表达空串参数**（参数解析吞空串）——「任一必备键传空串时 `revert`」
的负例只能经真实传输验证：`TestRealNegativePaths`
（`internal/chainadapter/real/latency_probe_test.go`，`-tags realchains`；实测回执
status=16 revert、Status!=0 且 error=nil，语义契约成立）。

校验断言（部署实况复核结果，详见 `docs/version-matrix.md` §5-§6）：

1. node（v3.16.4）/ Console（v3.8.0）/ go-sdk（v3.0.2）已统一 v3.x，deploy 自动编译成功；
2. `UavManagement` 部署成功并以 BFS 链接 `/apps/uav_management` 可按名解析；
3. 三个写方法用上表逐字键集 / 位序调用均成功上链（status 0），对应 `private mapping`
   落存证、同名大写事件（`SUBMITAPPLICATION` / `CROSSCHAINSUBMIT` / `CROSSCHAINACK`）
   可在交易回执 logs 中查到；`QueryState` 可回读三类存证 JSON；
4. 必备键空串 → `revert`（回执 status 16）——经真实传输验证（见上 ⚠）；
5. 后端 real 传输适配器以 `SubmitTx(ctx, "uav_management", <method>, <params>)` 全链路
   打通（13 步闭环三笔全 SUCCESS，§6.5-③ PASS）。

> go-sdk 对接实况（偏差 D 系列，`docs/version-matrix.md` §8）：v3 `GetABI` 的 RPC
> result 为**双重编码 JSON 字符串字面量**，后端传输先 `json.Unmarshal` 解一层再
> `abi.JSON`；节点侧 `[consensus] min_seal_time`（config.ini，毫秒）由 500 → 100 为
> p95 达标（§6.5-⑤）的链侧调优项，改后需重启节点（后端亦随之重启以重建 C-SDK 连接）。

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
