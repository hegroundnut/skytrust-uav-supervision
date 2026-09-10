package crosschain

import (
	"strings"
	"testing"

	"skytrust-backend/internal/errcode"
)

// validPayload 各消息类型的最小完整载荷（gateway_test.go 复用）。
func validPayload(msgType string) map[string]any {
	switch msgType {
	case MsgUAVRegisterProof:
		return map[string]any{"uav_id": "UAV-A-001", "manufacturer_id": "Manufacturer-B",
			"operator_id": "Operator-A", "serial_no": "SN-A001", "sm9_identity": "SM9-ID-UAV-A-001"}
	case MsgMissionApplication:
		return map[string]any{"mission_id": "MISSION-2026-001", "application_id": "APP-1",
			"operator_id": "Operator-A", "uav_id": "UAV-A-001", "mission_type": "LOGISTICS",
			"start_time": "2026-09-11 09:00:00.000", "end_time": "2026-09-11 11:00:00.000",
			"route_segments": []string{"R101", "R205"}, "sm3_hash": "abc123"}
	case MsgMissionReviewResult:
		return map[string]any{"review_id": "REV-1", "application_id": "APP-1",
			"mission_id": "MISSION-2026-001", "result": "APPROVED", "reviewer": "FISCO-ADMIN"}
	case MsgFlightPass:
		return map[string]any{"pass_id": "PASS-2026-001", "mission_id": "MISSION-2026-001",
			"uav_id": "UAV-A-001", "route": []string{"R101", "R205"},
			"valid_from": "2026-09-11 09:00:00.000", "valid_to": "2026-09-11 11:00:00.000",
			"sm3_hash": "abc123"}
	case MsgPassRevoke:
		return map[string]any{"pass_id": "PASS-2026-001", "mission_id": "MISSION-2026-001",
			"reason": "weather", "operator": "FISCO-ADMIN"}
	}
	return nil
}

func TestCheckRoute(t *testing.T) {
	want := map[string][2]string{
		MsgUAVRegisterProof:    {"fabric", "chainmaker"},
		MsgMissionApplication:  {"fabric", "fisco-bcos"},
		MsgMissionReviewResult: {"fisco-bcos", "fabric"},
		MsgFlightPass:          {"fisco-bcos", "fabric"},
		MsgPassRevoke:          {"fisco-bcos", "fabric"},
	}
	for mt, rt := range want {
		if err := CheckRoute(mt, rt[0], rt[1]); err != nil {
			t.Errorf("%s legal route rejected: %v", mt, err)
		}
		if err := CheckRoute(mt, "chainmaker", rt[1]); err == nil || err.Code != errcode.RegVerify {
			t.Errorf("%s wrong source must give 2003, got %v", mt, err)
		}
	}
	if err := CheckRoute("BOGUS", "fabric", "chainmaker"); err == nil || err.Code != errcode.Param {
		t.Errorf("unknown type must give 6002, got %v", err)
	}
	s, tg, ok := ExpectedRoute(MsgFlightPass)
	if !ok || s != "fisco-bcos" || tg != "fabric" {
		t.Errorf("ExpectedRoute = %s,%s,%v", s, tg, ok)
	}
	if _, _, ok := ExpectedRoute("BOGUS"); ok {
		t.Error("ExpectedRoute unknown must be !ok")
	}
}

func TestCheckPayload(t *testing.T) {
	for _, mt := range ValidMessageTypes() {
		if err := CheckPayload(mt, validPayload(mt)); err != nil {
			t.Errorf("%s valid payload rejected: %v", mt, err)
		}
		// 逐个删除必备字段 → 6002 且文案含字段名
		for field := range validPayload(mt) {
			p := validPayload(mt)
			delete(p, field)
			err := CheckPayload(mt, p)
			if err == nil || err.Code != errcode.Param {
				t.Fatalf("%s missing %s must give 6002, got %v", mt, field, err)
			}
			if !strings.Contains(err.Msg, field) {
				t.Errorf("%s missing %s: message must name the field: %s", mt, field, err.Msg)
			}
		}
	}
	if err := CheckPayload("BOGUS", map[string]any{}); err == nil || err.Code != errcode.Param {
		t.Errorf("unknown type must give 6002, got %v", err)
	}
}

func TestContractMappings(t *testing.T) {
	cases := map[string][2]string{
		MsgUAVRegisterProof:    {ContractRegIdentity, "RegisterIndex"},
		MsgMissionApplication:  {ContractFiscoManage, "SubmitApplication"},
		MsgMissionReviewResult: {ContractFabricOperator, "RecordReview"},
		MsgFlightPass:          {ContractFabricOperator, "RecordPass"},
		MsgPassRevoke:          {ContractFabricOperator, "RecordPassRevoke"},
	}
	for mt, want := range cases {
		c, m := targetContractMethod(mt)
		if c != want[0] || m != want[1] {
			t.Errorf("%s -> %s/%s, want %s/%s", mt, c, m, want[0], want[1])
		}
	}
	if c, m := targetContractMethod("BOGUS"); c != "" || m != "" {
		t.Error("unknown type must map to empty")
	}
	if sourceContract("fabric") != ContractFabricOperator ||
		sourceContract("fisco-bcos") != ContractFiscoManage ||
		sourceContract("chainmaker") != ContractRegRecord {
		t.Error("sourceContract mapping wrong")
	}
}
