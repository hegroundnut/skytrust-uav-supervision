#!/usr/bin/env bash
# start-backend-real.sh —— 真实链模式后端启动 + /api/chain/status 自检。
# 前置：build-backend-real.sh 已产出 $BACKEND_BIN；三链已启动（start-chains.sh）。
# .env 含证书/密钥路径（gitignored，安全红线 §5-④）；本脚本经 set -a source 注入。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
LOG=${LOG:-/tmp/server-real.log}

cd "$BACKEND"
[ -f "$BACKEND_BIN" ] || { echo "✗ 未找到 $BACKEND_BIN，先运行 scripts/build-backend-real.sh"; exit 1; }
[ -f .env ] || { echo "✗ 缺 .env（cp .env.example .env 后按实际路径填写；.env 绝不入 Git）"; exit 1; }

# 端口 8080 已有监听 → 按 PID 停旧进程（不用 pkill -f：会误杀包裹脚本自身）
OLD_PID=$(ss -tlnp 2>/dev/null | grep ':8080 ' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
if [ -n "${OLD_PID:-}" ]; then
  echo "停旧后端 pid=$OLD_PID"
  kill "$OLD_PID" 2>/dev/null || true
  for _ in $(seq 1 10); do port_up 8080 || break; sleep 1; done
fi

# 三链端口预检（不在则仍尝试启动——real 工厂 fail-fast 会在日志报具体链）
for p in 12301 7051 20200; do
  port_up "$p" && echo "  ✓ 链端口 $p 监听" || echo "  ⚠ 链端口 $p 未监听（先运行 start-chains.sh？）"
done

set -a; source .env; set +a
echo "CHAIN_MODE=$CHAIN_MODE DB_PATH=$DB_PATH → $LOG"
nohup "$BACKEND_BIN" >> "$LOG" 2>&1 &
NEW_PID=$!

for _ in $(seq 1 30); do port_up 8080 && break; sleep 1; done
if ! port_up 8080; then echo "✗ 后端未在 30s 内监听 8080，tail $LOG："; tail -20 "$LOG"; exit 1; fi

sleep 1
echo "== /api/chain/status 自检 =="
STATUS=$(curl -s --max-time 30 -X POST "$BACKEND_URL/api/chain/status" -H 'Content-Type: application/json' -d '{}')
echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"
if echo "$STATUS" | grep -q '"chains"' && ! echo "$STATUS" | grep -q 'OFFLINE'; then
  echo "  ✓ 三链 ONLINE（pid=$NEW_PID）"
  exit 0
else
  echo "  ✗ 存在 OFFLINE 链（fail-fast 诚实上报，绝无静默仿真）；排查 $LOG"
  exit 1
fi
