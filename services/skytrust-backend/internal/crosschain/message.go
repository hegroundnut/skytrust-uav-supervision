// Package crosschain 跨链唯一中介：13 步协议、9 态状态机、幂等、路由策略。
// 强制原则：业务链不直连——fabric 与 fisco-bcos 适配器之间不存在调用路径，
// 一切跨链消息必经本包 Gateway（监管链 chainmaker 非旁路）。
package crosschain

import (
	"fmt"

	"skytrust-backend/internal/crypto"
)

// 5 种跨链消息类型（spec §6.3）。
const (
	MsgUAVRegisterProof    = "UAV_REGISTER_PROOF"    // 运营→监管
	MsgMissionApplication  = "MISSION_APPLICATION"   // 运营→监管→管理
	MsgMissionReviewResult = "MISSION_REVIEW_RESULT" // 管理→监管→运营
	MsgFlightPass          = "FLIGHT_PASS"           // 管理→监管→运营
	MsgPassRevoke          = "PASS_REVOKE"           // 管理→监管→运营
)

// RegChainName 监管链恒为 ChainMaker（强制原则 1）。
const RegChainName = "chainmaker"

func ValidMessageTypes() []string {
	return []string{MsgUAVRegisterProof, MsgMissionApplication, MsgMissionReviewResult, MsgFlightPass, MsgPassRevoke}
}

func IsValidMessageType(t string) bool {
	for _, v := range ValidMessageTypes() {
		if v == t {
			return true
		}
	}
	return false
}

// Envelope 规范化报文信封：SM3 摘要与 SM9 签名的唯一输入（spec §6.5）。
// 字段声明序即字母序；Payload 为 map（CanonicalJSON 自动键排序），两端摘要一致。
type Envelope struct {
	BusinessID       string         `json:"business_id"`
	FinalTargetChain string         `json:"final_target_chain"`
	MessageType      string         `json:"message_type"`
	Payload          map[string]any `json:"payload"`
	SourceChain      string         `json:"source_chain"`
}

func BuildEnvelope(msgType, businessID, sourceChain, targetChain string, payload map[string]any) Envelope {
	return Envelope{
		BusinessID:       businessID,
		FinalTargetChain: targetChain,
		MessageType:      msgType,
		Payload:          payload,
		SourceChain:      sourceChain,
	}
}

// CanonicalBytes 信封 → 规范化 JSON 字节（RFC 8785 风格：键排序、无 HTML 转义）。
func CanonicalBytes(env Envelope) ([]byte, error) { return crypto.CanonicalJSON(env) }

// SignEnvelope 计算信封 SM3 并以 uid 的 SM9 私钥签名：返回 (签名 Base64, SM3 hex)。
func SignEnvelope(cs *crypto.Service, uid string, env Envelope) (string, string, error) {
	b, err := CanonicalBytes(env)
	if err != nil {
		return "", "", err
	}
	sig, err := cs.SM9SignUserID(uid, b)
	if err != nil {
		return "", "", err
	}
	return sig, crypto.SM3Hex(b), nil
}

// Error 跨链业务错误：Code 为 errcode 段数值，随 CrosschainTx.ErrorCode 落库。
type Error struct {
	Code int
	Msg  string
}

func (e *Error) Error() string { return fmt.Sprintf("crosschain error %d: %s", e.Code, e.Msg) }

func NewError(code int, format string, a ...any) *Error {
	return &Error{Code: code, Msg: fmt.Sprintf(format, a...)}
}
