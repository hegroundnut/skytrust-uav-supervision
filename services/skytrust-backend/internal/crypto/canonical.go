package crypto

import (
	"bytes"
	"encoding/json"
)

// CanonicalJSON: encoding/json 对 map 键自动排序；关闭 HTML 转义保证两端一致。
func CanonicalJSON(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}
