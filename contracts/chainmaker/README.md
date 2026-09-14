# contracts/chainmaker — ChainMaker 监管链存证合约源（Docker-Go）

**状态：部署期校验。** 本目录合约源不参与 `services/skytrust-backend` 的 hermetic
构建/测试门——链 SDK（`chainmaker.org/chainmaker/contract-sdk-go/v2`）不是 Go module
依赖，本目录位于 module 之外，仅在真实链迁移的部署环境编译、部署并验证。部署与校验
流程见 `docs/real-chain-migration.md` §4（Task 21 交付）；仓库根 `contracts/README.md`
为跨链总览（Task 20 交付）。本仓库任何自动化门都不编译本目录文件。

## 合约清单（5 个，每合约独立目录）

| 目录 | 合约名 | 状态键 | 方法 |
|---|---|---|---|
| `regulatory_record/` | `regulatory_record` | `REG/<cross_tx_id>`、`REG/<reg_record_id>` | `RegisterReceive`、`VerifyCredential` |
| `crosschain_trace/` | `crosschain_trace` | `TRACE/<cross_tx_id>/<seq>`（计数器 `TRACE/<cross_tx_id>/SEQ`） | `RegisterRelay`、`RegisterReceipt`、`QueryTrace`（预留） |
| `identity_mapping/` | `identity_mapping` | `ID/<sm9_identity>` | `RegisterIndex`、`QueryIdentity`（预留） |
| `regulatory_authorization/` | `regulatory_authorization` | `AUTH/<authorization_id>` | `RecordAuthorization`、`QueryAuthorization`（预留） |
| `audit_record/` | `audit_record` | `AUDIT/<mission_id>/<seq>`（计数器 `AUDIT/<mission_id>/SEQ`） | `RecordInspection`、`QueryAudit`（预留） |

合约名与后端固化常量逐字对应：`internal/crosschain/policy.go`（`ContractRegRecord` /
`ContractRegTrace` / `ContractRegIdentity`）、`internal/regulatory/service.go`
（`ContractRegAuth` / `ContractAuditRec` / `MethodRecordAuth` / `MethodRecordInsp`）。

## 方法 × 后端调用点对照（P6-R9 逐字转录）

| 合约.方法 | params 键集 | 后端调用点 |
|---|---|---|
| `regulatory_record.RegisterReceive` | `cross_tx_id`、`message_type`、`business_id`、`source_chain`、`source_chain_tx_id`、`sm3_hash` | `internal/crosschain/gateway.go:265` |
| `regulatory_record.VerifyCredential` | `reg_record_id`、`cross_tx_id`、`verify_result`、`policy_result`、`sm9_identity`、`sm3_hash` | `internal/crosschain/gateway.go:287` |
| `crosschain_trace.RegisterRelay` | `cross_tx_id`、`reg_record_id`、`final_target_chain`、`business_id` | `internal/crosschain/gateway.go:308` |
| `crosschain_trace.RegisterReceipt` | `cross_tx_id`、`reg_record_id`、`target_chain`、`target_chain_tx_id` | `internal/crosschain/gateway.go:348` |
| `identity_mapping.RegisterIndex` | `uav_id`、`manufacturer_id`、`operator_id`、`serial_no`、`sm9_identity` | `internal/crosschain/gateway.go:330`（经 `targetContractMethod`，`policy.go:81`；params = `MsgUAVRegisterProof` payload，必备键转录自 `policy.go:44` `requiredFields`） |
| `regulatory_authorization.RecordAuthorization` | `authorization_id`、`regulator_id`、`scope`、`target_type`、`target_id`、`reason`、`valid_from`、`valid_to`、`audit_hash` | `internal/regulatory/authorization.go:181` |
| `audit_record.RecordInspection` | `authorization_id`、`regulator_id`、`mission_id`、`route_verdict`、`payload_verdict`、`digest_match`、`signature_valid`、`audit_hash`、`inspected_at` | `internal/regulatory/inspection.go:264` |

**预留方法**（Go 侧暂无调用点，参数键按模型字段设计，方法体完整可部署）：

| 合约.方法 | params 键集 | 设计依据 |
|---|---|---|
| `crosschain_trace.QueryTrace` | `cross_tx_id`、`seq` | `model.CrosschainTx`（`cross_tx_id`）+ 存证键布局 |
| `identity_mapping.QueryIdentity` | `sm9_identity` | `model.IdentityMapping`（`SM9Identity`，json 键 `sm9_identity`） |
| `regulatory_authorization.QueryAuthorization` | `authorization_id` | `model.RegulatoryAuth`（`AuthorizationID`，json 键 `authorization_id`） |
| `audit_record.QueryAudit` | `mission_id`、`seq` | `RecordInspection` 存证主体 `mission_id`（对应 `model.RegulatoryAudit.Target` 语义）+ 存证键布局 |

行号基线：backend HEAD `92a30cc`（定位请以常量/方法名锚点为准，行号会随代码演进漂移）。

## 存证记录形态

各合约内 `buildRecordJSON(args, keys)` 按**固定键序**组装 JSON（键 = 上表 params 键，
值统一为字符串并做 `strconv.Quote` 转义），写入对应状态键。写方法主键参数为空时返回
`sdk.Error`；`invokeContract` 对未知方法返回 `unknown method` 错误。`crosschain_trace`
与 `audit_record` 的 `<seq>` 由合约内计数器键（`TRACE/<id>/SEQ`、`AUDIT/<id>/SEQ`）
自增分配，从 1 开始。

## Docker-Go 部署（部署环境执行；权威流程以 `docs/real-chain-migration.md` §4 为准）

前置：部署机可访问链 SDK 模块源（GOPROXY 或 vendor）；ChainMaker 节点已启用
docker-go 合约运行时；`cmc` 版本与链版本匹配。以 `regulatory_record` 为例，其余
4 合约同流程（替换合约名与目录）：

```bash
# 1) 构建合约二进制（本目录无 go.mod——部署期初始化，避免污染仓库 hermetic 门）
cd contracts/chainmaker/regulatory_record
go mod init regulatory_record
go get chainmaker.org/chainmaker/contract-sdk-go/v2@v2.3.3
GOOS=linux GOARCH=amd64 go build -o regulatory_record

# 2) 将二进制放入节点 docker-go 合约运行目录（容器名/路径按实际部署环境）
docker cp ./regulatory_record <chainmaker-node-container>:/chainmaker/<org-id>/contract/regulatory_record/regulatory_record

# 3) 管理员身份创建合约（runtime-type=DOCKER_GO）
cmc client contract user create \
  --contract-name=regulatory_record \
  --runtime-type=DOCKER_GO \
  --byte-code-path=./regulatory_record \
  --version=1.0 \
  --sdk-conf-path=<cmc-sdk-conf-path> \
  --admin-key-path=<admin-sign-key-path>
```

### 部署后校验（逐字键集冒烟）

对每个合约执行一次写 + 一次读，params 键必须与上表逐字一致（任何键名不匹配都视为
部署校验失败）：

```bash
# 写路径冒烟（regulatory_record.RegisterReceive 为例；交易类调用按 cmc 版本使用对应 invoke 命令）
cmc client contract user get \
  --contract-name=regulatory_record \
  --method=RegisterReceive \
  --sdk-conf-path=<cmc-sdk-conf-path> \
  --params="cross_tx_id=CX-smoke000001;message_type=UAV_REGISTER_PROOF;business_id=SMOKE-1;source_chain=fabric;source_chain_tx_id=SMOKE-TX-1;sm3_hash=<64-hex>"
```

校验断言（详见 `docs/real-chain-migration.md` §4）：

1. 5 个合约全部创建成功，runtime 均为 DOCKER_GO；
2. 每个源支撑方法用上表逐字键集调用返回成功（`sdk.Success`），状态键按前缀落库；
3. 主键参数缺失时返回对应 `required` 错误；
4. 未知方法名返回 `unknown method` 错误；
5. 预留方法（Query 系列）按设计参数可读回写路径存证的 JSON（键序稳定）。

## 目录约定

- 每合约一个目录，目录名 = 合约名 = 后端常量值；源文件统一为 `contract.go`。
- 本目录文件**永远不**被 `services/skytrust-backend` 的 `go build` / `go vet` /
  `go test` 触及；结构自查（package main、双 `//export`、方法 switch 覆盖、无桩内容）
  代替编译门，记录于 Task 17 报告。
