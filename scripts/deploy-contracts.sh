#!/usr/bin/env bash
# deploy-contracts.sh —— 三链合约部署/升级（docs/real-chain-migration.md §4.1-§4.3 的部署实况实例化）。
# 用法：deploy-contracts.sh {chainmaker-build|chainmaker-deploy|chainmaker-upgrade|fabric|fisco|all}
#   chainmaker-build   构建 5 个 docker-go 合约 → 二进制 + .7z（py7zr）
#   chainmaker-deploy  首次部署（cmc client contract user create，v1.0.0）
#   chainmaker-upgrade 升级至 $CM_VERSION（默认 1.0.2，含 QueryState 读方法）
#   fabric             peer lifecycle：package → install ×2 org → approve ×2 → commit → 冒烟
#   fisco              Console：sol 拷入 → deploy → ln /apps/uav_management → ls 校验
#   all                build + deploy（首次全新环境）
# ⚠ 非幂等说明：本环境三链合约已部署并登记 §4.4 TxID（docs/version-matrix.md §5）。
#   重复 deploy/approve 会因「已存在/已审批」失败——这是保护而非缺陷；日常运维无需重跑。
#   每次成功部署后：将 TxID 回填 docs/version-matrix.md §5 登记表（验收 §6.5-② 依据）。
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

CM_CONTRACTS=(regulatory_record crosschain_trace identity_mapping regulatory_authorization audit_record)
CM_VERSION=${CM_VERSION:-1.0.2}
FAB_VERSION=${FAB_VERSION:-1.0}
FAB_SEQUENCE=${FAB_SEQUENCE:-1}
FAB_LABEL="${FAB_CC_NAME}_${FAB_VERSION}"
CM_ADMIN_KEY=$CM_CERTS/user/admin1/admin1.sign.key
CM_ADMIN_CRT=$CM_CERTS/user/admin1/admin1.sign.crt

cmc_receipt_ok() { # $1=json 文件；protobuf-JSON 省略零值：result.code 缺省即 SUCCESS
  python3 - "$1" <<'PY'
import json,sys
raw=open(sys.argv[1]).read()
i=raw.find('{')
d=json.loads(raw[i:]) if i>=0 else {}
tx=d.get('transaction',d); res=tx.get('result') or {}
cr=res.get('contract_result') or {}
ok = res.get('code') in (None,0,'SUCCESS') and cr.get('code') in (None,0)
print('  receipt: tx_id=%s block=%s result.code=%s contract.code=%s → %s' % (
  tx.get('tx_id','?')[:16]+'…', tx.get('block_height','?'),
  res.get('code'), cr.get('code'), 'SUCCESS' if ok else 'FAIL'))
sys.exit(0 if ok else 1)
PY
}

chainmaker_build() {
  echo "== ChainMaker：构建 5 个 docker-go 合约（CGO_ENABLED=0 静态 + py7zr 打包）=="
  export CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOFLAGS=-p=2 GOGC=50
  for name in "${CM_CONTRACTS[@]}"; do
    echo "--- build $name ---"
    [ -f "$CM_BUILD/$name/go.mod" ] || { echo "✗ $CM_BUILD/$name/go.mod 缺失（构建脚手架目录，含 contract-sdk-go/v2 v2.3.10）"; exit 1; }
    cp "$REPO/contracts/chainmaker/$name/contract.go" "$CM_BUILD/$name/contract.go"
    (cd "$CM_BUILD/$name" && go build -trimpath -o "$name" .)
    python3 - "$CM_BUILD/$name" "$name" <<'PY'
import py7zr, os, sys
d, name = sys.argv[1], sys.argv[2]
p = os.path.join(d, name + '.7z')
if os.path.exists(p): os.remove(p)
with py7zr.SevenZipFile(p, 'w') as z:
    z.write(os.path.join(d, name), arcname=name)
print('  7z:', p, os.path.getsize(p), 'bytes')
PY
  done
  echo CM_BUILD_OK
}

chainmaker_deploy() { # 首次部署 v1.0.0（已部署链上重跑会失败——见文件头说明）
  echo "== ChainMaker：cmc create（v1.0.0，DOCKER_GO，admin1 单org）=="
  for name in "${CM_CONTRACTS[@]}"; do
    echo "--- deploy $name ---"
    "$CMC" client contract user create \
      --chain-id "$CM_CHAIN" --org-id "$CM_ORG" \
      --contract-name "$name" --version 1.0.0 \
      --byte-code-path "$CM_BUILD/$name/$name.7z" \
      --runtime-type DOCKER_GO --params '{}' \
      --sdk-conf-path "$CM_SDK_CONF" \
      --admin-key-file-paths "$CM_ADMIN_KEY" \
      --admin-crt-file-paths "$CM_ADMIN_CRT" \
      --admin-org-ids "$CM_ORG" \
      --sync-result --timeout 30 > "$CM_ROOT/deploy-$name.json" 2>&1
    cmc_receipt_ok "$CM_ROOT/deploy-$name.json"
  done
  echo CM_DEPLOY_OK
}

chainmaker_upgrade() { # 升级至 $CM_VERSION（部署实况：1.0.1 SDK 适配、1.0.2 QueryState）
  echo "== ChainMaker：cmc upgrade → v$CM_VERSION =="
  for name in "${CM_CONTRACTS[@]}"; do
    echo "--- upgrade $name → $CM_VERSION ---"
    "$CMC" client contract user upgrade \
      --chain-id "$CM_CHAIN" --org-id "$CM_ORG" \
      --contract-name "$name" --version "$CM_VERSION" \
      --byte-code-path "$CM_BUILD/$name/$name.7z" \
      --runtime-type DOCKER_GO \
      --sdk-conf-path "$CM_SDK_CONF" \
      --admin-key-file-paths "$CM_ADMIN_KEY" \
      --admin-crt-file-paths "$CM_ADMIN_CRT" \
      --admin-org-ids "$CM_ORG" \
      --sync-result --timeout 30 > "$CM_ROOT/upgrade-$CM_VERSION-$name.json" 2>&1
    cmc_receipt_ok "$CM_ROOT/upgrade-$CM_VERSION-$name.json"
  done
  echo CM_UPGRADE_OK
}

fabric_deploy() {
  echo "== Fabric：peer lifecycle（$FAB_LABEL，sequence $FAB_SEQUENCE，mychannel）=="
  cd "$REPO/contracts/fabric"
  export PATH="$FAB_BIN:$PATH"

  echo "--- 1) package（--path ./chaincode：main 包子目录；vendor 已随仓库携带）---"
  [ -d vendor ] || { echo "vendor/ 缺失 → go mod tidy && go mod vendor（仅部署环境，go.sum 不回流）"; exit 1; }
  peer lifecycle chaincode package "$FAB_LABEL.tar.gz" \
    --path ./chaincode --lang golang --label "$FAB_LABEL"
  echo "  ✓ $FAB_LABEL.tar.gz"

  echo "--- 2) install（org1 + org2 各一次）---"
  (fabric_env_org1; peer lifecycle chaincode install "$FAB_LABEL.tar.gz") && echo "  ✓ org1 installed"
  (fabric_env_org2; peer lifecycle chaincode install "$FAB_LABEL.tar.gz") && echo "  ✓ org2 installed"

  echo "--- 3) queryinstalled → package ID ---"
  CC_PACKAGE_ID=$(fabric_env_org1; peer lifecycle chaincode queryinstalled --output json \
    | jq -r --arg l "$FAB_LABEL" '.installed_chaincodes[] | select(.label==$l) | .package_id' | head -1)
  [ -n "$CC_PACKAGE_ID" ] || { echo "✗ 未取到 package_id"; exit 1; }
  echo "  ✓ CC_PACKAGE_ID=$CC_PACKAGE_ID"

  echo "--- 4) approveformyorg ×2 ---"
  (fabric_env_org1; peer lifecycle chaincode approveformyorg \
    --channelID "$FAB_CHANNEL" --name "$FAB_CC_NAME" \
    --version "$FAB_VERSION" --sequence "$FAB_SEQUENCE" \
    --package-id "$CC_PACKAGE_ID" \
    --orderer localhost:7050 --tls --cafile "$ORDERER_CA") && echo "  ✓ Org1 approved"
  (fabric_env_org2; peer lifecycle chaincode approveformyorg \
    --channelID "$FAB_CHANNEL" --name "$FAB_CC_NAME" \
    --version "$FAB_VERSION" --sequence "$FAB_SEQUENCE" \
    --package-id "$CC_PACKAGE_ID" \
    --orderer localhost:7050 --tls --cafile "$ORDERER_CA") && echo "  ✓ Org2 approved"

  echo "--- 5) commit（双方背书；部署 TxID 须回填 §4.4 登记表）---"
  (fabric_env_org1; peer lifecycle chaincode commit \
    --channelID "$FAB_CHANNEL" --name "$FAB_CC_NAME" \
    --version "$FAB_VERSION" --sequence "$FAB_SEQUENCE" \
    --orderer localhost:7050 --tls --cafile "$ORDERER_CA" \
    --peerAddresses localhost:7051 --tlsRootCertFiles "$ORG1_TLS_CA" \
    --peerAddresses localhost:9051 --tlsRootCertFiles "$ORG2_TLS_CA") && echo "  ✓ committed"
  (fabric_env_org1; peer lifecycle chaincode querycommitted --channelID "$FAB_CHANNEL" --name "$FAB_CC_NAME")

  echo "--- 6) 冒烟：CrosschainSubmit 写 SUBMIT/<id> + qscc GetBlockByTxID 复核 ---"
  SMOKE="SMOKE-$(date +%s)"
  INNER="{\"cross_tx_id\":\"$SMOKE\",\"message_type\":\"MISSION_APPLICATION\",\"business_id\":\"$SMOKE\"}"
  CTOR=$(python3 -c 'import json,sys; print(json.dumps({"function":"CrosschainSubmit","Args":[sys.argv[1]]}))' "$INNER")
  TXID=$( (fabric_env_org1; peer chaincode invoke -C "$FAB_CHANNEL" -n "$FAB_CC_NAME" \
    --peerAddresses localhost:7051 --tlsRootCertFiles "$ORG1_TLS_CA" \
    --peerAddresses localhost:9051 --tlsRootCertFiles "$ORG2_TLS_CA" \
    --orderer localhost:7050 --tls --cafile "$ORDERER_CA" \
    --ctor "$CTOR" 2>/dev/null) | tail -1)
  echo "  invoke TxID=$TXID"
  sleep 3
  # qscc（latest/3.x 线构建）GetBlockByTxID 收 (channel, txID) 两实参
  if (fabric_env_org1; peer chaincode query -C "$FAB_CHANNEL" -n qscc \
      --ctor "{\"Args\":[\"GetBlockByTxID\",\"$FAB_CHANNEL\",\"$TXID\"]}") >/dev/null 2>&1; then
    echo "  ✓ qscc GetBlockByTxID 命中（冒烟 TxID 回填 §4.4 登记表）"
  else
    echo "  ✗ 冒烟 TxID 未上链（BatchTimeout 窗口内重试查询或查 peer 日志）"; exit 1
  fi
  echo FABRIC_DEPLOY_OK
}

fisco_deploy() {
  echo "== FISCO BCOS：Console deploy + BFS ln /apps/uav_management =="
  # console 交互式（start.sh 只收 groupID，命令走 stdin——fisco_console_cmd 封装）
  cp "$REPO/contracts/fisco/uav_management.sol" "$FISCO_CONSOLE/contracts/solidity/UavManagement.sol"
  echo "--- 1) deploy solidity/UavManagement.sol（sol 自动编译，pragma ^0.8）---"
  fisco_console_cmd "deploy solidity/UavManagement.sol" | tee /tmp/fisco-deploy.out
  # 地址以 deploylog 末行为准（console 输出含多地址，deploylog 权威）
  ADDR=$(tail -1 "$FISCO_CONSOLE/deploylog.txt" | awk '{print $NF}')
  case "$ADDR" in 0x*) echo "  ✓ contract address=$ADDR（deploy TxID 见上方回执，回填 §4.4）";;
    *) echo "  ✗ deploylog 解析地址失败：$ADDR"; exit 1;;
  esac
  echo "--- 2) ln /apps/uav_management $ADDR（BFS 链接 = 后端按名解析依据）---"
  fisco_console_cmd "ln /apps/uav_management $ADDR" | tee /tmp/fisco-ln.out
  echo "--- 3) ls /apps 校验 ---"
  fisco_console_cmd "ls /apps" | tee /tmp/fisco-ls.out
  grep -q uav_management /tmp/fisco-ls.out && echo "  ✓ /apps/uav_management 可解析" \
    || { echo "  ✗ BFS 链接缺失（ln 已存在旧链接会拒绝——先核对旧地址或人工处理）"; exit 1; }
  echo FISCO_DEPLOY_OK
}

case "${1:-}" in
  chainmaker-build)   chainmaker_build ;;
  chainmaker-deploy)  chainmaker_deploy ;;
  chainmaker-upgrade) chainmaker_upgrade ;;
  fabric)             fabric_deploy ;;
  fisco)              fisco_deploy ;;
  all)                chainmaker_build; chainmaker_deploy; fabric_deploy; fisco_deploy ;;
  *) echo "用法: $0 {chainmaker-build|chainmaker-deploy|chainmaker-upgrade|fabric|fisco|all}"
     echo "  升级链上既存合约版本：CM_VERSION=1.0.3 $0 chainmaker-upgrade"; exit 2 ;;
esac
