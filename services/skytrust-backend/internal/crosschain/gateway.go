package crosschain

import (
	"context"
	"strings"
	"time"

	"gorm.io/gorm"

	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/statemachine"
	"skytrust-backend/internal/timex"
)

// Gateway 跨链网关：13 步协议的唯一入口（实施文档 §5.2）。
// 强制原则：监管链非旁路（每笔必经 chainmaker 接收/凭证/转发/回执四写）；
// 业务链不直连（fabric 与 fisco-bcos 之间只存在本网关中介路径）；
// 两跳可追踪（四段 TxID 全记录）；任何一跳失败不得 SUCCESS；SM3/SM9 成败留痕。
type Gateway struct {
	db     *gorm.DB
	cs     *crypto.Service
	chains map[string]chainadapter.ChainAdapter
	audit  *audit.Service
}

func NewGateway(db *gorm.DB, cs *crypto.Service, chains map[string]chainadapter.ChainAdapter, auditSvc *audit.Service) *Gateway {
	return &Gateway{db: db, cs: cs, chains: chains, audit: auditSvc}
}

// SendRequest 跨链发送请求。Signature 必填（对 CanonicalBytes(Envelope) 的 SM9 签名，
// Base64）；SM3Hash 可选（提供则做一致性比对）；SourceChainTxID 可选（提供则验证源链
// 交易，为空由网关代提交源链）。
type SendRequest struct {
	MessageType      string
	BusinessID       string
	SourceChain      string
	FinalTargetChain string
	Payload          map[string]any
	SM9Identity      string
	Signature        string
	SM3Hash          string
	SourceChainTxID  string
}

// 重试策略：传输层 error（adapter 返回 err）重试 1 次、退避 20ms；
// 回执 Status!=0 是确定性业务失败，不重试。
const (
	retryAttempts  = 2
	retryBackoffMs = 20
)

func withRetry[T any](fn func() (T, error)) (T, error) {
	var last T
	var err error
	for i := 0; i < retryAttempts; i++ {
		last, err = fn()
		if err == nil {
			return last, nil
		}
		if i < retryAttempts-1 {
			time.Sleep(time.Duration(retryBackoffMs) * time.Millisecond)
		}
	}
	return last, err
}

// Send 执行 13 步协议。成功与失败均落库留痕；重复提交（同幂等键）返回已有记录 + *Error{2004}。
func (g *Gateway) Send(ctx context.Context, traceID string, req *SendRequest) (*model.CrosschainTx, error) {
	// 步 0：幂等检查（spec §6.4）。
	key := model.IdempotencyKey(req.MessageType, req.BusinessID, req.SourceChainTxID)
	var existing model.CrosschainTx
	switch err := g.db.Where("idempotency_key = ?", key).First(&existing).Error; {
	case err == nil:
		return &existing, NewError(errcode.IdempotentDup, "duplicate submission, returning existing result: %s", existing.CrossTxID)
	case err != gorm.ErrRecordNotFound:
		return nil, NewError(errcode.Internal, "idempotency lookup: %v", err)
	}

	tx := &model.CrosschainTx{
		CrossTxID:        model.GenCrossTxID(),
		SourceChain:      req.SourceChain,
		FinalTargetChain: req.FinalTargetChain,
		MessageType:      req.MessageType,
		BusinessID:       req.BusinessID,
		SM9Identity:      req.SM9Identity,
		Signature:        req.Signature,
		Status:           "PENDING",
		IdempotencyKey:   key,
	}
	t0 := timex.Now()
	if err := g.db.Create(tx).Error; err != nil {
		// 并发窗口：唯一索引冲突 → 按幂等重复处理
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			var dup model.CrosschainTx
			if qerr := g.db.Where("idempotency_key = ?", key).First(&dup).Error; qerr == nil {
				return &dup, NewError(errcode.IdempotentDup, "duplicate submission (concurrent), returning existing result: %s", dup.CrossTxID)
			}
		}
		return nil, NewError(errcode.Internal, "persist crosschain tx: %v", err)
	}

	// fail：任一环节失败的统一出口——FAILED 置态（经状态机 Assert）+ 全字段落库 + 审计留痕。
	fail := func(code int, format string, a ...any) (*model.CrosschainTx, error) {
		e := NewError(code, format, a...)
		if aerr := statemachine.CrosschainMachine.Assert(tx.Status, "FAILED"); aerr != nil {
			return tx, NewError(errcode.Internal, "state: %v (original: %s)", aerr, e.Msg)
		}
		tx.Status = "FAILED"
		tx.ErrorCode = code
		tx.LatencyMs = time.Since(t0).Milliseconds()
		if uerr := g.db.Model(tx).Updates(map[string]any{
			"status": tx.Status, "error_code": code, "latency_ms": tx.LatencyMs,
			"verify_result": tx.VerifyResult, "policy_result": tx.PolicyResult,
			"sm3_hash": tx.SM3Hash, "source_chain_tx_id": tx.SourceChainTxID,
			"reg_receive_tx_id": tx.RegReceiveTxID, "reg_record_id": tx.RegRecordID,
			"reg_relay_tx_id": tx.RegRelayTxID, "target_chain_tx_id": tx.TargetChainTxID,
			"updated_at": timex.Now(),
		}).Error; uerr != nil {
			return tx, NewError(errcode.Internal, "persist failure: %v (original: %s)", uerr, e.Msg)
		}
		g.logAudit(traceID, tx, e.Msg)
		return tx, e
	}
	// advance：状态推进（先 Assert 后落库）。
	advance := func(to string) error {
		if err := statemachine.CrosschainMachine.Assert(tx.Status, to); err != nil {
			return err
		}
		tx.Status = to
		return g.db.Model(tx).Update("status", to).Error
	}

	// 步 1-2：类型/路由/字段校验 + 适配器存在性（tx 已落库 → 失败同样留痕）。
	if e := CheckRoute(req.MessageType, req.SourceChain, req.FinalTargetChain); e != nil {
		return fail(e.Code, "%s", e.Msg)
	}
	if e := CheckPayload(req.MessageType, req.Payload); e != nil {
		return fail(e.Code, "%s", e.Msg)
	}
	src, ok := g.chains[req.SourceChain]
	if !ok {
		return fail(errcode.CrosschainSend, "unknown source chain adapter %q", req.SourceChain)
	}
	reg, ok := g.chains[RegChainName]
	if !ok {
		return fail(errcode.CrosschainSend, "regulatory chain adapter %q absent", RegChainName)
	}
	target, ok := g.chains[req.FinalTargetChain]
	if !ok {
		return fail(errcode.CrosschainSend, "unknown target chain adapter %q", req.FinalTargetChain)
	}
	tx.PolicyResult = "PASS"

	// 步 3：源链确认。
	if req.SourceChainTxID != "" {
		rc, err := withRetry(func() (*chainadapter.TxReceipt, error) { return src.QueryTx(ctx, req.SourceChainTxID) })
		if err != nil {
			return fail(errcode.CrosschainSend, "source tx %s not found: %v", req.SourceChainTxID, err)
		}
		if rc.Status != 0 {
			return fail(errcode.CrosschainSend, "source tx %s failed on chain (status=%d)", rc.TxID, rc.Status)
		}
		tx.SourceChainTxID = rc.TxID
	} else {
		rc, err := withRetry(func() (*chainadapter.TxReceipt, error) {
			return src.SubmitTx(ctx, sourceContract(req.SourceChain), SourceSubmitMethod, map[string]any{
				"cross_tx_id": tx.CrossTxID, "message_type": req.MessageType, "business_id": req.BusinessID,
			})
		})
		if err != nil {
			return fail(errcode.CrosschainSend, "source submit: %v", err)
		}
		if rc.Status != 0 {
			return fail(errcode.CrosschainSend, "source submit failed on chain (status=%d, tx=%s)", rc.Status, rc.TxID)
		}
		tx.SourceChainTxID = rc.TxID
	}
	if err := g.db.Model(tx).Update("source_chain_tx_id", tx.SourceChainTxID).Error; err != nil {
		return fail(errcode.Internal, "persist source tx id: %v", err)
	}
	if err := advance("SOURCE_CONFIRMED"); err != nil {
		return fail(errcode.Internal, "%v", err)
	}

	// 步 4：规范化报文 → SM3（+ 请求带摘要则一致性比对）。
	env := BuildEnvelope(req.MessageType, req.BusinessID, req.SourceChain, req.FinalTargetChain, req.Payload)
	cb, err := CanonicalBytes(env)
	if err != nil {
		return fail(errcode.Internal, "canonicalize: %v", err)
	}
	tx.SM3Hash = crypto.SM3Hex(cb)
	if req.SM3Hash != "" && req.SM3Hash != tx.SM3Hash {
		tx.VerifyResult = "FAIL_SM3"
		return fail(errcode.SM3Integrity, "SM3 mismatch: declared %s, computed %s", req.SM3Hash, tx.SM3Hash)
	}
	if err := g.db.Model(tx).Update("sm3_hash", tx.SM3Hash).Error; err != nil {
		return fail(errcode.Internal, "persist sm3: %v", err)
	}

	// 步 5：SM9 验签（成败均留痕）。
	pass, err := g.cs.SM9VerifyUserID(req.SM9Identity, cb, req.Signature)
	if err != nil {
		tx.VerifyResult = "FAIL_SM9"
		return fail(errcode.SM9Verify, "SM9 verify error: %v", err)
	}
	if !pass {
		tx.VerifyResult = "FAIL_SM9"
		return fail(errcode.SM9Verify, "SM9 signature invalid for identity %s", req.SM9Identity)
	}
	tx.VerifyResult = "PASS"
	if err := g.db.Model(tx).Update("verify_result", "PASS").Error; err != nil {
		return fail(errcode.Internal, "persist verify result: %v", err)
	}

	// 步 7：监管链登记接收。
	rcv, err := withRetry(func() (*chainadapter.TxReceipt, error) {
		return reg.SubmitTx(ctx, ContractRegRecord, "RegisterReceive", map[string]any{
			"cross_tx_id": tx.CrossTxID, "message_type": req.MessageType, "business_id": req.BusinessID,
			"source_chain": req.SourceChain, "source_chain_tx_id": tx.SourceChainTxID, "sm3_hash": tx.SM3Hash,
		})
	})
	if err != nil {
		return fail(errcode.CrosschainSend, "reg receive submit: %v", err)
	}
	if rcv.Status != 0 {
		return fail(errcode.CrosschainSend, "reg receive failed on chain (status=%d)", rcv.Status)
	}
	tx.RegReceiveTxID = rcv.TxID
	if err := g.db.Model(tx).Update("reg_receive_tx_id", tx.RegReceiveTxID).Error; err != nil {
		return fail(errcode.Internal, "persist reg receive: %v", err)
	}
	if err := advance("REG_RECEIVED"); err != nil {
		return fail(errcode.Internal, "%v", err)
	}

	// 步 8：监管凭证（reg_record_id + 校验结果登记）。
	tx.RegRecordID = model.GenRegRecordID()
	vc, err := withRetry(func() (*chainadapter.TxReceipt, error) {
		return reg.SubmitTx(ctx, ContractRegRecord, "VerifyCredential", map[string]any{
			"reg_record_id": tx.RegRecordID, "cross_tx_id": tx.CrossTxID,
			"verify_result": tx.VerifyResult, "policy_result": tx.PolicyResult,
			"sm9_identity": req.SM9Identity, "sm3_hash": tx.SM3Hash,
		})
	})
	if err != nil {
		return fail(errcode.CrosschainSend, "reg credential submit: %v", err)
	}
	if vc.Status != 0 {
		return fail(errcode.CrosschainSend, "reg credential failed on chain (status=%d)", vc.Status)
	}
	if err := g.db.Model(tx).Update("reg_record_id", tx.RegRecordID).Error; err != nil {
		return fail(errcode.Internal, "persist reg record id: %v", err)
	}
	if err := advance("REG_VERIFIED"); err != nil {
		return fail(errcode.Internal, "%v", err)
	}

	// 步 9：监管链登记转发。
	rl, err := withRetry(func() (*chainadapter.TxReceipt, error) {
		return reg.SubmitTx(ctx, ContractRegTrace, "RegisterRelay", map[string]any{
			"cross_tx_id": tx.CrossTxID, "reg_record_id": tx.RegRecordID,
			"final_target_chain": req.FinalTargetChain, "business_id": req.BusinessID,
		})
	})
	if err != nil {
		return fail(errcode.CrosschainSend, "reg relay submit: %v", err)
	}
	if rl.Status != 0 {
		return fail(errcode.CrosschainSend, "reg relay failed on chain (status=%d)", rl.Status)
	}
	tx.RegRelayTxID = rl.TxID
	if err := g.db.Model(tx).Update("reg_relay_tx_id", tx.RegRelayTxID).Error; err != nil {
		return fail(errcode.Internal, "persist reg relay: %v", err)
	}
	if err := advance("REG_RELAYED"); err != nil {
		return fail(errcode.Internal, "%v", err)
	}

	// 步 10：调用目标链适配器（仅监管校验通过后）。
	tContract, tMethod := targetContractMethod(req.MessageType)
	trc, err := withRetry(func() (*chainadapter.TxReceipt, error) {
		return target.SubmitTx(ctx, tContract, tMethod, req.Payload)
	})
	if err != nil {
		return fail(errcode.TargetChain, "target submit: %v", err)
	}
	if trc.Status != 0 {
		return fail(errcode.TargetChain, "target chain failed (status=%d, tx=%s)", trc.Status, trc.TxID)
	}
	tx.TargetChainTxID = trc.TxID
	if err := g.db.Model(tx).Update("target_chain_tx_id", tx.TargetChainTxID).Error; err != nil {
		return fail(errcode.Internal, "persist target tx id: %v", err)
	}
	if err := advance("TARGET_CONFIRMED"); err != nil {
		return fail(errcode.Internal, "%v", err)
	}

	// 步 11：监管链登记回执（回程）。
	ret, err := withRetry(func() (*chainadapter.TxReceipt, error) {
		return reg.SubmitTx(ctx, ContractRegTrace, "RegisterReceipt", map[string]any{
			"cross_tx_id": tx.CrossTxID, "reg_record_id": tx.RegRecordID,
			"target_chain": req.FinalTargetChain, "target_chain_tx_id": tx.TargetChainTxID,
		})
	})
	if err != nil {
		return fail(errcode.CrosschainSend, "reg receipt submit: %v", err)
	}
	if ret.Status != 0 {
		return fail(errcode.CrosschainSend, "reg receipt failed on chain (status=%d)", ret.Status)
	}
	if err := advance("RETURN_REG_RECEIVED"); err != nil {
		return fail(errcode.Internal, "%v", err)
	}

	// 步 12：源链统一 ACK → SUCCESS。
	ack, err := withRetry(func() (*chainadapter.TxReceipt, error) {
		return src.SubmitTx(ctx, sourceContract(req.SourceChain), "CrosschainAck", map[string]any{
			"cross_tx_id": tx.CrossTxID, "reg_record_id": tx.RegRecordID,
			"target_chain_tx_id": tx.TargetChainTxID, "status": "SUCCESS",
		})
	})
	if err != nil {
		return fail(errcode.CrosschainSend, "source ack submit: %v", err)
	}
	if ack.Status != 0 {
		return fail(errcode.CrosschainSend, "source ack failed on chain (status=%d)", ack.Status)
	}
	if err := advance("SUCCESS"); err != nil {
		return fail(errcode.Internal, "%v", err)
	}

	// 步 13：延迟落库 + 审计留痕。
	tx.LatencyMs = time.Since(t0).Milliseconds()
	if err := g.db.Model(tx).Updates(map[string]any{
		"latency_ms": tx.LatencyMs, "policy_result": tx.PolicyResult, "updated_at": timex.Now(),
	}).Error; err != nil {
		return fail(errcode.Internal, "persist latency: %v", err)
	}
	g.logAudit(traceID, tx, "")
	return tx, nil
}

// Query 按 cross_tx_id 查询跨链记录；不存在 → *Error{Code:6002}。
func (g *Gateway) Query(crossTxID string) (*model.CrosschainTx, error) {
	var tx model.CrosschainTx
	err := g.db.Where("cross_tx_id = ?", crossTxID).First(&tx).Error
	if err == gorm.ErrRecordNotFound {
		return nil, NewError(errcode.Param, "cross_tx_id %q not found", crossTxID)
	}
	if err != nil {
		return nil, NewError(errcode.Internal, "query: %v", err)
	}
	return &tx, nil
}

// ListFilter 列表过滤（分页约定同 audit：默认 page=1、page_size=20、上限 200）。
type ListFilter struct {
	Status      string
	MessageType string
	Page        int
	PageSize    int
}

// List 按创建时间倒序分页返回跨链记录与命中总数。
func (g *Gateway) List(f ListFilter) ([]model.CrosschainTx, int64, error) {
	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 200 {
		f.PageSize = 200
	}
	q := g.db.Model(&model.CrosschainTx{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.MessageType != "" {
		q = q.Where("message_type = ?", f.MessageType)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, NewError(errcode.Internal, "count: %v", err)
	}
	var out []model.CrosschainTx
	if err := q.Order("created_at DESC").
		Offset((f.Page - 1) * f.PageSize).
		Limit(f.PageSize).
		Find(&out).Error; err != nil {
		return nil, 0, NewError(errcode.Internal, "find: %v", err)
	}
	return out, total, nil
}

// logAudit 网关审计留痕（成败均记，强制原则 5）。审计失败不阻断跨链结果。
func (g *Gateway) logAudit(traceID string, tx *model.CrosschainTx, failReason string) {
	if g.audit == nil {
		return
	}
	_ = g.audit.Log("GATEWAY", "CROSSCHAIN_"+tx.MessageType, "CROSSCHAIN_TX", tx.CrossTxID, traceID, map[string]any{
		"status": tx.Status, "error_code": tx.ErrorCode, "latency_ms": tx.LatencyMs,
		"business_id": tx.BusinessID, "verify_result": tx.VerifyResult,
		"source_chain_tx_id": tx.SourceChainTxID, "reg_receive_tx_id": tx.RegReceiveTxID,
		"reg_record_id": tx.RegRecordID, "reg_relay_tx_id": tx.RegRelayTxID,
		"target_chain_tx_id": tx.TargetChainTxID, "fail_reason": failReason,
	})
}
