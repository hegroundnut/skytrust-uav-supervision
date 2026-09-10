package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const TimeFmt = "2006-01-02 15:04:05.000"

var loc = func() *time.Location {
	l, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		return time.FixedZone("CST", 8*3600)
	}
	return l
}()

func Now() time.Time { return time.Now().In(loc) }

type Resp struct {
	Code      int    `json:"code"`
	Message   string `json:"message"`
	Data      any    `json:"data"`
	TraceID   string `json:"trace_id"`
	Timestamp string `json:"timestamp"`
}

type BizError struct {
	Code int
	Msg  string
}

func NewBiz(code int, msg string) *BizError { return &BizError{Code: code, Msg: msg} }
func (e *BizError) Error() string           { return e.Msg }

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Resp{
		Code: ErrOK, Message: "success", Data: data,
		TraceID: TraceIDFrom(c), Timestamp: Now().Format(TimeFmt),
	})
}

func Fail(c *gin.Context, code int, msg string) {
	c.JSON(http.StatusOK, Resp{
		Code: code, Message: msg, Data: nil,
		TraceID: TraceIDFrom(c), Timestamp: Now().Format(TimeFmt),
	})
}

// FailData 携带业务数据的失败响应（如跨链失败时已落库的留痕记录）：code 非 0，data 非 nil。
func FailData(c *gin.Context, code int, msg string, data any) {
	c.JSON(http.StatusOK, Resp{
		Code: code, Message: msg, Data: data,
		TraceID: TraceIDFrom(c), Timestamp: Now().Format(TimeFmt),
	})
}

// FailErr: BizError 用其码，其余归 9001。
func FailErr(c *gin.Context, err error) {
	if be, ok := err.(*BizError); ok {
		Fail(c, be.Code, be.Msg)
		return
	}
	Fail(c, ErrInternal, err.Error())
}

func TraceIDFrom(c *gin.Context) string {
	if c == nil {
		return ""
	}
	if v, ok := c.Get("trace_id"); ok {
		return v.(string)
	}
	return ""
}
