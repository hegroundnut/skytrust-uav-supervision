# 三幕展示流程 API 实跑报告

> 配套文档：[`docs/demo-showcase.md`](demo-showcase.md)（流程设计）·
> [`scripts/demo-showcase.sh`](../scripts/demo-showcase.sh)（一键实跑器）·
> [`docs/apifox/`](apifox/)（OpenAPI 契约与 24 个测试场景）
>
> 本报告按「使用的 API → 提供的参数 → 返回的结果 → 过程解说」逐步记录一次
> **真实三链后端**上的完整实跑，全部数据为原始响应，未做修饰。

## 实跑元信息

| 项 | 值 |
|---|---|
| 运行时间 | 2026-09-17 22:53:11.927 → 22:53:21.106（约 9.2 秒，51 次调用） |
| 后端 | `http://127.0.0.1:8080`，`CHAIN_MODE=real`（ChainMaker 监管链 / Fabric 运营链 / FISCO BCOS 管理链，全程 ONLINE） |
| 运行编号 | `TS=225311`（所有演示 ID 携带该时间戳后缀） |
| 链式关键 ID | `MID_A=MISSION-2026-001` `MID_B=MISSION-2026-002` `PASS_A=PASS-2026-001` `S1=SESS-41a38ba62af7` |
| 原始证据 | 51 个完整响应 JSON 存于部署机 `/tmp/skytrust-demo/NN-*.json` |
| 非零 code | 仅步骤 43 一处，`code=5002` —— **这是设计内行为**（未授权密文封缄），非故障 |

**通用约定**（详见 `docs/apifox/skytrust-backend.openapi.json`）：

- 64 个端点全部为 `POST` + JSON 请求体；成功响应 `code=0, message="success"`。
- 每个响应都带 `trace_id`（全链路追踪号）与 `timestamp`（服务端时间）。
- 列表端点统一返回 `data.records[]` + `data.page/page_size/total`。
- 文中 64-hex 交易哈希、0x 前缀 FISCO 哈希、140 字符 SM9 签名做了截断显示
  （`前缀…`），完整值在原始证据文件中；步骤 8 保留一组完整四段 TxID 作为存证样例。

**步骤 ↔ 测试场景映射**（场景定义见 `docs/apifox/skytrust-test-scenarios.json`）：

| 步骤 | 场景 | 步骤 | 场景 | 步骤 | 场景 |
|---|---|---|---|---|---|
| 1, 51 | TC1-01 三链在线 | 16-18 | TC1-05/06 冲突检测与协调 | 31-33 | TC2-04 虫洞隧道部署 |
| 6-8 | TC1-02 跨链中继存证 | 19-22 | TC1-07 / TC2-02 许可签发·吊销拒绝 | 34-35 | TC2-05 虫洞检测与隔离 |
| 9-13 | TC1-02 任务申请跨链闭环 | 23 | TC1-08 跨链批量吞吐 | 36-37 | TC2-06/07 自动规避与恢复 |
| 14-15 | TC1-05 冲突前置 | 24-30 | TC2-01/03 会话建立·持续交互 | 39 | TC2-08 攻防对比实验 |
| 40-42 | TC3-01/02/03 告警·七级追踪 | 43 | TC3-04 未授权核验封缄 | 44-47 | TC3-05/06 授权闭环·偏航核验 |
| 48-49 | TC3-07 审计上链与导出 | 50 | 驾驶舱聚合 | | |

---

# 幕〇 · 预检与基线（步骤 1-3）

### 步骤 1 · 三链状态预检

- **使用的 API**：`POST /api/chain/status`（基础组）
- **提供的参数**：`{}`
- **返回的结果**：

```json
{"code":0,"message":"success","data":{
  "chains":{"chainmaker":"ONLINE","fabric":"ONLINE","fisco-bcos":"ONLINE"},
  "count":3},
 "trace_id":"TRACE-20260917-0548f7","timestamp":"2026-09-17 22:53:11.927"}
```

- **过程解说**：对三条真实链各发一次原生 `Health()` 探针（ChainMaker SDK 链信息查询、
  Fabric peer 生命周期查询、FISCO `getBlockNumber`），全部 `ONLINE` 才允许后续流程
  继续 —— 对应验收场景 TC1-01，也是 fail-fast 诚实性原则（R0'）的第一道闸。

### 步骤 2 · 业务库复位

- **使用的 API**：`POST /api/demo/reset`（演示组）
- **提供的参数**：`{}`
- **返回的结果**：

```json
{"code":0,"message":"success","data":{
  "started_at":"2026-09-17 22:53:11.954","reset_at":"2026-09-17 22:53:11.999",
  "tables_cleared":20},
 "trace_id":"TRACE-20260917-d13072","timestamp":"2026-09-17 22:53:11.999"}
```

- **过程解说**：45ms 清空 20 张业务表（任务/许可/会话/告警/跨链流水等），保证每次
  演示从确定基线开始，ID 计数器复位（因此本次 `MISSION-2026-001` 从头编号）。
  **真实链上数据绝不受影响** —— P6-R6 红线：real 传输层不实现 `Resettable` 接口，
  reset 在编译期就无法触达链。清掉上一轮遗留的 NODE-X/NODE-Y `ISOLATED` 残留态，
  是幕二虫洞开关能再次打开的前提（否则报 4001）。

### 步骤 3 · 基线数据重灌

- **使用的 API**：`POST /api/demo/init`（演示组）
- **提供的参数**：`{}`
- **返回的结果**：

```json
{"code":0,"message":"success","data":{"created":{
  "manufacturer":3,"operator":3,"uav":7,"route_segment":5,
  "network_node":8,"identity_mapping":1,"audit_log":1},"skipped":{}},
 "trace_id":"TRACE-20260917-e8961c","timestamp":"2026-09-17 22:53:12.096"}
```

- **过程解说**：重灌主数据基线 —— 3 厂商、3 运营商、7 架无人机、5 条航段
  （R101/R205/R208/R209/R306）、8 个链下网络节点（MGR + N1-N4 + UAV-A-001-NODE
  在线，攻击者节点 NODE-X/NODE-Y 预置为 OFFLINE）、1 条身份映射（幕三追踪用）、
  1 条审计日志。`skipped:{}` 表示全部新建，无幂等跳过。

---

# 幕一 · 系统一：任务跨域协同（步骤 4-23）

> 主线：主数据浏览 → 无人机注册（跨链存证）→ 任务 A 申请-审核（Fabric→ChainMaker→FISCO
> 两跳四段闭环）→ 任务 B 冲突检测与消解 → 通行许可签发/验证/吊销 → 跨链流水盘点。

### 步骤 4 · 运营商列表

- **使用的 API**：`POST /api/operator/list`（主数据组）
- **提供的参数**：`{}`（可带 `page/page_size/status` 过滤，此处取默认第一页）
- **返回的结果**（节选 3 条之 1，`total:3`）：

```json
{"code":0,"data":{"page":1,"page_size":20,"total":3,"records":[
  {"operator_id":"Operator-A","name":"演示运营商A","status":"ACTIVE",
   "qualification_status":"QUALIFIED","chain_org_id":"org-operator-a",
   "contact":"ops-a@skytrust.demo",
   "created_at":"2026-09-17 22:53:12.026","updated_at":"2026-09-17 22:53:12.026"}]}}
```

- **过程解说**：Operator-A/B/C 三家运营商均 `ACTIVE + QUALIFIED`（资质合格），
  `chain_org_id` 是其在 Fabric 运营链上的组织身份。后续任务 A 归 Operator-A、
  任务 B 归 Operator-B，为冲突剧情埋下主体。

### 步骤 5 · 航段列表

- **使用的 API**：`POST /api/route/list`（主数据组）
- **提供的参数**：`{}`
- **返回的结果**（节选 2 条之 5，`total:5`）：

```json
{"code":0,"data":{"total":5,"records":[
  {"route_id":"R101","zone":"Zone-A","start_point":"A-ENTRY(30.510,114.310)",
   "end_point":"A-EXIT(30.540,114.340)","altitude_min":60,"altitude_max":120,
   "corridor_status":"OPEN"},
  {"route_id":"R205","zone":"Zone-A","start_point":"A-EXIT(30.540,114.340)",
   "end_point":"B-GATE(30.572,114.372)","altitude_min":80,"altitude_max":120,
   "corridor_status":"OPEN"}]}}
```

- **过程解说**：5 条航段全部 `OPEN`。**R205 是剧情关键**：任务 A 申请
  R101→R205→R306 三段，任务 B 稍后也要走 R205 且时间窗重叠，冲突检测（步骤 16）
  将在这条航段上命中 `ROUTE` 型冲突。注意 R205 的 `altitude_min=80` 高于 R101 的 60。

### 步骤 6 · 无人机注册（自动跨链存证）

- **使用的 API**：`POST /api/uav/register`（无人机组）
- **提供的参数**：

```json
{"manufacturer_id":"Manufacturer-B","model":"DJI-M350","operator_id":"Operator-A",
 "serial_no":"SN-DEMO-225311","uav_id":"UAV-DEMO-225311"}
```

- **返回的结果**（节选；`crosschain` 完整结构见步骤 8）：

```json
{"code":0,"data":{
  "uav":{"uav_id":"UAV-DEMO-225311","manufacturer_id":"Manufacturer-B",
    "operator_id":"Operator-A","model":"DJI-M350","serial_no":"SN-DEMO-225311",
    "sm9_identity":"SM9-ID-UAV-DEMO-225311","status":"VERIFIED"},
  "crosschain":{"cross_tx_id":"CX-a6e62bdc47f5","source_chain":"fabric",
    "final_target_chain":"chainmaker","message_type":"UAV_REGISTER_PROOF",
    "status":"SUCCESS","latency_ms":516,"verify_result":"PASS","policy_result":"PASS"}}}
```

- **过程解说**：一次调用完成两件事 —— ① 注册入库并**自动派生 SM9 身份**
  （`SM9-ID-UAV-DEMO-225311`），状态直达 `VERIFIED`；② 同步触发跨链存证：注册证明
  先写 Fabric 运营链，经 ChainMaker 监管链 receive+relay 两笔登记，最终落
  ChainMaker 目标存证，`UAV_REGISTER_PROOF` 闭环 516ms `SUCCESS`。
  对应 TC1-02 的第一段剧情：业务动作天然携带跨链审计痕迹。

### 步骤 7 · 无人机查询

- **使用的 API**：`POST /api/uav/query`（无人机组）
- **提供的参数**：`{"uav_id":"UAV-DEMO-225311"}`
- **返回的结果**：

```json
{"code":0,"data":{"uav_id":"UAV-DEMO-225311","manufacturer_id":"Manufacturer-B",
  "operator_id":"Operator-A","model":"DJI-M350","serial_no":"SN-DEMO-225311",
  "sm9_identity":"SM9-ID-UAV-DEMO-225311","status":"VERIFIED",
  "created_at":"2026-09-17 22:53:12.219","updated_at":"2026-09-17 22:53:12.751"}}
```

- **过程解说**：回读验证注册结果。`created_at`（12.219）与 `updated_at`（12.751）
  相差 532ms，正是跨链存证往返后回写 `VERIFIED` 状态的时间差 —— 库内时间戳本身
  就能佐证"先落库、后跨链、再确认"的时序。

### 步骤 8 · 跨链存证四段 TxID 查验（存证样例）

- **使用的 API**：`POST /api/crosschain/query`（跨链网关组）
- **提供的参数**：`{"cross_tx_id":"CX-a6e62bdc47f5"}`
- **返回的结果**（**完整保留一组四段 TxID 作为存证样例**，签名截断）：

```json
{"code":0,"data":{
  "cross_tx_id":"CX-a6e62bdc47f5",
  "source_chain":"fabric","final_target_chain":"chainmaker",
  "message_type":"UAV_REGISTER_PROOF","business_id":"UAV-DEMO-225311",
  "source_chain_tx_id":"564e5b407c37266788594c4d3dddc3ca9ab5b0f920e08d7c5f79b994faf9ed7a",
  "reg_receive_tx_id":"18d6235ee46c03c7ca9145190b35b0018868c19b23d74a659c11c29cbdd222c6",
  "reg_relay_tx_id":"18d6235eea3537a7caa7ebc0a4697d2f116a750f2d4b40bcbc330502880d3e76",
  "target_chain_tx_id":"18d6235eec57aa51ca4400b192bb491c40e3d41673fa46fb84effff20d1b87a4",
  "reg_record_id":"REGREC-d983d5e2cd93",
  "sm3_hash":"de588a836a21adc52630e77d8df86285bb1d328a1a6b87d5d135f12a462f59ba",
  "sm9_identity":"SM9-ID-UAV-DEMO-225311",
  "signature":"MGYEIFO1FSkIQsSg3M2qmCqpNkGr…",
  "verify_result":"PASS","policy_result":"PASS","status":"SUCCESS",
  "error_code":0,"latency_ms":516,
  "idempotency_key":"b464ab3952410edbc82b560809c98faa8de26b029f84974a1ef252851f106b3d"}}
```

- **过程解说**：两跳四段存证链的完整形态 ——
  ① `source_chain_tx_id`（Fabric 64-hex，源链业务上链）→
  ② `reg_receive_tx_id`（ChainMaker，监管链签收登记）→
  ③ `reg_relay_tx_id`（ChainMaker，监管链中继转发）→
  ④ `target_chain_tx_id`（ChainMaker 目标存证，本例终点也是监管链）。
  四段 TxID 均可在对应链的浏览器/控制台独立查验（gchain :4173 可查 ChainMaker 段）。
  载荷带 SM3 摘要 + SM9 签名，`verify_result=PASS`（验签通过）、`policy_result=PASS`
  （监管策略通过），`idempotency_key` 防重放。这是 §6.5 验收第 4 项
  「两跳四段 TxID 持久化可验证」的运行时形态。

### 步骤 9 · 创建任务 A（描述密文落库）

- **使用的 API**：`POST /api/mission/create`（任务组）
- **提供的参数**：

```json
{"altitude_max":120,"altitude_min":60,
 "description":"展示幕一：Zone-A 全线巡检（密文落库）",
 "end_time":"2026-09-18 11:00:00","mission_type":"POWER_INSPECTION",
 "operator_id":"Operator-A","payload_type":"CAMERA",
 "route_segments":["R101","R205","R306"],"start_time":"2026-09-18 09:00:00",
 "uav_id":"UAV-A-001"}
```

- **返回的结果**：

```json
{"code":0,"data":{
  "mission_id":"MISSION-2026-001","operator_id":"Operator-A","uav_id":"UAV-A-001",
  "mission_type":"POWER_INSPECTION",
  "start_time":"2026-09-18 09:00:00.000","end_time":"2026-09-18 11:00:00.000",
  "route_segments":"[\"R101\",\"R205\",\"R306\"]","altitude_min":60,"altitude_max":120,
  "zones":"[\"Zone-A\",\"Zone-B\"]","payload_type":"CAMERA",
  "masked_value":"展示幕一****",
  "sm3_hash":"bfbe3660cc6490688540306ee4c23fc3db8f527caad69a032bca1d25388a0ffc",
  "sm9_identity":"SM9-ID-UAV-A-001","signature":"MGYEIKmgBzr6CO4Bkwh/msboplcT…",
  "status":"DRAFT"}}
```

- **过程解说**：三个隐私/完整性机制在创建瞬间同时生效：
  ① 任务描述**密文落库**，明文不出现在任何常规查询里；
  ② 返回 `masked_value="展示幕一****"`（前 4 字 + 星号脱敏）与全量 `sm3_hash`
  （SM3 摘要，幕三核验时用它证明密文未被篡改，对应 TC1-03 的基线）；
  ③ 以无人机 SM9 身份 `SM9-ID-UAV-A-001` 对任务摘要签名。
  `zones` 由三段航段自动推导为 `["Zone-A","Zone-B"]`（R101/R205 属 Zone-A，
  R306 属 Zone-B）—— 跨域任务的"跨域"由此而来。状态 `DRAFT` 待提交。

### 步骤 10 · 任务查询（验证脱敏）

- **使用的 API**：`POST /api/mission/query`（任务组）
- **提供的参数**：`{"mission_id":"MISSION-2026-001"}`
- **返回的结果**：与步骤 9 创建响应逐字段一致（`status:"DRAFT"`，
  `masked_value:"展示幕一****"`，同一 `sm3_hash`），此处不重复粘贴。
- **过程解说**：证明密文与脱敏是**存储态**而非响应态过滤 —— 常规查询接口从头到尾
  拿不到明文描述，能拿到的只有脱敏值 + SM3 摘要。想看明文？只有幕三的授权核验
  一条路（步骤 46）。

### 步骤 11 · 提交任务 A 申请（13 步跨链闭环）

- **使用的 API**：`POST /api/mission/submit`（任务组）
- **提供的参数**：`{"mission_id":"MISSION-2026-001","operator":"Operator-A"}`
- **返回的结果**：

```json
{"code":0,"data":{
  "application":{
    "application_id":"APP-20260917-915b2b","mission_id":"MISSION-2026-001",
    "sm3_hash":"bfbe3660cc…0ffc","signature":"MGYEIGOBTRgU3ppAdlWRJOKzZIqO…",
    "source_chain":"fabric",
    "source_tx_id":"ba7889a2770583c75cd07618a1f017a67d5da84f39609b4a7d16b0045d3f24db",
    "status":"RELAYED"},
  "crosschain":{
    "cross_tx_id":"CX-653c83b56f6d",
    "source_chain":"fabric","final_target_chain":"fisco-bcos",
    "message_type":"MISSION_APPLICATION","business_id":"APP-20260917-915b2b",
    "source_chain_tx_id":"ba7889a2…f24db",
    "reg_receive_tx_id":"18d6235f24bb59c4ca86a483c9d049766c7891414c8a43589651f4c7ca789a49",
    "reg_relay_tx_id":"18d6235f29e9c0a2ca266b1b5a163293af9fc644c5894d289d066dec35d5bb44",
    "target_chain_tx_id":"0xe74107c66c78a68f34b2bb3c24…",
    "status":"SUCCESS","latency_ms":385,"verify_result":"PASS","policy_result":"PASS"}}}
```

- **过程解说**：幕一的核心跨链动作。申请单先落 **Fabric 运营链**
  （`source_tx_id`，64-hex 无 0x 前缀是 Fabric 风格），随后触发内部 13 步跨链
  闭环（§6.5 验收第 3 项）：SM3 摘要 → SM9 签名 → 策略校验 → 监管链 receive →
  监管链 relay → 目标链写入。终点是 **FISCO BCOS 管理链**（`target_chain_tx_id`
  带 `0x` 前缀，66 字符，EVM 风格 —— 三条链的 TxID 格式差异本身就是"真链"的
  指纹）。`MISSION_APPLICATION` 全程 385ms `SUCCESS`，申请状态 `RELAYED`（已中继
  至管理链等待审核）。

### 步骤 12 · 跨链回执复查

- **使用的 API**：`POST /api/crosschain/query`（跨链网关组）
- **提供的参数**：`{"cross_tx_id":"CX-653c83b56f6d"}`
- **返回的结果**：与步骤 11 的 `crosschain` 对象完全一致（四段 TxID、
  `status:"SUCCESS"`、`latency_ms:385`），此处不重复粘贴。
- **过程解说**：跨链流水是**独立持久化**的，事后可凭 `cross_tx_id` 随时复查完整
  证据链，与业务响应解耦 —— 审计方不需要业务系统配合即可自证。

### 步骤 13 · 审核通过任务 A（FISCO→Fabric 反向闭环）

- **使用的 API**：`POST /api/review/submit`（审核组）
- **提供的参数**：

```json
{"application_id":"APP-20260917-915b2b","comment":"展示幕一：同意执行",
 "result":"APPROVED","reviewer":"FISCO-ADMIN","rules_hit":["R-ALT-001"]}
```

- **返回的结果**（节选）：

```json
{"code":0,"data":{
  "review":{"review_id":"REV-a123656e3bd7","application_id":"APP-20260917-915b2b",
    "result":"APPROVED","rules_hit":"[\"R-ALT-001\"]","comment":"展示幕一：同意执行",
    "reviewer":"FISCO-ADMIN","review_time":"2026-09-17 22:53:14.183"},
  "mission":{"mission_id":"MISSION-2026-001","status":"APPROVED"},
  "crosschain":{"cross_tx_id":"CX-4c24ece11921",
    "source_chain":"fisco-bcos","final_target_chain":"fabric",
    "message_type":"MISSION_REVIEW_RESULT",
    "source_chain_tx_id":"0x1e5710fbf80f67886b246a21a4…",
    "reg_receive_tx_id":"18d6235f5380e268ca5320e165b746c795b6104ffb304d97bc2b6c02d13689f9",
    "reg_relay_tx_id":"18d6235f582f26cfcad24a6226e2d8f4603e0404e22347ef8a4c0adfa16cb26c",
    "target_chain_tx_id":"3d6649642bbc89d65c8026a8cbcb7d0383bc7dbc1e552e06a84e35794e83dea5",
    "status":"SUCCESS","latency_ms":459}}}
```

- **过程解说**：审核结果这次走**反方向**：源链 FISCO BCOS（0x 前缀 TxID）→
  ChainMaker 监管链两笔登记 → 目标链 Fabric（64-hex）。审核动作命中规则
  `R-ALT-001`（高度规则：任务 A 在 R205 段申请 `altitude_min=60` 低于该航段下限
  80，规则引擎如实记录）。任务状态同步 `DRAFT→APPROVED`。一次审核 = 一次完整的
  三链协作，且**监管链始终居中见证**两个方向的流量。

### 步骤 14 · 创建任务 B（与 A 重叠）

- **使用的 API**：`POST /api/mission/create`（任务组）
- **提供的参数**：

```json
{"altitude_max":120,"altitude_min":80,
 "description":"展示幕一：Operator-B 重叠窗口任务",
 "end_time":"2026-09-18 12:00:00","mission_type":"POWER_INSPECTION",
 "operator_id":"Operator-B","payload_type":"CAMERA",
 "route_segments":["R205"],"start_time":"2026-09-18 10:00:00","uav_id":"UAV-B-001"}
```

- **返回的结果**（节选）：

```json
{"code":0,"data":{"mission_id":"MISSION-2026-002","operator_id":"Operator-B",
  "uav_id":"UAV-B-001","route_segments":"[\"R205\"]",
  "start_time":"2026-09-18 10:00:00.000","end_time":"2026-09-18 12:00:00.000",
  "masked_value":"展示幕一****",
  "sm3_hash":"b43192e14b05e0d8c02d9a6455380143959ef7d5c6fb268a5422b164b8a93d4f",
  "status":"DRAFT"}}
```

- **过程解说**：Operator-B 的任务只飞 R205 一段，时间窗 10:00-12:00 与任务 A 的
  09:00-11:00 在 **10:00-11:00 重叠**，且不同运营商、同航段 —— 这正是 TC1-05
  多运营商冲突场景的构造条件。注意其 `sm3_hash` 与任务 A 不同（描述明文不同），
  脱敏值却同为 `展示幕一****`（前 4 字相同）—— 脱敏不泄露、摘要可区分。

### 步骤 15 · 提交任务 B 申请

- **使用的 API**：`POST /api/mission/submit`（任务组）
- **提供的参数**：`{"mission_id":"MISSION-2026-002","operator":"Operator-B"}`
- **返回的结果**（节选）：`application_id:"APP-20260917-d379f0"`，
  Fabric 源链 TxID `1d008596…35a7`，跨链 `CX-a7dbaa6d0fbb`（fabric→fisco-bcos，
  `MISSION_APPLICATION`，`SUCCESS`，370ms），FISCO 目标 TxID `0x690d0147…`。
- **过程解说**：与步骤 11 同构的第二条跨链闭环，耗时 370ms（本次实跑 7 次闭环
  区间 370-518ms，与 §6.5 p95≈527-539ms 的验收实录一致）。

### 步骤 16 · 冲突检测命中

- **使用的 API**：`POST /api/conflict/detect`（冲突组）
- **提供的参数**：`{"mission_id":"MISSION-2026-002"}`
- **返回的结果**：

```json
{"code":0,"data":{"count":1,"conflicts":[{
  "conflict_id":"CFL-2bdc40789207",
  "mission_id_a":"MISSION-2026-002","mission_id_b":"MISSION-2026-001",
  "conflict_type":"ROUTE","status":"OPEN",
  "suggestion":"{\"adjust_altitude\":\"调整至与对方任务…\"}"},
  "created_at":"2026-09-17 22:53:15.426"}}
```

- **过程解说**：检测引擎按「同航段 ∧ 时间窗相交 ∧ 高度层相交」三元条件扫描，
  命中 B(002) 与 A(001) 在 R205 的 `ROUTE` 型冲突（TC1-05）。`suggestion` 内嵌
  机读协调建议 JSON（调高度/调时间窗/调航段三选一的模板），状态 `OPEN` 待协调。
  **冲突检测是本地策略引擎，不上链** —— 只有协调结果才值得存证。

### 步骤 17 · 冲突协调消解

- **使用的 API**：`POST /api/conflict/resolve`（冲突组）
- **提供的参数**：

```json
{"conflict_id":"CFL-2bdc40789207","operator":"Operator-B",
 "resolution":"时间窗后移30分钟"}
```

- **返回的结果**：

```json
{"code":0,"data":{"conflict_id":"CFL-2bdc40789207",
  "mission_id_a":"MISSION-2026-002","mission_id_b":"MISSION-2026-001",
  "conflict_type":"ROUTE","resolution":"时间窗后移30分钟",
  "operator":"Operator-B","status":"RESOLVED",
  "created_at":"2026-09-17 22:53:15.426"}}
```

- **过程解说**：Operator-B 接受协调方案，冲突 `OPEN→RESOLVED`，消解决策与执行人
  留痕（TC1-06：冲突协调后放行）。冲突记录成为步骤 18 审核放行的前置依据。

### 步骤 18 · 审核通过任务 B

- **使用的 API**：`POST /api/review/submit`（审核组）
- **提供的参数**：

```json
{"application_id":"APP-20260917-d379f0","comment":"冲突已消解，同意",
 "result":"APPROVED","reviewer":"FISCO-ADMIN","rules_hit":[]}
```

- **返回的结果**（节选）：`review.result:"APPROVED"`（`REV-97e1b912ead9`），
  任务 002 `status:"APPROVED"`，跨链 `CX-f8c98aaba0c2`（fisco-bcos→fabric，
  `MISSION_REVIEW_RESULT`，`SUCCESS`，497ms）。
- **过程解说**：`rules_hit:[]` 与任务 A 的 `["R-ALT-001"]` 形成对照 —— B 的
  `altitude_min=80` 恰好满足 R205 下限，无规则命中。冲突消解后审核放行，
  幕一"申请→冲突→协调→放行"完整闭环收口。

### 步骤 19 · 签发通行许可

- **使用的 API**：`POST /api/pass/issue`（通行许可组）
- **提供的参数**：

```json
{"issuer":"FISCO-ADMIN","mission_id":"MISSION-2026-001",
 "valid_from":"2026-09-17 21:53:11","valid_to":"2026-09-17 23:53:11"}
```

- **返回的结果**（节选）：

```json
{"code":0,"data":{
  "pass":{"pass_id":"PASS-2026-001","mission_id":"MISSION-2026-001",
    "uav_id":"UAV-A-001","route":"[\"R101\",\"R205\",\"R306\"]",
    "valid_from":"2026-09-17 21:53:11.000","valid_to":"2026-09-17 23:53:11.000",
    "signature":"MGYEIB60mYakP8iwLYd0e+R29pTw…",
    "sm3_hash":"ea63f3e9caa9d5e7f983ff6a09ee51ca425ae1f44de5cb20fda545d32a45d87b",
    "status":"VALID"},
  "crosschain":{"cross_tx_id":"CX-d1e93276e9cd","message_type":"FLIGHT_PASS",
    "source_chain":"fisco-bcos","final_target_chain":"fabric",
    "status":"SUCCESS","latency_ms":518}}}
```

- **过程解说**：许可绑定任务 A 的全部要素（任务 ID、无人机、三段航路、2 小时
  有效期），由签发方 SM9 签名 + SM3 摘要封存（TC1-07）。签发动作同时跨链存证
  `FLIGHT_PASS`（fisco→fabric，518ms）。**这个 `PASS-2026-001` 就是幕三身份
  追踪七级链条中的第 3 级**（步骤 42 会用到）。

### 步骤 20 · 许可验证（有效）

- **使用的 API**：`POST /api/pass/verify`（通行许可组）
- **提供的参数**：`{"pass_id":"PASS-2026-001"}`
- **返回的结果**：

```json
{"code":0,"data":{"pass_id":"PASS-2026-001","valid":true,
  "status":"VALID","reasons":[]}}
```

- **过程解说**：验证器检查签名、有效期窗、吊销状态三要素，全部通过 →
  `valid:true`，`reasons:[]` 空拒绝理由。

### 步骤 21 · 吊销许可

- **使用的 API**：`POST /api/pass/revoke`（通行许可组）
- **提供的参数**：

```json
{"operator":"FISCO-ADMIN","pass_id":"PASS-2026-001",
 "reason":"展示幕一：任务结束"}
```

- **返回的结果**（节选）：`pass.status:"REVOKED"`，`crosschain_status:"SUCCESS"`
  （`CX-1de3d311a7ae`，`PASS_REVOKE`，fisco→fabric，481ms）。
- **过程解说**：吊销同样是跨链事件 —— `PASS_REVOKE` 存证让运营链侧的所有验证点
  都能感知管理链侧的吊销决定，吊销理由 `reason` 入库存痕。

### 步骤 22 · 许可验证（已吊销，拒绝）

- **使用的 API**：`POST /api/pass/verify`（通行许可组）
- **提供的参数**：`{"pass_id":"PASS-2026-001"}`
- **返回的结果**：

```json
{"code":0,"data":{"pass_id":"PASS-2026-001","valid":false,
  "status":"REVOKED","reasons":["许可已吊销"]}}
```

- **过程解说**：同一许可、同一接口，吊销后立刻 `valid:false` 并给出人类可读的
  拒绝理由（TC2-02：吊销许可拒绝）。注意 `code` 仍为 0 —— "验证不通过"是正常
  业务结果而非接口错误，`data.valid` 才是判定字段。

### 步骤 23 · 跨链流水盘点

- **使用的 API**：`POST /api/crosschain/list`（跨链网关组）
- **提供的参数**：`{}`（默认第一页 20 条）
- **返回的结果**：`total:7`，7 条记录全部 `status:"SUCCESS"`，按时间倒序：

| # | cross_tx_id | 消息类型 | 源链→目标链 | 业务ID | 延迟 |
|---|---|---|---|---|---|
| 1 | CX-a6e62bdc47f5 | UAV_REGISTER_PROOF | fabric→chainmaker | UAV-DEMO-225311 | 516ms |
| 2 | CX-653c83b56f6d | MISSION_APPLICATION | fabric→fisco-bcos | APP-…-915b2b | 385ms |
| 3 | CX-4c24ece11921 | MISSION_REVIEW_RESULT | fisco-bcos→fabric | REV-a123656e3bd7 | 459ms |
| 4 | CX-a7dbaa6d0fbb | MISSION_APPLICATION | fabric→fisco-bcos | APP-…-d379f0 | 370ms |
| 5 | CX-f8c98aaba0c2 | MISSION_REVIEW_RESULT | fisco-bcos→fabric | REV-97e1b912ead9 | 497ms |
| 6 | CX-d1e93276e9cd | FLIGHT_PASS | fisco-bcos→fabric | PASS-2026-001 | 518ms |
| 7 | CX-1de3d311a7ae | PASS_REVOKE | fisco-bcos→fabric | PASS-2026-001 | 481ms |

- **过程解说**：幕一共产生 **7 次跨链闭环，7/7 SUCCESS**，覆盖全部 4 种消息类型、
  2 个方向、3 条链的两两组合（fabric↔fisco-bcos、fabric→chainmaker）。单程延迟
  370-518ms，均远低于 §6.5 的 p95<1000ms 验收线（TC1-08 批量吞吐的抽样佐证）。

---

# 幕二 · 系统二：链下可信网络虫洞攻防（步骤 24-39）

> 主线：节点注册入网 → 拓扑基线 → SM9 挑战会话 → 正常消息基线 → 虫洞隧道部署 →
> 攻击态低延迟异常 → 五维风险判定 DETECT+ISOLATE → 路径自动规避 RECOVERED →
> 隧道关闭 → 攻防对比实验。全程为链下可信网络的运行时安全剧情（TC2-01~08）。

### 步骤 24 · 注册边缘节点

- **使用的 API**：`POST /api/node/register`（链下网络组）
- **提供的参数**：`{"node_id":"N-DEMO-225311-1","node_type":"EDGE","position":{"X":12,"Y":34}}`
- **返回的结果**：

```json
{"code":0,"data":{"node_id":"N-DEMO-225311-1","node_type":"EDGE",
  "sm9_identity":"SM9-ID-N-DEMO-225311-1","neighbors":"[]",
  "position":"{\"X\":12,\"Y\":34}","status":"ONLINE","risk_score":0}}
```

- **过程解说**：节点注册即**自动派生 SM9 身份**（与无人机注册同一密码学机制），
  入网状态 `ONLINE`、初始风险分 0。`node_type` 合法枚举为
  `UAV/EDGE/MANAGEMENT/ATTACKER`（传错报 4003，TC 场景库有对应负例）。

### 步骤 25 · 注册管理节点

- **使用的 API**：`POST /api/node/register`（链下网络组）
- **提供的参数**：`{"node_id":"N-DEMO-225311-2","node_type":"MANAGEMENT","position":{"X":50,"Y":60}}`
- **返回的结果**：`node_id:"N-DEMO-225311-2"`，`node_type:"MANAGEMENT"`，
  `sm9_identity:"SM9-ID-N-DEMO-225311-2"`，`status:"ONLINE"`（余同步骤 24）。
- **过程解说**：动态注册的两个节点（1 边缘 + 1 管理）叠加在 demo/init 的 8 节点
  基线之上，下一步拓扑将呈现 10 节点。

### 步骤 26 · 拓扑基线快照

- **使用的 API**：`POST /api/topology/get`（链下网络组）
- **提供的参数**：`{}`
- **返回的结果**（节点表全量 + 边结构样例）：

```json
{"code":0,"data":{
  "nodes":[
    {"node_id":"UAV-A-001-NODE","node_type":"UAV","status":"ONLINE"},
    {"node_id":"N1","node_type":"EDGE","status":"ONLINE"},
    {"node_id":"N2","node_type":"EDGE","status":"ONLINE"},
    {"node_id":"N3","node_type":"EDGE","status":"ONLINE"},
    {"node_id":"N4","node_type":"EDGE","status":"ONLINE"},
    {"node_id":"MGR","node_type":"MANAGEMENT","status":"ONLINE"},
    {"node_id":"N-DEMO-225311-1","node_type":"EDGE","status":"ONLINE"},
    {"node_id":"N-DEMO-225311-2","node_type":"MANAGEMENT","status":"ONLINE"},
    {"node_id":"NODE-X","node_type":"ATTACKER","status":"OFFLINE"},
    {"node_id":"NODE-Y","node_type":"ATTACKER","status":"OFFLINE"}],
  "edges":[
    {"from":"UAV-A-001-NODE","to":"N1","distance":…,"advertised_latency_ms":…,"wormhole_edge":false},
    {"from":"N1","to":"N2",…},{"from":"N2","to":"N3",…},{"from":"N3","to":"N4",…},
    {"from":"N4","to":"MGR",…}]}}
```

- **过程解说**：10 节点 / **5 条边**的正常拓扑：无人机→N1→N2→N3→N4→管理节点
  一条链式主干。两个 `ATTACKER` 类型节点 NODE-X/NODE-Y 预置为 `OFFLINE`（蛰伏态）。
  每条边携带 `distance`（几何距离）、`advertised_latency_ms`（宣告延迟）与
  `wormhole_edge` 标志 —— 这三个字段就是稍后虫洞检测的物理证据来源。

### 步骤 27 · 建立会话（SM9 挑战认证）

- **使用的 API**：`POST /api/session/open`（会话组）
- **提供的参数**：`{"uav_id":"UAV-A-001"}`
- **返回的结果**：

```json
{"code":0,"data":{
  "session":{"session_id":"SESS-41a38ba62af7","uav_id":"UAV-A-001","status":"ACTIVE",
    "current_path":"[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]"},
  "path":["UAV-A-001-NODE","N1","N2","N3","N4","MGR"],
  "auth":{"nonce":"NONCE-656a1105e3274b7f725fb8fee016e2c9",
    "sm9_identity":"SM9-ID-UAV-A-001-NODE",
    "signature":"MGYEIInwd5wHDk5CAo498jxmAU+7…",
    "verified":true}}}
```

- **过程解说**：会话建立即完成**挑战-响应认证**（TC2-01）：服务端下发随机
  `nonce`，无人机节点用自己的 SM9 身份对 nonce 签名回传，服务端验签得
  `verified:true` —— 冒充者没有 SM9 私钥，过不了这一关（对应 TC1-04 的会话版）。
  初始路径按拓扑最短路计算为 6 节点主干，会话状态 `ACTIVE`。

### 步骤 28 · 基线消息 1（位置上报）

- **使用的 API**：`POST /api/message/send`（消息组）
- **提供的参数**：

```json
{"msg_type":"POSITION_UPDATE","session_id":"SESS-41a38ba62af7",
 "source_node":"UAV-A-001-NODE","target_node":"MGR"}
```

- **返回的结果**（节选）：

```json
{"code":0,"data":{"message":{
  "message_id":"MSG-dc10a150d0bd8bf3","seq":1,"msg_type":"POSITION_UPDATE",
  "sm3_hash":"e06974cd71e0561db4384a24a7ef0212b53e7a472ef7e9b2fd70396bd2c2d2ea",
  "latency_ms":45,"status":"SUCCESS",
  "path":"[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]"},
 "path_detail":[
  {"from":"UAV-A-001-NODE","to":"N1","latency_ms":9},
  {"from":"N1","to":"N2","latency_ms":9},{"from":"N2","to":"N3","latency_ms":9},
  {"from":"N3","to":"N4","latency_ms":9},{"from":"N4","to":"MGR","latency_ms":9}]}}
```

- **过程解说**：每条消息都有三重防篡改证据：`sm3_hash`（内容摘要，TC2-03 正常
  持续交互的完整性基线）、逐跳 `path_detail`（5 跳 × 9ms = **45ms 基线延迟**）、
  会话内单调 `seq`。这个 45ms 就是稍后风险判定的 `baseline_ms` 对照值。

### 步骤 29 · 基线消息 2（航路状态）

- **使用的 API**：`POST /api/message/send`（消息组）
- **提供的参数**：同步骤 28，`msg_type` 改为 `"ROUTE_STATUS"`
- **返回的结果**（节选）：`seq:2`，`latency_ms:50`（5 跳 × 10ms），
  `sm3_hash:"92e22a0c…"`，`status:"SUCCESS"`，路径同 6 节点主干。
- **过程解说**：第二条基线消息确立了延迟分布（45-50ms）—— 检测引擎需要
  `has_history`（至少 2 条历史消息）才启用延迟维度判定。

### 步骤 30 · 会话消息列表与统计

- **使用的 API**：`POST /api/message/list`（消息组）
- **提供的参数**：`{"session_id":"SESS-41a38ba62af7"}`
- **返回的结果**（节选 records，stats 全量）：

```json
{"code":0,"data":{"total":2,"records":[ …seq2、seq1 两条消息全文… ],
  "stats":{"count":2,"success_count":2,"success_rate":1,
    "avg_latency_ms":47.5,"p50_latency_ms":45,"p95_latency_ms":50,
    "max_latency_ms":50}}}
```

- **过程解说**：列表端点除逐条消息外还内嵌 `stats` 实时统计（成功率 100%、
  p50=45ms、p95=50ms）—— 前端驾驶舱直接消费这个结构，无需二次计算。

### 步骤 31 · 部署虫洞隧道（攻击开始）

- **使用的 API**：`POST /api/wormhole/toggle`（攻防组）
- **提供的参数**：`{"enabled":true,"operator":"ATTACKER-SIM"}`
- **返回的结果**：

```json
{"code":0,"data":{"wormhole_enabled":true,
  "nodes_affected":["NODE-X","NODE-Y","N1","N4"]}}
```

- **过程解说**：TC2-04 虫洞隧道部署：蛰伏的 NODE-X/NODE-Y 转为 `ONLINE`，并注入
  三条**伪造邻接边**（N1↔NODE-X、NODE-X↔NODE-Y、NODE-Y↔N4），宣称的隧道延迟
  极低（2ms/跳）。受影响节点如实返回 4 个。注意状态机红线：若 X/Y 已处于
  `ISOLATED` 残留态，重复开启会报 `4001`（隔离态只能由 `demo/reset` 清除，
  OFF 开关刻意不动 ISOLATED 节点 —— 隔离是检测结论，攻击者开关无权解除）。

### 步骤 32 · 攻击态拓扑对比

- **使用的 API**：`POST /api/topology/get`（链下网络组）
- **提供的参数**：`{}`
- **返回的结果**（与步骤 26 的差异部分）：NODE-X/NODE-Y `status:"ONLINE"`；
  边数 **5 → 8**，新增三条：

```json
{"from":"N1","to":"NODE-X",…},{"from":"NODE-X","to":"NODE-Y",…},
 {"from":"N4","to":"NODE-Y",…}
```

- **过程解说**：拓扑接口如实呈现被污染的邻接图 —— 检测层不阻止攻击者"宣称"
  邻接（链下网络本来就要容忍谎言），而是靠多维证据事后判定。

### 步骤 33 · 攻击态消息（隧道低延迟异常）

- **使用的 API**：`POST /api/message/send`（消息组）
- **提供的参数**：同步骤 28（`POSITION_UPDATE`）
- **返回的结果**（节选）：

```json
{"code":0,"data":{"message":{
  "seq":4,"latency_ms":24,"status":"SUCCESS",
  "path":"[\"UAV-A-001-NODE\",\"N1\",\"NODE-X\",\"NODE-Y\",\"N4\",\"MGR\"]"},
 "path_detail":[
  {"from":"UAV-A-001-NODE","to":"N1","latency_ms":9},
  {"from":"N1","to":"NODE-X","latency_ms":2},
  {"from":"NODE-X","to":"NODE-Y","latency_ms":2},
  {"from":"NODE-Y","to":"N4","latency_ms":2},
  {"from":"N4","to":"MGR","latency_ms":9}]}}
```

- **过程解说**：路由自动选择了"更快"的隧道路径 —— 端到端延迟从基线 45ms 骤降至
  **24ms**（TC2-04 的剧情效果）。但 N1 与 NODE-X 的几何距离决定的物理延迟下限
  远不止 2ms，**"快得违反物理"正是虫洞隧道的指纹**。seq 从 2 跳到 4 是因为
  后端 Autopilot（P3-9，`OFFCHAIN_AUTOPILOT_MS` 配置）在后台为 ACTIVE 会话
  周期性发送 HEARTBEAT 消息，占用了 seq 3 —— 会话保活流量与业务流量共用序号
  空间，属正常运行特征。

### 步骤 34 · 五维风险判定（检出 + 隔离）

- **使用的 API**：`POST /api/risk/evaluate`（攻防组）
- **提供的参数**：`{"session_id":"SESS-41a38ba62af7"}`
- **返回的结果**：

```json
{"code":0,"data":{
  "risk_score":0.85,"threshold":0.7,"verdict":"DETECT",
  "dimensions":{"identity":0,"adjacency":0.35,"latency":0.25,
    "challenge":0.25,"path":0},
  "events":[
    {"event_id":"WH-74b77bfc5bec","action":"DETECT","risk_score":0.85,
     "node_x":"NODE-X","node_y":"NODE-Y",
     "original_path":"[\"UAV-A-001-NODE\",\"N1\",\"NODE-X\",\"NODE-Y\",\"N4\",\"MGR\"]"},
    {"event_id":"WH-ca61d5385ea2","action":"ISOLATE","risk_score":0.85,…}],
  "session_status":"DEGRADED"}}
```

其中 `DETECT` 事件内嵌的判定明细（`detection_dimensions` 原文）：

```json
{"baseline_ms":45,"current_ms":24,"observed_latency_ms":24,"geo_floor_ms":35.355,
 "has_history":true,"veto":false,
 "dimensions":{"identity":0,"adjacency":0.35,"latency":0.25,"challenge":0.25,"path":0},
 "verdict":"DETECT"}
```

- **过程解说**：TC2-05 虫洞检测与隔离的核心判定。五个维度独立打分求和：
  - `adjacency 0.35` —— X/Y 的邻接宣称与几何位置矛盾（新边未通过邻接证明）；
  - `latency 0.25` —— 实测 24ms **低于几何距离决定的物理下限 35.355ms**
    （`geo_floor_ms`，由边距离/信号速度推出），"快得不可能"；
  - `challenge 0.25` —— 对 X/Y 发起的 SM9 挑战-响应未通过（攻击者无合法私钥）；
  - `identity 0`、`path 0` —— 身份库无黑名单记录、路径历史尚短，不计分。
  合计 **0.85 > 阈值 0.7 → `DETECT`**，随即产生第二个事件 `ISOLATE`：
  NODE-X/NODE-Y 被打入 `ISOLATED` 状态（从可用拓扑摘除），会话降级
  `ACTIVE→DEGRADED`。`veto:false` 表示无一票否决项（如已确认黑名单身份直接
  定罪），走的是多维累积评分路径。

### 步骤 35 · 攻防事件流水

- **使用的 API**：`POST /api/event/list`（攻防组）
- **提供的参数**：`{"session_id":"SESS-41a38ba62af7"}`
- **返回的结果**（节选）：`total:2`，两条 `WormholeEvent`：
  `WH-ca61d5385ea2`（`action:"ISOLATE"`）与 `WH-74b77bfc5bec`（`action:"DETECT"`），
  均携带 `risk_score:0.85`、X/Y 节点对、被污染的原路径与完整判定明细。
- **过程解说**：检测（DETECT）与处置（ISOLATE）作为**两个独立事件**分别留痕，
  每条都可回放判定依据（`detection_dimensions` 原文入库）—— 安全审计要求的
  "结论可解释、处置可追溯"在此落地。

### 步骤 36 · 路径自动规避切换

- **使用的 API**：`POST /api/path/switch`（攻防组）
- **提供的参数**：`{"operator":"OP-1","session_id":"SESS-41a38ba62af7"}`
- **返回的结果**：

```json
{"code":0,"data":{
  "session":{"session_id":"SESS-41a38ba62af7","status":"RECOVERED",
    "current_path":"[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]"},
  "original_path":["UAV-A-001-NODE","N1","NODE-X","NODE-Y","N4","MGR"],
  "new_path":["UAV-A-001-NODE","N1","N2","N3","N4","MGR"],
  "recovery_latency_ms":45,
  "event":{"event_id":"WH-3d51a09232e1","action":"RECOVER",
    "new_path":"[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "recovery_latency_ms":45,"risk_score":0.85}}}
```

- **过程解说**：TC2-06 自动规避：在**剔除 ISOLATED 节点后**的拓扑上重跑 Dijkstra，
  新路径绕开 X/Y 回到 N1→N2→N3→N4 主干，恢复延迟 45ms（回到基线水平）。
  会话 `DEGRADED→RECOVERED`，并记录第三个事件 `RECOVER`（继承 `risk_score`，
  形成 DETECT→ISOLATE→RECOVER 完整事件链）。前置条件：只有 `DEGRADED` 会话
  才允许切换（`ACTIVE` 会话调用报 4002 —— 没病不吃药）。

### 步骤 37 · 恢复态消息验证

- **使用的 API**：`POST /api/message/send`（消息组）
- **提供的参数**：同步骤 29（`ROUTE_STATUS`）
- **返回的结果**（节选）：`seq:5`，`latency_ms:50`，路径
  `["UAV-A-001-NODE","N1","N2","N3","N4","MGR"]`（5 跳 × 10ms），`SUCCESS`。
- **过程解说**：TC2-07 交互恢复的实证：消息不再经过隧道，延迟回到基线区间
  （45-50ms）。另一个隐含状态机：`RECOVERED` 会话上首次成功发消息后自动回归
  `ACTIVE`（message.go 的"恢复完成自动回归"规则）—— 这解释了步骤 50 驾驶舱里
  该会话计入 `active` 桶。

### 步骤 38 · 关闭虫洞隧道

- **使用的 API**：`POST /api/wormhole/toggle`（攻防组）
- **提供的参数**：`{"enabled":false,"operator":"ATTACKER-SIM"}`
- **返回的结果**：`{"code":0,"data":{"wormhole_enabled":false,"nodes_affected":[]}}`
- **过程解说**：攻击者撤除隧道宣称，三条伪造边消失。`nodes_affected:[]` ——
  **OFF 不会把 X/Y 从 ISOLATED 拉回 ONLINE**：隔离是监管侧的处置结论，
  不随攻击者收兵而自动解除（解除只能走 `demo/reset` 重建基线）。

### 步骤 39 · 攻防对比实验（防御态吞吐）

- **使用的 API**：`POST /api/experiment/run`（实验组）
- **提供的参数**：`{"count":3,"experiment_type":"MESSAGE_FLOW","scenario":"DEFENSE"}`
- **返回的结果**：

```json
{"code":0,"data":{
  "experiment_id":"EXP-20260917-5034d9","run_id":"RUN-f9ab77e63c0b",
  "experiment_type":"MESSAGE_FLOW","scenario":"DEFENSE","status":"DONE",
  "count":3,"success_count":3,"success_rate":1,"failed_count":0,
  "avg_latency_ms":10,"p50_latency_ms":10,"p95_latency_ms":11,"max_latency_ms":11,
  "started_at":"2026-09-17 22:53:19.466","completed_at":"2026-09-17 22:53:19.515"}}
```

- **过程解说**：TC2-08 攻防对比实验：`scenario` 必填 `NORMAL/ATTACK/DEFENSE`
  三选一（缺失报 6002），`DEFENSE` 场景在**已隔离虫洞的干净拓扑**上批量发送
  3 条消息 —— 成功率 100%、p95=11ms。与 ATTACK 场景（消息被隧道劫持、延迟
  异常）跑出的数据对照，即"攻防对比"。49ms 完成 3 条消息流，实验结果持久化
  为 `EXP/RUN` 双 ID，可经 `experiment/result`、`experiment/list`、
  `experiment/export` 回查与导出。

---

# 幕三 · 系统三：监管密文核查（步骤 40-51）

> 主线：匿名告警登记 → 状态流转 → **亚秒七级身份追踪**（伪名→设备→许可→SM9→无人机→
> 运营商→厂商，跨三条链逐级解密）→ 未授权核验被封缄（5002）→ 授权申请-审批上链 →
> 授权后密文核验（明文 + 双重验签 + 航路/载荷结论）→ 偏航核验触发自动告警联动 →
> 监管审计上链与 CSV 导出 → 驾驶舱聚合。对应 TC3-01~08。

### 步骤 40 · 匿名告警登记

- **使用的 API**：`POST /api/alert/raise`（告警组）
- **提供的参数**：

```json
{"alert_id":"ALERT-DEMO-225311","event_type":"ROUTE_DEVIATION",
 "mission_id":"MISSION-2026-001","operator":"REG-01","risk_level":"HIGH",
 "source_system":"MANUAL","uav_pseudonym":"PSEUDO-UAV-83921"}
```

- **返回的结果**：

```json
{"code":0,"data":{"alert_id":"ALERT-DEMO-225311","mission_id":"MISSION-2026-001",
  "uav_pseudonym":"PSEUDO-UAV-83921","event_type":"ROUTE_DEVIATION",
  "risk_level":"HIGH",
  "evidence_hash":"7ec0e25666463973d35857fd5c2b44f261716b04e1c3dabfc5d0897876b54bfd",
  "source_system":"MANUAL","status":"OPEN"}}
```

- **过程解说**：TC3-01 匿名告警登记。关键在 `uav_pseudonym`（伪名 `PSEUDO-UAV-83921`）
  —— 告警方**只持有无人机伪名，不知真实身份**，这正是监管隐私设计的起点。系统对
  告警证据算 `evidence_hash`（SM3），状态入 `OPEN`，`alert_id` 必须 `ALERT-` 前缀。

### 步骤 41 · 告警状态流转（OPEN→IDENTIFIED）

- **使用的 API**：`POST /api/alert/status`（告警组）
- **提供的参数**：

```json
{"alert_id":"ALERT-DEMO-225311","operator":"REG-01",
 "reason":"初判成立","to_status":"IDENTIFIED"}
```

- **返回的结果**（节选）：`status:"IDENTIFIED"`（其余字段同步骤 40，`updated_at`
  刷新至 22:53:19.765）。
- **过程解说**：告警生命周期状态机 `OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED`
  的第一跳。监管员 REG-01 初判成立，附 `reason` 留痕。每次流转都是独立审计事件。

### 步骤 42 · 亚秒七级身份追踪（幕三核心）

- **使用的 API**：`POST /api/trace/identity`（追踪组）
- **提供的参数**：`{"alert_id":"ALERT-DEMO-225311","operator":"REG-01"}`
- **返回的结果**：

```json
{"code":0,"data":{
  "entry":"ALERT-DEMO-225311","entry_type":"ALERT_ID",
  "pseudonym":"PSEUDO-UAV-83921","resolved":true,"break_level":0,
  "trace_latency_ms":0,
  "levels":[
    {"level":1,"name":"PSEUDO","value":"PSEUDO-UAV-83921","source":"CHAINMAKER_INDEX","latency_ms":0,"status":"RESOLVED"},
    {"level":2,"name":"DEVICE_ADDRESS","value":"0xADDR83921","source":"CHAINMAKER_INDEX","latency_ms":0,"status":"RESOLVED"},
    {"level":3,"name":"PASS_ID","value":"PASS-2026-001","source":"CHAINMAKER_INDEX","latency_ms":0,"status":"RESOLVED"},
    {"level":4,"name":"SM9_IDENTITY","value":"SM9-ID-UAV-A-001","source":"CHAINMAKER_INDEX","latency_ms":0,"status":"RESOLVED"},
    {"level":5,"name":"UAV_ID","value":"UAV-A-001","source":"FABRIC_DETAIL","latency_ms":0,"status":"RESOLVED"},
    {"level":6,"name":"OPERATOR_ID","value":"Operator-A","source":"FABRIC_DETAIL","latency_ms":0,"status":"RESOLVED"},
    {"level":7,"name":"MANUFACTURER_ID","value":"Manufacturer-B","source":"FISCO_BCOS_DETAIL","latency_ms":0,"status":"RESOLVED"}]}}
```

- **过程解说**：TC3-02 亚秒七级追踪，幕三的技术制高点。从一个**匿名伪名**出发，
  沿七级映射链逐级解出真实主体，`break_level:0` 表示七级全部打通、无断链：

  | 级 | 身份维度 | 解出值 | 数据来源链 |
  |---|---|---|---|
  | 1 | PSEUDO 伪名 | PSEUDO-UAV-83921 | ChainMaker 索引 |
  | 2 | DEVICE_ADDRESS 设备地址 | 0xADDR83921 | ChainMaker 索引 |
  | 3 | PASS_ID 通行许可 | PASS-2026-001 | ChainMaker 索引 |
  | 4 | SM9_IDENTITY 密码身份 | SM9-ID-UAV-A-001 | ChainMaker 索引 |
  | 5 | UAV_ID 无人机 | UAV-A-001 | Fabric 明细 |
  | 6 | OPERATOR_ID 运营商 | Operator-A | Fabric 明细 |
  | 7 | MANUFACTURER_ID 厂商 | Manufacturer-B | FISCO BCOS 明细 |

  注意**数据来源跨了三条链**（`CHAINMAKER_INDEX` 前四级走监管链索引、
  `FABRIC_DETAIL` 五六级走运营链明细、`FISCO_BCOS_DETAIL` 七级走管理链明细）——
  身份映射天然分布在异构三链上，追踪层把它们串成一条逻辑链。步骤 19 签发的
  `PASS-2026-001` 在这里作为第 3 级复现，与幕一形成闭环。`trace_latency_ms:0`
  即亚秒级（TC3-03 断链留痕：任一级解不出则 `resolved:false`、`break_level`
  标记断裂位置，本例全通故为 0）。

### 步骤 43 · 未授权核验被封缄（设计内 5002）

- **使用的 API**：`POST /api/inspect/ciphertext`（核查组）
- **提供的参数**：`{"mission_id":"MISSION-2026-001","regulator_id":"REG-02"}`
  （**故意不带 `authorization_id`**，且监管员 REG-02 无任何授权）
- **返回的结果**：

```json
{"code":5002,
 "message":"biz error 5002: mission MISSION-2026-001 密文未授权访问：仅返回密文状态/摘要/脱敏值",
 "data":{"authorized":false,
   "sealed":{"mission_id":"MISSION-2026-001","ciphertext_status":"SEALED",
     "sm3_hash":"bfbe3660cc6490688540306ee4c23fc3db8f527caad69a032bca1d25388a0ffc",
     "masked_value":"展示幕一****","has_ciphertext":true}}}
```

- **过程解说**：**全报告唯一的非零 code，且是刻意设计（TC3-04）**。未授权监管员
  想核验任务密文时，系统**不报"拒绝访问"了事，而是返回一个封缄视图**：
  `authorized:false` + `ciphertext_status:"SEALED"` + SM3 摘要 + 脱敏值，但
  **绝不返回明文**。摘要 `bfbe3660…`（与步骤 9 创建时一致）让核验方仍能确认
  "密文未被篡改"，却读不到内容 —— 隐私与可验证性的精妙平衡。5002 是业务语义码
  而非 HTTP 错误（HTTP 仍 200）。

### 步骤 44 · 提交核验授权申请

- **使用的 API**：`POST /api/authorize/apply`（授权组）
- **提供的参数**：

```json
{"authorization_id":"AUTH-DEMO-225311","reason":"核查告警 ALERT-DEMO-225311",
 "regulator_id":"REG-01","scope":["MISSION","ROUTE","PAYLOAD","IDENTITY"],
 "target_id":"MISSION-2026-001","target_type":"MISSION"}
```

- **返回的结果**：

```json
{"code":0,"data":{"authorization_id":"AUTH-DEMO-225311","regulator_id":"REG-01",
  "scope":"[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"]",
  "target_type":"MISSION","target_id":"MISSION-2026-001",
  "reason":"核查告警 ALERT-DEMO-225311",
  "valid_from":"2026-09-17 22:53:20.209","valid_to":"2026-09-18 22:53:20.209",
  "status":"PENDING",
  "audit_hash":"f4bc3fb5cb6c0bed403605a13a3c2ecb1db5624ccb6523d7bd0085d6c258ee35"}}
```

- **过程解说**：换有权限的 REG-01 走正规授权流程。申请**最小必要 scope**
  （MISSION/ROUTE/PAYLOAD/IDENTITY 四维），绑定具体 `target_id`（只授权查这一个
  任务，非全库），有效期 24 小时（`valid_from/to`），状态 `PENDING` 待审。
  `authorization_id` 须 `AUTH-` 前缀。申请动作本身已算 `audit_hash` 留痕。

### 步骤 45 · 授权审批（上链存证）

- **使用的 API**：`POST /api/authorize/review`（授权组）
- **提供的参数**：

```json
{"authorization_id":"AUTH-DEMO-225311","comment":"同意",
 "decision":"APPROVE","reviewer_id":"REG-ADMIN"}
```

- **返回的结果**（节选）：

```json
{"code":0,"data":{
  "auth":{"authorization_id":"AUTH-DEMO-225311","status":"AUTHORIZED",…},
  "audit":{"audit_id":"AUD-bbc6cf319a81","action":"AUTH_APPROVE",
    "operator_id":"REG-ADMIN","target":"MISSION-2026-001",
    "chain_tx_id":"18d62360bc8400dbca00559a21ac2a6bab1119c447c644f9915ebe2e95edb79c"},
  "chain_tx_id":"18d62360bc8400dbca00559a21ac2a6bab1119c447c644f9915ebe2e95edb79c"}}
```

- **过程解说**：TC3-05 授权闭环的审批环。REG-ADMIN 批准，授权 `PENDING→AUTHORIZED`，
  并**同步生成一条上链审计记录** `AUD-bbc6cf319a81`（`action:AUTH_APPROVE`），
  `chain_tx_id`（ChainMaker 监管链 64-hex）就是这笔"授权批准"事件的链上存证 ——
  谁在何时授权谁查了什么，永久留痕、不可抵赖（TC3-07 审计上链的第一条）。

### 步骤 46 · 授权后密文核验（正常航路）

- **使用的 API**：`POST /api/inspect/ciphertext`（核查组）
- **提供的参数**：

```json
{"authorization_id":"AUTH-DEMO-225311","mission_id":"MISSION-2026-001",
 "payload_type":"CAMERA","regulator_id":"REG-01","trajectory":"NORMAL"}
```

- **返回的结果**（节选，隐去与步骤 9 重复的 mission 全文）：

```json
{"code":0,"data":{
  "authorized":true,
  "scope":["MISSION","ROUTE","PAYLOAD","IDENTITY"],
  "decrypted_view":"展示幕一：Zone-A 全线巡检（密文落库）",
  "sealed":{"ciphertext_status":"OPENED",
    "sm3_hash":"bfbe3660cc…0ffc","masked_value":"展示幕一****"},
  "verification":{"digest_match":true,"signature_valid":true,
    "audit_hash":"7df22b040fa628696b46a761bc50732cefc76bef83e7fcbf266d7ffd731784f6"},
  "conclusion":{"route_verdict":"ROUTE_OK","payload_verdict":"PAYLOAD_OK",
    "raised_alerts":[]},
  "chain_tx_id":"18d62360c5fe5fe3ca34e10f5f8b599eec6e09c39547479682c7094d7f455ec6",
  "reg_audit_id":"AUD-384fc0baeff0"}}
```

- **过程解说**：与步骤 43 的封缄形成鲜明对照 —— 携授权后：
  - `authorized:true`，`decrypted_view` **返回任务描述明文**
    （"展示幕一：Zone-A 全线巡检（密文落库）"，与步骤 9 创建时提交的 description
    逐字一致，证明密文落库-解密还原无损）；
  - `sealed.ciphertext_status` 由 `SEALED` 变 `OPENED`；
  - `verification` **双重验签**：`digest_match:true`（解密后内容 SM3 摘要与创建时
    `bfbe3660…` 一致 → 密文未被篡改，TC1-03 完整性）+ `signature_valid:true`
    （创建者 SM9 签名有效 → 来源可信，TC1-04 抗抵赖）；
  - `conclusion`：提交 `trajectory:"NORMAL"` 且与审批航段一致 → `ROUTE_OK`；
    `payload_type:"CAMERA"` 与登记载荷一致 → `PAYLOAD_OK`；`raised_alerts:[]` 空；
  - 本次核验又生成一条上链审计 `AUD-384fc0baeff0` + `chain_tx_id`。

### 步骤 47 · 授权后密文核验（偏航，触发自动告警）

- **使用的 API**：`POST /api/inspect/ciphertext`（核查组）
- **提供的参数**：

```json
{"authorization_id":"AUTH-DEMO-225311","mission_id":"MISSION-2026-001",
 "payload_type":"CAMERA","regulator_id":"REG-01","trajectory":"DEVIATION"}
```

- **返回的结果**（节选，仅列与步骤 46 不同处）：

```json
{"code":0,"data":{
  "authorized":true,"decrypted_view":"展示幕一：Zone-A 全线巡检（密文落库）",
  "verification":{"digest_match":true,"signature_valid":true,
    "audit_hash":"19a70ae9ec6b26768db6aef2da0cde44b74ea50743eaa461cda0b5ca03de72ba"},
  "conclusion":{"route_verdict":"ROUTE_DEVIATION","payload_verdict":"PAYLOAD_OK",
    "raised_alerts":["ALERT-DEMO-225311"]},
  "chain_tx_id":"18d62360d2ae9691ca531c43f7773b41acc96b382b8d495f88a80dbc8671290e",
  "reg_audit_id":"AUD-1e0b5533c011"}}
```

- **过程解说**：TC3-06 航路偏航核验 —— 唯一变量是把 `trajectory` 从 `NORMAL`
  换成 `DEVIATION`（提交一条偏离审批航段的实际轨迹）。结果：
  - `route_verdict` 翻转为 **`ROUTE_DEVIATION`**（实际航段序列 ≠ 审批的
    R101/R205/R306）；
  - `raised_alerts:["ALERT-DEMO-225311"]` —— 核验引擎**自动挂接/触发告警**。
    代码里 `raiseAutoAlert` 先按「同 mission_id + 同 event_type + 状态仍活跃
    (OPEN/IDENTIFIED/TRACED)」查重：因步骤 40 已为该任务登记了 ROUTE_DEVIATION
    告警且尚在 IDENTIFIED，故**复用同一 `ALERT-DEMO-225311` 而非新建**（去重设计，
    避免同一偏航事件重复告警）。若无既有告警则会 `GenAlertID()` 新建并回写
    `source_system:"SYSTEM3"`；
  - `digest_match/signature_valid` 仍为 true（密文本身没变，变的是提交的轨迹）；
  - 生成独立的第三条上链审计 `AUD-1e0b5533c011`（`audit_hash` 与步骤 46 不同，
    因结论不同）。

### 步骤 48 · 监管审计查询（INSPECT 类）

- **使用的 API**：`POST /api/regulatory/audit/list`（监管审计组）
- **提供的参数**：`{"action":"INSPECT"}`
- **返回的结果**（节选，`total:2`）：

```json
{"code":0,"data":{"total":2,"records":[
  {"audit_id":"AUD-1e0b5533c011","alert_id":"ALERT-DEMO-225311",
   "authorization_id":"AUTH-DEMO-225311","action":"INSPECT",
   "operator_id":"REG-01","target":"MISSION-2026-001",
   "result":"{\"digest_match\":true,\"payload_verdict\":\"PAYLOAD_OK\",\"route_verdict\":\"ROUTE_DEVIATION\",\"signature_valid\":true}",
   "chain_tx_id":"18d62360d2ae9691ca531c43f7773b41acc96b382b8d495f88a80dbc8671290e"},
  {"audit_id":"AUD-384fc0baeff0","action":"INSPECT","operator_id":"REG-01",
   "target":"MISSION-2026-001",
   "result":"{…ROUTE_OK…}",
   "chain_tx_id":"18d62360c5fe5fe3ca34e10f5f8b599eec6e09c39547479682c7094d7f455ec6"}]}}
```

- **过程解说**：按 `action:"INSPECT"` 过滤，精确捞回步骤 46、47 两次核验审计
  （倒序，偏航那次在前）。每条审计的 `result` 内嵌结论 JSON、`chain_tx_id` 指向
  监管链存证、`authorization_id` 回指授权凭证 —— 核验行为与授权、结论、链上凭证
  四方交叉可溯（TC3-07）。步骤 45 的 `AUTH_APPROVE` 审计因 action 不同被此过滤器
  排除，证明过滤精确。

### 步骤 49 · 监管审计 CSV 导出

- **使用的 API**：`POST /api/regulatory/audit/export`（监管审计组）
- **提供的参数**：`{}`（不带过滤 → 导出全部审计）
- **返回的结果**（`data.content` 为 CSV 文本，`data.format:"csv"`、`data.rows:3`）：

```
audit_id,alert_id,authorization_id,action,operator_id,target,result,audit_hash,chain_tx_id,created_at
AUD-1e0b5533c011,ALERT-DEMO-225311,AUTH-DEMO-225311,INSPECT,REG-01,MISSION-2026-001,"{""digest_match"":true,""payload_verdict"":""PAYLOAD_OK"",""route_verdict"":""ROUTE_DEVIATION"",""signature_valid"":true}",19a70ae9…,18d62360d2ae…,…
…（共 3 行数据：2×INSPECT + 1×AUTH_APPROVE）
```

- **过程解说**：导出 3 条审计（步骤 45 的 AUTH_APPROVE + 步骤 46/47 的两条
  INSPECT）。`data.content` 直接是**可下载的 CSV 文本**，`result` 字段内嵌 JSON
  按 CSV 规范用双引号转义（`""`），前端可直接触发浏览器下载。监管离线归档/
  报送场景由此满足（TC3-07 导出环）。

### 步骤 50 · 监管驾驶舱聚合

- **使用的 API**：`POST /api/dashboard/summary`（驾驶舱组）
- **提供的参数**：`{}`
- **返回的结果**：

```json
{"code":0,"data":{
  "alerts":{"total":1,"open":0,"identified":1,"traced":0,"reviewed":0,
    "resolved":0,"archived":0,"high_open":1,"by_type":{"ROUTE_DEVIATION":1}},
  "authorizations":{"total":1,"pending":0,"authorized":1,"denied":0,"expired":0},
  "sessions":{"total":2,"init":0,"authenticated":0,"active":2,"degraded":0,
    "recovered":0,"closed":0},
  "wormhole_events":{"total":3,"detect":1,"isolate":1,"recover":1},
  "recent_alerts":[{"alert_id":"ALERT-DEMO-225311","event_type":"ROUTE_DEVIATION",
    "risk_level":"HIGH","status":"IDENTIFIED","uav_pseudonym":"PSEUDO-UAV-83921"}],
  "generated_at":"2026-09-17 22:53:21.078"}}
```

- **过程解说**：一屏聚合三幕全部关键指标，纯只读统计（P4-9，不改写任何行）：
  - **告警** 1 条（`identified:1`，`high_open:1` 高危未结案，`by_type` 全是
    ROUTE_DEVIATION）—— 正是贯穿幕三的那条告警；步骤 47 因去重未新增，故 total=1；
  - **授权** 1 条（`authorized:1`）—— 步骤 44/45 的凭证；
  - **会话** 2 条（`active:2`）—— 幕二的 SESS-41a38ba62af7 恢复后自动回归 ACTIVE
    （见步骤 37 解说）+ 步骤 39 实验派生会话；
  - **虫洞事件** 3 条，`detect:1 / isolate:1 / recover:1` —— 精确对应幕二
    DETECT→ISOLATE→RECOVER 三事件链（步骤 34/35/36）；
  - `recent_alerts` 最新 5 条告警快照。驾驶舱是三幕运行结果的一屏总账。

### 步骤 51 · 三链状态终检

- **使用的 API**：`POST /api/chain/status`（基础组）
- **提供的参数**：`{}`
- **返回的结果**：

```json
{"code":0,"data":{"chains":{"chainmaker":"ONLINE","fabric":"ONLINE",
  "fisco-bcos":"ONLINE"},"count":3},
 "trace_id":"TRACE-20260917-011a93","timestamp":"2026-09-17 22:53:21.106"}
```

- **过程解说**：51 次调用、7 次跨链闭环、多次真实上链写操作后，三条链**依然全部
  ONLINE** —— 与步骤 1 首检呼应，证明整场高强度演示未对任何链造成异常，收尾闭环。

---

## 实跑结论

| 维度 | 结果 |
|---|---|
| 调用总数 | 51 次，全部按预期返回 |
| 成功（code=0） | 50 次 |
| 设计内非零 | 1 次（步骤 43，`code=5002` 未授权密文封缄，TC3-04 预期行为） |
| 故障 | 0 |
| 跨链闭环 | 7 次全 `SUCCESS`，单程 370-518ms（远低于 p95<1000ms 验收线） |
| 覆盖链 | ChainMaker / Fabric / FISCO BCOS 三链，双向跨链均验证 |
| 覆盖场景 | TC1-01~08、TC2-01~08、TC3-01~07（详见开头映射表） |
| 三链终态 | 全程 ONLINE |

**一句话总结**：三大系统在真实三链上端到端跑通 —— 系统一完成任务跨域协同的
「注册存证→申请→跨链审核→冲突消解→许可签发/吊销」全闭环；系统二完成链下可信
网络的「SM9 会话→虫洞部署→五维检出 0.85>0.7→隔离→自动规避→恢复→攻防对比」
全剧情；系统三完成监管密文核查的「匿名告警→七级跨链追踪→未授权封缄→授权上链→
解密核验（双重验签 + 航路/载荷结论）→偏航自动告警联动→审计上链/CSV 导出→驾驶舱
聚合」全链条。全程唯一非零返回是设计内的隐私封缄，无一例真实故障。

> 完整原始响应（51 个 JSON）见部署机 `/tmp/skytrust-demo/`；一键复跑：
> `./scripts/demo-showcase.sh`（开头自带 demo/reset+init，可重复执行）。
