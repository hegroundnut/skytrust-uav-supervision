package main

import (
	"errors"
	"log"
	"time"

	"skytrust-backend/internal/api"
	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/config"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/demo"
	"skytrust-backend/internal/model"
)

func Run(addr string) error {
	if addr == "" {
		return errors.New("server addr required")
	}
	cfg := config.Load()
	if addr != ":8080" {
		cfg.ServerAddr = addr
	}
	db, err := model.Open(cfg.DBPath)
	if err != nil {
		return err
	}
	if err := model.Migrate(db); err != nil {
		return err
	}
	cs, err := crypto.NewService(cfg.SM9KeyDir)
	if err != nil {
		return err
	}
	chains := map[string]*sim.Chain{
		"fabric":     sim.New("fabric", sim.WithLatency(10*time.Millisecond)),
		"chainmaker": sim.New("chainmaker", sim.WithLatency(5*time.Millisecond)),
		"fisco-bcos": sim.New("fisco-bcos", sim.WithLatency(10*time.Millisecond)),
	}
	seeder := demo.NewSeeder(db, cs, chains)
	auditSvc := audit.New(db)
	r := api.NewRouter(&api.Deps{DB: db, Crypto: cs, SimChains: chains, Seeder: seeder, Audit: auditSvc})
	log.Printf("skytrust-backend listening on %s (chain_mode=%s)", cfg.ServerAddr, cfg.ChainMode)
	return r.Run(cfg.ServerAddr)
}

func main() {
	if err := Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
