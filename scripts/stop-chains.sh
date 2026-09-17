#!/usr/bin/env bash
# stop-chains.sh —— 三链优雅停机（顺序与 start-chains.sh 相反：Fabric → ChainMaker → FISCO）。
# ⚠ 安全红线（P6 / 部署实况）：
#   - 绝不执行 fabric test-network 的 network.sh down —— 它会删除账本/容器/证书，
#     §4.4 部署 TxID 登记表随之失效（docs/version-matrix.md §5 依据被毁）。
#   - 绝不删除 ChainMaker 链数据（chainmaker-go/bin 下的 delete/清理命令一律不用）。
#   - FISCO 用节点自带 stop.sh（SIGTERM 优雅退出，数据在 data/ 持久）。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

echo "== [1/3] Fabric：docker stop（容器保留，账本保留）=="
# 链码容器（dev-*）随 peer 停止自动退出，无需单独处理
for c in peer0.org1.example.com peer0.org2.example.com orderer.example.com; do
  if docker ps --format '{{.Names}}' | grep -qx "$c"; then
    docker stop "$c" >/dev/null && echo "  stopped $c"
  else
    echo "  $c 未在运行，跳过"
  fi
done

echo "== [2/3] ChainMaker：节点进程 + VM 引擎容器 =="
# 节点以相对路径启动（cd bin && ./chainmaker start …），pgrep -f 全路径匹配不到——
# 以 12301 监听 PID 为权威，pgrep 兜底
CM_PID=$(ss -tlnp 2>/dev/null | grep ':12301 ' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
[ -z "${CM_PID:-}" ] && CM_PID=$(pgrep -f "chainmaker start" | head -1 || true)
if [ -n "${CM_PID:-}" ]; then
  kill "$CM_PID" 2>/dev/null || true
  for _ in $(seq 1 20); do kill -0 "$CM_PID" 2>/dev/null || break; sleep 1; done
  kill -0 "$CM_PID" 2>/dev/null && { kill -9 "$CM_PID" 2>/dev/null || true; echo "  节点 SIGKILL（未在 20s 内退出）"; }
  echo "  stopped chainmaker node (pid $CM_PID)"
else
  echo "  节点未在运行，跳过"
fi
port_up 12301 && echo "  ⚠ 12301 仍在监听（手工核查）" || true
if docker ps --format '{{.Names}}' | grep -qx "$CM_VM_CONTAINER"; then
  docker stop "$CM_VM_CONTAINER" >/dev/null && echo "  stopped $CM_VM_CONTAINER"
else
  echo "  VM 引擎容器未在运行，跳过"
fi

echo "== [3/3] FISCO BCOS：节点自带 stop.sh =="
if port_up 20200; then
  (cd "$FISCO_NODE" && bash stop.sh) && echo "  stopped fisco node0"
  sleep 2
  port_up 20200 && echo "  ⚠ 20200 仍在监听（stop.sh 未生效？手工核查）" || true
else
  echo "  节点未在运行，跳过"
fi

echo ALL_STOPPED
