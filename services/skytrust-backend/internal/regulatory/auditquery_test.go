package regulatory

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"skytrust-backend/internal/model"
)

func seedRegAudits(t *testing.T, svc *Service) {
	t.Helper()
	for i := 1; i <= 5; i++ {
		ra := &model.RegulatoryAudit{
			AuditID: fmt.Sprintf("AUD-T6-%03d", i), AlertID: "ALERT-T6-001",
			AuthorizationID: "AUTH-T6-001", Action: "INSPECT", OperatorID: "REG-01",
			Target: "MISSION-T6", Result: `{"route_verdict":"ROUTE_OK"}`,
			AuditHash: strings.Repeat("a", 64), ChainTxID: fmt.Sprintf("CHAINMAKER-T6-%03d", i),
		}
		if err := svc.db.Create(ra).Error; err != nil {
			t.Fatal(err)
		}
	}
	other := &model.RegulatoryAudit{
		AuditID: "AUD-T6-006", AuthorizationID: "AUTH-T6-002", Action: "AUTH_APPROVE",
		OperatorID: "REG-ADMIN", Target: "AUTH-T6-002", Result: `{"decision":"APPROVE"}`,
		AuditHash: strings.Repeat("b", 64), ChainTxID: "CHAINMAKER-T6-006",
	}
	if err := svc.db.Create(other).Error; err != nil {
		t.Fatal(err)
	}
}

func TestRegAuditListFilterPaging(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	seedRegAudits(t, svc)
	ctx := context.Background()
	// Action 过滤
	recs, total, err := svc.RegAuditList(ctx, &RegAuditQuery{Action: "INSPECT"})
	if err != nil || total != 5 || len(recs) != 5 {
		t.Fatalf("INSPECT: %d/%d err=%v", len(recs), total, err)
	}
	// AuthorizationID 过滤
	_, total2, err := svc.RegAuditList(ctx, &RegAuditQuery{AuthorizationID: "AUTH-T6-002"})
	if err != nil || total2 != 1 {
		t.Fatalf("auth filter: %d err=%v", total2, err)
	}
	// AlertID 过滤（AUD-T6-006 无 alert_id → 不命中）
	_, total3, err := svc.RegAuditList(ctx, &RegAuditQuery{AlertID: "ALERT-T6-001"})
	if err != nil || total3 != 5 {
		t.Fatalf("alert filter: %d err=%v", total3, err)
	}
	// OperatorID 过滤
	_, total4, err := svc.RegAuditList(ctx, &RegAuditQuery{OperatorID: "REG-ADMIN"})
	if err != nil || total4 != 1 {
		t.Fatalf("operator filter: %d err=%v", total4, err)
	}
	// 分页 + 降序（created_at DESC, audit_id DESC——同秒内按 audit_id 兜底）
	recs5, total5, err := svc.RegAuditList(ctx, &RegAuditQuery{Action: "INSPECT", Page: 2, PageSize: 2})
	if err != nil || total5 != 5 || len(recs5) != 2 {
		t.Fatalf("page2: %d/%d err=%v", len(recs5), total5, err)
	}
	for i := 0; i+1 < len(recs5); i++ {
		a, b := recs5[i], recs5[i+1]
		if a.CreatedAt.Before(b.CreatedAt.Time) ||
			(a.CreatedAt.Equal(b.CreatedAt.Time) && a.AuditID <= b.AuditID) {
			t.Fatalf("order violated: %s vs %s", a.AuditID, b.AuditID)
		}
	}
	// Normalize：非法分页参数回退默认
	q := &RegAuditQuery{Page: -1, PageSize: 9999}
	q.Normalize()
	if q.Page != 1 || q.PageSize != 20 {
		t.Fatalf("normalize: %+v", q)
	}
}

func TestRegAuditExportCSV(t *testing.T) {
	svc, _, _, _ := newTestSvc(t)
	seedRegAudits(t, svc)
	content, rows, err := svc.RegAuditExport(context.Background(), &RegAuditQuery{Action: "INSPECT"})
	if err != nil || rows != 5 {
		t.Fatalf("export: rows=%d err=%v", rows, err)
	}
	text := string(content)
	if !strings.HasPrefix(text, "audit_id,alert_id,authorization_id,action,operator_id,target,result,audit_hash,chain_tx_id,created_at") {
		t.Fatalf("header: %.120q", text)
	}
	if !strings.Contains(text, "AUD-T6-001") || !strings.Contains(text, "CHAINMAKER-T6-005") ||
		strings.Contains(text, "AUD-T6-006") {
		t.Fatalf("rows leaked/missing:\n%s", text)
	}
	lines := strings.Split(strings.TrimSpace(text), "\n")
	if len(lines) != 6 { // header + 5
		t.Fatalf("lines = %d, want 6", len(lines))
	}
}
