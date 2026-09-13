package uavbusiness

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"testing"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crosschain"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

// seedMissionEnv 主数据 + 一台 VERIFIED UAV + R101(OPEN)/R205(OPEN)/R300(CLOSED)。
func seedMissionEnv(t *testing.T, svc *Service) {
	t.Helper()
	ctx := context.Background()
	seedParties(t, svc)
	if _, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", Model: "YX-200", SerialNo: "SN-M-001"}); err != nil {
		t.Fatalf("seed uav: %v", err)
	}
	for _, r := range []RouteInput{
		{RouteID: "R101", Zone: "Zone-A", StartPoint: "P1", EndPoint: "P2", AltitudeMin: 60, AltitudeMax: 150},
		{RouteID: "R205", Zone: "Zone-A", StartPoint: "P2", EndPoint: "P3", AltitudeMin: 60, AltitudeMax: 150},
		{RouteID: "R300", Zone: "Zone-B", StartPoint: "P4", EndPoint: "P5", AltitudeMin: 60, AltitudeMax: 150, CorridorStatus: "CLOSED"},
	} {
		if _, err := svc.CreateRoute(ctx, "TRACE-T", r); err != nil {
			t.Fatalf("seed route %s: %v", r.RouteID, err)
		}
	}
}

func baseMissionInput() MissionInput {
	return MissionInput{
		OperatorID: "Operator-O1", UAVID: "UAV-O1-001", MissionType: "POWER_INSPECTION",
		StartTime: "2026-09-12 09:00:00", EndTime: "2026-09-12 11:00:00",
		RouteSegments: []string{"R101", "R205"}, AltitudeMin: 60, AltitudeMax: 120,
		PayloadType: "CAMERA",
	}
}

func TestCreateMissionFullFlow(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	in := baseMissionInput()
	in.Description = "巡线走廊并拍摄缺陷"
	m, err := svc.CreateMission(context.Background(), "TRACE-T", in)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if m.MissionID != fmt.Sprintf("MISSION-%d-001", timex.Now().Year()) {
		t.Errorf("id = %q", m.MissionID)
	}
	if m.Status != "DRAFT" {
		t.Errorf("status = %q", m.Status)
	}
	if m.MaskedValue != "巡线走廊****" {
		t.Errorf("masked = %q", m.MaskedValue)
	}
	if len(m.SM3Hash) != 64 || m.Signature == "" || m.SM9Identity != "SM9-ID-UAV-O1-001" {
		t.Errorf("crypto fields: sm3=%q sig_len=%d sm9=%q", m.SM3Hash, len(m.Signature), m.SM9Identity)
	}
	plain, err := svc.cs.SM9Decrypt(m.MissionCiphertext)
	if err != nil || string(plain) != "巡线走廊并拍摄缺陷" {
		t.Errorf("ciphertext roundtrip: %q err=%v", plain, err)
	}
	if m.Zones != `["Zone-A"]` || m.RouteSegments != `["R101","R205"]` {
		t.Errorf("zones=%s segments=%s", m.Zones, m.RouteSegments)
	}
	b, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(b), "mission_ciphertext") || strings.Contains(string(b), m.MissionCiphertext) {
		t.Error("ciphertext must never be serialized")
	}
}

func TestCreateMissionValidation(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	ctx := context.Background()
	try := func(mut func(*MissionInput), want int, name string) {
		t.Helper()
		in := baseMissionInput()
		mut(&in)
		_, err := svc.CreateMission(ctx, "TRACE-T", in)
		if codeOf(err) != want {
			t.Errorf("%s: want %d, got %v", name, want, err)
		}
	}
	try(func(in *MissionInput) { in.UAVID = "UAV-NOPE" }, 1001, "uav 不存在")
	try(func(in *MissionInput) { in.OperatorID = "Operator-OTHER" }, 1001, "operator 不匹配")
	try(func(in *MissionInput) { in.RouteSegments = []string{"R999"} }, 3001, "航路不存在")
	try(func(in *MissionInput) { in.RouteSegments = []string{"R300"} }, 3001, "航路关闭")
	try(func(in *MissionInput) { in.EndTime = "2026-09-12 08:00:00" }, 6002, "end<=start")
	try(func(in *MissionInput) { in.StartTime = "09/12/2026" }, 6002, "时间格式")
	try(func(in *MissionInput) { in.AltitudeMin, in.AltitudeMax = 120, 60 }, 6002, "高度区间")
	try(func(in *MissionInput) { in.PayloadType = "" }, 6002, "缺 payload_type")
	// REVOKED UAV → 1001
	if _, _, err := svc.RegisterUAV(ctx, "TRACE-T", UAVInput{ManufacturerID: "Manufacturer-M1", OperatorID: "Operator-O1", SerialNo: "SN-M-002"}); err != nil {
		t.Fatalf("second uav: %v", err)
	}
	if _, err := svc.RevokeUAV(ctx, "TRACE-T", "UAV-O1-002", "退役", "Operator-O1"); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	try(func(in *MissionInput) { in.UAVID = "UAV-O1-002" }, 1001, "REVOKED uav")
	// 显式 ID 重复 → 6002
	first := baseMissionInput()
	first.MissionID = "MISSION-EXPLICIT-1"
	if _, err := svc.CreateMission(ctx, "TRACE-T", first); err != nil {
		t.Fatalf("explicit create: %v", err)
	}
	try(func(in *MissionInput) { in.MissionID = "MISSION-EXPLICIT-1" }, 6002, "显式 ID 重复")
}

func TestQueryListMission(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	ctx := context.Background()
	m1, err := svc.CreateMission(ctx, "TRACE-T", baseMissionInput())
	if err != nil {
		t.Fatalf("create m1: %v", err)
	}
	in2 := baseMissionInput()
	in2.MissionID = "MISSION-X-002"
	if _, err := svc.CreateMission(ctx, "TRACE-T", in2); err != nil {
		t.Fatalf("create m2: %v", err)
	}
	got, err := svc.QueryMission(ctx, "TRACE-T", m1.MissionID)
	if err != nil || got.MissionID != m1.MissionID {
		t.Fatalf("query: %+v err=%v", got, err)
	}
	if _, err := svc.QueryMission(ctx, "TRACE-T", "MISSION-NOPE"); codeOf(err) != 6002 {
		t.Fatalf("query unknown: %v", err)
	}
	all, total, err := svc.ListMission(ctx, "TRACE-T", MissionListFilter{})
	if err != nil || total != 2 || len(all) != 2 {
		t.Fatalf("list all: %d/%d err=%v", len(all), total, err)
	}
	drafts, total, err := svc.ListMission(ctx, "TRACE-T", MissionListFilter{OperatorID: "Operator-O1", Status: "DRAFT"})
	if err != nil || total != 2 || len(drafts) != 2 {
		t.Fatalf("list drafts: %d/%d err=%v", len(drafts), total, err)
	}
	pg, total, err := svc.ListMission(ctx, "TRACE-T", MissionListFilter{Page: 2, PageSize: 1})
	if err != nil || total != 2 || len(pg) != 1 {
		t.Fatalf("list paged: %d/%d err=%v", len(pg), total, err)
	}
}

func TestSubmitMissionSuccess(t *testing.T) {
	svc, db := testSvcFull(t)
	seedMissionEnv(t, svc)
	ctx := context.Background()
	m, err := svc.CreateMission(ctx, "TRACE-T", baseMissionInput())
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	app, tx, err := svc.SubmitMission(ctx, "TRACE-T", m.MissionID, "Operator-O1")
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	if app.Status != "RELAYED" || app.MissionID != m.MissionID || app.SourceChain != "fabric" {
		t.Fatalf("app = %+v", app)
	}
	if !strings.HasPrefix(app.SourceTxID, "FABRIC-") {
		t.Errorf("source tx = %q", app.SourceTxID)
	}
	if len(app.SM3Hash) != 64 || app.Signature == "" {
		t.Errorf("app crypto fields: %+v", app)
	}
	if tx.Status != "SUCCESS" || tx.MessageType != crosschain.MsgMissionApplication {
		t.Fatalf("tx = %+v", tx)
	}
	if tx.SourceChainTxID != app.SourceTxID {
		t.Errorf("gateway must verify business source tx: %q vs %q", tx.SourceChainTxID, app.SourceTxID)
	}
	if tx.SourceChainTxID == "" || tx.RegReceiveTxID == "" || tx.RegRelayTxID == "" || tx.TargetChainTxID == "" {
		t.Errorf("four tx ids: %+v", tx)
	}
	got, err := svc.QueryMission(ctx, "TRACE-T", m.MissionID)
	if err != nil || got.Status != "SUBMITTED" {
		t.Fatalf("mission status = %v err=%v", got.Status, err)
	}
	// 再提交 → 3004
	if _, _, err := svc.SubmitMission(ctx, "TRACE-T", m.MissionID, "Operator-O1"); codeOf(err) != 3004 {
		t.Fatalf("resubmit: want 3004, got %v", err)
	}
	var cnt int64
	db.Model(&model.AuditLog{}).Where("target_id = ? AND action = ?", app.ApplicationID, "MISSION_SUBMIT").Count(&cnt)
	if cnt != 1 {
		t.Errorf("want 1 MISSION_SUBMIT audit row, got %d", cnt)
	}
}

func TestSubmitMissionFailWithdrawsAndRetries(t *testing.T) {
	sims := defaultTestSims()
	svc, _ := testSvcWith(t, sims)
	seedMissionEnv(t, svc)
	// 故障注入时序偏差说明：简报原文在构造期注入 RegisterReceive 故障，但 seedMissionEnv
	// 内的 RegisterUAV 同样经 chainmaker RegisterReceive，会先行消耗该次注入（seed 中止、
	// UAV 停留 REGISTERED）。sim 无运行期注入入口、Gateway.chains 为 crosschain 包私有，
	// 故铺环境后重建网关换装带故障的 chainmaker——注入点、故障语义与全部断言同简报。
	adapters := map[string]chainadapter.ChainAdapter{
		"fabric":     sims["fabric"],
		"chainmaker": sim.New("chainmaker", sim.WithFailNext("RegisterReceive", 1)),
		"fisco-bcos": sims["fisco-bcos"],
	}
	svc.gw = crosschain.NewGateway(svc.db, svc.cs, adapters, svc.audit)
	ctx := context.Background()
	m, err := svc.CreateMission(ctx, "TRACE-T", baseMissionInput())
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	app, tx, err := svc.SubmitMission(ctx, "TRACE-T", m.MissionID, "Operator-O1")
	if codeOf(err) != errcode.CrosschainSend {
		t.Fatalf("want 2001, got %v", err)
	}
	if app.Status != "FAILED" || tx.Status != "FAILED" {
		t.Fatalf("app=%s tx=%s", app.Status, tx.Status)
	}
	// 撤回：SUBMITTED→DRAFT，可修改重报
	got, err := svc.QueryMission(ctx, "TRACE-T", m.MissionID)
	if err != nil || got.Status != "DRAFT" {
		t.Fatalf("withdrawn mission status = %v err=%v", got.Status, err)
	}
	// 链已恢复 → 重报成功（新 application_id，幂等键不同）
	app2, tx2, err := svc.SubmitMission(ctx, "TRACE-T", m.MissionID, "Operator-O1")
	if err != nil {
		t.Fatalf("retry submit: %v", err)
	}
	if app2.ApplicationID == app.ApplicationID || app2.Status != "RELAYED" || tx2.Status != "SUCCESS" {
		t.Fatalf("retry: app=%+v tx=%s", app2, tx2.Status)
	}
	got, _ = svc.QueryMission(ctx, "TRACE-T", m.MissionID)
	if got.Status != "SUBMITTED" {
		t.Fatalf("after retry status = %q", got.Status)
	}
}

// TestGenMissionIDYearRollsWithCurrentYear C17：生成 mission_id 的年份一律显式取自
// timex.Now().Year()（年份随当前年滚动），不再跟随 start_time 年份——远未来窗口
// （2031）也必须产出 MISSION-<当前年>- 前缀（旧实现按 start.Year() 会得 MISSION-2031-）。
func TestGenMissionIDYearRollsWithCurrentYear(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	in := baseMissionInput()
	in.StartTime = "2031-01-01 09:00:00"
	in.EndTime = "2031-01-01 11:00:00"
	m, err := svc.CreateMission(context.Background(), "TRACE-T", in)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	want := fmt.Sprintf("MISSION-%d-", timex.Now().Year())
	if !strings.HasPrefix(m.MissionID, want) {
		t.Fatalf("mission_id = %q, want prefix %q（年份必须随当前年滚动）", m.MissionID, want)
	}
}

// TestMaskShortValueFullMask C19：短描述（≤4 字符）脱敏后必须全遮蔽（等长 *），
// 不得泄露任何原文——旧实现 "机密"→"机密****" 泄露全部短值。
func TestMaskShortValueFullMask(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	in := baseMissionInput()
	in.Description = "机密"
	m, err := svc.CreateMission(context.Background(), "TRACE-T", in)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if m.MaskedValue != "**" {
		t.Fatalf("masked = %q, want %q（短值必须全遮蔽）", m.MaskedValue, "**")
	}
}

// TestMaskDescriptionPolicy C19 统一脱敏策略直测（Step 1 盘点裁定：短值分支收紧，
// >4 沿用现行函数策略）：≤4 全遮蔽等长 *；>4 保留前 4 字符 + 固定 ****。
func TestMaskDescriptionPolicy(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{"a", "*"},
		{"ab", "**"},
		{"abcd", "****"},
		{"abcde", "abcd****"},
		{"巡线走廊并拍摄缺陷", "巡线走廊****"},
	} {
		if got := maskDescription(tc.in); got != tc.want {
			t.Errorf("maskDescription(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestCreateMissionConcurrentDuplicateIDExactlyOneWins C18：并发同显式 mission_id
// 创建恰一成功；失败侧返回既有重复类业务错误码（6002），不得泄漏为 9001。
func TestCreateMissionConcurrentDuplicateIDExactlyOneWins(t *testing.T) {
	svc, _ := testSvcFull(t)
	seedMissionEnv(t, svc)
	const n = 8
	var wg sync.WaitGroup
	start := make(chan struct{})
	created := make(chan string, n)
	errs := make(chan error, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			in := baseMissionInput()
			in.MissionID = "MISSION-C18-001"
			m, err := svc.CreateMission(context.Background(), "TRACE-C18", in)
			if err != nil {
				errs <- err
				return
			}
			created <- m.MissionID
		}()
	}
	close(start)
	wg.Wait()
	close(created)
	close(errs)
	wins := 0
	for range created {
		wins++
	}
	if wins != 1 {
		t.Fatalf("exactly one concurrent duplicate must win, got %d (errs=%d)", wins, len(errs))
	}
	for err := range errs {
		if codeOf(err) != errcode.Param {
			t.Fatalf("concurrent duplicate loser must get existing biz code 6002, got %v", err)
		}
	}
}
