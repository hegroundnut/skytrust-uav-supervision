//go:build realchains

package realirita

import (
	"context"
	"strings"
	"testing"
	"time"
)

// TestIritaRealTransportFailFast —— Task 5 Step 1：fail-fast 测试先行（brief 接口）。
// 全部路径无需真实链在线：构造仅读 env（离线），SubmitTx 负例走不存在的 CLI 二进制，
// QueryState 负例走键形态校验（先于任何 RPC）。真链读/写冒烟在 package real 的
// TestIritaRealSmoke（testing.Short() 跳过网络部分——本用例自身零网络，无需跳过）。
func TestIritaRealTransportFailFast(t *testing.T) {
	// 合法 env 集（值无需可达：构造与负例路径零网络 I/O）。
	env := map[string]string{
		"IRITA_RPC":      "http://127.0.0.1:26657",
		"IRITA_CHAIN_ID": "skytrust-license",
		"IRITA_CLI_BIN":  "/nonexistent/irita-bin",
		"IRITA_CLI_HOME": t.TempDir(),
		"IRITA_KEY_NAME": "skytrust-biz",
	}
	setAll := func() {
		for k, v := range env {
			t.Setenv(k, v)
		}
	}

	// 缺任一 env → NewFactory error，且错误文案点名缺失变量（fail-fast，绝不静默兜底）。
	for name := range env {
		setAll()
		t.Setenv(name, "") // 空串 = 缺失
		_, err := NewFactory()
		if err == nil {
			t.Fatalf("missing %s: want NewFactory error, got nil", name)
		}
		if !strings.Contains(err.Error(), name) {
			t.Errorf("missing %s: error must name the variable, got: %v", name, err)
		}
	}

	// IRITA_RPC 非法（无 scheme / 无 host）→ NewFactory error。
	setAll()
	t.Setenv("IRITA_RPC", "://bad-url")
	if _, err := NewFactory(); err == nil {
		t.Fatal("bad IRITA_RPC: want NewFactory error, got nil")
	}
	setAll()
	t.Setenv("IRITA_RPC", "127.0.0.1:26657") // 无 scheme
	if _, err := NewFactory(); err == nil {
		t.Fatal("schemeless IRITA_RPC: want NewFactory error, got nil")
	}

	// env 齐全 → 构造成功（离线：构造绝不触链）。
	setAll()
	tr, err := NewFactory()
	if err != nil {
		t.Fatalf("NewFactory with full env: %v", err)
	}
	if tr == nil {
		t.Fatal("NewFactory returned nil transport")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// IRITA_CLI_BIN 不存在 → SubmitTx 非 nil error、receipt=nil（零伪造 TxID）。
	rc, err := tr.SubmitTx(ctx, "license_registry", "CrosschainSubmit", map[string]any{
		"cross_tx_id": "FF-TEST-1", "message_type": "FLIGHT_PASS", "business_id": "FF-TEST-1",
	})
	if err == nil {
		t.Fatal("nonexistent CLI bin: want SubmitTx error, got nil")
	}
	if rc != nil {
		t.Fatalf("nonexistent CLI bin: receipt must be nil (zero fabrication), got %+v", rc)
	}

	// 未注册合约 → 显式拒绝（不触 CLI）。
	if _, err := tr.SubmitTx(ctx, "not_a_contract", "CrosschainSubmit", map[string]any{"cross_tx_id": "X"}); err == nil ||
		!strings.Contains(err.Error(), "not registered") {
		t.Fatalf("unregistered contract: want explicit rejection, got %v", err)
	}

	// 非后端调用面方法 → 显式拒绝（不触 CLI）。
	if _, err := tr.SubmitTx(ctx, "license_registry", "BogusMethod", map[string]any{"cross_tx_id": "X"}); err == nil {
		t.Fatal("non-surface method: want explicit rejection, got nil")
	}

	// 无业务键（cross_tx_id/business_id/record_key 均缺）→ 显式错误（不触 CLI）。
	if _, err := tr.SubmitTx(ctx, "license_registry", "CrosschainSubmit", map[string]any{"message_type": "FLIGHT_PASS"}); err == nil ||
		!strings.Contains(err.Error(), "business key") {
		t.Fatalf("missing business key: want explicit error, got %v", err)
	}

	// QueryState 业务键形态 → 明示错误「不支持业务键反查」（record 模块无二级索引，
	// Task 1 Step 7 真链校准；先于任何 RPC，离线可测）。
	if _, err := tr.QueryState(ctx, "license_registry", "SMOKE/some-business-key"); err == nil ||
		!strings.Contains(err.Error(), "业务键反查") {
		t.Fatalf("business-key QueryState: want explicit honest error, got %v", err)
	}
	if _, err := tr.QueryState(ctx, "not_a_contract", strings.Repeat("ab", 32)); err == nil ||
		!strings.Contains(err.Error(), "not registered") {
		t.Fatalf("unregistered contract QueryState: want explicit rejection, got %v", err)
	}
}

// TestIritaKeyForms —— 纯函数：URI 构造 / stateKey 消毒 / 64-hex 判定（离线，零网络）。
func TestIritaKeyForms(t *testing.T) {
	if got := sanitizeKey("SMOKE/task5-1760355600"); got != "SMOKE_task5_1760355600" {
		t.Errorf("sanitizeKey: %s", got)
	}
	if got := sanitizeKey("CX-f48cf7b7be53"); got != "CX_f48cf7b7be53" {
		t.Errorf("sanitizeKey dash: %s", got)
	}
	if got := sanitizeKey("a.b_C9"); got != "a.b_C9" {
		t.Errorf("sanitizeKey must keep [0-9a-zA-Z_.]: %s", got)
	}
	want := "skytrust://license_registry/CrosschainSubmit/SMOKE_task5_1"
	if got := buildRecordURI("CrosschainSubmit", "SMOKE/task5-1"); got != want {
		t.Errorf("buildRecordURI:\n got %s\nwant %s", got, want)
	}
	if !is64Hex(strings.Repeat("0123456789abcdef", 4)) {
		t.Error("is64Hex: 64-hex must pass")
	}
	if is64Hex(strings.Repeat("g", 64)) || is64Hex("abc") || is64Hex("") {
		t.Error("is64Hex: non-hex / wrong length must fail")
	}
	if k := businessKey(map[string]any{"business_id": "B", "cross_tx_id": "C"}); k != "C" {
		t.Errorf("businessKey must prefer cross_tx_id: %s", k)
	}
	if k := businessKey(map[string]any{"business_id": "B"}); k != "B" {
		t.Errorf("businessKey fallback business_id: %s", k)
	}
	if k := businessKey(map[string]any{"cross_tx_id": "", "other": 1}); k != "" {
		t.Errorf("businessKey must be empty when absent: %q", k)
	}
}
