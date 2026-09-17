# contracts/chainmaker — ChainMaker 监管链存证合约源（Docker-Go）

**状态：已部署（v1.0.2，2026-09-17）。** 5 合约经 cmc（DOCKER_GO）部署于监管链
`chain1`（solo，wx-org.chainmaker.org），deploy/upgrade TxID 登记于
`docs/version-matrix.md` §5 且链上可查询（验收 §6.5-② PASS）。本目录合约源不参与
`services/skytrust-backend` 的 hermetic 构建/测试门——链 SDK
（`chainmaker.org/chainmaker/contract-sdk-go/v2`）不是 Go module 依赖，本目录位于
module 之外，仅在真实链迁移的部署环境编译、部署并验证。部署实况一键脚本：
`scripts/deploy-contracts.sh chainmaker-{build,deploy,upgrade}`；权威流程见
`docs/real-chain-migration.md` §4（Task 21 交付）；仓库根 `contracts/README.md`
为跨链总览（Task 20 交付）。本仓库任何自动化门都不编译本目录文件。

## 合约清单（5 个，每合约独立目录）

| 目录 | 合约名 | 状态键 | 方法 |
|---|---|---|---|
| `regulatory_record/` | `regulatory_record` | `REG/<cross_tx_id>`、`REG/<reg_record_id>` | `RegisterReceive`、`VerifyCredential`、`QueryState` |
| `crosschain_trace/` | `crosschain_trace` | `TRACE/<cross_tx_id>/<seq>`（计数器 `TRACE/<cross_tx_id>/SEQ`） | `RegisterRelay`、`RegisterReceipt`、`QueryTrace`（预留）、`QueryState` |
| `identity_mapping/` | `identity_mapping` | `ID/<sm9_identity>` | `RegisterIndex`、`QueryIdentity`（预留）、`QueryState` |
| `regulatory_authorization/` | `regulatory_authorization` | `AUTH/<authorization_id>` | `RecordAuthorization`、`QueryAuthorization`（预留）、`QueryState` |
| `audit_record/` | `audit_record` | `AUDIT/<mission_id>/<seq>`（计数器 `AUDIT/<mission_id>/SEQ`） | `RecordInspection`、`QueryAudit`（预留）、`QueryState` |

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

**部署期合约演进（指南 §5-② 授权，不触碰后端调用面）**：链上现为 **v1.0.2**——
v1.0.1 为 contract-sdk-go v2.3.10 API 适配 + `stateKey` 消毒（`/`→`_` 等，读写同规）；
v1.0.2 为 5 合约统一补充通用读方法 **`QueryState(state_key)`**（入参单段键按与写路径
一致的 stateKey 规则消毒，如 `REG/CX-x` → `REG_CX_x`；链上无值返回 error）。后端
`ChainTransport.QueryState`（`internal/chainadapter/real/chainmaker/transport.go`）即经
`QueryState` 实现；三版 TxID 全部登记 `docs/version-matrix.md` §5。

行号基线：backend HEAD `92a30cc`（定位请以常量/方法名锚点为准，行号会随代码演进漂移）。

## 存证记录形态

各合约内 `buildRecordJSON(args, keys)` 按**固定键序**组装 JSON（键 = 上表 params 键，
值统一为字符串并做 `strconv.Quote` 转义），写入对应状态键。写方法主键参数为空时返回
`sdk.Error`；`invokeContract` 对未知方法返回 `unknown method` 错误。`crosschain_trace`
与 `audit_record` 的 `<seq>` 由合约内计数器键（`TRACE/<id>/SEQ`、`AUDIT/<id>/SEQ`）
自增分配，从 1 开始。

## Docker-Go 部署（部署实况，2026-09-17；权威流程以 `docs/real-chain-migration.md` §4 为准）

以下为**实际执行并验证通过**的命令（一键化：`scripts/deploy-contracts.sh chainmaker-*`）。
环境：节点 chainmaker-go v2.3.10（solo）、cmc v2.3.10（`/opt/chains/chainmaker/bin/cmc`）、
合约 SDK contract-sdk-go/v2 v2.3.10、VM 引擎容器 `VM-GO-wx-org-chain1`
（`chainmaker-vm-engine:v2.3.9`，`--network host`）。

```bash
# 1) 构建（本目录无 go.mod——构建脚手架在 /opt/chains/chainmaker/build/<name>/，
#    含 go.mod[contract-sdk-go/v2 v2.3.10]；拷贝 contract.go 进去静态构建后 py7zr 打 7z，
#    cmc 的 --byte-code-path 收 .7z 而非裸二进制）
cp contracts/chainmaker/regulatory_record/contract.go /opt/chains/chainmaker/build/regulatory_record/
cd /opt/chains/chainmaker/build/regulatory_record
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -o regulatory_record .
python3 -c "import py7zr; z=py7zr.SevenZipFile('regulatory_record.7z','w'); z.write('regulatory_record',arcname='regulatory_record'); z.close()"

# 2) 管理员身份创建合约（首次 v1.0.0；upgrade 同参数改 --version，--runtime-type 必填 DOCKER_GO）
CMC=/opt/chains/chainmaker/bin/cmc
CERTS=/opt/chains/chainmaker/chainmaker-go/config/wx-org-solo/certs/wx-org.chainmaker.org
$CMC client contract user create \
  --chain-id chain1 --org-id wx-org.chainmaker.org \
  --contract-name regulatory_record --version 1.0.0 \
  --byte-code-path /opt/chains/chainmaker/build/regulatory_record/regulatory_record.7z \
  --runtime-type DOCKER_GO --params '{}' \
  --sdk-conf-path /opt/chains/chainmaker/sdk.yml \
  --admin-key-file-paths $CERTS/user/admin1/admin1.sign.key \
  --admin-crt-file-paths $CERTS/user/admin1/admin1.sign.crt \
  --admin-org-ids wx-org.chainmaker.org \
  --sync-result --timeout 30
```

部署实况要点（偏差全部记录 `docs/version-matrix.md` §8）：

- **无需 `docker cp` 二进制进节点容器**——DOCKER_GO 运行时由 cmc 上传 7z 字节码，
  VM 引擎容器按需拉起合约进程；
- 回执核验：`cmc query tx <txid> --chain-id chain1 --sdk-conf-path … --with-rw-set=false`
  ——protobuf-JSON **省略零值**（`result.code` 缺省即 SUCCESS，`contract_result.message`
  为 `Success`）；
- 后端 SDK 连接：信任根 `CHAINMAKER_CA_CERT_FILE` 必须是**目录**（SDK conn_pool 对路径
  readdir 装载全部 .crt；传单文件报 `not a directory`——实况 `/opt/chains/chainmaker/trust-roots-solo`）；
  双证书对（TLS `client1.tls.*` + 签名 `client1.sign.*`）。

### 部署后校验（逐字键集冒烟，部署实况命令）

写路径用 `user invoke`（交易），读路径用 `user get --result-to-string`（查询）；
params 为 JSON（键集与上表逐字一致，任何键名不匹配都视为部署校验失败）：

```bash
# 写冒烟（regulatory_record.RegisterReceive 为例，其余 6 个源支撑方法同式）
$CMC client contract user invoke --chain-id chain1 --org-id wx-org.chainmaker.org \
  --contract-name regulatory_record --method RegisterReceive \
  --params '{"cross_tx_id":"CX-smoke000001","message_type":"UAV_REGISTER_PROOF","business_id":"SMOKE-1","source_chain":"fabric","source_chain_tx_id":"SMOKE-TX-1","sm3_hash":"<64-hex>"}' \
  --sdk-conf-path /opt/chains/chainmaker/sdk.yml --sync-result --timeout 30

# 读冒烟（预留 QueryTrace / QueryIdentity / QueryAuthorization / QueryAudit + v1.0.2 QueryState）
$CMC client contract user get --chain-id chain1 --org-id wx-org.chainmaker.org \
  --contract-name crosschain_trace --method QueryTrace \
  --params '{"cross_tx_id":"CX-smoke000001","seq":"1"}' \
  --sdk-conf-path /opt/chains/chainmaker/sdk.yml --result-to-string --timeout 30
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
  `go test` 触及；结构自查（package main、`InitContract`/`InvokeContract` 方法对 +
  `main()` 入口（contract-sdk-go v2.3.10 形态，无 `//export` 注释）、方法 switch 覆盖、
  无桩内容）代替编译门，记录于 Task 17 报告。
