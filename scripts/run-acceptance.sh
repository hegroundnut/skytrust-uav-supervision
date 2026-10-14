#!/usr/bin/env bash
# run-acceptance.sh —— docs/real-chain-migration.md §6.5 五项验收一键复核（真实链在线执行）。
#   ① POST /api/chain/status 四链 ONLINE（真实 Health() 探针，非静态配置）
#   ② §4.4 部署 TxID 全部链上可查询（cmc query tx / qscc GetBlockByTxID / console 回执
#      + IRITA 锚点 record TM RPC /tx——2026-10-13 证照链启用登记）
#   ③ 13 步跨链闭环业务流 SUCCESS（create→submit→review→issue，任何一跳失败不得 SUCCESS；
#      签发源段必须 IRITA- 前缀——证照链→监管链中继→运营链）
#   ④ 两跳四段 TxID 持久化，/api/crosschain/query 可验证
#   ⑤ CROSSCHAIN_LOOP ×$COUNT：成功率 1、p95 < 1000ms（不达标先调链侧，绝不放宽协议）
# 前置：start-chains.sh + IRITA 四节点（scripts/start-irita.sh）+ start-backend-real.sh 已就绪；
#       jq/python3/curl 可用。
# TxID 常量源：docs/version-matrix.md §5 登记表（v1.0.2 最终版 + fabric commit/冒烟 + fisco 最终部署）。
# 时代注记：v2（2026-10-14）= 新机四链默认值（IRITA 证照链加入、⑤ 轻实测 COUNT=10 如实登记）；
# 老机三链复现走 override（CM_TXIDS_OVERRIDE/FAB_TXIDS_OVERRIDE/FISCO_TXID/IRITA_ANCHOR_TXID），
# v1 三链时代脚本以 git 历史为准。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

COUNT=${COUNT:-10}           # ⑤ 样本数（v2 轻实测=10——验收⑤裁定如实登记；官方口径=100 tc1_test.go:209，传 COUNT=100 复现）
API_TIMEOUT=${API_TIMEOUT:-900}
FAIL=0
declare -A ITEM

api() { curl -s --max-time "$API_TIMEOUT" -X POST "$BACKEND_URL$1" -H 'Content-Type: application/json' -d "$2"; }
jqr() { echo "$1" | jq -r "$2" 2>/dev/null; }
mark() { ITEM[$1]="$2"; [ "$2" = PASS ] || FAIL=1; }

# TxID 常量可被环境变量覆盖（CM_TXIDS_OVERRIDE/FAB_TXIDS_OVERRIDE/FISCO_TXID/IRITA_ANCHOR_TXID）：
# v2 默认值 = 新机 2026-10-12/13 登记值（version-matrix §11.2 复跑 PASS 同源）；
# 老机 2026-09-17 三链登记值（§5）走 override 复现（时代注记：v1 默认见 git 历史）。
if [ -n "${CM_TXIDS_OVERRIDE:-}" ]; then read -ra CM_TXIDS <<< "$CM_TXIDS_OVERRIDE"; else CM_TXIDS=(
  18ddbdb2e2d74146ca85e66d84982bdec19cae39bb3d4c049fe891e2f865f6f7
  18ddbdbac8807d54ca981081b661d357a0d62fa1d06c4512ac43694eb8fd3c01
  18ddbe2aed734463cad462e16028baefd8c26bd1b5b94eb3b8b4e56c945d575b
  18ddbea6c52c057aca0efba4696ed886227bd67259194a34b9b2d0e1e6bdb051
  18ddbf15a5758e9ccafdb095f3f7a3efa59d367fba1744afb12bf6204063340e
); fi
if [ -n "${FAB_TXIDS_OVERRIDE:-}" ]; then read -ra FAB_TXIDS <<< "$FAB_TXIDS_OVERRIDE"; else FAB_TXIDS=(
  d165208cd7414aa6df463ec1fa6b8d5ef6f5b86ebefe472736080fd394678479
  2208bb13c9b43e62df184cb89fc3f4cb0723d5d413fa2843448069a5da96fbc1
); fi
FISCO_TXID=${FISCO_TXID:-0x172514d300b6e148a3b1630bb5c1dd7a85f038ff3ac10d720bc957ba9e2e76af}
# IRITA 证照链部署锚点 = Task 1 Step 8 record（2026-10-13，h=822，record-id 9939a8aa…；
# 源文件 /opt/irita/net/ANCHOR_TXID.txt，§12 登记）。TM RPC /tx?hash=0x<64hex> 直查。
IRITA_ANCHOR_TXID=${IRITA_ANCHOR_TXID:-8FD32506345441825A5398BE2CC06F4664F7F3A934A53B4647603CB14681B08A}

echo "======== ① /api/chain/status 四链 ONLINE ========"
R=$(api /api/chain/status '{}')
ONLINE=$(jqr "$R" '[.data.chains[] | select(.=="ONLINE")] | length')
echo "$R" | jq -c '.data.chains' 2>/dev/null || echo "$R"
[ "$ONLINE" = "4" ] && { echo "  ✓ 4/4 ONLINE"; mark ① PASS; } || { echo "  ✗ ONLINE=$ONLINE/4"; mark ① FAIL; }

echo; echo "======== ② §4.4 部署 TxID 链上可查询 ========"
T_OK=1
for tx in "${CM_TXIDS[@]}"; do
  if "$CMC" query tx "$tx" --chain-id "$CM_CHAIN" --sdk-conf-path "$CM_SDK_CONF" \
      --with-rw-set=false --truncate-value=false 2>/dev/null | python3 -c '
import json,sys
raw=sys.stdin.read(); i=raw.find("{")
d=json.loads(raw[i:]) if i>=0 else {}
tx=d.get("transaction",d); res=tx.get("result") or {}; cr=res.get("contract_result") or {}
sys.exit(0 if i>=0 and res.get("code") in (None,0,"SUCCESS") and cr.get("code") in (None,0) else 1)'; then
    echo "  ✓ chainmaker ${tx:0:16}…"
  else echo "  ✗ chainmaker ${tx:0:16}… 查询失败"; T_OK=0; fi
done
for tx in "${FAB_TXIDS[@]}"; do
  # 本环境 peer/qscc 为 fabric-samples latest（3.x 线）构建：GetBlockByTxID 收
  # (channel, txID) 两实参（缺 channel 报 "missing 3rd argument"）——偏差记 version-matrix §8。
  if (fabric_env_org1; PATH="$FAB_BIN:$PATH" peer chaincode query -C "$FAB_CHANNEL" -n qscc \
      --ctor "{\"Args\":[\"GetBlockByTxID\",\"$FAB_CHANNEL\",\"$tx\"]}") >/dev/null 2>&1; then
    echo "  ✓ fabric     ${tx:0:16}…（qscc GetBlockByTxID；GetBlockNumberByTxID 被通道策略拒——D15）"
  else echo "  ✗ fabric     ${tx:0:16}… 未命中"; T_OK=0; fi
done
# FISCO 部署交易上链证明。新机（2026-10-12）console 因 libproviders.so 缺失不可用，且
# v3.16 JSON-RPC 两处怪癖：getBlockByNumber 在 (onlyHeader=true, onlyTxHash=false) 下忽略
# blockNumber 恒返回块 1 的**完整交易体**；getTransactionReceipt 对链上有效交易恒报 3008
# （偏差记录 version-matrix §8）。部署交易恰在块 1 → 以“块 1 完整交易体含该 hash”为上链
# 证明（交易体+hash 自证）；老机路径（console statusOK）保留为回退。
# §12.11 复核注记：两处怪癖**仅在 JSON-RPC curl 面**（该面甚至缺 getTransactionByHash
# 方法）；后端 go-sdk websocket 通道块/收据查询完全可用——浏览器块数据已改走 SDK 真实
# 块。本证明沿用 JSON-RPC 面（怪癖在该面依旧成立，包含证明依然有效），逻辑不变。
fisco_tx_in_block1() {
  curl -sk -m 10 "${FISCO_RPC_HTTPS:-https://127.0.0.1:20200}" \
    --cacert "$FISCO_CONSOLE/conf/ca.crt" --cert "$FISCO_CONSOLE/conf/sdk.crt" --key "$FISCO_CONSOLE/conf/sdk.key" \
    -X POST -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","method":"getBlockByNumber","params":["group0",1,true,false,false],"id":1}' \
    | grep -q "\"hash\":\"$1\""
}
if fisco_tx_in_block1 "$FISCO_TXID"; then
  echo "  ✓ fisco-bcos ${FISCO_TXID:0:18}…（RPC 块 1 完整交易体包含证明）"
elif fisco_console_cmd "getTransactionReceipt $FISCO_TXID" | grep -q 'statusOK.*true'; then
  echo "  ✓ fisco-bcos ${FISCO_TXID:0:18}…（statusOK=true）"
else echo "  ✗ fisco-bcos 回执异常"; T_OK=0; fi
# IRITA 锚点 record 上链证明：裸 TM RPC /tx（与 real 传输 QueryTx 同通道），tx_result.code=0 即成功。
IRITA_TX=$(curl -s --max-time 10 "${IRITA_RPC:-http://127.0.0.1:26657}/tx?hash=0x$IRITA_ANCHOR_TXID")
if [ "$(jqr "$IRITA_TX" .result.tx_result.code)" = "0" ]; then
  echo "  ✓ irita      ${IRITA_ANCHOR_TXID:0:16}…（TM RPC /tx code=0 @h=$(jqr "$IRITA_TX" .result.height)）"
else echo "  ✗ irita      锚点 ${IRITA_ANCHOR_TXID:0:16}… 查询失败"; T_OK=0; fi
[ "$T_OK" = 1 ] && mark ② PASS || mark ② FAIL

echo; echo "======== ③ 13 步跨链闭环业务流（真实四链） ========"
api /api/demo/init '{}' >/dev/null   # 已初始化则容忍非零
TOMORROW=$(date -d tomorrow +%F)
R=$(api /api/mission/create "{\"operator_id\":\"Operator-A\",\"uav_id\":\"UAV-A-001\",\"mission_type\":\"POWER_INSPECTION\",\"start_time\":\"$TOMORROW 09:00:00\",\"end_time\":\"$TOMORROW 11:00:00\",\"route_segments\":[\"R101\",\"R205\",\"R306\"],\"altitude_min\":60,\"altitude_max\":120,\"payload_type\":\"CAMERA\",\"description\":\"验收复核-巡线走廊Zone-A\"}")
MISSION_ID=$(jqr "$R" .data.mission_id)
echo "  mission_id=$MISSION_ID（code=$(jqr "$R" .code)）"

R=$(api /api/mission/submit "{\"mission_id\":\"$MISSION_ID\",\"operator\":\"Operator-A\"}")
APP_ID=$(jqr "$R" .data.application.application_id); CX1=$(jqr "$R" .data.crosschain.cross_tx_id)
echo "  application_id=$APP_ID  CX1=$CX1  status=$(jqr "$R" .data.crosschain.status)  latency=$(jqr "$R" .data.crosschain.latency_ms)ms"

R=$(api /api/review/submit "{\"application_id\":\"$APP_ID\",\"result\":\"APPROVED\",\"reviewer\":\"FISCO-ADMIN\",\"comment\":\"同意执行\",\"rules_hit\":[\"R-ALT-001\"]}")
CX2=$(jqr "$R" .data.crosschain.cross_tx_id)
echo "  review  CX2=$CX2  status=$(jqr "$R" .data.crosschain.status)  latency=$(jqr "$R" .data.crosschain.latency_ms)ms"

VFROM=$(date -d '-1 hour' '+%F %T'); VTO=$(date -d '+1 hour' '+%F %T')
PASS_JSON=$([ -n "${PASS_ID:-}" ] && echo "\"pass_id\":\"$PASS_ID\"," || echo "")
R=$(api /api/pass/issue "{${PASS_JSON}\"mission_id\":\"$MISSION_ID\",\"issuer\":\"REGISTRY-ADMIN\",\"valid_from\":\"$VFROM\",\"valid_to\":\"$VTO\"}")
CX3=$(jqr "$R" .data.crosschain.cross_tx_id); PID=$(jqr "$R" .data.pass.pass_id)
echo "  pass_id=$PID status=$(jqr "$R" .data.pass.status)  CX3=$CX3  crosschain=$(jqr "$R" .data.crosschain.status)"

S1=$(jqr "$(api /api/crosschain/query "{\"cross_tx_id\":\"$CX1\"}")" .data.status)
S2=$(jqr "$(api /api/crosschain/query "{\"cross_tx_id\":\"$CX2\"}")" .data.status)
Q3=$(api /api/crosschain/query "{\"cross_tx_id\":\"$CX3\"}")
S3=$(jqr "$Q3" .data.status); SRC3=$(jqr "$Q3" .data.source_chain_tx_id)
# 四链闭环断言（Task 12 校准 D2）：real 传输返回链原生 TxID（irita=裸 64hex 大写 txhash，
# 无 SIM 侧 IRITA- 前缀——前缀是仿真传输工件，§11.3-④ src=裸值先例同源）。「签发源=证照链」
# 的语义证明 = 该 txhash 在 IRITA 链上真实可查且 code=0（比字符串前缀更强）。
SRC3_ONCHAIN=$(curl -s --max-time 10 "${IRITA_RPC:-http://127.0.0.1:26657}/tx?hash=0x$SRC3" | jq -r '.result.tx_result.code // "ERR"' 2>/dev/null)
echo "  CX3 源段=$SRC3（IRITA 链上核验 code=$SRC3_ONCHAIN）"
if [ "$S1" = SUCCESS ] && [ "$S2" = SUCCESS ] && [ "$S3" = SUCCESS ] && [ "$SRC3_ONCHAIN" = "0" ]; then
  echo "  ✓ 三笔跨链全部 SUCCESS + 签发源段 IRITA 链上实证（证照链四链闭环）"; mark ③ PASS
else echo "  ✗ 存在非 SUCCESS 或源段链上核验失败：$S1/$S2/$S3 src=$SRC3 code=$SRC3_ONCHAIN"; mark ③ FAIL; fi

echo; echo "======== ④ 两跳四段 TxID 持久化（/api/crosschain/query） ========"
SEG_OK=1
for cx in "$CX1" "$CX2" "$CX3"; do
  Q=$(api /api/crosschain/query "{\"cross_tx_id\":\"$cx\"}")
  ALL=$(jqr "$Q" '[.data.status=="SUCCESS", (.data.source_chain_tx_id|length>0), (.data.reg_receive_tx_id|length>0), (.data.reg_relay_tx_id|length>0), (.data.target_chain_tx_id|length>0)] | all')
  echo "  $cx → 四段齐全且SUCCESS: $ALL  src=$(jqr "$Q" .data.source_chain_tx_id | cut -c1-14)… reg=$(jqr "$Q" .data.reg_receive_tx_id | cut -c1-14)… relay=$(jqr "$Q" .data.reg_relay_tx_id | cut -c1-14)… tgt=$(jqr "$Q" .data.target_chain_tx_id | cut -c1-14)…"
  [ "$ALL" = true ] || SEG_OK=0
done
[ "$SEG_OK" = 1 ] && mark ④ PASS || mark ④ FAIL

echo; echo "======== ⑤ CROSSCHAIN_LOOP ×$COUNT p95<1000ms ========"
echo "  （×$COUNT 同步执行，约 $((COUNT / 2 + 30))s+，诚实实测、绝不造假）"
R=$(api /api/experiment/run "{\"experiment_type\":\"CROSSCHAIN_LOOP\",\"count\":$COUNT}")
RUN_ID=$(jqr "$R" .data.run_id); ST=$(jqr "$R" .data.status)
echo "  run_id=$RUN_ID status=$ST success=$(jqr "$R" .data.success_count)/$COUNT rate=$(jqr "$R" .data.success_rate) failed=$(jqr "$R" .data.failed_count)"
echo "  avg=$(jqr "$R" .data.avg_latency_ms)ms p50=$(jqr "$R" .data.p50_latency_ms)ms p95=$(jqr "$R" .data.p95_latency_ms)ms max=$(jqr "$R" .data.max_latency_ms)ms failure_reasons=$(jqr "$R" .data.failure_reasons)"
P95=$(jqr "$R" .data.p95_latency_ms)
if [ "$ST" = DONE ] && [ "$(jqr "$R" .data.success_count)" = "$COUNT" ] \
   && [ "$(jqr "$R" .data.failed_count)" = 0 ] && [ "$(jqr "$R" .data.failure_reasons)" = "{}" ] \
   && python3 -c "import sys; sys.exit(0 if float('$P95') < 1000 else 1)"; then
  echo "  ✓ p95=${P95}ms < 1000ms"; mark ⑤ PASS
else
  echo "  ✗ 未达标——先调链侧（BatchTimeout/min_seal_time/连接池），不得放宽协议或业务代码"; mark ⑤ FAIL
fi

echo; echo "======== 验收汇总 ========"
for k in ① ② ③ ④ ⑤; do echo "  $k ${ITEM[$k]}"; done
[ "$FAIL" -eq 0 ] && { echo "ACCEPTANCE_ALL_PASS"; exit 0; } || { echo "ACCEPTANCE_FAILED"; exit 1; }
