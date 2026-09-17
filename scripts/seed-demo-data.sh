#!/usr/bin/env bash
# seed-demo-data.sh —— 初始化演示数据（POST /api/demo/init：Operator-A / UAV-A-001 /
# SM9 身份映射 / PassID=PASS-2026-001 冻结字面量等，见 internal/demo）。
# 幂等性：重复 init 对既存数据不破坏（业务层按存在即跳过/报错处理）；非零 code 时
# 原样打印响应供人工判断，不视为脚本失败。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

port_up 8080 || { echo "✗ 后端未监听 8080（先运行 start-backend-real.sh）"; exit 1; }

echo "== POST /api/demo/init =="
RESP=$(curl -s --max-time 60 -X POST "$BACKEND_URL/api/demo/init" \
  -H 'Content-Type: application/json' -d '{}')
echo "$RESP" | python3 -m json.tool 2>/dev/null || echo "$RESP"
CODE=$(echo "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("code",-1))' 2>/dev/null || echo -1)
if [ "$CODE" = "0" ]; then
  echo "  ✓ 演示数据就绪"
else
  echo "  ⚠ code=$CODE（可能已初始化过——核对上方响应，业务主线可继续则忽略）"
fi
