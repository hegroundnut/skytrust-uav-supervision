# 云巡信链后端服务（SkyTrust Backend）

## 服务简介

「云巡信链（SkyTrust）」——无人机跨域协同与可信监管原型——的后端服务。基于 Go + Gin + GORM（SQLite）构建，提供：

- **基础平台（Plan 1）**：统一响应/错误码、健康检查、SM3/SM9 国密能力、多链适配（模拟 fabric / chainmaker / fisco-bcos）、演示数据预置、审计日志查询与导出；
- **跨链网关（Plan 2）**：13 步跨链协议引擎——监管链非旁路、业务链不直连（fabric 与 fisco-bcos 之间必经 chainmaker 中转）、两跳四段 TxID 全程留痕、幂等去重（2004）、传输级重试、SM3/SM9 成败均留痕（`verify_result = PASS|FAIL_SM3|FAIL_SM9`）；
- **系统一·任务申请跨域协同（Plan 2）**：主数据 → 无人机注册跨链证明 → 任务创建（SM9 加密 + 脱敏）→ 提交（源链交易 + MISSION_APPLICATION 跨链）→ 监管审核（MISSION_REVIEW_RESULT 跨链）→ 三维冲突协调 → 飞行许可签发/验证/吊销（FLIGHT_PASS / PASS_REVOKE 跨链）；
- **系统二·链下可信网络（Plan 3）**：亚秒级 Dijkstra 可信路由与确定性时延仿真、SM9 挑战认证会话、消息引擎（seq/SM3/SM9/失败也留痕）、虫洞攻击仿真与 5 维风险检测、节点隔离与可信路径重算恢复；
- **系统三·跨域可信监管（Plan 4）**：6 类安全告警与线性状态机、7 级跨链身份亚秒追踪（断链即断点留痕，禁止拼造）、监管授权（scope×目标×有效窗 + ChainMaker 上链）、SM9 密文核验（未授权仅返回封缄——密文状态/摘要/脱敏值；授权后按 scope 解密临时视图 + SM3/SM9 双验证 + 航路/载荷一致性自动告警，核验结论 audit_hash 上链）、监管审计查询/CSV 导出与驾驶舱聚合。

## 启动方式

使用仓库自带的 hermetic Go 工具链（`tools/go`）。在 **仓库根目录** 执行：

```bash
export PATH="$PWD/tools/go/bin:$PATH"
export GOPROXY=https://goproxy.cn,direct
cd services/skytrust-backend && go run ./cmd/server
```

服务默认监听 `:8080`（见下方环境变量表）。首次启动会自动创建 `data/skytrust.db`、AutoMigrate 20 张表，并在 `data/sm9` 下生成 SM9 主密钥。

> 说明：`data/`、`*.db`、`*.pem`、`tools/` 均不入库；端到端冒烟验证由 `tests/` 覆盖，无需手动起服务。

## 环境变量

未设置时使用以下默认值（见 `internal/config/config.go`）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SERVER_ADDR` | `:8080` | HTTP 监听地址 |
| `DB_PATH` | `data/skytrust.db` | SQLite 数据库文件路径 |
| `CHAIN_MODE` | `sim` | 链模式：`sim`（模拟链，默认）/ `real`（真实三链由 Plan 6 接入 ChainMaker→Fabric→FISCO SDK） |
| `SM9_KEY_DIR` | `data/sm9` | SM9 主密钥持久化目录 |
| `APP_TIMEZONE` | `Asia/Shanghai` | 响应时间戳时区 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `OFFCHAIN_AUTOPILOT_MS` | `0` | 系统二后台 HEARTBEAT 间隔（毫秒）。`0`=关闭（测试默认）；生产入口 main.go 在值为 0 时自动采用 2000ms；设为负值 = 显式关闭生产后台流量 |

## API 约定与端点清单

**约定（重要）：**

- **所有请求一律使用 `POST`**（`Content-Type: application/json`）。
- **HTTP 200 ≠ 业务成功**：HTTP 状态码恒为 200，业务结果以响应体 `code` 字段为准，**`code=0` 表示成功**，非 0 为错误码。
- 统一响应结构（`timestamp` 时区为 `Asia/Shanghai`，格式 `2006-01-02 15:04:05.000`）：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {},
    "trace_id": "TRACE-20260910-cde826",
    "timestamp": "2026-09-10 21:14:15.000"
  }
  ```

**共 64 个端点**（分组：health×2 / chain×1 / crypto×4 / demo×2 / audit×2 / crosschain×3 / masterdata×6 / uav×5 / mission×4 / review×2 / conflict×2 / pass×5 / offchain×12 / regulatory×10 / experiment×4）：

| 分组 | 端点 | 说明 |
| --- | --- | --- |
| health | `POST /api/health/ping` | 存活探测，返回 `{"ping":"pong"}` |
| health | `POST /api/health/check` | 健康检查（DB / 三链状态） |
| chain | `POST /api/chain/status` | 三模拟链状态（fabric / chainmaker / fisco-bcos） |
| crypto | `POST /api/crypto/sm3` | SM3 摘要 |
| crypto | `POST /api/crypto/sm9/keygen` | 生成 SM9 节点身份密钥 |
| crypto | `POST /api/crypto/sm9/sign` | SM9 签名 |
| crypto | `POST /api/crypto/sm9/verify` | SM9 验签 |
| demo | `POST /api/demo/init` | 幂等预置演示数据 |
| demo | `POST /api/demo/reset` | 重置演示数据（重置后可重复 init） |
| audit | `POST /api/audit/query` | 分页查询审计日志（business_id / action / actor 过滤） |
| audit | `POST /api/audit/export` | 导出审计日志 CSV |
| crosschain | `POST /api/crosschain/send` | 跨链发送（13 步协议；signature 空则按 sm9_identity 平台代签） |
| crosschain | `POST /api/crosschain/query` | 按 cross_tx_id 查跨链留痕（四段 TxID / 验证结果 / 错误码） |
| crosschain | `POST /api/crosschain/list` | 跨链记录分页列表（status / message_type 过滤） |
| masterdata | `POST /api/manufacturer/register` | 注册厂商 |
| masterdata | `POST /api/manufacturer/list` | 厂商列表 |
| masterdata | `POST /api/operator/register` | 注册运营方 |
| masterdata | `POST /api/operator/list` | 运营方列表 |
| masterdata | `POST /api/route/create` | 创建航段（走廊状态 OPEN/RESTRICTED/CLOSED） |
| masterdata | `POST /api/route/list` | 航段列表（zone / corridor_status 过滤） |
| uav | `POST /api/uav/register` | 无人机注册 + UAV_REGISTER_PROOF 跨链（fabric→chainmaker）→ VERIFIED |
| uav | `POST /api/uav/query` | 按 uav_id 查询 |
| uav | `POST /api/uav/list` | 列表（operator_id / manufacturer_id / status 过滤） |
| uav | `POST /api/uav/status` | 状态流转（VERIFY / ACTIVATE / SUSPEND / RESUME） |
| uav | `POST /api/uav/revoke` | 注销（→ REVOKED，终态） |
| mission | `POST /api/mission/create` | 任务创建（描述 SM9 加密落库，对外仅脱敏值；SM3+SM9 签名）→ DRAFT |
| mission | `POST /api/mission/query` | 按 mission_id 查询（永不返回密文） |
| mission | `POST /api/mission/list` | 分页列表（operator_id / uav_id / status 过滤） |
| mission | `POST /api/mission/submit` | 提交：源链交易 + MISSION_APPLICATION 跨链（fabric→fisco-bcos）；失败自动撤回 DRAFT |
| review | `POST /api/review/submit` | 监管审核裁决（APPROVED / REJECTED / NEED_COORDINATION）+ MISSION_REVIEW_RESULT 跨链（fisco-bcos→fabric） |
| review | `POST /api/review/query` | 按 review_id 或 application_id 查询审核记录 |
| conflict | `POST /api/conflict/detect` | 三维冲突检测（时间∧航路∧高度同时重叠）→ 双方进 COORDINATING（已获批任务只标记不迁移） |
| conflict | `POST /api/conflict/resolve` | 冲突解决 → RESOLVED，相关任务回 REVIEWING |
| pass | `POST /api/pass/issue` | 飞行许可签发（APPROVED 任务；FLIGHT_PASS 跨链 fisco-bcos→fabric）→ VALID |
| pass | `POST /api/pass/query` | 按 pass_id 查询 |
| pass | `POST /api/pass/list` | 分页列表（mission_id / uav_id / status 过滤） |
| pass | `POST /api/pass/verify` | 放行验证（SM3/SM9 重算 + 窗口检查；过期自动 EXPIRED）；永远 code=0，有效性看 `valid/reasons` |
| pass | `POST /api/pass/revoke` | 吊销（本地先行立即生效 + PASS_REVOKE 跨链 best-effort） |
| offchain | `POST /api/topology/get` | 链下网络拓扑视图（nodes/edges/wormhole_enabled/isolated/active_sessions） |
| offchain | `POST /api/node/register` | 链下节点注册（node_type 四类；sm9_identity 空=自动派生；重复→6002） |
| offchain | `POST /api/node/list` | 节点分页列表（node_type / status 过滤） |
| offchain | `POST /api/session/open` | 会话开启：SM9 挑战认证（signature 空=平台代签 nonce）+ Dijkstra 初始可信路径，落库即 ACTIVE |
| offchain | `POST /api/session/close` | 会话关闭（仅 ACTIVE/DEGRADED/RECOVERED 可关，非法→4002） |
| offchain | `POST /api/session/list` | 会话分页列表（status / uav_id / mission_id 过滤） |
| offchain | `POST /api/message/send` | 消息引擎：seq 递增 + SM3 摘要 + SM9 签名 + 实时可信路由 + 仿真实测时延；失败落 FAILED 留痕行 |
| offchain | `POST /api/message/list` | 消息分页列表 + `stats`（count/success_rate/avg/p50/p95/max latency） |
| offchain | `POST /api/wormhole/toggle` | 虫洞攻击开关：ON 写入虚假邻接（隐藏隧道），OFF 恢复；ISOLATED 节点拒绝重新上线（4001） |
| offchain | `POST /api/risk/evaluate` | 5 维虫洞风险评分（identity/adjacency/latency/challenge/path，阈值 0.7）；DETECT/BLOCK → 隔离 X/Y + 会话降级 |
| offchain | `POST /api/path/switch` | 可信路径重算（仅 DEGRADED；new_path 空=自动 Dijkstra）→ RECOVERED + RECOVER 事件（recovery_latency_ms 实测） |
| offchain | `POST /api/event/list` | 虫洞事件分页列表（session_id / action(DETECT\|ISOLATE\|RECOVER) 过滤） |
| regulatory | `POST /api/alert/raise` | 安全告警登记（6 类 event_type 枚举；支持显式 alert_id；WORMHOLE_ALERT 可关联系统二事件派生证据哈希） |
| regulatory | `POST /api/alert/list` | 告警分页列表（event_type / status / risk_level / source_system / mission_id 过滤） |
| regulatory | `POST /api/alert/status` | 告警状态迁移（OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED 线性状态机，非法迁移→6002） |
| regulatory | `POST /api/trace/identity` | 7 级跨链身份追踪（伪名/设备地址/告警编号入口，逐链溯源+单级耗时；断链→5001+断点留痕） |
| regulatory | `POST /api/authorize/apply` | 监管授权申请（scope 多选 + 目标 + 有效窗；audit_hash=SM3 规范化；→PENDING，不上链） |
| regulatory | `POST /api/authorize/review` | 授权审批（APPROVE→ChainMaker regulatory_authorization 上链成功→AUTHORIZED，上链失败 2001 停留 PENDING 可重试；DENY→本地 DENIED 不上链） |
| regulatory | `POST /api/inspect/ciphertext` | 密文核验（未授权/过期/scope 违规→5002/5004/5003 仅返回封缄；授权→SM9 解密临时视图（不落库）+ SM3/SM9 双验证 + 航路/载荷一致性结论上链 audit_record） |
| regulatory | `POST /api/regulatory/audit/list` | 监管审计分页查询（alert_id / authorization_id / action / operator_id 过滤） |
| regulatory | `POST /api/regulatory/audit/export` | 监管审计 CSV 导出（表头 audit_id,…,created_at） |
| regulatory | `POST /api/dashboard/summary` | 监管驾驶舱聚合（告警状态/类型分布+高危未结案、授权、会话、虫洞事件计数、最新 5 条告警） |
| experiment | `POST /api/experiment/run` | 运行实验（11 类：跨链回路/完整性/验签/冲突/消息流三场景/风险扫描/压力/批量追踪/授权核验/告警批量） |
| experiment | `POST /api/experiment/result` | 实验结果查询（成功率/时延分位/失败原因） |
| experiment | `POST /api/experiment/list` | 实验列表（分页） |
| experiment | `POST /api/experiment/export` | 实验结果 CSV 导出 |

### 关键错误码

| 码 | 常量 | 含义 |
| --- | --- | --- |
| 0 | OK | 成功 |
| 1001 | InvalidUAV | 无人机不存在 / 状态不可用 |
| 1002 | SM9Verify | SM9 验签失败 |
| 1003 | SM3Integrity | SM3 完整性校验失败 |
| 1004 | UAVState | 无人机状态迁移非法 |
| 2001 | CrosschainSend | 跨链发送失败（源链确认 / 监管链跳） |
| 2002 | TargetChain | 目标链写入失败 |
| 2003 | RegVerify | 监管校验失败（声明路由与固定路由不一致） |
| 2004 | IdempotentDup | 幂等命中（重复提交；`data` 返回已有记录） |
| 3001 | RouteConflict | 航路不存在 / 走廊状态不可规划 |
| 3002 | PassInvalid | 许可状态非法（吊销 / 重复签发等） |
| 3003 | ReviewRule | 审核规则 / 申请状态非法 |
| 3004 | MissionState | 任务状态迁移非法 |
| 4001 | WormholeRisk | 虫洞风险一票否决 / 试图重新上线已隔离节点 |
| 4002 | SessionAuth | 会话认证失败 / 会话状态迁移非法（状态机拒绝） |
| 4003 | NodeIdentity | 节点不存在 / node_type 非法 / SM9 身份格式非法 |
| 4004 | PathUnreachable | 可信拓扑中无可达路径（Dijkstra 不可达） |
| 5001 | TraceBroken | 身份追踪断链（`data` 携带 break_level 与 7 级明细，断点级之后标 BROKEN+原因，禁止拼造） |
| 5002 | NoAuth | 密文访问未授权（无授权号/不存在/PENDING/DENIED；`data` 仅封缄：ciphertext_status/sm3_hash/masked_value） |
| 5003 | AuthScope | 授权 scope 或目标违规（scope 缺 ROUTE/PAYLOAD、授权目标与任务不匹配） |
| 5004 | AuthExpired | 授权已过期或尚未生效（valid_from/valid_to 窗口检查；过期惰性置 EXPIRED） |
| 6002 | Param | 参数非法 / 资源不存在 |
| 9001 | Internal | 内部错误 |

## 系统一业务流程（演示闭环）

1. `demo/init` 预置演示数据（3 厂商 / 3 运营商 / 7 无人机 / 5 航段）；
2. `uav/register` 注册新机 → UAV_REGISTER_PROOF 跨链（fabric→chainmaker 身份索引）→ VERIFIED；
3. `mission/create` 创建任务（描述 SM9 加密，响应仅 `masked_value` 脱敏值）→ DRAFT；
4. `mission/submit` 提交 → 源链交易 + MISSION_APPLICATION 跨链（fabric→fisco-bcos）→ 任务 SUBMITTED / 申请 RELAYED；**跨链失败自动撤回 DRAFT**，可修改后重报；
5. `review/submit` 监管审核 → MISSION_REVIEW_RESULT 跨链（fisco-bcos→fabric）→ APPROVED / REJECTED / COORDINATING；
6. `conflict/detect` + `conflict/resolve` 三维冲突协调（COORDINATING ⇄ REVIEWING）；
7. `pass/issue` 签发飞行许可（FLIGHT_PASS 跨链）→ `pass/verify` 放行前验证；
8. `pass/revoke` 吊销许可（PASS_REVOKE 跨链）；`uav/revoke` 注销无人机。

跨链留痕统一经 `crosschain/send|query|list` 观察：**四段 TxID**（`source_chain_tx_id` / `reg_receive_tx_id` / `reg_relay_tx_id` / `target_chain_tx_id`）+ `reg_record_id`；任一跳失败即 FAILED（含 `error_code`），**不落 SUCCESS**。

**演示便利与语义说明：**

- `crosschain/send` 的 `signature` 为空时由平台按 `sm9_identity` 代签（真实场景调用方自签）；
- FAILED 跨链的重试：业务重试入口（`uav/status` 的 VERIFY、`pass/issue` 复用同 pass_id）会复用上次 FAILED 记录已确认的源链 TxID → 幂等键变化 → 放行新尝试；
- `pass/revoke` **本地先行**：本地 REVOKED 立即生效；跨链失败时返回 `code=0` + `crosschain_status="FAILED"`（安全优先，链上对账列入加固清单）；
- `pass/verify` 对存在的许可永远 `code=0`：有效性由 `valid` / `reasons` 表达；VALID 且已过窗自动迁移 EXPIRED；
- `demo/reset` 清空全部业务表（**含 audit_logs**）并重置模拟链状态。

## 系统二业务流程（虫洞攻防闭环）

系统二 = 链下可信网络：亚秒级时延的可信路由消息通道 + 虫洞攻击仿真与 5 维检测防御。全部状态迁移经状态机 Assert 并审计留痕；节点身份为 SM9 派生标识（`SM9-ID-<node_id>`）；消息完整性为 SM3 摘要 + SM9 签名（`signature` 空 = 平台代签，与系统一演示便利语义一致）。

**演示流程：**

1. `demo/init` 预置链下 8 节点：`UAV-A-001-NODE`(0,0) → `N1`(10,10) → `N2`(20,20) → `N3`(30,30) → `N4`(40,40) → `MGR`(50,50) 链状拓扑，攻击节点 `NODE-X`/`NODE-Y` 默认 OFFLINE；
2. `topology/get` 查看初始拓扑（5 条边，wormhole_enabled=false）；
3. `session/open` 开会话：SM9 挑战认证 + Dijkstra 初始可信路径，落库即 ACTIVE（DB 中不出现 INIT/AUTHENTICATED 停留态）；
4. `message/send` 发送基线消息（HEARTBEAT 等 6 类）：seq 递增、SM3 摘要、实时路由、仿真实测时延（通告时延 + 确定性抖动 seq%3）；
5. `wormhole/toggle` `{"enabled":true}` 开启虫洞：NODE-X/NODE-Y 上线并写入虚假邻接（N1↔X↔Y↔N4 隧道，通告 1ms/跳），拓扑增至 8 条边；
6. 再次 `message/send`：Dijkstra 被虚假短路径诱导，消息穿隧道，实测时延骤降（攻击"收益"显现）；
7. `risk/evaluate` 5 维评分：identity（SM9 身份一致性，不一致一票否决 BLOCK=1.0）/ adjacency（相邻距离 >30 判虚假邻接 +0.35）/ latency（实测时延低于地理下限 +0.25）/ challenge（挑战同步窗口 Δt<5ms +0.25）/ path（时延骤缩至基线 50% 以下 +0.15）；总分 ≥0.7 → DETECT：X/Y 隔离（ISOLATED + 清空邻接 + 全图剔除引用）、会话 ACTIVE→DEGRADED、落 DETECT/ISOLATE 事件；
8. DEGRADED 会话仍可发消息（降级不断链）；`path/switch` 重算排除 ISOLATED 节点的可信路径 → RECOVERED + RECOVER 事件（recovery_latency_ms=新路径仿真实测）；
9. 恢复后首条消息成功 → 会话自动回归 ACTIVE；ISOLATED 节点被 `wormhole/toggle` 拒绝重新上线（4001，永久出局）；
10. `event/list` / `message/list` 复盘攻防全程：DETECT/ISOLATE/RECOVER 事件链 + 消息统计（成功率、avg/p50/p95/max 时延）；`session/close` 关闭会话。

**后台流量（autopilot）：** 生产入口默认每 2000ms 为全部 ACTIVE 会话发送 HEARTBEAT（持续供给检测观测流量）；`OFFCHAIN_AUTOPILOT_MS` 控制（0=默认启用 2000ms，负值=关闭），测试环境不启动。

**端点请求/响应样例**（统一信封 `{code,message,data,trace_id,timestamp}`，下列仅展示 `data`；`…` 为运行时生成值示意）：

`POST /api/topology/get` 请求 `{}`，响应 `data`：

```json
{
  "nodes": [
    {"node_id": "N1", "node_type": "EDGE", "sm9_identity": "SM9-ID-N1",
     "neighbors": "[\"UAV-A-001-NODE\",\"N2\"]", "position": "{\"x\":10,\"y\":10}",
     "status": "ONLINE", "risk_score": 0, "created_at": "2026-09-11 10:00:00.000"}
  ],
  "edges": [
    {"from": "N1", "to": "UAV-A-001-NODE", "distance": 14.142135623730951,
     "advertised_latency_ms": 8, "wormhole_edge": false}
  ],
  "wormhole_enabled": false,
  "isolated": [],
  "active_sessions": 0
}
```

`POST /api/node/register` 请求：

```json
{"node_id": "EDGE-9", "node_type": "EDGE", "position": {"x": 15, "y": 35},
 "neighbors": ["N2"], "sm9_identity": "", "status": ""}
```

响应 `data`：`{"node_id":"EDGE-9","node_type":"EDGE","sm9_identity":"SM9-ID-EDGE-9","neighbors":"[\"N2\"]","position":"{\"x\":15,\"y\":35}","status":"ONLINE","risk_score":0,"created_at":"2026-09-11 10:00:01.000"}`

`POST /api/node/list` 请求 `{"node_type":"ATTACKER","status":"ISOLATED","page":1,"page_size":20}`，响应 `data`：

```json
{"records": [{"node_id": "NODE-X", "node_type": "ATTACKER", "status": "ISOLATED", "risk_score": 1.0}],
 "total": 1, "page": 1, "page_size": 20}
```

`POST /api/session/open` 请求 `{"uav_id":"UAV-A-001","mission_id":"MISSION-DEMO-001","pass_id":"PASS-DEMO-001"}`（后两项可省），响应 `data`：

```json
{
  "session": {"session_id": "SESS-3f8a1c92d4e5", "mission_id": "MISSION-DEMO-001",
    "uav_id": "UAV-A-001", "pass_id": "PASS-DEMO-001", "status": "ACTIVE",
    "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "created_at": "2026-09-11 10:00:02.000", "updated_at": "2026-09-11 10:00:02.000"},
  "path": ["UAV-A-001-NODE", "N1", "N2", "N3", "N4", "MGR"],
  "auth": {"nonce": "NONCE-9c41e7ab02d38f6e5a1b", "sm9_identity": "SM9-ID-UAV-A-001-NODE",
    "signature": "MEUCIQDx…(SM9签名hex)", "verified": true}
}
```

`POST /api/session/close` 请求 `{"session_id":"SESS-3f8a1c92d4e5","operator":"OP-1","reason":"任务完成"}`，响应 `data`：会话对象（`status:"CLOSED"`）。

`POST /api/session/list` 请求 `{"status":"ACTIVE","page":1,"page_size":20}`，响应 `data`：`{"records":[<会话对象>],"total":1,"page":1,"page_size":20}`。

`POST /api/message/send` 请求：

```json
{"session_id": "SESS-3f8a1c92d4e5", "msg_type": "HEARTBEAT",
 "source_node": "UAV-A-001-NODE", "target_node": "MGR", "payload": {"battery": 87}}
```

响应 `data`（seq=1 正常路径：5 跳 × (8+1)ms = 45ms）：

```json
{
  "message": {"message_id": "MSG-8f3a2b…", "session_id": "SESS-3f8a1c92d4e5",
    "msg_type": "HEARTBEAT", "source_node": "UAV-A-001-NODE", "target_node": "MGR",
    "seq": 1, "timestamp": "2026-09-11 10:00:03.123",
    "sm3_hash": "a1b2c3…(64位hex)", "latency_ms": 45, "status": "SUCCESS",
    "path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "evidence": "{\"sm9_identity\":\"SM9-ID-UAV-A-001-NODE\",\"signature\":\"…\",\"proxy_signed\":true,\"path_detail\":[…]}",
    "created_at": "2026-09-11 10:00:03.123"},
  "path_detail": [
    {"from": "UAV-A-001-NODE", "to": "N1", "latency_ms": 9},
    {"from": "N1", "to": "N2", "latency_ms": 9},
    {"from": "N2", "to": "N3", "latency_ms": 9},
    {"from": "N3", "to": "N4", "latency_ms": 9},
    {"from": "N4", "to": "MGR", "latency_ms": 9}
  ]
}
```

发送失败（如路径不可达 4004）时 `code≠0` 且 `data` 携带 FAILED 留痕行（`status:"FAILED"`，`evidence` 内含失败原因）——失败也留痕，与跨链网关同构。会话内消息 SM9 验签失败归入 4002（会话认证态失败语义），与系统一 1002 商密验签错误码带区分。

`POST /api/message/list` 请求 `{"session_id":"SESS-3f8a1c92d4e5","msg_type":"","status":"SUCCESS","page":1,"page_size":20}`，响应 `data`：

```json
{"records": [<消息对象>], "total": 5, "page": 1, "page_size": 20,
 "stats": {"count": 5, "success_count": 5, "success_rate": 1,
   "avg_latency_ms": 46, "p50_latency_ms": 45, "p95_latency_ms": 50, "max_latency_ms": 50}}
```

`POST /api/wormhole/toggle` 请求 `{"enabled":true,"operator":"ATTACKER-SIM"}`，响应 `data`：

```json
{"wormhole_enabled": true, "nodes_affected": ["NODE-X", "NODE-Y", "N1", "N4"]}
```

`POST /api/risk/evaluate` 请求 `{"session_id":"SESS-3f8a1c92d4e5"}`（`node_x`/`node_y` 可省，默认 NODE-X/NODE-Y），隧道攻击后响应 `data`：

```json
{
  "risk_score": 1.0, "threshold": 0.7, "verdict": "DETECT",
  "dimensions": {"identity": 0, "adjacency": 0.35, "latency": 0.25, "challenge": 0.25, "path": 0.15},
  "events": [
    {"event_id": "WH-7d2e…", "session_id": "SESS-3f8a1c92d4e5", "node_x": "NODE-X", "node_y": "NODE-Y",
     "risk_score": 1.0, "detection_dimensions": "{…5维明细JSON…}", "action": "DETECT",
     "original_path": "", "new_path": "", "recovery_latency_ms": 0, "created_at": "2026-09-11 10:00:05.000"},
    {"event_id": "WH-9a4c…", "action": "ISOLATE", "…": "…"}
  ],
  "session_status": "DEGRADED"
}
```

`POST /api/path/switch` 请求 `{"session_id":"SESS-3f8a1c92d4e5","operator":"OP-1","new_path":[]}`（new_path 省略/空 = 自动 Dijkstra 重算），响应 `data`：

```json
{
  "session": {"session_id": "SESS-3f8a1c92d4e5", "status": "RECOVERED",
    "current_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]", "…": "…"},
  "original_path": ["UAV-A-001-NODE", "N1", "NODE-X", "NODE-Y", "N4", "MGR"],
  "new_path": ["UAV-A-001-NODE", "N1", "N2", "N3", "N4", "MGR"],
  "recovery_latency_ms": 45,
  "event": {"event_id": "WH-5b8f…", "action": "RECOVER", "risk_score": 1.0,
    "original_path": "[\"UAV-A-001-NODE\",\"N1\",\"NODE-X\",\"NODE-Y\",\"N4\",\"MGR\"]",
    "new_path": "[\"UAV-A-001-NODE\",\"N1\",\"N2\",\"N3\",\"N4\",\"MGR\"]",
    "recovery_latency_ms": 45, "…": "…"}
}
```

`POST /api/event/list` 请求 `{"session_id":"SESS-3f8a1c92d4e5","action":"","page":1,"page_size":20}`，响应 `data`：`{"records":[<RECOVER>,<ISOLATE>,<DETECT>],"total":3,"page":1,"page_size":20}`（按时间倒序）。

## 系统三业务流程（密文监管闭环）

系统三 = 跨域可信监管：告警 → 7 级身份追踪 → 监管授权 → SM9 密文核验 → 审计/驾驶舱。核心不变量：**密文三分离**（ciphertext 永不出库、masked_value 脱敏展示、decrypted_view 仅授权响应临时生成不落库）；**未授权尝试也留痕**（5002 + INSPECT_UNAUTHORIZED 审计）；**追踪断链即断点**（5001，禁止拼造缺失层级）；**授权与核验结论均写 ChainMaker 监管链**（chain_tx_id 回填）。

**演示流程：**

1. 系统一主线就绪：`demo/init` → `mission/create`（description 走 SM9 加密 + 脱敏）→ `mission/submit` → `review/submit` APPROVED → `pass/issue`（PASS-2026-001，与 seed 身份映射 IDM-DEMO-0001 一致）；
2. `alert/raise` 登记告警（演示用显式 `ALERT-2026-001`；6 类枚举：ROUTE_DEVIATION / INVALID_PASS / UNKNOWN_NODE_ACCESS / MISSION_MISMATCH / WORMHOLE_ALERT / IDENTITY_ANOMALY；WORMHOLE_ALERT 传 `wormhole_event_id` 时证据哈希取系统二事件的规范化 SM3）；
3. `alert/status` 沿线性状态机推进（OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED→ARCHIVED，跨级/回退→6002）；
4. `trace/identity` 以告警编号（或伪名/设备地址）为入口做 7 级追踪：伪名→设备地址→许可→SM9 身份→无人机→运营方→厂商；L1-L4 来源 CHAINMAKER_INDEX、L5-L6 FABRIC_DETAIL、L7 FISCO_BCOS_DETAIL；亚秒完成（`trace_latency_ms` 实测），任一级断链→5001 + `break_level` + 后续级标 BROKEN；
5. `inspect/ciphertext` 未授权核验 → 5002，`data` 仅 `sealed`（ciphertext_status:"SEALED" / sm3_hash / masked_value / has_ciphertext），且审计留痕 INSPECT_UNAUTHORIZED；
6. `authorize/apply`（演示用显式 `AUTH-2026-001`；scope=MISSION/ROUTE/PAYLOAD/IDENTITY/EVIDENCE 多选；target=MISSION|UAV|ALERT；窗口缺省 now~now+24h；ALERT 目标可省 reason 自动生成）→ PENDING；
7. `authorize/review` APPROVE → ChainMaker `regulatory_authorization/RecordAuthorization` 上链成功 → AUTHORIZED + chain_tx_id（上链失败 2001 停留 PENDING 可重试）；DENY → 本地 DENIED 不上链；非 PENDING 复审 → 6002；
8. `inspect/ciphertext` 授权核验：目标匹配 + 窗口内 + scope 覆盖请求项（轨迹核偏需 ROUTE、载荷核验需 PAYLOAD，缺→5003）→ SM9 解密生成 `decrypted_view`（临时）+ SM3 摘要复算 `digest_match` + SM9 验签 `signature_valid` + 航路/载荷一致性结论；偏航（demo DEVIATION 轨迹 vs 批准航段）→ ROUTE_DEVIATION + 自动 HIGH 告警（SYSTEM3；同任务同类型未结案告警去重复用）；载荷申报≠登记或类型-载荷不兼容 → MISSION_MISMATCH + 自动 MEDIUM 告警；
9. 核验结论 `audit_hash`（SM3 规范化）写 ChainMaker `audit_record/RecordInspection`（失败→2001，错误信封仍只含 sealed，明文绝不透传）+ 本地 RegulatoryAudit（INSPECT）落库；
10. `regulatory/audit/list` / `regulatory/audit/export` 复盘监管侧全操作（AUTH_APPLY/AUTH_APPROVE/AUTH_DENY/INSPECT/INSPECT_UNAUTHORIZED/…）；
11. `dashboard/summary` 驾驶舱聚合：告警 6 状态计数 + 高危未结案 + 类型分布、授权计数（过期 = EXPIRED ∪ AUTHORIZED∧valid_to<now，惰性只读）、会话/虫洞事件计数、最新 5 条告警。

**端点请求/响应样例**（统一信封 `{code,message,data,trace_id,timestamp}`，下列仅展示 `data`；`…` 为运行时生成值示意）：

`POST /api/alert/raise` 请求 `{"alert_id":"ALERT-2026-001","mission_id":"MISSION-2026-001","uav_pseudonym":"PSEUDO-UAV-83921","event_type":"ROUTE_DEVIATION","risk_level":"HIGH","source_system":"MANUAL","operator":"REG-01"}`，响应 `data`：`{"alert_id":"ALERT-2026-001","mission_id":"MISSION-2026-001","uav_pseudonym":"PSEUDO-UAV-83921","event_type":"ROUTE_DEVIATION","risk_level":"HIGH","evidence_hash":"<64hex>","source_system":"MANUAL","status":"OPEN","created_at":"…","updated_at":"…"}`。枚举违规（如 `event_type:"FOO"`）→ `code=6002`。

`POST /api/alert/status` 请求 `{"alert_id":"ALERT-2026-001","to_status":"IDENTIFIED","operator":"REG-01","reason":"初判成立"}`，响应 `data`：更新后的告警行（`status:"IDENTIFIED"`）。非法迁移（OPEN→REVIEWED）→ `code=6002`。

`POST /api/trace/identity` 请求 `{"alert_id":"ALERT-2026-001","operator":"REG-01"}`（三选一入口：`pseudo` / `device_address` / `alert_id`），成功响应 `data`：

```json
{"entry":"ALERT-2026-001","entry_type":"ALERT_ID","pseudonym":"PSEUDO-UAV-83921","resolved":true,"break_level":0,
 "levels":[
  {"level":1,"name":"PSEUDO","value":"PSEUDO-UAV-83921","source":"CHAINMAKER_INDEX","latency_ms":0,"status":"RESOLVED"},
  {"level":2,"name":"DEVICE_ADDRESS","value":"0xADDR83921","source":"CHAINMAKER_INDEX","latency_ms":0,"status":"RESOLVED"},
  {"level":3,"name":"PASS_ID","value":"PASS-2026-001","source":"CHAINMAKER_INDEX","latency_ms":0,"status":"RESOLVED"},
  {"level":4,"name":"SM9_IDENTITY","value":"SM9-ID-UAV-A-001","source":"CHAINMAKER_INDEX","latency_ms":0,"status":"RESOLVED"},
  {"level":5,"name":"UAV_ID","value":"UAV-A-001","source":"FABRIC_DETAIL","latency_ms":0,"status":"RESOLVED"},
  {"level":6,"name":"OPERATOR_ID","value":"Operator-A","source":"FABRIC_DETAIL","latency_ms":0,"status":"RESOLVED"},
  {"level":7,"name":"MANUFACTURER_ID","value":"Manufacturer-B","source":"FISCO_BCOS_DETAIL","latency_ms":0,"status":"RESOLVED"}],
 "trace_latency_ms":1}
```

断链（未知伪名）→ `code=5001`，`data` 同形：`resolved:false, break_level:1`，L1 `status:"BROKEN"`+`reason`，L2-L7 `status:"BROKEN"`+`reason:"skipped: break at level 1"`。

`POST /api/authorize/apply` 请求 `{"authorization_id":"AUTH-2026-001","regulator_id":"REG-01","scope":["MISSION","ROUTE","PAYLOAD","IDENTITY"],"target_type":"MISSION","target_id":"MISSION-2026-001","reason":"核查告警 ALERT-2026-001"}`，响应 `data`：授权行（`status:"PENDING"`,`audit_hash:"<64hex>"`,窗口缺省 `valid_from=now`,`valid_to=now+24h`）。

`POST /api/authorize/review` 请求 `{"authorization_id":"AUTH-2026-001","decision":"APPROVE","reviewer_id":"REG-ADMIN","comment":"同意"}`，响应 `data`：`{"auth":{…,"status":"AUTHORIZED"},"audit":{"audit_id":"AUD-…","action":"AUTH_APPROVE",…,"chain_tx_id":"CHAINMAKER-…"},"chain_tx_id":"CHAINMAKER-…"}`。上链失败→`code=2001`（行停留 PENDING）；非 PENDING 复审→`code=6002`。

`POST /api/inspect/ciphertext` 未授权请求 `{"mission_id":"MISSION-2026-001","regulator_id":"REG-01"}` → `code=5002`，`data`：`{"authorized":false,"sealed":{"mission_id":"MISSION-2026-001","ciphertext_status":"SEALED","sm3_hash":"<64hex>","masked_value":"巡线走廊****","has_ciphertext":true}}`（无 `decrypted_view` 键）。

`POST /api/inspect/ciphertext` 授权请求 `{"mission_id":"MISSION-2026-001","authorization_id":"AUTH-2026-001","regulator_id":"REG-01","trajectory":"NORMAL","payload_type":"CAMERA"}` → `code=0`，`data`：

```json
{"authorized":true,"mission":{"mission_id":"MISSION-2026-001","status":"APPROVED","masked_value":"巡线走廊****",…},
 "scope":["MISSION","ROUTE","PAYLOAD","IDENTITY"],
 "decrypted_view":"巡线走廊Zone-A全线巡检",
 "sealed":{"mission_id":"MISSION-2026-001","ciphertext_status":"OPENED","sm3_hash":"<64hex>","masked_value":"巡线走廊****","has_ciphertext":true},
 "verification":{"digest_match":true,"signature_valid":true,"audit_hash":"<64hex>"},
 "conclusion":{"route_verdict":"ROUTE_OK","payload_verdict":"PAYLOAD_OK","raised_alerts":[]},
 "chain_tx_id":"CHAINMAKER-…","reg_audit_id":"AUD-…"}
```

`trajectory:"DEVIATION"` → `route_verdict:"ROUTE_DEVIATION"` + `raised_alerts:["ALERT-…"]`（SYSTEM3 自动 HIGH 告警，重复核验去重复用）；scope 缺 ROUTE 而请求 trajectory → `code=5003`；窗口外 → `code=5004`；`audit_record` 上链失败 → `code=2001` 且 `data` 仅 sealed。

`POST /api/regulatory/audit/list` 请求 `{"action":"INSPECT","page":1,"page_size":20}`，响应 `data`：`{"records":[<RegulatoryAudit>],"total":3,"page":1,"page_size":20}`（created_at DESC, audit_id DESC）。

`POST /api/regulatory/audit/export` 请求 `{"action":"INSPECT"}`，响应 `data`：`{"format":"csv","content":"audit_id,alert_id,authorization_id,action,operator_id,target,result,audit_hash,chain_tx_id,created_at\n…","rows":3}`。

`POST /api/dashboard/summary` 请求 `{}`（或空体），响应 `data`：`{"alerts":{"total":2,"open":1,"identified":0,"traced":0,"reviewed":0,"resolved":1,"archived":0,"high_open":1,"by_type":{"ROUTE_DEVIATION":2}},"authorizations":{"total":1,"pending":0,"authorized":1,"denied":0,"expired":0},"sessions":{"total":0,"init":0,"authenticated":0,"active":0,"degraded":0,"recovered":0,"closed":0},"wormhole_events":{"total":0,"detect":0,"isolate":0,"recover":0},"recent_alerts":[<最新5条SecurityEvent>],"generated_at":"…"}`。

## 测试运行方式

全量回归（274 个顶层测试）：

```bash
go test ./... -count=1
```

端到端黑盒测试位于 `tests/`（真实启动 `httptest.Server`）：

- `TestFoundationE2E`：链状态 → demo init → SM9 签名/验签/篡改拒绝 → 健康检查 → 审计查询 → 重置后重复演示；
- `TestSystem1E2E`：注册跨链闭环 → 任务创建/提交 → 审核获批 → 许可签发/验证 → 冲突检测/协调 → 幂等 2004 → 伪签名 FAIL_SM9 留痕 → 亚秒时延断言 → 吊销闭环 → 审计全程可查。
- `TestSystem2E2E`：链下拓扑 → 会话开启（SM9 挑战认证）→ 基线消息 → 虫洞开启（虚假短路径）→ 隧道消息时延骤降 → 5 维检测 DETECT → 攻击节点隔离 + 会话降级 → 降级期仍可发消息 → 路径重算恢复 → 回归 ACTIVE → 隔离节点拒绝复活（4001）→ 事件链 DETECT/ISOLATE/RECOVER 齐备 → 消息统计 → 会话关闭后拒发（4002）。

```bash
go test ./tests/ -v
```

## 目录结构

```
services/skytrust-backend/
├── cmd/
│   └── server/            # 服务入口 main.go（go run ./cmd/server）
├── internal/
│   ├── api/               # 路由、中间件、统一响应/错误码别名、64 端点 handler、api.Deps
│   ├── apidoc/            # Apifox 文档渲染：Schema 推断 / OpenAPI 3.0.3 构建 / 场景文档 / 确定性渲染 + 端点表（64 行）/ 场景表（24 个）
│   ├── audit/             # 审计服务（query / export CSV）
│   ├── chainadapter/      # 链适配接口（ChainAdapter / ChainStatusProvider）
│   │   └── sim/           # 模拟链：fabric / chainmaker / fisco-bcos（延迟/故障注入）
│   ├── config/            # 环境变量配置加载（默认值见上表）
│   ├── crosschain/        # 跨链网关：13 步协议引擎、信封规范化、路由/载荷策略、errcode/timex 之外的共享类型
│   ├── crypto/            # SM3 摘要 + SM9 签名/验签/加解密（含规范化序列化）
│   ├── demo/              # 演示数据 seeding（demo/init、demo/reset）
│   ├── errcode/           # 全局业务错误码常量（单一事实源）
│   ├── experiment/        # 实验引擎：11 类执行器注册表（registry）+ 统计器（成功率/p50/p95/max）+ Run 编排 + 结果查询/CSV 导出
│   ├── model/             # 20 张 GORM 模型 + AutoMigrate + ID 生成器
│   ├── offchain/          # 系统二：链下可信网络（拓扑/Dijkstra 路由、时延仿真、会话、消息引擎、虫洞攻防、autopilot）
│   ├── regulatory/        # 系统三：安全告警（6 类+状态机）、7 级身份追踪、监管授权（ChainMaker 上链）、SM9 密文核验、监管审计、驾驶舱
│   ├── statemachine/      # 状态机（UAV / 任务 / 许可 / 跨链 9 态 / 会话 / 告警）
│   ├── timex/             # 统一时间格式（Asia/Shanghai，双格式解析）
│   └── uavbusiness/       # 系统一业务服务：主数据 / 无人机 / 任务 / 审核 / 冲突 / 许可
├── tests/                 # 端到端黑盒测试（真实 HTTP）+ 验收套件（acceptance/，TC1/TC2/TC3 各 8 例，独立 :memory: 服务器）+ Apifox 回放录制（apifox_replay_test.go）
├── go.mod
└── go.sum
```

## Plan 系列进度

- **Plan 1（基础平台）**：✅ 完成 —— 配置、统一响应/错误码、路由与中间件、20 张模型、ID 生成器、状态机、SM3/SM9 加密服务、链适配器 + 三模拟链、演示 seeding、审计服务、端到端验证。
- **Plan 2（跨链网关 + 系统一）**：✅ 完成 —— 13 步跨链协议引擎（9 态状态机 / 幂等 / 重试 / 成败均留痕）、系统一 27 端点（crosschain×3 + 主数据×6 + 无人机×5 + 任务×4 + 审核×2 + 冲突×2 + 许可×5）、系统一端到端验证。
- **Plan 3（系统二·链下可信网络）**：✅ 完成 —— 链下拓扑与 Dijkstra 可信路由、确定性时延仿真（通告/实测/地理下限）、会话域（SM9 挑战认证 + 状态机全程 Assert）、消息引擎（seq/SM3/SM9/失败留痕/性能统计）、虫洞攻击开关（隐藏隧道 + 虚假短路径）、5 维风险评分与隔离（阈值 0.7 + 身份一票否决）、可信路径重算恢复、事件留痕、autopilot 后台流量、系统二端到端验证。
- **Plan 4（系统三·密文监管）**：✅ 完成 —— 6 类安全告警与线性状态机、7 级跨链身份追踪（伪名→设备地址→许可→SM9→无人机→运营方→厂商，断链即断点 5001，亚秒实测）、监管授权（scope×目标×有效窗，APPROVE 写 ChainMaker regulatory_authorization，惰性过期）、SM9 密文核验（未授权仅封缄 5002/5003/5004 且留痕，授权后临时解密视图不落库 + SM3/SM9 双验证 + 航路/载荷一致性自动告警去重 + 结论 audit_hash 写 audit_record）、监管审计查询/CSV 导出、驾驶舱聚合、系统三端到端验证（10 端点）。
- **Plan 5（实验 + 验收 + Apifox 文档）**：✅ 完成 —— 11 类实验引擎（注册表 + 统计器成功率/p50/p95/max + Run 编排）、experiment 四端点、TC1×8+TC2×8+TC3×8 验收套件（24 例独立 :memory:）、apidoc 渲染核心（Schema 推断/OpenAPI 3.0.3/场景文档/确定性渲染）+ 端点表 64 行/场景表 24 个、Apifox 回放录制套件（24 场景 + 64 端点样例 + [] 探针）与 docs/apifox 产物入库。
- **Plan 6（真实三链切换 ChainMaker→Fabric→FISCO）**：待实施

## Apifox 文档

- `docs/apifox/skytrust-backend.openapi.json`（仓库根）：OpenAPI 3.0.3，64 个全 POST 端点，含录制请求样例与 success/business_error 双响应样例（`x-error-sample-source: recorded|static` 标注来源）——Apifox「导入数据 → OpenAPI/Swagger」直接导入。
- `docs/apifox/skytrust-test-scenarios.json`：24 个验收/演示场景（TC1-01..TC3-08），每步含 body 与预期 code；`${ref}` 为运行时捕获引用（前序步骤 capture），`${now-1h}`/`${now+1h}` 为动态时间占位符（timex 格式）。
- 重新生成（在 `services/skytrust-backend` 下执行；产物含时间戳/trace_id，重生成字节变化属正常快照语义）：

  ```bash
  APIFOX_GEN=1 go test ./tests/ -run 'TestApifox' -count=1
  ```

- 回放即文档测试：`TestApifoxReplayScenarios`（24 场景单服务器顺序回放）与 `TestApifoxEndpointSamples`（64 端点故事序样例 + `[]` 探针）断言每步信封 code——文档样例与真实行为永久同步。
