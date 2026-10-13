#!/usr/bin/env bash
# start-irita.sh —— IRITA 证照链 4 节点启停/状态（2026-10-13 C-1 部署，chain-id skytrust-license）。
# 拓扑：node i → p2p 127.0.0.1:26656+10i / rpc 127.0.0.1:26657+10i / grpc 127.0.0.1:9090+10i；
#       timeout_commit=1s（出块实测 ~1.5s），GOMEMLIMIT=280MiB/节点（内存红线，Gate-1 实测 RSS ~126-145MB）。
# ⚠ 安全红线：只做 start/stop（SIGTERM 优雅停机，数据在 /opt/irita/net 持久）；
#   绝不删除节点数据目录——账本载有启用锚点 record（net/ANCHOR_TXID.txt，version-matrix §12
#   登记依据），毁账即毁验收依据（与 P6-R6 同源）。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

IRITA_GOMEMLIMIT=${IRITA_GOMEMLIMIT:-280MiB}

# setsid 包裹进程会立即退出，$! 是包装 PID——真实节点 PID 一律 pgrep -f 重抓（PoC 坑 #7）
node_pid() { pgrep -f "irita start --home $IRITA_NET/node$1/irita" | head -1; }

start_one() {
  local i=$1 rpc=$((26657 + 10 * $1))
  # 幂等双保险：端口探测 + 进程指纹。ss 高负载偶发漏报（2026-10-13 14:42 实况：port_up 26687
  # 瞬态 false → 重复进程拉起后撞 goleveldb 锁即刻自灭，原节点无恙）——pgrep 进程真源兜底。
  if port_up "$rpc" || [ -n "$(node_pid "$i")" ]; then echo "  node$i 已在运行（rpc $rpc），跳过"; return 0; fi
  GOMEMLIMIT=$IRITA_GOMEMLIMIT setsid nohup "$IRITA_BIN" start \
    --home "$IRITA_NET/node$i/irita" >> "$IRITA_NET/node$i.log" 2>&1 </dev/null &
  for _ in $(seq 1 30); do port_up "$rpc" && break; sleep 1; done
  local pid; pid=$(node_pid "$i")
  if [ -n "$pid" ]; then
    echo "$pid" > "$IRITA_NET/node$i.pid"
    echo "  ✓ node$i 启动（pid $pid，rpc 127.0.0.1:$rpc）"
  else
    echo "  ✗ node$i 启动失败（查 $IRITA_NET/node$i.log）"; return 1
  fi
}

case "${1:-start}" in
  start)
    FAIL=0
    for i in 0 1 2 3; do start_one "$i" || FAIL=1; done
    sleep 2
    for i in 0 1 2 3; do
      S=$(curl -s -m 5 "http://127.0.0.1:$((26657 + 10 * i))/status")
      # catching_up 是布尔 false——jq 的 // 会把它当 falsy 吞掉，此处必须裸取
      echo "  node$i height=$(echo "$S" | jq -r '.result.sync_info.latest_block_height // "N/A"') catching_up=$(echo "$S" | jq -r '.result.sync_info.catching_up')"
    done
    [ "$FAIL" -eq 0 ] && echo IRITA_UP || { echo IRITA_FAILED; exit 1; }
    ;;
  stop)
    # 逆序停机；SIGTERM 优雅（TM 落盘后退出），15s 未退才 SIGKILL
    for i in 3 2 1 0; do
      PID=$(node_pid "$i")
      if [ -n "$PID" ]; then
        kill "$PID" 2>/dev/null || true
        for _ in $(seq 1 15); do kill -0 "$PID" 2>/dev/null || break; sleep 1; done
        kill -0 "$PID" 2>/dev/null && { kill -9 "$PID" 2>/dev/null || true; echo "  node$i SIGKILL（15s 未优雅退出）"; }
        echo "  stopped node$i (pid $PID)"
      else
        echo "  node$i 未在运行，跳过"
      fi
    done
    echo IRITA_STOPPED
    ;;
  status)
    for i in 0 1 2 3; do
      PID=$(node_pid "$i")
      H=$(curl -s -m 3 "http://127.0.0.1:$((26657 + 10 * i))/status" | jq -r '.result.sync_info.latest_block_height // "DOWN"')
      RSS=$(ps -o rss= -p "${PID:-0}" 2>/dev/null | tr -d ' ')
      echo "node$i pid=${PID:-none} height=$H rss=$(( ${RSS:-0} / 1024 ))MB"
    done
    ;;
  *) echo "用法: $0 {start|stop|status}"; exit 2;;
esac
