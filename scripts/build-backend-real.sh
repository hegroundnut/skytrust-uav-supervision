#!/usr/bin/env bash
# build-backend-real.sh —— 真实链后端构建（docs/real-chain-migration.md §5-③/§6.4）。
# CGO_ENABLED=1：FISCO go-sdk 依赖 cgo；-tags realchains：真实传输实现仅在标签下编译，
# hermetic 默认构建/测试门（315 PASS / 0 FAIL）不受影响。
# 低内存主机（1740MB）限并行：GOFLAGS=-p=2 GOGC=50（部署实况，docs/version-matrix.md §1）。
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

cd "$BACKEND"
mkdir -p bin

echo "== go build -tags realchains =="
CGO_ENABLED=1 GOFLAGS=-p=2 GOGC=50 \
  go build -tags realchains -o "$BACKEND_BIN" ./cmd/server
echo "  ✓ $BACKEND_BIN ($(du -h "$BACKEND_BIN" | cut -f1))"

echo "== go vet -tags realchains（真实传输包）=="
CGO_ENABLED=1 GOFLAGS=-p=2 GOGC=50 \
  go vet -tags realchains ./internal/chainadapter/real/... ./cmd/server/
echo "  ✓ vet clean"

echo "== 冻结依赖核对（不得反向升迁，指南 §5-①）=="
for dep in "github.com/gin-gonic/gin v1.12.0" "gorm.io/gorm v1.31.2" \
           "github.com/glebarez/sqlite v1.11.0" "github.com/emmansun/gmsm v0.44.1"; do
  set -- $dep
  if grep -q "	$1 $2" go.mod || grep -q "	$1 $2 " go.mod; then
    echo "  ✓ $1 $2"
  else
    echo "  ✗ 冻结依赖漂移：$1 应为 $2（查 go.mod）"; exit 1
  fi
done
grep -q "^go 1.25.0$" go.mod && echo "  ✓ go 1.25.0" || { echo "  ✗ go 指令漂移"; exit 1; }

echo BUILD_OK
