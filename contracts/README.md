# 合约交付索引（三链）

> ⚠️ **hermetic 构建不编译本目录任何合约。**
> 本仓库的 hermetic 构建/测试环境不含任何链 SDK、`solc`、Docker 或 cgo 工具链，因此
> `contracts/` 下的 ChainMaker（Docker-Go）、Fabric（chaincode 独立模块）、FISCO BCOS（Solidity）
> **三份合约源码都不参与 hermetic 构建编译**。所有合约均在**迁移部署期**按
> [`docs/real-chain-migration.md`](../docs/real-chain-migration.md) 的指南逐链校验、编译与部署。

本文件是三链上链合约的**权威交付索引**：给出每条链的角色定位、合约名、方法清单、后端固化常量出处、
源码路径与交付状态，以及三套工具链的关键差异。逐项命名与已交付源码逐字一致（grep 交叉核对）。

---

## ① 三链角色（一句话）

- **监管链 = ChainMaker**：承担跨域可信监管与存证——接收登记（receive-registration）、中继/回执追踪
  （relay/receipt trace）、身份索引（identity index）、授权登记（authorization）、审计留痕（audit）。
- **运营链 = Fabric**：承载运营方业务——跨链代提交/回执（cross-chain submit/ack）、任务申请提交
  （mission application submit）、审核/通过/撤销留痕（review/pass/pass-revoke record）。
- **管理链 = FISCO BCOS**：承担管理方职能——任务申请的目标侧记录（mission-application target recording），
  以及源链侧的跨链代提交/回执（source-side cross-chain submit/ack）。

---

## ② 合约索引表

> **状态**：全部合约为「部署期校验」——hermetic 构建不编译，命名以后端固化常量为权威来源，部署时按迁移指南校验。
> **预留**：标注「预留」的方法为设计期读方法（read/query），当前无活跃 Go 调用点，供后续查询接入。

### 监管链 · ChainMaker（Docker-Go，源路径 `contracts/chainmaker/<name>/contract.go`）

| 合约 | 方法清单 | 后端固化常量出处 | 状态 |
|---|---|---|---|
| `regulatory_record` | `RegisterReceive`, `VerifyCredential` | `internal/crosschain/policy.go:71` (`ContractRegRecord`) | 部署期校验 |
| `crosschain_trace` | `RegisterRelay`, `RegisterReceipt`, `QueryTrace`（预留） | `internal/crosschain/policy.go:72` (`ContractRegTrace`) | 部署期校验 |
| `identity_mapping` | `RegisterIndex`, `QueryIdentity`（预留） | `internal/crosschain/policy.go:73` (`ContractRegIdentity`) | 部署期校验 |
| `regulatory_authorization` | `RecordAuthorization`, `QueryAuthorization`（预留） | `internal/regulatory/service.go:61` (`ContractRegAuth`) | 部署期校验 |
| `audit_record` | `RecordInspection`, `QueryAudit`（预留） | `internal/regulatory/service.go:62` (`ContractAuditRec`) | 部署期校验 |

### 运营链 · Fabric（recordJSON 约定 + peer lifecycle，源路径 `contracts/fabric/chaincode/main.go`）

| 合约 | 方法清单 | 后端固化常量出处 | 状态 |
|---|---|---|---|
| `operator_business` | `CrosschainSubmit`, `CrosschainAck`, `SubmitApplication`, `RecordReview`, `RecordPass`, `RecordPassRevoke` | `internal/crosschain/policy.go:69` (`ContractFabricOperator`)；其中 `CrosschainSubmit` 亦为 `internal/crosschain/policy.go:74` (`SourceSubmitMethod`) | 部署期校验 |

### 管理链 · FISCO BCOS（Console sol2java/deploy，源路径 `contracts/fisco/uav_management.sol`）

| 合约 | 方法清单（+ 事件） | 后端固化常量出处 | 状态 |
|---|---|---|---|
| `uav_management` | `SubmitApplication`, `CrosschainSubmit`, `CrosschainAck`（事件 `SUBMITAPPLICATION` / `CROSSCHAINSUBMIT` / `CROSSCHAINACK`） | `internal/crosschain/policy.go:70` (`ContractFiscoManage`) | 部署期校验 |

---

## ③ 工具链差异一览

| 维度 | 监管链 ChainMaker | 运营链 Fabric | 管理链 FISCO BCOS |
|---|---|---|---|
| 合约语言/形态 | Docker-Go 合约 | Go chaincode（**独立模块** `skytrust-contracts/fabric`） | Solidity `^0.8`（`uav_management`） |
| 入口约定 | `//export initContract` / `//export invokeContract`，按 `case "<method>"` 分发 | `fabric-contract-api-go/contractapi`，方法挂在 `*OperatorBusiness` 上 | 合约函数 + 事件 |
| 传参约定 | 键值参数（`sdk.Instance.PutStateFromKeyByte` 等存证写入） | 方法接收 `recordJSON string`：迁移期传输层把 params map 序列化为 JSON 字符串后传入 | `mapping(string=>string)` 存证 + `require` 断言 + 事件触发 |
| 部署方式 | 经 cmc / Docker 工具链部署 | 经 peer lifecycle：package → install → approve → commit | 经 Console：sol2java → deploy |
| 版本对齐备注 | — | — | ⚠️ v3 版本对齐：子模块 node v2.7.0 / Console v3.8.0 / go-sdk v3.0.2 存在错配，按迁移指南 §2 统一 |

**Fabric recordJSON 约定补充**：迁移期 Fabric chaincode 的方法签名统一接收单一 `recordJSON string` 参数，
由跨域网关在传输侧把业务 params map 序列化为 JSON 字符串传入；合约内部解析 JSON 后落账。此为迁移期过渡约定，
真实 SDK 接入稳定后可能演进为强类型签名。

---

## ④ 部署与切换流程

完整的三链部署流程、`CHAIN_MODE` 切换（hermetic/sim → 真实链）以及 FISCO v3 版本对齐处理，见迁移手册
（migration playbook）：[`docs/real-chain-migration.md`](../docs/real-chain-migration.md)。

> 说明：该迁移指南文档为本计划的后续任务（Task 21）交付项，此处的指向为前置引用（forward-pointer）。

---

## ⑤ hermetic 构建声明（重申）

**hermetic 构建不编译本目录任何合约**——构建环境中无链 SDK、无 `solc`、无 Docker、无 cgo。
本目录三份合约均为**部署期校验**：在按 [`docs/real-chain-migration.md`](../docs/real-chain-migration.md)
执行迁移部署时，逐链完成编译、部署与功能校验。后端代码中以固化常量（见 ② 表「常量出处」列）引用合约名与方法名，
hermetic 测试仅依赖这些常量与 sim 适配器，不触达真实合约二进制。
