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
#      旧 solo 配置备份于 /opt/chains/chainmaker/sdk.yml.solo-bak + trust-roots-solo/）----
CM_ROOT=/opt/chains/chainmaker
CMC=$CM_ROOT/bin/cmc                      # cmc v2.3.10
CM_SDK_CONF=$CM_ROOT/sdk.yml              # node_addr 127.0.0.1:12301, tls_host_name chainmaker.org（org1 client1）
CM_NODE_BIN=$CM_ROOT/chainmaker-go/bin    # ./chainmaker start -c ../config/wx-orgN.chainmaker.org/chainmaker.yml（N=1..4）
CM_NODE_LOG=$CM_ROOT/chainmaker-go/log/org1/system.log
CM_BUILD=$CM_ROOT/build                   # docker-go 合约构建目录（每合约一子目录）
CM_CERTS=$CM_ROOT/chainmaker-go/config/wx-org1.chainmaker.org/certs
CM_ORG=wx-org1.chainmaker.org
CM_CHAIN=chain1
CM_VM_CONTAINER=VM-GO-wx-org1.chainmaker.org-chain1   # docker-go 合约 VM 引擎容器（每 org 一个，engine 端口 2235N）

# ---- Fabric 运营链（test-network，mychannel，etcdraft，Org1+Org2）----
TN=$REPO/platforms/fabric-samples/test-network
FAB_BIN=$REPO/platforms/fabric-samples/bin       # 静态构建 peer/configtxlator 等
export FABRIC_CFG_PATH=$REPO/platforms/fabric-samples/config
FAB_CHANNEL=mychannel
FAB_CC_NAME=operator_business
ORDERER_CA=$TN/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt
ORG1_ADMIN_MSP=$TN/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
ORG2_ADMIN_MSP=$TN/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
ORG1_TLS_CA=$TN/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
ORG2_TLS_CA=$TN/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

# ---- FISCO BCOS 管理链（group0，非国密，节点 v3.16.4）----
FISCO_NODE=/opt/fisco/nodes/127.0.0.1/node0
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
port_up() { ss -tln 2>/dev/null | grep -q ":$1 "; }

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
