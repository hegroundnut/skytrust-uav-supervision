package api

import "skytrust-backend/internal/errcode"

// 旧常量名保留为别名（Global Constraints 4/17），数值以 errcode 包为唯一真源。
const (
	ErrOK = errcode.OK

	ErrInvalidUAV   = errcode.InvalidUAV
	ErrSM9Verify    = errcode.SM9Verify
	ErrSM3Integrity = errcode.SM3Integrity
	ErrUAVState     = errcode.UAVState

	ErrCrosschainSend = errcode.CrosschainSend
	ErrTargetChain    = errcode.TargetChain
	ErrRegVerify      = errcode.RegVerify
	ErrIdempotentDup  = errcode.IdempotentDup

	ErrRouteConflict = errcode.RouteConflict
	ErrPassInvalid   = errcode.PassInvalid
	ErrReviewRule    = errcode.ReviewRule
	ErrMissionState  = errcode.MissionState

	ErrWormholeRisk    = errcode.WormholeRisk
	ErrSessionAuth     = errcode.SessionAuth
	ErrNodeIdentity    = errcode.NodeIdentity
	ErrPathUnreachable = errcode.PathUnreachable

	ErrTraceBroken = errcode.TraceBroken
	ErrNoAuth      = errcode.NoAuth
	ErrAuthScope   = errcode.AuthScope
	ErrAuthExpired = errcode.AuthExpired

	ErrExperiment = errcode.Experiment
	ErrParam      = errcode.Param

	ErrInternal = errcode.Internal
)
