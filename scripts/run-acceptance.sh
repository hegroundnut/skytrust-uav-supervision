#!/usr/bin/env bash
# run-acceptance.sh —— docs/real-chain-migration.md §6.5 五项验收一键复核（真实链在线执行）。
#   ① POST /api/chain/status 三链 ONLINE（真实 Health() 探针，非静态配置）
#   ② §4.4 部署 TxID 全部链上可查询（cmc query tx / qscc GetBlockByTxID / console 回执）
#   ③ 13 步跨链闭环业务流 SUCCESS（create→submit→review→issue，任何一跳失败不得 SUCCESS）
#   ④ 两跳四段 TxID 持久化，/api/crosschain/query 可验证
#   ⑤ CROSSCHAIN_LOOP ×$COUNT：成功率 1、p95 < 1000ms（不达标先调链侧，绝不放宽协议）
# 前置：start-chains.sh + start-backend-real.sh 已就绪；jq/python3/curl 可用。
# TxID 常量源：docs/version-matrix.md §5 登记表（v1.0.2 最终版 + fabric commit/冒烟 + fisco 最终部署）。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

COUNT=${COUNT:-100}          # ⑤ 样本数（官方口径 = 100，tc1_test.go:209）
API_TIMEOUT=${API_TIMEOUT:-900}
FAIL=0
declare -A ITEM

api() { curl -s --max-time "$API_TIMEOUT" -X POST "$BACKEND_URL$1" -H 'Content-Type: application/json' -d "$2"; }
jqr() { echo "$1" | jq -r "$2" 2>/dev/null; }
mark() { ITEM[$1]="$2"; [ "$2" = PASS ] || FAIL=1; }

CM_TXIDS=(
  18d60243cccc93c6ca621b7b246fd1846cadca2994a645d786491c1f80b013a6
  18d602446c190c5cca8bc5f2cd5036a3f09cc0402c6d4486878b679bddf4e71b
  18d6024523b4c949ca277fdbfc95d22fc0d31b7c908247918e5a717081cf41e9
  18d60245fd86414aca165a1fd2f1a408c6a40f1dfca243f09254271cf6b195b1
  18d602470e0412eaca47143af577d42b1428925c83054e8ba105e51dc06d64c9
)
FAB_TXIDS=(
  9f59ca68bb8f51fddcd6aa098f90251d6541a2a6b2184fa1cf8ae73e27dc760a
  704ae9119be532d7888d2daae27061714152be33403e1c4fd903be715ba35b5e
)
FISCO_TXID=0x7ab040267bb7b8fba57b503981f2add36fd684716a06bd1ec36ed7dff4c31fd2

echo "======== ① /api/chain/status 三链 ONLINE ========"
R=$(api /api/chain/status '{}')
ONLINE=$(jqr "$R" '[.data.chains[] | select(.=="ONLINE")] | length')
echo "$R" | jq -c '.data.chains' 2>/dev/null || echo "$R"
[ "$ONLINE" = "3" ] && { echo "  ✓ 3/3 ONLINE"; mark ① PASS; } || { echo "  ✗ ONLINE=$ONLINE/3"; mark ① FAIL; }

echo; echo "======== ② §4.4 部署 TxID 链上可查询 ========"
T_OK=1
for tx in "${CM_TXIDS[@]}"; do
  if "$CMC" query tx "$tx" --chain-id "$CM_CHAIN" --sdk-conf-path "$CM_SDK_CONF" \
      --with-rw-set=false --truncate-value=false 2>/dev/null | python3 -c '
import json,sys
raw=sys.stdin.read(); i=raw.find("{")
d=json.loads(raw[i:]) if i>=0 else {}
tx=d.get("transaction",d); res=tx.get("result") or {}; cr=res.get("contract_result") or {}
sys.exit(0 if res.get("code") in (None,0,"SUCCESS") and cr.get("code") in (None,0) else 1)'; then
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
if fisco_console_cmd "getTransactionReceipt $FISCO_TXID" | grep -q 'statusOK.*true'; then
  echo "  ✓ fisco-bcos ${FISCO_TXID:0:18}…（statusOK=true）"
else echo "  ✗ fisco-bcos 回执异常"; T_OK=0; fi
[ "$T_OK" = 1 ] && mark ② PASS || mark ② FAIL

echo; echo "======== ③ 13 步跨链闭环业务流（真实三链） ========"
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
R=$(api /api/pass/issue "{${PASS_JSON}\"mission_id\":\"$MISSION_ID\",\"issuer\":\"FISCO-ADMIN\",\"valid_from\":\"$VFROM\",\"valid_to\":\"$VTO\"}")
CX3=$(jqr "$R" .data.crosschain.cross_tx_id); PID=$(jqr "$R" .data.pass.pass_id)
echo "  pass_id=$PID status=$(jqr "$R" .data.pass.status)  CX3=$CX3  crosschain=$(jqr "$R" .data.crosschain.status)"

S1=$(jqr "$(api /api/crosschain/query "{\"cross_tx_id\":\"$CX1\"}")" .data.status)
S2=$(jqr "$(api /api/crosschain/query "{\"cross_tx_id\":\"$CX2\"}")" .data.status)
S3=$(jqr "$(api /api/crosschain/query "{\"cross_tx_id\":\"$CX3\"}")" .data.status)
if [ "$S1" = SUCCESS ] && [ "$S2" = SUCCESS ] && [ "$S3" = SUCCESS ]; then
  echo "  ✓ 三笔跨链全部 SUCCESS（闭环无跳失败）"; mark ③ PASS
else echo "  ✗ 存在非 SUCCESS：$S1/$S2/$S3"; mark ③ FAIL; fi

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
