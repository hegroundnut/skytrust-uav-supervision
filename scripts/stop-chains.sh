#!/usr/bin/env bash
# stop-chains.sh —— 四链优雅停机（顺序与 start-chains.sh 相反：IRITA → Fabric → ChainMaker → FISCO）。
# ⚠ 安全红线（P6 / 部署实况）：
#   - 绝不执行 fabric test-network 的 network.sh down —— 它会删除账本/容器/证书，
#     §4.4 部署 TxID 登记表随之失效（docs/version-matrix.md §5 依据被毁）。
#   - 绝不删除 ChainMaker 链数据（chainmaker-go/bin 下的 delete/清理命令一律不用）。
#   - FISCO 用节点自带 stop.sh（SIGTERM 优雅退出，数据在 data/ 持久）。
#   - IRITA 委托 start-irita.sh stop（SIGTERM 优雅，账本 /opt/irita/net 持久，
#     含启用锚点 record —— 绝不删数据目录）。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

echo "== [1/4] IRITA 证照链：start-irita.sh stop =="
bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/start-irita.sh" stop

echo "== [2/4] Fabric：docker stop（容器保留，账本保留）=="
# 链码容器（dev-*）随 peer 停止自动退出，无需单独处理；先 peer 后 orderer，peer1（扩容）先停
for c in peer1.org1.example.com peer1.org2.example.com peer0.org1.example.com peer0.org2.example.com $FAB_ORDERERS; do
  if docker_running "$c"; then
    docker stop "$c" >/dev/null && echo "  stopped $c"
  else
    echo "  $c 未在运行，跳过"
  fi
done

echo "== [3/4] ChainMaker：5 节点进程（逆序）+ 5 VM 引擎容器 =="
# 节点以相对路径启动（cd bin && ./chainmaker start …），pgrep -f 全路径匹配不到——
# 以 1230N 监听 PID 为权威，pgrep -f 配置路径兜底（脚本自身 cmdline 不含模式串，无自匹配风险）
for N in 5 4 3 2 1; do
  RPC_PORT=1230$N
  CM_PID=$(ss -tlnp 2>/dev/null | grep ":$RPC_PORT " | grep -oP 'pid=\K[0-9]+' | head -1 || true)
  [ -z "${CM_PID:-}" ] && CM_PID=$(pgrep -f "config/wx-org$N.chainmaker.org/chainmaker.yml" | head -1 || true)
  if [ -n "${CM_PID:-}" ]; then
    kill "$CM_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do kill -0 "$CM_PID" 2>/dev/null || break; sleep 1; done
    kill -0 "$CM_PID" 2>/dev/null && { kill -9 "$CM_PID" 2>/dev/null || true; echo "  org$N SIGKILL（未在 20s 内退出）"; }
    echo "  stopped chainmaker org$N (pid $CM_PID)"
  else
    echo "  org$N 未在运行，跳过"
  fi
  port_up "$RPC_PORT" && echo "  ⚠ $RPC_PORT 仍在监听（手工核查）" || true
done
for N in 5 4 3 2 1; do
  VM=$(cm_vm_container "$N")
  if docker_running "$VM"; then
    docker stop "$VM" >/dev/null && echo "  stopped $VM"
  else
    echo "  $VM 未在运行，跳过"
  fi
done

echo "== [4/4] FISCO BCOS：节点自带 stop.sh =="
if port_up 20200; then
  (cd "$FISCO_NODE" && bash stop.sh) && echo "  stopped fisco node0"
  sleep 2
  port_up 20200 && echo "  ⚠ 20200 仍在监听（stop.sh 未生效？手工核查）" || true
else
  echo "  节点未在运行，跳过"
fi

echo ALL_STOPPED
