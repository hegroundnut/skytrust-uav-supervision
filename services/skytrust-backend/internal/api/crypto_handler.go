package api

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
	"skytrust-backend/internal/crypto"
)

func sm3Handler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Payload json.RawMessage `json:"payload"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || len(req.Payload) == 0 {
			Fail(c, ErrParam, "payload 必填")
			return
		}
		var v any
		if err := json.Unmarshal(req.Payload, &v); err != nil {
			Fail(c, ErrParam, "payload 必须为合法 JSON")
			return
		}
		canonical, err := crypto.CanonicalJSON(v)
		if err != nil {
			FailErr(c, err)
			return
		}
		OK(c, gin.H{
			"sm3_hash":  crypto.SM3Hex(canonical),
			"canonical": string(canonical),
		})
	}
}

func sm9KeygenHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			EntityID string `json:"entity_id"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.EntityID == "" {
			Fail(c, ErrParam, "entity_id 必填")
			return
		}
		OK(c, gin.H{"sm9_identity": crypto.SM9IdentityOf(req.EntityID)})
	}
}

func sm9SignHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			SM9Identity string          `json:"sm9_identity"`
			Payload     json.RawMessage `json:"payload"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.SM9Identity == "" || len(req.Payload) == 0 {
			Fail(c, ErrParam, "sm9_identity 与 payload 必填")
			return
		}
		canonical, err := canonicalize(req.Payload)
		if err != nil {
			Fail(c, ErrParam, err.Error())
			return
		}
		sig, err := deps.Crypto.SM9SignUserID(req.SM9Identity, canonical)
		if err != nil {
			FailErr(c, err)
			return
		}
		OK(c, gin.H{"signature": sig, "sm3_hash": crypto.SM3Hex(canonical)})
	}
}

func sm9VerifyHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			SM9Identity string          `json:"sm9_identity"`
			Payload     json.RawMessage `json:"payload"`
			Signature   string          `json:"signature"`
		}
		if err := c.ShouldBindJSON(&req); err != nil ||
			req.SM9Identity == "" || len(req.Payload) == 0 || req.Signature == "" {
			Fail(c, ErrParam, "sm9_identity/payload/signature 必填")
			return
		}
		canonical, err := canonicalize(req.Payload)
		if err != nil {
			Fail(c, ErrParam, err.Error())
			return
		}
		valid, err := deps.Crypto.SM9VerifyUserID(req.SM9Identity, canonical, req.Signature)
		if err != nil {
			Fail(c, ErrSM9Verify, "签名格式非法: "+err.Error())
			return
		}
		OK(c, gin.H{"valid": valid})
	}
}

func canonicalize(raw json.RawMessage) ([]byte, error) {
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, err
	}
	return crypto.CanonicalJSON(v)
}
