package main

import (
	"errors"
	"log"
	"net/http"
)

// Run 启动 HTTP 服务。addr 为空返回错误。
func Run(addr string) error {
	if addr == "" {
		return errors.New("server addr required")
	}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/health/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("pong"))
	})
	log.Printf("skytrust-backend listening on %s", addr)
	return http.ListenAndServe(addr, mux)
}

func main() {
	if err := Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
