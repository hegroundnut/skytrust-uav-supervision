package crosschain

import (
	"testing"

	"skytrust-backend/internal/crypto"
)

func TestIsValidMessageType(t *testing.T) {
	for _, m := range ValidMessageTypes() {
		if !IsValidMessageType(m) {
			t.Errorf("%s must be valid", m)
		}
	}
	if len(ValidMessageTypes()) != 5 {
		t.Errorf("must be exactly 5 message types, got %d", len(ValidMessageTypes()))
	}
	if IsValidMessageType("UNKNOWN") || IsValidMessageType("") {
		t.Error("unknown type accepted")
	}
}

func TestCanonicalBytesDeterministic(t *testing.T) {
	e1 := BuildEnvelope(MsgMissionApplication, "APP-1", "fabric", "fisco-bcos",
		map[string]any{"b": 2, "a": 1})
	e2 := BuildEnvelope(MsgMissionApplication, "APP-1", "fabric", "fisco-bcos",
		map[string]any{"a": 1, "b": 2})
	b1, err := CanonicalBytes(e1)
	if err != nil {
		t.Fatal(err)
	}
	b2, _ := CanonicalBytes(e2)
	if string(b1) != string(b2) {
		t.Errorf("canonical bytes differ on map order:\n%s\n%s", b1, b2)
	}
	e3 := e1
	e3.BusinessID = "APP-2"
	b3, _ := CanonicalBytes(e3)
	if string(b1) == string(b3) {
		t.Error("different envelope must give different bytes")
	}
}

func TestSignEnvelopeVerifyTamper(t *testing.T) {
	cs, err := crypto.NewService(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	env := BuildEnvelope(MsgFlightPass, "PASS-TEST-001", "fisco-bcos", "fabric",
		map[string]any{"pass_id": "PASS-TEST-001", "mission_id": "MISSION-2026-001"})
	uid := crypto.SM9IdentityOf("FISCO-ADMIN")
	sig, hash, err := SignEnvelope(cs, uid, env)
	if err != nil || sig == "" || len(hash) != 64 {
		t.Fatalf("sign failed: sig=%q hash=%q err=%v", sig, hash, err)
	}
	cb, _ := CanonicalBytes(env)
	ok, err := cs.SM9VerifyUserID(uid, cb, sig)
	if err != nil || !ok {
		t.Fatalf("verify must pass: %v %v", ok, err)
	}
	env.Payload["pass_id"] = "PASS-HACKED"
	cb2, _ := CanonicalBytes(env)
	ok2, _ := cs.SM9VerifyUserID(uid, cb2, sig)
	if ok2 {
		t.Error("tampered payload must fail verify")
	}
}
