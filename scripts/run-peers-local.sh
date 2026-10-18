#!/bin/bash
# run-peers-local.sh —— 本机 Fabric peer1.org1/peer1.org2 幂等拉起（2026-10-18 扩容节点本机化）。
# 仓库固化版（终审 Important #4：原 /opt/skytrust-nodes/fabric/run-peers-local.sh 已换
# symlink 指向此处；start-chains.sh 经 env.sh FAB_P1_RUNNER 调用本文件）。
# 物料:/opt/skytrust-nodes/fabric/peer1.orgX/{core.yaml,msp,tls,admin-msp,production}
#       + mychannel.block + operator_business_1.0.tar.gz(证书私钥只在 /opt,绝不入 Git)。
# 网络:fabric_test(docker DNS 解析 orderer/peer0/peer1 主机名,与 peer0 同网);
#       宿主映射 7061→7051 / 9061→9051(后端 TCP 探活用;容器内部保持标准端口)。
# ⚠ peer1 的 core.yaml 绝不加 vm.docker.hostConfig.ExtraHosts(老机器 host-network
#   方案的 peerN:127.0.0.1 映射会污染 cc 容器 DNS——2026-10-18 实坑,见 version-matrix §12.12)。
# 红线:只 start/run,绝不 rm 容器、绝不删 production 账本。
set -uo pipefail
B=/opt/skytrust-nodes/fabric
RC=0

run_peer() { # ORG P2P CC HOSTPORT
  local ORG=$1 P2P=$2 CC=$3 HP=$4 NAME=peer1.org$1.example.com
  if docker ps --format '{{.Names}}' | grep -qx "$NAME"; then
    echo "$NAME 已在运行,跳过"; return 0
  fi
  if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
    docker start "$NAME" >/dev/null && echo "$NAME 已拉起既存容器" && return 0
    echo "$NAME docker start 失败"; RC=1; return 1
  fi
  docker run -d --name "$NAME" --network fabric_test -p ${HP}:${P2P} \
    --restart unless-stopped -m 350m \
    -e CORE_PEER_ID=$NAME \
    -e CORE_PEER_ADDRESS=$NAME:${P2P} \
    -e CORE_PEER_LISTENADDRESS=0.0.0.0:${P2P} \
    -e CORE_PEER_CHAINCODEADDRESS=$NAME:${CC} \
    -e CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${CC} \
    -e CORE_PEER_GOSSIP_EXTERNALENDPOINT=$NAME:${P2P} \
    -e CORE_PEER_GOSSIP_BOOTSTRAP=peer0.org${ORG}.example.com:${P2P} \
    -e CORE_PEER_GOSSIP_USELEADERELECTION=true \
    -e CORE_PEER_GOSSIP_ORGLEADER=false \
    -e CORE_PEER_LOCALMSPID=Org${ORG}MSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt \
    -e CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock \
    -e CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_test \
    -e CORE_OPERATIONS_LISTENADDRESS=0.0.0.0:9443 \
    -e FABRIC_LOGGING_SPEC=INFO -e GOMEMLIMIT=280MiB \
    -v $B/peer1.org${ORG}/core.yaml:/etc/hyperledger/fabric/core.yaml:ro \
    -v $B/peer1.org${ORG}/msp:/etc/hyperledger/fabric/msp \
    -v $B/peer1.org${ORG}/tls:/etc/hyperledger/fabric/tls \
    -v $B/peer1.org${ORG}/admin-msp:/etc/hyperledger/fabric/admin-msp:ro \
    -v $B/peer1.org${ORG}/production:/var/hyperledger/production \
    -v /var/run/docker.sock:/host/var/run/docker.sock \
    -v $B/mychannel.block:/etc/hyperledger/fabric/mychannel.block:ro \
    -v $B/operator_business_1.0.tar.gz:/etc/hyperledger/fabric/operator_business_1.0.tar.gz:ro \
    hyperledger/fabric-peer:3.1.5 peer node start >/dev/null \
    && echo "$NAME 已新建(宿主口 $HP)" && return 0
  echo "$NAME docker run 失败"; RC=1; return 1
}

run_peer 1 7051 7052 7061
run_peer 2 9051 9052 9061
docker ps --filter name=peer1 --format '{{.Names}}\t{{.Status}}'
exit "$RC"   # 修复:/opt 原版末行 docker ps 会掩盖 run_peer 失败(恒 exit 0)
