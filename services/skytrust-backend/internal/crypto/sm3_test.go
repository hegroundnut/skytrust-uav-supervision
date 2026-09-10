package crypto

import (
	"encoding/hex"
	"testing"

	"github.com/emmansun/gmsm/sm3"
)

func TestSM3KnownVector(t *testing.T) {
	// GB/T 32905-2016 标准样例: SM3("abc")
	want := "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0"
	if got := SM3Hex([]byte("abc")); got != want {
		t.Errorf("SM3(abc) = %s, want %s", got, want)
	}
}

func TestCanonicalJSONKeyOrder(t *testing.T) {
	a := map[string]any{"b": 1, "a": 2}
	b := map[string]any{"a": 2, "b": 1}
	ja, _ := CanonicalJSON(a)
	jb, _ := CanonicalJSON(b)
	if string(ja) != string(jb) {
		t.Errorf("canonical form differs: %s vs %s", ja, jb)
	}
	if string(ja) != `{"a":2,"b":1}` {
		t.Errorf("canonical = %s", ja)
	}
}

func TestTamperDetection(t *testing.T) {
	orig := map[string]any{"mission_id": "MISSION-2026-001", "route": []string{"R101", "R205"}}
	h1, _ := SM3HexCanonical(orig)
	tampered := map[string]any{"mission_id": "MISSION-2026-001", "route": []string{"R101", "R209"}}
	h2, _ := SM3HexCanonical(tampered)
	if h1 == h2 {
		t.Error("tampered payload must produce different hash")
	}
	if len(h1) != 64 {
		t.Errorf("hash len = %d", len(h1))
	}
	if _, err := hex.DecodeString(h1); err != nil {
		t.Error("hash must be hex")
	}
}

func TestServiceHashCanonical(t *testing.T) {
	s, err := NewService(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	h, err := s.HashCanonical(map[string]any{"x": 1})
	if err != nil || len(h) != 64 {
		t.Errorf("bad hash: %q err=%v", h, err)
	}
	_ = sm3.New // 确保依赖真实链接
}
