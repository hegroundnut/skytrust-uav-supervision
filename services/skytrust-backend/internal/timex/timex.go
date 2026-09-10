// Package timex 时间格式唯一真源（Global Constraint 3：2006-01-02 15:04:05.000，Asia/Shanghai）。
// audit/api 包内既有的同值常量不动（避免无谓波及）；Plan 2 起新代码一律用本包。
package timex

import "time"

const (
	TimeFmt     = "2006-01-02 15:04:05.000"
	TimeFmtNoMs = "2006-01-02 15:04:05"
)

var loc = func() *time.Location {
	l, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		return time.FixedZone("CST", 8*3600)
	}
	return l
}()

func Now() time.Time { return time.Now().In(loc) }

func FormatTime(t time.Time) string { return t.In(loc).Format(TimeFmt) }

// ParseTime 接受 TimeFmt 与 TimeFmtNoMs 两种格式，按 Asia/Shanghai 解析。
func ParseTime(s string) (time.Time, error) {
	if t, err := time.ParseInLocation(TimeFmt, s, loc); err == nil {
		return t, nil
	}
	return time.ParseInLocation(TimeFmtNoMs, s, loc)
}
