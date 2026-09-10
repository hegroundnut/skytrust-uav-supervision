package api

import (
	"errors"
	"io"

	"github.com/gin-gonic/gin"
)

// bindOptionalBody 绑定全字段可选的请求体：空体合法；格式错 → 已发 6002 响应并返回 false。
func bindOptionalBody(c *gin.Context, req any) bool {
	if err := c.ShouldBindJSON(req); err != nil && !errors.Is(err, io.EOF) {
		Fail(c, ErrParam, "请求体格式错误")
		return false
	}
	return true
}
