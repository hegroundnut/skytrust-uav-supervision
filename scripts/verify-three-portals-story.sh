#!/usr/bin/env bash
# verify-three-portals-story.sh —— 四端验收故事 API 层一键实跑（原名保留；计划 B Task 15
# 三端版 → 四链计划 Task 11 四端化：+证照中心端 license-center.html / 四链链灯 / CXV 浏览器 / WTOPO）
#
# 干什么：在**隔离仿真环境**里起一个专属后端（:18080，DB/SM9 密钥全在 /tmp）+ 前端代理
# （:18090），按 docs/demo-script.md 第 0-8 章的 API 等价操作逐章 curl 断言（含全部
# 设计内拒绝回归：3004/4001/5001/5002/4002/1004/3002），外加四链计划新增三章：
#   · 第 3b 章 证照中心端签发（issuer=REGISTRY-ADMIN + 源链 TxID 前缀 IRITA- + 3002 防重发）
#   · 第 5b 章 虫洞拓扑数据面（WTOPO 坐标红线 a/b/c——以计划「Task 9 校准实录」为准：
#     种子 NODE-X/Y 已回填真实模拟经纬度，两层皆现属红线正确行为；分裂机制以 probe 实证）
#   · 第 9 章 四端区块链浏览器数据面（explorer 四链总览/块浏览/链上直查 + 可构造负路径 6002；
#     能力降级码 = 2005，sim 四链全实现 BlockQuerier 不可构造——实弹属真链验收窗 Task 14）
# 附带前端产物存在性门（四端 + CXV/WTOPO 件）+ 全量 node --check 语法门 + 四端 HTML 经代理
# 可达性检查，最后打印 DEFERRED-HUMAN 人工清单（含【证照中心端】【四端浏览器】【虫洞拓扑】）。
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

chapter "前端产物门：文件存在性 + node --check + 四端 HTML 经代理可达 + CXV/WTOPO 挂载"
MISS=0
for f in \
  frontend/operator.html frontend/authority.html frontend/regulator.html \
  frontend/license-center.html frontend/index.html \
  frontend/css/drone.css frontend/css/theme-op.css frontend/css/theme-au.css frontend/css/theme-rg.css \
  frontend/css/theme-ct.css \
  frontend/js/api.js frontend/js/store.js frontend/js/portal.js frontend/js/map.js \
  frontend/js/shell-op.js frontend/js/shell-au.js frontend/js/shell-rg.js frontend/js/shell-ct.js \
  frontend/js/chainview.js frontend/js/wormhole-topo.js \
  frontend/js/cxv/zones.js \
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
  frontend/js/pages/ct/home.js frontend/js/pages/ct/issue.js frontend/js/pages/ct/ledger.js \
  frontend/js/pages/ct/verify.js frontend/js/pages/ct/revoke.js \
  frontend/js/pages/op/chainview.js frontend/js/pages/au/chainview.js \
  frontend/js/pages/rg/chainview.js frontend/js/pages/ct/chainview.js \
  frontend/js/pages/chainview.js \
  docs/demo-script.md ; do
  [ -f "$ROOT/$f" ] || { bad "缺文件 $f"; MISS=1; }
done
[ "$MISS" = "0" ] && ok "四端全部产物文件存在（5 HTML + 5 CSS + 共享底座含 shell-ct/CXV/WTOPO + vendor + 25 业务页 + 5 浏览器挂载页 + demo-script）"
JSFAIL=0
while IFS= read -r f; do
  node --check "$f" >/dev/null 2>&1 || { bad "node --check $f"; JSFAIL=1; }
done < <(find "$ROOT/frontend/js" -name '*.js' -type f | sort)
[ "$JSFAIL" = "0" ] && ok "frontend/js 全部 JS node --check 通过"
for p in operator authority regulator license-center index; do
  hc=$(curl -sS -m 5 -o "$SIM_DIR/$p.html" -w '%{http_code}' "$FRONTEND/$p.html" 2>/dev/null)
  assert_eq "$hc" "200" "GET :$FRONT_PORT/$p.html"
done
grep -q 'shell-op.js' "$SIM_DIR/operator.html" && ok "operator.html 引用 shell-op.js" || bad "operator.html 未引用 shell-op.js"
grep -q 'shell-au.js' "$SIM_DIR/authority.html" && ok "authority.html 引用 shell-au.js" || bad "authority.html 未引用 shell-au.js"
grep -q 'shell-rg.js' "$SIM_DIR/regulator.html" && ok "regulator.html 引用 shell-rg.js" || bad "regulator.html 未引用 shell-rg.js"
grep -q 'shell-ct.js' "$SIM_DIR/license-center.html" && ok "license-center.html 引用 shell-ct.js" || bad "license-center.html 未引用 shell-ct.js"
for p in operator authority regulator license-center index; do
  grep -q 'js/chainview.js' "$SIM_DIR/$p.html" && ok "$p.html 挂载 CXV 浏览器共享模块（js/chainview.js）" || bad "$p.html 未挂载 js/chainview.js"
done
grep -q 'wormhole-topo.js' "$SIM_DIR/authority.html" && ok "authority.html 挂载 WTOPO（js/wormhole-topo.js）" || bad "authority.html 未挂载 wormhole-topo.js"
grep -q '服务端仅支持状态/类型过滤，其余为最近 200 条内客户端筛选' "$ROOT/frontend/js/chainview.js" \
  && ok "CXV 固定小字逐字存在「…最近 200 条内客户端筛选」（Review Focus 5——chainview.js SMALL_PRINT）" \
  || bad "chainview.js 未找到 CXV 固定小字「最近 200 条」"
api_via_proxy=$(curl -sS -m 5 -X POST "$FRONTEND/api/health/ping" -H 'Content-Type: application/json' -d '{}' 2>/dev/null | jq -r '.code // "ERR"')
assert_eq "$api_via_proxy" "0" "代理链路 :$FRONT_PORT/api/* → :$BACK_PORT"

chapter "第 0 章 · 开场整备（demo/reset + demo/init + 四链 + 种子计数）"
api demo/reset '{}'; expect_code 0 "demo/reset"
api demo/init '{}';  expect_code 0 "demo/init"
api chain/status '{}'; expect_code 0 "chain/status"
assert_eq "$(jqr '.data.count')" "4" "接入链数（四链形态：监管 ChainMaker + 运营 Fabric + 管理 FISCO BCOS + 证照 IRITA）"
for k in chainmaker fabric fisco-bcos irita; do
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

chapter "第 3b 章 · 证照中心端签发（四链剧情扩展——REGISTRY-ADMIN 现行身份 + IRITA 源链 + 3002 防重发）"
# 证照中心端（license-center.html，Tasks 6/7/10）现行签发流。B 任务本章已 APPROVED（种子主数据
# Operator-B/UAV-B-001=VERIFIED），ct 端签发方硬编码 REGISTRY-ADMIN（只读展示，Task 7 先例）；
# SM9 签名权威 = passSignerUID() 恒 SM9-ID-REGISTRY-ADMIN（pass.go:24——FlightPass 无 issuer 字段，
# issuer 仅记审计/payload 归因；FISCO-ADMIN 双身份仅用于存量许可回退验签）。PASS-2026-002 为
# 脚本本地值（demo-script 四端版速查表属 Task 15，尚无该固定值）。
PASS_CT=PASS-2026-002
api pass/issue "{\"mission_id\":\"$BMIS\",\"issuer\":\"REGISTRY-ADMIN\",\"pass_id\":\"$PASS_CT\",\"valid_from\":\"$TM1\",\"valid_to\":\"$T4\"}"
expect_code 0 "pass/issue 证照中心端签发（issuer=REGISTRY-ADMIN，B 任务 APPROVED）"
assert_eq "$(jqr '.data.pass.status')" "VALID" "CT 许可状态 VALID"
assert_eq "$(jqr '.data.crosschain.status')" "SUCCESS" "FLIGHT_PASS 跨链（证照链→监管链中继→运营链）"
assert_eq "$(jqr '.data.crosschain.source_chain')" "irita" "源链 = irita（Task 3 迁移后签发源链，不再 fisco-bcos）"
assert_eq "$(jqr '.data.crosschain.final_target_chain')" "fabric" "最终目标链 = fabric"
CTSRC=$(jqr '.data.crosschain.source_chain_tx_id // empty')
case "$CTSRC" in IRITA-*) ok "签发回执源链 TxID 前缀 IRITA-（$CTSRC）";; *) bad "签发回执源链 TxID 前缀异常：[$CTSRC]（期望 IRITA-）";; esac
CTTGT=$(jqr '.data.crosschain.target_chain_tx_id // empty')
assert_ne "$CTTGT" "" "目标链 TxID 非空（第 9 章 explorer/tx 链上直查素材）"
assert_eq "$(jqr '.data.crosschain.sm9_identity')" "SM9-ID-REGISTRY-ADMIN" "跨链 SM9 签名身份 = 现行签发方"
api pass/issue "{\"mission_id\":\"$BMIS\",\"issuer\":\"REGISTRY-ADMIN\",\"pass_id\":\"$PASS_CT\",\"valid_from\":\"$TM1\",\"valid_to\":\"$T4\"}"
expect_code 3002 "同 pass_id 重复签发（设计内拒绝·VALID 不可重复签发，pass.go:135）"
api pass/verify "{\"pass_id\":\"$PASS_CT\"}"
expect_code 0 "pass/verify CT 许可（铁律：存在的许可恒 code=0）"
assert_eq "$(jqr '.data.valid')" "true" "CT 许可验证绿灯 valid=true"
api pass/list '{"status":"VALID","page":1,"page_size":200}'
expect_code 0 "pass/list VALID（ct 台账数据源）"
assert_eq "$(jqr '.data.total')" "2" "台账 VALID 总数（PASS-2026-001 医疗 + PASS-2026-002 CT）"
api crosschain/list '{"message_type":"FLIGHT_PASS","page":1,"page_size":200}'
expect_code 0 "crosschain/list FLIGHT_PASS"
assert_eq "$(jqr "[.data.records[] | select(.business_id==\"$PASS_CT\")] | length")" "1" "跨链台账命中 CT 许可留痕（business_id=$PASS_CT）"
CTL=$(jqr "[.data.records[] | select(.business_id==\"$PASS_CT\") | .source_chain_tx_id] | first")
case "$CTL" in IRITA-*) ok "crosschain/list CT 留痕 source_chain_tx_id 前缀 IRITA-（$CTL）";; *) bad "crosschain/list CT 留痕源链 TxID 前缀异常：[$CTL]（期望 IRITA-）";; esac

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

chapter "第 5b 章 · 虫洞拓扑数据面（WTOPO 坐标红线——按 plan「Task 9 校准实录」a/b/c 三断言）"
# Task 9 校准实录（plan commit 3c3bccc，BINDING）：种子 NODE-X/Y 已回填真实模拟经纬度
# （seed.go:120-121——X 30.556/114.356、Y 30.640/114.440）→ 合法同时出现在地理层（Leaflet）
# 与 WTOPO 抽象层。本脚本**不断言** NODE-X/Y ∉ Leaflet 输入（旧前提已过时）；分裂机制改以
# probe 实证：有 position、无 lat/lon → ∈WTOPO 布点集 ∧ ∉Leaflet 可绘集（lat/lon 双零 = 未设
# 语义，GEO.nodeCoord 判 null——js/data/geo.js 唯一裁决）。无 position 节点被 API 数据面门拒绝
# （binding:"required" → 6002），在 sim 不可合法构造 →「未布点」侧清单属防御性诚实规则（Task 9
# 合成 fixture 单测已覆盖 posOf→null→unplaced），其 DOM 目检归 DEFERRED-HUMAN【虫洞拓扑】。
api topology/get '{}'
expect_code 0 "topology/get（隔离态下仍全量如实——攻击者在数据面可见）"
NXP=$(jqr '.data.nodes[] | select(.node_id=="NODE-X") | .position // empty')
assert_ne "$NXP" "" "(a) NODE-X ∈ topology 且 position 非空（有 position 必入 WTOPO 布点集）"
NYP=$(jqr '.data.nodes[] | select(.node_id=="NODE-Y") | .position // empty')
assert_ne "$NYP" "" "(a) NODE-Y ∈ topology 且 position 非空"
assert_eq "$(jqr '.data.nodes[] | select(.node_id=="NODE-X") | .lat')" "30.556" "(a) NODE-X lat=30.556（Task 9 校准后前提：真实模拟坐标——两层皆现属红线正确行为）"
assert_eq "$(jqr '.data.nodes[] | select(.node_id=="NODE-X") | .lon')" "114.356" "(a) NODE-X lon=114.356"
assert_eq "$(jqr '.data.nodes[] | select(.node_id=="NODE-Y") | .lat')" "30.64" "(a) NODE-Y lat=30.64（种子值 30.640 之 JSON 最短形态）"
assert_eq "$(jqr '.data.nodes[] | select(.node_id=="NODE-Y") | .lon')" "114.44" "(a) NODE-Y lon=114.44（种子值 114.440）"
assert_eq "$(jqr '.data.nodes[] | select(.node_id=="NODE-X") | .status')" "ISOLATED" "(a) NODE-X 隔离后状态如实（第 5 章 ISOLATE 落地——WTOPO 红虚线描边+⛔ 数据源）"
assert_eq "$(jqr '.data.nodes[] | select(.node_id=="NODE-Y") | .status')" "ISOLATED" "(a) NODE-Y 隔离后状态如实"
api node/register '{"node_id":"NODE-PROBE-T11","node_type":"EDGE","position":{"X":62,"Y":8},"neighbors":[]}'
expect_code 0 "(b) node/register 探针（仅 position、无 lat/lon——Task 9 L3 分裂机制先例；sm9_identity 留空自动派生）"
api topology/get '{}'
expect_code 0 "topology/get（探针注册后）"
assert_eq "$(jqr '.data.nodes[] | select(.node_id=="NODE-PROBE-T11") | .position // empty')" '{"X":62,"Y":8}' "(b) 探针 position 回显（API 注册大写键——WTOPO posOf x/X 双兼容）"
assert_eq "$(jqr '.data.nodes[] | select(.node_id=="NODE-PROBE-T11") | .lat')" "0" "(b) 探针 lat=0（未设语义——GEO.nodeCoord 判 null，永不落 Leaflet）"
assert_eq "$(jqr '.data.nodes[] | select(.node_id=="NODE-PROBE-T11") | .lon')" "0" "(b) 探针 lon=0（∈WTOPO ∧ ∉Leaflet——分裂实证数据面）"
assert_eq "$(jqr '.data.edges | length')" "6" "(b) 探针 neighbors=[] → 边仍 6（隔离后 X/Y 退出 ONLINE 边集 9→6；探针零扰动）"
api node/register '{"node_id":"NODE-NOPOS-T11","node_type":"EDGE","neighbors":[]}'
expect_code 6002 "(c) node/register 缺 position → 6002（binding:\"required\" 数据面门——无 position 节点进不了系统）"
api topology/get '{}'
assert_eq "$(jqr '[.data.nodes[] | select(.node_id=="NODE-NOPOS-T11")] | length')" "0" "(c) 被拒节点未入拓扑（诚实缺席——绝不编造默认布点）"
assert_eq "$(jqr '[.data.nodes[] | select((.position // "")=="")] | length')" "0" "(c) 拓扑内零无-position 节点（本场 sim 数据面「未布点」清单恒空——DOM 侧清单目检 = DEFERRED-HUMAN）"
api node/list '{"page":1,"page_size":200}'
assert_eq "$(jqr '.data.total')" "10" "节点台账总数（种子 8 + 第 4 章接入点 + 探针 = 10；被拒注册不计入）"

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

chapter "第 9 章 · 四端区块链浏览器数据面（CXV/explorer——四链总览 + 块浏览 + 链上直查 + 负路径）"
# 能力降级码 = 2005 ChainUnsupportedFeature（Task 4 校准裁决：5003 已被 AuthScope 占用，全局
# 码表语义唯一，绝不复用）。隔离 sim 四链全部实现 BlockQuerier（sim/blockquery.go——数据全来自
# SubmitTx 落下的真实块记录）→ 2005 对 sim **不可构造，绝不伪造触发**；实弹（链 RPC 能力
# 缺口）归真链验收窗（Task 14；注：FISCO 块查询自 §12.11 起走 SDK 通道已可用，2005 现为
# 通用哨兵无常态触发者）。本章负路径 = 可构造者：未知链 → 6002、
# height=0/越界 → 6002、不存在 TxID → 6002（一律如实拒绝，绝不拼造块/交易/显示名）。
api explorer/overview '{}'
expect_code 0 "explorer/overview"
assert_eq "$(jqr '.data.count')" "4" "四链总览 count=4"
assert_eq "$(jqr '[.data.chains[] | select(.status=="ONLINE")] | length')" "4" "四链 ONLINE（overview 与 chain/status 链灯同源）"
assert_eq "$(jqr '[.data.chains[] | select(.mode=="sim")] | length')" "4" "四链 mode=sim（隔离环境如实标注——real 只属真链部署）"
assert_eq "$(jqr '[.data.chains[] | select(.node_count==1)] | length')" "4" "sim 单节点如实计数（绝不冒充 4 节点集群）"
assert_eq "$(jqr '[.data.chains[] | select(.block_height>=1)] | length')" "4" "四链块高 ≥1（本场剧情真实写入——sim 一笔交易一个块）"
# 固定显示值逐字断言（explorer_handler.go:27-39 设计钉死——白名单链逐字，未知链不猜测显示名）
assert_eq "$(jqr '.data.chains[] | select(.chain=="chainmaker") | .name')" "ChainMaker 监管链" "chainmaker 显示名逐字"
assert_eq "$(jqr '.data.chains[] | select(.chain=="chainmaker") | .consensus')" "TBFT（4 节点）" "chainmaker 共识串逐字"
assert_eq "$(jqr '.data.chains[] | select(.chain=="fabric") | .name')" "Fabric 运营链" "fabric 显示名逐字"
assert_eq "$(jqr '.data.chains[] | select(.chain=="fabric") | .consensus')" "SMARTBFT（4 orderer）" "fabric 共识串逐字"
assert_eq "$(jqr '.data.chains[] | select(.chain=="fisco-bcos") | .name')" "FISCO BCOS 管理链" "fisco-bcos 显示名逐字"
assert_eq "$(jqr '.data.chains[] | select(.chain=="fisco-bcos") | .consensus')" "PBFT（4 sealer）" "fisco-bcos 共识串逐字"
assert_eq "$(jqr '.data.chains[] | select(.chain=="irita") | .name')" "IRITA 证照链" "irita 显示名逐字"
assert_eq "$(jqr '.data.chains[] | select(.chain=="irita") | .consensus')" "Tendermint BFT（4 验证人）" "irita 共识串逐字"
api explorer/nodes '{"chain":"irita"}'
expect_code 0 "explorer/nodes irita"
assert_eq "$(jqr '.data.nodes | length')" "1" "irita 节点列表（sim 单节点）"
assert_eq "$(jqr '.data.nodes[0].source')" "sim" "节点 source=sim 如实标注（绝不冒充链原生 RPC 结果）"
api explorer/blocks '{"chain":"chainmaker","limit":5}'
expect_code 0 "explorer/blocks chainmaker（limit=5）"
assert_ge "$(jqr '.data.height')" "1" "监管链当前块高"
assert_eq "$(jqr '.data.blocks | length')" "5" "最近块列表按 limit=5 截断"
assert_eq "$(jqr '.data.blocks[0].height')" "$(jqr '.data.height')" "块列表新→旧（首条 = 当前高度）"
CMH=$(jqr '.data.height')
api explorer/block "{\"chain\":\"chainmaker\",\"height\":$CMH}"
expect_code 0 "explorer/block chainmaker@$CMH（按高度取块详情）"
assert_eq "$(jqr '.data.block.height')" "$CMH" "块高回显"
assert_ne "$(jqr '.data.block.hash // empty')" "" "块 hash 非空"
assert_ge "$(jqr '.data.block.tx_count')" "1" "块内交易数"
api explorer/tx "{\"chain\":\"fabric\",\"tx_id\":\"$CTTGT\"}"
expect_code 0 "explorer/tx fabric（CT 许可目标链留痕链上直查——业务 TxID 可回查）"
assert_eq "$(jqr '.data.tx.tx_id')" "$CTTGT" "链上直查 TxID 回显"
api explorer/nodes '{"chain":"hyperledger-fake"}'
expect_code 6002 "未知链 → 6002（可构造负路径——不猜测、不拼造显示名）"
api explorer/block '{"chain":"chainmaker","height":0}'
expect_code 6002 "height=0 → 6002（binding:\"required\" 怪癖，Task 8 交接——0 亦非合法块高，sim 块从 1 起）"
api explorer/block '{"chain":"chainmaker","height":99999999}'
expect_code 6002 "块高越界 → 6002（如实拒绝——绝不拼造区块）"
api explorer/tx '{"chain":"fabric","tx_id":"FABRIC-NOT-EXIST-T11"}'
expect_code 6002 "不存在 TxID → 6002（链上直查诚实报缺）"

chapter "DEFERRED-HUMAN 汇总清单（浏览器目检——API 断言不覆盖，人工按项核对）"
cat <<'HUMAN'
【四端通用】
- 各端主题/侧边栏/顶栏 chip：op 政务蓝白业务 7 页、au 深蓝权威业务 6 页、rg 深藏青业务 7 页、
  ct 证照暗色业务 5 页；每端另挂「链上浏览器」1 页；六类 chip 跨端预填
- 天地图 key 引导弹窗 + 退化徽章 + 矢量层恒自绘；四链心跳灯（含 irita 证照链）；hash 路由兜底
  「页面未注册」卡（非白屏）
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
- passes：只读台账 + 顶部通告条「通行证签发/吊销已移交证照中心端」+ license-center.html 入口链接
  （Task 10 降级——签发/吊销操作件已移除）；行抽屉 pass/query 详情 + pass/verify 验证绿/红灯；
  吊销后 valid=false「许可已吊销」
- records：rules_hit 解析列表、空键 toast、MISSION_REVIEW_RESULT 流水抽屉
- registry：类型/类别过滤、七键验签材料 JSON 块、「模拟证件号」免责声明
- masterdata：两击蓝点+坐标回填（6 位小数）、第三击清空、半套坐标拦截、台账行高亮联动
- netsec：topo 统计卡+NODE-X/Y 红色可见（全量地理视角）、WTOPO 抽象拓扑区块（地理层下方——
  详见【虫洞拓扑】）、drill 红虚线隧道边+中点 ⚠、风险 5 维评分条+阈值线、逐跳时延条、
  experiment 成功率红绿+CSV BOM
【监管当局端 regulator.html】
- cockpit：5 统计卡 tone、地图 C 位全量节点+走廊多边形、✈️ 5s 刷新、告警红色落点、转追踪跳转预填
- alerts：9 字段表单、回执+推进预填、跨级 6002 中性错误卡（无「◈ 预期」徽章）
- trace：七级 chainTag 三色+时延、断点时间线 L1 BROKEN 红✕ + L2-7 skipped
- authz：scope 默认勾 ROUTE+PAYLOAD、相对窗预填、APPROVE 绿卡上链/DENY 红卡不上链、复审 6002
- inspect：5002 封缄卡五键无明文、开箱 3 统计卡+明文卡+12 行 kv、scope 无 MISSION → 明文空文案
- audit：四维/三维过滤、抽屉 JSON 原文、CSV 导出 BOM 头 Excel 可开
- crypto：canonical 键排序串、keygen 确定性同身份、篡改 valid=false 红卡、1002 非法签名解说
【证照中心端 license-center.html】
- home：证照总览 + 三大核心能力卡（CAPX）+ 四入口导航；ct 暗色主题对比度/表格密度
- issue：待签发表格（APPROVED ⋈ 无 pass）、issuer=REGISTRY-ADMIN 只读展示（非表单字段）、
  ±1h 默认窗 +「两键清空=回退任务窗」hint、进行中态 spinner（跨链约 3-6s 预期管理）、
  成功卡 QR + 四段 TxID 点开存证抽屉、失败 errCard + 解说 +「同 pass_id 可重试」提示
- ledger：状态过滤、行抽屉 11 键全量 + SM9 签名身份区（REGISTRY-ADMIN 现行 / FISCO-ADMIN 历史
  双身份过渡说明）、「最近 N 条」窗口注记、无留痕诚实空态「无法链上溯源，绝不按日期猜测」
- verify：绿/红灯证面（envelope 恒 code 0——valid/reasons 数据化渲染，红灯绝不错误卡样式）、
  6002 不存在解说卡、深链 #/verify?pass_id= 预填
- revoke：确认弹窗三条后果文案（本地先行 REVOKED 不可逆 / 跨链 best-effort / 仅 VALID 可吊销）、
  跨链失败黄条如实展示 + 补发 busy 态（sim 跨链恒成功无法自然构造——真链验收时看一眼）、
  3002 FailData 状态如实补展
【四端浏览器（CXV · Task 8）】
- 四端 + index 五处挂载 #/chainview JS 渲染后视觉（布局/间距/链卡边条色 = 链色语义：
  紫 ChainMaker / 蓝 Fabric / 青 FISCO BCOS / 绿 IRITA——icon+文字，绝不仅靠颜色）
- 节点情况：四链卡（高度/节点数/共识/mode 徽章/状态）+ 选中链节点表 source 列
  （rpc / static+probe / sim 如实展示）
- 块浏览：最近 20 块新→旧、行点击块抽屉（hash/time/tx_count/proposer/tx 列表）、tx 点击详情、
  irita「Merkle 证明可用」标注（real 模式实际出现）
- 链上数据追踪：message_type 五类 chip + 状态过滤、分页表、行点击 openCxDetail；直查表单
  （链选 + TxID）；固定小字「服务端仅支持状态/类型过滤，其余为最近 200 条内客户端筛选」
  （本脚本已 grep 逐字）
- rg 暗色 .d-cxv-reg-hl outline +「⇄ 监管中继段」对比度；chip ☑/☐ 字形各主题可读性；
  index 端无 drone.css 的降级观感（内容完整、装饰缺席）
- 能力降级 2005「该链 RPC 不支持…」实弹触发（通用能力哨兵；FISCO 块查询已可用 §12.11）= 真链验收窗
  （Task 14）——sim 四链全实现 BlockQuerier，2005 不可构造；本脚本仅断言可构造负路径
  （未知链 / height=0 / 越界 / 不存在 TxID → 6002）
【虫洞拓扑（WTOPO · Task 9）】
- au/netsec 拓扑页签 SVG 实render：position min-max 归一化布点、类型着色（紫 MANAGEMENT /
  蓝 EDGE / 青 UAV / 红 ATTACKER + ⚠ 标签）、虫洞边红虚线 d-wormhole-flow 流动动画 + 中点 ⚠、
  ISOLATED 红虚线描边 + ⛔ + d-pulse-hit 脉冲环、OFFLINE 空心、会话路径加粗（虫洞优先级最高）
- 「未布点」侧清单 DOM：无 position 节点不画不猜逐节点列出 +「涉及未布点/未知端点的边 N 条
  同步不画」如实计数（sim 数据面无法构造无-position 节点——本脚本已断言 API 6002 门；
  合成 fixture 下的侧清单目检归此项）
- 坐标红线口播（Task 9 校准措辞）：「抽象层全量可见（含攻击者），地理层按经纬度红线落点」——
  probe 分裂（有 position 无 lat/lon → ∈WTOPO ∧ ∉Leaflet）两层对照目检
- 三态联动实操：drill toggle/evaluate/switch 后切回拓扑页签双层重绘时序；hover tip（边/节点）
  排版与跟随；图例 9 项 + 红线小字窄屏换行
【验收故事全流程】
- 按 docs/demo-script.md 第 0-8 章完成约 30 分钟三标签页实演（附录 A 检查清单逐项勾选、
  附录 B 设计内拒绝现场复现、附录 C 时长核对），另加证照中心端签发/台账/查验/吊销四页实演
  （demo-script 四端版属 Task 15）——正式验收以人工实演为准，本脚本仅 API 层
HUMAN

printf '\n════════════════ 验证汇总 ════════════════\n'
printf 'PASS=%d  FAIL=%d\n' "$PASS_N" "$FAIL_N"
if [ "$FAIL_N" -eq 0 ]; then
  echo "ALL_GREEN —— 四端验收故事 API 层断言全部通过（浏览器目检见上方 DEFERRED-HUMAN 清单）"
  exit 0
else
  echo "HAS_FAILURES —— 排查上方 ✗ 项；现场日志已保留：$SIM_DIR/backend.log"
  exit 1
fi
