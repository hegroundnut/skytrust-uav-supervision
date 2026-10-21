#!/usr/bin/env bash
# start-irita.sh —— IRITA 证照链 4 节点启停/状态（2026-10-13 C-1 部署，chain-id skytrust-license）。
# 拓扑：node i → p2p 127.0.0.1:26656+10i / rpc 127.0.0.1:26657+10i / grpc 127.0.0.1:9090+10i；
#       timeout_commit=1s（出块实测 ~1.5s）。
# ⚠ 限额政策（2026-10-21 用户裁定，目标机为物理裸机、CPU/内存充足）：**默认不限额**启动——
#   CPUQuota/MemoryHigh/GOMEMLIMIT 三项默认为空；systemd-run 瞬态单元管理、SIGTERM 优雅停机、
#   幂等拉起等纪律全部保留。旧限额时代的历史背景（完整事故登记 version-matrix §12.5/§12.12）：
#   - 2026-10-14：IRITA 无 CPU 限制时占满 2 核整机 CPU 并拖死生产后端（01:46 静默死亡）；
#   - 2026-10-18：MemoryHigh=280M 贴稳态工作集 → cgroup 回收风暴（memory.events high=16-21 万、
#     node0 累计读盘 81GB）→ leveldb refault → 全组 RPC 挂起断链；限额必须按稳态工作集校准。
#   若在 **<8 核或 <16G 内存**的机器上部署，必须显式重新启用限额（实测校准值）：
#     IRITA_CPUQUOTA=30% IRITA_MEMORY_HIGH=420M IRITA_GOMEMLIMIT=350MiB scripts/start-irita.sh
# ⚠ 安全红线：只做 start/stop（SIGTERM 优雅停机，数据在 /opt/irita/net 持久）；
#   绝不删除节点数据目录——账本载有启用锚点 record（net/ANCHOR_TXID.txt，version-matrix §12
#   登记依据），毁账即毁验收依据（与 P6-R6 同源）。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

# 限额三项默认为空 = 不限额（2026-10-21 裸机裁定）；小机器经环境变量显式注入（见头注）
IRITA_GOMEMLIMIT=${IRITA_GOMEMLIMIT:-}
IRITA_MEMORY_HIGH=${IRITA_MEMORY_HIGH:-}
IRITA_CPUQUOTA=${IRITA_CPUQUOTA:-}
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
  # 限额属性按环境变量拼装：裸机默认三项全空 → 不下发任何 -p 限额（2026-10-21 裁定）
  local PROPS=(-p User="$IRITA_RUN_USER")
  [ -n "$IRITA_CPUQUOTA" ]    && PROPS+=(-p CPUQuota="$IRITA_CPUQUOTA" -p CPUWeight=80)
  [ -n "$IRITA_MEMORY_HIGH" ] && PROPS+=(-p MemoryHigh="$IRITA_MEMORY_HIGH")
  [ -n "$IRITA_GOMEMLIMIT" ]  && PROPS+=(-p Environment=GOMEMLIMIT="$IRITA_GOMEMLIMIT")
  if ! $SUDO systemd-run --quiet --unit "irita-node$i" --collect \
      "${PROPS[@]}" \
      -p StandardOutput=append:"$IRITA_NET/node$i.log" \
      -p StandardError=append:"$IRITA_NET/node$i.log" \
      "$IRITA_BIN" start --home "$IRITA_NET/node$i/irita"; then
    echo "  ✗ node$i systemd-run 单元创建失败（需 sudo/systemd；不要绕开单元管理裸起进程）"; return 1
  fi
  for _ in $(seq 1 30); do port_up "$rpc" && break; sleep 1; done
  local pid; pid=$(node_pid "$i")
  if [ -n "$pid" ]; then
    echo "$pid" > "$IRITA_NET/node$i.pid"
    local lim="无（裸机默认，2026-10-21 裁定）"
    [ -n "$IRITA_CPUQUOTA$IRITA_MEMORY_HIGH$IRITA_GOMEMLIMIT" ] && \
      lim="CPUQuota=${IRITA_CPUQUOTA:-–} MemoryHigh=${IRITA_MEMORY_HIGH:-–} GOMEMLIMIT=${IRITA_GOMEMLIMIT:-–}"
    echo "  ✓ node$i 启动（pid $pid，rpc 127.0.0.1:$rpc，限额：$lim）"
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
