# 云巡信链后端服务（SkyTrust Backend）

## 服务简介

「云巡信链（SkyTrust）」——无人机跨域协同与可信监管原型——的后端服务。基于 Go + Gin + GORM（SQLite）构建，提供：

- **基础平台（Plan 1）**：统一响应/错误码、健康检查、SM3/SM9 国密能力、多链适配（模拟 fabric / chainmaker / fisco-bcos）、演示数据预置、审计日志查询与导出；
- **跨链网关（Plan 2）**：13 步跨链协议引擎——监管链非旁路、业务链不直连（fabric 与 fisco-bcos 之间必经 chainmaker 中转）、两跳四段 TxID 全程留痕、幂等去重（2004）、传输级重试、SM3/SM9 成败均留痕（`verify_result = PASS|FAIL_SM3|FAIL_SM9`）；
- **系统一·任务申请跨域协同（Plan 2）**：主数据 → 无人机注册跨链证明 → 任务创建（SM9 加密 + 脱敏）→ 提交（源链交易 + MISSION_APPLICATION 跨链）→ 监管审核（MISSION_REVIEW_RESULT 跨链）→ 三维冲突协调 → 飞行许可签发/验证/吊销（FLIGHT_PASS / PASS_REVOKE 跨链）。

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

**共 38 个端点**（分组：health×2 / chain×1 / crypto×4 / demo×2 / audit×2 / crosschain×3 / masterdata×6 / uav×5 / mission×4 / review×2 / conflict×2 / pass×5）：

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

## 测试运行方式

全量回归（125 个顶层测试）：

```bash
go test ./... -count=1
```

端到端黑盒测试位于 `tests/`（真实启动 `httptest.Server`）：

- `TestFoundationE2E`：链状态 → demo init → SM9 签名/验签/篡改拒绝 → 健康检查 → 审计查询 → 重置后重复演示；
- `TestSystem1E2E`：注册跨链闭环 → 任务创建/提交 → 审核获批 → 许可签发/验证 → 冲突检测/协调 → 幂等 2004 → 伪签名 FAIL_SM9 留痕 → 亚秒时延断言 → 吊销闭环 → 审计全程可查。

```bash
go test ./tests/ -v
```

## 目录结构

```
services/skytrust-backend/
├── cmd/
│   └── server/            # 服务入口 main.go（go run ./cmd/server）
├── internal/
│   ├── api/               # 路由、中间件、统一响应/错误码别名、38 端点 handler、api.Deps
│   ├── audit/             # 审计服务（query / export CSV）
│   ├── chainadapter/      # 链适配接口（ChainAdapter / ChainStatusProvider）
│   │   └── sim/           # 模拟链：fabric / chainmaker / fisco-bcos（延迟/故障注入）
│   ├── config/            # 环境变量配置加载（默认值见上表）
│   ├── crosschain/        # 跨链网关：13 步协议引擎、信封规范化、路由/载荷策略、errcode/timex 之外的共享类型
│   ├── crypto/            # SM3 摘要 + SM9 签名/验签/加解密（含规范化序列化）
│   ├── demo/              # 演示数据 seeding（demo/init、demo/reset）
│   ├── errcode/           # 全局业务错误码常量（单一事实源）
│   ├── model/             # 20 张 GORM 模型 + AutoMigrate + ID 生成器
│   ├── statemachine/      # 状态机（UAV / 任务 / 许可 / 跨链 9 态 / 会话 / 告警）
│   ├── timex/             # 统一时间格式（Asia/Shanghai，双格式解析）
│   └── uavbusiness/       # 系统一业务服务：主数据 / 无人机 / 任务 / 审核 / 冲突 / 许可
├── tests/                 # 端到端黑盒测试（真实 HTTP）
├── go.mod
└── go.sum
```

## Plan 系列进度

- **Plan 1（基础平台）**：✅ 完成 —— 配置、统一响应/错误码、路由与中间件、20 张模型、ID 生成器、状态机、SM3/SM9 加密服务、链适配器 + 三模拟链、演示 seeding、审计服务、端到端验证。
- **Plan 2（跨链网关 + 系统一）**：✅ 完成 —— 13 步跨链协议引擎（9 态状态机 / 幂等 / 重试 / 成败均留痕）、系统一 27 端点（crosschain×3 + 主数据×6 + 无人机×5 + 任务×4 + 审核×2 + 冲突×2 + 许可×5）、系统一端到端验证。
- **Plan 3（系统二·链下可信网络）**：待实施
- **Plan 4（系统三·密文监管）**：待实施
- **Plan 5（实验 + 验收 + Apifox 文档）**：待实施
- **Plan 6（真实三链切换 ChainMaker→Fabric→FISCO）**：待实施
