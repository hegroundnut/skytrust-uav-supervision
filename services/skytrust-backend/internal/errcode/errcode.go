// Package errcode 业务错误码唯一真源（分段：1xxx 身份/商密，2xxx 跨链，
// 3xxx 任务/许可/审核，4xxx 链下/虫洞，5xxx 监管/授权，6xxx 实验/参数，9001 内部）。
package errcode

import "fmt"

const (
	OK = 0

	InvalidUAV   = 1001
	SM9Verify    = 1002
	SM3Integrity = 1003
	UAVState     = 1004

	CrosschainSend = 2001
	TargetChain    = 2002
	RegVerify      = 2003
	IdempotentDup  = 2004

	RouteConflict = 3001
	PassInvalid   = 3002
	ReviewRule    = 3003
	MissionState  = 3004

	WormholeRisk    = 4001
	SessionAuth     = 4002
	NodeIdentity    = 4003
	PathUnreachable = 4004

	TraceBroken = 5001
	NoAuth      = 5002
	AuthScope   = 5003
	AuthExpired = 5004

	Experiment = 6001
	Param      = 6002

	Internal = 9001
)

// Error 业务错误统一载体：Code 为 errcode 段数值。
// （原 crosschain.Error，终审 F5 裁定迁移至此，阻断业务域对 crosschain 包的依赖倒置。）
type Error struct {
	Code int
	Msg  string
}

func (e *Error) Error() string { return fmt.Sprintf("biz error %d: %s", e.Code, e.Msg) }

func NewError(code int, format string, a ...any) *Error {
	return &Error{Code: code, Msg: fmt.Sprintf(format, a...)}
}
