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

func TestAllMachinesSweep(t *testing.T) {
	machines := map[string]*Machine{
		"uav": UAVMachine, "mission": MissionMachine, "pass": PassMachine,
		"session": SessionMachine, "alert": AlertMachine, "crosschain": CrosschainMachine,
	}
	for name, m := range machines {
		if m == nil || m.name != name {
			t.Fatalf("machine %q misconfigured", name)
		}
		for from, tos := range m.transitions {
			for _, to := range tos {
				if !m.Can(from, to) {
					t.Errorf("%s: declared legal %s->%s rejected by Can", name, from, to)
				}
				if err := m.Assert(from, to); err != nil {
					t.Errorf("%s: Assert(%s,%s) = %v", name, from, to, err)
				}
			}
			if m.Can(from, "NO_SUCH_STATE") {
				t.Errorf("%s: illegal target accepted from %s", name, from)
			}
			if err := m.Assert(from, "NO_SUCH_STATE"); err == nil {
				t.Errorf("%s: Assert(%s,NO_SUCH_STATE) must error", name, from)
			}
			if len(tos) == 0 { // 终态无出边
				for probe := range m.transitions {
					if m.Can(from, probe) {
						t.Errorf("%s: terminal state %s has outgoing edge to %s", name, from, probe)
					}
				}
			}
		}
	}
	// 跨链 9 态与实施文档 §5.2 清单核对
	for _, s := range []string{"PENDING", "SOURCE_CONFIRMED", "REG_RECEIVED", "REG_VERIFIED",
		"REG_RELAYED", "TARGET_CONFIRMED", "RETURN_REG_RECEIVED", "SUCCESS", "FAILED"} {
		if _, ok := CrosschainMachine.transitions[s]; !ok {
			t.Errorf("crosschain machine missing state %s", s)
		}
	}
}
