package api

import (
	"crypto/rand"
	"encoding/hex"
	"log"

	"github.com/gin-gonic/gin"
)

func TraceMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		b := make([]byte, 3)
		rand.Read(b)
		c.Set("trace_id", "TRACE-"+Now().Format("20060102")+"-"+hex.EncodeToString(b))
		c.Next()
	}
}

func LogMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		log.Printf("%s %s -> %d (%s)", c.Request.Method, c.Request.URL.Path,
			c.Writer.Status(), c.GetString("trace_id"))
	}
}

func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("panic recovered: %v (trace=%s)", r, c.GetString("trace_id"))
				Fail(c, ErrInternal, "internal error")
				c.Abort()
			}
		}()
		c.Next()
	}
}
