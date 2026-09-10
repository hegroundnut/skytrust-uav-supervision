package main

import (
	"errors"
	"log"

	"skytrust-backend/internal/api"
	"skytrust-backend/internal/config"
	"skytrust-backend/internal/crypto"
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
	r := api.NewRouter(&api.Deps{DB: db, Crypto: cs})
	log.Printf("skytrust-backend listening on %s (chain_mode=%s)", cfg.ServerAddr, cfg.ChainMode)
	return r.Run(cfg.ServerAddr)
}

func main() {
	if err := Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
