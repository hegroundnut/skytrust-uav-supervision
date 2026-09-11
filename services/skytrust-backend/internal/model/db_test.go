package model

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"skytrust-backend/internal/timex"
)

func TestOpenMemoryAndMigrate(t *testing.T) {
	db, err := Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	m := db.Migrator()
	for _, want := range []string{"manufacturers", "uavs", "missions", "crosschain_txes",
		"flight_passes", "network_nodes", "offchain_messages", "security_events",
		"identity_mappings", "regulatory_auths", "regulatory_audits", "experiment_runs", "audit_logs"} {
		if !m.HasTable(want) {
			t.Errorf("missing table %s", want)
		}
	}
}

func TestCrosschainIdempotencyUnique(t *testing.T) {
	db, _ := Open(":memory:")
	Migrate(db)
	tx1 := &CrosschainTx{CrossTxID: "CX-1", IdempotencyKey: "K1", Status: "PENDING"}
	tx2 := &CrosschainTx{CrossTxID: "CX-2", IdempotencyKey: "K1", Status: "PENDING"}
	if err := db.Create(tx1).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(tx2).Error; err == nil {
		t.Error("duplicate idempotency_key must fail")
	}
}

func TestUAVDefaults(t *testing.T) {
	db, _ := Open(":memory:")
	Migrate(db)
	u := &UAV{UAVID: "UAV-A-001", SerialNo: "SN-001"}
	if err := db.Create(u).Error; err != nil {
		t.Fatal(err)
	}
	var got UAV
	db.First(&got, "uav_id = ?", "UAV-A-001")
	if got.Status != "UNREGISTERED" {
		t.Errorf("default status = %q", got.Status)
	}
}

func TestMissionCiphertextHiddenInJSON(t *testing.T) {
	m := Mission{MissionID: "M1", MissionCiphertext: "SECRET"}
	b, _ := json.Marshal(m)
	if strings.Contains(string(b), "SECRET") {
		t.Error("ciphertext must not serialize to JSON")
	}
}

func TestTimeGormRoundtrip(t *testing.T) {
	db, err := Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	start := timex.New(time.Date(2026, 9, 12, 9, 0, 0, 0, time.UTC))
	m := Mission{MissionID: "MISSION-2026-901", OperatorID: "Operator-A", UAVID: "UAV-A-001",
		MissionType: "PATROL", StartTime: start, EndTime: start, Status: "DRAFT"}
	if err := db.Create(&m).Error; err != nil {
		t.Fatal(err)
	}
	// 自动填充必须存活（Value 返回 time.Time 的意义所在）
	if m.CreatedAt.IsZero() || m.UpdatedAt.IsZero() {
		t.Fatalf("auto-fill dead: %+v", m)
	}
	var back Mission
	if err := db.First(&back, "mission_id = ?", m.MissionID).Error; err != nil {
		t.Fatal(err)
	}
	if !back.StartTime.Equal(start.Time) || timex.FormatTime(back.StartTime.Time) != "2026-09-12 17:00:00.000" {
		t.Fatalf("roundtrip drift: %v", back.StartTime)
	}
	// ORDER BY created_at 字典序可用（单一写入格式）
	m2 := m
	m2.MissionID = "MISSION-2026-902"
	// 简报测试构造适配（断言逐字保留）：m2 复制了 m 已被 Create 回填的 CreatedAt（同纳秒值），
	// 而 GORM 仅对零值时间戳自动填充 → 两行 created_at 文本完全相同，DESC 退化为并列
	// （SQLite 稳定排序按 rowid 返回，901 在前，断言必败）。清零后依赖自动填充亦不可靠：
	// 本机 Windows 系统时钟以 ~1ms 粒度刷新，两次 Create 落在同一 tick 会得到相同 curTime
	// （实测 10 次 1 现并列）。改为显式赋 m2 一个严格晚于 m 的 CreatedAt——仍经由
	// timex.Time Value() 单一写入路径，"单一格式 + 字典序 DESC 后建在前"语义不变且完全确定。
	m2.CreatedAt = timex.New(m.CreatedAt.Add(time.Second))
	if err := db.Create(&m2).Error; err != nil {
		t.Fatal(err)
	}
	var list []Mission
	if err := db.Order("created_at DESC").Find(&list).Error; err != nil || len(list) != 2 || list[0].MissionID != "MISSION-2026-902" {
		t.Fatalf("order: %v err=%v", list, err)
	}
}
