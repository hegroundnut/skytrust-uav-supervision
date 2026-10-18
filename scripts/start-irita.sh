#!/usr/bin/env bash
# start-irita.sh —— IRITA 证照链 4 节点启停/状态（2026-10-13 C-1 部署，chain-id skytrust-license）。
# 拓扑：node i → p2p 127.0.0.1:26656+10i / rpc 127.0.0.1:26657+10i / grpc 127.0.0.1:9090+10i；
#       timeout_commit=1s（出块实测 ~1.5s），GOMEMLIMIT=350MiB/节点（2026-10-18 实测上调：
#       Gate-1 的 126-145MB 系全新部署值，数小时后稳态 RSS 贴死 280MiB 上限 → cgroup
#       MemoryHigh 回收风暴（memory.events high=16-21 万、node0 累计读盘 81GB、D 状态
#       folio_wait、全组 RPC 挂起）——限制值必须按稳态工作集校准，version-matrix §12.12）。
# ⚠ CPU 硬限（2026-10-14 事故整改，用户裁定）：IRITA 无 CPU 限制时曾占满整机 CPU 并拖死生产后端
#   （01:46 静默死亡；当晚 ⑤ 负载风暴 load 峰 16→40→93 同源）。节点一律经 systemd-run 瞬态单元
#   启动，CPUQuota=30%/节点（4 节点舰队硬上限 1.2 核，物理共 2 核）+ MemoryHigh=420M；
#   配额可经 IRITA_CPUQUOTA 覆盖，但**绝不允许无限制启动**。
# ⚠ 安全红线：只做 start/stop（SIGTERM 优雅停机，数据在 /opt/irita/net 持久）；
#   绝不删除节点数据目录——账本载有启用锚点 record（net/ANCHOR_TXID.txt，version-matrix §12
#   登记依据），毁账即毁验收依据（与 P6-R6 同源）。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

IRITA_GOMEMLIMIT=${IRITA_GOMEMLIMIT:-350MiB}
IRITA_MEMORY_HIGH=${IRITA_MEMORY_HIGH:-420M}
IRITA_CPUQUOTA=${IRITA_CPUQUOTA:-30%}
IRITA_RUN_USER=${SUDO_USER:-$(id -un)}
# systemd-run 需要 root 建瞬态单元（system 实例：不随登录会话消亡，生产链要求）
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

# setsid 包裹进程会立即退出，$! 是包装 PID——真实节点 PID 一律 pgrep -f 重抓（PoC 坑 #7）
node_pid() { pgrep -f "irita start --home $IRITA_NET/node$1/irita" | head -1; }

start_one() {
  local i=$1 rpc=$((26657 + 10 * $1))
  # 幂等双保险：端口探测 + 进程指纹。ss 高负载偶发漏报（2026-10-13 14:42 实况：port_up 26687
  # 瞬态 false → 重复进程拉起后撞 goleveldb 锁即刻自灭，原节点无恙）——pgrep 进程真源兜底。
  if port_up "$rpc" || [ -n "$(node_pid "$i")" ]; then echo "  node$i 已在运行（rpc $rpc），跳过"; return 0; fi
  # 残留同名失败单元会导致 systemd-run 拒启——防御性清理（--collect 正常已自动回收）
  [ -n "$SUDO" ] && $SUDO systemctl reset-failed "irita-node$i.service" 2>/dev/null || true
  if ! $SUDO systemd-run --quiet --unit "irita-node$i" --collect \
      -p User="$IRITA_RUN_USER" \
      -p CPUQuota="$IRITA_CPUQUOTA" -p CPUWeight=80 -p MemoryHigh="$IRITA_MEMORY_HIGH" \
      -p Environment=GOMEMLIMIT=$IRITA_GOMEMLIMIT \
      -p StandardOutput=append:"$IRITA_NET/node$i.log" \
      -p StandardError=append:"$IRITA_NET/node$i.log" \
      "$IRITA_BIN" start --home "$IRITA_NET/node$i/irita"; then
    echo "  ✗ node$i systemd-run 单元创建失败（需 sudo；绝不回退无限制启动）"; return 1
  fi
  for _ in $(seq 1 30); do port_up "$rpc" && break; sleep 1; done
  local pid; pid=$(node_pid "$i")
  if [ -n "$pid" ]; then
    echo "$pid" > "$IRITA_NET/node$i.pid"
    echo "  ✓ node$i 启动（pid $pid，rpc 127.0.0.1:$rpc，CPUQuota=$IRITA_CPUQUOTA）"
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
