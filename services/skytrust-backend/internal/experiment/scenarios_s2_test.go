package experiment

import (
	"context"
	"strings"
	"testing"

	"skytrust-backend/internal/model"
	"skytrust-backend/internal/offchain"
)

// TestRunMessageFlowNormal NORMAL：虫洞关闭 + 干净会话；12 次迭代恰好轮满 6 类消息 ×2。
func TestRunMessageFlowNormal(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "MESSAGE_FLOW", Scenario: "NORMAL", Count: 12})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 12 || run.SuccessRate != 1 {
		t.Fatalf("run = %+v", run)
	}
	var total int64
	svc.db.Model(&model.OffchainMessage{}).Count(&total)
	if total != 12 {
		t.Fatalf("messages = %d, want 12", total)
	}
	for _, mt := range msgRotation {
		var cnt int64
		svc.db.Model(&model.OffchainMessage{}).Where("msg_type = ?", mt).Count(&cnt)
		if cnt != 2 {
			t.Errorf("msg_type %s = %d, want 2", mt, cnt)
		}
	}
}

// TestRunMessageFlowAttack ATTACK 诚实基线：消息全部成功且全走隧道，零检测事件。
func TestRunMessageFlowAttack(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "MESSAGE_FLOW", Scenario: "ATTACK", Count: 6})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessRate != 1 {
		t.Fatalf("run = %+v", run)
	}
	var msgs []model.OffchainMessage
	if err := svc.db.Find(&msgs).Error; err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 6 {
		t.Fatalf("messages = %d, want 6", len(msgs))
	}
	for _, m := range msgs {
		if !strings.Contains(m.Path, offchain.NodeXID) {
			t.Errorf("message %s path %q must traverse the tunnel", m.MessageID, m.Path)
		}
	}
	var evCnt int64
	svc.db.Model(&model.WormholeEvent{}).Count(&evCnt)
	if evCnt != 0 {
		t.Errorf("wormhole events = %d, want 0 (attack undetected baseline)", evCnt)
	}
	var x model.NetworkNode
	if err := svc.db.Where("node_id = ?", offchain.NodeXID).First(&x).Error; err != nil {
		t.Fatal(err)
	}
	if x.Status != "ONLINE" {
		t.Errorf("NODE-X = %s, want ONLINE", x.Status)
	}
}

// TestRunMessageFlowDefense 攻防闭环：诱饵→DETECT→ISOLATE→RECOVER→干净路径全成；
// 第二轮同服务再跑 DEFENSE 走 4001 跳过分支（已防御），依然全成且不产生新事件。
func TestRunMessageFlowDefense(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	run1, err := svc.Run(ctx, "TRACE-T", &RunRequest{ExperimentType: "MESSAGE_FLOW", Scenario: "DEFENSE", Count: 6})
	if err != nil {
		t.Fatalf("run1: %v", err)
	}
	if run1.Status != "DONE" || run1.SuccessRate != 1 {
		t.Fatalf("run1 = %+v", run1)
	}
	for _, action := range []string{"DETECT", "ISOLATE", "RECOVER"} {
		var cnt int64
		svc.db.Model(&model.WormholeEvent{}).Where("action = ?", action).Count(&cnt)
		if cnt != 1 {
			t.Errorf("%s events = %d, want 1", action, cnt)
		}
	}
	for _, id := range []string{offchain.NodeXID, offchain.NodeYID} {
		var n model.NetworkNode
		if err := svc.db.Where("node_id = ?", id).First(&n).Error; err != nil {
			t.Fatal(err)
		}
		if n.Status != "ISOLATED" {
			t.Errorf("%s = %s, want ISOLATED", id, n.Status)
		}
	}
	var tunnel int64
	svc.db.Model(&model.OffchainMessage{}).Where("path LIKE ?", "%"+offchain.NodeXID+"%").Count(&tunnel)
	if tunnel != 1 {
		t.Errorf("tunnel messages = %d, want 1 (lure only)", tunnel)
	}

	run2, err := svc.Run(ctx, "TRACE-T", &RunRequest{ExperimentType: "MESSAGE_FLOW", Scenario: "DEFENSE", Count: 6})
	if err != nil {
		t.Fatalf("run2 (already-defended branch): %v", err)
	}
	if run2.Status != "DONE" || run2.SuccessRate != 1 {
		t.Fatalf("run2 = %+v", run2)
	}
	var detCnt int64
	svc.db.Model(&model.WormholeEvent{}).Where("action = ?", "DETECT").Count(&detCnt)
	if detCnt != 1 {
		t.Errorf("DETECT events after run2 = %d, want still 1", detCnt)
	}
	var msgTotal int64
	svc.db.Model(&model.OffchainMessage{}).Count(&msgTotal)
	if msgTotal != 13 {
		t.Errorf("messages = %d, want 13 (1 lure + 6 + 6)", msgTotal)
	}
}

// TestRunRiskScan 清洁条件 10 次扫描全 PASS 且零事件落库（误报 = 实验失败）。
func TestRunRiskScan(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "RISK_SCAN", Count: 10, Concurrency: 2})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 10 || run.SuccessRate != 1 || run.FailureReasons != "{}" {
		t.Fatalf("run = %+v", run)
	}
	var evCnt int64
	svc.db.Model(&model.WormholeEvent{}).Count(&evCnt)
	if evCnt != 0 {
		t.Errorf("wormhole events = %d, want 0 (PASS writes nothing)", evCnt)
	}
}

// TestRunStress 20 次"开会话+发消息"全链路，4 并发无共享竞争 → 全成。
func TestRunStress(t *testing.T) {
	svc := newTestSvc(t)
	run, err := svc.Run(context.Background(), "TRACE-T", &RunRequest{ExperimentType: "STRESS", Count: 20, Concurrency: 4})
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if run.Status != "DONE" || run.SuccessCount != 20 || run.SuccessRate != 1 {
		t.Fatalf("run = %+v", run)
	}
	var sessCnt, msgCnt int64
	svc.db.Model(&model.OffchainSession{}).Count(&sessCnt)
	svc.db.Model(&model.OffchainMessage{}).Count(&msgCnt)
	if sessCnt != 20 || msgCnt != 20 {
		t.Fatalf("sessions/messages = %d/%d, want 20/20", sessCnt, msgCnt)
	}
}
