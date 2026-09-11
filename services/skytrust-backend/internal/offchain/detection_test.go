package offchain

import (
	"context"
	"encoding/json"
	"testing"

	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// attackScenario 夹具：seed + 开会话（正常路径）+ n 条基线消息 + 开虫洞 + 1 条隧道路径消息。
// 返回 sessionID。n=2 时攻击消息 seq=3（抖动相位 0），path 维满分可断言。
func attackScenario(t *testing.T, svc *Service, baselineMsgs int) string {
	t.Helper()
	ctx := context.Background()
	sid := openTestSession(t, svc)
	for i := 0; i < baselineMsgs; i++ {
		if _, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
			SessionID: sid, MsgType: "HEARTBEAT", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
		}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(true), Operator: "ATTACKER-SIM"}); err != nil {
		t.Fatal(err)
	}
	res, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
		SessionID: sid, MsgType: "POSITION_UPDATE", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
	})
	if err != nil {
		t.Fatal(err)
	}
	var path []string
	if err := json.Unmarshal([]byte(res.Message.Path), &path); err != nil {
		t.Fatal(err)
	}
	// 前提自检：攻击消息确实走了隧道
	if len(path) != 6 || path[2] != NodeXID || path[3] != NodeYID {
		t.Fatalf("attack msg path = %v", path)
	}
	return sid
}

func TestRiskEvaluatePassOnNormalPath(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	for i := 0; i < 2; i++ {
		if _, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
			SessionID: sid, MsgType: "HEARTBEAT", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
		}); err != nil {
			t.Fatal(err)
		}
	}
	res, err := svc.RiskEvaluate(ctx, "TRACE-T", &RiskEvaluateRequest{SessionID: sid})
	if err != nil {
		t.Fatal(err)
	}
	if res.Verdict != "PASS" || res.RiskScore != 0 || res.Threshold != RiskThreshold {
		t.Fatalf("res = %+v", res)
	}
	d := res.Dimensions
	if d.Identity != 0 || d.Adjacency != 0 || d.Latency != 0 || d.Challenge != 0 || d.Path != 0 {
		t.Fatalf("dims = %+v", d)
	}
	if len(res.Events) != 0 || res.SessionStatus != "ACTIVE" {
		t.Fatalf("events = %v status = %s", res.Events, res.SessionStatus)
	}
}

func TestRiskEvaluateDetectsWormholeWithBaseline(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	// 2 条基线（seq1=45,seq2=50 → baseline=47.5）+ 攻击消息 seq3（抖动 0 → 19 < 23.75 → path 维满分）
	sid := attackScenario(t, svc, 2)
	res, err := svc.RiskEvaluate(ctx, "TRACE-T", &RiskEvaluateRequest{SessionID: sid})
	if err != nil {
		t.Fatal(err)
	}
	if res.Verdict != "DETECT" || res.RiskScore < RiskThreshold {
		t.Fatalf("res = %+v", res)
	}
	d := res.Dimensions
	if d.Identity != 0 || d.Adjacency != 0.35 || d.Latency != 0.25 || d.Challenge != 0.25 || d.Path != 0.15 {
		t.Fatalf("dims = %+v", d)
	}
	if res.RiskScore != 1.0 {
		t.Fatalf("score = %v", res.RiskScore)
	}
	if res.SessionStatus != "DEGRADED" {
		t.Fatalf("session = %s", res.SessionStatus)
	}
	// 事件：DETECT + ISOLATE
	if len(res.Events) != 2 || res.Events[0].Action != "DETECT" || res.Events[1].Action != "ISOLATE" {
		t.Fatalf("events = %+v", res.Events)
	}
	ev := res.Events[0]
	if ev.EventID == "" || ev.SessionID != sid || ev.NodeX != NodeXID || ev.NodeY != NodeYID || ev.RiskScore != 1.0 {
		t.Fatalf("detect event = %+v", ev)
	}
	var dims map[string]any
	if err := json.Unmarshal([]byte(ev.DetectionDimensions), &dims); err != nil {
		t.Fatal(err)
	}
	if dims["verdict"] != "DETECT" || dims["dimensions"] == nil {
		t.Fatalf("dims json = %v", dims)
	}
	// DB 后果：X/Y ISOLATED、邻接清空、全图无残留引用
	for _, id := range []string{NodeXID, NodeYID} {
		n := loadTestNode(t, svc, id)
		if n.Status != "ISOLATED" || n.Neighbors != "[]" || n.RiskScore != 1.0 {
			t.Fatalf("%s = %+v", id, n)
		}
	}
	if hasNeighbor(t, svc, "N1", NodeXID) || hasNeighbor(t, svc, "N4", NodeYID) {
		t.Fatal("anchor refs not purged after isolation")
	}
	// 复评：仍 DETECT，只追加 DETECT 事件（无新 ISOLATE），会话保持 DEGRADED
	res2, err := svc.RiskEvaluate(ctx, "TRACE-T", &RiskEvaluateRequest{SessionID: sid})
	if err != nil {
		t.Fatal(err)
	}
	if res2.Verdict != "DETECT" || res2.SessionStatus != "DEGRADED" || len(res2.Events) != 1 || res2.Events[0].Action != "DETECT" {
		t.Fatalf("res2 = %+v", res2)
	}
}

func TestRiskEvaluateNoHistoryStillDetects(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	seedFixtureNodes(t, svc)
	// 先开虫洞再开会话：初始路径即隧道路径，零消息历史
	if _, err := svc.WormholeToggle(ctx, "TRACE-T", &WormholeToggleRequest{Enabled: boolPtr(true)}); err != nil {
		t.Fatal(err)
	}
	res0, err := svc.SessionOpen(ctx, "TRACE-T", &SessionOpenRequest{UAVID: "UAV-A-001"})
	if err != nil {
		t.Fatal(err)
	}
	res, err := svc.RiskEvaluate(ctx, "TRACE-T", &RiskEvaluateRequest{SessionID: res0.Session.SessionID})
	if err != nil {
		t.Fatal(err)
	}
	// P3-6：无历史 path 维 0，其余三维 0.85 仍 ≥ 0.7
	if res.Dimensions.Path != 0 || res.RiskScore != 0.85 || res.Verdict != "DETECT" {
		t.Fatalf("res = %+v", res)
	}
	if res.SessionStatus != "DEGRADED" || len(res.Events) != 2 {
		t.Fatalf("status = %s events = %d", res.SessionStatus, len(res.Events))
	}
}

func TestRiskEvaluateIdentityVeto(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	// 篡改路径中间节点 N2 的 SM9 身份 → 一票否决
	if err := svc.db.Model(&model.NetworkNode{}).Where("node_id = ?", "N2").
		Update("sm9_identity", "SM9-ID-EVIL").Error; err != nil {
		t.Fatal(err)
	}
	res, err := svc.RiskEvaluate(ctx, "TRACE-T", &RiskEvaluateRequest{SessionID: sid})
	if err != nil {
		t.Fatal(err)
	}
	if res.Verdict != "BLOCK" || res.RiskScore != 1.0 || res.Dimensions.Identity != 1.0 {
		t.Fatalf("res = %+v", res)
	}
	if res.SessionStatus != "DEGRADED" || len(res.Events) != 1 || res.Events[0].Action != "DETECT" {
		t.Fatalf("status = %s events = %+v", res.SessionStatus, res.Events)
	}
	// X/Y 本就 OFFLINE：不发生隔离、不追加 ISOLATE 事件
	if n := loadTestNode(t, svc, NodeXID); n.Status != "OFFLINE" {
		t.Fatalf("x = %s", n.Status)
	}
	// 恢复合法身份后复评 → PASS（篡改可逆，检测无残留）
	if err := svc.db.Model(&model.NetworkNode{}).Where("node_id = ?", "N2").
		Update("sm9_identity", crypto.SM9IdentityOf("N2")).Error; err != nil {
		t.Fatal(err)
	}
	// 会话已 DEGRADED，复评 PASS 不改状态（恢复仅经 path/switch）
	res2, err := svc.RiskEvaluate(ctx, "TRACE-T", &RiskEvaluateRequest{SessionID: sid})
	if err != nil || res2.Verdict != "PASS" || res2.SessionStatus != "DEGRADED" {
		t.Fatalf("res2 = %+v err = %v", res2, err)
	}
	// 会话不存在 → 6002；node_x 不存在 → 4003
	if _, err := svc.RiskEvaluate(ctx, "TRACE-T", &RiskEvaluateRequest{SessionID: "SESS-none"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("missing session err = %v", err)
	}
	if _, err := svc.RiskEvaluate(ctx, "TRACE-T", &RiskEvaluateRequest{SessionID: sid, NodeX: "GHOST"}); errCodeOf(err) != errcode.NodeIdentity {
		t.Fatalf("missing node err = %v", err)
	}
}
