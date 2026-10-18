#!/usr/bin/env bash
# start-chains.sh —— 四链一键启动 + 健康检查（幂等：已运行则跳过启动）。
# 顺序遵循 docs/real-chain-migration.md §3.1：FISCO → ChainMaker → Fabric；
# IRITA 证照链（2026-10-13 C-1 新增）最后启动，委托 scripts/start-irita.sh。
# ⚠ 安全红线：本脚本只「启动」，绝不做破坏性清理（fabric network.sh down /
#   删链删目录）——账本上载有 §4.4 部署 TxID 登记，毁账即毁验收依据。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

FAIL=0

echo "== [1/4] FISCO BCOS 管理链（4 节点 BFT：RPC 20200-20203 / p2p 30300-30303）=="
# 2026-10-18 改 4 节点全覆盖（终审后实弹教训）：原脚本只管 node0/20200——整机重启后
# node1-3（nodes_expand/ 扩容布局，start.sh 硬依赖 ../fisco-bcos symlink）进程被杀，
# 脚本却看不见（explorer/nodes 3/4 离线才暴露；version-matrix §12.12）。
for D in $FISCO_NODES; do
  S=${D##*/node}
  P="2020$S"
  if port_up "$P"; then
    echo "  node$S 已在运行（$P），跳过"
  else
    (cd "$D" && bash start.sh)
    for _ in $(seq 1 20); do port_up "$P" && break; sleep 1; done
  fi
  if port_up "$P"; then echo "  ✓ node$S 端口 $P 监听"; else echo "  ✗ FISCO node$S 启动失败（查 $D/log/ 与 $D/nohup.out）"; FAIL=1; fi
done

echo "== [2/4] ChainMaker 监管链（5-org TBFT：RPC 12301-12305 / p2p 11301-11305，wx-org1..5 / chain1）=="
# 2a. docker-go 合约 VM 引擎容器（节点执行合约依赖它；容器由节点首次启动时创建，
#     此后独立存续，节点/整机重启都不会自动拉起（restart=no 出身）→ 必须先 docker start。
#     形态=本机 org1-5 实况复刻：--network host、entrypoint /bin/startvm（镜像自带，
#     无 cmd）、CHAIN_RPC_PORT=2235N / SANDBOX_RPC_PORT=3235N、Memory 不限（本机惯例；
#     老机器 -m 250m 是其 1.7GB 预算的产物，不随物料带回）。
#     ⚠ 挂载源目录必须先以当前用户 mkdir —— docker run 会把缺失的源目录建成 root，
#       节点随后 mkdir contract-engine-sock 失败（2026-10-18 org5 本机化实坑）。
for N in $CM_ORGS; do
  VM=$(cm_vm_container "$N")
  mkdir -p "$CM_ROOT/chainmaker-go/data/wx-org$N.chainmaker.org/go" \
           "$CM_ROOT/chainmaker-go/log/wx-org$N.chainmaker.org/go"
  if docker_running "$VM"; then
    echo "  $VM 已在运行，跳过"
  elif docker_exists "$VM"; then
    # 终审 Important #2：失败分支不得静默——start/run 失败即 FAIL=1
    docker start "$VM" >/dev/null && echo "  已拉起既存 $VM" || { echo "  ✗ $VM docker start 失败"; FAIL=1; }
  else
    docker run -d --name "$VM" --network host --restart unless-stopped \
      -e CGROUP_DISABLE=true -e DOCKERVM_LOG_IN_CONSOLE=false \
      -e CHAIN_RPC_PORT=2235$N -e SANDBOX_RPC_PORT=3235$N \
      -e MAX_RECV_MSG_SIZE=100 -e CHAIN_HOST=127.0.0.1 -e TZ=Asia/Shanghai \
      -e DOCKERVM_CONTRACT_ENGINE_LOG_LEVEL=INFO -e DOCKERVM_SANDBOX_LOG_LEVEL=INFO \
      -v "$CM_ROOT/chainmaker-go/data/wx-org$N.chainmaker.org/go:/mount" \
      -v "$CM_ROOT/chainmaker-go/log/wx-org$N.chainmaker.org/go:/log" \
      hub-dev.cnbn.org.cn/chainmakerofficial/chainmaker-vm-engine:v2.3.9 >/dev/null \
      && echo "  已新建 $VM（engine 2235$N / sandbox 3235$N）" || { echo "  ✗ $VM docker run 失败"; FAIL=1; }
  fi
  # engine/sandbox 口就绪核验（终审 Important #2：容器活着≠端口在听；刚拉起需数秒）
  for _ in $(seq 1 10); do port_up "2235$N" && break; sleep 1; done
  if port_up "2235$N" && port_up "3235$N"; then
    echo "  ✓ $VM engine 2235$N / sandbox 3235$N 监听"
  else
    echo "  ✗ $VM engine/sandbox 端口未就绪（合约执行将失败；docker logs $VM）"; FAIL=1
  fi
done
# 2b. 节点进程（chainmaker 为前台进程，须后台化；每 org 日志 log/orgN/console.log。
#     org5 带 GOMEMLIMIT=450MiB（扩容计划内存红线）；org1-4 保持原部署现状不加限。）
for N in $CM_ORGS; do
  RPC_PORT=1230$N
  NODE_LOG="$CM_ROOT/chainmaker-go/log/org$N/console.log"
  mkdir -p "$(dirname "$NODE_LOG")"
  # org5 与 org1-4 一致不加内存限制（2026-10-18 实测定案，version-matrix §12.12）：
  # GOMEMLIMIT 450MiB→650MiB 两档均实测 GC thrashing——节点稳态 RSS≈630MB（org1-4
  # 同工作量实证），堆限贴近活堆即持续 GC，82-100% CPU 拖 2 核机到 load 11、
  # IRITA /status 超时。plan 原 450MiB 红线系老机器 1.7GB 预算产物；本机 avail
  # >1.4GB，org5 不限后 RSS 增量 ~+90MB 可承受。
  GL=""
  if port_up "$RPC_PORT"; then
    echo "  org$N 已在运行（$RPC_PORT），跳过"
  else
    # setsid + exec：节点脱离本脚本进程组/会话（新会话首进程），脚本退出、被 kill 或
    # 管道收尾都不牵连节点；实测 `(nohup cmd &)` 形态下节点会被 reparent 回脚本并成为
    # 其子进程，导致脚本收尾 wait 阻塞（部署实况教训）。
    setsid bash -c "cd '$CM_NODE_BIN' && exec ${GL}./chainmaker start -c ../config/wx-org$N.chainmaker.org/chainmaker.yml >> '$NODE_LOG' 2>&1" </dev/null >/dev/null 2>&1 &
    for _ in $(seq 1 60); do port_up "$RPC_PORT" && break; sleep 1; done
  fi
  if port_up "$RPC_PORT"; then echo "  ✓ org$N 端口 $RPC_PORT 监听"; else echo "  ✗ org$N 启动失败（查 $NODE_LOG）"; FAIL=1; fi
done

echo "== [3/4] Fabric 运营链（SMARTBFT 4-orderer 7050/7052/7056/7058 / peer0+peer1 ×2org：7051,9051 容器内 + 7061,9061 宿主映射）=="
# 终审 Important #3：4-orderer 宿主口为 7050/7052/7056/7058（compose-bft-test-net.yaml），
# 原脚本只盯 7050 —— orderer2-4 掉了会误判「已在运行」且终检漏报。
if port_up 7050 && port_up 7052 && port_up 7056 && port_up 7058 && port_up 7051 && port_up 9051; then
  echo "  orderer/peer0 已在运行，跳过"
else
  # 容器已存在（test-network 曾 up 过）→ 仅 docker start；绝不用 network.sh down/up 重建
  for c in $FAB_ORDERERS peer0.org1.example.com peer0.org2.example.com; do
    if docker_exists "$c"; then
      docker start "$c" >/dev/null 2>&1 || true
    fi
  done
  sleep 3
  if ! port_up 7050; then
    # 2026-10-18 改：容器整体缺失属灾难场景 —— 现行 network.sh up 引导的是单 orderer
    # etcdraft 旧拓扑，与 SMARTBFT 4-orderer 现实不符，盲跑会造出错误拓扑 → 只报错，人工裁定。
    echo "  ✗ orderer 容器不存在（灾难场景：不做自动引导，人工按 docs/real-chain-migration.md 裁定）"; FAIL=1
  fi
fi
# peer1.org1/peer1.org2（2026-10-18 本机化）：幂等 runner（running→跳过 / 存在→start / 缺失→run）
# runner 已收编入仓库 scripts/run-peers-local.sh 并以 RC 传播失败（终审 Important #4 +
# Minor #2：/opt 原版末行 docker ps 恒 exit 0 会掩盖失败；pipefail 使 || FAIL=1 生效）
if [ -f "$FAB_P1_RUNNER" ]; then
  bash "$FAB_P1_RUNNER" | sed 's/^/  /' || FAIL=1
else
  echo "  ⚠ $FAB_P1_RUNNER 不存在，跳过 peer1（物料在本机 /opt/skytrust-nodes/fabric/）"; FAIL=1
fi
# 链码容器（dev-*）：peer 会按需拉起，这里 best-effort 预启动既存容器缩短首次调用；
# peer 未就绪时它们会自灭，无副作用（下次 invoke 由 peer 重建/重启）。
for c in $(docker ps -a --format '{{.Names}}' | grep '^dev-peer'); do
  docker start "$c" >/dev/null 2>&1 || true
done
for P in 7050 7052 7056 7058 7051 9051 7061 9061; do
  if port_up "$P"; then echo "  ✓ 端口 $P 监听"; else echo "  ✗ 端口 $P 未监听"; FAIL=1; fi
done

echo "== [4/4] IRITA 证照链（4 验证人，rpc 127.0.0.1:26657/26667/26677/26687）=="
bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/start-irita.sh" start || FAIL=1

echo "== 深度健康检查（真实 RPC，非仅端口）=="
# ChainMaker：cmc 取最新块（不设 height 即 last block）；org1 与 org5 双端点 + 块高对齐
# （TBFT 无交易不出块，两节点 committed height 必须一致；容差 ±1 覆盖查询瞬间差）
CM_H1=$("$CMC" query block-by-height --chain-id "$CM_CHAIN" --sdk-conf-path "$CM_SDK_CONF" 2>/dev/null | jq -r '.block.header.block_height // empty' 2>/dev/null)
if [ -n "${CM_H1:-}" ]; then
  echo "  ✓ chainmaker  RPC OK（org1 height=$CM_H1）"
else
  if "$CMC" query block-by-height --chain-id "$CM_CHAIN" --sdk-conf-path "$CM_SDK_CONF" >/dev/null 2>&1; then
    echo "  ✓ chainmaker  RPC OK（cmc query block-by-height，高度解析失败不判死）"
  else
    echo "  ✗ chainmaker  RPC FAIL（org1）"; FAIL=1
  fi
fi
CM_H5=$("$CMC" query block-by-height --chain-id "$CM_CHAIN" --sdk-conf-path "$CM_SDK_CONF_ORG5" 2>/dev/null | jq -r '.block.header.block_height // empty' 2>/dev/null)
if [ -n "${CM_H5:-}" ]; then
  if [ -n "${CM_H1:-}" ] && [ $(( CM_H1 > CM_H5 ? CM_H1 - CM_H5 : CM_H5 - CM_H1 )) -gt 1 ]; then
    echo "  ✗ chainmaker  org5 块高未对齐（org1=$CM_H1 org5=$CM_H5，同步中断？）"; FAIL=1
  else
    echo "  ✓ chainmaker  org5 RPC OK（height=$CM_H5，与 org1 对齐）"
  fi
else
  echo "  ✗ chainmaker  org5 RPC FAIL（查 $CM_SDK_CONF_ORG5 / log/org5/console.log）"; FAIL=1
fi
# Fabric：peer channel getinfo（Org1 Admin 身份，peer0）+ peer1.org1 高度对齐（扩容节点同步核验）
FAB_H0=$( (fabric_env_org1; PATH="$FAB_BIN:$PATH" peer channel getinfo -c "$FAB_CHANNEL") 2>/dev/null | grep -oP '"height":\K[0-9]+' | head -1)
if [ -n "${FAB_H0:-}" ]; then
  echo "  ✓ fabric      RPC OK（peer0.org1 $FAB_CHANNEL height=$FAB_H0）"
else
  echo "  ✗ fabric      RPC FAIL"; FAIL=1
fi
FAB_H1=$(docker exec -e CORE_PEER_ADDRESS=peer1.org1.example.com:7051 -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/admin-msp -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
  -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
  peer1.org1.example.com peer channel getinfo -c "$FAB_CHANNEL" 2>/dev/null | grep -oP '"height":\K[0-9]+' | head -1)
if [ -n "${FAB_H1:-}" ]; then
  if [ -n "${FAB_H0:-}" ] && [ $(( FAB_H0 > FAB_H1 ? FAB_H0 - FAB_H1 : FAB_H1 - FAB_H0 )) -gt 1 ]; then
    echo "  ✗ fabric      peer1.org1 块高未对齐（peer0=$FAB_H0 peer1=$FAB_H1）"; FAIL=1
  else
    echo "  ✓ fabric      peer1.org1 OK（height=$FAB_H1，与 peer0 对齐）"
  fi
else
  echo "  ✗ fabric      peer1.org1 getinfo FAIL（docker logs peer1.org1.example.com）"; FAIL=1
fi
# FISCO：console getBlockNumber（交互式 console，命令走 stdin；结果跟在提示符后，如
# "[group0]: /apps> 127" —— 按 "> <数字>" 提取）
FISCO_H=$(fisco_console_cmd getBlockNumber | sed -n 's/.*> \([0-9][0-9]*\)$/\1/p' | tail -1)
if [ -n "${FISCO_H:-}" ]; then
  echo "  ✓ fisco-bcos  RPC OK（console getBlockNumber = $FISCO_H）"
else
  echo "  ✗ fisco-bcos  RPC FAIL（console 输出异常）"; FAIL=1
fi
# IRITA：TM /status 取最新高度 + catching_up=false（node0 rpc 26657）
# 注意：catching_up 是布尔 false，jq 的 //empty 会把它当 falsy 吞掉 → 必须裸取
IRITA_S=$(curl -s -m 5 "$IRITA_RPC/status")
IRITA_H=$(echo "$IRITA_S" | jq -r '.result.sync_info.latest_block_height // empty')
IRITA_CATCH=$(echo "$IRITA_S" | jq -r '.result.sync_info.catching_up')
if [ -n "${IRITA_H:-}" ] && [ "$IRITA_CATCH" = "false" ]; then
  echo "  ✓ irita       RPC OK（/status height = $IRITA_H，catching_up=false）"
else
  echo "  ✗ irita       RPC FAIL（height=${IRITA_H:-无} catching_up=${IRITA_CATCH:-无}）"; FAIL=1
fi

[ "$FAIL" -eq 0 ] && echo "ALL_CHAINS_UP" || echo "SOME_CHAINS_FAILED（逐项排查上方 ✗）"
exit "$FAIL"
