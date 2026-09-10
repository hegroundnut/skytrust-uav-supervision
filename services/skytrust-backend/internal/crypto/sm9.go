package crypto

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/emmansun/gmsm/sm9"
)

const (
	sm9HIDSign = byte(0x01) // GM/T 0044：签名系统 hid
	sm9HIDEnc  = byte(0x03) // GM/T 0044：加密系统 hid

	// sm9EncServiceUID 平台级密封身份。本版本 gmsm 的 sm9.Encrypt/Decrypt 需要 uid，
	// 而 Produce 接口 SM9Encrypt/SM9Decrypt 不带 uid 参数，故固定使用平台身份，
	// 解密私钥由加密主私钥按该 uid + hid=0x03 派生（等价于"主私钥解密"语义）。
	sm9EncServiceUID = "SM9-ID-skytrust-platform"

	sm9SignMasterPEMType = "SM9 SIGN MASTER KEY"
	sm9EncMasterPEMType  = "SM9 ENC MASTER KEY"

	sm9SignMasterFileName = "sm9_sign_master.pem"
	sm9EncMasterFileName  = "sm9_enc_master.pem"
)

// SM9IdentityOf 返回实体 ID 对应的 SM9 签名身份（uid 约定：全串作为 userID）。
func SM9IdentityOf(entityID string) string { return "SM9-ID-" + entityID }

type sm9State struct {
	signMaster *sm9.SignMasterPrivateKey
	encMaster  *sm9.EncryptMasterPrivateKey
	encUserKey *sm9.EncryptPrivateKey // 平台密封用解密私钥（由 encMaster 按 sm9EncServiceUID 派生）
	userKeys   sync.Map               // uid -> *sm9.SignPrivateKey
}

// loadOrCreate 加载 keyDir 下的 SM9 主密钥 PEM；不存在则生成并以 0600 写盘。
func loadOrCreate(dir string) (*sm9State, error) {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	st := &sm9State{}
	signPath := filepath.Join(dir, sm9SignMasterFileName)
	encPath := filepath.Join(dir, sm9EncMasterFileName)

	b, err := os.ReadFile(signPath)
	switch {
	case err == nil:
		st.signMaster, err = parseSignMaster(b)
		if err != nil {
			return nil, fmt.Errorf("parse sign master: %w", err)
		}
	case os.IsNotExist(err):
		k, gerr := sm9.GenerateSignMasterKey(rand.Reader)
		if gerr != nil {
			return nil, gerr
		}
		st.signMaster = k
		pemB, merr := marshalSignMaster(k)
		if merr != nil {
			return nil, merr
		}
		if werr := os.WriteFile(signPath, pemB, 0o600); werr != nil {
			return nil, werr
		}
	default:
		return nil, fmt.Errorf("read sign master: %w", err)
	}

	b, err = os.ReadFile(encPath)
	switch {
	case err == nil:
		st.encMaster, err = parseEncMaster(b)
		if err != nil {
			return nil, fmt.Errorf("parse enc master: %w", err)
		}
	case os.IsNotExist(err):
		k, gerr := sm9.GenerateEncryptMasterKey(rand.Reader)
		if gerr != nil {
			return nil, gerr
		}
		st.encMaster = k
		pemB, merr := marshalEncMaster(k)
		if merr != nil {
			return nil, merr
		}
		if werr := os.WriteFile(encPath, pemB, 0o600); werr != nil {
			return nil, werr
		}
	default:
		return nil, fmt.Errorf("read enc master: %w", err)
	}

	uk, err := st.encMaster.GenerateUserKey([]byte(sm9EncServiceUID), sm9HIDEnc)
	if err != nil {
		return nil, fmt.Errorf("derive enc service user key: %w", err)
	}
	st.encUserKey = uk
	return st, nil
}

// ---- PEM 持久化（v0.44.1 无 sm9/x509 子包，采用 MarshalASN1 + encoding/pem 回退方案）----

func marshalSignMaster(k *sm9.SignMasterPrivateKey) ([]byte, error) {
	der, err := k.MarshalASN1()
	if err != nil {
		return nil, err
	}
	return pem.EncodeToMemory(&pem.Block{Type: sm9SignMasterPEMType, Bytes: der}), nil
}

func parseSignMaster(b []byte) (*sm9.SignMasterPrivateKey, error) {
	blk, _ := pem.Decode(b)
	if blk == nil || blk.Type != sm9SignMasterPEMType || len(blk.Bytes) == 0 {
		return nil, errors.New("invalid SM9 sign master PEM")
	}
	return sm9.UnmarshalSignMasterPrivateKeyASN1(blk.Bytes)
}

func marshalEncMaster(k *sm9.EncryptMasterPrivateKey) ([]byte, error) {
	der, err := k.MarshalASN1()
	if err != nil {
		return nil, err
	}
	return pem.EncodeToMemory(&pem.Block{Type: sm9EncMasterPEMType, Bytes: der}), nil
}

func parseEncMaster(b []byte) (*sm9.EncryptMasterPrivateKey, error) {
	blk, _ := pem.Decode(b)
	if blk == nil || blk.Type != sm9EncMasterPEMType || len(blk.Bytes) == 0 {
		return nil, errors.New("invalid SM9 enc master PEM")
	}
	return sm9.UnmarshalEncryptMasterPrivateKeyASN1(blk.Bytes)
}

// ---- 签名 / 验签 ----

// signUserKey 按需从签名主私钥派生用户签名私钥并缓存。
func (s *Service) signUserKey(uid string) (*sm9.SignPrivateKey, error) {
	if v, ok := s.sm9.userKeys.Load(uid); ok {
		return v.(*sm9.SignPrivateKey), nil
	}
	k, err := s.sm9.signMaster.GenerateUserKey([]byte(uid), sm9HIDSign)
	if err != nil {
		return nil, err
	}
	s.sm9.userKeys.Store(uid, k)
	return k, nil
}

// SM9SignUserID 以 uid 的用户签名私钥对 payload 签名（hid=0x01），输出 Base64（ASN.1 SM9Signature）。
func (s *Service) SM9SignUserID(uid string, payload []byte) (string, error) {
	uk, err := s.signUserKey(uid)
	if err != nil {
		return "", err
	}
	h := sha256.Sum256(payload) // 先摘要再签，控制签名输入长度
	sig, err := uk.Sign(rand.Reader, h[:], nil)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(sig), nil
}

// SM9VerifyUserID 用签名主公钥验证 uid 对 payload 的签名。
func (s *Service) SM9VerifyUserID(uid string, payload []byte, sigB64 string) (bool, error) {
	sig, err := base64.StdEncoding.DecodeString(sigB64)
	if err != nil {
		return false, err
	}
	h := sha256.Sum256(payload)
	pub := s.sm9.signMaster.PublicKey()
	return sm9.VerifyASN1(pub, []byte(uid), sm9HIDSign, h[:], sig), nil
}

// ---- 加密 / 解密（平台级密封：加密主公钥加密，固定平台身份派生私钥解密）----

// SM9Encrypt 用加密主公钥加密 plaintext，输出 Base64（C1||C3||C2）。
func (s *Service) SM9Encrypt(plaintext []byte) (string, error) {
	ct, err := sm9.Encrypt(rand.Reader, s.sm9.encMaster.PublicKey(),
		[]byte(sm9EncServiceUID), sm9HIDEnc, plaintext, sm9.DefaultEncrypterOpts)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(ct), nil
}

// SM9Decrypt 用平台身份派生的加密用户私钥解密 Base64（C1||C3||C2）密文。
func (s *Service) SM9Decrypt(cipherB64 string) ([]byte, error) {
	ct, err := base64.StdEncoding.DecodeString(cipherB64)
	if err != nil {
		return nil, err
	}
	return sm9.Decrypt(s.sm9.encUserKey, []byte(sm9EncServiceUID), ct, sm9.DefaultEncrypterOpts)
}
