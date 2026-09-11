package offchain

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"skytrust-backend/internal/model"
)

// Autopilot 后台流量生成器（P3-9）：周期为全部 ACTIVE 会话发送 HEARTBEAT，
// 为虫洞检测持续供给观测流量。仅 main.go 生产接线启用；测试默认关闭（intervalMs<=0 → nil）。
type Autopilot struct {
	svc      *Service
	interval time.Duration
	stop     chan struct{}
	done     chan struct{}
	once     sync.Once
}

func NewAutopilot(svc *Service, intervalMs int) *Autopilot {
	if svc == nil || intervalMs <= 0 {
		return nil
	}
	return &Autopilot{
		svc:      svc,
		interval: time.Duration(intervalMs) * time.Millisecond,
		stop:     make(chan struct{}),
		done:     make(chan struct{}),
	}
}

func (a *Autopilot) Start() {
	if a == nil {
		return
	}
	go a.loop()
}

func (a *Autopilot) Stop() {
	if a == nil {
		return
	}
	a.once.Do(func() { close(a.stop) })
	<-a.done
}

func (a *Autopilot) loop() {
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

func (a *Autopilot) tick() {
	ctx := context.Background()
	traceID := model.GenTraceID()
	var sessions []model.OffchainSession
	if err := a.svc.db.WithContext(ctx).Where("status = ?", "ACTIVE").Find(&sessions).Error; err != nil {
		return
	}
	for _, sess := range sessions {
		var path []string
		if err := json.Unmarshal([]byte(sess.CurrentPath), &path); err != nil || len(path) < 2 {
			continue
		}
		// best-effort：发送失败（降级/关闭竞态）静默跳过，下一轮自然停止
		_, _ = a.svc.MessageSend(ctx, traceID, &MessageSendRequest{
			SessionID: sess.SessionID, MsgType: "HEARTBEAT",
			SourceNode: path[0], TargetNode: path[len(path)-1],
		})
	}
}
