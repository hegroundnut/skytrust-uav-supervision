# 三幕展示流程（Demo Showcase）

> 按《任务清单与报告.md》最初约定的三大系统任务，给出可复现的端到端展示流程。
> 本文档中**所有命令均在部署机对真实三链后端实跑通过**，响应摘录取自
> 2026-09-17 22:40 的真实运行（时间戳后缀 `TS=224015`），非模拟数据。

## 0. 使用说明

### 0.1 环境前提

| 组件 | 状态要求 | 自检方式 |
| --- | --- | --- |
| ChainMaker 监管链（chain1, :12301） | ONLINE | `POST /api/chain/status` |
| Fabric 运营链（:7051） | ONLINE | 同上 |
| FISCO BCOS 管理链（:20200） | ONLINE | 同上 |
| skytrust-backend（realchains 模式, :8080） | 运行中 | 同上，`count=3` |
| gchain 管理平台（可选，:4173 → :9999） | 运行中 | 浏览器打开，链上证据可视化核查 |

启动方式见 [README](../README.md) 与 `scripts/start-chains.sh` / `scripts/start-backend-real.sh`。

### 0.2 一键执行

```bash
./scripts/demo-showcase.sh          # 全量三幕 51 次调用，约 10–20 秒
BACKEND=http://host:8080 ./scripts/demo-showcase.sh   # 指定后端
DEMO_OUT=/tmp/my-demo ./scripts/demo-showcase.sh      # 指定原始响应留存目录
```

每步原始 JSON 响应留存于 `DEMO_OUT`（默认 `/tmp/skytrust-demo`），编号与本文档步骤一致。

### 0.3 手工执行约定

- 全部接口为 `POST` + JSON，成功恒为 `code:0`；业务错误码见附录 B。
- 先导出公共变量（下文所有 curl 直接可用）：

```bash
B=http://127.0.0.1:8080
J='Content-Type: application/json'
TS=$(date +%H%M%S)                       # 唯一 ID 后缀，避免重复注册冲突
TOMORROW=$(date -d tomorrow +%F)         # 任务时间窗取明天，保证未过期
FROM=$(date -d '-1 hour' '+%F %T')
TO=$(date -d '+1 hour' '+%F %T')
post() { curl -s -X POST "$B$1" -H "$J" -d "$2"; }
```

- 链式 ID（任务号/申请号/许可号/会话号）用 `jq -r` 从响应捕获后传入下一步。

### 0.4 三幕与约定功能映射

| 幕 | 系统 | 约定功能（任务清单与报告.md） | 覆盖验收场景 |
| --- | --- | --- | --- |
| 幕一 | **系统一：任务跨域协同** | 无人机注册跨链存证；任务密文落库（SM4 密文 + SM3 摘要 + 脱敏值）；任务申请 13 步跨链中继（Fabric→ChainMaker→FISCO）；审批结果回传；多运营商冲突检测/协调；飞行许可签发/验证/吊销 | TC1-01/02/05/06/07（SM3/SM9 证据贯穿 TC1-03/04） |
| 幕二 | **系统二：链下可信网络** | SM9 会话认证；消息流 SM3 逐跳存证；虫洞隧道攻击部署；五维风险检测（邻接/时延/质询/路径/身份）；自动隔离与规避切换；攻防对比实验 | TC2-01/03/04/05/06/07/08 |
| 幕三 | **系统三：监管密文核查** | 匿名告警登记；七级身份溯源（跨三链索引）；未授权核验封缄（5002）；授权申请-审批上链；授权后解密 + SM3/SM9 双重验证；偏航核验自动关联告警；监管审计上链与 CSV 导出 | TC3-01/02/04/05/06/07 |

> 幕一/幕三所有 `18d6…` 开头的 TxID 为 ChainMaker 链上交易，可在 gchain 管理平台
> （`http://<部署机>:4173` → 区块链浏览器 → 交易列表）直接检索核验；`0x…` 为 FISCO BCOS
> 交易；64 位十六进制无 `0x` 前缀者为 Fabric 交易。

---

## 幕〇 预检与基线（3 步）

### 0-A. 三链健康自检

```bash
post /api/chain/status '{}'
```

真实运行摘录（真实 `Health()` 探针，非静态配置）：

```json
{"code":0,"data":{"chains":{"chainmaker":"ONLINE","fabric":"ONLINE","fisco-bcos":"ONLINE"},"count":3}}
```

**验证点**：三链全部 `ONLINE` 才继续；任一 `OFFLINE` 先跑 `./scripts/start-chains.sh`。

### 0-B. 业务数据重置（不触碰真实链）

```bash
post /api/demo/reset '{}'
```

```json
{"code":0,"data":{"tables_cleared":20,"started_at":"2026-09-17 22:40:15.431","reset_at":"2026-09-17 22:40:15.499"}}
```

**语义与红线**：仅 `DELETE` 20 张业务表并重灌基线（P6-R6：真实链传输层不实现
`Resettable`，链上账本与已部署合约**绝不受影响**）。重置同时清掉上一轮演示的
虫洞隔离残留（NODE-X/Y `ISOLATED`），保证幕二可从干净状态开洞。

### 0-C. 基线数据灌入

```bash
post /api/demo/init '{}'
```

```json
{"code":0,"data":{"created":{"manufacturer":3,"operator":3,"uav":7,"route_segment":5,
  "network_node":8,"identity_mapping":1,"audit_log":1},"skipped":{}}}
```

**验证点**：8 个网络节点 = `UAV-A-001-NODE` + `N1–N4` + `MGR` + 潜伏的 `NODE-X`/`NODE-Y`
（虫洞对，初始 OFFLINE）。接口幂等，重复调用全部落入 `skipped`。

---

## 幕一 系统一：任务跨域协同（12 步）

> 链路角色：**Fabric=运营链**（企业侧业务发起）、**ChainMaker=监管链**（跨链中继/存证枢纽）、
> **FISCO BCOS=管理链**（审批与许可）。每次跨链写入产生**四段 TxID**：
> 源链交易 → 监管链接收登记 → 监管链中继 → 目标链落地。

### 1-1. 运营商与航线基线

```bash
post /api/operator/list '{}'      # → 3 家运营商（Operator-A/B/C，QUALIFIED）
post /api/route/list '{}'         # → 5 条航线段（R101/R205/R306/R209/R410，Zone-A/B）
```

实测：`operators=3`、`routes=5`，含 `chain_org_id`（链上组织映射）与走廊限高。

### 1-2. 无人机注册 → 自动跨链存证

```bash
post /api/uav/register "{\"manufacturer_id\":\"Manufacturer-B\",\"model\":\"DJI-M350\",\
\"operator_id\":\"Operator-A\",\"serial_no\":\"SN-DEMO-$TS\",\"uav_id\":\"UAV-DEMO-$TS\"}"
```

真实响应（截取）——注册即触发 `UAV_REGISTER_PROOF` 跨链（fabric → chainmaker）：

```json
{"code":0,"data":{
  "uav":{"status":"VERIFIED"},
  "crosschain":{"cross_tx_id":"CX-952f5198bf8e","source_chain":"fabric","final_target_chain":"chainmaker",
    "message_type":"UAV_REGISTER_PROOF","business_id":"UAV-DEMO-224015",
    "source_chain_tx_id":"f32c71d244d94522d7ff4e3ac52e296067a6777d09d4e66cefbdea197150b052",
    "reg_receive_tx_id":"18d622aa15bf5f05cab1b796e0634e3acec2d69f1d24459792b463798d958a63",
    "reg_relay_tx_id":"18d622aa1b45ec76ca6b2e3931fa92e7bc822605fd8d4430a7e872bb0b92d178",
    "target_chain_tx_id":"18d622aa1e5758acca51d0253552ab02c08976fa99a8404abe8724e27e94a052",
    "sm9_identity":"SM9-ID-UAV-DEMO-224015","verify_result":"PASS","policy_result":"PASS",
    "status":"SUCCESS","latency_ms":523}}}
```

**验证点**：`verify_result`（SM9 验签）与 `policy_result`（准入策略）双 `PASS`；
四段 TxID 齐全；跨链闭环 523ms。

### 1-3. 注册结果回查（链上证明随档）

```bash
post /api/uav/query "{\"uav_id\":\"UAV-DEMO-$TS\"}"
# → status=VERIFIED  sm9_identity=SM9-ID-UAV-DEMO-224015
post /api/crosschain/query "{\"cross_tx_id\":\"CX-952f5198bf8e\"}"   # 四段 TxID 复核
```

### 1-4. 任务创建：密文落库（对应 TC1-03 证据源）

```bash
post /api/mission/create "{\"altitude_max\":120,\"altitude_min\":60,\
\"description\":\"展示幕一：Zone-A 全线巡检（密文落库）\",\"end_time\":\"$TOMORROW 11:00:00\",\
\"mission_type\":\"POWER_INSPECTION\",\"operator_id\":\"Operator-A\",\"payload_type\":\"CAMERA\",\
\"route_segments\":[\"R101\",\"R205\",\"R306\"],\"start_time\":\"$TOMORROW 09:00:00\",\"uav_id\":\"UAV-A-001\"}"
MID_A=$(…data.mission_id…)      # 实测 MID_A=MISSION-2026-001
```

### 1-5. 任务查询：未授权视角只见脱敏值

```bash
post /api/mission/query "{\"mission_id\":\"$MID_A\"}"
```

```json
{"code":0,"data":{"mission_id":"MISSION-2026-001",
  "masked_value":"展示幕一****",
  "sm3_hash":"bfbe3660cc6490688540306ee4c23fc3db8f527caad69a032bca1d25388a0ffc",
  "route_segments":"[\"R101\",\"R205\",\"R306\"]","zones":"[\"Zone-A\",\"Zone-B\"]"}}
```

**验证点**：任务描述以 SM4 密文落库，接口只回 `masked_value` + SM3 完整性摘要——
为幕三「监管密文核查」埋下密文与摘要基准。

### 1-6. 任务申请提交：13 步跨链闭环（Fabric → ChainMaker → FISCO）

```bash
post /api/mission/submit "{\"mission_id\":\"$MID_A\",\"operator\":\"Operator-A\"}"
# 实测：APP_A=APP-20260917-021fac  CX_A=CX-3dde6757eb35（status=RELAYED→SUCCESS）
post /api/crosschain/query "{\"cross_tx_id\":\"$CX_A\"}"
```

```json
{"code":0,"data":{"cross_tx_id":"CX-3dde6757eb35","status":"SUCCESS",
  "message_type":"MISSION_APPLICATION","source_chain":"fabric","final_target_chain":"fisco-bcos",
  "source_chain_tx_id":"e481d18fed13b58144d46557373ac6ba179e1287a1291cd4a1533cb85f23a9df",
  "reg_receive_tx_id":"18d622aa574fcf81cae27f7a79e9aa08d3cbe7b8b9e249a080ea07f694c20051",
  "reg_relay_tx_id":"18d622aa5c6db960ca8b19412096659ab0ed79bf30344489a4a6254ae8ce30b0",
  "target_chain_tx_id":"0x017ccbd449984e8e57d7272cfb56b7581793cbf0ccd31a487e96065a80b53080"}}
```

**验证点**：申请载荷带 SM3 摘要 + SM9 签名上链；`0x017c…` 可在 FISCO 控制台按哈希查到。

### 1-7. 管理链审批 → 结果回传运营链

```bash
post /api/review/submit "{\"application_id\":\"$APP_A\",\"comment\":\"展示幕一：同意执行\",\
\"result\":\"APPROVED\",\"reviewer\":\"FISCO-ADMIN\",\"rules_hit\":[\"R-ALT-001\"]}"
```

```json
{"code":0,"data":{"review":{"result":"APPROVED"},
  "crosschain":{"cross_tx_id":"CX-eb864e7fd337","source_chain":"fisco-bcos","final_target_chain":"fabric",
    "message_type":"MISSION_REVIEW_RESULT","business_id":"REV-2b1f3279c99f","status":"SUCCESS"}}}
```

**验证点**：审批结果反向跨链（fisco→chainmaker→fabric）同样四段 TxID 落定。

### 1-8. 多运营商冲突检测（对应 TC1-05）

创建 Operator-B 的重叠窗口任务（同走廊 R205、时间窗交叠）并提交后：

```bash
post /api/mission/create "{…\"operator_id\":\"Operator-B\",\"route_segments\":[\"R205\"],\
\"start_time\":\"$TOMORROW 10:00:00\",\"end_time\":\"$TOMORROW 12:00:00\",\"uav_id\":\"UAV-B-001\"…}"
MID_B=MISSION-2026-002   # 实测
post /api/mission/submit "{\"mission_id\":\"$MID_B\",\"operator\":\"Operator-B\"}"   # APP_B=APP-20260917-540b7b
post /api/conflict/detect "{\"mission_id\":\"$MID_B\"}"
```

```json
{"code":0,"data":{"count":1,"conflicts":[{"conflict_id":"CFL-76052ac509fa",
  "mission_id_a":"MISSION-2026-002","mission_id_b":"MISSION-2026-001","conflict_type":"ROUTE",
  "suggestion":"{\"adjust_altitude\":\"调整至与对方任务不重叠的高度层\",
                 \"adjust_route\":\"改走邻近走廊，避开冲突段 R205\",
                 \"adjust_time\":\"时间窗后移30分钟\"}","status":"OPEN"}]}}
```

**验证点**：干净基线下**恰好 1 条** ROUTE 冲突（重置前历史任务会累积多条——这正是 0-B 重置的意义）；
系统给出高度/航路/时间三维协调建议。

### 1-9. 冲突协调后放行（对应 TC1-06）

```bash
post /api/conflict/resolve "{\"conflict_id\":\"CFL-76052ac509fa\",\"operator\":\"Operator-B\",\
\"resolution\":\"时间窗后移30分钟\"}"        # → status=RESOLVED
post /api/review/submit "{\"application_id\":\"$APP_B\",\"comment\":\"冲突已消解，同意\",\
\"result\":\"APPROVED\",\"reviewer\":\"FISCO-ADMIN\",\"rules_hit\":[]}"   # → APPROVED
```

### 1-10. 飞行许可签发/验证（对应 TC1-07）

```bash
post /api/pass/issue "{\"issuer\":\"FISCO-ADMIN\",\"mission_id\":\"$MID_A\",\
\"valid_from\":\"$FROM\",\"valid_to\":\"$TO\"}"
# 实测：PASS_A=PASS-2026-001 status=VALID（fisco→fabric 跨链，CX-bae8…系列四段 TxID）
post /api/pass/verify "{\"pass_id\":\"$PASS_A\"}"
# → {"valid":true,"status":"VALID","reasons":[]}
```

### 1-11. 许可吊销 → 验证即拒（对应 TC2-02 前置）

```bash
post /api/pass/revoke "{\"operator\":\"FISCO-ADMIN\",\"pass_id\":\"$PASS_A\",\"reason\":\"展示幕一：任务结束\"}"
# → status=REVOKED（PASS_REVOKE 跨链回传运营链）
post /api/pass/verify "{\"pass_id\":\"$PASS_A\"}"
# → {"valid":false,"status":"REVOKED","reasons":["许可已吊销"]}
```

### 1-12. 跨链流水总览

```bash
post /api/crosschain/list '{}'
# 实测：records=7 success=7（本轮 7 次跨链闭环全部 SUCCESS，无重试无失败）
```

---

## 幕二 系统二：链下可信网络——虫洞攻防（10 步）

> 场景：无人机 `UAV-A-001-NODE` 经边缘节点 `N1→N2→N3→N4` 上联管理节点 `MGR`。
> 攻击者在 `N1–N4` 之间部署虫洞隧道 `NODE-X ↔ NODE-Y`（虚假邻接 + 异常低时延），
> 平台以**五维风险检测**识破、隔离并自动规避。

### 2-1. 节点注册（SM9 身份自动派生）

```bash
post /api/node/register "{\"node_id\":\"N-DEMO-$TS-1\",\"node_type\":\"EDGE\",\"position\":{\"X\":12,\"Y\":34}}"
# → sm9_identity=SM9-ID-N-DEMO-224015-1（未提供时自动派生）status=ONLINE
post /api/node/register "{\"node_id\":\"N-DEMO-$TS-2\",\"node_type\":\"MANAGEMENT\",\"position\":{\"X\":50,\"Y\":60}}"
```

**枚举**：`node_type ∈ {UAV, EDGE, MANAGEMENT, ATTACKER}`（传 `MGR` 会得 4003）。

### 2-2. 拓扑快照

```bash
post /api/topology/get '{}'    # 实测：nodes=10 edges=5
```

10 节点 = 种子 8 + 新注册 2；5 边 = `UAV-A-001-NODE–N1–N2–N3–N4–MGR` 主干
（NODE-X/Y 此时 OFFLINE 不计边）。

### 2-3. 会话建立：SM9 挑战-应答认证（对应 TC2-01）

```bash
post /api/session/open '{"uav_id":"UAV-A-001"}'
```

```json
{"code":0,"data":{"session":{"session_id":"SESS-94afaa058f53","status":"ACTIVE",
   "current_path":"[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]"},
  "path":["UAV-A-001-NODE","N1","N2","N3","N4","MGR"],
  "auth":{"nonce":"NONCE-520b1c4a56a925da067f276552d89056",
    "sm9_identity":"SM9-ID-UAV-A-001-NODE","signature":"MGYEIE648JhRTPc6…","verified":true}}}
```

**验证点**：随机 nonce + SM9 签名 `verified:true`；初始路径 6 跳主干。

### 2-4. 正常消息流：SM3 逐跳存证（对应 TC2-03）

```bash
post /api/message/send "{\"msg_type\":\"POSITION_UPDATE\",\"session_id\":\"$S1\",\
\"source_node\":\"UAV-A-001-NODE\",\"target_node\":\"MGR\"}"
```

```json
{"code":0,"data":{"message":{"message_id":"MSG-d1100cfb374e8be1","seq":1,
  "sm3_hash":"398d672dbf6a1f3254a2ee4d4f307ac7d43a595c930d7426a0e37ab4f40a2c7a",
  "latency_ms":45,"status":"SUCCESS",
  "evidence":"{\"path_detail\":[{\"from\":\"UAV-A-001-NODE\",\"to\":\"N1\",\"latency_ms\":9},…]}"}}}
```

再发一条 `ROUTE_STATUS`（seq=2），`post /api/message/list "{\"session_id\":\"$S1\"}"` → `msgs=2`。
**验证点**：每条消息带 SM3 摘要与逐跳时延证据（`path_detail`），正常基线时延 ~45ms。

### 2-5. 虫洞隧道部署（对应 TC2-04）

```bash
post /api/wormhole/toggle '{"enabled":true,"operator":"ATTACKER-SIM"}'
# → {"wormhole_enabled":true,"nodes_affected":["NODE-X","NODE-Y","N1","N4"]}
post /api/topology/get '{}'    # edges_now=8（新增 N1–X、X–Y、Y–N4 三条隧道边）
```

### 2-6. 攻击下送信 + 五维风险检测（对应 TC2-05）

```bash
post /api/message/send "{…POSITION_UPDATE…}"   # seq=3 latency=19ms —— 走隧道异常“快”
post /api/risk/evaluate "{\"session_id\":\"$S1\"}"
```

```json
{"code":0,"data":{"risk_score":1,"threshold":0.7,"verdict":"DETECT",
  "dimensions":{"identity":0,"adjacency":0.35,"latency":0.25,"challenge":0.25,"path":0.15},
  "session_status":"DEGRADED"}}
```

**验证点**：19ms ≪ 45ms 基线触发时延维；虚假邻接/质询/路径维联合计分
`1.0 > 0.7` → `DETECT`；会话自动 `DEGRADED`，NODE-X/Y 被 `ISOLATED`（隔离后
`wormhole/toggle` 重开会得 4001——隔离态优先于攻击开关，防止“复活”攻击节点）。

### 2-7. 攻防事件留痕

```bash
post /api/event/list "{\"session_id\":\"$S1\"}"   # → ["ISOLATE","DETECT"]（含检测维度快照）
```

### 2-8. 自动规避切换（对应 TC2-06）

```bash
post /api/path/switch "{\"operator\":\"OP-1\",\"session_id\":\"$S1\"}"
```

```json
{"code":0,"data":{"session":{"status":"RECOVERED"},
  "original_path":["UAV-A-001-NODE","N1","NODE-X","NODE-Y","N4","MGR"],
  "new_path":["UAV-A-001-NODE","N1","N2","N3","N4","MGR"],
  "recovery_latency_ms":45,"event":{"event_id":"WH-a48e0615b931","action":"RECOVER"}}}
```

**验证点**：受损路径（含 NODE-X/Y）作为证据留档；Dijkstra 在「仅 ONLINE」可信拓扑上
重算绕行路径；仅 `DEGRADED` 会话可切换（否则 4002）。

### 2-9. 交互恢复（对应 TC2-07）+ 攻击结束

```bash
post /api/message/send "{…ROUTE_STATUS…}"     # seq=4 latency=45ms —— 时延回到基线
post /api/wormhole/toggle '{"enabled":false,"operator":"ATTACKER-SIM"}'
```

### 2-10. 攻防对比实验（对应 TC2-08）

```bash
post /api/experiment/run '{"count":3,"experiment_type":"MESSAGE_FLOW","scenario":"DEFENSE"}'
```

```json
{"code":0,"data":{"experiment_id":"EXP-20260917-6b253c","run_id":"RUN-85166fe11205",
  "scenario":"DEFENSE","count":3,"success_count":3,"success_rate":1,
  "avg_latency_ms":…,"p95_latency_ms":26,"status":"DONE"}}
```

**枚举**：`scenario ∈ {NORMAL, ATTACK, DEFENSE}`。注意：若刚跑完 2-6 的隔离且未重置，
`ATTACK` 场景会因 NODE-X/Y `ISOLATED` 而 setup 失败（6001）——重跑本幕前先执行 0-B 重置。

---

## 幕三 系统三：监管密文核查（10 步）

> 场景：监管方收到匿名告警（只见化名），需**七级溯源**定位责任主体；核查任务密文
> 必须走**授权闭环**——未授权只能拿到封缄摘要，授权审批本身也上链留痕。

### 3-1. 匿名告警登记（对应 TC3-01）

```bash
post /api/alert/raise "{\"alert_id\":\"ALERT-DEMO-$TS\",\"event_type\":\"ROUTE_DEVIATION\",\
\"mission_id\":\"$MID_A\",\"operator\":\"REG-01\",\"risk_level\":\"HIGH\",\"source_system\":\"MANUAL\",\
\"uav_pseudonym\":\"PSEUDO-UAV-83921\"}"
```

```json
{"code":0,"data":{"alert_id":"ALERT-DEMO-224015","uav_pseudonym":"PSEUDO-UAV-83921",
  "evidence_hash":"05862c3a98240da679974e5ba7f20f6ffdc3bef98bc9b00b4088402abe88ce25","status":"OPEN"}}
```

**约束**：`alert_id` 必须 `ALERT-` 前缀（否则 6002）；证据自动 SM3 固化。

### 3-2. 告警状态流转

```bash
post /api/alert/status "{\"alert_id\":\"ALERT-DEMO-$TS\",\"operator\":\"REG-01\",\
\"reason\":\"初判成立\",\"to_status\":\"IDENTIFIED\"}"      # → status=IDENTIFIED
```

状态机：`OPEN → IDENTIFIED → TRACED → REVIEWED → RESOLVED → ARCHIVED`。

### 3-3. 七级身份溯源（对应 TC3-02，跨三链索引）

```bash
post /api/trace/identity "{\"alert_id\":\"ALERT-DEMO-$TS\",\"operator\":\"REG-01\"}"
```

实测七级全部 `RESOLVED`（`break_level=0` 无断链），每级 1–2ms，总计亚秒：

| 级 | 名称 | 实测值 | 数据源 |
| --- | --- | --- | --- |
| 1 | PSEUDO | PSEUDO-UAV-83921 | CHAINMAKER_INDEX |
| 2 | DEVICE_ADDRESS | 0xADDR83921 | CHAINMAKER_INDEX |
| 3 | PASS_ID | PASS-2026-001 | CHAINMAKER_INDEX |
| 4 | SM9_IDENTITY | SM9-ID-UAV-A-001 | CHAINMAKER_INDEX |
| 5 | UAV_ID | UAV-A-001 | FABRIC_DETAIL |
| 6 | OPERATOR_ID | Operator-A | FABRIC_DETAIL |
| 7 | MANUFACTURER_ID | Manufacturer-B | FISCO_BCOS_DETAIL |

**验证点**：溯源链横跨三链——监管链索引（1–4 级）→ 运营链明细（5–6 级）→ 管理链明细（7 级）。

### 3-4. 未授权核验：密文封缄（对应 TC3-04）

```bash
post /api/inspect/ciphertext "{\"mission_id\":\"$MID_A\",\"regulator_id\":\"REG-02\"}"
```

```json
{"code":5002,"message":"biz error 5002: mission MISSION-2026-001 密文未授权访问：仅返回密文状态/摘要/脱敏值",
 "data":{"authorized":false,"sealed":{"mission_id":"MISSION-2026-001","ciphertext_status":"SEALED",
   "sm3_hash":"bfbe3660…","masked_value":"展示幕一****","has_ciphertext":true}}}
```

**验证点**：`5002` 是**设计内行为**——REG-02 无授权时只能拿到封缄三元组
（密文状态/SM3 摘要/脱敏值），明文绝不外泄；摘要与 1-5 步落库值一致。

### 3-5. 授权申请（对应 TC3-05 前半）

```bash
post /api/authorize/apply "{\"authorization_id\":\"AUTH-DEMO-$TS\",\"reason\":\"核查告警 ALERT-DEMO-$TS\",\
\"regulator_id\":\"REG-01\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\
\"target_id\":\"$MID_A\",\"target_type\":\"MISSION\"}"
# → status=PENDING，audit_hash=4eb161fa…（申请本身先固化审计摘要）
```

### 3-6. 授权审批上链（ChainMaker 留痕）

```bash
post /api/authorize/review "{\"authorization_id\":\"AUTH-DEMO-$TS\",\"comment\":\"同意\",\
\"decision\":\"APPROVE\",\"reviewer_id\":\"REG-ADMIN\"}"
```

```json
{"code":0,"data":{"auth":{"status":"AUTHORIZED","valid_to":"2026-09-18 22:40:23.700"},
  "chain_tx_id":"18d622abe8276b9dcaf816b579d0d8d8279167a9c0fa4cbda19dca4441876063"}}
```

**验证点**：`18d622abe827…` 可在 gchain 管理平台交易列表检索——授权动作本身不可抵赖。

### 3-7. 授权后解密 + 双重验证（对应 TC3-05 后半）

```bash
post /api/inspect/ciphertext "{\"authorization_id\":\"AUTH-DEMO-$TS\",\"mission_id\":\"$MID_A\",\
\"payload_type\":\"CAMERA\",\"regulator_id\":\"REG-01\",\"trajectory\":\"NORMAL\"}"
```

```json
{"code":0,"data":{"authorized":true,
  "decrypted_view":"展示幕一：Zone-A 全线巡检（密文落库）",
  "verification":{"digest_match":true,"signature_valid":true,"audit_hash":"cc2e1a06…"},
  "conclusion":{"route_verdict":"ROUTE_OK","payload_verdict":"PAYLOAD_OK","raised_alerts":[]},
  "scope":["MISSION","ROUTE","PAYLOAD","IDENTITY"],
  "chain_tx_id":"18d622abf1737e2ecaaa4ba6d5ddd1b3121771a7e4b446c9a193b3e76538cde9",
  "reg_audit_id":"AUD-0a7ccac238ff"}}
```

**验证点**：明文还原与 1-4 步创建时原文一致；SM3 摘要比对（`digest_match`）+
SM9 验签（`signature_valid`）双通过；本次核查又产生一条 ChainMaker 审计 TxID。

### 3-8. 偏航核验变体（对应 TC3-06）

```bash
post /api/inspect/ciphertext "{…同上，\"trajectory\":\"DEVIATION\"…}"
```

```json
{"code":0,"data":{"conclusion":{"route_verdict":"ROUTE_DEVIATION","payload_verdict":"PAYLOAD_OK",
  "raised_alerts":["ALERT-DEMO-224015"]},
  "verification":{"digest_match":true,"signature_valid":true}}}
```

**验证点**：`trajectory` 枚举为 `NORMAL|DEVIATION`；偏航判定自动**关联既有告警**
（3-1 的 ALERT-DEMO-224015 出现在 `raised_alerts`），形成告警-核查闭环。

### 3-9. 监管审计流水与导出（对应 TC3-07）

```bash
post /api/regulatory/audit/list '{"action":"INSPECT"}'
# → records=2（NORMAL 与 DEVIATION 两次核查），每条含 audit_hash + chain_tx_id
post /api/regulatory/audit/export '{}'
# → data.content 为 CSV：表头 audit_id,alert_id,authorization_id,action,operator_id,
#    target,result,audit_hash,chain_tx_id,created_at
```

### 3-10. 监管仪表盘总览

```bash
post /api/dashboard/summary '{}'
```

```json
{"code":0,"data":{"alerts":{"total":1,"identified":1,"high_open":1,"by_type":{"ROUTE_DEVIATION":1}},
  "authorizations":{"total":1,"authorized":1},
  "sessions":{"total":2,"active":2},
  "wormhole_events":{"total":3,"detect":1,"isolate":1,"recover":1}}}
```

**验证点**：三幕动作全部汇聚——1 告警、1 授权、3 虫洞事件（DETECT/ISOLATE/RECOVER 各 1）。

---

## 终场与延伸核查

```bash
post /api/chain/status '{}'    # 收针：三链仍全部 ONLINE（演示全程零链故障）
```

| 延伸核查 | 方式 |
| --- | --- |
| §6.5 五项验收全量复测 | `./scripts/run-acceptance.sh`（三链探针、部署 TxID、13 步闭环、四段 TxID、CROSSCHAIN_LOOP×100 p95<1000ms） |
| 链上证据可视化 | gchain 管理平台 `http://<部署机>:4173`：区块链浏览器查 chain1 区块/交易（本文所有 `18d6…` TxID）、合约列表（5 合约 v1.0.2） |
| Fabric / FISCO 侧核验 | Fabric：`peer lifecycle chaincode querycommitted -C skytrust-channel`；FISCO：console `getTransactionByHash <0x…>` |
| 端点全集与请求样例 | `docs/apifox/skytrust-backend.openapi.json`（64 端点）；场景化脚本 `docs/apifox/skytrust-test-scenarios.json`（24 场景） |
| 版本/偏差/部署实录 | `docs/version-matrix.md`（§4.4 TxID 登记、§10 gchain 部署实录） |

### 本文档实测运行证据登记（2026-09-17 22:40，TS=224015）

| 对象 | 实测值 |
| --- | --- |
| 任务 A / B | MISSION-2026-001 / MISSION-2026-002 |
| 申请 A / B | APP-20260917-021fac / APP-20260917-540b7b |
| 冲突 | CFL-76052ac509fa（ROUTE，R205 走廊） |
| 许可 | PASS-2026-001（VALID → REVOKED → verify 拒绝） |
| 跨链闭环 | 7/7 SUCCESS（含 UAV_REGISTER_PROOF 523ms） |
| 会话 | SESS-94afaa058f53（ACTIVE→DEGRADED→RECOVERED） |
| 风险检测 | risk_score=1.0 > 0.7，DETECT，五维 {0, .35, .25, .25, .15} |
| 实验 | RUN-85166fe11205（DEFENSE ×3，成功率 100%，p95=26ms） |
| 告警 / 授权 | ALERT-DEMO-224015 / AUTH-DEMO-224015 |
| 授权上链 TxID | 18d622abe8276b9dcaf816b579d0d8d8279167a9c0fa4cbda19dca4441876063 |
| 核查审计 | AUD-0a7ccac238ff（ROUTE_OK）+ AUD-4d0aeda88461（ROUTE_DEVIATION） |

> 每轮运行的 ID/时间戳不同属正常现象（唯一性防重复注册）；链上 TxID 以当轮
> `crosschain/list` 与 gchain 平台检索为准。

---

## 附录 A：响应形状速查

| 形状 | 端点示例 | 取法 |
| --- | --- | --- |
| 分页列表 | operator/route/crosschain/message/event/audit 各 list | `data.records[]` + `data.total` |
| 扁平单对象 | mission/create·query、uav/query、node/register、alert/raise·status、conflict/resolve | `data.<字段>` 直取 |
| 包装对象 | mission/submit（`data.application`+`data.crosschain`）、review/submit（`data.review`+`data.crosschain`）、pass/issue·revoke（`data.pass`+`data.crosschain`）、authorize/review（`data.auth`+`data.chain_tx_id`）、message/send（`data.message`）、session/open（`data.session`+`data.path`+`data.auth`） | 按包装键取 |
| 特例 | uav/register（`data.uav`+`data.crosschain`）、inspect/ciphertext 未授权（`code=5002` 且 `data.sealed` 仍有内容）、audit/export（`data.content`=CSV 文本）、wormhole/toggle（`data.wormhole_enabled`+`data.nodes_affected`） | — |

## 附录 B：业务错误码（演示中实测出现）

| 码 | 含义 | 演示中触发点 |
| --- | --- | --- |
| 4001 | 虫洞状态冲突（ISOLATED 节点不可由 toggle 复活） | 未重置时重开虫洞 |
| 4002 | 会话状态机拒绝（仅 DEGRADED 可 path/switch） | 对 ACTIVE 会话切径 |
| 4003 | 节点身份非法（node_type 不在枚举） | 传 `MGR` 而非 `MANAGEMENT` |
| 5002 | 密文未授权访问（封缄返回，**设计内行为**） | 幕三 3-4 |
| 6001 | 实验执行失败（如 ATTACK 场景遇 ISOLATED 残留） | — |
| 6002 | 参数/业务校验失败（ID 前缀、枚举、必填） | trajectory 传 `DEVIATED` 等 |
