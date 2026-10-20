package api

import (
	"context"
	"math"
	"sort"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"skytrust-backend/internal/model"
)

// POST /api/explorer/goals —— 三目标证据芯片实时聚合（第五期 spec §5.2，Task 4/6
// 前端契约）。只经 deps.DB 做 GORM 读 + 共享函数 explorerChainsSnapshot：不写库、
// 不调用域服务、不新增 Deps 字段（frozen）。HTTP 恒 200：查询故障 → ErrInternal；
// 本端点不直接查块 → 绝不产生 2005（块级下钻仍走既有 explorer/block|tx）。请求体 {}。
//
// 诚实红线：绝不写死数字；中位数/通过率测不到 → null（不是 0）；
// 计数为真实 0 时输出 0（实测值）。

// goalsMedianInt 中位数（builder 定夺：内存法，业务表内存量级小）：列切片升序排序；
// n 奇 → v[n/2]；n 偶 → (v[n/2-1]+v[n/2])/2 整数除法（取整规则：int64 整除向零截断，
// 两中值之和为奇数时舍弃 0.5，如 (20+31)/2=25）。空集 → nil（诚实 null，绝不报 0）。
// 调用方保证只传入 >0 的读数。
func goalsMedianInt(v []int64) any {
	if len(v) == 0 {
		return nil
	}
	sort.Slice(v, func(i, j int) bool { return v[i] < v[j] })
	n := len(v)
	if n%2 == 1 {
		return v[n/2]
	}
	return (v[n/2-1] + v[n/2]) / 2
}

// goalsCount COUNT 轻量查询；故障 → ErrInternal（如实报错，绝不吞错编数）。
func goalsCount(q *gorm.DB, what string) (int64, int, string) {
	var n int64
	if err := q.Count(&n).Error; err != nil {
		return 0, ErrInternal, "查询" + what + "失败: " + err.Error()
	}
	return n, 0, ""
}

// goalsPositiveColumn Pluck 指定列 >0 的读数（中位数只取正读数；0=未测到，滤除）。
func goalsPositiveColumn(q *gorm.DB, col, what string) ([]int64, int, string) {
	var vals []int64
	if err := q.Where(col+" > 0").Pluck(col, &vals).Error; err != nil {
		return nil, ErrInternal, "查询" + what + "失败: " + err.Error()
	}
	return vals, 0, ""
}

// explorerGoalsAggregate 三目标证据芯片聚合（响应骨架 = spec §5.2）。code!=0 → 业务失败，
// 调用方 Fail。
func explorerGoalsAggregate(deps *Deps, ctx context.Context) (gin.H, int, string) {
	db := deps.DB.WithContext(ctx)

	// —— 目标① 任务申请跨域协同 ——
	chains := explorerChainsSnapshot(deps, ctx)
	chainsOnline := 0
	for _, ch := range chains {
		if s, _ := ch["status"].(string); s == "ONLINE" {
			chainsOnline++
		}
	}
	// 业务留痕口径（spec 决策 8）：排除 EXP-% 压测流量；重试行（#rN/RetryOf）
	// 各算一条、不去重（台账如实）。芯片配固定小字「业务留痕 · 不含压测流量」（前端文案）。
	bizScope := func() *gorm.DB {
		return db.Model(&model.CrosschainTx{}).Where("business_id NOT LIKE ?", "EXP-%")
	}
	cxTotal, code, msg := goalsCount(bizScope(), "跨链台账")
	if code != 0 {
		return nil, code, msg
	}
	verifyPass, code, msg := goalsCount(bizScope().Where("verify_result = ?", "PASS"), "跨链验签通过数")
	if code != 0 {
		return nil, code, msg
	}
	verifyFail, code, msg := goalsCount(bizScope().Where("verify_result IN ?",
		[]string{"FAIL_SM3", "FAIL_SM9"}), "跨链验签失败数")
	if code != 0 {
		return nil, code, msg
	}
	var passRate any // pass+fail==0 → null（测不到率诚实 null，绝不报 0%）
	if verifyPass+verifyFail > 0 {
		passRate = math.Round(float64(verifyPass)*10000/float64(verifyPass+verifyFail)) / 100
	}
	goal1 := gin.H{
		"chains": chains, "chains_online": chainsOnline, "chains_total": len(chains),
		"crosschain_total": cxTotal, "verify_pass": verifyPass, "verify_fail": verifyFail,
		"verify_pass_rate_pct": passRate,
	}

	// —— 目标② 链下可信网络 ——
	sessions, code, msg := goalsCount(db.Model(&model.OffchainSession{}), "链下会话")
	if code != 0 {
		return nil, code, msg
	}
	messages, code, msg := goalsCount(db.Model(&model.OffchainMessage{}), "链下消息")
	if code != 0 {
		return nil, code, msg
	}
	latencies, code, msg := goalsPositiveColumn(db.Model(&model.OffchainMessage{}),
		"latency_ms", "消息时延")
	if code != 0 {
		return nil, code, msg
	}
	wormholes, code, msg := goalsCount(db.Model(&model.WormholeEvent{}), "虫洞事件")
	if code != 0 {
		return nil, code, msg
	}
	recoveries, code, msg := goalsPositiveColumn(db.Model(&model.WormholeEvent{}),
		"recovery_latency_ms", "恢复时延")
	if code != 0 {
		return nil, code, msg
	}
	goal2 := gin.H{
		"sessions_total": sessions, "messages_total": messages,
		"message_latency_median_ms":  goalsMedianInt(latencies),
		"wormhole_events_total":      wormholes,
		"recovery_latency_median_ms": goalsMedianInt(recoveries),
		// wormhole_detected_total 键整个省略（builder 定夺，Task 2 brief 登记；Task 4
		// README 同步登记）：WormholeEvent 每行即一次检出记录、模型无独立「检出」语义
		// 字段可与之区分 → 该口径测不到，省略而非编造（wormhole_events_total 即检出事件数）。
	}

	// —— 目标③ 跨域可信监管 ——
	// 计数源钉死（builder 核对写入点定夺）：trace = AuditLog.Action IN
	// (TRACE_IDENTITY, TRACE_IDENTITY_BROKEN)（regulatory/trace.go:168/:91）；
	// inspect = AuditLog.Action IN (INSPECT, INSPECT_CHAIN_FAILED)
	// （regulatory/inspection.go:312/:271/:281）；alerts/auth 走专表 COUNT。
	alerts, code, msg := goalsCount(db.Model(&model.SecurityEvent{}), "监管告警")
	if code != 0 {
		return nil, code, msg
	}
	traces, code, msg := goalsCount(db.Model(&model.AuditLog{}).Where("action IN ?",
		[]string{"TRACE_IDENTITY", "TRACE_IDENTITY_BROKEN"}), "身份追溯")
	if code != 0 {
		return nil, code, msg
	}
	inspects, code, msg := goalsCount(db.Model(&model.AuditLog{}).Where("action IN ?",
		[]string{"INSPECT", "INSPECT_CHAIN_FAILED"}), "密文核查")
	if code != 0 {
		return nil, code, msg
	}
	auths, code, msg := goalsCount(db.Model(&model.RegulatoryAuth{}), "监管授权")
	if code != 0 {
		return nil, code, msg
	}
	goal3 := gin.H{
		"alerts_total": alerts, "trace_total": traces,
		"inspect_total": inspects, "auth_total": auths,
	}

	return gin.H{"goal1": goal1, "goal2": goal2, "goal3": goal3}, 0, ""
}

// explorerGoalsHandler POST /api/explorer/goals —— 请求体 {}；响应 data =
// {goal1, goal2, goal3} 三目标证据芯片（每数值字段可为 null=测不到，前端「—」）。
func explorerGoalsHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		data, code, msg := explorerGoalsAggregate(deps, c.Request.Context())
		if code != 0 {
			Fail(c, code, msg)
			return
		}
		OK(c, data)
	}
}
