package offchain

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"strings"
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// openTestSession 夹具：seed 节点 + 开会话，返回 sessionID。
func openTestSession(t *testing.T, svc *Service) string {
	t.Helper()
	seedFixtureNodes(t, svc)
	res, err := svc.SessionOpen(context.Background(), "TRACE-T", &SessionOpenRequest{UAVID: "UAV-A-001", MissionID: "MISSION-2026-001"})
	if err != nil {
		t.Fatal(err)
	}
	return res.Session.SessionID
}

func TestMessageSendSuccessFlow(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	res, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
		SessionID: sid, MsgType: "HEARTBEAT",
		SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
		Payload: map[string]any{"alt": 120.5},
	})
	if err != nil {
		t.Fatal(err)
	}
	m := res.Message
	if m.Seq != 1 || m.Status != "SUCCESS" || m.SessionID != sid || m.MessageID == "" {
		t.Fatalf("msg = %+v", m)
	}
	if len(m.SM3Hash) != 64 {
		t.Fatalf("sm3 = %q", m.SM3Hash)
	}
	if _, err := hex.DecodeString(m.SM3Hash); err != nil {
		t.Fatalf("sm3 not hex: %v", err)
	}
	if m.LatencyMs <= 0 || m.Timestamp.IsZero() {
		t.Fatalf("msg = %+v", m)
	}
	if len(res.PathDetail) != 5 { // 6 节点路径 = 5 跳
		t.Fatalf("detail = %+v", res.PathDetail)
	}
	var path []string
	if err := json.Unmarshal([]byte(m.Path), &path); err != nil || len(path) != 6 {
		t.Fatalf("path = %q", m.Path)
	}
	// 时延一致性：总和 = 逐跳之和（确定性模型自洽，不硬编码指标值）
	var sum int64
	for _, h := range res.PathDetail {
		sum += h.LatencyMs
	}
	if sum != m.LatencyMs {
		t.Fatalf("sum %d != total %d", sum, m.LatencyMs)
	}
	// evidence 携带可验证签名
	var ev map[string]any
	if err := json.Unmarshal([]byte(m.Evidence), &ev); err != nil {
		t.Fatal(err)
	}
	sig, _ := ev["signature"].(string)
	ok, err := svc.cs.SM9VerifyUserID("SM9-ID-UAV-A-001-NODE", []byte(m.SM3Hash), sig)
	if err != nil || !ok {
		t.Fatalf("evidence signature invalid: %v", err)
	}
	// 第二条：seq 递增
	res2, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
		SessionID: sid, MsgType: "POSITION_UPDATE", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
	})
	if err != nil || res2.Message.Seq != 2 {
		t.Fatalf("res2 = %+v err = %v", res2, err)
	}
	// 会话 CurrentPath 已同步为实际路由
	var sess model.OffchainSession
	if err := svc.db.First(&sess, "session_id = ?", sid).Error; err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sess.CurrentPath, `"N1"`) {
		t.Fatalf("current path = %q", sess.CurrentPath)
	}
}

func TestMessageSendValidation(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	// 会话不存在 → 6002
	if _, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{SessionID: "SESS-none", MsgType: "HEARTBEAT", SourceNode: "N1", TargetNode: "MGR"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("missing session err = %v", err)
	}
	// msg_type 非法 → 6002
	if _, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{SessionID: sid, MsgType: "TELEMETRY", SourceNode: "N1", TargetNode: "MGR"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("type err = %v", err)
	}
	// 节点不存在 → 4003
	if _, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{SessionID: sid, MsgType: "HEARTBEAT", SourceNode: "GHOST", TargetNode: "MGR"}); errCodeOf(err) != errcode.NodeIdentity {
		t.Fatalf("node err = %v", err)
	}
	// 不可达 → 4004 + FAILED 留痕行
	if err := svc.db.Model(&model.NetworkNode{}).Where("node_id = ?", "N3").Update("status", "ISOLATED").Error; err != nil {
		t.Fatal(err)
	}
	res, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{SessionID: sid, MsgType: "HEARTBEAT", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR"})
	if errCodeOf(err) != errcode.PathUnreachable {
		t.Fatalf("unreach err = %v", err)
	}
	if res == nil || res.Message.Status != "FAILED" || res.Message.MessageID == "" {
		t.Fatalf("failed row = %+v", res)
	}
	failed, total, _, err := svc.MessageList(ctx, "TRACE-T", MessageQuery{SessionID: sid, Status: "FAILED"})
	if err != nil || total != 1 || failed[0].MessageID != res.Message.MessageID {
		t.Fatalf("failed list = %d err = %v", total, err)
	}
	if err := svc.db.Model(&model.NetworkNode{}).Where("node_id = ?", "N3").Update("status", "ONLINE").Error; err != nil {
		t.Fatal(err)
	}
	// 已关闭会话 → 4002
	if _, err := svc.SessionClose(ctx, "TRACE-T", &SessionCloseRequest{SessionID: sid, Operator: "OP-1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{SessionID: sid, MsgType: "HEARTBEAT", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR"}); errCodeOf(err) != errcode.SessionAuth {
		t.Fatalf("closed err = %v", err)
	}
}

func TestMessageListStatsAndPagination(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	for i := 0; i < 5; i++ {
		if _, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
			SessionID: sid, MsgType: "HEARTBEAT", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
		}); err != nil {
			t.Fatal(err)
		}
	}
	recs, total, stats, err := svc.MessageList(ctx, "TRACE-T", MessageQuery{SessionID: sid})
	if err != nil || total != 5 || len(recs) != 5 {
		t.Fatalf("list = %d/%d err = %v", len(recs), total, err)
	}
	if stats.Count != 5 || stats.SuccessCount != 5 || stats.SuccessRate != 1.0 {
		t.Fatalf("stats = %+v", stats)
	}
	// 只断言关系（Constraint 11）
	if stats.P50LatencyMs > stats.P95LatencyMs || stats.P95LatencyMs > stats.MaxLatencyMs {
		t.Fatalf("percentile order = %+v", stats)
	}
	if float64(stats.P50LatencyMs) > stats.AvgLatencyMs*2 || stats.AvgLatencyMs <= 0 {
		t.Fatalf("avg = %+v", stats)
	}
	// 分页：records 截页，stats 仍对全集
	page, total, stats2, err := svc.MessageList(ctx, "TRACE-T", MessageQuery{SessionID: sid, Page: 1, PageSize: 2})
	if err != nil || total != 5 || len(page) != 2 || stats2.Count != 5 {
		t.Fatalf("page = %d/%d stats = %+v", len(page), total, stats2)
	}
	// msg_type 过滤 + 非法过滤值 → 6002
	_, total, _, err = svc.MessageList(ctx, "TRACE-T", MessageQuery{MsgType: "HEARTBEAT"})
	if err != nil || total != 5 {
		t.Fatalf("type filter = %d err = %v", total, err)
	}
	if _, _, _, err := svc.MessageList(ctx, "TRACE-T", MessageQuery{MsgType: "TELEMETRY"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("bad type filter err = %v", err)
	}
	if _, _, _, err := svc.MessageList(ctx, "TRACE-T", MessageQuery{Status: "MAYBE"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("bad status filter err = %v", err)
	}
	// Percentile 单元语义
	if Percentile([]int64{}, 0.5) != 0 || Percentile([]int64{7}, 0.95) != 7 ||
		Percentile([]int64{1, 2, 3, 4, 5}, 0.5) != 3 || Percentile([]int64{1, 2, 3, 4, 5}, 0.95) != 5 {
		t.Fatal("percentile broken")
	}
}

func TestMessageSendDegradedAndRecoveredNormalization(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	var sess model.OffchainSession
	if err := svc.db.First(&sess, "session_id = ?", sid).Error; err != nil {
		t.Fatal(err)
	}
	// ACTIVE → DEGRADED（模拟检测后果）；DEGRADED 期间仍可发送（P3-8）
	if err := svc.transition(ctx, "TRACE-T", &sess, "DEGRADED", "TEST", "simulate detect"); err != nil {
		t.Fatal(err)
	}
	res, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
		SessionID: sid, MsgType: "HEARTBEAT", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
	})
	if err != nil || res.Message.Status != "SUCCESS" {
		t.Fatalf("degraded send = %+v err = %v", res, err)
	}
	// DEGRADED → RECOVERED；再发送成功后自动回归 ACTIVE
	if err := svc.transition(ctx, "TRACE-T", &sess, "RECOVERED", "TEST", "simulate switch"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
		SessionID: sid, MsgType: "ROUTE_STATUS", SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
	}); err != nil {
		t.Fatal(err)
	}
	if err := svc.db.First(&sess, "session_id = ?", sid).Error; err != nil {
		t.Fatal(err)
	}
	if sess.Status != "ACTIVE" {
		t.Fatalf("status after recovered send = %s", sess.Status)
	}
}

// TestMessageSeqUniqueIndex 终审加固：(session_id, seq) 复合唯一索引在 DB 层强制生效，
// 直接插入重复 seq 必须被拒绝；业务路径下一条消息正常取得 seq 2。
func TestMessageSeqUniqueIndex(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	res, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
		SessionID: sid, MsgType: "HEARTBEAT",
		SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
	})
	if err != nil || res.Message.Seq != 1 {
		t.Fatalf("res = %+v err = %v", res, err)
	}
	// 绕过业务层直插同 (session_id, seq) 的重复行 → 唯一索引必须拒绝
	dupErr := svc.db.Create(&model.OffchainMessage{
		SessionID: sid, MessageID: model.GenMessageID(), MsgType: "HEARTBEAT",
		SourceNode: "UAV-A-001-NODE", TargetNode: "MGR", Seq: 1,
		Status: "SUCCESS", Path: "[]", Timestamp: timex.NowT(), LatencyMs: 1,
	}).Error
	if dupErr == nil {
		t.Fatalf("duplicate (session_id=%s, seq=1) insert must fail", sid)
	}
	// 业务路径不受影响：下一条消息 seq 递增为 2
	res2, err := svc.MessageSend(ctx, "TRACE-T", &MessageSendRequest{
		SessionID: sid, MsgType: "HEARTBEAT",
		SourceNode: "UAV-A-001-NODE", TargetNode: "MGR",
	})
	if err != nil || res2.Message.Seq != 2 {
		t.Fatalf("res2 = %+v err = %v", res2, err)
	}
}
