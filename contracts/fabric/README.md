# contracts/fabric — Fabric 运营方业务链码源（operator_business）

**状态：部署期校验 / 独立 Go module（hermetic 环境不拉取本 module 依赖、不编译）。**
本目录是独立于 `services/skytrust-backend` 的 Go module（`skytrust-contracts/fabric`），
依赖 `github.com/hyperledger/fabric-contract-api-go v1.2.2`。该 SDK **不是**后端依赖：
hermetic 环境不在本目录运行任何 `go` 命令、不拉取依赖、不编译——链码源仅在真实链
迁移的部署环境执行 `go mod tidy && go build` 后编译、部署并验证。`go.mod` 中 require
版本以部署期 `go mod tidy` 实际解析为准；`go.sum` 由部署期生成，**仓库不提交半成品
go.sum**（本目录没有也不应有 go.sum）。后端全量测试门（在 `services/skytrust-backend`
运行）不下降至本目录（嵌套
独立 module），保持 315 PASS / 0 FAIL 零影响。部署与校验流程以
`docs/real-chain-migration.md` §4 为准（Task 21 交付，前向指针）；仓库根
`contracts/README.md` 为跨链总览（Task 20 交付）。

## 目录布局

```
contracts/fabric/
├── go.mod              # module skytrust-contracts/fabric（go 1.25.0）
├── chaincode/
│   └── main.go         # operator_business 链码源（package main）
└── README.md           # 本文件
```

## 方法 × 后端调用点对照（P6-R9 逐字转录）

链码名与后端固化常量逐字对应：合约 `operator_business` =
`internal/crosschain/policy.go:69` `ContractFabricOperator`；方法 `CrosschainSubmit` =
`policy.go:74` `SourceSubmitMethod`；后端链码白名单 =
`internal/chainadapter/fabric/adapter.go:17` `RegisteredContracts`（仅此合约）。

| 方法 | params/payload 键集 | 主键 | 状态键 | 后端调用点 |
|---|---|---|---|---|
| `CrosschainSubmit` | `cross_tx_id`、`message_type`、`business_id` | `cross_tx_id` | `SUBMIT/<cross_tx_id>` | `internal/crosschain/gateway.go:214-216`（合约经 `sourceContract("fabric")` `policy.go:97-98`） |
| `CrosschainAck` | `cross_tx_id`、`reg_record_id`、`target_chain_tx_id`、`status` | `cross_tx_id` | `ACK/<cross_tx_id>` | `internal/crosschain/gateway.go:365-368` |
| `SubmitApplication` | `application_id`、`mission_id`、`sm3_hash` | `application_id` | `APP/<application_id>` | `internal/uavbusiness/mission.go:352-354`（合约字面量 `"operator_business"`） |
| `RecordReview` | `review_id`、`application_id`、`mission_id`、`result`、`reviewer` | `review_id` | `REVIEW/<review_id>` | `gateway.go:330` 经 `targetContractMethod` `policy.go:85`；键集 = `requiredFields[MISSION_REVIEW_RESULT]` `policy.go:46` |
| `RecordPass` | `pass_id`、`mission_id`、`uav_id`、`route`、`valid_from`、`valid_to`、`sm3_hash` | `pass_id` | `PASS/<pass_id>` | `gateway.go:330` 经 `targetContractMethod` `policy.go:87`；键集 = `requiredFields[FLIGHT_PASS]` `policy.go:47` |
| `RecordPassRevoke` | `pass_id`、`mission_id`、`reason`、`operator` | `pass_id` | `REVOKE/<pass_id>` | `gateway.go:330` 经 `targetContractMethod` `policy.go:89`；键集 = `requiredFields[PASS_REVOKE]` `policy.go:48` |

行号基线：backend HEAD `0362681`（定位请以常量/方法名锚点为准，行号会随代码演进漂移）。

**target 路径方法主键推导依据**：网关 13 步协议第 10 步（`gateway.go:330`）将
`req.Payload` 原样透传为 params，且 `CheckPayload`（`policy.go:52-64`）强制 payload 键集
恰为 `requiredFields[msgType]`（缺失/nil/空串即拒绝）——故三个 `Record*` 方法的键集由
source 唯一确定。主键取该消息类型的唯一业务标识：`RecordReview` 取 `review_id`
（`application_id`/`mission_id` 为被审查对象外键）；`RecordPass` 取 `pass_id`
（通行证唯一标识）；`RecordPassRevoke` 取 `pass_id`（吊销 payload 无独立吊销号，
以被吊销通行证为键；吊销为流程终态、单证至多一次，`REVOKE/<pass_id>` 无冲突）。

## recordJSON 参数形态约定（迁移期传输适配）

后端调用面 `SubmitTx(ctx, contract, method, params)` 的 params 为 `map[string]any`，
而链码方法签名统一为
`func (c *OperatorBusiness) <Method>(ctx contractapi.TransactionContextInterface, recordJSON string) (string, error)`：
后端 real 传输实现时将 params map **JSON 编码为单个字符串参数**传入（Fabric peer
invoke 的 `Args` 即字符串数组，单参数 recordJSON 与之一一对应）。链码内部
`json.Unmarshal` 回 `map[string]any`，校验主键非空（空则返回 error），随后
`PutState("<前缀>/<主键>", recordJSON 原文)` 并返回主键。此约定同步写入
`docs/real-chain-migration.md` §5（Task 21 交付，前向指针）。

## test-network 部署（peer lifecycle 序列；`<placeholder>` 由部署者填写）

以下命令在部署环境执行（权威流程以 `docs/real-chain-migration.md` §4 为准）。
hermetic 环境**禁止**运行第 0 步及任何 `go` 命令。

```bash
cd contracts/fabric
export FABRIC_CFG_PATH=<fabric-sample-config-dir>

# 0) 拉取依赖并 vendor（仅部署环境；生成 go.sum，不回流仓库）
go mod tidy
GO111MODULE=on go mod vendor

# 1) 打包：--path 指向含 package main 的 chaincode/ 子目录，Fabric golang 平台向上
#    定位 go.mod 模块根并在包 metadata 记录模块相对子路径（不同 peer 版本 builder
#    行为差异以 §4 部署期实测为准；vendor 目录随包携带依赖）
peer lifecycle chaincode package operator_business.tar.gz \
  --path ./chaincode --lang golang --label operator_business_1.0

# 2) Install（每个参与 org 的 peer 各执行一次）
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=<org-msp-id>
export CORE_PEER_TLS_ROOTCERT_FILE=<org-peer-tls-cafile>
export CORE_PEER_MSPCONFIGPATH=<org-admin-msp-config-dir>
export CORE_PEER_ADDRESS=<org-peer-address>
peer lifecycle chaincode install operator_business.tar.gz

# 3) 取安装后的 package ID
peer lifecycle chaincode queryinstalled --output json
export CC_PACKAGE_ID=<operator_business_1.0:hash>

# 4) Approve（每个 org）
peer lifecycle chaincode approveformyorg \
  --channelID <channel-name> --name operator_business \
  --version <cc-version> --sequence <sequence> \
  --package-id "$CC_PACKAGE_ID" \
  --orderer <orderer-address> --tls --cafile <orderer-tls-cafile>

# 5) Commit（集齐所需 org 审批后）
peer lifecycle chaincode commit \
  --channelID <channel-name> --name operator_business \
  --version <cc-version> --sequence <sequence> \
  --orderer <orderer-address> --tls --cafile <orderer-tls-cafile> \
  --peerAddresses <org1-peer-address> --tlsRootCertFiles <org1-peer-tls-cafile>

# 6) 冒烟：CrosschainSubmit 写 SUBMIT/<cross_tx_id> 并返回主键
peer chaincode invoke -C <channel-name> -n operator_business \
  --peerAddresses <org1-peer-address> --tlsRootCertFiles <org1-peer-tls-cafile> \
  --orderer <orderer-address> --tls --cafile <orderer-tls-cafile> \
  -c '{"function":"CrosschainSubmit","Args":["{\"cross_tx_id\":\"CX-DEPLOY-SMOKE-001\",\"message_type\":\"MISSION_APPLICATION\",\"business_id\":\"APP-DEPLOY-SMOKE-001\"}"]}'
```

注：链码表面仅含后端调用面所需 6 个写方法（无查询方法）；状态核验经 peer 区块/
world-state 工具在部署期执行。合约名 `operator_business` 必须与链码 name 一致
（后端白名单按此名调用）。

## 前向指针

- `docs/real-chain-migration.md` §4：部署与校验流程实例化（Task 21 交付）。
- `docs/real-chain-migration.md` §5：recordJSON 传输适配约定（Task 21 交付）。
