# 云巡信链（SkyTrust）

无人机跨域协同与可信监管原型。

## 后端服务

后端基于 Go + Gin + GORM（SQLite），代码与详细文档见 [`services/skytrust-backend/README.md`](services/skytrust-backend/README.md)。

在 **仓库根目录** 使用自带的 hermetic Go 工具链启动（`tools/go` 为原开发机本地工具链、
不入库；新克隆若无该目录，用系统 Go ≥ 1.25 即可，部署机为 `/usr/local/go`，
或直接 `source scripts/env.sh`）：

```bash
export PATH="$PWD/tools/go/bin:$PATH"
export GOPROXY=https://goproxy.cn,direct
cd services/skytrust-backend && go run ./cmd/server
```

服务默认监听端口 **8080**（`SERVER_ADDR=:8080`）。

## 真实三链部署（ChainMaker 监管链 / Fabric 运营链 / FISCO BCOS 管理链）

真实链迁移已在 Linux 部署环境完成并通过 `docs/real-chain-migration.md` §6.5 全部五项
验收（2026-09-17）：三链 ONLINE（真实 `Health()` 探针）、§4.4 部署 TxID 全部链上可查、
13 步跨链闭环 SUCCESS、两跳四段 TxID 持久化可验证、CROSSCHAIN_LOOP ×100 p95<1000ms
（实测 p95≈527-539ms）。

- **版本矩阵 / TxID 登记 / 性能实录 / 偏差记录**：[`docs/version-matrix.md`](docs/version-matrix.md)
- **三幕展示流程（三大系统端到端演示）**：[`docs/demo-showcase.md`](docs/demo-showcase.md)
  （一键实跑 `./scripts/demo-showcase.sh`，51 次调用覆盖任务协同/虫洞攻防/密文核查）
- **迁移指南（权威流程）**：[`docs/real-chain-migration.md`](docs/real-chain-migration.md)
- **一键运维脚本**：[`scripts/`](scripts/)（`start-chains.sh` / `stop-chains.sh` /
  `build-backend-real.sh` / `start-backend-real.sh` / `deploy-contracts.sh` /
  `seed-demo-data.sh` / `probe-latency.sh` / `run-acceptance.sh`，公共环境见 `scripts/env.sh`）

真实链模式快速起停（部署环境，详见各脚本头注释）：

```bash
./scripts/start-chains.sh          # 幂等启动三链 + 双层探活
./scripts/build-backend-real.sh    # CGO + -tags realchains 构建
./scripts/start-backend-real.sh    # 载 .env 启动，/api/chain/status 三链 ONLINE 自检
./scripts/run-acceptance.sh        # §6.5 五项验收一键复测
```

安全红线：真实证书/私钥/数据库密码/生产地址一律经 `services/skytrust-backend/.env`
（已 gitignore，模板 `.env.example`）注入，绝不提交 Git；停机只用优雅停止
（绝不 `network.sh down`——账本载有部署 TxID 登记依据）。
