package demo

import (
	"testing"

	"skytrust-backend/internal/chainadapter"
	"skytrust-backend/internal/chainadapter/sim"
	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/model"
)

func TestInitCreatesDemoObjects(t *testing.T) {
	db, _ := model.Open(":memory:")
	model.Migrate(db)
	cs, _ := crypto.NewService(t.TempDir())
	chains := map[string]*sim.Chain{
		"fabric": sim.New("fabric"), "chainmaker": sim.New("chainmaker"), "fisco-bcos": sim.New("fisco-bcos"),
	}
	resets := make(map[string]chainadapter.Resettable, len(chains))
	for name, c := range chains {
		resets[name] = c
	}
	s := NewSeeder(db, cs, resets)
	rep, err := s.Init()
	if err != nil {
		t.Fatal(err)
	}
	if rep.Created["uav"] != 7 {
		t.Errorf("uav created = %d", rep.Created["uav"])
	}
	var uav model.UAV
	if err := db.First(&uav, "uav_id = ?", "UAV-A-001").Error; err != nil {
		t.Fatal(err)
	}
	if uav.SM9Identity != "SM9-ID-UAV-A-001" || uav.Status != "VERIFIED" ||
		uav.ManufacturerID != "Manufacturer-B" || uav.OperatorID != "Operator-A" {
		t.Errorf("bad UAV-A-001: %+v", uav)
	}
	var m model.IdentityMapping
	if err := db.First(&m, "pseudo = ?", "PSEUDO-UAV-83921").Error; err != nil {
		t.Fatal(err)
	}
	if m.UAVID != "UAV-A-001" || m.PassID != "PASS-2026-001" {
		t.Errorf("bad mapping: %+v", m)
	}
	var nodeX, nodeY model.NetworkNode
	db.First(&nodeX, "node_id = ?", "NODE-X")
	db.First(&nodeY, "node_id = ?", "NODE-Y")
	if nodeX.Status != "OFFLINE" || nodeY.Status != "OFFLINE" {
		t.Error("wormhole nodes must default OFFLINE")
	}
	var routes int64
	db.Model(&model.RouteSegment{}).Count(&routes)
	if routes != 5 {
		t.Errorf("routes = %d", routes)
	}
}

func TestInitIdempotent(t *testing.T) {
	db, _ := model.Open(":memory:")
	model.Migrate(db)
	cs, _ := crypto.NewService(t.TempDir())
	s := NewSeeder(db, cs, nil)
	s.Init()
	rep2, err := s.Init()
	if err != nil {
		t.Fatal(err)
	}
	if len(rep2.Created) != 0 || rep2.Skipped["uav"] != 7 {
		t.Errorf("second init must skip all: %+v", rep2)
	}
}

func TestResetClearsBusinessData(t *testing.T) {
	db, _ := model.Open(":memory:")
	model.Migrate(db)
	cs, _ := crypto.NewService(t.TempDir())
	chains := map[string]*sim.Chain{"chainmaker": sim.New("chainmaker")}
	resets := make(map[string]chainadapter.Resettable, len(chains))
	for name, c := range chains {
		resets[name] = c
	}
	s := NewSeeder(db, cs, resets)
	s.Init()
	// 模拟业务脏数据
	db.Create(&model.Mission{MissionID: "MISSION-DIRTY", Status: "DRAFT"})
	if _, err := s.Reset(); err != nil {
		t.Fatal(err)
	}
	var cnt int64
	db.Model(&model.Mission{}).Count(&cnt)
	if cnt != 0 {
		t.Error("missions must be cleared")
	}
	db.Model(&model.UAV{}).Count(&cnt)
	if cnt != 0 {
		t.Error("uavs must be cleared")
	}
	// Reset 后可再次 Init
	if _, err := s.Init(); err != nil {
		t.Fatal(err)
	}
	db.Model(&model.UAV{}).Count(&cnt)
	if cnt != 7 {
		t.Errorf("re-init uavs = %d", cnt)
	}
}

func TestTrajectoryData(t *testing.T) {
	if len(NormalTrajectory) < 10 || len(DeviationTrajectory) < 10 {
		t.Error("trajectories need >= 10 points")
	}
	if NormalTrajectory[0]["route_segment"] != "R101" {
		t.Error("normal trajectory must start on R101")
	}
	found := false
	for _, p := range DeviationTrajectory {
		if p["route_segment"] == "R209" {
			found = true
		}
	}
	if !found {
		t.Error("deviation trajectory must contain R209")
	}
}
