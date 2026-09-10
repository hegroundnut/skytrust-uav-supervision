package statemachine

import "testing"

func TestLegalTransitions(t *testing.T) {
	cases := []struct {
		m        *Machine
		from, to string
	}{
		{UAVMachine, "REGISTERED", "VERIFIED"},
		{UAVMachine, "ACTIVE", "SUSPENDED"},
		{MissionMachine, "DRAFT", "SUBMITTED"},
		{MissionMachine, "REVIEWING", "COORDINATING"},
		{MissionMachine, "COORDINATING", "APPROVED"},
		{PassMachine, "GENERATING", "VALID"},
		{SessionMachine, "ACTIVE", "DEGRADED"},
		{SessionMachine, "DEGRADED", "RECOVERED"},
		{AlertMachine, "TRACED", "REVIEWED"},
		{CrosschainMachine, "REG_VERIFIED", "REG_RELAYED"},
		{CrosschainMachine, "REG_RELAYED", "FAILED"},
	}
	for _, c := range cases {
		if err := c.m.Assert(c.from, c.to); err != nil {
			t.Errorf("%s: %s->%s should be legal: %v", c.m.name, c.from, c.to, err)
		}
	}
}

func TestIllegalTransitions(t *testing.T) {
	cases := []struct {
		m        *Machine
		from, to string
	}{
		{UAVMachine, "UNREGISTERED", "ACTIVE"},
		{UAVMachine, "REVOKED", "ACTIVE"},
		{MissionMachine, "DRAFT", "APPROVED"},
		{MissionMachine, "COMPLETED", "EXECUTING"},
		{PassMachine, "REVOKED", "VALID"},
		{SessionMachine, "INIT", "ACTIVE"},
		{AlertMachine, "OPEN", "RESOLVED"},
		{CrosschainMachine, "PENDING", "SUCCESS"},
		{CrosschainMachine, "SUCCESS", "FAILED"},
	}
	for _, c := range cases {
		if err := c.m.Assert(c.from, c.to); err == nil {
			t.Errorf("%s: %s->%s should be illegal", c.m.name, c.from, c.to)
		}
	}
}

func TestUnknownState(t *testing.T) {
	if UAVMachine.Can("NONEXIST", "ACTIVE") {
		t.Error("unknown state must not transition")
	}
}
