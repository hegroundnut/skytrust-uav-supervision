package offchain

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// P3-8：六种链下消息类型（唯一真源）。
var validMsgTypes = map[string]bool{
	"HEARTBEAT": true, "POSITION_UPDATE": true, "PASS_VERIFY": true,
	"NODE_CHALLENGE": true, "ROUTE_STATUS": true, "EVENT_REPORT": true,
}

var sendableSessionStatuses = map[string]bool{"ACTIVE": true, "DEGRADED": true, "RECOVERED": true}

type MessageSendRequest struct {
	SessionID  string         `json:"session_id" binding:"required"`
	MsgType    string         `json:"msg_type" binding:"required"`
	SourceNode string         `json:"source_node" binding:"required"`
	TargetNode string         `json:"target_node" binding:"required"`
	Payload    map[string]any `json:"payload"`
	Signature  string         `json:"signature"`
}

type MessageSendResult struct {
	Message    model.OffchainMessage `json:"message"`
	PathDetail []HopDetail           `json:"path_detail"`
}

func (s *Service) MessageSend(ctx context.Context, traceID string, req *MessageSendRequest) (*MessageSendResult, error) {
	sess, err := s.loadSession(ctx, req.SessionID)
	if err != nil {
		return nil, err // 6002
	}
	if !sendableSessionStatuses[sess.Status] {
		return nil, errcode.NewError(errcode.SessionAuth, "session %s status %s cannot send", sess.SessionID, sess.Status)
	}
	if !validMsgTypes[req.MsgType] {
		return nil, errcode.NewError(errcode.Param, "msg_type %s invalid", req.MsgType)
	}
	srcNode, err := s.loadNode(ctx, req.SourceNode)
	if err != nil {
		return nil, err // 4003
	}
	if _, err := s.loadNode(ctx, req.TargetNode); err != nil {
		return nil, err // 4003
	}
	// seq = 会话内 max+1
	var maxSeq sql.NullInt64
	if err := s.db.WithContext(ctx).Model(&model.OffchainMessage{}).
		Where("session_id = ?", sess.SessionID).
		Select("COALESCE(MAX(seq), 0)").Row().Scan(&maxSeq); err != nil {
		return nil, errcode.NewError(errcode.Internal, "max seq: %v", err)
	}
	seq := maxSeq.Int64 + 1
	ts := timex.NowT()
	tsStr := timex.FormatTime(ts.Time)

	msg := model.OffchainMessage{
		MessageID: model.GenMessageID(), SessionID: sess.SessionID, MsgType: req.MsgType,
		SourceNode: req.SourceNode, TargetNode: req.TargetNode, Seq: seq,
		Timestamp: ts, Status: "FAILED", Path: "[]",
	}
	failRow := func(reason string, code int) (*MessageSendResult, error) {
		ev, _ := json.Marshal(map[string]any{"reason": reason})
		msg.Evidence = string(ev)
		if err := s.db.WithContext(ctx).Create(&msg).Error; err != nil {
			return nil, errcode.NewError(errcode.Internal, "save failed message: %v", err)
		}
		s.logAudit(traceID, req.SourceNode, "MESSAGE_SEND_FAILED", "MESSAGE", msg.MessageID,
			map[string]any{"session_id": sess.SessionID, "msg_type": req.MsgType, "seq": seq, "reason": reason})
		return &MessageSendResult{Message: msg, PathDetail: []HopDetail{}},
			errcode.NewError(code, "%s", reason)
	}

	// 实时拓扑路由（攻击开启后自动落入隧道路径）
	var nodes []model.NetworkNode
	if err := s.db.WithContext(ctx).Find(&nodes).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "load nodes: %v", err)
	}
	adj, err := BuildGraph(nodes, WormholeEnabled(nodes))
	if err != nil {
		return nil, errcode.NewError(errcode.Param, "bad node data: %v", err)
	}
	path, _, err := Dijkstra(adj, req.SourceNode, req.TargetNode)
	if err != nil {
		return failRow(fmt.Sprintf("no route %s -> %s", req.SourceNode, req.TargetNode), errcode.PathUnreachable)
	}
	details, totalLatency, err := PathLatency(adj, path, seq)
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "path latency: %v", err)
	}
	// SM3 规范化哈希（P3-8 字段集）
	sm3, err := s.cs.HashCanonical(map[string]any{
		"session_id": sess.SessionID, "seq": seq, "msg_type": req.MsgType,
		"source_node": req.SourceNode, "target_node": req.TargetNode,
		"payload": req.Payload, "timestamp": tsStr,
	})
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "sm3: %v", err)
	}
	msg.SM3Hash = sm3
	// 签名：空 → 平台代签；非空 → 严格验签
	sig := req.Signature
	proxy := sig == ""
	if proxy {
		sig, err = s.cs.SM9SignUserID(srcNode.SM9Identity, []byte(sm3))
		if err != nil {
			return failRow(fmt.Sprintf("proxy sign: %v", err), errcode.Internal)
		}
	} else if ok, verr := s.cs.SM9VerifyUserID(srcNode.SM9Identity, []byte(sm3), sig); verr != nil || !ok {
		return failRow("sm9 signature verification failed", errcode.SessionAuth)
	}
	pathJSON, err := json.Marshal(path)
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "path json: %v", err)
	}
	evJSON, err := json.Marshal(map[string]any{
		"sm9_identity": srcNode.SM9Identity, "signature": sig, "proxy_signed": proxy,
		"path_detail": details,
	})
	if err != nil {
		return nil, errcode.NewError(errcode.Internal, "evidence json: %v", err)
	}
	msg.Status = "SUCCESS"
	msg.LatencyMs = totalLatency
	msg.Path = string(pathJSON)
	msg.Evidence = string(evJSON)
	if err := s.db.WithContext(ctx).Create(&msg).Error; err != nil {
		if !strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return nil, errcode.NewError(errcode.Internal, "save message: %v", err)
		}
		// (session_id, seq) 唯一索引冲突：并发写抢先占位 → 重读 max 重算 seq 及全部
		// seq 派生字段（抖动时延 seq%JitterMod、SM3 规范哈希、签名/evidence），单次重试。
		if rerr := s.db.WithContext(ctx).Model(&model.OffchainMessage{}).
			Where("session_id = ?", sess.SessionID).
			Select("COALESCE(MAX(seq), 0)").Row().Scan(&maxSeq); rerr != nil {
			return nil, errcode.NewError(errcode.Internal, "max seq: %v", rerr)
		}
		seq = maxSeq.Int64 + 1
		msg.Seq = seq
		details, totalLatency, err = PathLatency(adj, path, seq)
		if err != nil {
			return nil, errcode.NewError(errcode.Internal, "path latency: %v", err)
		}
		sm3, err = s.cs.HashCanonical(map[string]any{
			"session_id": sess.SessionID, "seq": seq, "msg_type": req.MsgType,
			"source_node": req.SourceNode, "target_node": req.TargetNode,
			"payload": req.Payload, "timestamp": tsStr,
		})
		if err != nil {
			return nil, errcode.NewError(errcode.Internal, "sm3: %v", err)
		}
		msg.SM3Hash = sm3
		if proxy {
			sig, err = s.cs.SM9SignUserID(srcNode.SM9Identity, []byte(sm3))
			if err != nil {
				return nil, errcode.NewError(errcode.Internal, "proxy sign: %v", err)
			}
		} else if ok, verr := s.cs.SM9VerifyUserID(srcNode.SM9Identity, []byte(sm3), sig); verr != nil || !ok {
			// 调用方签名绑定旧 seq 的 SM3——seq 变更后验签必失败，与首发验签语义一致
			return failRow("sm9 signature verification failed", errcode.SessionAuth)
		}
		evJSON, err = json.Marshal(map[string]any{
			"sm9_identity": srcNode.SM9Identity, "signature": sig, "proxy_signed": proxy,
			"path_detail": details,
		})
		if err != nil {
			return nil, errcode.NewError(errcode.Internal, "evidence json: %v", err)
		}
		msg.LatencyMs = totalLatency
		msg.Evidence = string(evJSON)
		if err := s.db.WithContext(ctx).Create(&msg).Error; err != nil {
			return nil, errcode.NewError(errcode.Internal, "save message: %v", err)
		}
	}
	// 会话同步：CurrentPath = 实际路由；RECOVERED → ACTIVE（恢复完成自动回归）
	if err := s.db.WithContext(ctx).Model(sess).Update("current_path", string(pathJSON)).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "sync session path: %v", err)
	}
	sess.CurrentPath = string(pathJSON)
	if sess.Status == "RECOVERED" {
		if err := s.transition(ctx, traceID, sess, "ACTIVE", req.SourceNode, "message flow normalized"); err != nil {
			return nil, err
		}
	}
	s.logAudit(traceID, req.SourceNode, "MESSAGE_SEND", "MESSAGE", msg.MessageID, map[string]any{
		"session_id": sess.SessionID, "msg_type": req.MsgType, "seq": seq, "latency_ms": totalLatency,
	})
	return &MessageSendResult{Message: msg, PathDetail: details}, nil
}

type MessageQuery struct {
	SessionID string `json:"session_id"`
	MsgType   string `json:"msg_type"`
	Status    string `json:"status"`
	Page      int    `json:"page"`
	PageSize  int    `json:"page_size"`
}

func (q *MessageQuery) Normalize() {
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

type MessageStats struct {
	Count        int64   `json:"count"`
	SuccessCount int64   `json:"success_count"`
	SuccessRate  float64 `json:"success_rate"`
	AvgLatencyMs float64 `json:"avg_latency_ms"`
	P50LatencyMs int64   `json:"p50_latency_ms"`
	P95LatencyMs int64   `json:"p95_latency_ms"`
	MaxLatencyMs int64   `json:"max_latency_ms"`
}

// Percentile nearest-rank：idx = ceil(p*n)-1（clamp [0,n-1]）；入参必须已升序。
func Percentile(sortedAsc []int64, p float64) int64 {
	n := len(sortedAsc)
	if n == 0 {
		return 0
	}
	idx := int(math.Ceil(p*float64(n))) - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= n {
		idx = n - 1
	}
	return sortedAsc[idx]
}

func (s *Service) MessageList(ctx context.Context, traceID string, q MessageQuery) ([]model.OffchainMessage, int64, *MessageStats, error) {
	q.Normalize()
	if q.MsgType != "" && !validMsgTypes[q.MsgType] {
		return nil, 0, nil, errcode.NewError(errcode.Param, "msg_type %s invalid", q.MsgType)
	}
	if q.Status != "" && q.Status != "SUCCESS" && q.Status != "FAILED" {
		return nil, 0, nil, errcode.NewError(errcode.Param, "status %s invalid", q.Status)
	}
	db := s.db.WithContext(ctx).Model(&model.OffchainMessage{})
	if q.SessionID != "" {
		db = db.Where("session_id = ?", q.SessionID)
	}
	if q.MsgType != "" {
		db = db.Where("msg_type = ?", q.MsgType)
	}
	if q.Status != "" {
		db = db.Where("status = ?", q.Status)
	}
	// 裁定：一次取过滤全集（demo 规模），内存算 stats + 内存分页，保证 stats 对全集而非当页
	all := []model.OffchainMessage{}
	if err := db.Order("created_at DESC, message_id DESC").Find(&all).Error; err != nil {
		return nil, 0, nil, errcode.NewError(errcode.Internal, "list messages: %v", err)
	}
	stats := &MessageStats{Count: int64(len(all))}
	latencies := []int64{}
	for _, m := range all {
		if m.Status == "SUCCESS" {
			stats.SuccessCount++
			latencies = append(latencies, m.LatencyMs)
		}
	}
	if stats.Count > 0 {
		stats.SuccessRate = math.Round(float64(stats.SuccessCount)/float64(stats.Count)*10000) / 10000
	}
	if len(latencies) > 0 {
		sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
		var sum int64
		for _, l := range latencies {
			sum += l
		}
		stats.AvgLatencyMs = math.Round(float64(sum)/float64(len(latencies))*100) / 100
		stats.P50LatencyMs = Percentile(latencies, 0.5)
		stats.P95LatencyMs = Percentile(latencies, 0.95)
		stats.MaxLatencyMs = latencies[len(latencies)-1]
	}
	total := int64(len(all))
	start := (q.Page - 1) * q.PageSize
	if start > len(all) {
		start = len(all)
	}
	end := start + q.PageSize
	if end > len(all) {
		end = len(all)
	}
	return all[start:end], total, stats, nil
}
