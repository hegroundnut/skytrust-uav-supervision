#!/usr/bin/env bash
# demo-showcase.sh —— 三幕展示流程一键实跑器（配套文档 docs/demo-showcase.md）。
#
# 对 :8080 真实链后端顺序执行「幕〇预检 → 幕一 系统一 任务跨域协同 →
# 幕二 系统二 链下可信网络虫洞攻防 → 幕三 系统三 监管密文核查」共 51 次调用，
# 每步原始响应存 $DEMO_OUT（默认 /tmp/skytrust-demo），链式 ID 自动捕获传递。
#
# 用法：
#   ./scripts/demo-showcase.sh                  # 全量三幕
#   BACKEND=http://host:8080 ./scripts/demo-showcase.sh
#
# 注意：
#   - 开头会调用 demo/reset + demo/init：仅清空 20 张业务表并重灌基线数据，
#     真实链上数据不受影响（P6-R6：real 传输层不实现 Resettable）。
#   - 幕二会把 NODE-X/NODE-Y 打入 ISOLATED 残留态；重跑本脚本自带 reset 可清。
#   - 依赖：curl、python3；全程约 10-20 秒（含 7 次跨链闭环，各 ~0.5s）。
set -u
B=${BACKEND:-http://127.0.0.1:8080}
J='Content-Type: application/json'
D=${DEMO_OUT:-/tmp/skytrust-demo}
rm -rf "$D"; mkdir -p "$D"
TS=$(date +%H%M%S)
TOMORROW=$(date -d tomorrow +%F)
FROM=$(date -d '-1 hour' '+%F %T')
TO=$(date -d '+1 hour' '+%F %T')
N=0
LAST=

# jget FILE PATH —— 容错取 JSON 字段（点路径，数字为数组下标；缺失打印空串）
jget() {
  python3 - "$1" "$2" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
cur = d
for k in sys.argv[2].split('.'):
    if isinstance(cur, dict) and k in cur:
        cur = cur[k]
    elif isinstance(cur, list) and k.isdigit() and len(cur) > int(k):
        cur = cur[int(k)]
    else:
        print(''); sys.exit(0)
print(cur if not isinstance(cur, (dict, list)) else json.dumps(cur, ensure_ascii=False))
PY
}
step() { # step <slug> <path> <json>
  N=$((N+1)); LAST=$(printf '%s/%02d-%s.json' "$D" "$N" "$1")
  echo "── [$1] POST $2"
  curl -s -X POST "$B$2" -H "$J" -d "$3" > "$LAST"
  head -c 500 "$LAST"; echo
}
get() { jget "$LAST" "$1"; }

echo "===================== ACT 0 预检"
step chain-status /api/chain/status '{}'
step demo-reset /api/demo/reset '{}'
step demo-init /api/demo/init '{}'

echo "===================== ACT 1 系统一：任务跨域协同"
step operator-list /api/operator/list '{}'
echo "   operators=$(python3 -c "import json;print(len(json.load(open('$LAST'))['data']['records']))")"
step route-list /api/route/list '{}'
echo "   routes=$(python3 -c "import json;print(len(json.load(open('$LAST'))['data']['records']))")"
step uav-register /api/uav/register "{\"manufacturer_id\":\"Manufacturer-B\",\"model\":\"DJI-M350\",\"operator_id\":\"Operator-A\",\"serial_no\":\"SN-DEMO-$TS\",\"uav_id\":\"UAV-DEMO-$TS\"}"
CX_UAV=$(get data.crosschain.cross_tx_id)
echo "   uav.status=$(get data.uav.status) cx=$CX_UAV"
step uav-query /api/uav/query "{\"uav_id\":\"UAV-DEMO-$TS\"}"
echo "   status=$(get data.status) sm9=$(get data.sm9_identity)"
step uav-proof /api/crosschain/query "{\"cross_tx_id\":\"$CX_UAV\"}"
echo "   segments: src=$(get data.source_chain_tx_id) | reg_recv=$(get data.reg_receive_tx_id) | reg_relay=$(get data.reg_relay_tx_id) | target=$(get data.target_chain_tx_id)"
step mission-create-A /api/mission/create "{\"altitude_max\":120,\"altitude_min\":60,\"description\":\"展示幕一：Zone-A 全线巡检（密文落库）\",\"end_time\":\"$TOMORROW 11:00:00\",\"mission_type\":\"POWER_INSPECTION\",\"operator_id\":\"Operator-A\",\"payload_type\":\"CAMERA\",\"route_segments\":[\"R101\",\"R205\",\"R306\"],\"start_time\":\"$TOMORROW 09:00:00\",\"uav_id\":\"UAV-A-001\"}"
MID_A=$(get data.mission_id); echo "   MID_A=$MID_A"
step mission-query-A /api/mission/query "{\"mission_id\":\"$MID_A\"}"
echo "   masked_value=$(get data.masked_value) sm3=$(get data.sm3_hash)"
step mission-submit-A /api/mission/submit "{\"mission_id\":\"$MID_A\",\"operator\":\"Operator-A\"}"
APP_A=$(get data.application.application_id); CX_A=$(get data.crosschain.cross_tx_id)
echo "   APP_A=$APP_A CX_A=$CX_A"
step crosschain-query-A /api/crosschain/query "{\"cross_tx_id\":\"$CX_A\"}"
echo "   status=$(get data.status) segments: $(get data.source_chain_tx_id) → $(get data.reg_receive_tx_id) → $(get data.reg_relay_tx_id) → $(get data.target_chain_tx_id)"
step review-submit-A /api/review/submit "{\"application_id\":\"$APP_A\",\"comment\":\"展示幕一：同意执行\",\"result\":\"APPROVED\",\"reviewer\":\"FISCO-ADMIN\",\"rules_hit\":[\"R-ALT-001\"]}"
echo "   review=$(get data.review.result) cx_status=$(get data.crosschain.status)"
step mission-create-B /api/mission/create "{\"altitude_max\":120,\"altitude_min\":80,\"description\":\"展示幕一：Operator-B 重叠窗口任务\",\"end_time\":\"$TOMORROW 12:00:00\",\"mission_type\":\"POWER_INSPECTION\",\"operator_id\":\"Operator-B\",\"payload_type\":\"CAMERA\",\"route_segments\":[\"R205\"],\"start_time\":\"$TOMORROW 10:00:00\",\"uav_id\":\"UAV-B-001\"}"
MID_B=$(get data.mission_id); echo "   MID_B=$MID_B"
step mission-submit-B /api/mission/submit "{\"mission_id\":\"$MID_B\",\"operator\":\"Operator-B\"}"
APP_B=$(get data.application.application_id); echo "   APP_B=$APP_B"
step conflict-detect-B /api/conflict/detect "{\"mission_id\":\"$MID_B\"}"
CFL=$(get data.conflicts.0.conflict_id)
echo "   conflicts=$(get data.count) first=$CFL type=$(get data.conflicts.0.conflict_type)"
step conflict-resolve /api/conflict/resolve "{\"conflict_id\":\"$CFL\",\"operator\":\"Operator-B\",\"resolution\":\"时间窗后移30分钟\"}"
echo "   conflict.status=$(get data.status)"
step review-submit-B /api/review/submit "{\"application_id\":\"$APP_B\",\"comment\":\"冲突已消解，同意\",\"result\":\"APPROVED\",\"reviewer\":\"FISCO-ADMIN\",\"rules_hit\":[]}"
echo "   review=$(get data.review.result)"
step pass-issue-A /api/pass/issue "{\"issuer\":\"FISCO-ADMIN\",\"mission_id\":\"$MID_A\",\"valid_from\":\"$FROM\",\"valid_to\":\"$TO\"}"
PASS_A=$(get data.pass.pass_id); echo "   PASS_A=$PASS_A status=$(get data.pass.status)"
step pass-verify-A /api/pass/verify "{\"pass_id\":\"$PASS_A\"}"
echo "   valid=$(get data.valid)"
step pass-revoke-A /api/pass/revoke "{\"operator\":\"FISCO-ADMIN\",\"pass_id\":\"$PASS_A\",\"reason\":\"展示幕一：任务结束\"}"
echo "   status=$(get data.pass.status)"
step pass-verify-revoked /api/pass/verify "{\"pass_id\":\"$PASS_A\"}"
echo "   valid=$(get data.valid) reasons=$(get data.reasons)"
step crosschain-list /api/crosschain/list '{}'
echo "   records=$(python3 -c "import json;rs=json.load(open('$LAST'))['data']['records'];print(len(rs),'success',sum(1 for r in rs if r['status']=='SUCCESS'))")"

echo "===================== ACT 2 系统二：链下可信网络（虫洞攻防）"
step node-register-1 /api/node/register "{\"node_id\":\"N-DEMO-$TS-1\",\"node_type\":\"EDGE\",\"position\":{\"X\":12,\"Y\":34}}"
echo "   node=$(get data.node_id) sm9=$(get data.sm9_identity)"
step node-register-2 /api/node/register "{\"node_id\":\"N-DEMO-$TS-2\",\"node_type\":\"MANAGEMENT\",\"position\":{\"X\":50,\"Y\":60}}"
echo "   node=$(get data.node_id) type=$(get data.node_type)"
step topology-before /api/topology/get '{}'
echo "   nodes=$(python3 -c "import json;print(len(json.load(open('$LAST'))['data']['nodes']))") edges=$(python3 -c "import json;print(len(json.load(open('$LAST'))['data']['edges']))")"
step session-open /api/session/open '{"uav_id":"UAV-A-001"}'
S1=$(get data.session.session_id); echo "   S1=$S1 path=$(get data.path)"
step message-send-1 /api/message/send "{\"msg_type\":\"POSITION_UPDATE\",\"session_id\":\"$S1\",\"source_node\":\"UAV-A-001-NODE\",\"target_node\":\"MGR\"}"
echo "   seq=$(get data.message.seq) sm3=$(get data.message.sm3_hash) latency=$(get data.message.latency_ms)ms"
step message-send-2 /api/message/send "{\"msg_type\":\"ROUTE_STATUS\",\"session_id\":\"$S1\",\"source_node\":\"UAV-A-001-NODE\",\"target_node\":\"MGR\"}"
echo "   seq=$(get data.message.seq) status=$(get data.message.status)"
step message-list /api/message/list "{\"session_id\":\"$S1\"}"
echo "   msgs=$(python3 -c "import json;print(len(json.load(open('$LAST'))['data']['records']))")"
step wormhole-on /api/wormhole/toggle '{"enabled":true,"operator":"ATTACKER-SIM"}'
echo "   enabled=$(get data.wormhole_enabled) affected=$(get data.nodes_affected)"
step topology-attack /api/topology/get '{}'
echo "   edges_now=$(python3 -c "import json;print(len(json.load(open('$LAST'))['data']['edges']))")"
step message-under-attack /api/message/send "{\"msg_type\":\"POSITION_UPDATE\",\"session_id\":\"$S1\",\"source_node\":\"UAV-A-001-NODE\",\"target_node\":\"MGR\"}"
echo "   seq=$(get data.message.seq) latency=$(get data.message.latency_ms)ms"
step risk-evaluate /api/risk/evaluate "{\"session_id\":\"$S1\"}"
echo "   risk_score=$(get data.risk_score) threshold=$(get data.threshold) verdict=$(get data.verdict) dims=$(get data.dimensions)"
step event-list /api/event/list "{\"session_id\":\"$S1\"}"
echo "   events=$(python3 -c "import json;print([r['action'] for r in json.load(open('$LAST'))['data']['records']])")"
step path-switch /api/path/switch "{\"operator\":\"OP-1\",\"session_id\":\"$S1\"}"
echo "   session.status=$(get data.session.status) original=$(get data.original_path) new=$(get data.new_path) recovery_ms=$(get data.recovery_latency_ms)"
step message-after-recovery /api/message/send "{\"msg_type\":\"ROUTE_STATUS\",\"session_id\":\"$S1\",\"source_node\":\"UAV-A-001-NODE\",\"target_node\":\"MGR\"}"
echo "   seq=$(get data.message.seq) latency=$(get data.message.latency_ms)ms"
step wormhole-off /api/wormhole/toggle '{"enabled":false,"operator":"ATTACKER-SIM"}'
echo "   enabled=$(get data.wormhole_enabled)"
step experiment-defense /api/experiment/run '{"count":3,"experiment_type":"MESSAGE_FLOW","scenario":"DEFENSE"}'
echo "   run=$(get data.run_id) rate=$(get data.success_rate) p95=$(get data.p95_latency_ms)"

echo "===================== ACT 3 系统三：监管密文核查"
step alert-raise /api/alert/raise "{\"alert_id\":\"ALERT-DEMO-$TS\",\"event_type\":\"ROUTE_DEVIATION\",\"mission_id\":\"$MID_A\",\"operator\":\"REG-01\",\"risk_level\":\"HIGH\",\"source_system\":\"MANUAL\",\"uav_pseudonym\":\"PSEUDO-UAV-83921\"}"
echo "   alert=$(get data.alert_id) status=$(get data.status)"
step alert-status /api/alert/status "{\"alert_id\":\"ALERT-DEMO-$TS\",\"operator\":\"REG-01\",\"reason\":\"初判成立\",\"to_status\":\"IDENTIFIED\"}"
echo "   status=$(get data.status)"
step trace-identity /api/trace/identity "{\"alert_id\":\"ALERT-DEMO-$TS\",\"operator\":\"REG-01\"}"
echo "   levels=$(python3 -c "import json;print(len(json.load(open('$LAST'))['data']['levels']))") resolved=$(get data.resolved) break=$(get data.break_level) L7=$(get data.levels.6.name)=$(get data.levels.6.value)"
step inspect-unauthorized /api/inspect/ciphertext "{\"mission_id\":\"$MID_A\",\"regulator_id\":\"REG-02\"}"
echo "   code=$(get code) message=$(get message)"
step authorize-apply /api/authorize/apply "{\"authorization_id\":\"AUTH-DEMO-$TS\",\"reason\":\"核查告警 ALERT-DEMO-$TS\",\"regulator_id\":\"REG-01\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\"target_id\":\"$MID_A\",\"target_type\":\"MISSION\"}"
echo "   auth=$(get data.authorization_id) status=$(get data.status)"
step authorize-review /api/authorize/review "{\"authorization_id\":\"AUTH-DEMO-$TS\",\"comment\":\"同意\",\"decision\":\"APPROVE\",\"reviewer_id\":\"REG-ADMIN\"}"
echo "   status=$(get data.auth.status) chain_tx=$(get data.chain_tx_id)"
step inspect-authorized /api/inspect/ciphertext "{\"authorization_id\":\"AUTH-DEMO-$TS\",\"mission_id\":\"$MID_A\",\"payload_type\":\"CAMERA\",\"regulator_id\":\"REG-01\",\"trajectory\":\"NORMAL\"}"
echo "   conclusion=$(get data.conclusion) verify=$(get data.verification) chain_tx=$(get data.chain_tx_id) audit=$(get data.reg_audit_id)"
step inspect-deviated /api/inspect/ciphertext "{\"authorization_id\":\"AUTH-DEMO-$TS\",\"mission_id\":\"$MID_A\",\"payload_type\":\"CAMERA\",\"regulator_id\":\"REG-01\",\"trajectory\":\"DEVIATION\"}"
echo "   conclusion=$(get data.conclusion) verify=$(get data.verification)"
step audit-list /api/regulatory/audit/list '{"action":"INSPECT"}'
echo "   records=$(python3 -c "import json;print(len(json.load(open('$LAST'))['data']['records']))") total=$(get data.total)"
step audit-export /api/regulatory/audit/export '{}'
echo "   csv_lines=$(get data.content | wc -l) header=$(get data.content | head -1 | head -c 100)"
step dashboard /api/dashboard/summary '{}'
step chain-status-final /api/chain/status '{}'
echo "DEMO_RUN_DONE TS=$TS MID_A=$MID_A MID_B=$MID_B PASS_A=$PASS_A S1=$S1"
