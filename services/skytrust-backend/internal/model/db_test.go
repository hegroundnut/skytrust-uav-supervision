package model

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestOpenMemoryAndMigrate(t *testing.T) {
	db, err := Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	m := db.Migrator()
	for _, want := range []string{"manufacturers", "uavs", "missions", "crosschain_txes",
		"flight_passes", "network_nodes", "offchain_messages", "security_events",
		"identity_mappings", "regulatory_auths", "regulatory_audits", "experiment_runs", "audit_logs"} {
		if !m.HasTable(want) {
			t.Errorf("missing table %s", want)
		}
	}
}

func TestCrosschainIdempotencyUnique(t *testing.T) {
	db, _ := Open(":memory:")
	Migrate(db)
	tx1 := &CrosschainTx{CrossTxID: "CX-1", IdempotencyKey: "K1", Status: "PENDING"}
	tx2 := &CrosschainTx{CrossTxID: "CX-2", IdempotencyKey: "K1", Status: "PENDING"}
	if err := db.Create(tx1).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(tx2).Error; err == nil {
		t.Error("duplicate idempotency_key must fail")
	}
}

func TestUAVDefaults(t *testing.T) {
	db, _ := Open(":memory:")
	Migrate(db)
	u := &UAV{UAVID: "UAV-A-001", SerialNo: "SN-001"}
	if err := db.Create(u).Error; err != nil {
		t.Fatal(err)
	}
	var got UAV
	db.First(&got, "uav_id = ?", "UAV-A-001")
	if got.Status != "UNREGISTERED" {
		t.Errorf("default status = %q", got.Status)
	}
}

func TestMissionCiphertextHiddenInJSON(t *testing.T) {
	m := Mission{MissionID: "M1", MissionCiphertext: "SECRET"}
	b, _ := json.Marshal(m)
	if strings.Contains(string(b), "SECRET") {
		t.Error("ciphertext must not serialize to JSON")
	}
}
