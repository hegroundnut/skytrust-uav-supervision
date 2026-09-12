package apidoc

// Storylines 24 个验收/演示场景（与 tests/acceptance TC 判定同源，P5-R13）。
// 回放规则：单服务器顺序执行，步骤只断言信封 code（数据级断言在验收测试）；
// capture 引用全回放共享命名空间（TC 前缀防冲突）；${now±1h} 由回放引擎注入。
// 状态依赖：TC2-08 开头 demo/reset+demo/init（清 ISOLATED/虫洞——虫洞状态由 DB 推导，
// 清表即复位；reset 不重灌故必须跟 init）；TC3 依赖 TC2-08 重灌后的种子数据，
// 自增 ID 从头（MISSION-2026-001/PASS-2026-001 复用无冲突——旧行已清）。
var Storylines = []Scenario{
	{ID: "TC1-01", Name: "三链在线", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/chain/status", Body: map[string]any{}, ExpectCode: 0},
	}},
	{ID: "TC1-02", Name: "正常任务申请跨链中继", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/mission/create", Body: missionMainline(), ExpectCode: 0},
		{Path: "/api/mission/submit", Body: map[string]any{"mission_id": "MISSION-2026-001", "operator": "Operator-A"}, ExpectCode: 0, Capture: map[string]string{"tc1_app": "data.application.application_id"}},
	}},
	{ID: "TC1-03", Name: "SM3 完整性篡改检测", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/crypto/sm9/sign", Body: map[string]any{"sm9_identity": "SM9-ID-UAV-A-001", "payload": map[string]any{"mission_id": "MISSION-2026-001", "operator_id": "Operator-A", "altitude_max": 120}}, ExpectCode: 0, Capture: map[string]string{"tc1_sig": "data.signature"}},
		{Path: "/api/crypto/sm3", Body: map[string]any{"payload": map[string]any{"mission_id": "MISSION-2026-001", "operator_id": "Operator-A", "altitude_max": 120}}, ExpectCode: 0},
		{Path: "/api/crypto/sm3", Body: map[string]any{"payload": map[string]any{"mission_id": "MISSION-2026-001", "operator_id": "Operator-A", "altitude_max": 200}}, ExpectCode: 0},
		{Path: "/api/crypto/sm9/verify", Body: map[string]any{"sm9_identity": "SM9-ID-UAV-A-001", "payload": map[string]any{"mission_id": "MISSION-2026-001", "operator_id": "Operator-A", "altitude_max": 200}, "signature": "${tc1_sig}"}, ExpectCode: 0},
	}},
	{ID: "TC1-04", Name: "SM9 验签拒伪", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/crypto/sm9/sign", Body: map[string]any{"sm9_identity": "SM9-ID-UAV-A-001", "payload": map[string]any{"uav_id": "UAV-A-001", "serial_no": "SN-A001"}}, ExpectCode: 0, Capture: map[string]string{"tc1_sig2": "data.signature"}},
		{Path: "/api/crypto/sm9/verify", Body: map[string]any{"sm9_identity": "SM9-ID-UAV-B-001", "payload": map[string]any{"uav_id": "UAV-A-001", "serial_no": "SN-A001"}, "signature": "${tc1_sig2}"}, ExpectCode: 0},
		{Path: "/api/crosschain/send", Body: map[string]any{
			"message_type": "MISSION_REVIEW_RESULT", "business_id": "TC1-04-BAD",
			"source_chain": "fisco-bcos", "final_target_chain": "fabric",
			"payload": map[string]any{
				"review_id": "TC1-04-BAD", "application_id": "APP-TC1-04-BAD", "mission_id": "MISSION-2026-001",
				"result": "APPROVED", "reviewer": "FISCO-ADMIN",
			},
			"sm9_identity": "SM9-ID-FISCO-ADMIN", "signature": "QUFBQUFBQUFBQQ==",
		}, ExpectCode: 1002, Capture: map[string]string{"tc1_bad_tx": "data.cross_tx_id"}},
		{Path: "/api/crosschain/query", Body: map[string]any{"cross_tx_id": "${tc1_bad_tx}"}, ExpectCode: 0},
	}},
	{ID: "TC1-05", Name: "多运营商冲突检测", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/review/submit", Body: reviewApproved("${tc1_app}", "同意执行"), ExpectCode: 0},
		{Path: "/api/mission/create", Body: b002Create(), ExpectCode: 0},
		{Path: "/api/mission/submit", Body: map[string]any{"mission_id": "MISSION-B-002", "operator": "Operator-B"}, ExpectCode: 0, Capture: map[string]string{"tc1_bapp": "data.application.application_id"}},
		{Path: "/api/conflict/detect", Body: map[string]any{"mission_id": "MISSION-B-002"}, ExpectCode: 0, Capture: map[string]string{"tc1_cfl": "data.conflicts.0.conflict_id"}},
		{Path: "/api/mission/query", Body: map[string]any{"mission_id": "MISSION-B-002"}, ExpectCode: 0},
		{Path: "/api/mission/query", Body: map[string]any{"mission_id": "MISSION-2026-001"}, ExpectCode: 0},
	}},
	{ID: "TC1-06", Name: "冲突协调后放行", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/conflict/resolve", Body: map[string]any{"conflict_id": "${tc1_cfl}", "resolution": "时间窗后移30分钟", "operator": "Operator-B"}, ExpectCode: 0},
		{Path: "/api/review/submit", Body: reviewApproved("${tc1_bapp}", "协调后同意执行"), ExpectCode: 0},
		{Path: "/api/mission/query", Body: map[string]any{"mission_id": "MISSION-B-002"}, ExpectCode: 0},
		{Path: "/api/mission/query", Body: map[string]any{"mission_id": "MISSION-2026-001"}, ExpectCode: 0},
	}},
	{ID: "TC1-07", Name: "许可签发与验证", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/pass/issue", Body: map[string]any{"mission_id": "MISSION-2026-001", "issuer": "FISCO-ADMIN", "valid_from": "${now-1h}", "valid_to": "${now+1h}"}, ExpectCode: 0},
		{Path: "/api/pass/verify", Body: map[string]any{"pass_id": "PASS-2026-001"}, ExpectCode: 0},
	}},
	{ID: "TC1-08", Name: "跨链批量吞吐", System: "system1", Steps: []ScenarioStep{
		{Path: "/api/experiment/run", Body: map[string]any{"experiment_type": "CROSSCHAIN_LOOP", "count": 100}, ExpectCode: 0},
		{Path: "/api/experiment/list", Body: map[string]any{}, ExpectCode: 0},
	}},
	{ID: "TC2-01", Name: "会话建立与SM9认证", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/session/open", Body: map[string]any{"uav_id": "UAV-A-001"}, ExpectCode: 0, Capture: map[string]string{"s1": "data.session.session_id"}},
	}},
	{ID: "TC2-02", Name: "吊销许可拒绝", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/pass/revoke", Body: map[string]any{"pass_id": "PASS-2026-001", "reason": "任务结束", "operator": "FISCO-ADMIN"}, ExpectCode: 0},
		{Path: "/api/pass/verify", Body: map[string]any{"pass_id": "PASS-2026-001"}, ExpectCode: 0},
	}},
	{ID: "TC2-03", Name: "正常持续交互", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/message/send", Body: map[string]any{"session_id": "${s1}", "msg_type": "HEARTBEAT", "source_node": "UAV-A-001-NODE", "target_node": "MGR"}, ExpectCode: 0},
		{Path: "/api/message/send", Body: map[string]any{"session_id": "${s1}", "msg_type": "HEARTBEAT", "source_node": "UAV-A-001-NODE", "target_node": "MGR"}, ExpectCode: 0},
		{Path: "/api/message/list", Body: map[string]any{"session_id": "${s1}"}, ExpectCode: 0},
	}},
	{ID: "TC2-04", Name: "虫洞隧道部署", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/topology/get", Body: map[string]any{}, ExpectCode: 0},
		{Path: "/api/wormhole/toggle", Body: map[string]any{"enabled": true, "operator": "ATTACKER-SIM"}, ExpectCode: 0},
		{Path: "/api/topology/get", Body: map[string]any{}, ExpectCode: 0},
	}},
	{ID: "TC2-05", Name: "虫洞检测与隔离", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/session/open", Body: map[string]any{"uav_id": "UAV-A-001"}, ExpectCode: 0, Capture: map[string]string{"s2": "data.session.session_id"}},
		{Path: "/api/message/send", Body: map[string]any{"session_id": "${s2}", "msg_type": "POSITION_UPDATE", "source_node": "UAV-A-001-NODE", "target_node": "MGR"}, ExpectCode: 0},
		{Path: "/api/risk/evaluate", Body: map[string]any{"session_id": "${s2}"}, ExpectCode: 0},
		{Path: "/api/node/list", Body: map[string]any{"node_type": "ATTACKER"}, ExpectCode: 0},
		{Path: "/api/event/list", Body: map[string]any{"session_id": "${s2}"}, ExpectCode: 0},
	}},
	{ID: "TC2-06", Name: "自动规避切换", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/path/switch", Body: map[string]any{"session_id": "${s2}", "operator": "OP-1"}, ExpectCode: 0},
	}},
	{ID: "TC2-07", Name: "交互恢复", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/message/send", Body: map[string]any{"session_id": "${s2}", "msg_type": "ROUTE_STATUS", "source_node": "UAV-A-001-NODE", "target_node": "MGR"}, ExpectCode: 0},
		{Path: "/api/session/list", Body: map[string]any{"status": "ACTIVE"}, ExpectCode: 0},
	}},
	{ID: "TC2-08", Name: "攻防对比实验", System: "system2", Steps: []ScenarioStep{
		{Path: "/api/demo/reset", Body: map[string]any{}, ExpectCode: 0},
		{Path: "/api/demo/init", Body: map[string]any{}, ExpectCode: 0},
		{Path: "/api/experiment/run", Body: map[string]any{"experiment_type": "MESSAGE_FLOW", "scenario": "NORMAL", "count": 100}, ExpectCode: 0},
		{Path: "/api/experiment/run", Body: map[string]any{"experiment_type": "MESSAGE_FLOW", "scenario": "ATTACK", "count": 100}, ExpectCode: 0},
		{Path: "/api/experiment/run", Body: map[string]any{"experiment_type": "MESSAGE_FLOW", "scenario": "DEFENSE", "count": 100}, ExpectCode: 0},
		{Path: "/api/experiment/list", Body: map[string]any{}, ExpectCode: 0},
		{Path: "/api/experiment/export", Body: map[string]any{}, ExpectCode: 0},
	}},
	{ID: "TC3-01", Name: "匿名告警登记", System: "system3", Steps: []ScenarioStep{
		{Path: "/api/mission/create", Body: missionMainline(), ExpectCode: 0},
		{Path: "/api/mission/submit", Body: map[string]any{"mission_id": "MISSION-2026-001", "operator": "Operator-A"}, ExpectCode: 0, Capture: map[string]string{"tc3_app": "data.application.application_id"}},
		{Path: "/api/review/submit", Body: reviewApproved("${tc3_app}", "同意执行"), ExpectCode: 0},
		{Path: "/api/pass/issue", Body: map[string]any{"mission_id": "MISSION-2026-001", "issuer": "FISCO-ADMIN", "valid_from": "${now-1h}", "valid_to": "${now+1h}"}, ExpectCode: 0},
		{Path: "/api/alert/raise", Body: map[string]any{"alert_id": "ALERT-2026-001", "mission_id": "MISSION-2026-001", "uav_pseudonym": "PSEUDO-UAV-83921", "event_type": "ROUTE_DEVIATION", "risk_level": "HIGH", "source_system": "MANUAL", "operator": "REG-01"}, ExpectCode: 0},
		{Path: "/api/alert/list", Body: map[string]any{}, ExpectCode: 0},
	}},
	{ID: "TC3-02", Name: "亚秒七级身份追踪", System: "system3", Steps: []ScenarioStep{
		{Path: "/api/trace/identity", Body: map[string]any{"alert_id": "ALERT-2026-001", "operator": "REG-01"}, ExpectCode: 0},
	}},
	{ID: "TC3-03", Name: "断链留痕", System: "system3", Steps: []ScenarioStep{
		{Path: "/api/trace/identity", Body: map[string]any{"pseudo": "PSEUDO-UNKNOWN-999", "operator": "REG-01"}, ExpectCode: 5001},
		{Path: "/api/audit/query", Body: map[string]any{"action": "TRACE_IDENTITY_BROKEN"}, ExpectCode: 0},
	}},
	{ID: "TC3-04", Name: "未授权核验封缄", System: "system3", Steps: []ScenarioStep{
		{Path: "/api/inspect/ciphertext", Body: map[string]any{"mission_id": "MISSION-2026-001", "regulator_id": "REG-01"}, ExpectCode: 5002},
		{Path: "/api/audit/query", Body: map[string]any{"action": "INSPECT_UNAUTHORIZED"}, ExpectCode: 0},
	}},
	{ID: "TC3-05", Name: "授权闭环与密文核验", System: "system3", Steps: []ScenarioStep{
		{Path: "/api/authorize/apply", Body: map[string]any{"authorization_id": "AUTH-2026-001", "regulator_id": "REG-01", "scope": []any{"MISSION", "ROUTE", "PAYLOAD", "IDENTITY"}, "target_type": "MISSION", "target_id": "MISSION-2026-001", "reason": "核查告警 ALERT-2026-001"}, ExpectCode: 0},
		{Path: "/api/authorize/review", Body: map[string]any{"authorization_id": "AUTH-2026-001", "decision": "APPROVE", "reviewer_id": "REG-ADMIN", "comment": "同意"}, ExpectCode: 0},
		{Path: "/api/inspect/ciphertext", Body: map[string]any{"mission_id": "MISSION-2026-001", "authorization_id": "AUTH-2026-001", "regulator_id": "REG-01", "trajectory": "NORMAL", "payload_type": "CAMERA"}, ExpectCode: 0},
	}},
	{ID: "TC3-06", Name: "航路偏航核验", System: "system3", Steps: []ScenarioStep{
		{Path: "/api/inspect/ciphertext", Body: map[string]any{"mission_id": "MISSION-2026-001", "authorization_id": "AUTH-2026-001", "regulator_id": "REG-01", "trajectory": "DEVIATION"}, ExpectCode: 0},
		{Path: "/api/alert/list", Body: map[string]any{"source_system": "SYSTEM3"}, ExpectCode: 0},
	}},
	{ID: "TC3-07", Name: "审计上链与导出", System: "system3", Steps: []ScenarioStep{
		{Path: "/api/inspect/ciphertext", Body: map[string]any{"mission_id": "MISSION-2026-001", "authorization_id": "AUTH-2026-001", "regulator_id": "REG-01", "trajectory": "NORMAL"}, ExpectCode: 0},
		{Path: "/api/regulatory/audit/list", Body: map[string]any{"action": "INSPECT"}, ExpectCode: 0},
		{Path: "/api/regulatory/audit/export", Body: map[string]any{}, ExpectCode: 0},
	}},
	{ID: "TC3-08", Name: "批量追踪吞吐", System: "system3", Steps: []ScenarioStep{
		{Path: "/api/experiment/run", Body: map[string]any{"experiment_type": "TRACE_BATCH", "count": 100}, ExpectCode: 0, Capture: map[string]string{"tc3_run": "data.run_id"}},
		{Path: "/api/experiment/result", Body: map[string]any{"run_id": "${tc3_run}"}, ExpectCode: 0},
	}},
}
