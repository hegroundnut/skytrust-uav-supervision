package api

import (
	"errors"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"skytrust-backend/internal/audit"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/demo"
	"skytrust-backend/internal/offchain"
	"skytrust-backend/internal/uavbusiness"
)

type ChainStatusProvider interface{ Health() error }

type Deps struct {
	DB        *gorm.DB
	Chains    map[string]ChainStatusProvider
	SimChains map[string]*sim.Chain
	Crypto    *crypto.Service
	Seeder    *demo.Seeder
	Audit     *audit.Service
	Gateway   *crosschain.Gateway
	Business  *uavbusiness.Service
	Offchain  *offchain.Service
}

// Validate 构造期校验（B1）：接线遗漏在启动时暴露，而非运行期 panic。
func (d *Deps) Validate() error {
	if d == nil {
		return errors.New("deps: nil")
	}
	if d.DB == nil {
		return errors.New("deps: DB is required")
	}
	if d.Crypto == nil {
		return errors.New("deps: Crypto is required")
	}
	if d.Seeder == nil {
		return errors.New("deps: Seeder is required")
	}
	if d.Audit == nil {
		return errors.New("deps: Audit is required")
	}
	if len(d.SimChains) == 0 && len(d.Chains) == 0 {
		return errors.New("deps: at least one chain (SimChains or Chains) is required")
	}
	if d.Gateway == nil {
		return errors.New("deps: Gateway is required")
	}
	if d.Business == nil {
		return errors.New("deps: Business is required")
	}
	if d.Offchain == nil {
		return errors.New("deps: Offchain is required")
	}
	return nil
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
