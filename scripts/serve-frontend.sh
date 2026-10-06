#!/usr/bin/env bash
# serve-frontend.sh —— 启动前端（静态 + /api 同源代理，规避后端无 CORS）。
# 用法：./scripts/serve-frontend.sh          # http://127.0.0.1:8090
#       PORT=9000 ./scripts/serve-frontend.sh
# 依赖：python3（标准库即可）。后端须已在 :8080 运行（start-backend-real.sh）。
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 scripts/serve-frontend.py
