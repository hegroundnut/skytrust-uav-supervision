package offchain

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"

	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
)

const (
	LatencyPerUnit            = 0.5 // ms/unit：通告时延斜率（P3-5 确定性仿真）
	BaseHopLatency      int64 = 1
	WormholeEdgeLatency int64 = 1 // 攻击边通告时延：谎报为极短
	NodeXID                   = "NODE-X"
	NodeYID                   = "NODE-Y"
)

type Position struct{ X, Y float64 }

type Edge struct {
	From                string  `json:"from"`
	To                  string  `json:"to"`
	Distance            float64 `json:"distance"`
	AdvertisedLatencyMs int64   `json:"advertised_latency_ms"`
	WormholeEdge        bool    `json:"wormhole_edge"`
}

func ParsePosition(s string) (Position, error) {
	var p Position
	if err := json.Unmarshal([]byte(s), &p); err != nil {
		return p, fmt.Errorf("position %q: %w", s, err)
	}
	return p, nil
}

func ParseNeighbors(s string) ([]string, error) {
	if s == "" {
		return []string{}, nil
	}
	var n []string
	if err := json.Unmarshal([]byte(s), &n); err != nil {
		return nil, fmt.Errorf("neighbors %q: %w", s, err)
	}
	if n == nil {
		n = []string{}
	}
	return n, nil
}

func Dist(a, b Position) float64 { return math.Hypot(a.X-b.X, a.Y-b.Y) }

func AdvertisedLatency(distance float64, wormholeEdge bool) int64 {
	if wormholeEdge {
		return WormholeEdgeLatency
	}
	return int64(math.Round(distance*LatencyPerUnit)) + BaseHopLatency
}

// WormholeEnabled P3-4：虫洞状态完全由 DB 推导——X 与 Y 均 ONLINE 即攻击开启。
func WormholeEnabled(nodes []model.NetworkNode) bool {
	xOnline, yOnline := false, false
	for _, n := range nodes {
		if n.NodeID == NodeXID && n.Status == "ONLINE" {
			xOnline = true
		}
		if n.NodeID == NodeYID && n.Status == "ONLINE" {
			yOnline = true
		}
	}
	return xOnline && yOnline
}

func BuildGraph(nodes []model.NetworkNode, wormholeEnabled bool) (map[string][]Edge, error) {
	online := map[string]model.NetworkNode{}
	for _, n := range nodes {
		if n.Status == "ONLINE" {
			online[n.NodeID] = n
		}
	}
	adj := map[string][]Edge{}
	seen := map[string]bool{}
	for id, n := range online {
		if _, ok := adj[id]; !ok {
			adj[id] = []Edge{}
		}
		nbrs, err := ParseNeighbors(n.Neighbors)
		if err != nil {
			return nil, err
		}
		posA, err := ParsePosition(n.Position)
		if err != nil {
			return nil, err
		}
		for _, m := range nbrs {
			mn, ok := online[m]
			if !ok || m == id {
				continue
			}
			a, b := id, m
			if a > b {
				a, b = b, a
			}
			key := a + "|" + b
			if seen[key] {
				continue
			}
			seen[key] = true
			posB, err := ParsePosition(mn.Position)
			if err != nil {
				return nil, err
			}
			wEdge := wormholeEnabled && (a == NodeXID || a == NodeYID || b == NodeXID || b == NodeYID)
			d := Dist(posA, posB)
			lat := AdvertisedLatency(d, wEdge)
			adj[id] = append(adj[id], Edge{From: id, To: m, Distance: d, AdvertisedLatencyMs: lat, WormholeEdge: wEdge})
			adj[m] = append(adj[m], Edge{From: m, To: id, Distance: d, AdvertisedLatencyMs: lat, WormholeEdge: wEdge})
		}
	}
	return adj, nil
}

// Dijkstra 最小总通告时延；同分按下一跳 ID 字典序取小（确定性）。
// 节点规模 ≤ 数十，O(V²) 扫描实现，避免堆样板。
func Dijkstra(adj map[string][]Edge, from, to string) ([]string, int64, error) {
	unreachable := errcode.NewError(errcode.PathUnreachable, "no route %s -> %s", from, to)
	if _, ok := adj[from]; !ok {
		return nil, 0, unreachable
	}
	if _, ok := adj[to]; !ok {
		return nil, 0, unreachable
	}
	const inf = math.MaxInt64
	dist := map[string]int64{}
	prev := map[string]string{}
	done := map[string]bool{}
	for id := range adj {
		dist[id] = inf
	}
	dist[from] = 0
	for {
		u := ""
		var best int64 = inf
		for id := range adj {
			if !done[id] && (dist[id] < best || (dist[id] == best && (u == "" || id < u))) {
				u, best = id, dist[id]
			}
		}
		if u == "" || best == inf {
			break
		}
		done[u] = true
		if u == to {
			break
		}
		for _, e := range adj[u] {
			v := e.To
			if done[v] {
				continue
			}
			nd := dist[u] + e.AdvertisedLatencyMs
			if nd < dist[v] || (nd == dist[v] && (prev[v] == "" || u < prev[v])) {
				dist[v], prev[v] = nd, u
			}
		}
	}
	if dist[to] == inf {
		return nil, 0, unreachable
	}
	// 回溯
	var rev []string
	for cur := to; cur != ""; cur = prev[cur] {
		rev = append(rev, cur)
		if cur == from {
			break
		}
	}
	path := make([]string, len(rev))
	for i, id := range rev {
		path[len(rev)-1-i] = id
	}
	return path, dist[to], nil
}

type TopologyView struct {
	Nodes           []model.NetworkNode `json:"nodes"`
	Edges           []Edge              `json:"edges"`
	WormholeEnabled bool                `json:"wormhole_enabled"`
	Isolated        []string            `json:"isolated"`
	ActiveSessions  int64               `json:"active_sessions"`
}

func (s *Service) TopologyGet(ctx context.Context, traceID string) (*TopologyView, error) {
	var nodes []model.NetworkNode
	if err := s.db.WithContext(ctx).Order("node_id ASC").Find(&nodes).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "load nodes: %v", err)
	}
	we := WormholeEnabled(nodes)
	adj, err := BuildGraph(nodes, we)
	if err != nil {
		return nil, errcode.NewError(errcode.Param, "bad node data: %v", err)
	}
	edges := []Edge{}
	for from, es := range adj {
		for _, e := range es {
			if from < e.To { // 规范序去重
				edges = append(edges, e)
			}
		}
	}
	sort.Slice(edges, func(i, j int) bool {
		if edges[i].From != edges[j].From {
			return edges[i].From < edges[j].From
		}
		return edges[i].To < edges[j].To
	})
	isolated := []string{}
	for _, n := range nodes {
		if n.Status == "ISOLATED" {
			isolated = append(isolated, n.NodeID)
		}
	}
	var active int64
	if err := s.db.WithContext(ctx).Model(&model.OffchainSession{}).
		Where("status IN ?", []string{"ACTIVE", "DEGRADED", "RECOVERED"}).Count(&active).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "count sessions: %v", err)
	}
	return &TopologyView{Nodes: nodes, Edges: edges, WormholeEnabled: we, Isolated: isolated, ActiveSessions: active}, nil
}
