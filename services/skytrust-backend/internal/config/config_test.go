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
	if cfg.FabricMode != "real" || cfg.ChainmakerMode != "" || cfg.FiscoMode != "" || cfg.IritaMode != "" {
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
	if got := cfg.ChainModeFor("irita"); got != "sim" {
		t.Errorf("irita must follow global: %s", got)
	}
}

func TestChainModeForIritaOverride(t *testing.T) {
	t.Setenv("CHAIN_MODE", "sim")
	t.Setenv("IRITA_MODE", "real")
	cfg := Load()
	if cfg.IritaMode != "real" {
		t.Fatalf("IritaMode = %q, want real", cfg.IritaMode)
	}
	if got := cfg.ChainModeFor("irita"); got != "real" {
		t.Errorf("irita override: %s", got)
	}
	if got := cfg.ChainModeFor("fabric"); got != "sim" {
		t.Errorf("other chains must be unaffected: %s", got)
	}
}

func TestChainModeForUnknownChainFollowsGlobal(t *testing.T) {
	t.Setenv("CHAIN_MODE", "real")
	cfg := Load()
	if got := cfg.ChainModeFor("unknown-chain"); got != "real" {
		t.Errorf("unknown chain must follow global: %s", got)
	}
}

func TestTelemetryAutopilotMs(t *testing.T) {
	os.Unsetenv("TELEMETRY_AUTOPILOT_MS")
	if got := Load().TelemetryAutopilotMs; got != 0 {
		t.Errorf("默认 TelemetryAutopilotMs = %d, want 0（测试恒关闭）", got)
	}
	t.Setenv("TELEMETRY_AUTOPILOT_MS", "1500")
	if got := Load().TelemetryAutopilotMs; got != 1500 {
		t.Errorf("TelemetryAutopilotMs = %d, want 1500", got)
	}
	t.Setenv("TELEMETRY_AUTOPILOT_MS", "not-a-number")
	if got := Load().TelemetryAutopilotMs; got != 0 {
		t.Errorf("非法值 TelemetryAutopilotMs = %d, want 0", got)
	}
}
