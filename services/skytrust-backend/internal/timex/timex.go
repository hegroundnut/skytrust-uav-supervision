// Package timex 时间格式唯一真源（Global Constraint 3：2006-01-02 15:04:05.000，Asia/Shanghai）。
// audit/api 包内既有的同值常量不动（避免无谓波及）；Plan 2 起新代码一律用本包。
package timex

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"
)

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

// Time 包装 time.Time：JSON 渲染一律 TimeFmt（Asia/Shanghai），
// GORM 持久化经 Value/Scan；Value 返回 time.Time 以保住 datetime 列类型、
// AutoCreateTime/AutoUpdateTime 自动填充与全库单一写入格式（ORDER BY 字典序安全）。
type Time struct{ time.Time }

// New 包装任意 time.Time 并重锚定 Asia/Shanghai。
func New(t time.Time) Time { return Time{t.In(loc)} }

// NowT 当前时间的 Time 形态。
func NowT() Time { return New(Now()) }

// GormDataType 显式声明 time，防 Valuer 推断歧义。
func (t Time) GormDataType() string { return "time" }

func (t Time) MarshalJSON() ([]byte, error) {
	return []byte(`"` + FormatTime(t.Time) + `"`), nil
}

func (t *Time) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), `"`)
	if s == "" || s == "null" {
		return nil
	}
	pt, err := ParseTime(s)
	if err != nil {
		return err
	}
	*t = Time{pt}
	return nil
}

// Value 必须返回 time.Time（返回 string 会静默杀死 GORM 自动填充并混写格式）。
func (t Time) Value() (driver.Value, error) {
	if t.IsZero() {
		return nil, nil
	}
	return t.Time.In(loc), nil
}

// Scan 容忍驱动返回的 time.Time / string / []byte / nil；
// zone-less 文本按 Asia/Shanghai 解析（修复驱动按 UTC 解析的漂移）。
func (t *Time) Scan(v any) error {
	switch x := v.(type) {
	case nil:
		return nil
	case time.Time:
		*t = Time{x.In(loc)}
		return nil
	case []byte:
		return t.Scan(string(x))
	case string:
		for _, f := range []string{
			"2006-01-02 15:04:05.999999999-07:00",
			"2006-01-02 15:04:05.999999999",
			TimeFmt,
			TimeFmtNoMs,
		} {
			if pt, err := time.ParseInLocation(f, x, loc); err == nil {
				*t = Time{pt.In(loc)}
				return nil
			}
		}
		return fmt.Errorf("timex.Time scan: unparseable %q", x)
	default:
		return fmt.Errorf("timex.Time scan: unsupported type %T", v)
	}
}
