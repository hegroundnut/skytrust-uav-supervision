package config

import (
	"os"
	"strconv"
)

type Config struct {
	ServerAddr string
	DBPath     string
	ChainMode  string // sim | real
	SM9KeyDir  string
	Timezone   string
	LogLevel   string

	ChainmakerMode string // CHAINMAKER_MODE：覆盖 ChainMode（空=跟随全局，spec §3.2）
	FabricMode     string // FABRIC_MODE：覆盖 ChainMode（空=跟随全局）
	FiscoMode      string // FISCO_MODE：覆盖 ChainMode（空=跟随全局）

	OffchainAutopilotMs int // OFFCHAIN_AUTOPILOT_MS：后台 HEARTBEAT 间隔(ms)，默认 0=关闭，非法值→0
}

func Load() *Config {
	autopilotMs := 0
	if v, err := strconv.Atoi(getEnv("OFFCHAIN_AUTOPILOT_MS", "0")); err == nil {
		autopilotMs = v
	}
	return &Config{
		ServerAddr: getEnv("SERVER_ADDR", ":8080"),
		DBPath:     getEnv("DB_PATH", "data/skytrust.db"),
		ChainMode:  getEnv("CHAIN_MODE", "sim"),
		SM9KeyDir:  getEnv("SM9_KEY_DIR", "data/sm9"),
		Timezone:   getEnv("APP_TIMEZONE", "Asia/Shanghai"),
		LogLevel:   getEnv("LOG_LEVEL", "info"),

		ChainmakerMode: getEnv("CHAINMAKER_MODE", ""),
		FabricMode:     getEnv("FABRIC_MODE", ""),
		FiscoMode:      getEnv("FISCO_MODE", ""),

		OffchainAutopilotMs: autopilotMs,
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// ChainModeFor 返回指定链的生效模式：分链覆盖优先，空则跟随全局 ChainMode。
func (c *Config) ChainModeFor(chain string) string {
	switch chain {
	case "chainmaker":
		if c.ChainmakerMode != "" {
			return c.ChainmakerMode
		}
	case "fabric":
		if c.FabricMode != "" {
			return c.FabricMode
		}
	case "fisco-bcos":
		if c.FiscoMode != "" {
			return c.FiscoMode
		}
	}
	return c.ChainMode
}
