package model

import (
	"regexp"
	"strings"
	"testing"
)

func TestIDFormats(t *testing.T) {
	cases := []struct {
		got  string
		re   string
		name string
	}{
		{GenTraceID(), `^TRACE-\d{8}-[0-9a-f]{6}$`, "trace"},
		{GenCrossTxID(), `^CX-[0-9a-f]{12}$`, "crosstx"},
		{GenApplicationID(), `^APP-\d{8}-[0-9a-f]{6}$`, "app"},
		{GenSessionID(), `^SESS-[0-9a-f]{12}$`, "session"},
		{GenMessageID(), `^MSG-[0-9a-f]{16}$`, "message"},
		{GenExperimentID(), `^EXP-\d{8}-[0-9a-f]{6}$`, "experiment"},
		{GenRunID(), `^RUN-[0-9a-f]{12}$`, "run"},
	}
	for _, c := range cases {
		if !regexp.MustCompile(c.re).MatchString(c.got) {
			t.Errorf("%s: %q does not match %s", c.name, c.got, c.re)
		}
	}
}

func TestIDsUnique(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 1000; i++ {
		id := GenCrossTxID()
		if seen[id] {
			t.Fatal("duplicate id generated")
		}
		seen[id] = true
	}
}

func TestIdempotencyKeyDeterministic(t *testing.T) {
	k1 := IdempotencyKey("MISSION_APPLICATION", "MISSION-2026-001", "tx123")
	k2 := IdempotencyKey("MISSION_APPLICATION", "MISSION-2026-001", "tx123")
	k3 := IdempotencyKey("MISSION_APPLICATION", "MISSION-2026-001", "tx999")
	if k1 != k2 {
		t.Error("same input must give same key")
	}
	if k1 == k3 {
		t.Error("different input must give different key")
	}
	if len(k1) != 64 {
		t.Errorf("key len = %d, want 64", len(k1))
	}
}

func TestValidateID(t *testing.T) {
	if !ValidateID("MISSION", "MISSION-2026-001") {
		t.Error("valid mission id rejected")
	}
	if ValidateID("MISSION", "TASK-2026-001") {
		t.Error("wrong prefix accepted")
	}
	if !ValidateID("PASS", "PASS-2026-001") {
		t.Error("valid pass id rejected")
	}
}

func TestGenRegRecordID(t *testing.T) {
	id := GenRegRecordID()
	if !strings.HasPrefix(id, "REGREC-") || len(id) != len("REGREC-")+12 {
		t.Errorf("bad format: %s", id)
	}
	if GenRegRecordID() == id {
		t.Error("ids must be random")
	}
}
