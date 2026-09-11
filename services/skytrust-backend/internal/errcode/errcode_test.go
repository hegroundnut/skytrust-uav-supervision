package errcode

import (
	"errors"
	"testing"
)

func TestErrorCarriesCodeAndMessage(t *testing.T) {
	e := NewError(Param, "bad field %s", "node_id")
	if e.Code != Param || e.Msg != "bad field node_id" {
		t.Fatalf("got %+v", e)
	}
	if e.Error() != "biz error 6002: bad field node_id" {
		t.Fatalf("Error() = %q", e.Error())
	}
	// errors.As 语义可用（业务层以 *Error 承载 code）
	var target *Error
	if !errors.As(error(e), &target) || target.Code != Param {
		t.Fatal("errors.As failed")
	}
}
