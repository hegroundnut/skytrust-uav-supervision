# 云巡信链（SkyTrust）

无人机跨域协同与可信监管原型。

## 后端服务

后端基于 Go + Gin + GORM（SQLite），代码与详细文档见 [`services/skytrust-backend/README.md`](services/skytrust-backend/README.md)。

在 **仓库根目录** 使用自带的 hermetic Go 工具链启动：

```bash
export PATH="$PWD/tools/go/bin:$PATH"
export GOPROXY=https://goproxy.cn,direct
cd services/skytrust-backend && go run ./cmd/server
```

服务默认监听端口 **8080**（`SERVER_ADDR=:8080`）。
