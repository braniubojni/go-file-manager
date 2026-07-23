# Go File Manager

Dual-pane desktop file manager (Double Commander style) built with **Wails v3**, **Go**, **React + TypeScript**, **MUI**, and **TanStack Query/Table**.

> Wails v3 is currently **alpha** (`v3.0.0-alpha2.x`).

## Features (MVP)

- Independent left / right panes
- Resizable columns (MUI X DataGrid)
- Directory listing (name, size, modified, type)
- Navigate: enter folder, parent, Autocomplete path bar, home
- Multi-select (Ctrl/Cmd+click)
- Copy / Move to opposite pane
- Delete, rename, create folder
- Bookmarks (SQLite)
- Theme: **system / dark / light** (default system)
- View menu: show hidden files, show extensions
- Settings + keyboard shortcuts dialogs (lazy), backed by JSON files
- Last pane paths in **settings.json**

## Stack

| Layer | Choice |
|-------|--------|
| Shell | Wails v3 |
| Backend | Go (`internal/` standard layout) |
| Prefs | `settings.json` + `shortcuts.json` |
| DB | SQLite bookmarks only (`modernc.org/sqlite`) |
| UI | React TS, MUI, MUI X DataGrid, FSD-lite |
| Data | TanStack Query |
| UI state | Zustand |

## Prerequisites

- Go **1.25+**
- Node.js + npm
- macOS: Xcode Command Line Tools

```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
export PATH="$PATH:$(go env GOPATH)/bin"
wails3 doctor
```

## Develop

```bash
# from repo root
wails3 dev
```

This builds Go, generates bindings, runs the Vite frontend, and opens the app.

## Build

```bash
# Current platform — production *binary* only (under bin/)
wails3 build

# macOS: Applications-ready .app (icon + Info.plist; drag to /Applications)
# Do not double-click the bare bin/go-file-manager binary — Finder treats it as a
# CLI tool (Terminal icon). Use the .app instead:
wails3 package
# or: wails3 task package:darwin VERSION=0.1.0
open bin/go-file-manager.app

# Cross-platform (https://v3.wails.io/guides/build/cross-platform/)
# One-time Docker image for non-native targets (~800MB):
wails3 task setup:docker

wails3 build GOOS=windows              # works from any host (CGO off by default)
wails3 build GOOS=linux                # Docker on macOS/Windows (auto gtk3 — see below)
wails3 build GOOS=linux GOARCH=arm64   # Apple Silicon host → linux arm64
wails3 build GOOS=darwin GOARCH=arm64  # Docker on Linux/Windows (binary only)

# Or Task helpers (pass VERSION for updater-compatible builds):
wails3 task build:windows VERSION=0.1.0 ARCH=amd64
wails3 task build:linux VERSION=0.1.0 ARCH=arm64
wails3 task build:darwin VERSION=0.1.0 ARCH=arm64   # bare binary
wails3 task package:darwin VERSION=0.1.0 ARCH=arm64  # .app for macOS
```

### Build all platforms (one command)

From macOS (Windows = native Go cross-compile; Linux = Docker):

```bash
wails3 task setup:docker          # once, ~800MB (host arch)
wails3 task dist VERSION=0.1.0
# → dist/go-file-manager_0.1.0_darwin_arm64.zip   (.app inside)
# → dist/go-file-manager_0.1.0_windows_amd64.zip
# → dist/go-file-manager_0.1.0_linux_<host-arch>.tar.gz  (arm64 on Apple Silicon)
```

Override arches if needed: `DARWIN_ARCH`, `WINDOWS_ARCH`, `LINUX_ARCH`.

**linux/amd64 from Apple Silicon** (needs amd64 image via QEMU):

```bash
wails3 task setup:docker ARCH=amd64
wails3 task dist VERSION=0.1.0 LINUX_ARCH=amd64
```

**Linux from macOS/Windows:** the `wails-cross` image has **GTK 4.8**, while default Wails v3 needs **GTK 4.10+** (`GtkFileDialog`). Cross-builds therefore use the legacy **`gtk3`** tag automatically. GitHub Actions builds Linux natively on Ubuntu 24.04 (full GTK4).

Raw binaries live under `bin/`; release-shaped archives under `dist/`.

### App icon

Single source: **`build/appicon.png`** (1024²). Packaging regenerates:

- `build/darwin/icons.icns` → macOS `.app`
- `build/windows/icon.ico` → Windows `.exe` (via syso)

```bash
wails3 task common:generate:icons
```

### Version injection

Runtime version comes from `internal/version.Version` (default `0.0.0-dev`).  
Pass `VERSION=x.y.z` into Task builds; production ldflags inject:

```text
-X github.com/erikharutyunyan/go-file-manager/internal/version.Version=x.y.z
```

## Updates (GitHub Releases)

- **Repo:** `braniubojni/go-file-manager`
- Settings → **Updates**: show version, check now, auto-check every **10 days** (default on)
- Flow: check → confirm → download platform asset (if present) → open package → quit to finish install
- If no matching asset: **Open releases page**
- Asset names must include `_{os}_{arch}` (see Releasing below)

Custom in-app updater (not the Wails `app.Updater` yet): download + open is intentional for ad-hoc-signed mac builds. Wails’ built-in updater is a possible later migration; asset naming already matches its GitHub provider defaults.

### Releasing

GitHub Releases stay empty until you **push a version tag**. The workflow (`.github/workflows/release.yml`) only runs on tags matching `v*`.

```bash
# After packaging/docs land on main:
git checkout main && git pull
git tag v0.1.0
git push origin v0.1.0
# Actions → “Release” → creates the GitHub Release with binaries
```

| Runner | Artifact |
|--------|----------|
| `ubuntu-latest` | `go-file-manager_{ver}_linux_amd64.tar.gz` |
| `macos-latest` | `go-file-manager_{ver}_darwin_arm64.zip` (`.app` inside) |
| `windows-latest` | `go-file-manager_{ver}_windows_amd64.zip` (`.exe` inside) |

Or build locally and attach assets yourself:

```bash
wails3 task dist VERSION=0.1.0
# create a release in the GitHub UI and upload dist/*
```

The in-app updater matches `_{os}_{arch}` in asset names (`darwin`/`windows`/`linux`, `arm64`/`amd64`).

**Note:** macOS artifacts from CI are ad-hoc signed only (not Developer ID). Users may need right-click → Open the first time.

## Quality / CI

```bash
# Go (on macOS, go vet of the main package needs a frontend/dist stub; Linux CI also installs GTK4)
mkdir -p frontend/dist && echo '<!doctype html><title>stub</title>' > frontend/dist/index.html
go test ./internal/...
gofmt -l .
go vet ./...   # Linux requires: libgtk-4-dev libwebkitgtk-6.0-dev

# Frontend
cd frontend && npm run typecheck && npm run lint && npm run knip && npm run format:check && npm run build

# Mirror the Go GitHub Actions job in Docker (Ubuntu 24.04 + GTK4)
task ci:go
# or: bash scripts/ci-go-docker.sh
```

GitHub Actions (`.github/workflows/ci.yml`) runs these on PRs and `main`.

### Git hooks (Husky)

Root `npm install` installs [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged). On every commit:

- staged `*.go` → `gofmt -w`
- staged `frontend/src/**/*.{ts,tsx,css,json}` → Prettier

```bash
npm install   # once (runs prepare → husky)
```

## Agent memory

Compressed instructions for AI agents (lazy-loaded by directory):

- Root: [`AGENTS.md`](./AGENTS.md) (index + hard rules) · [`CLAUDE.md`](./CLAUDE.md) (thin pointer)
- Modules: `frontend/AGENTS.md`, `internal/AGENTS.md`, `build/AGENTS.md`, `.github/AGENTS.md`, `e2e/AGENTS.md`

Keep each file ≤200 lines; update when conventions change.

## Project layout

```text
main.go                 # Wails entry, service registration
internal/
  domain/               # shared models
  filesystem/           # pure FS ops (+ tests)
  storage/              # SQLite
  service/              # Wails-bound services
frontend/
  src/
    app/                # providers, theme
    pages/              # FileManagerPage
    widgets/            # dual pane chrome
    features/           # pane store
    entities/           # query keys / types
    shared/             # api, format, snackbar
  bindings/             # GENERATED — do not edit
```

## Backend services

- `FileService` — list (with hidden flag), path completions, copy/move/delete/rename/mkdir
- `SettingsService` — settings.json / shortcuts.json + reveal/open
- `BookmarkService` — add / list / remove (SQLite)

Config dir (macOS): `~/Library/Application Support/go-file-manager/`

- `settings.json` — theme, showHidden, showExtensions, leftPath, rightPath  
- `shortcuts.json` — action → binding (`Mod` = Cmd/Ctrl)  
- `app.db` — bookmarks only  

## Tests

### Unit (Go)

```bash
go test ./internal/...
# or
wails3 task test
```

### E2E (Playwright + Wails server mode)

E2E hits the **real Go services** (file ops, settings JSON, bookmarks) via server mode — no native WebView required.

```bash
# one-time
cd e2e && npm install && npx playwright install chromium

# run
cd e2e && npm test
# or from root
wails3 task test:e2e
```

Specs live under `e2e/specs/` and cover navigation, file ops (mkdir/rename/copy/move/delete/refresh), view toggles, settings/shortcuts dialogs, and bookmarks.

Isolation:

- Temp workspace under `$TMPDIR/gfm-e2e-workspace`
- `GFM_CONFIG_DIR` for settings/shortcuts/db
- Seeded left/right sandbox directories

### Full gate (after every big change)

```bash
wails3 task test:all
# = go test ./internal/...  +  e2e  +  wails3 build
```

**Process:** after any substantial feature/refactor:

1. Run `wails3 task test:all` (unit + e2e + production `wails3 build`).
2. If you added a user-facing action or setting, **add/extend an e2e case** in `e2e/specs/` (and unit tests under `internal/` when logic is pure Go).
3. Prefer `data-testid` hooks for new UI so selectors stay stable.

## Keyboard (defaults; editable in UI / shortcuts.json)

| Binding | Action |
|---------|--------|
| Tab | Switch active pane |
| ↑ / ↓ | Move row selection (file list) |
| Enter | Open folder or open file with OS app |
| F5 | Refresh |
| F2 | Rename |
| Delete | Delete |
| Mod+Shift+C / X | Copy / Move |
| Alt+ArrowUp | Parent folder |
| Mod+, / Mod+/ | Settings / Shortcuts |
| Ctrl+` | Toggle terminal under active pane |
| Double-click | Enter directory / open file |
| Ctrl/Cmd+click | Multi-select |

When adding a **new setting**, specify: key, type, default, allowed values, UI control, tooltip text, and where it is used.

## Later ideas

Tabs, search, archives, FTP, compare dirs, viewer/editor, progress for large trees.
