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
