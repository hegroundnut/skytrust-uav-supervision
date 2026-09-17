#!/usr/bin/env bash
# start-chains.sh —— 三链一键启动 + 健康检查（幂等：已运行则跳过启动）。
# 顺序遵循 docs/real-chain-migration.md §3.1：FISCO → ChainMaker → Fabric。
# ⚠ 安全红线：本脚本只「启动」，绝不做破坏性清理（fabric network.sh down /
#   删链删目录）——账本上载有 §4.4 部署 TxID 登记，毁账即毁验收依据。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

FAIL=0

echo "== [1/3] FISCO BCOS 管理链（RPC 20200 / p2p 30300）=="
if port_up 20200; then
  echo "  已在运行，跳过"
else
  (cd "$FISCO_NODE" && bash start.sh)
  for _ in $(seq 1 20); do port_up 20200 && break; sleep 1; done
fi
if port_up 20200; then echo "  ✓ 端口 20200 监听"; else echo "  ✗ FISCO 启动失败（查 $FISCO_NODE/log/）"; FAIL=1; fi

echo "== [2/3] ChainMaker 监管链（RPC 12301 / p2p 11301，solo wx-org / chain1）=="
# 2a. docker-go 合约 VM 引擎容器（节点执行合约依赖它；容器由节点首次启动时创建，
#     此后独立存续，节点重启不会自动拉起 → 先确保容器在）
if docker ps --format '{{.Names}}' | grep -qx "$CM_VM_CONTAINER"; then
  echo "  VM 引擎容器已在运行，跳过"
else
  if docker ps -a --format '{{.Names}}' | grep -qx "$CM_VM_CONTAINER"; then
    docker start "$CM_VM_CONTAINER" >/dev/null && echo "  已拉起既存 VM 引擎容器"
  else
    docker run -d --name "$CM_VM_CONTAINER" --network host --restart unless-stopped \
      hub-dev.cnbn.org.cn/chainmakerofficial/chainmaker-vm-engine:v2.3.9 sleep infinity >/dev/null \
      && echo "  已新建 VM 引擎容器（--network host，与节点同机通信）"
  fi
  sleep 2
fi
# 2b. 节点进程（chainmaker 为前台进程，须后台化；日志 $CM_NODE_LOG）
if port_up 12301; then
  echo "  节点已在运行，跳过"
else
  # setsid + exec：节点脱离本脚本进程组/会话（新会话首进程），脚本退出、被 kill 或
  # 管道收尾都不牵连节点；实测 `(nohup cmd &)` 形态下节点会被 reparent 回脚本并成为
  # 其子进程，导致脚本收尾 wait 阻塞（部署实况教训）。
  setsid bash -c "cd '$CM_NODE_BIN' && exec ./chainmaker start -c ../config/wx-org-solo/chainmaker.yml >> '$CM_NODE_LOG' 2>&1" </dev/null >/dev/null 2>&1 &
  for _ in $(seq 1 60); do port_up 12301 && break; sleep 1; done
fi
if port_up 12301; then echo "  ✓ 端口 12301 监听"; else echo "  ✗ ChainMaker 启动失败（查 $CM_NODE_LOG）"; FAIL=1; fi

echo "== [3/3] Fabric 运营链（orderer 7050 / peer0.org1 7051 / peer0.org2 9051）=="
if port_up 7050 && port_up 7051; then
  echo "  已在运行，跳过"
else
  # 容器已存在（test-network 曾 up 过）→ 仅 docker start；绝不用 network.sh down/up 重建
  for c in orderer.example.com peer0.org1.example.com peer0.org2.example.com; do
    if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
      docker start "$c" >/dev/null 2>&1 || true
    fi
  done
  sleep 3
  if ! port_up 7050; then
    echo "  容器不存在/未起 → test-network 全新引导（up createChannel）"
    (cd "$TN" && PATH="$FAB_BIN:$PATH" ./network.sh up createChannel -c "$FAB_CHANNEL")
  fi
fi
if port_up 7050 && port_up 7051; then echo "  ✓ 端口 7050/7051 监听"; else echo "  ✗ Fabric 启动失败"; FAIL=1; fi

echo "== 深度健康检查（真实 RPC，非仅端口）=="
# ChainMaker：cmc 取最新块（不设 height 即 last block）
if "$CMC" query block-by-height --chain-id "$CM_CHAIN" --sdk-conf-path "$CM_SDK_CONF" \
    >/dev/null 2>&1; then
  echo "  ✓ chainmaker  RPC OK（cmc query block-by-height）"
else
  echo "  ✗ chainmaker  RPC FAIL"; FAIL=1
fi
# Fabric：peer channel getinfo（Org1 Admin 身份）
if (fabric_env_org1; PATH="$FAB_BIN:$PATH" peer channel getinfo -c "$FAB_CHANNEL") \
    >/dev/null 2>&1; then
  echo "  ✓ fabric      RPC OK（peer channel getinfo $FAB_CHANNEL）"
else
  echo "  ✗ fabric      RPC FAIL"; FAIL=1
fi
# FISCO：console getBlockNumber（交互式 console，命令走 stdin；结果跟在提示符后，如
# "[group0]: /apps> 127" —— 按 "> <数字>" 提取）
FISCO_H=$(fisco_console_cmd getBlockNumber | sed -n 's/.*> \([0-9][0-9]*\)$/\1/p' | tail -1)
if [ -n "${FISCO_H:-}" ]; then
  echo "  ✓ fisco-bcos  RPC OK（console getBlockNumber = $FISCO_H）"
else
  echo "  ✗ fisco-bcos  RPC FAIL（console 输出异常）"; FAIL=1
fi

[ "$FAIL" -eq 0 ] && echo "ALL_CHAINS_UP" || echo "SOME_CHAINS_FAILED（逐项排查上方 ✗）"
exit "$FAIL"
