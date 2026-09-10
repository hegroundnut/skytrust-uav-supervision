package config

import "os"

type Config struct {
	ServerAddr string
	DBPath     string
	ChainMode  string // sim | real
	SM9KeyDir  string
	Timezone   string
	LogLevel   string
}

func Load() *Config {
	return &Config{
		ServerAddr: getEnv("SERVER_ADDR", ":8080"),
		DBPath:     getEnv("DB_PATH", "data/skytrust.db"),
		ChainMode:  getEnv("CHAIN_MODE", "sim"),
		SM9KeyDir:  getEnv("SM9_KEY_DIR", "data/sm9"),
		Timezone:   getEnv("APP_TIMEZONE", "Asia/Shanghai"),
		LogLevel:   getEnv("LOG_LEVEL", "info"),
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
