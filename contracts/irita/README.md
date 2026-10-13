# IRITA 证照链 —— 无合约工件（内置 `record` 模块承载 `license_registry`）

> 本目录**没有可部署的合约工件**——这不是交付缺失，而是链形态使然：IRITA 无「合约部署」
> 概念，后端的逻辑合约 `license_registry`（固化常量 `internal/crosschain/policy.go:71`
> `ContractLicenseRegistry`；白名单 `internal/chainadapter/irita/adapter.go:18`）由链内置的
> **`record` 模块**（irismod，随链启用）承载。本文件是该映射的权威说明（Task 2 起
> `internal/chainadapter/irita/` 注释指向此处），规则以 **Task 1 Step 7 真链校准实录**为准
> （`docs/superpowers/plans/2026-10-13-fourth-chain-license-explorer.md`「实施偏差记录」节）。

---

## ① 链角色与形态

- **证照链 = IRITA**（第 4 链，2026-10-13 pass 迁移引入）：承载飞行通行证的签发/吊销登记
  （FLIGHT_PASS / PASS_REVOKE 的**源链**，`policy.go:16-17`），SM2 双层国密、
  4 验证人 Tendermint BFT、chain-id `skytrust-license`。
- 链上数据形态：一笔业务写 = 一条 `record`（`MsgCreateRecord`），零合约字节码、零部署交易。
- 部署登记（节点拓扑 / 二进制 sha256 / 启用锚点）：`docs/version-matrix.md` §12；
  启用锚点 TxID 存于 `/opt/irita/net/ANCHOR_TXID.txt`（账本不可毁——与 P6-R6 同源红线）。

## ② 业务写 → record 映射（写路径 = CLI shell-out，PoC 实证）

后端调用面（13 步协议源链步 3/12）：`license_registry.CrosschainSubmit` /
`license_registry.CrosschainAck`（`internal/crosschain/gateway.go:219/370`）。真实传输
（`internal/chainadapter/real/irita/transport.go`，`//go:build realchains`，零链 SDK——
stdlib net/http + os/exec）将其映射为：

```
irita tx record create <SM3hex(contentsJSON)> SM3 \
  --uri "skytrust://license_registry/<METHOD>/<key>" \
  --meta '<contentsJSON>' \
  --from <IRITA_KEY_NAME> --chain-id <IRITA_CHAIN_ID> \
  --node tcp://<IRITA_RPC host:port> --keyring-backend test -y --output json
# env HOME=<IRITA_CLI_HOME>（keyring-test 家目录注入）
```

| 业务概念 | record 模块承载位 | 规则 |
|---|---|---|
| 业务键（`cross_tx_id` → `business_id` → `record_key` 依序首个非空） | `Content.URI` | `skytrust://license_registry/<METHOD>/<key>`；`<key>`/`<METHOD>` 按 stateKey 规则消毒（`[0-9a-zA-Z_.]` 保留，其余 → `_`，与 `contracts/chainmaker/*/contract.go:108` 逐字一致），如 `SMOKE/task5-1` → `SMOKE_task5_1` |
| contents（params map JSON） | `Content.Meta` | Go `json.Marshal`（键排序 → 摘要确定） |
| 摘要 | `Content.digest` / `digest_algo` | `SM3hex(contentsJSON)` / `SM3`（国密合规 P6-R4；模块无算法白名单，位置参数 = digest + algo） |
| 交易费/气 | — | 零 fee 可上链（fee 事件属性 null 实证）；默认 gas 200000 够用 |

**成功判据**（传输层）：CLI exit 0 且输出 JSON `code==0` → `txhash` 大写为 TxID →
轮询 `/tx?hash=0x<…>` 至 inclusion（30s 超时 → 传输级 error，触发网关 withRetry）。

## ③ record-id 规则（链上派生，客户端**不可指定**）

- `recordID = hash(record字节 || intraTxCounter)`——由链计算，**hex 形态 64 位小写**；
  设计早期的「业务键 record-id」形态不可实现，业务键改由 `Content.URI` 承载（上表）。
- 唯一取回通道：该交易的 `create_record` 事件属性 `record_id`
  （`GET /tx?hash=0x<TXHASH>`；RPC 事件 `type` 明文、attribute `key`/`value` 均 base64）。
  真实传输在 SubmitTx/QueryTx 中将其放入回执 `Ret`。

## ④ 读路径（裸 Tendermint RPC）

- **QueryTx**：`GET /tx?hash=0x<UPPER txhash>` → `tx_result.code`（0=成功）/`height`/事件。
- **QueryState**（record 读）：JSON-RPC **POST** `abci_query`
  `{"path":"/store/record/key","data":"01<recordIDhex>","prove":true,"height":"0"}`——
  int64 参数必须 JSON 字符串；`data` = `0x01`(store 前缀) `||` recordID；`height="0"`→latest
  （`height≥1`+prove 被 SDK guard 拒绝 code=18）；响应证明字段为 **camelCase `proofOps`**，
  `prove=true` 返回完整 ics23 双段证明（iavl 包含证明 + simple 多 store 提交证明，真实可用）；
  `value` = base64(protobuf `Record{tx_hash, contents[]{digest,digest_algo,uri,meta}, creator}`)。
  key 只接受 **64-hex record-id 或 txhash**（txhash 经 `/tx` 提取 `record_id` 再查 store）。
- **业务键反查不可实现**（record 模块无二级索引）→ 传输明示错误，绝不静默
  （QueryState 全代码库零业务调用点——grep 证据见计划偏差记录 Task 1 §4，重定义安全）。
- **Health**：`GET /status`（`sync_info.catching_up=false`）。
- **BlockQuerier**（explorer 数据源，source=rpc 如实）：`/status`（块高）、
  `/block?height=`（块详情；TxID = SHA256(原始 tx 字节) 大写 hex）、`/net_info`（已连接对端）；
  `/validators` 共识地址与 p2p node_id 之间 RPC 无映射——节点角色按 `/status validator_info`
  （self）与 `/net_info` peers 如实报告，绝不猜测。

## ⑤ 运行环境（.env，模板见 services/skytrust-backend/.env.example）

`IRITA_RPC` / `IRITA_CHAIN_ID` / `IRITA_CLI_BIN` / `IRITA_CLI_HOME` / `IRITA_KEY_NAME`
——缺任一即 fail-fast（NewFactory 显式点名）。业务写账户 `skytrust-biz`（创世注资，
txhash 登记于计划偏差记录 Task 1 §5）。hermetic 构建不编译 real 传输（`realchains`
标签隔离）；sim 形态见 `internal/chainadapter/sim/`（inproc，行为参照）。
