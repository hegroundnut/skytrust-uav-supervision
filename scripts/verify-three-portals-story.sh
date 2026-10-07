#!/usr/bin/env bash
# verify-three-portals-story.sh —— 三端验收故事 API 层一键实跑（计划 B Task 15）
#
# 干什么：在**隔离仿真环境**里起一个专属后端（:18080，DB/SM9 密钥全在 /tmp）+ 前端代理
# （:18090），按 docs/demo-script.md 第 0-8 章的 API 等价操作逐章 curl 断言（含全部
# 设计内拒绝回归：3004/4001/5001/5002/4002/1004），附带前端产物存在性门 + 全量
# node --check 语法门 + 三端 HTML 经代理可达性检查，最后打印 DEFERRED-HUMAN 人工清单。
#
# 生产红线（Global Constraints #11）：本脚本硬编码拒绝 :8080/:8090；绝不读写
# services/skytrust-backend/data/ 生产 DB 与密钥；绝不向生产实例发任何请求。
#
# 用法：./scripts/verify-three-portals-story.sh            # 跑完自动清理 /tmp 现场
#       KEEP_SIM=1 ./scripts/verify-three-portals-story.sh # 保留现场（含 backend.log）
#       BACK_PORT=18180 FRONT_PORT=18190 ./scripts/...     # 端口冲突时换口
# 依赖：go(/usr/local/go/bin) curl jq node python3；首跑含 go build 约 3-6 分钟。
# 退出码：0 = ALL_GREEN；1 = 存在 FAIL（明细见 ✗ 行）。
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACK_PORT="${BACK_PORT:-18080}"
FRONT_PORT="${FRONT_PORT:-18090}"
SIM_DIR="${SIM_DIR:-/tmp/skytrust-verify-$$}"
BACKEND="http://127.0.0.1:${BACK_PORT}"
FRONTEND="http://127.0.0.1:${FRONT_PORT}"
export PATH="/usr/local/go/bin:$PATH"
export GOPROXY="${GOPROXY:-https://goproxy.cn,direct}"

# ---------- 生产红线自检 ----------
if [ "$BACK_PORT" = "8080" ] || [ "$FRONT_PORT" = "8090" ]; then
  echo "FAIL: 生产进程红线——禁止把本脚本指向 :8080/:8090"; exit 1
fi
for dep in curl jq node python3 go; do
  command -v "$dep" >/dev/null 2>&1 || { echo "FAIL: 缺依赖 $dep"; exit 1; }
done
for p in "$BACK_PORT" "$FRONT_PORT"; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then
    echo "FAIL: 端口 $p 已被占用（换口：BACK_PORT=/FRONT_PORT=）"; exit 1
  fi
done

# ---------- 断言原语 ----------
PASS_N=0; FAIL_N=0; LAST_RESP=''; LAST_CODE='ERR'
ok(){ PASS_N=$((PASS_N+1)); printf '  ✓ %s\n' "$1"; }
bad(){ FAIL_N=$((FAIL_N+1)); printf '  ✗ FAIL: %s\n' "$1"; }
chapter(){ printf '\n══ %s ══\n' "$1"; }
assert_eq(){ if [ "$1" = "$2" ]; then ok "$3（= $2）"; else bad "$3：期望 [$2] 实际 [$1]"; fi; }
assert_ne(){ if [ "$1" != "$2" ]; then ok "$3"; else bad "$3：不应为 [$2]"; fi; }
assert_ge(){ if awk -v a="$1" -v b="$2" 'BEGIN{exit !(a+0>=b+0)}'; then ok "$3（$1 ≥ $2）"; else bad "$3：$1 < $2"; fi; }
assert_lt(){ if awk -v a="$1" -v b="$2" 'BEGIN{exit !(a+0<b+0)}'; then ok "$3（$1 < $2）"; else bad "$3：$1 ≥ $2"; fi; }
assert_contains(){ case "$1" in *"$2"*) ok "$3（含「$2」）";; *) bad "$3：未找到「$2」";; esac; }
assert_not_contains(){ case "$1" in *"$2"*) bad "$3：不应含「$2」但出现了";; *) ok "$3（不含「$2」）";; esac; }
api(){ # api <子路径> <JSON 体> → LAST_RESP / LAST_CODE
  LAST_RESP=$(curl -sS -m 30 -X POST "$BACKEND/api/$1" -H 'Content-Type: application/json' -d "$2" 2>/dev/null)
  LAST_CODE=$(printf '%s' "$LAST_RESP" | jq -r '.code // "ERR"' 2>/dev/null); [ -n "$LAST_CODE" ] || LAST_CODE=ERR
}
jqr(){ printf '%s' "$LAST_RESP" | jq -r "$1" 2>/dev/null; }
expect_code(){ assert_eq "$LAST_CODE" "$1" "$2 → code"; }
stime(){ TZ=Asia/Shanghai date -d "$1" '+%Y-%m-%d %H:%M:%S'; }   # 相对时间窗（demo-script 附录 A 守则）

# ---------- 剧情固定值（= docs/demo-script.md 速查表，改动须两处同步） ----------
UAV_MED=UAV-MED-01; PASS_MED=PASS-2026-001; ALERT=ALERT-2026-001; AUTHZ=AUTH-2026-001
PSEUDO_KNOWN=PSEUDO-UAV-83921; PSEUDO_UNKNOWN=PSEUDO-UNKNOWN-999
DESC='特殊血样（RH 阴性）紧急运输，全程冷链箱专用，市一医院直达血液中心'

# ---------- 隔离环境起停 ----------
mkdir -p "$SIM_DIR"
cleanup(){
  [ -n "${BACK_PID:-}" ] && kill "$BACK_PID" 2>/dev/null
  [ -n "${FRONT_PID:-}" ] && kill "$FRONT_PID" 2>/dev/null
  if [ "${KEEP_SIM:-0}" = "1" ] || [ "$FAIL_N" -gt 0 ]; then
    echo "现场保留：$SIM_DIR（backend.log / frontend.log）"
  else
    rm -rf "$SIM_DIR"
  fi
}
trap cleanup EXIT

chapter "环境准备：隔离 sim 后端 :$BACK_PORT（DB/密钥 → $SIM_DIR）"
(cd "$ROOT/services/skytrust-backend" && go build -o "$SIM_DIR/skytrust-sim" ./cmd/server) \
  || { echo "FAIL: go build 失败"; exit 1; }
ok "go build ./cmd/server（hermetic sim 构建）"
SERVER_ADDR=":$BACK_PORT" DB_PATH="$SIM_DIR/sim.db" SM9_KEY_DIR="$SIM_DIR/sm9" CHAIN_MODE=sim \
  OFFCHAIN_AUTOPILOT_MS=2000 TELEMETRY_AUTOPILOT_MS=2000 \
  "$SIM_DIR/skytrust-sim" >"$SIM_DIR/backend.log" 2>&1 &
BACK_PID=$!
UP=0
for _ in $(seq 1 60); do
  r=$(curl -sS -m 2 -X POST "$BACKEND/api/health/ping" -H 'Content-Type: application/json' -d '{}' 2>/dev/null)
  [ "$(printf '%s' "$r" | jq -r '.code // empty' 2>/dev/null)" = "0" ] && { UP=1; break; }
  sleep 1
done
assert_eq "$UP" "1" "隔离后端 60s 内就绪（health/ping）"
PORT="$FRONT_PORT" BACKEND="$BACKEND" python3 "$ROOT/scripts/serve-frontend.py" >"$SIM_DIR/frontend.log" 2>&1 &
FRONT_PID=$!
sleep 2

chapter "前端产物门：文件存在性 + node --check + 三端 HTML 经代理可达"
MISS=0
for f in \
  frontend/operator.html frontend/authority.html frontend/regulator.html frontend/index.html \
  frontend/css/drone.css frontend/css/theme-op.css frontend/css/theme-au.css frontend/css/theme-rg.css \
  frontend/js/api.js frontend/js/store.js frontend/js/portal.js frontend/js/map.js \
  frontend/js/shell-op.js frontend/js/shell-au.js frontend/js/shell-rg.js \
  frontend/js/data/geo.js frontend/js/data/explain.js frontend/js/data/endpoints.js \
  frontend/vendor/leaflet/leaflet.js frontend/vendor/leaflet/leaflet.css frontend/vendor/qrcode/qrcode.js \
  frontend/js/pages/op/home.js frontend/js/pages/op/realname.js frontend/js/pages/op/aircraft.js \
  frontend/js/pages/op/flight.js frontend/js/pages/op/license.js frontend/js/pages/op/ops.js \
  frontend/js/pages/op/airspace.js \
  frontend/js/pages/au/queue.js frontend/js/pages/au/passes.js frontend/js/pages/au/records.js \
  frontend/js/pages/au/registry.js frontend/js/pages/au/masterdata.js frontend/js/pages/au/netsec.js \
  frontend/js/pages/rg/cockpit.js frontend/js/pages/rg/alerts.js frontend/js/pages/rg/trace.js \
  frontend/js/pages/rg/authz.js frontend/js/pages/rg/inspect.js frontend/js/pages/rg/audit.js \
  frontend/js/pages/rg/crypto.js \
  docs/demo-script.md ; do
  [ -f "$ROOT/$f" ] || { bad "缺文件 $f"; MISS=1; }
done
[ "$MISS" = "0" ] && ok "三端全部产物文件存在（4 HTML + 4 CSS + 共享底座 + vendor + 20 页 + demo-script）"
JSFAIL=0
while IFS= read -r f; do
  node --check "$f" >/dev/null 2>&1 || { bad "node --check $f"; JSFAIL=1; }
done < <(find "$ROOT/frontend/js" -name '*.js' -type f | sort)
[ "$JSFAIL" = "0" ] && ok "frontend/js 全部 JS node --check 通过"
for p in operator authority regulator index; do
  hc=$(curl -sS -m 5 -o "$SIM_DIR/$p.html" -w '%{http_code}' "$FRONTEND/$p.html" 2>/dev/null)
  assert_eq "$hc" "200" "GET :$FRONT_PORT/$p.html"
done
grep -q 'shell-op.js' "$SIM_DIR/operator.html" && ok "operator.html 引用 shell-op.js" || bad "operator.html 未引用 shell-op.js"
grep -q 'shell-au.js' "$SIM_DIR/authority.html" && ok "authority.html 引用 shell-au.js" || bad "authority.html 未引用 shell-au.js"
grep -q 'shell-rg.js' "$SIM_DIR/regulator.html" && ok "regulator.html 引用 shell-rg.js" || bad "regulator.html 未引用 shell-rg.js"
api_via_proxy=$(curl -sS -m 5 -X POST "$FRONTEND/api/health/ping" -H 'Content-Type: application/json' -d '{}' 2>/dev/null | jq -r '.code // "ERR"')
assert_eq "$api_via_proxy" "0" "代理链路 :$FRONT_PORT/api/* → :$BACK_PORT"

chapter "第 0 章 · 开场整备（demo/reset + demo/init + 三链 + 种子计数）"
api demo/reset '{}'; expect_code 0 "demo/reset"
api demo/init '{}';  expect_code 0 "demo/init"
api chain/status '{}'; expect_code 0 "chain/status"
for k in chainmaker fabric fisco-bcos; do
  assert_eq "$(jqr ".data.chains[\"$k\"]")" "ONLINE" "链 $k 状态"
done
api manufacturer/list '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "3" "种子厂商数"
api operator/list     '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "3" "种子运营商数"
api uav/list          '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "7" "种子航空器数"
api route/list        '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "5" "种子航段数"
api node/list         '{"page":1,"page_size":200}'; assert_eq "$(jqr '.data.total')" "8" "种子节点数"

chapter "第 1 章 · 建档（主数据 + 走廊 + 实名 + 执照 + 验签 + 航空器注册即核验）"
api operator/register '{"operator_id":"Operator-MED","name":"紧急医疗运输运营商","contact":"","chain_org_id":""}'
expect_code 0 "operator/register Operator-MED"
api manufacturer/register '{"manufacturer_id":"Manufacturer-MED","name":"医疗航空装备厂商","adapter_type":""}'
expect_code 0 "manufacturer/register Manufacturer-MED"
api route/create '{"route_id":"R-MED-01","zone":"Zone-M","start_point":"S9(30.510,114.310)","end_point":"MED-CENTER(30.590,114.390)","altitude_min":60,"altitude_max":120,"start_lat":30.510,"start_lon":114.310,"end_lat":30.590,"end_lon":114.390}'
expect_code 0 "route/create R-MED-01（显式四坐标）"
assert_eq "$(jqr '.data.route_id')" "R-MED-01" "回执航段号"
api realname/register '{"subject_type":"ENTERPRISE","name":"紧急医疗运输企业","id_number":"91420100MED0001X","contact":"027-88880002"}'
expect_code 0 "realname/register（模拟证件号）"
RNS=$(jqr '.data.subject.subject_id // empty')
case "$RNS" in RNS-*) ok "主体号 RNS- 前缀（$RNS）";; *) bad "主体号前缀异常：$RNS";; esac
api pilot/apply '{"name":"医疗运输操控员","id_number":"420100199203054321","category":"垂直起降"}'
expect_code 0 "pilot/apply 即申即发"
assert_eq "$(jqr '.data.license.status')" "ISSUED" "执照状态"
LIC_ID=$(jqr '.data.license.license_id // empty')
case "$(jqr '.data.license.license_no')" in UAV-PILOT-2026-*) ok "执照编号 UAV-PILOT-2026- 前缀";; *) bad "执照编号异常";; esac
SIGN_PAYLOAD=$(printf '%s' "$LAST_RESP" | jq -c '{sm9_identity:"SM9-ID-FISCO-ADMIN", payload:{license_id:.data.license.license_id, license_no:.data.license.license_no, name:.data.license.name, id_number:.data.license.id_number, category:.data.license.category, issued_at:.data.license.issued_at, expires_at:.data.license.expires_at}, signature:.data.license.signature}')
api crypto/sm9/verify "$SIGN_PAYLOAD"
expect_code 0 "crypto/sm9/verify（pilotCanonical 七键）"
assert_eq "$(jqr '.data.valid')" "true" "局方签名验签 valid"
api uav/register "{\"uav_id\":\"$UAV_MED\",\"manufacturer_id\":\"Manufacturer-MED\",\"operator_id\":\"Operator-MED\",\"model\":\"DJI-M350-RTK\",\"serial_no\":\"SN-MED-001\",\"realname_id\":\"$RNS\"}"
expect_code 0 "uav/register UAV-MED-01（显式 ID）"
assert_eq "$(jqr '.data.uav.status')" "VERIFIED" "注册即核验（无 VERIFY 步）"
case "$(jqr '.data.uav.registration_mark')" in UAS-*) ok "登记标志 UAS- 前缀";; *) bad "登记标志异常";; esac
assert_eq "$(jqr '.data.crosschain.status')" "SUCCESS" "UAV_REGISTER_PROOF 跨链"
for f in source_chain_tx_id reg_receive_tx_id reg_relay_tx_id target_chain_tx_id; do
  assert_ne "$(jqr ".data.crosschain.$f // empty")" "" "四段 TxID $f"
done

chapter "第 2 章 · 任务申请（医疗任务 + B 任务 + 冲突检出/消解 + 3004 防重放）"
T1=$(stime '+1 hour'); T4=$(stime '+4 hours')
api mission/create "{\"operator_id\":\"Operator-MED\",\"uav_id\":\"$UAV_MED\",\"mission_type\":\"MEDICAL\",\"payload_type\":\"MEDICAL_KIT\",\"route_segments\":[\"R-MED-01\"],\"altitude_min\":60,\"altitude_max\":120,\"start_time\":\"$T1\",\"end_time\":\"$T4\",\"pilot_license_id\":\"$LIC_ID\",\"description\":\"$DESC\"}"
expect_code 0 "mission/create 医疗任务（相对时窗 +1h~+4h）"
MED=$(jqr '.data.mission_id // empty')
assert_ne "$MED" "" "医疗任务号生成"
api mission/query "{\"mission_id\":\"$MED\"}"
expect_code 0 "mission/query"
assert_not_contains "$LAST_RESP" "特殊血样（RH 阴性）" "查询响应无明文（金丝雀取 >4 字明文子串——C19 脱敏合法保留前 4 字「特殊血样****」，mission.go:60-65）"
api mission/submit "{\"mission_id\":\"$MED\",\"operator\":\"Operator-MED\"}"
expect_code 0 "mission/submit 医疗任务跨域（operator=归属运营方——mission.go:307 归属校验，角色常量必 1001）"
assert_eq "$(jqr '.data.crosschain.status')" "SUCCESS" "MISSION_APPLICATION 跨链"
APP_MED=$(jqr '.data.application.application_id // empty')
assert_ne "$APP_MED" "" "医疗申请号生成（APP-——review/submit 的键是申请号非任务号，review.go:43）"
api mission/create "{\"operator_id\":\"Operator-B\",\"uav_id\":\"UAV-B-001\",\"mission_type\":\"CARGO\",\"payload_type\":\"CAMERA\",\"route_segments\":[\"R-MED-01\"],\"altitude_min\":80,\"altitude_max\":120,\"start_time\":\"$T1\",\"end_time\":\"$T4\",\"description\":\"常规走廊物流运输\"}"
expect_code 0 "mission/create B 任务（同走廊/高度交叉/时窗重叠）"
BMIS=$(jqr '.data.mission_id // empty')
assert_ne "$BMIS" "" "B 任务号生成"
api mission/submit "{\"mission_id\":\"$BMIS\",\"operator\":\"Operator-B\"}"
expect_code 0 "mission/submit B 任务跨域"
APP_B=$(jqr '.data.application.application_id // empty')
assert_ne "$APP_B" "" "B 申请号生成（APP-）"
api conflict/detect "{\"mission_id\":\"$MED\"}"
expect_code 0 "conflict/detect"
assert_ge "$(jqr '.data.count')" "1" "冲突命中数"
CFL=$(jqr '.data.conflicts[0].conflict_id // empty')
assert_ne "$CFL" "" "冲突 ID 生成"
assert_contains "$(jqr '.data.conflicts[0] | tostring')" "$BMIS" "冲突任务对含 B 任务"
api conflict/resolve "{\"conflict_id\":\"$CFL\",\"resolution\":\"时间窗后移 30 分钟\",\"operator\":\"Operator-B\"}"
expect_code 0 "conflict/resolve 提交消解（mission_id 留空=双方 COORDINATING→REVIEWING，conflict.go:132-133）"
api mission/query "{\"mission_id\":\"$MED\"}"
assert_eq "$(jqr '.data.status')" "REVIEWING" "医疗任务同回 REVIEWING（双方释放——若单放 B 则医疗滞留 COORDINATING，第 3 章审核必 3004）"
api conflict/resolve "{\"conflict_id\":\"$CFL\",\"resolution\":\"时间窗后移 30 分钟\",\"operator\":\"Operator-B\"}"
expect_code 3004 "重复消解（设计内拒绝·附录 B——非 OPEN 守卫先于 targets 逻辑，conflict.go:146-147）"

chapter "第 3 章 · 审核与许可（双 APPROVED + 显式 PASS-2026-001 签发 + 验证绿灯）"
api review/submit "{\"application_id\":\"$APP_MED\",\"result\":\"APPROVED\",\"reviewer\":\"Manager-A\",\"comment\":\"剧情相符，走廊可用，同意跨域执行\",\"rules_hit\":[]}"
expect_code 0 "review/submit 医疗任务裁决"
assert_eq "$(jqr '.data.mission.status')" "APPROVED" "医疗任务状态"
assert_eq "$(jqr '.data.crosschain.status')" "SUCCESS" "MISSION_REVIEW_RESULT 跨链回传"
api review/submit "{\"application_id\":\"$APP_B\",\"result\":\"APPROVED\",\"reviewer\":\"Manager-A\",\"comment\":\"时间窗已后移，同意\",\"rules_hit\":[]}"
expect_code 0 "review/submit B 任务裁决"
assert_eq "$(jqr '.data.mission.status')" "APPROVED" "B 任务状态"
TM1=$(stime '-1 hour')
api pass/issue "{\"mission_id\":\"$MED\",\"issuer\":\"FISCO-ADMIN\",\"pass_id\":\"$PASS_MED\",\"valid_from\":\"$TM1\",\"valid_to\":\"$T4\"}"
expect_code 0 "pass/issue（显式许可号 + 相对窗 −1h~+4h）"
assert_eq "$(jqr '.data.pass.pass_id')" "$PASS_MED" "许可号"
assert_eq "$(jqr '.data.crosschain.status')" "SUCCESS" "FLIGHT_PASS 跨链"
api pass/verify "{\"pass_id\":\"$PASS_MED\"}"
expect_code 0 "pass/verify（铁律：存在的许可恒 code=0）"
assert_eq "$(jqr '.data.valid')" "true" "签发后验证绿灯"

chapter "第 4 章 · 起飞（接入点注册 + 起飞报备 + SIM 遥测自动驾驶）"
api node/register "{\"node_id\":\"$UAV_MED-NODE\",\"node_type\":\"UAV\",\"position\":{\"X\":0,\"Y\":0},\"neighbors\":[\"N1\"],\"lat\":30.510,\"lon\":114.310}"
expect_code 0 "node/register $UAV_MED-NODE（session/open 前置）"
assert_eq "$(jqr '.data.status')" "ONLINE" "节点状态"
api session/open "{\"uav_id\":\"$UAV_MED\",\"mission_id\":\"$MED\",\"pass_id\":\"$PASS_MED\"}"
expect_code 0 "session/open 起飞报备（关联任务+许可）"
SESS=$(jqr '.data.session.session_id // empty')
assert_ne "$SESS" "" "会话号生成"
assert_eq "$(jqr '.data.session.status')" "ACTIVE" "会话状态"
assert_eq "$(jqr '.data.auth.verified')" "true" "SM9 挑战-应答"
assert_eq "$(jqr '.data.path | length')" "6" "初始可信路径节点数"
assert_contains "$(jqr '.data.path | join(",")')" "$UAV_MED-NODE" "路径含接入点"
TL=0
for _ in $(seq 1 12); do
  api telemetry/latest "{\"uav_id\":\"$UAV_MED\"}"
  [ -n "$(jqr '.data.telemetry.seq // empty')" ] && { TL=1; break; }
  sleep 2
done
assert_eq "$TL" "1" "SIM 遥测 24s 内出现（自动驾驶沿 R-MED-01 走廊）"
assert_eq "$(jqr '.data.telemetry.source')" "SIM" "遥测来源"
assert_ge "$(jqr '.data.telemetry.seq')" "1" "遥测 seq"

chapter "第 5 章 · 攻防（开洞诱入 → DETECT/DEGRADED → 遥测停摆 → 恢复 → 4001 残留）"
api topology/get '{}'
assert_eq "$(jqr '.data.edges | length')" "6" "开洞前网络边（种子 5 + 第 4 章注册 UAV-MED-01-NODE 增 1——netsec 统计卡为原始 edges.length）"
api wormhole/toggle '{"enabled":true,"operator":"SecOps"}'
expect_code 0 "wormhole/toggle 开启"
assert_eq "$(jqr '.data.wormhole_enabled')" "true" "虫洞开启中"
assert_eq "$(jqr '.data.nodes_affected | length')" "4" "受影响节点数"
api topology/get '{}'
assert_eq "$(jqr '.data.edges | length')" "9" "开洞后网络边 6→9（+N1↔X、X↔Y、Y↔N4 三条虫洞边，wormhole.go:102-111）"
api message/send "{\"session_id\":\"$SESS\",\"msg_type\":\"POSITION_UPDATE\",\"source_node\":\"$UAV_MED-NODE\",\"target_node\":\"MGR\"}"
expect_code 0 "message/send 诱入消息"
assert_contains "$(jqr '.data.message.path | tostring')" "NODE-X" "消息被诱入隧道（path 含 NODE-X）"
assert_lt "$(jqr '.data.message.latency_ms')" "35" "隧道时延低于地理下限 35.36ms（快得反常）"
api risk/evaluate "{\"session_id\":\"$SESS\"}"
expect_code 0 "risk/evaluate"
assert_eq "$(jqr '.data.verdict')" "DETECT" "裁定 DETECT"
assert_ge "$(jqr '.data.risk_score')" "0.7" "风险分 ≥ 阈值"
assert_eq "$(jqr '.data.session_status')" "DEGRADED" "会话降级"
assert_ge "$(jqr '.data.events | length')" "2" "联动事件（DETECT+ISOLATE）"
api telemetry/latest "{\"uav_id\":\"$UAV_MED\"}"; SEQ1=$(jqr '.data.telemetry.seq // 0')   # 降级后取样，杜绝 2s tick 竞态
sleep 6
api telemetry/latest "{\"uav_id\":\"$UAV_MED\"}"; SEQ2=$(jqr '.data.telemetry.seq // 0')
assert_ge "$SEQ1" "1" "停摆断言非空洞前提（降级前已有真实遥测——杜绝 0==0 假绿）"
assert_eq "$SEQ2" "$SEQ1" "DEGRADED 期间遥测停摆（seq 冻结——跨端停摆机制）"
api path/switch "{\"session_id\":\"$SESS\",\"operator\":\"SecOps\"}"
expect_code 0 "path/switch 自动重算"
assert_eq "$(jqr '.data.session.status')" "RECOVERED" "会话 RECOVERED"
assert_not_contains "$(jqr '.data.new_path | tostring')" "NODE-X" "新路径排除隔离节点"
api message/send "{\"session_id\":\"$SESS\",\"msg_type\":\"POSITION_UPDATE\",\"source_node\":\"$UAV_MED-NODE\",\"target_node\":\"MGR\"}"
expect_code 0 "message/send 确认消息（干净路径）"
assert_not_contains "$(jqr '.data.message.path | tostring')" "NODE-X" "确认消息不入隧道"
api session/list '{"page":1,"page_size":50}'
assert_eq "$(jqr ".data.records[] | select(.session_id==\"$SESS\") | .status")" "ACTIVE" "消息流通后会话自动回归 ACTIVE"
TL2=0
for _ in $(seq 1 8); do
  api telemetry/latest "{\"uav_id\":\"$UAV_MED\"}"
  awk -v a="$(jqr '.data.telemetry.seq // 0')" -v b="$SEQ2" 'BEGIN{exit !(a+0>b+0)}' && { TL2=1; break; }
  sleep 2
done
assert_eq "$TL2" "1" "ACTIVE 回归后遥测恢复增长（无人机复飞）"
api wormhole/toggle '{"enabled":true,"operator":"SecOps"}'
expect_code 4001 "隔离后重开虫洞（设计内拒绝·附录 B）"

chapter "第 6 章 · 追踪（告警登记 + 全链可溯 + 5001 断链红线 + 状态机推进）"
api event/list '{"action":"DETECT","page":1,"page_size":10}'
EV=$(jqr '.data.records[0].event_id // empty')
api alert/raise "{\"uav_pseudonym\":\"$PSEUDO_KNOWN\",\"event_type\":\"WORMHOLE_ALERT\",\"risk_level\":\"HIGH\",\"source_system\":\"SYSTEM2\",\"operator\":\"REG-01\",\"alert_id\":\"$ALERT\",\"mission_id\":\"$MED\",\"wormhole_event_id\":\"$EV\"}"
expect_code 0 "alert/raise（显式告警号）"
assert_eq "$(jqr '.data.alert_id')" "$ALERT" "告警号"
assert_eq "$(jqr '.data.status')" "OPEN" "告警初始状态"
api trace/identity "{\"operator\":\"REG-01\",\"alert_id\":\"$ALERT\"}"
expect_code 0 "trace/identity 告警入口"
assert_eq "$(jqr '.data.resolved')" "true" "全链可溯 resolved"
assert_eq "$(jqr '.data.break_level')" "0" "break_level=0"
assert_eq "$(jqr '.data.levels | length')" "7" "七级时间线"
assert_contains "$(jqr '.data.levels | tostring')" "$PASS_MED" "L3 命中第 3 章显式签发的许可"
api trace/identity "{\"operator\":\"REG-01\",\"pseudo\":\"$PSEUDO_UNKNOWN\"}"
expect_code 5001 "追踪未登记伪名（断链红线·附录 B）"
assert_contains "$(jqr '.data.levels | tostring')" "skipped: break at level 1" "L2-7 skipped 不拼造"
for st in IDENTIFIED TRACED REVIEWED RESOLVED; do
  api alert/status "{\"alert_id\":\"$ALERT\",\"to_status\":\"$st\",\"operator\":\"REG-01\",\"reason\":\"验收推进：$st\"}"
  expect_code 0 "alert/status → $st"
  assert_eq "$(jqr '.data.status')" "$st" "推进后状态"
done

chapter "第 7 章 · 授权开箱（AUTH-2026-001 + 5002 封缄 + 开箱明文 + 篡改闭环）"
api authorize/apply "{\"regulator_id\":\"REG-01\",\"scope\":[\"MISSION\",\"ROUTE\",\"PAYLOAD\",\"IDENTITY\"],\"target_type\":\"MISSION\",\"target_id\":\"$MED\",\"authorization_id\":\"$AUTHZ\",\"reason\":\"虫洞告警排查：需核对医疗任务申报与载荷一致性\",\"valid_from\":\"$TM1\",\"valid_to\":\"$T4\"}"
expect_code 0 "authorize/apply（显式授权号 + 四项 scope + 相对窗）"
assert_eq "$(jqr '.data.authorization_id')" "$AUTHZ" "授权号"
api authorize/review "{\"authorization_id\":\"$AUTHZ\",\"decision\":\"APPROVE\",\"reviewer_id\":\"REG-ADMIN\",\"comment\":\"情况属实，同意开箱核验\"}"
expect_code 0 "authorize/review APPROVE"
assert_contains "$LAST_RESP" "AUTHORIZED" "裁决后 AUTHORIZED（已上链）"
api inspect/ciphertext "{\"mission_id\":\"$MED\",\"regulator_id\":\"REG-01\"}"
expect_code 5002 "无授权核验（封缄·附录 B）"
assert_eq "$(jqr '.data.authorized')" "false" "authorized=false"
assert_eq "$(jqr '.data.sealed.has_ciphertext')" "true" "封缄元数据可见"
assert_not_contains "$LAST_RESP" "特殊血样（RH 阴性）" "明文绝不进错误信封（金丝雀 >4 字——封缄合法含脱敏前缀「特殊血样****」，C19）"
api inspect/ciphertext "{\"mission_id\":\"$MED\",\"authorization_id\":\"$AUTHZ\",\"regulator_id\":\"REG-01\",\"payload_type\":\"MEDICAL_KIT\"}"
expect_code 0 "inspect/ciphertext 带授权开箱（申报轨迹留空）"
assert_eq "$(jqr '.data.authorized')" "true" "authorized=true"
assert_contains "$(jqr '.data.decrypted_view')" "（RH 阴性）" "明文重现（仅此角色仅此授权）"
assert_eq "$(jqr '.data.verification.digest_match')" "true" "完整性·摘要匹配"
assert_eq "$(jqr '.data.verification.signature_valid')" "true" "完整性·签名有效"
assert_eq "$(jqr '.data.conclusion.payload_verdict')" "PAYLOAD_OK" "载荷一致裁定"
assert_eq "$(jqr '.data.conclusion.route_verdict')" "NOT_CHECKED" "轨迹留空 → 航线不裁定（纪律成文）"
assert_ne "$(jqr '.data.chain_tx_id // empty')" "" "核验结论上链"
api crypto/sm3 "{\"payload\":{\"mission_id\":\"$MED\",\"altitude_max\":120}}"
expect_code 0 "crypto/sm3"
assert_eq "$(jqr '.data.sm3_hash | length')" "64" "SM3 摘要 64hex"
api crypto/sm9/keygen '{"entity_id":"VERIFY-TAMPER-DEMO"}'
expect_code 0 "crypto/sm9/keygen"
EID=$(jqr '.data.sm9_identity // empty')
api crypto/sm9/sign "{\"sm9_identity\":\"$EID\",\"payload\":{\"mission_id\":\"$MED\",\"altitude_max\":120}}"
expect_code 0 "crypto/sm9/sign"
SIG=$(jqr '.data.signature // empty')
api crypto/sm9/verify "{\"sm9_identity\":\"$EID\",\"payload\":{\"mission_id\":\"$MED\",\"altitude_max\":120},\"signature\":\"$SIG\"}"
expect_code 0 "crypto/sm9/verify 原载荷"
assert_eq "$(jqr '.data.valid')" "true" "验签通过"
api crypto/sm9/verify "{\"sm9_identity\":\"$EID\",\"payload\":{\"mission_id\":\"$MED\",\"altitude_max\":999},\"signature\":\"$SIG\"}"
expect_code 0 "篡改后复验（code 仍 0——铁律）"
assert_eq "$(jqr '.data.valid')" "false" "altitude_max→999 验签失败"

chapter "第 8 章 · 收尾（降落 + 4002 + 吊销红灯 + ACTIVATE + 1004 守卫 + 审计/流水盘点）"
api session/close "{\"session_id\":\"$SESS\",\"operator\":\"Operator Portal\",\"reason\":\"降落报备\"}"
expect_code 0 "session/close 降落报备"
assert_eq "$(jqr '.data.status')" "CLOSED" "会话 CLOSED"
api message/send "{\"session_id\":\"$SESS\",\"msg_type\":\"POSITION_UPDATE\",\"source_node\":\"$UAV_MED-NODE\",\"target_node\":\"MGR\"}"
expect_code 4002 "对 CLOSED 会话发消息（设计内拒绝）"
api pass/revoke "{\"pass_id\":\"$PASS_MED\",\"reason\":\"运输完成，许可回收\",\"operator\":\"FISCO-ADMIN\"}"
expect_code 0 "pass/revoke（本地先行）"
assert_contains "$LAST_RESP" "REVOKED" "许可 REVOKED"
api pass/verify "{\"pass_id\":\"$PASS_MED\"}"
expect_code 0 "吊销后 pass/verify（铁律：code 恒 0）"
assert_eq "$(jqr '.data.valid')" "false" "红灯 valid=false"
assert_contains "$(jqr '.data.reasons | tostring')" "吊销" "reasons 说明吊销"
api uav/status "{\"uav_id\":\"$UAV_MED\",\"action\":\"ACTIVATE\"}"
expect_code 0 "uav/status ACTIVATE（VERIFIED→ACTIVE 收尾）"
assert_eq "$(jqr '.data.uav.status')" "ACTIVE" "航空器终态"
api uav/status "{\"uav_id\":\"$UAV_MED\",\"action\":\"ACTIVATE\"}"
expect_code 1004 "重复 ACTIVATE（状态机守卫·附录 B）"
api uav/status "{\"uav_id\":\"$UAV_MED\",\"action\":\"VERIFY\"}"
expect_code 1004 "对 ACTIVE 机 VERIFY（仅 REGISTERED 起点·附录 B）"
api regulatory/audit/export '{}'
expect_code 0 "regulatory/audit/export"
assert_ge "$(jqr '.data.rows')" "1" "监管审计流水行数"
api audit/export '{}'
expect_code 0 "audit/export"
assert_ge "$(jqr '.data.rows')" "1" "全量审计日志行数"
for mt in MISSION_APPLICATION UAV_REGISTER_PROOF MISSION_REVIEW_RESULT FLIGHT_PASS PASS_REVOKE; do
  api crosschain/list "{\"message_type\":\"$mt\",\"page\":1,\"page_size\":200}"
  assert_ge "$(jqr '.data.total')" "1" "跨链流水 $mt 条数"
  assert_eq "$(jqr '[.data.records[] | select(.status!="SUCCESS")] | length')" "0" "$mt 全 SUCCESS"
  assert_eq "$(jqr '[.data.records[] | select((.source_chain_tx_id//"")=="" or (.reg_receive_tx_id//"")=="" or (.reg_relay_tx_id//"")=="" or (.target_chain_tx_id//"")=="")] | length')" "0" "$mt 四段 TxID 齐全"
done
api dashboard/summary '{}'
expect_code 0 "dashboard/summary"
assert_ge "$(jqr '.data.alerts.total')" "1" "驾驶舱·告警总数"
assert_ge "$(jqr '.data.wormhole_events.detect')" "1" "驾驶舱·虫洞检出"
assert_ge "$(jqr '.data.sessions.closed')" "1" "驾驶舱·关闭会话"
assert_ge "$(jqr '.data.authorizations.authorized')" "1" "驾驶舱·已授权"

chapter "DEFERRED-HUMAN 汇总清单（Tasks 5-14 浏览器目检——API 断言不覆盖，人工按项核对）"
cat <<'HUMAN'
【三端通用】
- 各端主题/侧边栏/顶栏 chip：op 政务蓝白 7 页、au 深蓝权威 6 页、rg 深藏青 7 页；六类 chip 跨端预填
- 天地图 key 引导弹窗 + 退化徽章 + 矢量层恒自绘；三链心跳灯；hash 路由兜底「页面未注册」卡（非白屏）
【运营商端 operator.html】
- home：hero 地图、节点层无红色 ATTACKER/无虫洞边（信息边界）、六入口卡、态势条计数（网络节点=过滤后 6）
- realname：回执卡+身份条+「选为当前身份」、执照凭证卡、?subject_id= 深链、缺必填 toast 拦截
- aircraft：QR 可见、四段 TxID 全亮可点开存证抽屉、注销确认弹窗、遗留 NULL 标志回退文案
- flight：走廊三色着色、地图点选⇄勾选框双向同步、回执中文列表、冲突预填、3004 错误卡带解说
- license：电子许可卡 QR+mini-map、绿/红灯证面（绝不错误卡样式）、6002 解说
- ops：✈️ 沿走廊移动+heading 朝向、RID 卡、降落停驻、会话接管 toast、切页 3s 后轮询停止
- airspace：图例三色、节点层开关、zone/走廊过滤、航线详情卡、「坐标未设」文案
【管理当局端 authority.html】
- queue：审核状态列、工作台四段存证+历史+裁决表单、mini-map 高亮任务航段
- passes：许可卡、3002 重复签发解说、抽屉验证/吊销、吊销后 valid=false「许可已吊销」
- records：rules_hit 解析列表、空键 toast、MISSION_REVIEW_RESULT 流水抽屉
- registry：类型/类别过滤、七键验签材料 JSON 块、「模拟证件号」免责声明
- masterdata：两击蓝点+坐标回填（6 位小数）、第三击清空、半套坐标拦截、台账行高亮联动
- netsec：topo 统计卡+NODE-X/Y 红色可见（全量视角）、drill 红虚线隧道边+中点 ⚠、风险 5 维评分条+阈值线、逐跳时延条、experiment 成功率红绿+CSV BOM
【监管当局端 regulator.html】
- cockpit：5 统计卡 tone、地图 C 位全量节点+走廊多边形、✈️ 5s 刷新、告警红色落点、转追踪跳转预填
- alerts：9 字段表单、回执+推进预填、跨级 6002 中性错误卡（无「◈ 预期」徽章）
- trace：七级 chainTag 三色+时延、断点时间线 L1 BROKEN 红✕ + L2-7 skipped
- authz：scope 默认勾 ROUTE+PAYLOAD、相对窗预填、APPROVE 绿卡上链/DENY 红卡不上链、复审 6002
- inspect：5002 封缄卡五键无明文、开箱 3 统计卡+明文卡+12 行 kv、scope 无 MISSION → 明文空文案
- audit：四维/三维过滤、抽屉 JSON 原文、CSV 导出 BOM 头 Excel 可开
- crypto：canonical 键排序串、keygen 确定性同身份、篡改 valid=false 红卡、1002 非法签名解说
【验收故事全流程】
- 按 docs/demo-script.md 第 0-8 章完成约 30 分钟三标签页实演（附录 A 检查清单逐项勾选、
  附录 B 七行设计内拒绝现场复现、附录 C 时长核对）——正式验收以人工实演为准，本脚本仅 API 层
HUMAN

printf '\n════════════════ 验证汇总 ════════════════\n'
printf 'PASS=%d  FAIL=%d\n' "$PASS_N" "$FAIL_N"
if [ "$FAIL_N" -eq 0 ]; then
  echo "ALL_GREEN —— 三端验收故事 API 层断言全部通过（浏览器目检见上方 DEFERRED-HUMAN 清单）"
  exit 0
else
  echo "HAS_FAILURES —— 排查上方 ✗ 项；现场日志已保留：$SIM_DIR/backend.log"
  exit 1
fi
