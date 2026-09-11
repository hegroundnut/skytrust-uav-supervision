package offchain

import (
	"context"
	"testing"
	"time"

	"skytrust-backend/internal/config"
)

func TestAutopilotSendsHeartbeats(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	sid := openTestSession(t, svc)
	ap := NewAutopilot(svc, 20)
	if ap == nil {
		t.Fatal("autopilot must be constructed for interval 20ms")
	}
	ap.Start()
	deadline := time.Now().Add(3 * time.Second)
	var total int64
	for time.Now().Before(deadline) {
		var err error
		_, total, _, err = svc.MessageList(ctx, "TRACE-T", MessageQuery{SessionID: sid})
		if err != nil {
			t.Fatal(err)
		}
		if total >= 2 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	ap.Stop()
	// Stop 已 quiesce 后台循环——重新读取权威 total（消除 poll-loop 读数与在途 tick 的竞争）。
	var errQ error
	_, total, _, errQ = svc.MessageList(ctx, "TRACE-T", MessageQuery{SessionID: sid})
	if errQ != nil {
		t.Fatal(errQ)
	}
	if total < 2 {
		t.Fatalf("autopilot produced %d messages in 3s", total)
	}
	recs, hbTotal, _, err := svc.MessageList(ctx, "TRACE-T", MessageQuery{SessionID: sid, MsgType: "HEARTBEAT"})
	if err != nil || hbTotal != total || int64(len(recs)) != total {
		t.Fatalf("not all HEARTBEAT: %d/%d err=%v", hbTotal, total, err)
	}
	// Stop 后不再新增
	_, after, _, _ := svc.MessageList(ctx, "TRACE-T", MessageQuery{SessionID: sid})
	time.Sleep(100 * time.Millisecond)
	_, after2, _, _ := svc.MessageList(ctx, "TRACE-T", MessageQuery{SessionID: sid})
	if after2 != after {
		t.Fatalf("autopilot kept sending after Stop: %d -> %d", after, after2)
	}
}

func TestAutopilotDisabledByConfig(t *testing.T) {
	svc := newTestSvc(t)
	if NewAutopilot(svc, 0) != nil || NewAutopilot(svc, -5) != nil || NewAutopilot(nil, 10) != nil {
		t.Fatal("disabled config must yield nil autopilot")
	}
	var ap *Autopilot
	ap.Start() // nil-safe：不得 panic
	ap.Stop()
	if cfg := config.Load(); cfg.OffchainAutopilotMs != 0 {
		t.Fatalf("default must be 0 (off), got %d", cfg.OffchainAutopilotMs)
	}
	t.Setenv("OFFCHAIN_AUTOPILOT_MS", "1500")
	if cfg := config.Load(); cfg.OffchainAutopilotMs != 1500 {
		t.Fatalf("env not honored: %d", cfg.OffchainAutopilotMs)
	}
	t.Setenv("OFFCHAIN_AUTOPILOT_MS", "not-a-number")
	if cfg := config.Load(); cfg.OffchainAutopilotMs != 0 {
		t.Fatalf("invalid env must fall back to 0: %d", cfg.OffchainAutopilotMs)
	}
}
