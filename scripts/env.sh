#!/usr/bin/env bash
# scripts/env.sh —— 部署环境公共变量（被其余脚本 source；可单独 source 用于手工操作）。
# 所有路径为本部署环境实测值（docs/version-matrix.md §1-§4）；证书/密钥路径为非敏感
# 文件系统位置，密钥内容绝不入 Git（安全红线 §5-④）。

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

# Go 工具链（主机默认 PATH 不含 /usr/local/go）
export PATH=/usr/local/go/bin:$PATH
export GOPROXY=${GOPROXY:-https://goproxy.cn,direct}
export GOTOOLCHAIN=${GOTOOLCHAIN:-auto}

# ---- ChainMaker 监管链（新机 2026-10-12：4 组织 TBFT，wx-org1..4.chainmaker.org / chain1；
#      2026-10-18 扩容节点本机化：wx-org5 加入（链上 trustroot/consensusnodeorg add 已完成，
#      validators=5，nodeID QmWyk…；org5 不加 GOMEMLIMIT——450/650MiB 两档实测 GC
#      thrashing 82-100% CPU 拖垮 2 核机，2026-10-18 定案与 org1-4 现状一致；
#      VM 引擎口 22355/32355）。
#      旧 solo 配置备份于 /opt/chains/chainmaker/sdk.yml.solo-bak + trust-roots-solo/）----
CM_ROOT=/opt/chains/chainmaker
CMC=$CM_ROOT/bin/cmc                      # cmc v2.3.10
CM_SDK_CONF=$CM_ROOT/sdk.yml              # node_addr 127.0.0.1:12301, tls_host_name chainmaker.org（org1 client1）
CM_SDK_CONF_ORG5=$CM_ROOT/sdk-org5.yml    # node_addr 127.0.0.1:12305（org5，2026-10-18 本机化）
CM_NODE_BIN=$CM_ROOT/chainmaker-go/bin    # ./chainmaker start -c ../config/wx-orgN.chainmaker.org/chainmaker.yml（N=1..5）
CM_NODE_LOG=$CM_ROOT/chainmaker-go/log/org1/system.log
CM_BUILD=$CM_ROOT/build                   # docker-go 合约构建目录（每合约一子目录）
CM_CERTS=$CM_ROOT/chainmaker-go/config/wx-org1.chainmaker.org/certs
CM_ORG=wx-org1.chainmaker.org
CM_CHAIN=chain1
CM_ORGS="1 2 3 4 5"                       # 全部共识组织（rpc 1230N / p2p 1130N）
cm_vm_container() { echo "VM-GO-wx-org$1.chainmaker.org-chain1"; }  # docker-go VM 引擎容器（每 org 一个，engine 口 2235N/sandbox 3235N）

# ---- Fabric 运营链（test-network，mychannel，SMARTBFT 4-orderer，Org1+Org2；
#      2026-10-18 扩容节点本机化：peer1.org1/peer1.org2 部署于本机 /opt/skytrust-nodes/fabric/，
#      --network fabric_test，容器内标准口 7051/9051，宿主映射 7061/9061（后端 TCP 探活用）；
#      拉起固化于 run-peers-local.sh（幂等）。peer1 的 core.yaml 绝不加 vm.docker.hostConfig.
#      ExtraHosts —— 老机器 host-network 方案的 peerN:127.0.0.1 映射会污染 cc 容器 DNS
#      （2026-10-18 实坑：cc panic dial 127.0.0.1:7052 refused）。----
TN=$REPO/platforms/fabric-samples/test-network
FAB_BIN=$REPO/platforms/fabric-samples/bin       # 静态构建 peer/configtxlator 等
export FABRIC_CFG_PATH=$REPO/platforms/fabric-samples/config
FAB_CHANNEL=mychannel
FAB_CC_NAME=operator_business
FAB_ORDERERS="orderer.example.com orderer2.example.com orderer3.example.com orderer4.example.com"
FAB_P1_DIR=/opt/skytrust-nodes/fabric            # peer1×2 物料（core.yaml/msp/tls/admin-msp/production + mychannel.block + cc 包）
FAB_P1_RUNNER=$REPO/scripts/run-peers-local.sh   # peer1×2 幂等拉起——仓库固化版（终审 Important #4：/opt 原件已换 symlink 指向此处，杜绝漂移）
ORDERER_CA=$TN/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt
ORG1_ADMIN_MSP=$TN/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
ORG2_ADMIN_MSP=$TN/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
ORG1_TLS_CA=$TN/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
ORG2_TLS_CA=$TN/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

# ---- FISCO BCOS 管理链（group0，非国密，节点 v3.16.4；4 节点 BFT——node0 为
#      build-nodes 标准布局，node1-3 在 nodes_expand/（2026-10-12 扩容布局，
#      RPC 20201-20203 / p2p 30301-30303）。⚠ nodes_expand/nodeN/start.sh 硬依赖
#      ../fisco-bcos —— 该二进制系 2026-10-18 补的 symlink → /opt/fisco/fisco-bcos
#      （初次部署手工拉起未落盘，整机重启后暴露；两侧二进制 sha256 全同）----
FISCO_NODE=/opt/fisco/nodes/127.0.0.1/node0
FISCO_NODES="$FISCO_NODE /opt/fisco/nodes_expand/node1 /opt/fisco/nodes_expand/node2 /opt/fisco/nodes_expand/node3"
FISCO_CONSOLE=/opt/fisco/console
FISCO_GROUP=group0

# ---- IRITA 证照链（2026-10-13 C-1：4 验证人 Tendermint BFT，chain-id skytrust-license，
#      SM2 双层；节点数据 /opt/irita/net/node0..3 —— 账本不可毁（含启用锚点 record），
#      只可优雅停机，绝不 network-down / 删数据目录（与 P6-R6 同源红线）----
IRITA_BIN=/opt/irita/bin/irita             # v4.0.0（/opt 自持源码构建，sha256 已登记 version-matrix §12）
IRITA_NET=/opt/irita/net                   # node0..3/irita 家目录 + node{i}.pid/log + ANCHOR_TXID.txt
IRITA_CLI_HOME=/opt/irita/cli-home         # keyring-test（node0 + skytrust-biz 密钥）
IRITA_CHAIN_ID=skytrust-license
IRITA_RPC=http://127.0.0.1:26657           # node0 rpc；其余节点 26667/26677/26687（仅 127.0.0.1）
IRITA_KEY_NAME=skytrust-biz                # 业务写链账户（已注资 1000 IRITA）

# ---- 后端 ----
BACKEND=$REPO/services/skytrust-backend
BACKEND_BIN=$BACKEND/bin/server-realchains
BACKEND_URL=${BACKEND_URL:-http://127.0.0.1:8080}

# ---- 工具函数 ----
# port_up：ss 高负载偶发漏报（2026-10-13 IRITA 实况 + 2026-10-18 start-chains 复现：
# load>3 时单次采样瞬态 false）→ 3 次采样、间隔 0.5s，任一次命中即为 true。
port_up() {
  local i
  for i in 1 2 3; do
    ss -tln 2>/dev/null | grep -q ":$1 " && return 0
    [ "$i" -lt 3 ] && sleep 0.5
  done
  return 1
}
# docker_running/docker_exists：同理由，docker ps 在负载尖峰下也会瞬态空输出（2026-10-18 实况）
# —— 两者均多次采样（终审 Important #1：stop 路径假阴性会漏停容器仍报 ALL_STOPPED）
docker_running() {
  local i
  for i in 1 2 3; do
    docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$1" && return 0
    [ "$i" -lt 3 ] && sleep 0.5
  done
  return 1
}
docker_exists() {
  local i
  for i in 1 2 3; do
    docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$1" && return 0
    [ "$i" -lt 3 ] && sleep 0.5
  done
  return 1
}

fabric_env_org1() {
  export CORE_PEER_TLS_ENABLED=true CORE_PEER_LOCALMSPID=Org1MSP CORE_PEER_ADDRESS=localhost:7051
  export CORE_PEER_TLS_ROOTCERT_FILE=$ORG1_TLS_CA CORE_PEER_MSPCONFIGPATH=$ORG1_ADMIN_MSP
}
fabric_env_org2() {
  export CORE_PEER_TLS_ENABLED=true CORE_PEER_LOCALMSPID=Org2MSP CORE_PEER_ADDRESS=localhost:9051
  export CORE_PEER_TLS_ROOTCERT_FILE=$ORG2_TLS_CA CORE_PEER_MSPCONFIGPATH=$ORG2_ADMIN_MSP
}

# fisco_console_cmd <cmd...> —— console v3.8.0 为交互式（start.sh <groupID>），命令走 stdin。
# 输出经临时文件转发（不走管道）：console JVM 若残留为孤儿仍持有 stdout 管道时，
# 命令替换 $(…|…) 会永久阻塞——文件中转则孤儿持有的只是文件 fd，不阻塞任何读者。
# timeout -k：120s TERM 后再 10s 仍未退则 KILL。
fisco_console_cmd() {
  local out; out=$(mktemp /tmp/fisco-console.XXXXXX)
  # 注意：不可给 start.sh 加 </dev/null——显式重定向会覆盖 echo 管道，console 得到
  # 即时 EOF、来不及执行命令（部署实测教训）。echo 写完即 EOF，console 处理后自退。
  (cd "$FISCO_CONSOLE" && echo "$*" | timeout -k 10 120 bash start.sh "$FISCO_GROUP" \
    >"$out" 2>&1)
  cat "$out"; rm -f "$out"
}
