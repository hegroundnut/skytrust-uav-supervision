package crosschain

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"gorm.io/gorm"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

// ---------- 共享夹具 ----------

func testEnvAdapters(t *testing.T, adapters map[string]chainadapter.ChainAdapter) (*Gateway, *crypto.Service, *gorm.DB) {
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
		t.Fatalf("crypto service: %v", err)
	}
	return NewGateway(db, cs, adapters, audit.New(db)), cs, db
}

func testEnv(t *testing.T, sims map[string]*sim.Chain) (*Gateway, *crypto.Service, *gorm.DB) {
	t.Helper()
	adapters := make(map[string]chainadapter.ChainAdapter, len(sims))
	for name, s := range sims {
		adapters[name] = s
	}
	return testEnvAdapters(t, adapters)
}

func defaultSims() map[string]*sim.Chain {
	return map[string]*sim.Chain{
		"fabric":     sim.New("fabric", sim.WithLatency(time.Millisecond)),
		RegChainName: sim.New(RegChainName, sim.WithLatency(time.Millisecond)),
		"fisco-bcos": sim.New("fisco-bcos", sim.WithLatency(time.Millisecond)),
	}
}

// signReq 用 uid 对信封签名并回填 SM9Identity/Signature/SM3Hash。
func signReq(t *testing.T, cs *crypto.Service, req *SendRequest, uid string) {
	t.Helper()
	env := BuildEnvelope(req.MessageType, req.BusinessID, req.SourceChain, req.FinalTargetChain, req.Payload)
	sig, sm3, err := SignEnvelope(cs, uid, env)
	if err != nil {
		t.Fatalf("sign envelope: %v", err)
	}
	req.SM9Identity = uid
	req.Signature = sig
	req.SM3Hash = sm3
}

func errCode(err error) int {
	var e *Error
	if errors.As(err, &e) {
		return e.Code
	}
	return -1
}

func reload(t *testing.T, db *gorm.DB, crossTxID string) model.CrosschainTx {
	t.Helper()
	var tx model.CrosschainTx
	if err := db.Where("cross_tx_id = ?", crossTxID).First(&tx).Error; err != nil {
		t.Fatalf("reload %s: %v", crossTxID, err)
	}
	return tx
}

var routeOf = map[string][2]string{
	MsgUAVRegisterProof:    {"fabric", RegChainName},
	MsgMissionApplication:  {"fabric", "fisco-bcos"},
	MsgMissionReviewResult: {"fisco-bcos", "fabric"},
	MsgFlightPass:          {"fisco-bcos", "fabric"},
	MsgPassRevoke:          {"fisco-bcos", "fabric"},
}

// ---------- 测试 ----------

func TestSendSuccessAllMessageTypes(t *testing.T) {
	gw, cs, db := testEnv(t, defaultSims())
	for _, mt := range ValidMessageTypes() {
		req := &SendRequest{
			MessageType: mt, BusinessID: "BIZ-" + mt,
			SourceChain: routeOf[mt][0], FinalTargetChain: routeOf[mt][1],
			Payload: validPayload(mt),
		}
		signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
		tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
		if err != nil {
			t.Fatalf("%s: send: %v", mt, err)
		}
		if tx.Status != "SUCCESS" || tx.ErrorCode != 0 {
			t.Fatalf("%s: want SUCCESS, got %s (code %d)", mt, tx.Status, tx.ErrorCode)
		}
		// 两跳四段 TxID 全记录（强制原则 3）
		if tx.SourceChainTxID == "" || tx.RegReceiveTxID == "" || tx.RegRelayTxID == "" || tx.TargetChainTxID == "" {
			t.Errorf("%s: four tx ids required: %+v", mt, tx)
		}
		if !strings.HasPrefix(tx.RegRecordID, "REGREC-") {
			t.Errorf("%s: reg_record_id = %q", mt, tx.RegRecordID)
		}
		if tx.VerifyResult != "PASS" || tx.PolicyResult != "PASS" {
			t.Errorf("%s: verify=%q policy=%q", mt, tx.VerifyResult, tx.PolicyResult)
		}
		if tx.LatencyMs < 0 {
			t.Errorf("%s: latency = %d", mt, tx.LatencyMs)
		}
		re := reload(t, db, tx.CrossTxID)
		if re.Status != "SUCCESS" || re.TargetChainTxID != tx.TargetChainTxID {
			t.Errorf("%s: persisted mismatch: %+v", mt, re)
		}
		var cnt int64
		db.Model(&model.AuditLog{}).Where("target_id = ? AND actor = ?", tx.CrossTxID, "GATEWAY").Count(&cnt)
		if cnt != 8 { // 7 STATE_TRANSITION（约束 7）+ 1 CROSSCHAIN_<msgtype>
			t.Errorf("%s: want 8 gateway audit rows, got %d", mt, cnt)
		}
	}
}

func TestSendIdempotentDuplicate(t *testing.T) {
	gw, cs, db := testEnv(t, defaultSims())
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-DUP-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
	first, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if err != nil {
		t.Fatalf("first send: %v", err)
	}
	second, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.IdempotentDup {
		t.Fatalf("want code 2004, got %v", err)
	}
	if second == nil || second.CrossTxID != first.CrossTxID {
		t.Fatalf("duplicate must return existing record: %+v", second)
	}
	var cnt int64
	db.Model(&model.CrosschainTx{}).Where("business_id = ?", "APP-DUP-1").Count(&cnt)
	if cnt != 1 {
		t.Errorf("want 1 row, got %d", cnt)
	}
}

// TestSendFailedRetryNewRow P5-R8：FAILED 行不锁死幂等键——同键重发以 #rN 新行
// 成功，RetryOf 溯源；第三次（已有 SUCCESS 行）回到 2004。
func TestSendFailedRetryNewRow(t *testing.T) {
	sims := defaultSims()
	sims[RegChainName] = sim.New(RegChainName, sim.WithFailNext("RegisterReceive", 1))
	gw, cs, db := testEnv(t, sims)
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-RETRY-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))

	first, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.CrosschainSend {
		t.Fatalf("first send: want code 2001, got %v", err)
	}
	if first == nil || first.Status != "FAILED" || first.RetryOf != "" {
		t.Fatalf("first row = %+v", first)
	}

	second, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if err != nil {
		t.Fatalf("retry send: %v", err)
	}
	if second.Status != "SUCCESS" || second.CrossTxID == first.CrossTxID {
		t.Fatalf("retry row = %+v", second)
	}
	if second.RetryOf != first.CrossTxID {
		t.Errorf("retry_of = %q, want %q", second.RetryOf, first.CrossTxID)
	}
	if !strings.HasSuffix(second.IdempotencyKey, "#r1") ||
		!strings.HasPrefix(second.IdempotencyKey, first.IdempotencyKey) {
		t.Errorf("retry key = %q (base %q)", second.IdempotencyKey, first.IdempotencyKey)
	}
	re := reload(t, db, second.CrossTxID)
	if re.Status != "SUCCESS" || re.RetryOf != first.CrossTxID {
		t.Errorf("persisted retry row = %+v", re)
	}
	var cnt int64
	db.Model(&model.CrosschainTx{}).Where("business_id = ?", "APP-RETRY-1").Count(&cnt)
	if cnt != 2 {
		t.Errorf("want 2 rows (FAILED + retry), got %d", cnt)
	}

	third, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.IdempotentDup {
		t.Fatalf("third send: want 2004, got %v", err)
	}
	if third == nil || third.CrossTxID != second.CrossTxID {
		t.Fatalf("duplicate must return the SUCCESS row: %+v", third)
	}
	db.Model(&model.CrosschainTx{}).Where("business_id = ?", "APP-RETRY-1").Count(&cnt)
	if cnt != 2 {
		t.Errorf("third send must not create rows, got %d", cnt)
	}
}

// assertNoRetryRow 断言原 FAILED 记录未被重试：无 #r 新行、无 retry_of 指向它的行、
// 记录本身仍停留 FAILED（C16 拒绝路径留痕不变）。
func assertNoRetryRow(t *testing.T, db *gorm.DB, orig *model.CrosschainTx) {
	t.Helper()
	var rcnt int64
	db.Model(&model.CrosschainTx{}).Where("idempotency_key LIKE ?", orig.IdempotencyKey+"#r%").Count(&rcnt)
	if rcnt != 0 {
		t.Errorf("want 0 #r rows, got %d", rcnt)
	}
	var ocnt int64
	db.Model(&model.CrosschainTx{}).Where("retry_of = ?", orig.CrossTxID).Count(&ocnt)
	if ocnt != 0 {
		t.Errorf("want 0 rows referencing %s, got %d", orig.CrossTxID, ocnt)
	}
	re := reload(t, db, orig.CrossTxID)
	if re.Status != "FAILED" {
		t.Errorf("original record must stay FAILED: %+v", re)
	}
}

// TestSendRetryRejectsBusinessIDMismatch C16：#rN 重试体必须与原 FAILED 记录关键标识
// 一致——原记录 business_id 与重试体不符 → 6002 拒绝，不落 #r 新行、原记录未被重试。
func TestSendRetryRejectsBusinessIDMismatch(t *testing.T) {
	gw, cs, db := testEnv(t, defaultSims())
	uid := crypto.SM9IdentityOf("Operator-A")
	// 构造原 FAILED 记录：幂等键按重试体 business_id（APP-C16-1）派生使其落入重试缝，
	// 但记录 business_id 列为 APP-C16-ORIG——记录与重试体关键标识不一致。
	orig := &model.CrosschainTx{
		CrossTxID: model.GenCrossTxID(), SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		MessageType: MsgMissionApplication, BusinessID: "APP-C16-ORIG", SM9Identity: uid,
		Status: "FAILED", ErrorCode: errcode.CrosschainSend,
		IdempotencyKey: model.IdempotencyKey(MsgMissionApplication, "APP-C16-1", ""),
	}
	if err := db.Create(orig).Error; err != nil {
		t.Fatalf("seed failed row: %v", err)
	}
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-C16-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, req, uid)
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.Param {
		t.Fatalf("retry with mismatched business_id: want 6002, got %v", err)
	}
	if tx != nil {
		t.Errorf("rejected retry must not return a tx row: %+v", tx)
	}
	assertNoRetryRow(t, db, orig)
	var total int64
	db.Model(&model.CrosschainTx{}).Count(&total)
	if total != 1 {
		t.Errorf("rejected retry must not create rows: total = %d, want 1", total)
	}
}

// TestSendRetryRejectsPayloadMismatch C16：同键重发但载荷标识（pass_id）与原 FAILED
// 记录信封摘要不符 → 6002 拒绝（即便新体已重签、SM9/SM3 自洽）；一致 body 重试
// 照旧成功（P5-R8 #rN 缝不变）。
func TestSendRetryRejectsPayloadMismatch(t *testing.T) {
	sims := defaultSims()
	sims[RegChainName] = sim.New(RegChainName, sim.WithFailNext("RegisterReceive", 1))
	gw, cs, db := testEnv(t, sims)
	uid := crypto.SM9IdentityOf("Operator-A")
	req := &SendRequest{
		MessageType: MsgFlightPass, BusinessID: "PASS-C16-1",
		SourceChain: "fisco-bcos", FinalTargetChain: "fabric",
		Payload: validPayload(MsgFlightPass),
	}
	signReq(t, cs, req, uid)
	first, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.CrosschainSend {
		t.Fatalf("first send: want 2001, got %v", err)
	}
	if first == nil || first.Status != "FAILED" || first.SM3Hash == "" {
		t.Fatalf("first row must be FAILED with sm3 persisted: %+v", first)
	}

	// 篡改载荷标识后重签：新体自身 SM9/SM3 全部自洽，仅与原记录不一致
	bad := &SendRequest{
		MessageType: MsgFlightPass, BusinessID: "PASS-C16-1",
		SourceChain: "fisco-bcos", FinalTargetChain: "fabric",
		Payload: validPayload(MsgFlightPass),
	}
	bad.Payload["pass_id"] = "PASS-TEST-999"
	signReq(t, cs, bad, uid)
	tx, err := gw.Send(context.Background(), "TRACE-TEST", bad)
	if errCode(err) != errcode.Param {
		t.Fatalf("retry with mismatched pass_id: want 6002, got %v", err)
	}
	if tx != nil {
		t.Errorf("rejected retry must not return a tx row: %+v", tx)
	}
	assertNoRetryRow(t, db, first)
	var cnt int64
	db.Model(&model.CrosschainTx{}).Where("business_id = ?", "PASS-C16-1").Count(&cnt)
	if cnt != 1 {
		t.Errorf("rejected retry must not create rows, got %d", cnt)
	}

	// 一致 body → 既有成功路径回归（#r1 新行 + RetryOf 溯源）
	second, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if err != nil {
		t.Fatalf("matching retry: %v", err)
	}
	if second.Status != "SUCCESS" || second.RetryOf != first.CrossTxID ||
		!strings.HasSuffix(second.IdempotencyKey, "#r1") {
		t.Fatalf("matching retry row = %+v", second)
	}
}

// TestSendRetryRejectsIdentityAndChainMismatch C16：同键重发但 sm9_identity /
// final_target_chain 与原 FAILED 记录不符 → 6002 拒绝，不落 #r 新行。
func TestSendRetryRejectsIdentityAndChainMismatch(t *testing.T) {
	sims := defaultSims()
	sims[RegChainName] = sim.New(RegChainName, sim.WithFailNext("RegisterReceive", 1))
	gw, cs, db := testEnv(t, sims)
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-C16-2",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
	first, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.CrosschainSend {
		t.Fatalf("first send: want 2001, got %v", err)
	}
	if first == nil || first.Status != "FAILED" {
		t.Fatalf("first row = %+v", first)
	}

	// 换签名者：信封不含身份 → 摘要相同，仅 sm9_identity 与原记录不符
	other := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-C16-2",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, other, crypto.SM9IdentityOf("Operator-B"))
	if tx, err := gw.Send(context.Background(), "TRACE-TEST", other); errCode(err) != errcode.Param {
		t.Fatalf("retry with mismatched sm9_identity: want 6002, got %v", err)
	} else if tx != nil {
		t.Errorf("rejected retry must not return a tx row: %+v", tx)
	}
	assertNoRetryRow(t, db, first)

	// 换目标链
	mischain := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-C16-2",
		SourceChain: "fabric", FinalTargetChain: RegChainName,
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, mischain, crypto.SM9IdentityOf("Operator-A"))
	if tx, err := gw.Send(context.Background(), "TRACE-TEST", mischain); errCode(err) != errcode.Param {
		t.Fatalf("retry with mismatched final_target_chain: want 6002, got %v", err)
	} else if tx != nil {
		t.Errorf("rejected retry must not return a tx row: %+v", tx)
	}
	assertNoRetryRow(t, db, first)
	var cnt int64
	db.Model(&model.CrosschainTx{}).Where("business_id = ?", "APP-C16-2").Count(&cnt)
	if cnt != 1 {
		t.Errorf("rejected retries must not create rows, got %d", cnt)
	}
}

func TestSendSM3Mismatch(t *testing.T) {
	gw, cs, db := testEnv(t, defaultSims())
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-SM3-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
	req.SM3Hash = strings.Repeat("ab", 32) // 声明摘要与计算值不符
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.SM3Integrity {
		t.Fatalf("want code 1003, got %v", err)
	}
	if tx.VerifyResult != "FAIL_SM3" || tx.Status != "FAILED" {
		t.Fatalf("want FAILED/FAIL_SM3, got %s/%s", tx.Status, tx.VerifyResult)
	}
	re := reload(t, db, tx.CrossTxID)
	if re.VerifyResult != "FAIL_SM3" || re.ErrorCode != errcode.SM3Integrity {
		t.Errorf("persisted mismatch: %+v", re)
	}
}

func TestSendSM9Invalid(t *testing.T) {
	gw, cs, db := testEnv(t, defaultSims())
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-SM9-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
	req.SM3Hash = ""                // 跳过 SM3 比对，让 SM9 关卡生效
	req.Payload["tampered"] = "yes" // 签名后篡改载荷
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.SM9Verify {
		t.Fatalf("want code 1002, got %v", err)
	}
	if tx.VerifyResult != "FAIL_SM9" || tx.Status != "FAILED" {
		t.Fatalf("want FAILED/FAIL_SM9, got %s/%s", tx.Status, tx.VerifyResult)
	}
	re := reload(t, db, tx.CrossTxID)
	if re.VerifyResult != "FAIL_SM9" || re.ErrorCode != errcode.SM9Verify {
		t.Errorf("persisted mismatch: %+v", re)
	}
}

func TestSendSourceTxUnknown(t *testing.T) {
	gw, cs, db := testEnv(t, defaultSims())
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-SRC-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication), SourceChainTxID: "NOPE-000000",
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.CrosschainSend {
		t.Fatalf("want code 2001, got %v", err)
	}
	if tx.Status != "FAILED" || tx.SourceChainTxID != "" {
		t.Fatalf("want FAILED with empty source tx, got %+v", tx)
	}
	re := reload(t, db, tx.CrossTxID)
	if re.Status != "FAILED" || re.ErrorCode != errcode.CrosschainSend {
		t.Errorf("persisted mismatch: %+v", re)
	}
}

func TestSendSourceTxFailedOnChain(t *testing.T) {
	sims := defaultSims()
	fabric := sim.New("fabric", sim.WithFailNext("SeedFail", 1))
	sims["fabric"] = fabric
	gw, cs, db := testEnv(t, sims)
	// Task 1 修复后失败回执可查：先制造一笔链上失败交易
	bad, err := fabric.SubmitTx(context.Background(), "operator_business", "SeedFail", map[string]any{"x": 1})
	if err != nil || bad.Status != 1 {
		t.Fatalf("seed failed tx: rc=%+v err=%v", bad, err)
	}
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-SRC-2",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication), SourceChainTxID: bad.TxID,
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.CrosschainSend {
		t.Fatalf("want code 2001, got %v", err)
	}
	re := reload(t, db, tx.CrossTxID)
	if re.Status != "FAILED" || re.SourceChainTxID != "" {
		t.Errorf("persisted mismatch: %+v", re)
	}
}

func TestSendTargetChainFailure(t *testing.T) {
	sims := defaultSims()
	sims["fisco-bcos"] = sim.New("fisco-bcos", sim.WithFailNext("SubmitApplication", 1))
	gw, cs, db := testEnv(t, sims)
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-TGT-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.TargetChain {
		t.Fatalf("want code 2002, got %v", err)
	}
	// 监管三写已发生、目标链未确认（强制原则 4：任何一跳失败不得 SUCCESS）
	if tx.Status != "FAILED" || tx.VerifyResult != "PASS" {
		t.Fatalf("want FAILED/PASS, got %s/%s", tx.Status, tx.VerifyResult)
	}
	if tx.SourceChainTxID == "" || tx.RegReceiveTxID == "" || tx.RegRelayTxID == "" || !strings.HasPrefix(tx.RegRecordID, "REGREC-") {
		t.Fatalf("pre-target hops must be recorded: %+v", tx)
	}
	if tx.TargetChainTxID != "" {
		t.Fatalf("target tx id must stay empty: %+v", tx)
	}
	re := reload(t, db, tx.CrossTxID)
	if re.Status != "FAILED" || re.ErrorCode != errcode.TargetChain || re.RegRelayTxID != tx.RegRelayTxID {
		t.Errorf("persisted mismatch: %+v", re)
	}
}

func TestSendRegHopFailure(t *testing.T) {
	sims := defaultSims()
	sims[RegChainName] = sim.New(RegChainName, sim.WithFailNext("RegisterReceive", 1))
	gw, cs, db := testEnv(t, sims)
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-REG-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.CrosschainSend {
		t.Fatalf("want code 2001, got %v", err)
	}
	if tx.Status != "FAILED" || tx.RegReceiveTxID != "" || tx.TargetChainTxID != "" || tx.SourceChainTxID == "" {
		t.Fatalf("want FAILED at reg hop: %+v", tx)
	}
	re := reload(t, db, tx.CrossTxID)
	if re.Status != "FAILED" || re.ErrorCode != errcode.CrosschainSend {
		t.Errorf("persisted mismatch: %+v", re)
	}
}

func TestSendUnknownTypeAndRouteMismatch(t *testing.T) {
	gw, cs, _ := testEnv(t, defaultSims())
	// 未知消息类型 → 6002（落库 FAILED 留痕）
	bad := &SendRequest{
		MessageType: "UNKNOWN_TYPE", BusinessID: "BIZ-U-1",
		SourceChain: "fabric", FinalTargetChain: RegChainName,
		Payload: map[string]any{},
	}
	tx, err := gw.Send(context.Background(), "TRACE-TEST", bad)
	if errCode(err) != errcode.Param {
		t.Fatalf("unknown type: want 6002, got %v", err)
	}
	if tx.Status != "FAILED" || tx.ErrorCode != errcode.Param {
		t.Fatalf("unknown type: persisted %+v", tx)
	}
	// 路由不符（MISSION_APPLICATION 必须 fabric→fisco-bcos）→ 2003
	mis := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "BIZ-U-2",
		SourceChain: "fabric", FinalTargetChain: RegChainName,
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, mis, crypto.SM9IdentityOf("Operator-A"))
	tx2, err := gw.Send(context.Background(), "TRACE-TEST", mis)
	if errCode(err) != errcode.RegVerify {
		t.Fatalf("route mismatch: want 2003, got %v", err)
	}
	if tx2.Status != "FAILED" || tx2.ErrorCode != errcode.RegVerify {
		t.Fatalf("route mismatch: persisted %+v", tx2)
	}
}

func TestSendMissingPayloadField(t *testing.T) {
	gw, _, db := testEnv(t, defaultSims())
	p := validPayload(MsgMissionApplication)
	delete(p, "sm3_hash")
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-FLD-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: p,
	}
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if errCode(err) != errcode.Param {
		t.Fatalf("want 6002, got %v", err)
	}
	if !strings.Contains(err.Error(), "sm3_hash") {
		t.Fatalf("error must name the missing field: %v", err)
	}
	re := reload(t, db, tx.CrossTxID)
	if re.Status != "FAILED" || re.ErrorCode != errcode.Param {
		t.Errorf("persisted mismatch: %+v", re)
	}
}

// flakyChain 包装真适配器：前 fails 次 SubmitTx 返回传输层 error（模拟网络抖动）。
type flakyChain struct {
	inner chainadapter.ChainAdapter
	mu    sync.Mutex
	fails int
}

func (f *flakyChain) ChainName() string { return f.inner.ChainName() }
func (f *flakyChain) Health() error     { return f.inner.Health() }
func (f *flakyChain) SubmitTx(ctx context.Context, contract, method string, params map[string]any) (*chainadapter.TxReceipt, error) {
	f.mu.Lock()
	n := f.fails
	if n > 0 {
		f.fails--
	}
	f.mu.Unlock()
	if n > 0 {
		return nil, fmt.Errorf("transient transport error")
	}
	return f.inner.SubmitTx(ctx, contract, method, params)
}
func (f *flakyChain) QueryTx(ctx context.Context, txID string) (*chainadapter.TxReceipt, error) {
	return f.inner.QueryTx(ctx, txID)
}
func (f *flakyChain) QueryState(ctx context.Context, contract, key string) ([]byte, error) {
	return f.inner.QueryState(ctx, contract, key)
}

func TestSendRetriesTransportError(t *testing.T) {
	sims := defaultSims()
	flaky := &flakyChain{inner: sims["fabric"], fails: 1}
	adapters := map[string]chainadapter.ChainAdapter{
		"fabric": flaky, RegChainName: sims[RegChainName], "fisco-bcos": sims["fisco-bcos"],
	}
	gw, cs, _ := testEnvAdapters(t, adapters)
	req := &SendRequest{
		MessageType: MsgUAVRegisterProof, BusinessID: "UAV-RT-1",
		SourceChain: "fabric", FinalTargetChain: RegChainName,
		Payload: validPayload(MsgUAVRegisterProof),
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Manufacturer-A"))
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if err != nil {
		t.Fatalf("send must succeed after retry: %v", err)
	}
	if tx.Status != "SUCCESS" {
		t.Fatalf("want SUCCESS, got %s (code %d)", tx.Status, tx.ErrorCode)
	}
}

func TestQueryAndList(t *testing.T) {
	gw, cs, _ := testEnv(t, defaultSims())
	app := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-L-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, app, crypto.SM9IdentityOf("Operator-A"))
	tx1, err := gw.Send(context.Background(), "TRACE-TEST", app)
	if err != nil {
		t.Fatalf("send app: %v", err)
	}
	reg := &SendRequest{
		MessageType: MsgUAVRegisterProof, BusinessID: "UAV-L-1",
		SourceChain: "fabric", FinalTargetChain: RegChainName,
		Payload: validPayload(MsgUAVRegisterProof),
	}
	signReq(t, cs, reg, crypto.SM9IdentityOf("Manufacturer-A"))
	if _, err := gw.Send(context.Background(), "TRACE-TEST", reg); err != nil {
		t.Fatalf("send reg: %v", err)
	}

	got, err := gw.Query(tx1.CrossTxID)
	if err != nil || got.BusinessID != "APP-L-1" || got.Status != "SUCCESS" {
		t.Fatalf("query: %+v err=%v", got, err)
	}
	if _, err := gw.Query("CX-NOPE"); errCode(err) != errcode.Param {
		t.Fatalf("query unknown: want 6002, got %v", err)
	}

	all, total, err := gw.List(ListFilter{})
	if err != nil || total != 2 || len(all) != 2 {
		t.Fatalf("list all: %d/%d err=%v", len(all), total, err)
	}
	one, total, err := gw.List(ListFilter{Status: "SUCCESS", MessageType: MsgMissionApplication})
	if err != nil || total != 1 || len(one) != 1 || one[0].CrossTxID != tx1.CrossTxID {
		t.Fatalf("list filtered: %d/%d err=%v", len(one), total, err)
	}
	pg, total, err := gw.List(ListFilter{Page: 1, PageSize: 1})
	if err != nil || total != 2 || len(pg) != 1 {
		t.Fatalf("list paged: %d/%d err=%v", len(pg), total, err)
	}
	none, total, err := gw.List(ListFilter{Status: "FAILED"})
	if err != nil || total != 0 || len(none) != 0 {
		t.Fatalf("list empty: %d/%d err=%v", len(none), total, err)
	}
}

// transitionRows 返回某 cross_tx_id 的 STATE_TRANSITION 审计 (from,to) 序列（主键升序）。
func transitionRows(t *testing.T, db *gorm.DB, crossTxID string) [][2]string {
	t.Helper()
	var logs []model.AuditLog
	if err := db.Where("target_id = ? AND action = ? AND actor = ?", crossTxID, "STATE_TRANSITION", "GATEWAY").
		Order("id ASC").Find(&logs).Error; err != nil {
		t.Fatalf("query transitions: %v", err)
	}
	out := make([][2]string, 0, len(logs))
	for _, l := range logs {
		var d struct {
			From    string `json:"from"`
			To      string `json:"to"`
			TraceID string `json:"trace_id"`
		}
		if err := json.Unmarshal([]byte(l.Detail), &d); err != nil {
			t.Fatalf("parse detail %q: %v", l.Detail, err)
		}
		if d.TraceID != "TRACE-TEST" {
			t.Errorf("transition detail trace_id = %q, want TRACE-TEST", d.TraceID)
		}
		out = append(out, [2]string{d.From, d.To})
	}
	return out
}

// TestStateTransitionAudit 约束 7：每次成功状态迁移写 STATE_TRANSITION 审计。
func TestStateTransitionAudit(t *testing.T) {
	gw, cs, db := testEnv(t, defaultSims())
	req := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-ST-1",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs, req, crypto.SM9IdentityOf("Operator-A"))
	tx, err := gw.Send(context.Background(), "TRACE-TEST", req)
	if err != nil {
		t.Fatalf("send: %v", err)
	}
	// 成功路径：恰好 7 条 STATE_TRANSITION，from/to 链完整且有序
	wantChain := [][2]string{
		{"PENDING", "SOURCE_CONFIRMED"},
		{"SOURCE_CONFIRMED", "REG_RECEIVED"},
		{"REG_RECEIVED", "REG_VERIFIED"},
		{"REG_VERIFIED", "REG_RELAYED"},
		{"REG_RELAYED", "TARGET_CONFIRMED"},
		{"TARGET_CONFIRMED", "RETURN_REG_RECEIVED"},
		{"RETURN_REG_RECEIVED", "SUCCESS"},
	}
	got := transitionRows(t, db, tx.CrossTxID)
	if len(got) != len(wantChain) {
		t.Fatalf("want %d STATE_TRANSITION rows, got %d: %+v", len(wantChain), len(got), got)
	}
	for i, w := range wantChain {
		if got[i] != w {
			t.Errorf("transition %d: want %s->%s, got %s->%s", i, w[0], w[1], got[i][0], got[i][1])
		}
	}

	// 失败路径：末条 STATE_TRANSITION 为 REG_RELAYED->FAILED（目标链失败于第 10 步前）
	sims := defaultSims()
	sims["fisco-bcos"] = sim.New("fisco-bcos", sim.WithFailNext("SubmitApplication", 1))
	gw2, cs2, db2 := testEnv(t, sims)
	req2 := &SendRequest{
		MessageType: MsgMissionApplication, BusinessID: "APP-ST-2",
		SourceChain: "fabric", FinalTargetChain: "fisco-bcos",
		Payload: validPayload(MsgMissionApplication),
	}
	signReq(t, cs2, req2, crypto.SM9IdentityOf("Operator-A"))
	tx2, err2 := gw2.Send(context.Background(), "TRACE-TEST", req2)
	if errCode(err2) != errcode.TargetChain {
		t.Fatalf("want code 2002, got %v", err2)
	}
	got2 := transitionRows(t, db2, tx2.CrossTxID)
	if len(got2) == 0 {
		t.Fatal("failure path must write STATE_TRANSITION rows")
	}
	if last := got2[len(got2)-1]; last != [2]string{"REG_RELAYED", "FAILED"} {
		t.Errorf("last transition: want REG_RELAYED->FAILED, got %s->%s", last[0], last[1])
	}
}

// TestListDeterministicTiebreaker F-5/C13：created_at 相同的两行跨链记录 → 分页列表
// 必须由唯一键 cross_tx_id DESC 决胜（此前仅 created_at DESC → SQLite 行序不定）。
func TestListDeterministicTiebreaker(t *testing.T) {
	gw, _, db := testEnv(t, defaultSims())
	// 两行共用同一 created_at：第二行复制第一行的落库值。
	// idempotency_key 带唯一索引 → 必须逐行给不同值。
	first := model.CrosschainTx{CrossTxID: "CX-2026-T01", MessageType: MsgFlightPass,
		BusinessID: "PASS-T10", Status: "SUCCESS", IdempotencyKey: "idem-t10-1"}
	if err := db.Create(&first).Error; err != nil {
		t.Fatal(err)
	}
	second := model.CrosschainTx{CrossTxID: "CX-2026-T02", MessageType: MsgFlightPass,
		BusinessID: "PASS-T10", Status: "SUCCESS", IdempotencyKey: "idem-t10-2",
		CreatedAt: first.CreatedAt}
	if err := db.Create(&second).Error; err != nil {
		t.Fatal(err)
	}
	// 夹具自检：读回的两行 created_at 必须真实相等且非零（否则本测试测不到平局）。
	var reloaded []model.CrosschainTx
	if err := db.Order("cross_tx_id ASC").Find(&reloaded).Error; err != nil {
		t.Fatal(err)
	}
	if len(reloaded) != 2 || reloaded[0].CreatedAt.IsZero() ||
		!reloaded[0].CreatedAt.Equal(reloaded[1].CreatedAt.Time) {
		t.Fatalf("fixture needs two rows with equal non-zero created_at: %+v", reloaded)
	}
	list, total, err := gw.List(ListFilter{Page: 1, PageSize: 20})
	if err != nil || total < 2 {
		t.Fatalf("list: %v total=%d", err, total)
	}
	// created_at 相同 → 必须按 cross_tx_id DESC 决胜（T02 在 T01 前）
	var iT01, iT02 = -1, -1
	for i, tx := range list {
		switch tx.CrossTxID {
		case "CX-2026-T01":
			iT01 = i
		case "CX-2026-T02":
			iT02 = i
		}
	}
	if iT01 < 0 || iT02 < 0 || iT02 > iT01 {
		t.Errorf("tiebreaker broken: iT01=%d iT02=%d", iT01, iT02)
	}
}
