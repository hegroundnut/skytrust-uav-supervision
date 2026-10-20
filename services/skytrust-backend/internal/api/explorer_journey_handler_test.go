package api

import (
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// journeySM3Hex 种子行 SM3 摘要占位（64hex 形态；journey 只透传原值，不校验内容）。
const journeySM3Hex = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"

// journeySeed 直接落一行模型（只读聚合测试不走网关/域服务；失败即测试环境坏了）。
func journeySeed(t *testing.T, deps *Deps, row any) {
	t.Helper()
	if err := deps.DB.Create(row).Error; err != nil {
		t.Fatalf("seed %T: %v", row, err)
	}
}

// journeyTx 构造带四段 TxID 的台账行（字段值即断言期望）。幂等键逐行相异
// （idempotency_key uniqueIndex）；created/updated 显式非零——GORM 不覆盖已设值。
func journeyTx(crossTxID, msgType, bizID, src, dst string, latency int64, created, updated time.Time) *model.CrosschainTx {
	return &model.CrosschainTx{
		CrossTxID: crossTxID, MessageType: msgType, BusinessID: bizID,
		SourceChain: src, FinalTargetChain: dst,
		SourceChainTxID: src + "-SEG1-" + crossTxID,
		RegReceiveTxID:  "chainmaker-SEG2-" + crossTxID,
		RegRelayTxID:    "chainmaker-SEG3-" + crossTxID,
		TargetChainTxID: dst + "-SEG4-" + crossTxID,
		SM3Hash:         journeySM3Hex,
		SM9Identity:     "SM9-ID-Operator-A",
		VerifyResult:    "PASS",
		Status:          "SUCCESS",
		LatencyMs:       latency,
		IdempotencyKey:  "K-JNY-" + crossTxID,
		CreatedAt:       timex.New(created),
		UpdatedAt:       timex.New(updated),
	}
}

// journeyClusterSeed 全簇种子：mission + 1 app + 1 review + 1 pass（已吊销）+ 4 条台账。
type journeyClusterSeed struct {
	missionID string
	appID     string
	revID     string
	passID    string
	base      time.Time
	txOrder   []string // created_at 升序的 cross_tx_id（A→B→C→D）
	txs       map[string]*model.CrosschainTx
}

// seedJourneyMissionCluster business_id 按五个调用点映射：MISSION_APPLICATION→appID、
// MISSION_REVIEW_RESULT→revID、FLIGHT_PASS/PASS_REVOKE→passID；台账乱序写入（C→A→D→B），
// journey 必须按 created_at 升序还原。时间截整秒保证 SQLite 文本序=时间序、毫秒断言精确。
func seedJourneyMissionCluster(t *testing.T, deps *Deps) *journeyClusterSeed {
	t.Helper()
	base := timex.Now().Truncate(time.Second)
	cl := &journeyClusterSeed{
		missionID: "MISSION-2026-901", appID: "APP-J-901",
		revID: "REV-J-901", passID: "PASS-2026-901", base: base,
		txOrder: []string{"CX-J-901", "CX-J-902", "CX-J-903", "CX-J-904"},
	}
	journeySeed(t, deps, &model.Mission{
		MissionID: cl.missionID, OperatorID: "Operator-A", UAVID: "UAV-J-901",
		MissionType: "PATROL", Status: "APPROVED",
		CreatedAt: timex.New(base.Add(-5 * time.Minute)), UpdatedAt: timex.New(base.Add(-30 * time.Second)),
	})
	journeySeed(t, deps, &model.MissionApplication{
		ApplicationID: cl.appID, MissionID: cl.missionID, SourceChain: "fabric", Status: "APPROVED",
		CreatedAt: timex.New(base.Add(-4 * time.Minute)), UpdatedAt: timex.New(base.Add(-3 * time.Minute)),
	})
	journeySeed(t, deps, &model.ReviewRecord{
		ReviewID: cl.revID, ApplicationID: cl.appID, Result: "APPROVED",
		Reviewer: "REGISTRY-ADMIN", ReviewTime: timex.New(base.Add(-3 * time.Minute)),
	})
	journeySeed(t, deps, &model.FlightPass{
		PassID: cl.passID, MissionID: cl.missionID, UAVID: "UAV-J-901", Status: "REVOKED",
		CreatedAt: timex.New(base.Add(-2 * time.Minute)), UpdatedAt: timex.New(base.Add(-30 * time.Second)),
	})
	txApp := journeyTx("CX-J-901", "MISSION_APPLICATION", cl.appID, "fabric", "fisco-bcos", 1200,
		base.Add(-4*time.Minute), base.Add(-230*time.Second))
	txRev := journeyTx("CX-J-902", "MISSION_REVIEW_RESULT", cl.revID, "fisco-bcos", "fabric", 900,
		base.Add(-3*time.Minute), base.Add(-175*time.Second))
	txPass := journeyTx("CX-J-903", "FLIGHT_PASS", cl.passID, "irita", "fabric", 800,
		base.Add(-2*time.Minute), base.Add(-110*time.Second))
	txRevoke := journeyTx("CX-J-904", "PASS_REVOKE", cl.passID, "irita", "fabric", 700,
		base.Add(-1*time.Minute), base.Add(-30*time.Second))
	cl.txs = map[string]*model.CrosschainTx{
		txApp.CrossTxID: txApp, txRev.CrossTxID: txRev,
		txPass.CrossTxID: txPass, txRevoke.CrossTxID: txRevoke,
	}
	for _, tx := range []*model.CrosschainTx{txPass, txApp, txRevoke, txRev} { // 乱序写入
		journeySeed(t, deps, tx)
	}
	return cl
}

// journeyHopIDs 提取 hops 的 cross_tx_id 序列。
func journeyHopIDs(t *testing.T, data map[string]any) []string {
	t.Helper()
	hops := data["hops"].([]any)
	ids := make([]string, 0, len(hops))
	for _, h := range hops {
		ids = append(ids, h.(map[string]any)["cross_tx_id"].(string))
	}
	return ids
}

// TestExplorerJourneyMissionCluster mission 锚点全簇：4 条台账乱序写入 → created_at
// 升序 + seq 连续；四段 TxID 原值；summary 计数与 end_to_end_ms 毫秒精确；
// objects 四类稳定排序；payload/Signature 绝不回显。
func TestExplorerJourneyMissionCluster(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	cl := seedJourneyMissionCluster(t, deps)
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": cl.missionID})
	if resp["code"].(float64) != 0 {
		t.Fatalf("journey: %v", resp)
	}
	data := resp["data"].(map[string]any)

	anchor := data["anchor"].(map[string]any)
	if anchor["kind"] != "mission" || anchor["id"] != cl.missionID || anchor["status"] != "APPROVED" {
		t.Fatalf("anchor = %v", anchor)
	}

	objects := data["objects"].([]any)
	wantObjects := [][3]string{ // kind、id 排序稳定输出
		{"application", cl.appID, "APPROVED"},
		{"mission", cl.missionID, "APPROVED"},
		{"pass", cl.passID, "REVOKED"},
		{"review", cl.revID, "APPROVED"}, // review 的 status 取 Result 原值
	}
	if len(objects) != len(wantObjects) {
		t.Fatalf("objects len = %d, want %d: %v", len(objects), len(wantObjects), objects)
	}
	for i, w := range wantObjects {
		o := objects[i].(map[string]any)
		if o["kind"] != w[0] || o["id"] != w[1] || o["status"] != w[2] {
			t.Fatalf("objects[%d] = %v, want %v", i, o, w)
		}
	}

	hops := data["hops"].([]any)
	if len(hops) != 4 {
		t.Fatalf("hops len = %d, want 4", len(hops))
	}
	for i, wantID := range cl.txOrder {
		hop := hops[i].(map[string]any)
		tx := cl.txs[wantID]
		if hop["seq"].(float64) != float64(i+1) {
			t.Fatalf("hops[%d].seq = %v, want %d（从 1 连续编号）", i, hop["seq"], i+1)
		}
		if hop["cross_tx_id"] != wantID {
			t.Fatalf("hops[%d] = %v, want %s（created_at 升序，乱序写入必须被还原）", i, hop["cross_tx_id"], wantID)
		}
		for k, want := range map[string]any{
			"message_type": tx.MessageType, "business_id": tx.BusinessID,
			"source_chain": tx.SourceChain, "final_target_chain": tx.FinalTargetChain,
			"status": tx.Status, "verify_result": tx.VerifyResult,
			"latency_ms": float64(tx.LatencyMs),
			"created_at": timex.FormatTime(tx.CreatedAt.Time),
			"updated_at": timex.FormatTime(tx.UpdatedAt.Time),
			"sm3_hash":   tx.SM3Hash, "sm9_identity": tx.SM9Identity,
		} {
			if hop[k] != want {
				t.Fatalf("hops[%d].%s = %v, want %v", i, k, hop[k], want)
			}
		}
		// 诚实红线：payload 与 Signature 绝不回显
		if _, bad := hop["payload"]; bad {
			t.Fatalf("hops[%d] 回显了 payload", i)
		}
		if _, bad := hop["signature"]; bad {
			t.Fatalf("hops[%d] 回显了 signature", i)
		}
		seg := hop["segments"].(map[string]any)
		if seg["source_tx_id"] != tx.SourceChainTxID || seg["reg_receive_tx_id"] != tx.RegReceiveTxID ||
			seg["reg_relay_tx_id"] != tx.RegRelayTxID || seg["target_tx_id"] != tx.TargetChainTxID {
			t.Fatalf("hops[%d].segments = %v, want 四段原值 %+v", i, seg, tx)
		}
	}

	summary := data["summary"].(map[string]any)
	for k, want := range map[string]any{
		"hop_count": float64(4), "success_count": float64(4),
		"verify_pass": float64(4), "verify_total": float64(4),
		"first_at": timex.FormatTime(cl.base.Add(-4 * time.Minute)), // 首跳 created_at
		"last_at":  timex.FormatTime(cl.base.Add(-1 * time.Minute)), // 末跳 created_at（非 updated）
		// 末跳 updated(base-30s) − 首跳 created(base-4m) = 210000ms，毫秒精确
		"end_to_end_ms": float64(210000),
	} {
		if summary[k] != want {
			t.Fatalf("summary.%s = %v, want %v", k, summary[k], want)
		}
	}
}

// TestExplorerJourneyPassAnchorTransitive pass 锚点（前缀推断与显式 kind 两路）→
// 展开为同 mission 全簇：anchor.kind 仍 pass，hops/summary/objects 与 mission 锚点一致。
func TestExplorerJourneyPassAnchorTransitive(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	cl := seedJourneyMissionCluster(t, deps)
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	missionResp := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": cl.missionID})
	if missionResp["code"].(float64) != 0 {
		t.Fatalf("mission anchor: %v", missionResp)
	}
	mission := missionResp["data"].(map[string]any)

	for _, body := range []map[string]any{
		{"anchor_id": cl.passID}, // 前缀 PASS- 推断
		{"anchor_id": cl.passID, "anchor_kind": "pass"},
	} {
		resp := postJSON(t, r, "/api/explorer/journey", body)
		if resp["code"].(float64) != 0 {
			t.Fatalf("journey %v: %v", body, resp)
		}
		data := resp["data"].(map[string]any)
		anchor := data["anchor"].(map[string]any)
		if anchor["kind"] != "pass" || anchor["id"] != cl.passID || anchor["status"] != "REVOKED" {
			t.Fatalf("anchor = %v, want pass/%s/REVOKED", anchor, cl.passID)
		}
		// 同簇同 hops（次序与 mission 锚点完全一致）
		gotIDs := journeyHopIDs(t, data)
		wantIDs := journeyHopIDs(t, mission)
		if strings.Join(gotIDs, ",") != strings.Join(wantIDs, ",") {
			t.Fatalf("hops = %v, want %v（pass 锚点须展开为同 mission 全簇）", gotIDs, wantIDs)
		}
		for i := range gotIDs {
			if data["hops"].([]any)[i].(map[string]any)["seq"].(float64) != float64(i+1) {
				t.Fatalf("hops[%d].seq = %v, want %d", i, data["hops"].([]any)[i].(map[string]any)["seq"], i+1)
			}
		}
		// summary 与 objects 同簇一致
		for _, k := range []string{"hop_count", "success_count", "verify_pass", "verify_total", "first_at", "last_at", "end_to_end_ms"} {
			if data["summary"].(map[string]any)[k] != mission["summary"].(map[string]any)[k] {
				t.Fatalf("summary.%s = %v, mission 锚点 = %v", k,
					data["summary"].(map[string]any)[k], mission["summary"].(map[string]any)[k])
			}
		}
		if len(data["objects"].([]any)) != len(mission["objects"].([]any)) {
			t.Fatalf("objects len = %d, mission 锚点 = %d",
				len(data["objects"].([]any)), len(mission["objects"].([]any)))
		}
	}
}

// TestExplorerJourneyUavAnchor uav 独立锚点（无前缀 → 依序探测命中 UAV 表）：
// hops 仅 1 条注册证明，无关 mission 簇台账绝不混入。
func TestExplorerJourneyUavAnchor(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	base := timex.Now().Truncate(time.Second)
	journeySeed(t, deps, &model.UAV{
		UAVID: "UAV-J-777", ManufacturerID: "MFR-J-1", OperatorID: "Operator-J",
		SerialNo: "SN-J-777", RegistrationMark: "UAS-00000777", Status: "REGISTERED",
	})
	proof := journeyTx("CX-J-777", "UAV_REGISTER_PROOF", "UAV-J-777", "fabric", "chainmaker", 600,
		base.Add(-2*time.Minute), base.Add(-110*time.Second))
	journeySeed(t, deps, proof)
	// 无关 mission 簇（台账 business_id 均不在 uav 簇内，必须被排除）
	journeySeed(t, deps, &model.Mission{
		MissionID: "MISSION-2026-777", OperatorID: "Operator-J", UAVID: "UAV-J-777", Status: "APPROVED",
	})
	journeySeed(t, deps, &model.MissionApplication{ApplicationID: "APP-J-777", MissionID: "MISSION-2026-777", Status: "APPROVED"})
	journeySeed(t, deps, &model.FlightPass{PassID: "PASS-2026-777", MissionID: "MISSION-2026-777", UAVID: "UAV-J-777", Status: "VALID"})
	journeySeed(t, deps, journeyTx("CX-J-778", "MISSION_APPLICATION", "APP-J-777", "fabric", "fisco-bcos", 1000,
		base.Add(-90*time.Second), base.Add(-80*time.Second)))
	journeySeed(t, deps, journeyTx("CX-J-779", "FLIGHT_PASS", "PASS-2026-777", "irita", "fabric", 900,
		base.Add(-70*time.Second), base.Add(-60*time.Second)))
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": "UAV-J-777"})
	if resp["code"].(float64) != 0 {
		t.Fatalf("journey: %v", resp)
	}
	data := resp["data"].(map[string]any)
	anchor := data["anchor"].(map[string]any)
	if anchor["kind"] != "uav" || anchor["id"] != "UAV-J-777" || anchor["status"] != "REGISTERED" {
		t.Fatalf("anchor = %v", anchor)
	}
	hops := data["hops"].([]any)
	if len(hops) != 1 {
		t.Fatalf("hops len = %d, want 1（仅注册证明，无关簇不混入）: %v", len(hops), hops)
	}
	hop := hops[0].(map[string]any)
	if hop["cross_tx_id"] != "CX-J-777" || hop["message_type"] != "UAV_REGISTER_PROOF" || hop["business_id"] != "UAV-J-777" {
		t.Fatalf("hop = %v", hop)
	}
	objects := data["objects"].([]any)
	if len(objects) != 1 {
		t.Fatalf("objects len = %d, want 1（uav 独立锚点，不并入任务簇）", len(objects))
	}
	if o := objects[0].(map[string]any); o["kind"] != "uav" || o["id"] != "UAV-J-777" || o["status"] != "REGISTERED" {
		t.Fatalf("objects[0] = %v", o)
	}
	summary := data["summary"].(map[string]any)
	if summary["hop_count"].(float64) != 1 || summary["success_count"].(float64) != 1 ||
		summary["verify_pass"].(float64) != 1 || summary["verify_total"].(float64) != 1 {
		t.Fatalf("summary = %v", summary)
	}
	// 单跳全 SUCCESS → end_to_end_ms = 该跳 updated − created（10s）
	if summary["end_to_end_ms"] != float64(10000) {
		t.Fatalf("end_to_end_ms = %v, want 10000", summary["end_to_end_ms"])
	}
}

// TestExplorerJourneyEmptyHops 诚实红线（Review Focus 1）：锚点存在但零跨链行 →
// code 0 + hops [] + summary 计数 0、first_at/last_at/end_to_end_ms 全 null。
func TestExplorerJourneyEmptyHops(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	base := timex.Now().Truncate(time.Second)
	journeySeed(t, deps, &model.Mission{
		MissionID: "MISSION-2026-902", OperatorID: "Operator-A", UAVID: "UAV-J-902",
		Status: "DRAFT", CreatedAt: timex.New(base), UpdatedAt: timex.New(base),
	})
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": "MISSION-2026-902", "anchor_kind": "mission"})
	if resp["code"].(float64) != 0 {
		t.Fatalf("empty hops must be code 0 (锚点存在即成功), got %v", resp)
	}
	data := resp["data"].(map[string]any)
	if data["hops"] == nil {
		t.Fatal("hops must be [] not null")
	}
	if n := len(data["hops"].([]any)); n != 0 {
		t.Fatalf("hops len = %d, want 0", n)
	}
	summary := data["summary"].(map[string]any)
	for _, k := range []string{"hop_count", "success_count", "verify_pass", "verify_total"} {
		if summary[k].(float64) != 0 {
			t.Fatalf("summary.%s = %v, want 0", k, summary[k])
		}
	}
	for _, k := range []string{"first_at", "last_at", "end_to_end_ms"} {
		if summary[k] != nil {
			t.Fatalf("summary.%s = %v, want null（诚实零值）", k, summary[k])
		}
	}
	// objects 仍含锚点自身（DRAFT 原值）
	objects := data["objects"].([]any)
	if len(objects) != 1 {
		t.Fatalf("objects len = %d, want 1: %v", len(objects), objects)
	}
	if o := objects[0].(map[string]any); o["kind"] != "mission" || o["id"] != "MISSION-2026-902" || o["status"] != "DRAFT" {
		t.Fatalf("objects[0] = %v", o)
	}
}

// TestExplorerJourneyPartialFailure 一 hop FAILED → success_count < hop_count，
// end_to_end_ms 必须为 null（非全 SUCCESS 绝不报端到端耗时）。
func TestExplorerJourneyPartialFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	base := timex.Now().Truncate(time.Second)
	journeySeed(t, deps, &model.Mission{
		MissionID: "MISSION-2026-903", OperatorID: "Operator-A", UAVID: "UAV-J-903",
		Status: "REVIEWING", CreatedAt: timex.New(base), UpdatedAt: timex.New(base),
	})
	journeySeed(t, deps, &model.MissionApplication{
		ApplicationID: "APP-J-903", MissionID: "MISSION-2026-903", Status: "PENDING",
		CreatedAt: timex.New(base), UpdatedAt: timex.New(base),
	})
	okTx := journeyTx("CX-J-931", "MISSION_APPLICATION", "APP-J-903", "fabric", "fisco-bcos", 1100,
		base.Add(-3*time.Minute), base.Add(-170*time.Second))
	badTx := journeyTx("CX-J-932", "MISSION_REVIEW_RESULT", "APP-J-903", "fisco-bcos", "fabric", 0,
		base.Add(-2*time.Minute), base.Add(-115*time.Second))
	badTx.Status = "FAILED"
	badTx.VerifyResult = "FAIL_SM3"
	journeySeed(t, deps, okTx)
	journeySeed(t, deps, badTx)
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	resp := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": "MISSION-2026-903"})
	if resp["code"].(float64) != 0 {
		t.Fatalf("journey: %v", resp)
	}
	data := resp["data"].(map[string]any)
	hops := data["hops"].([]any)
	if len(hops) != 2 {
		t.Fatalf("hops len = %d, want 2（FAILED 行如实保留）", len(hops))
	}
	if hops[1].(map[string]any)["status"] != "FAILED" || hops[1].(map[string]any)["verify_result"] != "FAIL_SM3" {
		t.Fatalf("hops[1] = %v, want FAILED/FAIL_SM3 原值", hops[1])
	}
	summary := data["summary"].(map[string]any)
	if summary["hop_count"].(float64) != 2 || summary["success_count"].(float64) != 1 {
		t.Fatalf("summary counts = %v, want hop_count 2 / success_count 1", summary)
	}
	if summary["verify_pass"].(float64) != 1 || summary["verify_total"].(float64) != 2 {
		t.Fatalf("summary verify = %v, want verify_pass 1 / verify_total 2", summary)
	}
	if summary["success_count"].(float64) >= summary["hop_count"].(float64) {
		t.Fatalf("success_count must be < hop_count: %v", summary)
	}
	if summary["end_to_end_ms"] != nil {
		t.Fatalf("end_to_end_ms = %v, want null（非全 SUCCESS 诚实 null）", summary["end_to_end_ms"])
	}
	// hops 非空 → first_at/last_at 仍如实给出
	if summary["first_at"] != timex.FormatTime(base.Add(-3*time.Minute)) ||
		summary["last_at"] != timex.FormatTime(base.Add(-2*time.Minute)) {
		t.Fatalf("first_at/last_at = %v / %v", summary["first_at"], summary["last_at"])
	}
}

// TestExplorerJourneyBadParams 参数/锚点缺失一律 6002（HTTP 恒 200，绝不 404/500）：
// 缺 anchor_id → 「参数错误」；PASS- 前缀但查无 → 「锚点不存在」；非法 anchor_kind → 6002。
func TestExplorerJourneyBadParams(t *testing.T) {
	gin.SetMode(gin.TestMode)
	deps := validTestDeps(t)
	r, err := NewRouter(deps)
	if err != nil {
		t.Fatal(err)
	}

	// 缺 anchor_id → binding 失败 → 6002「参数错误」
	miss := postJSON(t, r, "/api/explorer/journey", map[string]any{})
	if miss["code"].(float64) != 6002 {
		t.Fatalf("missing anchor_id: want 6002, got %v", miss)
	}
	if !strings.Contains(miss["message"].(string), "参数错误") {
		t.Fatalf("missing anchor_id: message = %q, want 含「参数错误」", miss["message"])
	}

	// PASS- 前缀推断 → FlightPass 查无 → 6002「锚点不存在」
	ghost := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": "PASS-1999-999"})
	if ghost["code"].(float64) != 6002 {
		t.Fatalf("ghost pass: want 6002, got %v", ghost)
	}
	if !strings.Contains(ghost["message"].(string), "锚点不存在") {
		t.Fatalf("ghost pass: message = %q, want 含「锚点不存在」", ghost["message"])
	}

	// 显式 kind 指向查无 → 同 6002「锚点不存在」
	ghostM := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": "MISSION-1999-999", "anchor_kind": "mission"})
	if ghostM["code"].(float64) != 6002 || !strings.Contains(ghostM["message"].(string), "锚点不存在") {
		t.Fatalf("ghost mission: %v", ghostM)
	}
	ghostU := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": "UAV-NOPE", "anchor_kind": "uav"})
	if ghostU["code"].(float64) != 6002 || !strings.Contains(ghostU["message"].(string), "锚点不存在") {
		t.Fatalf("ghost uav: %v", ghostU)
	}

	// 非法 anchor_kind → 6002
	bogus := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": "X", "anchor_kind": "bogus"})
	if bogus["code"].(float64) != 6002 {
		t.Fatalf("bogus kind: want 6002, got %v", bogus)
	}

	// 无前缀且三表全不命中 → 6002「锚点不存在」（依序探测语义）
	noprefix := postJSON(t, r, "/api/explorer/journey", map[string]any{"anchor_id": "WHATEVER-1"})
	if noprefix["code"].(float64) != 6002 || !strings.Contains(noprefix["message"].(string), "锚点不存在") {
		t.Fatalf("no-prefix miss: %v", noprefix)
	}
}
