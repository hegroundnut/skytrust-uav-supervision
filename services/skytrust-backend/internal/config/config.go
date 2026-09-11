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

		OffchainAutopilotMs: autopilotMs,
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
