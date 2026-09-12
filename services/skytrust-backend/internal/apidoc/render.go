package apidoc

import "encoding/json"

// Render 确定性渲染：json.MarshalIndent 对 map 键自动排序 → 同输入逐字节一致。
func Render(doc map[string]any) ([]byte, error) {
	return json.MarshalIndent(doc, "", "  ")
}
