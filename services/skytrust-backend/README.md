# 云巡信链后端服务（SkyTrust Backend）

## 服务简介

「云巡信链（SkyTrust）」——无人机跨域协同与可信监管原型——的后端服务。基于 Go + Gin + GORM（SQLite）构建，提供统一响应/错误码、健康检查、SM3/SM9 国密能力、多链适配（模拟 fabric / chainmaker / fisco-bcos）、演示数据预置以及审计日志查询与导出。

本服务是 **Plan 1（基础平台）** 的产物，为后续系统（跨链网关与系统一/二/三）提供 `ChainAdapter/sim`、`crypto.Service`、`statemachine.*`、`model.*`、`api.Deps/NewRouter` 等扩展点。

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
| `CHAIN_MODE` | `sim` | 链模式：`sim`（模拟链，默认）/ `real`（预留，当前 main.go 恒构建模拟链，real 模式待 Plan 2 实现） |
| `SM9_KEY_DIR` | `data/sm9` | SM9 主密钥持久化目录 |
| `APP_TIMEZONE` | `Asia/Shanghai` | 响应时间戳时区 |
| `LOG_LEVEL` | `info` | 日志级别 |

## API 约定与端点清单

**约定（重要）：**

- **所有请求一律使用 `POST`**（`Content-Type: application/json`）。
- **HTTP 200 ≠ 业务成功**：HTTP 状态码恒为 200，业务结果以响应体 `code` 字段为准，**`code=0` 表示成功**，非 0 为错误码。
- 统一响应结构（`timestamp` 时区为 `Asia/Shanghai`）：

  ```json
  {
    "code": 0,
    "message": "success",
    "data": {},
    "trace_id": "TRACE-20260910-cde826",
    "timestamp": "2026-09-10 21:14:15.000"
  }
  ```

**共 11 个端点**（分组：health×2 / chain×1 / crypto×4 / demo×2 / audit×2）：

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
| audit | `POST /api/audit/query` | 分页查询审计日志 |
| audit | `POST /api/audit/export` | 导出审计日志 CSV |

## 测试运行方式

全量回归：

```bash
go test ./... -count=1
```

端到端黑盒测试位于 `tests/`（真实启动 `httptest.Server`，跑通 链状态 → demo init → SM9 签名/验签/篡改拒绝 → 健康检查 → 审计查询 → 重置后重复演示 全链路）：

```bash
go test ./tests/ -v
```

## 目录结构

```
services/skytrust-backend/
├── cmd/
│   └── server/            # 服务入口 main.go（go run ./cmd/server）
├── internal/
│   ├── api/               # 路由、中间件、统一响应/错误码、各端点 handler、api.Deps
│   ├── audit/             # 审计服务（query / export CSV）
│   ├── chainadapter/      # 链适配接口（ChainAdapter / ChainStatusProvider）
│   │   └── sim/           # 模拟链：fabric / chainmaker / fisco-bcos
│   ├── config/            # 环境变量配置加载（默认值见上表）
│   ├── crypto/            # SM3 摘要 + SM9 签名/验签/加解密（含规范化序列化）
│   ├── demo/              # 演示数据 seeding（demo/init、demo/reset）
│   ├── model/             # 20 张 GORM 模型 + AutoMigrate + ID 生成器
│   └── statemachine/      # 状态机（业务 / 会话 / 告警 等）
├── tests/                 # 端到端黑盒测试（真实 HTTP）
├── go.mod
└── go.sum
```

## Plan 系列进度

- **Plan 1（基础平台）**：✅ 完成 —— 配置、统一响应/错误码、路由与中间件、20 张模型、ID 生成器、状态机、SM3/SM9 加密服务、链适配器 + 三模拟链、演示 seeding、审计服务、端到端验证。
- **Plan 2（跨链网关 + 系统一）**：待实施
- **Plan 3（系统二）**：待实施
- **Plan 4（系统三）**：待实施
- **Plan 5（实验 + 验收 + Apifox）**：待实施
- **Plan 6**：待实施
