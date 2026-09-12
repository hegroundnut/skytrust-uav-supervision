package regulatory

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"skytrust-backend/internal/crypto"
	"skytrust-backend/internal/errcode"
	"skytrust-backend/internal/model"
	"skytrust-backend/internal/timex"
)

type TraceRequest struct {
	Pseudo        string `json:"pseudo"`
	DeviceAddress string `json:"device_address"`
	AlertID       string `json:"alert_id"`
	Operator      string `json:"operator" binding:"required"`
}

type TraceLevel struct {
	Level     int    `json:"level"`
	Name      string `json:"name"`
	Value     string `json:"value"`
	Source    string `json:"source"` // CHAINMAKER_INDEX|FABRIC_DETAIL|FISCO_BCOS_DETAIL（P4-3）
	LatencyMs int64  `json:"latency_ms"`
	Status    string `json:"status"` // RESOLVED|BROKEN
	Reason    string `json:"reason,omitempty"`
}

type TraceResult struct {
	Entry          string       `json:"entry"`
	EntryType      string       `json:"entry_type"` // PSEUDO|DEVICE_ADDRESS|ALERT_ID
	Pseudonym      string       `json:"pseudonym"`
	Resolved       bool         `json:"resolved"`
	BreakLevel     int          `json:"break_level"` // 0 = 七级全通
	Levels         []TraceLevel `json:"levels"`
	TraceLatencyMs int64        `json:"trace_latency_ms"`
}

// levelSources 各级来源链标注（P4-3：L1-L4 监管链索引，L5-L6 运营链明细，L7 管理链明细）。
var levelSources = [7]string{
	SourceChainmakerIndex, SourceChainmakerIndex, SourceChainmakerIndex, SourceChainmakerIndex,
	SourceFabricDetail, SourceFabricDetail, SourceFiscoDetail,
}

// TraceIdentity 7 级跨链身份追踪（spec §9.1）：伪名 → 设备地址 → 许可 → SM9 身份 → 无人机 → 运营方 → 厂商。
// 断链即断点（P4-2）：返回部分结果 + 5001，断点之后级别值为空——禁止拼造。追踪不做授权门禁。
func (s *Service) TraceIdentity(ctx context.Context, traceID string, req *TraceRequest) (*TraceResult, error) {
	if req.Operator == "" {
		return nil, errcode.NewError(errcode.Param, "operator 必填")
	}
	entry, entryType, pseudonym := "", "", ""
	switch {
	case req.AlertID != "":
		var ev model.SecurityEvent
		if err := s.db.WithContext(ctx).Where("alert_id = ?", req.AlertID).First(&ev).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errcode.NewError(errcode.Param, "告警 %s 不存在", req.AlertID)
			}
			return nil, errcode.NewError(errcode.Internal, "load security_event: %v", err)
		}
		entry, entryType, pseudonym = req.AlertID, "ALERT_ID", ev.UAVPseudonym
	case req.Pseudo != "":
		entry, entryType, pseudonym = req.Pseudo, "PSEUDO", req.Pseudo
	case req.DeviceAddress != "":
		entry, entryType = req.DeviceAddress, "DEVICE_ADDRESS"
	default:
		return nil, errcode.NewError(errcode.Param, "pseudo/device_address/alert_id 至少提供一个")
	}

	start := timex.Now()
	res := &TraceResult{Entry: entry, EntryType: entryType, Pseudonym: pseudonym, Levels: make([]TraceLevel, 7)}
	elapsed := func() int64 { return time.Since(start).Milliseconds() }
	resolve := func(i int, value string) {
		res.Levels[i] = TraceLevel{Level: i + 1, Name: TraceLevelNames[i], Value: value,
			Source: levelSources[i], LatencyMs: elapsed(), Status: "RESOLVED"}
	}
	breakAt := func(i int, reason string) error {
		res.Levels[i] = TraceLevel{Level: i + 1, Name: TraceLevelNames[i],
			Source: levelSources[i], LatencyMs: elapsed(), Status: "BROKEN", Reason: reason}
		for j := i + 1; j < 7; j++ {
			res.Levels[j] = TraceLevel{Level: j + 1, Name: TraceLevelNames[j], Source: levelSources[j],
				LatencyMs: elapsed(), Status: "BROKEN", Reason: fmt.Sprintf("skipped: break at level %d", i+1)}
		}
		res.Resolved = false
		res.BreakLevel = i + 1
		res.TraceLatencyMs = elapsed()
		s.logAudit(traceID, req.Operator, "TRACE_IDENTITY_BROKEN", "PSEUDO", pseudonym, map[string]any{
			"entry": entry, "entry_type": entryType, "break_level": i + 1, "reason": reason,
			"trace_latency_ms": res.TraceLatencyMs,
		})
		return errcode.NewError(errcode.TraceBroken,
			"identity trace broken at level %d (%s): %s", i+1, TraceLevelNames[i], reason)
	}

	var m model.IdentityMapping
	mq := s.db.WithContext(ctx).Model(&model.IdentityMapping{})
	if entryType == "DEVICE_ADDRESS" {
		mq = mq.Where("device_address = ?", req.DeviceAddress)
	} else {
		mq = mq.Where("pseudo = ?", pseudonym)
	}
	if err := mq.Order("created_at DESC").First(&m).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return res, breakAt(0, "chainmaker 索引无此身份映射")
		}
		return nil, errcode.NewError(errcode.Internal, "load identity_mapping: %v", err)
	}
	res.Pseudonym = m.Pseudo

	resolve(0, m.Pseudo) // L1 PSEUDO
	if m.DeviceAddress == "" {
		return res, breakAt(1, "映射缺少设备地址")
	}
	resolve(1, m.DeviceAddress) // L2 DEVICE_ADDRESS
	if m.PassID == "" {
		return res, breakAt(2, "映射缺少 pass_id")
	}
	var passCnt int64
	if err := s.db.WithContext(ctx).Model(&model.FlightPass{}).Where("pass_id = ?", m.PassID).Count(&passCnt).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "flight pass lookup: %v", err)
	}
	if passCnt == 0 {
		return res, breakAt(2, fmt.Sprintf("flight pass %s 不存在", m.PassID))
	}
	resolve(2, m.PassID) // L3 PASS_ID
	if want := crypto.SM9IdentityOf(m.UAVID); m.SM9Identity != want {
		return res, breakAt(3, fmt.Sprintf("SM9 身份与 UAV 不匹配（映射 %s vs 期望 %s）", m.SM9Identity, want))
	}
	resolve(3, m.SM9Identity) // L4 SM9_IDENTITY
	var uav model.UAV
	if err := s.db.WithContext(ctx).Where("uav_id = ?", m.UAVID).First(&uav).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return res, breakAt(4, fmt.Sprintf("uav %s 不存在", m.UAVID))
		}
		return nil, errcode.NewError(errcode.Internal, "load uav: %v", err)
	}
	resolve(4, m.UAVID) // L5 UAV_ID
	if uav.OperatorID != m.OperatorID {
		return res, breakAt(5, fmt.Sprintf("运营方归属不一致（运营链 %s vs 索引 %s）", uav.OperatorID, m.OperatorID))
	}
	var opCnt int64
	if err := s.db.WithContext(ctx).Model(&model.Operator{}).Where("operator_id = ?", m.OperatorID).Count(&opCnt).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "operator lookup: %v", err)
	}
	if opCnt == 0 {
		return res, breakAt(5, fmt.Sprintf("operator %s 不存在", m.OperatorID))
	}
	resolve(5, m.OperatorID) // L6 OPERATOR_ID
	if uav.ManufacturerID != m.ManufacturerID {
		return res, breakAt(6, fmt.Sprintf("厂商归属不一致（运营链 %s vs 索引 %s）", uav.ManufacturerID, m.ManufacturerID))
	}
	var mfgCnt int64
	if err := s.db.WithContext(ctx).Model(&model.Manufacturer{}).Where("manufacturer_id = ?", m.ManufacturerID).Count(&mfgCnt).Error; err != nil {
		return nil, errcode.NewError(errcode.Internal, "manufacturer lookup: %v", err)
	}
	if mfgCnt == 0 {
		return res, breakAt(6, fmt.Sprintf("manufacturer %s 不存在", m.ManufacturerID))
	}
	resolve(6, m.ManufacturerID) // L7 MANUFACTURER_ID

	res.Resolved = true
	res.BreakLevel = 0
	res.TraceLatencyMs = elapsed()
	s.logAudit(traceID, req.Operator, "TRACE_IDENTITY", "PSEUDO", m.Pseudo, map[string]any{
		"entry": entry, "entry_type": entryType, "uav_id": m.UAVID, "operator_id": m.OperatorID,
		"manufacturer_id": m.ManufacturerID, "trace_latency_ms": res.TraceLatencyMs,
	})
	return res, nil
}
