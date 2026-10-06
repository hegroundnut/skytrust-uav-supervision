package offchain

import (
	"context"
	"encoding/json"
	"math"
	"sync"
	"time"

	"skytrust-backend/internal/model"
)

// telemetrySimSpeedMPS SIM 推进巡航速度（米/秒），与演示轨迹速度同量级（seed.go NormalTrajectory ≈12）。
const telemetrySimSpeedMPS = 12.0

// TelemetryAutopilot 遥测 SIM 自动驾驶（spec §3.2，仿 autopilot.go 结构与生命周期语义）：
// 每 tick 为全部 ACTIVE 会话沿任务航路经纬度链按 速度×间隔 插值推进一条遥测（Source=SIM）。
// 任务缺结构化坐标的会话跳过（不造假坐标）；DEGRADED/CLOSED 会话不推进并清理进度。
// TELEMETRY_AUTOPILOT_MS 语义同 OFFCHAIN_AUTOPILOT_MS：测试 0=关闭；生产 main.go 0→2000；负值=显式关闭。
type TelemetryAutopilot struct {
	svc      *Service
	interval time.Duration

	mu       sync.Mutex
	progress map[string]*tlmProgress // session_id → 推进进度

	stop chan struct{}
	done chan struct{}
	once sync.Once
}

// tlmProgress 推进进度：第 SegIdx 段（wps[SegIdx]→wps[SegIdx+1]）上的分数 Frac∈[0,1)。
type tlmProgress struct {
	SegIdx int
	Frac   float64
}

// tlmWaypoint 走廊航点：经纬度 + 高度（所在航段高度带中值）。
type tlmWaypoint struct {
	Lat float64
	Lon float64
	Alt float64
}

// NewTelemetryAutopilot svc 为 nil 或 intervalMs<=0 时返回 nil（同 NewAutopilot 的 nil-safe 语义）。
func NewTelemetryAutopilot(svc *Service, intervalMs int) *TelemetryAutopilot {
	if svc == nil || intervalMs <= 0 {
		return nil
	}
	return &TelemetryAutopilot{
		svc:      svc,
		interval: time.Duration(intervalMs) * time.Millisecond,
		progress: map[string]*tlmProgress{},
		stop:     make(chan struct{}),
		done:     make(chan struct{}),
	}
}

// Start 启动后台循环；nil 接收者安全（接线处可无脑调用）。
func (a *TelemetryAutopilot) Start() {
	if a == nil {
		return
	}
	go a.loop()
}

// Stop 幂等停止并等待循环退出（once + done chan，同 Autopilot.Stop）。
func (a *TelemetryAutopilot) Stop() {
	if a == nil {
		return
	}
	a.once.Do(func() { close(a.stop) })
	<-a.done
}

func (a *TelemetryAutopilot) loop() {
	defer close(a.done)
	ticker := time.NewTicker(a.interval)
	defer ticker.Stop()
	for {
		select {
		case <-a.stop:
			return
		case <-ticker.C:
			a.tick()
		}
	}
}

// tick 单轮推进：逐会话 best-effort，单会话失败不影响其他（同 autopilot.tick 形状）。
func (a *TelemetryAutopilot) tick() {
	ctx := context.Background()
	var sessions []model.OffchainSession
	if err := a.svc.db.WithContext(ctx).Where("status = ?", "ACTIVE").Find(&sessions).Error; err != nil {
		return
	}
	stepM := telemetrySimSpeedMPS * a.interval.Seconds()
	alive := make(map[string]bool, len(sessions))
	for i := range sessions {
		sess := sessions[i]
		alive[sess.SessionID] = true
		if sess.MissionID == "" {
			continue
		}
		wps, ok := a.svc.corridorOf(ctx, sess.MissionID)
		if !ok {
			continue // 任务缺结构化坐标：跳过，不造假（spec §3.2）
		}
		a.mu.Lock()
		p := a.progress[sess.SessionID]
		if p == nil {
			p = &tlmProgress{}
			a.progress[sess.SessionID] = p
		}
		lat, lon, alt, heading := advanceOne(p, wps, stepM)
		a.mu.Unlock()
		// best-effort：落库失败（降级/关闭竞态）静默跳过，下一轮自然停止
		_, _ = a.svc.insertTelemetry(ctx, &sess, lat, lon, alt, telemetrySimSpeedMPS, heading, "SIM")
	}
	// 清理非 ACTIVE 会话的推进进度，防 map 泄漏
	a.mu.Lock()
	for id := range a.progress {
		if !alive[id] {
			delete(a.progress, id)
		}
	}
	a.mu.Unlock()
}

// corridorOf 由任务航路构建走廊航点链（相邻重复点去重，高度=航段高度带中值，共享点取后段）。
// 任务不存在/无航段/任一航段缺结构化坐标 → ok=false（spec §3.2：跳过不造假）。
// 域隔离（service.go P3-3）：直接读 model，不 import uavbusiness/crosschain。
func (s *Service) corridorOf(ctx context.Context, missionID string) ([]tlmWaypoint, bool) {
	var m model.Mission
	if err := s.db.WithContext(ctx).Where("mission_id = ?", missionID).First(&m).Error; err != nil {
		return nil, false
	}
	var segIDs []string
	if err := json.Unmarshal([]byte(m.RouteSegments), &segIDs); err != nil || len(segIDs) == 0 {
		return nil, false
	}
	var routes []model.RouteSegment
	if err := s.db.WithContext(ctx).Where("route_id IN ?", segIDs).Find(&routes).Error; err != nil {
		return nil, false
	}
	byID := make(map[string]model.RouteSegment, len(routes))
	for _, r := range routes {
		byID[r.RouteID] = r
	}
	var wps []tlmWaypoint
	appendWP := func(lat, lon, alt float64) {
		if n := len(wps); n > 0 && wps[n-1].Lat == lat && wps[n-1].Lon == lon {
			wps[n-1].Alt = alt // 两段共享点：取后段高度带
			return
		}
		wps = append(wps, tlmWaypoint{Lat: lat, Lon: lon, Alt: alt})
	}
	for _, id := range segIDs {
		r, ok := byID[id]
		if !ok {
			return nil, false
		}
		if r.StartLat == 0 && r.StartLon == 0 && r.EndLat == 0 && r.EndLon == 0 {
			return nil, false // 缺坐标段 → 该会话跳过
		}
		alt := (r.AltitudeMin + r.AltitudeMax) / 2
		appendWP(r.StartLat, r.StartLon, alt)
		appendWP(r.EndLat, r.EndLon, alt)
	}
	if len(wps) < 2 {
		return nil, false
	}
	return wps, true
}

// advanceOne 沿航点链把进度 p 推进 stepM 米（纯函数，可单测）：
// 返回插值经纬度/高度 + 航向（当前段首→尾方位角，度，正北顺时针 [0,360)）。
// 跨段结转剩余距离；飞完全程循环回起点（演示连续飞行，seq 仍由落库方单调递增）。
func advanceOne(p *tlmProgress, wps []tlmWaypoint, stepM float64) (lat, lon, alt, heading float64) {
	nSeg := len(wps) - 1
	if nSeg < 1 {
		return wps[0].Lat, wps[0].Lon, wps[0].Alt, 0
	}
	if p.SegIdx < 0 || p.SegIdx >= nSeg {
		p.SegIdx, p.Frac = 0, 0
	}
	remain := stepM
	for guard := 0; guard <= nSeg+1 && remain > 0; guard++ { // 至多推进一整圈，防零长段死循环
		a, b := wps[p.SegIdx], wps[p.SegIdx+1]
		length := haversineM(a.Lat, a.Lon, b.Lat, b.Lon)
		if length <= 0 { // 零长段：跳过
			if p.SegIdx == nSeg-1 {
				p.SegIdx, p.Frac = 0, 0
			} else {
				p.SegIdx++
				p.Frac = 0
			}
			continue
		}
		frac := p.Frac + remain/length
		if frac < 1 {
			p.Frac = frac
			break
		}
		remain -= (1 - p.Frac) * length
		if p.SegIdx == nSeg-1 { // 飞完全程 → 循环回起点（余程舍弃，演示语义）
			p.SegIdx, p.Frac = 0, 0
			break
		}
		p.SegIdx++
		p.Frac = 0
	}
	a, b := wps[p.SegIdx], wps[p.SegIdx+1]
	lat = a.Lat + (b.Lat-a.Lat)*p.Frac
	lon = a.Lon + (b.Lon-a.Lon)*p.Frac
	alt = a.Alt + (b.Alt-a.Alt)*p.Frac
	heading = bearingDeg(a.Lat, a.Lon, b.Lat, b.Lon)
	return
}

// haversineM 两点大圆距离（米），R=6371000。
func haversineM(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	s := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*math.Sin(dLon/2)*math.Sin(dLon/2)
	return 2 * R * math.Asin(math.Sqrt(s))
}

// bearingDeg 点 1→点 2 初始方位角（度，正北顺时针 [0,360)）。
func bearingDeg(lat1, lon1, lat2, lon2 float64) float64 {
	phi1, phi2 := lat1*math.Pi/180, lat2*math.Pi/180
	dLambda := (lon2 - lon1) * math.Pi / 180
	y := math.Sin(dLambda) * math.Cos(phi2)
	x := math.Cos(phi1)*math.Sin(phi2) - math.Sin(phi1)*math.Cos(phi2)*math.Cos(dLambda)
	deg := math.Atan2(y, x) * 180 / math.Pi
	return math.Mod(deg+360, 360)
}
