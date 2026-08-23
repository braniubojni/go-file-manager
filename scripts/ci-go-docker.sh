#!/usr/bin/env bash
# Run Go CI job steps in Docker, matching GitHub Actions ubuntu-latest + Wails v3 GTK4.
# Usage: bash scripts/ci-go-docker.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${CI_GO_IMAGE:-ubuntu:24.04}"
GO_VERSION="${CI_GO_VERSION:-1.25.0}"

echo "==> Go CI via Docker ($IMAGE, go $GO_VERSION)"

docker run --rm \
  -v "$ROOT:/work" \
  -w /work \
  -e DEBIAN_FRONTEND=noninteractive \
  -e GO_VERSION="$GO_VERSION" \
  "$IMAGE" \
  bash -c '
set -euo pipefail

echo "== apt: go build deps + Wails GTK4 stack =="
apt-get update -qq
apt-get install -y -qq ca-certificates curl git build-essential pkg-config \
  libgtk-4-dev libwebkitgtk-6.0-dev lsof >/dev/null

echo "== install Go ${GO_VERSION} =="
ARCH=$(dpkg --print-architecture)
case "$ARCH" in
  amd64) GOARCH=amd64 ;;
  arm64) GOARCH=arm64 ;;
  *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;
esac
curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${GOARCH}.tar.gz" -o /tmp/go.tgz
rm -rf /usr/local/go
tar -C /usr/local -xzf /tmp/go.tgz
export PATH="/usr/local/go/bin:${PATH}"
export GOCACHE=/tmp/go-cache
export GOMODCACHE=/tmp/gomod

echo "== go version =="
go version
pkg-config --modversion gtk4
pkg-config --modversion webkitgtk-6.0

echo "== gofmt =="
out=$(gofmt -l .)
if [ -n "$out" ]; then
  echo "gofmt needed on:"
  echo "$out"
  exit 1
fi

echo "== stub frontend/dist (//go:embed) =="
mkdir -p frontend/dist
printf "%s\n" "<!doctype html><title>ci-stub</title>" > frontend/dist/index.html

echo "== go vet ./... =="
go vet ./...

echo "== go test ./internal/... =="
go test ./internal/...

echo "OK: Go CI steps passed"
'
