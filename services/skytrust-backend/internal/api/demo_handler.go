package api

import (
	"github.com/gin-gonic/gin"
)

func demoInitHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		rep, err := deps.Seeder.Init()
		if err != nil {
			FailErr(c, err)
			return
		}
		OK(c, rep)
	}
}

func demoResetHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		before := Now()
		n, err := deps.Seeder.Reset()
		if err != nil {
			FailErr(c, err)
			return
		}
		OK(c, gin.H{"reset_at": Now().Format(TimeFmt), "started_at": before.Format(TimeFmt), "tables_cleared": n})
	}
}
