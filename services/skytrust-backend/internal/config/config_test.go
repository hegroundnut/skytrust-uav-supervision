package config

import (
	"os"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	os.Unsetenv("SERVER_ADDR")
	os.Unsetenv("DB_PATH")
	c := Load()
	if c.ServerAddr != ":8080" {
		t.Errorf("ServerAddr default = %q", c.ServerAddr)
	}
	if c.DBPath != "data/skytrust.db" {
		t.Errorf("DBPath default = %q", c.DBPath)
	}
	if c.ChainMode != "sim" {
		t.Errorf("ChainMode default = %q", c.ChainMode)
	}
	if c.Timezone != "Asia/Shanghai" {
		t.Errorf("Timezone default = %q", c.Timezone)
	}
}

func TestLoadEnvOverride(t *testing.T) {
	t.Setenv("SERVER_ADDR", ":9090")
	t.Setenv("CHAIN_MODE", "real")
	c := Load()
	if c.ServerAddr != ":9090" || c.ChainMode != "real" {
		t.Errorf("env override failed: %+v", c)
	}
}

func TestChainModeForOverrides(t *testing.T) {
	t.Setenv("CHAIN_MODE", "sim")
	t.Setenv("FABRIC_MODE", "real")
	cfg := Load()
	if cfg.ChainMode != "sim" {
		t.Fatalf("global mode: %s", cfg.ChainMode)
	}
	if cfg.FabricMode != "real" || cfg.ChainmakerMode != "" || cfg.FiscoMode != "" {
		t.Fatalf("per-chain fields: %+v", cfg)
	}
	if got := cfg.ChainModeFor("fabric"); got != "real" {
		t.Errorf("fabric override: %s", got)
	}
	if got := cfg.ChainModeFor("chainmaker"); got != "sim" {
		t.Errorf("chainmaker must follow global: %s", got)
	}
	if got := cfg.ChainModeFor("fisco-bcos"); got != "sim" {
		t.Errorf("fisco must follow global: %s", got)
	}
}

func TestChainModeForUnknownChainFollowsGlobal(t *testing.T) {
	t.Setenv("CHAIN_MODE", "real")
	cfg := Load()
	if got := cfg.ChainModeFor("unknown-chain"); got != "real" {
		t.Errorf("unknown chain must follow global: %s", got)
	}
}
