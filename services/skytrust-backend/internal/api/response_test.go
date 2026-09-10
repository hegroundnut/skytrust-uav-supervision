package api

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestOKResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/x", nil)
	OK(c, gin.H{"a": 1})
	var r Resp
	if err := json.Unmarshal(w.Body.Bytes(), &r); err != nil {
		t.Fatal(err)
	}
	if r.Code != 0 || r.Message != "success" {
		t.Errorf("bad resp: %+v", r)
	}
	if len(r.Timestamp) != 23 || !strings.HasPrefix(r.Timestamp, "20") {
		t.Errorf("bad timestamp format: %q", r.Timestamp)
	}
}

func TestFailCarriesBizCode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/x", nil)
	Fail(c, ErrSM3Integrity, "SM3 完整性校验失败")
	var r Resp
	json.Unmarshal(w.Body.Bytes(), &r)
	if r.Code != 1003 {
		t.Errorf("code = %d, want 1003", r.Code)
	}
}

func TestBizErrorAndFailErr(t *testing.T) {
	e := NewBiz(ErrPassInvalid, "许可无效")
	if e.Code != 3002 || !strings.Contains(e.Error(), "许可无效") {
		t.Errorf("bad biz error: %v", e)
	}
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/api/x", nil)
	FailErr(c, e)
	var r Resp
	json.Unmarshal(w.Body.Bytes(), &r)
	if r.Code != 3002 {
		t.Errorf("FailErr biz code = %d", r.Code)
	}
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request = httptest.NewRequest("POST", "/api/x", nil)
	FailErr(c2, errPlain)
	var r2 Resp
	json.Unmarshal(w2.Body.Bytes(), &r2)
	if r2.Code != 9001 {
		t.Errorf("FailErr plain code = %d", r2.Code)
	}
}

var errPlain = &plainErr{}

type plainErr struct{}

func (p *plainErr) Error() string { return "plain" }
