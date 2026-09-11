package offchain

import (
	"testing"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

func nodeFixture() []model.NetworkNode {
	return []model.NetworkNode{
		{NodeID: "UAV-A-001-NODE", NodeType: "UAV", Neighbors: `["N1"]`, Position: `{"x":0,"y":0}`, Status: "ONLINE"},
		{NodeID: "N1", NodeType: "EDGE", Neighbors: `["UAV-A-001-NODE","N2"]`, Position: `{"x":10,"y":10}`, Status: "ONLINE"},
		{NodeID: "N2", NodeType: "EDGE", Neighbors: `["N1","N3"]`, Position: `{"x":20,"y":20}`, Status: "ONLINE"},
		{NodeID: "N3", NodeType: "EDGE", Neighbors: `["N2","N4"]`, Position: `{"x":30,"y":30}`, Status: "ONLINE"},
		{NodeID: "N4", NodeType: "EDGE", Neighbors: `["N3","MGR"]`, Position: `{"x":40,"y":40}`, Status: "ONLINE"},
		{NodeID: "MGR", NodeType: "MANAGEMENT", Neighbors: `["N4"]`, Position: `{"x":50,"y":50}`, Status: "ONLINE"},
		{NodeID: NodeXID, NodeType: "ATTACKER", Neighbors: `[]`, Position: `{"x":1,"y":50}`, Status: "OFFLINE"},
		{NodeID: NodeYID, NodeType: "ATTACKER", Neighbors: `[]`, Position: `{"x":99,"y":51}`, Status: "OFFLINE"},
	}
}

func TestParsePositionAndNeighbors(t *testing.T) {
	p, err := ParsePosition(`{"x":10,"y":20.5}`)
	if err != nil || p.X != 10 || p.Y != 20.5 {
		t.Fatalf("pos: %+v err=%v", p, err)
	}
	if _, err := ParsePosition(`{`); err == nil {
		t.Fatal("bad position accepted")
	}
	n, err := ParseNeighbors(`["A","B"]`)
	if err != nil || len(n) != 2 || n[0] != "A" {
		t.Fatalf("neighbors: %v err=%v", n, err)
	}
	if n, err := ParseNeighbors(""); err != nil || len(n) != 0 {
		t.Fatalf("empty neighbors: %v err=%v", n, err)
	}
}

func TestBuildGraphNormal(t *testing.T) {
	nodes := nodeFixture()
	if WormholeEnabled(nodes) {
		t.Fatal("wormhole must be off (X/Y OFFLINE)")
	}
	adj, err := BuildGraph(nodes, false)
	if err != nil {
		t.Fatal(err)
	}
	// ONLINE 6 节点；链式邻接；X/Y 不在图中
	if len(adj) != 6 {
		t.Fatalf("adj size = %d", len(adj))
	}
	if _, ok := adj[NodeXID]; ok {
		t.Fatal("OFFLINE node in graph")
	}
	if len(adj["N1"]) != 2 { // UAV-A-001-NODE + N2
		t.Fatalf("N1 edges = %v", adj["N1"])
	}
	// N1-N2 距离 √200 ≈ 14.14 → 通告时延 round(14.14*0.5)+1 = 8
	for _, e := range adj["N1"] {
		if e.To == "N2" {
			if e.WormholeEdge || e.AdvertisedLatencyMs != 8 {
				t.Fatalf("N1-N2 edge = %+v", e)
			}
		}
	}
}

func TestBuildGraphWormholeEdges(t *testing.T) {
	nodes := nodeFixture()
	// 攻击开启形态（P3-4 的 DB 状态）：X/Y ONLINE + 虚假邻接（Task 8 toggle 写入的就是这个形态）
	for i := range nodes {
		switch nodes[i].NodeID {
		case NodeXID:
			nodes[i].Status = "ONLINE"
			nodes[i].Neighbors = `["N1","NODE-Y"]`
		case NodeYID:
			nodes[i].Status = "ONLINE"
			nodes[i].Neighbors = `["NODE-X","N4"]`
		case "N1":
			nodes[i].Neighbors = `["UAV-A-001-NODE","N2","NODE-X"]`
		case "N4":
			nodes[i].Neighbors = `["N3","MGR","NODE-Y"]`
		}
	}
	if !WormholeEnabled(nodes) {
		t.Fatal("wormhole must be on")
	}
	adj, err := BuildGraph(nodes, true)
	if err != nil {
		t.Fatal(err)
	}
	found := map[string]int64{} // "from>to" → 通告时延
	for from, es := range adj {
		for _, e := range es {
			if e.WormholeEdge {
				found[from+">"+e.To] = e.AdvertisedLatencyMs
			}
		}
	}
	// 3 条攻击边 N1-X / X-Y / Y-N4，双向共 6 个条目，全部 WormholeEdgeLatency
	if len(found) != 6 {
		t.Fatalf("wormhole edges = %v", found)
	}
	for k, v := range found {
		if v != WormholeEdgeLatency {
			t.Fatalf("%s latency = %d", k, v)
		}
	}
	// 攻击路径 N1→X→Y→N4 通告总时延 = 3ms，远小于正常链 N1→N2→N3→N4 = 8*3 = 24ms
	pAtk, latAtk, err := Dijkstra(adj, "N1", "N4")
	if err != nil {
		t.Fatal(err)
	}
	if latAtk >= 24 || len(pAtk) != 4 || pAtk[1] != NodeXID || pAtk[2] != NodeYID {
		t.Fatalf("attack path = %v lat=%d", pAtk, latAtk)
	}
}

func TestDijkstraExcludesNonOnlineAndUnreachable(t *testing.T) {
	nodes := nodeFixture()
	nodes[3].Status = "ISOLATED" // N3 隔离
	adj, err := BuildGraph(nodes, false)
	if err != nil {
		t.Fatal(err)
	}
	// N3 隔离后 UAV-A-001-NODE → MGR 不可达
	if _, _, err := Dijkstra(adj, "UAV-A-001-NODE", "MGR"); err == nil {
		t.Fatal("must be unreachable")
	} else if e, ok := err.(*errcode.Error); !ok || e.Code != errcode.PathUnreachable {
		t.Fatalf("err = %v", err)
	}
	// 正常路径确定且可达
	p, lat, err := Dijkstra(adj, "UAV-A-001-NODE", "N2")
	if err != nil || lat <= 0 {
		t.Fatalf("p=%v lat=%d err=%v", p, lat, err)
	}
	want := []string{"UAV-A-001-NODE", "N1", "N2"}
	if len(p) != len(want) {
		t.Fatalf("path = %v", p)
	}
	for i := range want {
		if p[i] != want[i] {
			t.Fatalf("path = %v", p)
		}
	}
}
