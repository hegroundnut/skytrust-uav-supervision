package main

import (
	"errors"
	"log"

	"skytrust-backend/internal/api"
	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/config"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/demo"
	"skytrust-backend/internal/experiment"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/offchain"
	"skytrust-backend/internal/regulatory"
	"skytrust-backend/internal/uavbusiness"
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
	adapters, resets, err := buildChains(cfg)
	if err != nil {
		return err
	}
	seeder := demo.NewSeeder(db, cs, resets)
	auditSvc := audit.New(db)
	gw := crosschain.NewGateway(db, cs, adapters, auditSvc)
	biz := uavbusiness.New(db, cs, gw, auditSvc)
	off := offchain.New(db, cs, auditSvc)
	reg := regulatory.New(db, cs, gw, auditSvc)
	exp := experiment.New(db, cs, gw, biz, off, reg, auditSvc, seeder)
	status := make(map[string]api.ChainStatusProvider, len(adapters))
	for name, ad := range adapters {
		status[name] = ad
	}
	r, err := api.NewRouter(&api.Deps{DB: db, Crypto: cs, Chains: status, Seeder: seeder, Audit: auditSvc, Gateway: gw, Business: biz, Offchain: off, Regulatory: reg, Experiment: exp})
	if err != nil {
		return err
	}
	autopilotMs := cfg.OffchainAutopilotMs
	if autopilotMs == 0 {
		autopilotMs = 2000 // 生产接线默认开启后台流量（P3-9）；OFFCHAIN_AUTOPILOT_MS 设负值 = 显式关闭
	}
	if ap := offchain.NewAutopilot(off, autopilotMs); ap != nil {
		ap.Start()
		defer ap.Stop()
	}
	log.Printf("skytrust-backend listening on %s (chain_mode=%s)", cfg.ServerAddr, cfg.ChainMode)
	return r.Run(cfg.ServerAddr)
}

func main() {
	if err := Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
