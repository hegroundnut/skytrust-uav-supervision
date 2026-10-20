package api

import (
	"errors"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// POST /api/explorer/journey —— 业务对象全链旅程只读聚合（第五期 spec §5.1，
// Task 3/4/7 前端契约）。只经 deps.DB 做 GORM 读：不写库、不调用域服务、
// 不新增 Deps 字段（frozen）。HTTP 恒 200：参数/锚点不存在 → 6002，
// 查询故障 → ErrInternal；绝不 404/500，绝不拼造数据。
//
// business_id ↔ 消息类型映射（五个 sendCrosschain 调用点，簇解析依赖此约定，登记于此）：
//
//	uavbusiness/uav.go:102      UAV_REGISTER_PROOF    → UAVID         (fabric→chainmaker)
//	uavbusiness/mission.go:384  MISSION_APPLICATION   → ApplicationID (fabric→fisco-bcos)
//	uavbusiness/review.go:85    MISSION_REVIEW_RESULT → ReviewID      (fisco-bcos→fabric)
//	uavbusiness/pass.go:187     FLIGHT_PASS           → PassID        (irita→fabric)
//	uavbusiness/pass.go:338     PASS_REVOKE           → PassID        (irita→fabric)
//
// MissionID 本身从不作为 business_id（五个调用点无人用它）→ mission 簇
// businessIDs = applications ∪ reviews ∪ passes，不含 missionID。

type explorerJourneyReq struct {
	AnchorKind string `json:"anchor_kind"` // 可选 mission|pass|uav；缺省按 ID 前缀/依序探测推断
	AnchorID   string `json:"anchor_id" binding:"required"`
}

// journeyObject objects[] 元素：status 取各表原值（review 用 Result）。
type journeyObject struct {
	Kind   string
	ID     string
	Status string
}

// journeyResult 聚合结果：锚点 + 簇内对象 + 台账行（created_at 升序）。
type journeyResult struct {
	Anchor  journeyObject
	Objects []journeyObject
	Txs     []model.CrosschainTx
}

// journeyLoad First 加载锚点行：查无 → 6002「锚点不存在: <id>」（message 如实）；
// 其他 DB 故障 → ErrInternal。返回 code!=0 即失败。
func journeyLoad(q *gorm.DB, dest any, id, what string) (int, string) {
	if err := q.First(dest).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrParam, "锚点不存在: " + id
		}
		return ErrInternal, "查询" + what + "失败: " + err.Error()
	}
	return 0, ""
}

// journeyMissionCluster 按 mission_id 展开全簇：mission（行存在时）+ applications +
// reviews（按 application_id 关联）+ passes；businessIDs = appIDs ∪ revIDs ∪ passIDs
// （不含 missionID 本身——五个调用点无人用它）。mission 行缺失（如 pass 锚点指向
// 已不存在的任务）时如实跳过该 object，不拼造 status。
func journeyMissionCluster(db *gorm.DB, missionID string) ([]journeyObject, []string, int, string) {
	objs := make([]journeyObject, 0, 8)
	var m model.Mission
	err := db.Where("mission_id = ?", missionID).First(&m).Error
	switch {
	case err == nil:
		objs = append(objs, journeyObject{Kind: "mission", ID: m.MissionID, Status: m.Status})
	case errors.Is(err, gorm.ErrRecordNotFound): // 如实跳过（见函数注释）
	default:
		return nil, nil, ErrInternal, "查询任务失败: " + err.Error()
	}

	var apps []model.MissionApplication
	if err := db.Where("mission_id = ?", missionID).Order("application_id ASC").Find(&apps).Error; err != nil {
		return nil, nil, ErrInternal, "查询任务申请失败: " + err.Error()
	}
	appIDs := make([]string, 0, len(apps))
	for _, a := range apps {
		appIDs = append(appIDs, a.ApplicationID)
		objs = append(objs, journeyObject{Kind: "application", ID: a.ApplicationID, Status: a.Status})
	}

	var revs []model.ReviewRecord
	if len(appIDs) > 0 {
		if err := db.Where("application_id IN ?", appIDs).Order("review_id ASC").Find(&revs).Error; err != nil {
			return nil, nil, ErrInternal, "查询审核记录失败: " + err.Error()
		}
	}
	var passes []model.FlightPass
	if err := db.Where("mission_id = ?", missionID).Order("pass_id ASC").Find(&passes).Error; err != nil {
		return nil, nil, ErrInternal, "查询飞行许可失败: " + err.Error()
	}

	bizIDs := make([]string, 0, len(appIDs)+len(revs)+len(passes))
	bizIDs = append(bizIDs, appIDs...)
	for _, rv := range revs {
		bizIDs = append(bizIDs, rv.ReviewID)
		objs = append(objs, journeyObject{Kind: "review", ID: rv.ReviewID, Status: rv.Result})
	}
	for _, p := range passes {
		bizIDs = append(bizIDs, p.PassID)
		objs = append(objs, journeyObject{Kind: "pass", ID: p.PassID, Status: p.Status})
	}
	return objs, bizIDs, 0, ""
}

// explorerJourneyAggregate 锚点解析 → 簇展开 → 台账取数（created_at ASC, cross_tx_id
// ASC；重试行 #rN/RetryOf 如实保留）。code!=0 → 业务失败，调用方 Fail。
func explorerJourneyAggregate(db *gorm.DB, kind, id string) (*journeyResult, int, string) {
	if kind != "" && kind != "mission" && kind != "pass" && kind != "uav" {
		return nil, ErrParam, "未知 anchor_kind: " + kind + "（可选 mission|pass|uav）"
	}
	if kind == "" {
		switch {
		case strings.HasPrefix(id, "PASS-"): // genPassID: PASS-<年>-%03d
			kind = "pass"
		case strings.HasPrefix(id, "MISSION-"): // genMissionID: MISSION-<年>-%03d
			kind = "mission"
		default:
			// 无前缀命中 → 依序探测 FlightPass、Mission、UAV，命中谁算谁
			for _, p := range []struct {
				kind, pk string
				table    any
			}{
				{"pass", "pass_id", &model.FlightPass{}},
				{"mission", "mission_id", &model.Mission{}},
				{"uav", "uav_id", &model.UAV{}},
			} {
				var n int64
				if err := db.Model(p.table).Where(p.pk+" = ?", id).Count(&n).Error; err != nil {
					return nil, ErrInternal, "锚点探测失败: " + err.Error()
				}
				if n > 0 {
					kind = p.kind
					break
				}
			}
			if kind == "" {
				return nil, ErrParam, "锚点不存在: " + id
			}
		}
	}

	res := &journeyResult{}
	var bizIDs []string
	switch kind {
	case "mission":
		var m model.Mission
		if code, msg := journeyLoad(db.Where("mission_id = ?", id), &m, id, "任务"); code != 0 {
			return nil, code, msg
		}
		res.Anchor = journeyObject{Kind: "mission", ID: m.MissionID, Status: m.Status}
		objs, ids, code, msg := journeyMissionCluster(db, m.MissionID)
		if code != 0 {
			return nil, code, msg
		}
		res.Objects, bizIDs = objs, ids
	case "pass":
		var p model.FlightPass
		if code, msg := journeyLoad(db.Where("pass_id = ?", id), &p, id, "飞行许可"); code != 0 {
			return nil, code, msg
		}
		res.Anchor = journeyObject{Kind: "pass", ID: p.PassID, Status: p.Status}
		if p.MissionID != "" {
			// pass 锚点展开为同 mission 全簇（anchor.kind 仍 pass）
			objs, ids, code, msg := journeyMissionCluster(db, p.MissionID)
			if code != 0 {
				return nil, code, msg
			}
			res.Objects, bizIDs = objs, ids
		} else {
			res.Objects = []journeyObject{res.Anchor}
			bizIDs = []string{p.PassID}
		}
	case "uav":
		var u model.UAV
		if code, msg := journeyLoad(db.Where("uav_id = ?", id), &u, id, "无人机"); code != 0 {
			return nil, code, msg
		}
		// UAV 注册证明是独立锚点，不并入任务簇
		res.Anchor = journeyObject{Kind: "uav", ID: u.UAVID, Status: u.Status}
		res.Objects = []journeyObject{res.Anchor}
		bizIDs = []string{u.UAVID}
	}

	// objects 稳定输出：按 kind、id 排序
	sort.Slice(res.Objects, func(i, j int) bool {
		a, b := res.Objects[i], res.Objects[j]
		if a.Kind != b.Kind {
			return a.Kind < b.Kind
		}
		return a.ID < b.ID
	})

	if len(bizIDs) > 0 {
		if err := db.Where("business_id IN ?", bizIDs).
			Order("created_at ASC, cross_tx_id ASC").
			Find(&res.Txs).Error; err != nil {
			return nil, ErrInternal, "查询跨链台账失败: " + err.Error()
		}
	}
	return res, 0, ""
}

// explorerJourneyHandler POST /api/explorer/journey —— 只读聚合，响应骨架 = spec §5.1
// （anchor/objects/hops/summary）。诚实红线：payload 与 Signature 绝不回显
// （sm3_hash/sm9_identity 暴露口径与 crosschain/list 一致，不新增暴露面）；
// end_to_end_ms 仅当 hops 非空且全部 SUCCESS，否则 null。
func explorerJourneyHandler(deps *Deps) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req explorerJourneyReq
		if err := c.ShouldBindJSON(&req); err != nil {
			Fail(c, ErrParam, "参数错误: "+err.Error())
			return
		}
		res, code, msg := explorerJourneyAggregate(deps.DB.WithContext(c.Request.Context()), req.AnchorKind, req.AnchorID)
		if code != 0 {
			Fail(c, code, msg)
			return
		}

		hops := make([]gin.H, 0, len(res.Txs))
		success, verifyPass := 0, 0
		for i := range res.Txs {
			tx := &res.Txs[i]
			if tx.Status == "SUCCESS" {
				success++
			}
			if tx.VerifyResult == "PASS" {
				verifyPass++
			}
			hops = append(hops, gin.H{
				"seq":         i + 1, // 从 1 连续编号
				"cross_tx_id": tx.CrossTxID, "message_type": tx.MessageType, "business_id": tx.BusinessID,
				"source_chain": tx.SourceChain, "final_target_chain": tx.FinalTargetChain,
				"status": tx.Status, "verify_result": tx.VerifyResult, "latency_ms": tx.LatencyMs,
				"created_at": timex.FormatTime(tx.CreatedAt.Time),
				"updated_at": timex.FormatTime(tx.UpdatedAt.Time),
				"sm3_hash":   tx.SM3Hash, "sm9_identity": tx.SM9Identity,
				// 四段 TxID 原值（空段如实空串）
				"segments": gin.H{
					"source_tx_id": tx.SourceChainTxID, "reg_receive_tx_id": tx.RegReceiveTxID,
					"reg_relay_tx_id": tx.RegRelayTxID, "target_tx_id": tx.TargetChainTxID,
				},
			})
		}

		summary := gin.H{
			"hop_count": len(res.Txs), "success_count": success,
			"verify_pass": verifyPass, "verify_total": len(res.Txs),
			"first_at": nil, "last_at": nil, "end_to_end_ms": nil, // 空 hops → 诚实 null
		}
		if n := len(res.Txs); n > 0 {
			first, last := res.Txs[0], res.Txs[n-1]
			summary["first_at"] = timex.FormatTime(first.CreatedAt.Time)
			summary["last_at"] = timex.FormatTime(last.CreatedAt.Time)
			if success == n { // 仅全部 SUCCESS 才给端到端耗时，否则 null（诚实）
				summary["end_to_end_ms"] = last.UpdatedAt.Time.Sub(first.CreatedAt.Time).Milliseconds()
			}
		}

		objects := make([]gin.H, 0, len(res.Objects))
		for _, o := range res.Objects {
			objects = append(objects, gin.H{"kind": o.Kind, "id": o.ID, "status": o.Status})
		}
		OK(c, gin.H{
			"anchor":  gin.H{"kind": res.Anchor.Kind, "id": res.Anchor.ID, "status": res.Anchor.Status},
			"objects": objects,
			"hops":    hops,
			"summary": summary,
		})
	}
}
