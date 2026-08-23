# .github — agent memory (CI / release)

Parent: root `AGENTS.md`.

## Workflows

| File                    | When        | Purpose                                |
| ----------------------- | ----------- | -------------------------------------- |
| `workflows/ci.yml`      | PR + `main` | Go quality + frontend quality          |
| `workflows/release.yml` | tags `v*`   | Multi-OS build + GitHub Release assets |

## Go job (`ci.yml`) — required order

1. **gofmt** (`gofmt -l .` must be empty).
2. **Stub embed:** `mkdir -p frontend/dist` + minimal `index.html`  
   (`main.go` has `//go:embed all:frontend/dist`).
3. **Apt (Ubuntu):** `build-essential pkg-config libgtk-4-dev libwebkitgtk-6.0-dev`  
   (Wails v3 CGO for main + terminal service).
4. `go vet ./...`
5. `go test ./internal/...`
6. **golangci-lint-action@v9**, version **`v2.12.2`**, timeout 3m
   - Must be built with Go ≥ **1.25** (go.mod). v2.1.x fails with go1.24 binary.

## Frontend job

- Node **24**, `setup-node@v6`, `checkout@v5`.
- `npm ci` then: lint, **knip**, format:check, build.
- Working directory: `frontend/`.

## Local mirror (preferred over raw wails-cross for CI)

```bash
task ci:go
# = bash scripts/ci-go-docker.sh
# ubuntu:24.04 + install Go from go.mod + GTK4 stack + same steps (incl. golangci-lint v2.12.2)
```

**Not** a full CI mirror: `wails-cross` alone (GTK 4.8 / GtkFileDialog errors).

## Release job

- Triggers only on tags **`v*`** (no tags → empty GitHub Releases page).
- Matrix: linux/amd64, darwin/arm64, windows/amd64 (native runners).
- Linux deps: **GTK4** packages (same as CI), not gtk3.
- Inject version from tag into ldflags + `build/config.yml`.
- Asset naming for Wails updater: include os/arch substrings; single top-level entry per archive.
- Publish job generates **`SHA256SUMS`** for platform zips/tarballs.
- macOS CI: `darwin:package` → zip of `.app`; ad-hoc sign only (users may need right-click Open).
- Local mirror of asset layout: root task **`dist`** (`task dist VERSION=x.y.z` → includes `SHA256SUMS`).

## Actions versions (current)

- `actions/checkout@v5` (CI + release build job); release publish job still uses `actions/checkout@v4`
- `actions/setup-go@v6`
- `actions/setup-node@v6`
- `golangci/golangci-lint-action@v9`

## When editing CI

- Keep embed stub + GTK install **before** any step that typechecks the main module.
- Bump golangci only to versions supporting go.mod’s Go version.
- Don’t drop knip without replacing unused-code gate.
