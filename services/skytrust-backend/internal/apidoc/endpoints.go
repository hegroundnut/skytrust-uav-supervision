package apidoc

// missionMainline 验收主线任务载荷（tests/acceptance mainlineA / system1 e2e 逐字节一致；
// 数组用 []any：wire 字节与 []string 相同，且 InferSchema 静态路径正确，P5-R13）。
func missionMainline() map[string]any {
	return map[string]any{
		"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 09:00:00", "end_time": "2026-09-12 11:00:00",
		"route_segments": []any{"R101", "R205", "R306"},
		"altitude_min":   60, "altitude_max": 120, "payload_type": "CAMERA",
		"description": "巡线走廊Zone-A全线巡检",
	}
}

// b002Create 冲突演示任务 MISSION-B-002（system1 e2e / 验收 TC1-05 一致）。
func b002Create() map[string]any {
	return map[string]any{
		"mission_id":  "MISSION-B-002",
		"operator_id": "Operator-B", "uav_id": "UAV-B-001", "mission_type": "POWER_INSPECTION",
		"start_time": "2026-09-12 10:00:00", "end_time": "2026-09-12 12:00:00",
		"route_segments": []any{"R205"}, "altitude_min": 80, "altitude_max": 120,
		"payload_type": "CAMERA",
	}
}

// reviewApproved 审核通过载荷（application_id 占位符由调用方场景决定）。
func reviewApproved(appRef, comment string) map[string]any {
	return map[string]any{
		"application_id": appRef, "result": "APPROVED", "reviewer": "FISCO-ADMIN",
		"comment": comment, "rules_hit": []any{"R-ALT-001"},
	}
}

// Endpoints 全部 64 个 POST 端点，按单服务器回放故事序排列（P5-R7 手写唯一源）。
// 每行 Sample 在该行位置执行必得 ExpectCode；${ref} 由本表 Capture 先行定义（P5-R13）。
// 确定性错误样例三处（一路径一行约束下的取舍）：sm9/verify(1002)、conflict/resolve(6002)、path/switch(6002)。
var Endpoints = []Endpoint{
	{Path: "/api/health/ping", Group: "基础", Summary: "探活（恒 0）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 0},
	{Path: "/api/health/check", Group: "基础", Summary: "健康自检（DB/密码服务/链适配器）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 0},
	{Path: "/api/chain/status", Group: "基础", Summary: "三链状态（fabric/chainmaker/fisco-bcos 全 ONLINE）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 0},
	{Path: "/api/crypto/sm3", Group: "密码学", Summary: "SM3 规范化摘要", Sample: map[string]any{"payload": map[string]any{"mission_id": "MISSION-2026-001", "operator_id": "Operator-A", "altitude_max": 120}}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/crypto/sm9/keygen", Group: "密码学", Summary: "SM9 身份密钥生成", Sample: map[string]any{"entity_id": "UAV-A-001"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/crypto/sm9/sign", Group: "密码学", Summary: "SM9 签名（先 SM3 摘要再签）", Sample: map[string]any{"sm9_identity": "SM9-ID-UAV-A-001", "payload": map[string]any{"mission_id": "MISSION-2026-001", "operator_id": "Operator-A", "altitude_max": 120}}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/crypto/sm9/verify", Group: "密码学", Summary: "SM9 验签。样例为确定性错误（畸形签名→1002）；成功路径见场景 TC1-03/TC1-04", Sample: map[string]any{"sm9_identity": "SM9-ID-UAV-A-001", "payload": map[string]any{"mission_id": "MISSION-2026-001", "operator_id": "Operator-A", "altitude_max": 120}, "signature": "QUFBQUFBQUFBQQ=="}, ExpectCode: 1002, ProbeExpect: 6002},
	{Path: "/api/demo/init", Group: "演示", Summary: "演示数据灌注（幂等 upsert）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 0},
	{Path: "/api/manufacturer/register", Group: "主数据", Summary: "制造商注册", Sample: map[string]any{"manufacturer_id": "Manufacturer-C", "name": "文档样例制造商"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/manufacturer/list", Group: "主数据", Summary: "制造商列表（分页）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/operator/register", Group: "主数据", Summary: "运营商注册", Sample: map[string]any{"operator_id": "Operator-C", "name": "文档样例运营商"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/operator/list", Group: "主数据", Summary: "运营商列表（分页）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/route/create", Group: "主数据", Summary: "航线段创建", Sample: map[string]any{"route_id": "R901", "zone": "Zone-D", "start_point": "S9", "end_point": "E9", "altitude_min": 50, "altitude_max": 150}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/route/list", Group: "主数据", Summary: "航线段列表（分页）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/uav/register", Group: "无人机", Summary: "无人机注册 + UAV_REGISTER_PROOF 跨链三链留痕", Sample: map[string]any{"uav_id": "UAV-DOC-001", "manufacturer_id": "Manufacturer-B", "operator_id": "Operator-A", "model": "DJI-M350", "serial_no": "SN-DOC-001"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/uav/query", Group: "无人机", Summary: "无人机查询", Sample: map[string]any{"uav_id": "UAV-DOC-001"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/uav/list", Group: "无人机", Summary: "无人机列表（分页）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/uav/status", Group: "无人机", Summary: "无人机状态机操作（VERIFY/ACTIVATE/SUSPEND/RESUME）", Sample: map[string]any{"uav_id": "UAV-DOC-001", "action": "ACTIVATE"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/uav/revoke", Group: "无人机", Summary: "无人机注销", Sample: map[string]any{"uav_id": "UAV-DOC-001", "reason": "文档样例退役", "operator": "Operator-A"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/mission/create", Group: "任务", Summary: "任务创建（密文入库，脱敏展示）", Sample: missionMainline(), ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/mission/query", Group: "任务", Summary: "任务查询", Sample: map[string]any{"mission_id": "MISSION-2026-001"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/mission/list", Group: "任务", Summary: "任务列表（分页）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/mission/submit", Group: "任务", Summary: "任务提交（源链交易 + MISSION_APPLICATION 跨链中继）", Sample: map[string]any{"mission_id": "MISSION-2026-001", "operator": "Operator-A"}, ExpectCode: 0, ProbeExpect: 6002, Capture: map[string]string{"app_id": "data.application.application_id"}},
	{Path: "/api/review/submit", Group: "审核", Summary: "审核裁决（MISSION_REVIEW_RESULT 回传源链）", Sample: reviewApproved("${app_id}", "同意执行"), ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/review/query", Group: "审核", Summary: "审核记录查询", Sample: map[string]any{"application_id": "${app_id}"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/conflict/detect", Group: "冲突", Summary: "时空冲突检测（三维重叠，主动方进 COORDINATING）", Sample: map[string]any{"mission_id": "MISSION-2026-001"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/conflict/resolve", Group: "冲突", Summary: "冲突协调处置。样例为确定性错误（未知 conflict_id→6002）；成功路径见场景 TC1-06", Sample: map[string]any{"conflict_id": "CFL-NOPE-001", "resolution": "时间窗后移30分钟", "operator": "Operator-B"}, ExpectCode: 6002, ProbeExpect: 6002},
	{Path: "/api/pass/issue", Group: "通行许可", Summary: "飞行许可签发（FLIGHT_PASS 管理→监管→运营）", Sample: map[string]any{"mission_id": "MISSION-2026-001", "issuer": "FISCO-ADMIN", "valid_from": "${now-1h}", "valid_to": "${now+1h}"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/pass/query", Group: "通行许可", Summary: "许可查询", Sample: map[string]any{"pass_id": "PASS-2026-001"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/pass/list", Group: "通行许可", Summary: "许可列表（分页）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/pass/verify", Group: "通行许可", Summary: "许可验证（valid/reasons/status；吊销后 valid=false）", Sample: map[string]any{"pass_id": "PASS-2026-001"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/pass/revoke", Group: "通行许可", Summary: "许可吊销（PASS_REVOKE 跨链重发）", Sample: map[string]any{"pass_id": "PASS-2026-001", "reason": "任务结束", "operator": "FISCO-ADMIN"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/topology/get", Group: "链下网络", Summary: "网络拓扑视图（节点/边/虫洞状态/隔离集）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 0},
	{Path: "/api/node/register", Group: "链下网络", Summary: "节点注册（UAV/EDGE/MANAGEMENT/ATTACKER）", Sample: map[string]any{"node_id": "N-DOC-1", "node_type": "EDGE", "position": map[string]any{"X": 10, "Y": 10}}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/node/list", Group: "链下网络", Summary: "节点列表（可选过滤 node_type/status）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/session/open", Group: "会话", Summary: "会话建立（SM9 挑战认证 + 初始可信路径）", Sample: map[string]any{"uav_id": "UAV-A-001"}, ExpectCode: 0, ProbeExpect: 6002, Capture: map[string]string{"sid": "data.session.session_id"}},
	{Path: "/api/session/list", Group: "会话", Summary: "会话列表（可选过滤 status）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/message/send", Group: "消息", Summary: "链下消息发送（亚秒时延，SUCCESS/FAILED）", Sample: map[string]any{"session_id": "${sid}", "msg_type": "HEARTBEAT", "source_node": "UAV-A-001-NODE", "target_node": "MGR"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/message/list", Group: "消息", Summary: "消息列表（可选过滤 session_id/status）", Sample: map[string]any{"session_id": "${sid}"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/wormhole/toggle", Group: "攻防", Summary: "虫洞攻击开关（X/Y 隧道；ISOLATED 后重开→4001）", Sample: map[string]any{"enabled": true, "operator": "ATTACKER-SIM"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/risk/evaluate", Group: "攻防", Summary: "会话风险评估（DETECT/PASS；样例会话建于开洞前→干净路径）", Sample: map[string]any{"session_id": "${sid}"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/path/switch", Group: "攻防", Summary: "受攻击会话路径自动规避切换。样例为确定性错误（未知 session→6002）；成功路径见场景 TC2-06", Sample: map[string]any{"session_id": "SESS-NOPE-001", "operator": "OP-1"}, ExpectCode: 6002, ProbeExpect: 6002},
	{Path: "/api/event/list", Group: "攻防", Summary: "安全事件列表（DETECT/ISOLATE/RECOVER 留痕）", Sample: map[string]any{"session_id": "${sid}"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/session/close", Group: "会话", Summary: "会话关闭（关闭后发消息→4002）", Sample: map[string]any{"session_id": "${sid}", "operator": "OP-1", "reason": "文档演示完毕"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/alert/raise", Group: "告警", Summary: "告警登记（匿名化：伪名+证据摘要，明文身份不出库）", Sample: map[string]any{"alert_id": "ALERT-2026-001", "mission_id": "MISSION-2026-001", "uav_pseudonym": "PSEUDO-UAV-83921", "event_type": "ROUTE_DEVIATION", "risk_level": "HIGH", "source_system": "MANUAL", "operator": "REG-01"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/alert/list", Group: "告警", Summary: "告警列表（可选过滤 event_type/status/risk_level/source_system/mission_id）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/alert/status", Group: "告警", Summary: "告警状态机推进（OPEN→IDENTIFIED→TRACED→REVIEWED→RESOLVED，跨级→6002）", Sample: map[string]any{"alert_id": "ALERT-2026-001", "to_status": "IDENTIFIED", "operator": "REG-01", "reason": "初判成立"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/trace/identity", Group: "追踪", Summary: "七级身份追踪（告警/伪名/许可入口；断链→5001+断点留痕）", Sample: map[string]any{"alert_id": "ALERT-2026-001", "operator": "REG-01"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/authorize/apply", Group: "授权", Summary: "监管授权申请（范围最小化，审计摘要上链前置）", Sample: map[string]any{"authorization_id": "AUTH-2026-001", "regulator_id": "REG-01", "scope": []any{"MISSION", "ROUTE", "PAYLOAD", "IDENTITY"}, "target_type": "MISSION", "target_id": "MISSION-2026-001", "reason": "核查告警 ALERT-2026-001"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/authorize/review", Group: "授权", Summary: "授权审批（APPROVE 上链 chainmaker；复审→6002）", Sample: map[string]any{"authorization_id": "AUTH-2026-001", "decision": "APPROVE", "reviewer_id": "REG-ADMIN", "comment": "同意"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/inspect/ciphertext", Group: "核查", Summary: "密文核验（未授权→5002+封缄；授权→明文视图+双验证+结论上链）", Sample: map[string]any{"mission_id": "MISSION-2026-001", "authorization_id": "AUTH-2026-001", "regulator_id": "REG-01", "trajectory": "NORMAL", "payload_type": "CAMERA"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/regulatory/audit/list", Group: "监管审计", Summary: "监管审计查询（INSPECT/AUTH_APPROVE 等）", Sample: map[string]any{"action": "INSPECT"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/regulatory/audit/export", Group: "监管审计", Summary: "监管审计 CSV 导出", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/audit/query", Group: "审计", Summary: "全域审计查询（actor/action/business_id 过滤）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/audit/export", Group: "审计", Summary: "全域审计 CSV 导出", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/crosschain/send", Group: "跨链网关", Summary: "跨链消息发送（SM9 验签→源链→监管链双写→目标链；缺签名则代签）", Sample: map[string]any{"message_type": "UAV_REGISTER_PROOF", "business_id": "UAV-A-001", "source_chain": "fabric", "final_target_chain": "chainmaker", "payload": map[string]any{"uav_id": "UAV-A-001", "manufacturer_id": "Manufacturer-B", "operator_id": "Operator-A", "serial_no": "SN-A001", "sm9_identity": "SM9-ID-UAV-A-001"}, "sm9_identity": "SM9-ID-UAV-A-001"}, ExpectCode: 0, ProbeExpect: 6002, Capture: map[string]string{"cross_tx_id": "data.cross_tx_id"}},
	{Path: "/api/crosschain/query", Group: "跨链网关", Summary: "跨链交易查询（四段 TxID/验签结果/时延）", Sample: map[string]any{"cross_tx_id": "${cross_tx_id}"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/crosschain/list", Group: "跨链网关", Summary: "跨链交易列表（分页）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/dashboard/summary", Group: "驾驶舱", Summary: "监管驾驶舱汇总（任务/许可/告警/授权/网络）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 0},
	{Path: "/api/experiment/run", Group: "实验", Summary: "运行实验（11 类：跨链回路/完整性/验签/冲突/消息流三场景/风险扫描/压力/批量追踪/授权核验/告警批量）", Sample: map[string]any{"experiment_type": "SM3_INTEGRITY", "count": 5}, ExpectCode: 0, ProbeExpect: 6002, Capture: map[string]string{"run_id": "data.run_id"}},
	{Path: "/api/experiment/result", Group: "实验", Summary: "实验结果查询（成功率/时延分位/失败原因）", Sample: map[string]any{"run_id": "${run_id}"}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/experiment/list", Group: "实验", Summary: "实验列表（分页）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/experiment/export", Group: "实验", Summary: "实验结果 CSV 导出", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 6002},
	{Path: "/api/demo/reset", Group: "演示", Summary: "清空全部业务表 + 模拟链状态复位（不重灌种子，重灌用 demo/init）", Sample: map[string]any{}, ExpectCode: 0, ProbeExpect: 0},
}
