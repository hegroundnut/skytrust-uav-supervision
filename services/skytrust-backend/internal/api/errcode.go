package api

const (
	ErrOK = 0

	ErrInvalidUAV   = 1001
	ErrSM9Verify    = 1002
	ErrSM3Integrity = 1003
	ErrUAVState     = 1004

	ErrCrosschainSend = 2001
	ErrTargetChain    = 2002
	ErrRegVerify      = 2003
	ErrIdempotentDup  = 2004

	ErrRouteConflict = 3001
	ErrPassInvalid   = 3002
	ErrReviewRule    = 3003
	ErrMissionState  = 3004

	ErrWormholeRisk    = 4001
	ErrSessionAuth     = 4002
	ErrNodeIdentity    = 4003
	ErrPathUnreachable = 4004

	ErrTraceBroken = 5001
	ErrNoAuth      = 5002
	ErrAuthScope   = 5003
	ErrAuthExpired = 5004

	ErrExperiment = 6001
	ErrParam      = 6002

	ErrInternal = 9001
)
