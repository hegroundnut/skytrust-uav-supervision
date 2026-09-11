package offchain

import (
	"context"
	"strings"
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

func TestPathSwitchRecoversSession(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := attackScenario(t, svc, 2)
	if _, err := svc.RiskEvaluate(ctx, "TRACE-T", &RiskEvaluateRequest{SessionID: sid}); err != nil {
		t.Fatal(err) // DETECT → DEGRADED + X/Y ISOLATED
	}
	res, err := svc.PathSwitch(ctx, "TRACE-T", &PathSwitchRequest{SessionID: sid, Operator: "OP-1"})
	if err != nil {
		t.Fatal(err)
	}
	if res.Session.Status != "RECOVERED" {
		t.Fatalf("status = %s", res.Session.Status)
	}
	want := []string{"UAV-A-001-NODE", "N1", "N2", "N3", "N4", "MGR"}
	if len(res.NewPath) != len(want) {
		t.Fatalf("new path = %v", res.NewPath)
	}
	for i := range want {
		if res.NewPath[i] != want[i] {
			t.Fatalf("new path = %v", res.NewPath)
		}
	}
	if !strings.Contains(res.Event.OriginalPath, NodeXID) || strings.Contains(res.Event.NewPath, NodeXID) {
		t.Fatalf("event paths: orig=%q new=%q", res.Event.OriginalPath, res.Event.NewPath)
	}
	if res.Event.Action != "RECOVER" || res.Event.EventID == "" || res.Event.SessionID != sid {
		t.Fatalf("event = %+v", res.Event)
	}
	if res.RecoveryLatencyMs <= 0 || res.Event.RecoveryLatencyMs != res.RecoveryLatencyMs {
		t.Fatalf("recovery = %d event = %d", res.RecoveryLatencyMs, res.Event.RecoveryLatencyMs)
	}
	if res.Event.RiskScore != 1.0 { // 继承最近 DETECT 事件分数
		t.Fatalf("event risk = %v", res.Event.RiskScore)
	}
	// DB 同步：会话 CurrentPath 已切至可信路径
	var sess model.OffchainSession
	if err := svc.db.First(&sess, "session_id = ?", sid).Error; err != nil {
		t.Fatal(err)
	}
	if sess.Status != "RECOVERED" || !strings.Contains(sess.CurrentPath, `"N2"`) || strings.Contains(sess.CurrentPath, NodeXID) {
		t.Fatalf("sess = %+v", sess)
	}
	// 恢复后发消息 → 成功且 RECOVERED→ACTIVE 归一化（Task 7）；时延关系：可信绕行 > 隧道抄近
	attackMsgs, _, _, err := svc.MessageList(ctx, "TRACE-T", MessageQuery{SessionID: sid, MsgType: "POSITION_UPDATE"})
	if err != nil || len(attackMsgs) != 1 {
		t.Fatalf("attack msgs = %v err = %v", attackMsgs, err)
	}
	rec, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
		SessionID: sid, MsgType: "ROUTE_STATUS", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
	})
	if err != nil {
		t.Fatal(err)
	}
	if rec.Message.LatencyMs <= attackMsgs[0].LatencyMs {
		t.Fatalf("recovered %d must exceed attack %d (defense costs the detour)", rec.Message.LatencyMs, attackMsgs[0].LatencyMs)
	}
	if err := svc.db.First(&sess, "session_id = ?", sid).Error; err != nil || sess.Status != "ACTIVE" {
		t.Fatalf("sess after send = %+v err = %v", sess, err)
	}
}

func TestPathSwitchStateGuards(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	// ACTIVE 会话不可 switch → 4002
	if _, err := svc.PathSwitch(ctx, "TRACE-T", &PathSwitchRequest{SessionID: sid, Operator: "OP-1"}); errCodeOf(err) != errcode.SessionAuth {
		t.Fatalf("active err = %v", err)
	}
	// 会话不存在 → 6002
	if _, err := svc.PathSwitch(ctx, "TRACE-T", &PathSwitchRequest{SessionID: "SESS-none", Operator: "OP-1"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("missing err = %v", err)
	}
	// 人工降级
	var sess model.OffchainSession
	if err := svc.db.First(&sess, "session_id = ?", sid).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.transition(ctx, "TRACE-T", &sess, "DEGRADED", "TEST", "sim"); err != nil {
		t.Fatal(err)
	}
	// 手动路径端点不符 → 6002
	if _, err := svc.PathSwitch(ctx, "TRACE-T", &PathSwitchRequest{SessionID: sid, Operator: "OP-1",
		NewPath: []string{"N1", "N2"}}); errCodeOf(err) != errcode.Param {
		t.Fatalf("endpoints err = %v", err)
	}
	// 手动路径逐跳不相邻 → 6002
	if _, err := svc.PathSwitch(ctx, "TRACE-T", &PathSwitchRequest{SessionID: sid, Operator: "OP-1",
		NewPath: []string{"UAV-A-001-NODE", "N2", "N3", "N4", "MGR"}}); errCodeOf(err) != errcode.Param {
		t.Fatalf("adjacency err = %v", err)
	}
	// 合法手动路径 → 成功
	res, err := svc.PathSwitch(ctx, "TRACE-T", &PathSwitchRequest{SessionID: sid, Operator: "OP-1",
		NewPath: []string{"UAV-A-001-NODE", "N1", "N2", "N3", "N4", "MGR"}})
	if err != nil || res.Session.Status != "RECOVERED" || res.RecoveryLatencyMs <= 0 {
		t.Fatalf("res = %+v err = %v", res, err)
	}
	// RECOVERED 再 switch → 4002
	if _, err := svc.PathSwitch(ctx, "TRACE-T", &PathSwitchRequest{SessionID: sid, Operator: "OP-1"}); errCodeOf(err) != errcode.SessionAuth {
		t.Fatalf("recovered err = %v", err)
	}
}

func TestPathSwitchUnreachable(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	var sess model.OffchainSession
	if err := svc.db.First(&sess, "session_id = ?", sid).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.transition(ctx, "TRACE-T", &sess, "DEGRADED", "TEST", "sim"); err != nil {
		t.Fatal(err)
	}
	// 隔离中继节点 → 自动重算不可达 → 4004
	if err := svc.db.Model(&model.NetworkNode{}).Where("node_id IN ?", []string{"N2", "N3", "N4"}).
		Update("status", "ISOLATED").Error; err != nil {
		t.Fatal(err)
	}
	if _, err := svc.PathSwitch(ctx, "TRACE-T", &PathSwitchRequest{SessionID: sid, Operator: "OP-1"}); errCodeOf(err) != errcode.PathUnreachable {
		t.Fatalf("unreach err = %v", err)
	}
}
