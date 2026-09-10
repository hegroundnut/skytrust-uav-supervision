package main

import (
	"errors"
	"log"

	"skytrust-backend/internal/api"
)

// Run 启动 HTTP 服务。addr 为空返回错误。
func Run(addr string) error {
	if addr == "" {
		return errors.New("server addr required")
	}
	r := api.NewRouter(&api.Deps{})
	log.Printf("skytrust-backend listening on %s", addr)
	return r.Run(addr)
}

func main() {
	if err := Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
