package offchain

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"

	"gorm.io/gorm"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/statemachine"
)

type SessionOpenRequest struct {
	UAVID      string `json:"uav_id" binding:"required"`
	MissionID  string `json:"mission_id"`
	PassID     string `json:"pass_id"`
	SourceNode string `json:"source_node"`
	TargetNode string `json:"target_node"`
	Signature  string `json:"signature"`
}

type SessionAuth struct {
	Nonce       string `json:"nonce"`
	SM9Identity string `json:"sm9_identity"`
	Signature   string `json:"signature"`
	Verified    bool   `json:"verified"`
}

type SessionOpenResult struct {
	Session model.OffchainSession `json:"session"`
	Path    []string              `json:"path"`
	Auth    SessionAuth           `json:"auth"`
}

func newNonce() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", errcode.NewError(errcode.Internal, "nonce: %v", err)
	}
	return "NONCE-" + hex.EncodeToString(b), nil
}

func (s *Service) SessionOpen(ctx context.Context, traceID string, req *SessionOpenRequest) (*SessionOpenResult, error) {
	src := req.SourceNode
	if src == "" {
		src = req.UAVID + "-NODE" // 端点总表：空 = <uav_id>-NODE
	}
	tgt := req.TargetNode
	if tgt == "" {
		tgt = "MGR"
	}
	srcNode, err := s.loadNode(ctx, src)
	if err != nil {
		return nil, err // 4003
	}
	if _, err := s.loadNode(ctx, tgt); err != nil {
		return nil, err // 4003
	}
	nonce, err := newNonce()
	if err != nil {
		return nil, err
	}
	// SM9 挑战认证：signature 空 → 平台代签（演示路径）；非空 → 严格验签
	sig := req.Signature
	if sig == "" {
		sig, err = s.cs.SM9SignUserID(srcNode.SM9Identity, []byte(nonce))
		if err != nil {
			return nil, errcode.NewError(errcode.SessionAuth, "proxy sign: %v", err)
		}
	} else if ok, verr := s.cs.SM9VerifyUserID(srcNode.SM9Identity, []byte(nonce), sig); verr != nil || !ok {
		return nil, errcode.NewError(errcode.SessionAuth, "sm9 challenge verification failed for %s", srcNode.SM9Identity)
	}
	// 初始可信路径（wormhole 开启时可能就是隧道路径——检测场景前提）
	var nodes []model.NetworkNode
	if err := s.db.WithContext(ctx).Find(&nodes).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "load nodes: %v", err)
	}
	adj, err := BuildGraph(nodes, WormholeEnabled(nodes))
	if err != nil {
		return nil, errcode.NewError(errcode.Param, "bad node data: %v", err)
	}
	path, _, err := Dijkstra(adj, src, tgt)
	if err != nil {
		return nil, err // 4004 透传
	}
	pathJSON, err := json.Marshal(path)
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "path: %v", err)
	}
	sess := model.OffchainSession{
		SessionID: model.GenSessionID(), MissionID: req.MissionID, UAVID: req.UAVID,
		PassID: req.PassID, Status: "INIT", CurrentPath: string(pathJSON),
	}
	// INIT→AUTHENTICATED→ACTIVE（Constraint 7：每跳 Assert + STATE_TRANSITION 审计）
	if err := statemachine.SessionMachine.Assert(sess.Status, "AUTHENTICATED"); err != nil {
		return nil, errcode.NewError(errcode.SessionAuth, "%v", err)
	}
	sess.Status = "AUTHENTICATED"
	s.logAudit(traceID, src, "STATE_TRANSITION", "SESSION", sess.SessionID, map[string]any{"from": "INIT", "to": "AUTHENTICATED"})
	if err := statemachine.SessionMachine.Assert(sess.Status, "ACTIVE"); err != nil {
		return nil, errcode.NewError(errcode.SessionAuth, "%v", err)
	}
	sess.Status = "ACTIVE"
	if err := s.db.WithContext(ctx).Create(&sess).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "create session: %v", err)
	}
	s.logAudit(traceID, src, "STATE_TRANSITION", "SESSION", sess.SessionID, map[string]any{"from": "AUTHENTICATED", "to": "ACTIVE"})
	s.logAudit(traceID, src, "SESSION_OPEN", "SESSION", sess.SessionID, map[string]any{
		"uav_id": req.UAVID, "mission_id": req.MissionID, "pass_id": req.PassID, "path": path,
	})
	return &SessionOpenResult{
		Session: sess, Path: path,
		Auth: SessionAuth{Nonce: nonce, SM9Identity: srcNode.SM9Identity, Signature: sig, Verified: true},
	}, nil
}

type SessionCloseRequest struct {
	SessionID string `json:"session_id" binding:"required"`
	Operator  string `json:"operator" binding:"required"`
	Reason    string `json:"reason"`
}

func (s *Service) SessionClose(ctx context.Context, traceID string, req *SessionCloseRequest) (*model.OffchainSession, error) {
	sess, err := s.loadSession(ctx, req.SessionID)
	if err != nil {
		return nil, err // 6002
	}
	if err := s.transition(ctx, traceID, sess, "CLOSED", req.Operator, req.Reason); err != nil {
		return nil, err // 4002
	}
	s.logAudit(traceID, req.Operator, "SESSION_CLOSE", "SESSION", sess.SessionID, map[string]any{"reason": req.Reason})
	return sess, nil
}

func (s *Service) loadSession(ctx context.Context, sessionID string) (*model.OffchainSession, error) {
	var sess model.OffchainSession
	if err := s.db.WithContext(ctx).Where("session_id = ?", sessionID).First(&sess).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errcode.NewError(errcode.Param, "session %s not found", sessionID)
		}
		return nil, errcode.NewError(errcode.Internal, "load session: %v", err)
	}
	return &sess, nil
}

// transition 会话状态迁移唯一通道（Constraint 7）：Assert → 持久化 → 审计。
func (s *Service) transition(ctx context.Context, traceID string, sess *model.OffchainSession, to, actor, reason string) error {
	from := sess.Status
	if err := statemachine.SessionMachine.Assert(from, to); err != nil {
		return errcode.NewError(errcode.SessionAuth, "%v", err)
	}
	if err := s.db.WithContext(ctx).Model(sess).Update("status", to).Error; err != nil {
		return errcode.NewError(errcode.Internal, "save session: %v", err)
	}
	sess.Status = to
	s.logAudit(traceID, actor, "STATE_TRANSITION", "SESSION", sess.SessionID, map[string]any{"from": from, "to": to, "reason": reason})
	return nil
}

var validSessionStatuses = map[string]bool{
	"INIT": true, "AUTHENTICATED": true, "ACTIVE": true,
	"DEGRADED": true, "RECOVERED": true, "CLOSED": true, "": true,
}

type SessionQuery struct {
	MissionID string `json:"mission_id"`
	UAVID     string `json:"uav_id"`
	Status    string `json:"status"`
	Page      int    `json:"page"`
	PageSize  int    `json:"page_size"`
}

func (q *SessionQuery) Normalize() {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 {
		q.PageSize = 20
	}
	if q.PageSize > 200 {
		q.PageSize = 200
	}
}

func (s *Service) SessionList(ctx context.Context, traceID string, q SessionQuery) ([]model.OffchainSession, int64, error) {
	q.Normalize()
	if !validSessionStatuses[q.Status] {
		return nil, 0, errcode.NewError(errcode.Param, "status %s invalid", q.Status)
	}
	db := s.db.WithContext(ctx).Model(&model.OffchainSession{})
	if q.MissionID != "" {
		db = db.Where("mission_id = ?", q.MissionID)
	}
	if q.UAVID != "" {
		db = db.Where("uav_id = ?", q.UAVID)
	}
	if q.Status != "" {
		db = db.Where("status = ?", q.Status)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "count sessions: %v", err)
	}
	records := []model.OffchainSession{}
	if err := db.Order("created_at DESC, session_id DESC").
		Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&records).Error; err != nil {
		return nil, 0, errcode.NewError(errcode.Internal, "list sessions: %v", err)
	}
	return records, total, nil
}
