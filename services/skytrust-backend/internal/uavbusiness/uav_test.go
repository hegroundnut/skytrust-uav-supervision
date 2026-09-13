package uavbusiness

import (
	"context"
	"sync"
	"testing"
	"time"

	"gorm.io/gorm"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

func defaultTestSims() map[string]*sim.Chain {
	return map[string]*sim.Chain{
		"fabric":     sim.New("fabric", sim.WithLatency(time.Millisecond)),
		"chainmaker": sim.New("chainmaker", sim.WithLatency(time.Millisecond)),
		"fisco-bcos": sim.New("fisco-bcos", sim.WithLatency(time.Millisecond)),
	}
}

// testSvcWith 构造带完整网关的 Service（Task 8 起业务触链，gw 不可为 nil）。
func testSvcWith(t *testing.T, sims map[string]*sim.Chain) (*Service, *gorm.DB) {
	t.Helper()
	db, err := model.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := model.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	cs, err := crypto.NewService(t.TempDir())
	if err != nil {
		t.Fatalf("crypto: %v", err)
	}
	adapters := make(map[string]chainadapter.ChainAdapter, len(sims))
	for name, c := range sims {
		adapters[name] = c
	}
	auditSvc := audit.New(db)
	gw := crosschain.NewGateway(db, cs, adapters, auditSvc)
	return New(db, cs, gw, auditSvc), db
}

func testSvcFull(t *testing.T) (*Service, *gorm.DB) { return testSvcWith(t, defaultTestSims()) }

func seedParties(t *testing.T, svc *Service) {
	t.Helper()
	ctx := context.Background()
	if _, err := svc.RegisterManufacturer(ctx, "TRACE-T", ManufacturerInput{ManufacturerID: "Manufacturer-M1", Name: "M1"}); err != nil {
		t.Fatalf("seed manufacturer: %v", err)
	}
	if _, err := svc.RegisterOperator(ctx, "TRACE-T", OperatorInput{OperatorID: "Operator-O1", Name: "O1"}); err != nil {
		t.Fatalf("seed operator: %v", err)
	}
}

func TestRegisterUAVFullFlow(t *testing.T) {
	svc, db := testSvcFull(t)
	seedParties(t, svc)
	uav, tx, err := svc.RegisterUAV(context.Background(), "TRACE-T", UAVInput{
		ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", Model: "YX-200", SerialNo: "SN-T-001",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if uav.UAVID != "UAV-O1-001" {
		t.Errorf("auto id = %q, want UAV-O1-001", uav.UAVID)
	}
	if uav.SM9Identity != "SM9-ID-UAV-O1-001" {
		t.Errorf("sm9 identity = %q", uav.SM9Identity)
	}
	if uav.Status != "VERIFIED" {
		t.Errorf("status = %q, want VERIFIED", uav.Status)
	}
	if tx.Status != "SUCCESS" || tx.MessageType != crosschain.MsgUAVRegisterProof {
		t.Fatalf("tx = %+v", tx)
	}
	if tx.SourceChainTxID == "" || tx.RegReceiveTxID == "" || tx.RegRelayTxID == "" || tx.TargetChainTxID == "" {
		t.Errorf("four tx ids required: %+v", tx)
	}
	var cnt int64
	db.Model(&model.AuditLog{}).Where("target_id = ? AND action = ?", uav.UAVID, "STATE_TRANSITION").Count(&cnt)
	if cnt != 2 { // UNREGISTERED→REGISTERED→VERIFIED
		t.Errorf("want 2 STATE_TRANSITION audit rows, got %d", cnt)
	}
}

func TestRegisterUAVAutoIDAndExplicit(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedParties(t, svc)
	ctx := context.Background()
	first, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-T-101"})
	if err != nil {
		t.Fatalf("first: %v", err)
	}
	second, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-T-102"})
	if err != nil {
		t.Fatalf("second: %v", err)
	}
	if first.UAVID != "UAV-O1-001" || second.UAVID != "UAV-O1-002" {
		t.Fatalf("auto ids = %q, %q", first.UAVID, second.UAVID)
	}
	explicit, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{UAVID: "UAV-CUSTOM-9", ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-T-103"})
	if err != nil || explicit.UAVID != "UAV-CUSTOM-9" {
		t.Fatalf("explicit id: %v (%+v)", err, explicit)
	}
	_, _, err = svc.RegisterUAV(ctx, "TRACE-T", UAVInput{UAVID: "UAV-CUSTOM-9", ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-T-104"})
	if codeOf(err) != errcode.Param {
		t.Fatalf("dup explicit id: want 6002, got %v", err)
	}
	_, _, err = svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-T-101"})
	if codeOf(err) != errcode.Param {
		t.Fatalf("dup serial: want 6002, got %v", err)
	}
}

func TestRegisterUAVValidation(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedParties(t, svc)
	ctx := context.Background()
	_, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-NOPE", OperatorID: "Operator-O1", SerialNo: "SN-T-201"})
	if codeOf(err) != errcode.InvalidUAV {
		t.Fatalf("unknown manufacturer: want 1001, got %v", err)
	}
	_, _, err = svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-NOPE", SerialNo: "SN-T-202"})
	if codeOf(err) != errcode.InvalidUAV {
		t.Fatalf("unknown operator: want 1001, got %v", err)
	}
	_, _, err = svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1"})
	if codeOf(err) != errcode.Param {
		t.Fatalf("missing serial: want 6002, got %v", err)
	}
}

func TestRegisterUAVCrosschainFailureAndVerifyRetry(t *testing.T) {
	sims := defaultTestSims()
	sims["chainmaker"] = sim.New("chainmaker", sim.WithFailNext("RegisterReceive", 1))
	svc, db := testSvcWith(t, sims)
	seedParties(t, svc)
	ctx := context.Background()
	uav, tx, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-T-301"})
	if codeOf(err) != errcode.CrosschainSend {
		t.Fatalf("want 2001, got %v", err)
	}
	if uav.Status != "REGISTERED" { // 跨链失败不得 VERIFIED（强制原则 4）
		t.Fatalf("status = %q, want REGISTERED", uav.Status)
	}
	if tx == nil || tx.Status != "FAILED" || tx.VerifyResult != "PASS" || tx.SourceChainTxID == "" {
		t.Fatalf("failed tx record: %+v", tx)
	}
	// VERIFY 重试：复用源链 TxID → 新幂等键 → 成功升 VERIFIED
	uav2, tx2, err := svc.StatusUAV(ctx, "TRACE-T", uav.UAVID, "VERIFY")
	if err != nil {
		t.Fatalf("verify retry: %v", err)
	}
	if uav2.Status != "VERIFIED" || tx2.Status != "SUCCESS" {
		t.Fatalf("after retry: uav=%s tx=%s", uav2.Status, tx2.Status)
	}
	if tx2.SourceChainTxID != tx.SourceChainTxID {
		t.Errorf("retry must reuse source tx: %q vs %q", tx2.SourceChainTxID, tx.SourceChainTxID)
	}
	var cnt int64
	db.Model(&model.CrosschainTx{}).Where("business_id = ?", uav.UAVID).Count(&cnt)
	if cnt != 2 { // 失败留痕 + 成功记录并存
		t.Errorf("want 2 crosschain rows, got %d", cnt)
	}
}

func TestUAVStatusActions(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedParties(t, svc)
	ctx := context.Background()
	uav, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-T-401"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	// VERIFIED 状态下 SUSPEND 非法 → 1004
	if _, _, err := svc.StatusUAV(ctx, "TRACE-T", uav.UAVID, "SUSPEND"); codeOf(err) != errcode.UAVState {
		t.Fatalf("suspend from VERIFIED: want 1004, got %v", err)
	}
	// 未知 action → 6002
	if _, _, err := svc.StatusUAV(ctx, "TRACE-T", uav.UAVID, "BOGUS"); codeOf(err) != errcode.Param {
		t.Fatalf("bogus action: want 6002, got %v", err)
	}
	// 未知 uav → 1001
	if _, _, err := svc.StatusUAV(ctx, "TRACE-T", "UAV-NOPE", "ACTIVATE"); codeOf(err) != errcode.InvalidUAV {
		t.Fatalf("unknown uav: want 1001, got %v", err)
	}
	// VERIFIED→ACTIVE→SUSPENDED→ACTIVE
	for _, step := range []struct{ action, want string }{{"ACTIVATE", "ACTIVE"}, {"SUSPEND", "SUSPENDED"}, {"RESUME", "ACTIVE"}} {
		got, _, err := svc.StatusUAV(ctx, "TRACE-T", uav.UAVID, step.action)
		if err != nil || got.Status != step.want {
			t.Fatalf("%s: status=%v err=%v", step.action, got.Status, err)
		}
	}
	// 已 VERIFIED 再 VERIFY → 1004（VERIFIED→VERIFIED 非法）
	if _, _, err := svc.StatusUAV(ctx, "TRACE-T", uav.UAVID, "VERIFY"); codeOf(err) != errcode.UAVState {
		t.Fatalf("re-verify: want 1004, got %v", err)
	}
}

func TestRevokeAndQueryListUAV(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedParties(t, svc)
	ctx := context.Background()
	uav, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-T-501"})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if _, err := svc.QueryUAV(ctx, "TRACE-T", uav.UAVID); err != nil {
		t.Fatalf("query: %v", err)
	}
	if _, err := svc.QueryUAV(ctx, "TRACE-T", "UAV-NOPE"); codeOf(err) != errcode.InvalidUAV {
		t.Fatalf("query unknown: want 1001, got %v", err)
	}
	revoked, err := svc.RevokeUAV(ctx, "TRACE-T", uav.UAVID, "机体退役", "Operator-O1")
	if err != nil || revoked.Status != "REVOKED" {
		t.Fatalf("revoke: %v (%+v)", err, revoked)
	}
	if _, err := svc.RevokeUAV(ctx, "TRACE-T", uav.UAVID, "再次", "Operator-O1"); codeOf(err) != errcode.UAVState {
		t.Fatalf("re-revoke: want 1004, got %v", err)
	}
	list, total, err := svc.ListUAV(ctx, "TRACE-T", UAVListFilter{OperatorID: "Operator-O1", Status: "REVOKED", Page: 1, PageSize: 20})
	if err != nil || len(list) != 1 || total != 1 {
		t.Fatalf("list filtered: %d/%d err=%v", len(list), total, err)
	}
	list, total, err = svc.ListUAV(ctx, "TRACE-T", UAVListFilter{Status: "ACTIVE", Page: 1, PageSize: 20})
	if err != nil || len(list) != 0 || total != 0 {
		t.Fatalf("list active: %d/%d err=%v", len(list), total, err)
	}
	if _, total2, err := svc.ListUAV(ctx, "TRACE-T", UAVListFilter{Page: 1, PageSize: 500}); err != nil || total2 != 1 {
		t.Fatalf("list oversized page_size: total=%d err=%v", total2, err)
	}
}

// TestRegisterUAVConcurrentDuplicateSerialExactlyOneWins C12：并发同 serial_no 注册
// 恰一成功；失败侧返回既有重复类业务错误码（6002），不得泄漏为 9001。
func TestRegisterUAVConcurrentDuplicateSerialExactlyOneWins(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedParties(t, svc)
	const n = 8
	var wg sync.WaitGroup
	start := make(chan struct{})
	created := make(chan string, n)
	errs := make(chan error, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			uav, _, err := svc.RegisterUAV(context.Background(), "TRACE-C12", UAVInput{
				ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-C12-001",
			})
			if err != nil {
				errs <- err
				return
			}
			created <- uav.UAVID
		}()
	}
	close(start)
	wg.Wait()
	close(created)
	close(errs)
	wins := 0
	for range created {
		wins++
	}
	if wins != 1 {
		t.Fatalf("exactly one concurrent duplicate must win, got %d (errs=%d)", wins, len(errs))
	}
	for err := range errs {
		if codeOf(err) != errcode.Param {
			t.Fatalf("concurrent duplicate loser must get existing biz code 6002, got %v", err)
		}
	}
}
