package api

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/demo"
)

type ChainStatusProvider interface{ Health() error }

type Deps struct {
	DB        *gorm.DB
	Chains    map[string]ChainStatusProvider
	SimChains map[string]*sim.Chain
	Crypto    *crypto.Service
	Seeder    *demo.Seeder
	Audit     *audit.Service
}

// chainProviders 优先返回 SimChains（*sim.Chain 结构上满足 ChainStatusProvider），
// 否则回退到 Chains（保留兼容既有测试/接线）。
func chainProviders(deps *Deps) map[string]ChainStatusProvider {
	if len(deps.SimChains) > 0 {
		out := make(map[string]ChainStatusProvider, len(deps.SimChains))
		for name, c := range deps.SimChains {
			out[name] = c
		}
		return out
	}
	return deps.Chains
}

func healthCheck(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		items := gin.H{}
		failed := false
		if deps.DB == nil {
			items["database"] = "ABSENT"
			failed = true
		} else if sqlDB, err := deps.DB.DB(); err != nil || sqlDB.Ping() != nil {
			items["database"] = "OFFLINE"
			failed = true
		} else {
			items["database"] = "ONLINE"
		}
		chains := gin.H{}
		for name, ad := range chainProviders(deps) {
			if ad.Health() == nil {
				chains[name] = "ONLINE"
			} else {
				chains[name] = "OFFLINE"
				failed = true
			}
		}
		items["chains"] = chains
		if failed {
			Fail(c, ErrInternal, "部分组件不可用")
			return
		}
		OK(c, items)
	}
}

func chainStatus(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		chains := gin.H{}
		for name, ad := range chainProviders(deps) {
			if ad.Health() == nil {
				chains[name] = "ONLINE"
			} else {
				chains[name] = "OFFLINE"
			}
		}
		OK(c, gin.H{"chains": chains, "count": len(chains)})
	}
}
