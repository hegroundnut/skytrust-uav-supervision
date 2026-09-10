package statemachine

import "fmt"

type Machine struct {
	name        string
	transitions map[string][]string
}

func New(name string, transitions map[string][]string) *Machine {
	return &Machine{name: name, transitions: transitions}
}

func (m *Machine) Can(from, to string) bool {
	for _, t := range m.transitions[from] {
		if t == to {
			return true
		}
	}
	return false
}

func (m *Machine) Assert(from, to string) error {
	if !m.Can(from, to) {
		return fmt.Errorf("statemachine %s: illegal transition %s -> %s", m.name, from, to)
	}
	return nil
}

var UAVMachine = New("uav", map[string][]string{
	"UNREGISTERED": {"REGISTERED"},
	"REGISTERED":   {"VERIFIED", "REVOKED"},
	"VERIFIED":     {"ACTIVE", "REVOKED"},
	"ACTIVE":       {"SUSPENDED", "REVOKED"},
	"SUSPENDED":    {"ACTIVE", "REVOKED"},
	"REVOKED":      {},
})

var MissionMachine = New("mission", map[string][]string{
	"DRAFT":        {"SUBMITTED"},
	"SUBMITTED":    {"REVIEWING", "DRAFT"},
	"REVIEWING":    {"COORDINATING", "APPROVED", "REJECTED"},
	"COORDINATING": {"REVIEWING", "APPROVED", "REJECTED"},
	"APPROVED":     {"EXECUTING"},
	"REJECTED":     {},
	"EXECUTING":    {"COMPLETED", "ABORTED"},
	"COMPLETED":    {},
	"ABORTED":      {},
})

var PassMachine = New("pass", map[string][]string{
	"GENERATING": {"VALID"},
	"VALID":      {"USED", "EXPIRED", "REVOKED"},
	"USED":       {},
	"EXPIRED":    {},
	"REVOKED":    {},
})

var SessionMachine = New("session", map[string][]string{
	"INIT":          {"AUTHENTICATED"},
	"AUTHENTICATED": {"ACTIVE"},
	"ACTIVE":        {"DEGRADED", "CLOSED"},
	"DEGRADED":      {"RECOVERED", "CLOSED"},
	"RECOVERED":     {"ACTIVE", "CLOSED"},
	"CLOSED":        {},
})

var AlertMachine = New("alert", map[string][]string{
	"OPEN":       {"IDENTIFIED"},
	"IDENTIFIED": {"TRACED"},
	"TRACED":     {"REVIEWED"},
	"REVIEWED":   {"RESOLVED"},
	"RESOLVED":   {"ARCHIVED"},
	"ARCHIVED":   {},
})

var CrosschainMachine = New("crosschain", map[string][]string{
	"PENDING":             {"SOURCE_CONFIRMED", "FAILED"},
	"SOURCE_CONFIRMED":    {"REG_RECEIVED", "FAILED"},
	"REG_RECEIVED":        {"REG_VERIFIED", "FAILED"},
	"REG_VERIFIED":        {"REG_RELAYED", "FAILED"},
	"REG_RELAYED":         {"TARGET_CONFIRMED", "FAILED"},
	"TARGET_CONFIRMED":    {"RETURN_REG_RECEIVED", "FAILED"},
	"RETURN_REG_RECEIVED": {"SUCCESS", "FAILED"},
	"SUCCESS":             {},
	"FAILED":              {},
})
