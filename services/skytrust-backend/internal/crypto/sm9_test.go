package crypto

import (
	"strings"
	"testing"
)

func TestSM9SignVerifyRoundTrip(t *testing.T) {
	s, err := NewService(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	uid := SM9IdentityOf("UAV-A-001")
	if uid != "SM9-ID-UAV-A-001" {
		t.Fatalf("bad identity: %s", uid)
	}
	payload := []byte(`{"mission_id":"MISSION-2026-001"}`)
	sig, err := s.SM9SignUserID(uid, payload)
	if err != nil {
		t.Fatal(err)
	}
	ok, err := s.SM9VerifyUserID(uid, payload, sig)
	if err != nil || !ok {
		t.Fatalf("verify failed: ok=%v err=%v", ok, err)
	}
}

func TestSM9VerifyWrongSignature(t *testing.T) {
	s, _ := NewService(t.TempDir())
	uid := SM9IdentityOf("UAV-A-001")
	payload := []byte("data")
	sig, _ := s.SM9SignUserID(uid, payload)
	// 篡改 payload → 验签必须失败（TC1-03/TC1-04 的密码学基础）
	ok, err := s.SM9VerifyUserID(uid, []byte("tampered"), sig)
	if err != nil {
		t.Logf("verify returned err (acceptable): %v", err)
	}
	if ok {
		t.Error("tampered payload must not verify")
	}
	// 错误身份 → 验签必须失败
	ok2, _ := s.SM9VerifyUserID(SM9IdentityOf("UAV-B-001"), payload, sig)
	if ok2 {
		t.Error("wrong identity must not verify")
	}
}

func TestSM9EncryptDecrypt(t *testing.T) {
	s, _ := NewService(t.TempDir())
	plain := []byte("巡检目标: 220kV 线路 #37-#52, 红外测温")
	ct, err := s.SM9Encrypt(plain)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(ct, "巡检") {
		t.Error("ciphertext leaks plaintext")
	}
	got, err := s.SM9Decrypt(ct)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(plain) {
		t.Errorf("decrypt mismatch: %s", got)
	}
}

func TestSM9MasterKeyPersistence(t *testing.T) {
	dir := t.TempDir()
	s1, err := NewService(dir)
	if err != nil {
		t.Fatal(err)
	}
	uid := SM9IdentityOf("UAV-A-001")
	sig, _ := s1.SM9SignUserID(uid, []byte("x"))
	// 重新加载同一目录 → 旧签名仍可验证
	s2, err := NewService(dir)
	if err != nil {
		t.Fatal(err)
	}
	ok, err := s2.SM9VerifyUserID(uid, []byte("x"), sig)
	if err != nil || !ok {
		t.Fatalf("master key not persisted correctly: ok=%v err=%v", ok, err)
	}
}
