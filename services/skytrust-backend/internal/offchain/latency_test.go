package offchain

import (
	"math"
	"testing"
)

func TestHopLatencyDeterministicJitter(t *testing.T) {
	cases := []struct{ adv, seq, want int64 }{
		{8, 0, 8}, {8, 1, 9}, {8, 2, 10}, {8, 3, 8}, {8, 4, 9}, {1, 2, 3},
	}
	for _, c := range cases {
		if got := HopLatency(c.adv, c.seq); got != c.want {
			t.Fatalf("HopLatency(%d,%d) = %d want %d", c.adv, c.seq, got, c.want)
		}
	}
	if SimulatedChallengeDeltaMs() != 0 {
		t.Fatal("challenge delta must be 0 in simulation")
	}
}

func TestGeoFloorMs(t *testing.T) {
	got := GeoFloorMs(Position{X: 0, Y: 0}, Position{X: 50, Y: 50})
	want := math.Sqrt(5000) * LatencyPerUnit // ≈ 35.355
	if math.Abs(got-want) > 0.001 {
		t.Fatalf("geo floor = %v want %v", got, want)
	}
	if GeoFloorMs(Position{X: 3, Y: 4}, Position{X: 3, Y: 4}) != 0 {
		t.Fatal("same point floor must be 0")
	}
}

func TestPathLatencyAttackVsNormal(t *testing.T) {
	nodes := nodeFixture()
	// 正常图：UAV-A-001-NODE → MGR，5 跳，每跳通告 8ms
	adjN, err := BuildGraph(nodes, false)
	if err != nil {
		t.Fatal(err)
	}
	pathN, _, err := Dijkstra(adjN, "UAV-A-001-NODE", "MGR")
	if err != nil {
		t.Fatal(err)
	}
	detN, totalN, err := PathLatency(adjN, pathN, 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(detN) != len(pathN)-1 || detN[0].From != pathN[0] || detN[0].To != pathN[1] {
		t.Fatalf("detail = %+v path = %v", detN, pathN)
	}
	floorN := GeoFloorMs(Position{X: 0, Y: 0}, Position{X: 50, Y: 50})
	if float64(totalN) < floorN { // 正常路径实测 ≥ 地理下限（无异常）
		t.Fatalf("normal total %d < floor %v", totalN, floorN)
	}
	// 攻击图：N1 → N4 走隧道，3 跳，每跳通告 1ms
	nodesW := nodeFixture()
	for i := range nodesW {
		switch nodesW[i].NodeID {
		case NodeXID:
			nodesW[i].Status = "ONLINE"
			nodesW[i].Neighbors = `["N1","NODE-Y"]`
		case NodeYID:
			nodesW[i].Status = "ONLINE"
			nodesW[i].Neighbors = `["NODE-X","N4"]`
		case "N1":
			nodesW[i].Neighbors = `["UAV-A-001-NODE","N2","NODE-X"]`
		case "N4":
			nodesW[i].Neighbors = `["N3","MGR","NODE-Y"]`
		}
	}
	adjW, err := BuildGraph(nodesW, true)
	if err != nil {
		t.Fatal(err)
	}
	pathW, _, err := Dijkstra(adjW, "N1", "N4")
	if err != nil {
		t.Fatal(err)
	}
	_, totalW, err := PathLatency(adjW, pathW, 1)
	if err != nil {
		t.Fatal(err)
	}
	floorW := GeoFloorMs(Position{X: 10, Y: 10}, Position{X: 40, Y: 40})
	if float64(totalW) >= floorW*0.5 {
		t.Fatalf("attack total %d must be < floor*0.5 (%v)", totalW, floorW)
	}
	if totalW >= totalN { // 攻击路径"看起来"更快——这正是虫洞的物理矛盾
		t.Fatalf("attack %d must be < normal %d", totalW, totalN)
	}
	// 缺边路径 → error
	if _, _, err := PathLatency(adjN, []string{"UAV-A-001-NODE", "MGR"}, 1); err == nil {
		t.Fatal("missing edge must error")
	}
}
