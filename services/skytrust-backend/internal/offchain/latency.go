package offchain

import "fmt"

// JitterMod 确定性抖动模数（P3-5，无随机数）：hop_latency = advertised + seq%JitterMod。
const JitterMod int64 = 3

func HopLatency(advertisedMs, seq int64) int64 { return advertisedMs + seq%JitterMod }

type HopDetail struct {
	From      string `json:"from"`
	To        string `json:"to"`
	LatencyMs int64  `json:"latency_ms"`
}

// PathLatency 逐跳实测时延：每跳 = 该跳通告时延 + seq%JitterMod；返回明细与总和。
func PathLatency(adj map[string][]Edge, path []string, seq int64) ([]HopDetail, int64, error) {
	if len(path) < 2 {
		return nil, 0, fmt.Errorf("path too short: %v", path)
	}
	details := make([]HopDetail, 0, len(path)-1)
	var total int64
	for i := 0; i+1 < len(path); i++ {
		a, b := path[i], path[i+1]
		found := false
		for _, e := range adj[a] {
			if e.To == b {
				lat := HopLatency(e.AdvertisedLatencyMs, seq)
				details = append(details, HopDetail{From: a, To: b, LatencyMs: lat})
				total += lat
				found = true
				break
			}
		}
		if !found {
			return nil, 0, fmt.Errorf("no edge %s -> %s", a, b)
		}
	}
	return details, total, nil
}

// GeoFloorMs 地理下限：光速近似 dist*LatencyPerUnit，低于它即物理矛盾（P3-6 latency 维）。
func GeoFloorMs(start, end Position) float64 { return Dist(start, end) * LatencyPerUnit }

// SimulatedChallengeDeltaMs 挑战-响应时差仿真值：隧道两端共享时钟 → 恒为 0（P3-6 challenge 维）。
func SimulatedChallengeDeltaMs() int64 { return 0 }
