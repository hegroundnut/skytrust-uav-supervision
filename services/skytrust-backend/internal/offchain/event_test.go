package offchain

import (
	"context"
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

func TestEventListFiltersAndPaging(t *testing.T) {
	svc := newTestSvc(t)
	ctx := context.Background()
	mk := func(action, sid string) model.WormholeEvent {
		return model.WormholeEvent{
			EventID: model.GenEventID(), SessionID: sid, Action: action,
			NodeX: NodeXID, NodeY: NodeYID, RiskScore: 0.85,
		}
	}
	for _, ev := range []model.WormholeEvent{mk("DETECT", "SESS-a"), mk("ISOLATE", "SESS-a"), mk("RECOVER", "SESS-a"), mk("DETECT", "SESS-b")} {
		e := ev
		if err := svc.db.Create(&e).Error; err != nil {
			t.Fatal(err)
		}
	}
	recs, total, err := svc.EventList(ctx, "TRACE-T", EventQuery{})
	if err != nil || total != 4 || len(recs) != 4 {
		t.Fatalf("all = %d/%d err = %v", len(recs), total, err)
	}
	_, total, _ = svc.EventList(ctx, "TRACE-T", EventQuery{SessionID: "SESS-a"})
	if total != 3 {
		t.Fatalf("session filter = %d", total)
	}
	recs, total, _ = svc.EventList(ctx, "TRACE-T", EventQuery{Action: "DETECT"})
	if total != 2 || len(recs) != 2 {
		t.Fatalf("action filter = %d/%d", len(recs), total)
	}
	_, total, _ = svc.EventList(ctx, "TRACE-T", EventQuery{SessionID: "SESS-a", Action: "RECOVER"})
	if total != 1 {
		t.Fatalf("combo filter = %d", total)
	}
	page, total, _ := svc.EventList(ctx, "TRACE-T", EventQuery{Page: 2, PageSize: 3})
	if total != 4 || len(page) != 1 {
		t.Fatalf("page2 = %d/%d", len(page), total)
	}
	if _, _, err := svc.EventList(ctx, "TRACE-T", EventQuery{Action: "EXPLODE"}); errCodeOf(err) != errcode.Param {
		t.Fatalf("bad action err = %v", err)
	}
}
