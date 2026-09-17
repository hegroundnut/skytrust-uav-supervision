#!/usr/bin/env bash
# probe-latency.sh —— 逐跳延迟探针 + 语义契约负例（§6.5-⑤ 度量工具）。
# 对 CROSSCHAIN_LOOP 的 7 个链上写跳逐一计时（与 gateway.go 步 3-12 合约/方法/参数
# 逐字一致），定位 p95 主导项，指导链侧调优（出块间隔/连接池）——绝不放宽协议或
# 改动业务代码（§6.5-⑤ 红线）。
# 实现：internal/chainadapter/real/latency_probe_test.go（//go:build realchains）。
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

cd "$BACKEND"
[ -f .env ] || { echo "✗ 缺 .env（真实链连接参数）"; exit 1; }
for p in 12301 7051 20200; do
  port_up "$p" || { echo "✗ 链端口 $p 未监听（先运行 start-chains.sh）"; exit 1; }
done

set -a; source .env; set +a
echo "== go test -tags realchains -run 'TestRealHopLatency|TestRealNegativePaths'（≈7跳×5次+负例，数分钟）=="
CGO_ENABLED=1 GOFLAGS=-p=2 GOGC=50 \
  go test -tags realchains -run 'TestRealHopLatency|TestRealNegativePaths' \
  ./internal/chainadapter/real/ -v -count=1 -timeout 30m
RC=$?
[ "$RC" -eq 0 ] && echo "PROBE_OK（>>> 行为逐跳均值；7 跳合计 ≈ 单次 Send 期望时延）" \
  || echo "PROBE_FAILED rc=$RC"
exit "$RC"
