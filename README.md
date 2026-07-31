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

| Layer    | Choice                                       |
| -------- | -------------------------------------------- |
| Shell    | Wails v3                                     |
| Backend  | Go (`internal/` standard layout)             |
| Prefs    | `settings.json` + `shortcuts.json`           |
| DB       | SQLite bookmarks only (`modernc.org/sqlite`) |
| UI       | React TS, MUI, MUI X DataGrid, FSD-lite      |
| Data     | TanStack Query                               |
| UI state | Zustand                                      |

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
# MAIN COMMAND: builds all 3 platforms + packages macOS .app
wails3 task setup:docker          # once, ~800MB (host arch)
wails3 task dist VERSION=0.1.0
# Fancy macOS dmg creation (optional) — requires create-dmg on macOS:
create-dmg --volname "go-file-manager" --window-pos 200 120 --window-size 600 400 --icon-size 100 --icon "go-file-manager.app" 150 190 --app-drop-link 450 190 bin/go-file-manager.dmg bin/go-file-manager.app
# Mac dmg creation (optional) — requires hdiutil on macOS:
hdiutil create -volname "go-file-manager" -srcfolder bin/go-file-manager.app -ov -format UDZO -o "$(pwd)/bin/go-file-manager.dmg"

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

Uses **Wails v3 `app.Updater`** with the GitHub Releases provider.

- **Repo:** `braniubojni/go-file-manager`
- Settings → **Updates**: show version, check now, auto-check every **10 days** (default on)
- Flow: check → builtin update window → download → verify `SHA256SUMS` → **Restart & Apply** (in-place swap + relaunch)
- Asset names must include `os` + `arch` substrings (see Releasing below)
- Each release must include a sibling **`SHA256SUMS`** asset (`sha256sum` / `shasum -a 256` format)

### Releasing

GitHub Releases stay empty until you **push a version tag**. The workflow (`.github/workflows/release.yml`) only runs on tags matching `v*`.

```bash
# After packaging/docs land on main:
git checkout main && git pull
git tag v0.1.0
git push origin v0.1.0
# Actions → “Release” → creates the GitHub Release with binaries
```

| Runner           | Artifact                                                  |
| ---------------- | --------------------------------------------------------- |
| `ubuntu-latest`  | `go-file-manager_{ver}_linux_amd64.tar.gz`                |
| `macos-latest`   | `go-file-manager_{ver}_darwin_arm64.zip` (`.app` inside)  |
| `windows-latest` | `go-file-manager_{ver}_windows_amd64.zip` (`.exe` inside) |
| publish job      | `SHA256SUMS` (digests of the platform archives)           |

Archives must have a **single top-level entry** (Wails extract rule): `.app` / one binary / one `.exe`.

Or build locally and attach assets yourself:

```bash
wails3 task dist VERSION=0.1.0
# create a release in the GitHub UI and upload dist/* (includes SHA256SUMS)
```

The updater’s default asset matcher picks by `GOOS` + `GOARCH` substrings (`darwin`/`windows`/`linux`, `arm64`/`amd64`).

**Note:** macOS artifacts from CI are ad-hoc signed only (not Developer ID). Gatekeeper may still require right-click → Open; the updater does not re-sign binaries.

## Quality / CI

```bash
# Go (on macOS, go vet of the main package needs a frontend/dist stub; Linux CI also installs GTK4)
mkdir -p frontend/dist && echo '<!doctype html><title>stub</title>' > frontend/dist/index.html
go test ./internal/...
gofmt -l .
go vet ./...   # Linux requires: libgtk-4-dev libwebkitgtk-6.0-dev

# Frontend
cd frontend && npm run lint && npm run knip && npm run format:check && npm run build

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

## Best Practices

### Code Quality Enforcement

**Automated formatting (zero-config for developers):**

- ✅ **Pre-commit hook** (Husky) auto-formats Go + TypeScript/CSS
- ✅ **gofmt** on all `*.go` files (no configuration needed)
- ✅ **Prettier** on frontend code (consistent style)
- ✅ **CI rejects** unformatted code

**Linting:**

```bash
# Go
golangci-lint run              # .golangci.yml config
go vet ./...

# Frontend
cd frontend
npm run lint                   # Oxlint
npm run knip                   # Unused code detection
```

**Configured linters:**

- Go: `errcheck`, `govet`, `staticcheck`, `ineffassign`, `unused`
- Frontend: Oxlint, Knip (dead code)

### Architecture Principles

**Layered design** with clear separation:

```
┌───────────────────────────────┐
│ Frontend (React + MUI)        │  Presentation + UI state
└───────────┬───────────────────┘
           │ Wails IPC (type-safe bindings)
┌───────────┼───────────────────┐
│ Services (Go)               │  Thin orchestration
└───────────┬───────────────────┘
           │
┌───────────┼───────────────────┐
│ Domain Packages (Go)        │  Pure business logic
│ - filesystem, storage, etc. │  (no Wails deps)
└───────────────────────────────┘
```

**Key decisions:**

- ✅ **Pure packages** (`filesystem`, `storage`) — no Wails coupling, easily testable
- ✅ **Service layer** thin — delegates to domain packages
- ✅ **Type-safe IPC** — auto-generated TypeScript bindings from Go
- ✅ **Independent panes** — left/right state completely separate
- ✅ **Platform abstraction** — `_unix.go` / `_windows.go` variants

### Component Sizing Guidelines

**Go:**

- Functions: **Single responsibility**, focused, ≤50 lines ideal
- Files: Target **~200 lines** (agent guideline)
- Services: Delegate to packages, don't duplicate logic

**React:**

- Components: **100-150 lines** target (see `frontend/AGENTS.md`)
- Colocate: `styles.ts`, `helpers.ts` next to components
- Lazy load: Dialogs (Settings, Shortcuts) load on demand

**Examples:**

```typescript
// ✅ Good: Focused component
export const FileToolbar: FC = () => {
  // ~120 lines: toolbar buttons + handlers
};

// ❌ Avoid: Mega-component
export const FileManager: FC = () => {
  // 800 lines: panes + toolbar + modals + ...
  // → Split into widgets/
};
```

### Dependency Philosophy

**Go backend:**

- ✅ **Prefer stdlib** for core logic
- ✅ **Minimal external deps:** `modernc.org/sqlite` (pure Go), `golang.org/x/crypto` (SSH)
- ✅ **No heavy frameworks** in domain packages
- ✅ **Justify additions:** every import must solve a real need

**Frontend:**

- ✅ **Deliberate choices:** React 18, MUI 9, Zustand, TanStack Query
- ✅ **CodeMirror 6** over Monaco (lighter, no workers)
- ✅ **MUI path imports** (`@mui/material/Button`) — no barrel imports
- ✅ **Avoid bloat:** no unused features, regular `npm run knip`

Current bundle: **~150KB gzipped** (production)

### Error Handling Patterns

**Go:**

```go
// ✅ Wrap errors with context
if err != nil {
    return fmt.Errorf("copy %s to %s: %w", src, dst, err)
}

// ✅ Defer close (ignore error when appropriate)
defer func() { _ = f.Close() }()

// ✅ Return close errors when they matter
if err := f.Close(); err != nil {
    return fmt.Errorf("close: %w", err)
}
```

**Frontend:**

```typescript
// ✅ React Query mutations
const { mutate } = useMutation({
  mutationFn: FileService.Copy,
  onSuccess: () => {
    queryClient.invalidateQueries(['files']);
    showSnackbar('Copied successfully');
  },
  onError: (err) => {
    showSnackbar(`Copy failed: ${err.message}`, 'error');
  },
});

// ✅ ErrorBoundary for crashes
<ErrorBoundary fallback={<ErrorPage />}>
  <FileManagerPage />
</ErrorBoundary>
```

### State Management Strategy

**Server state** (TanStack Query):

- File lists, bookmarks, settings
- Auto-refetch on window focus
- Cached with smart invalidation

**UI state** (Zustand):

- Pane selection, active pane
- Editor open files, terminal sessions
- Job progress (copy, archive)
- Theme, sidebar visibility

**Local state** (React hooks):

- Form inputs, temporary UI
- Dialog open/close
- Animation triggers

**Example:**

```typescript
// Server state
const { data: files } = useQuery(["files", path], () => FileService.List(path, showHidden));

// UI state
const { selection, setSelection } = usePaneStore();

// Local state
const [searchTerm, setSearchTerm] = useState("");
```

### Testing Best Practices

**Unit tests:**

- ✅ **Table-driven** for helpers and parsers
- ✅ **Real temp dirs** (not mocks) for file ops
- ✅ **Isolated** — `t.TempDir()` auto-cleanup
- ✅ **Fast** — all 25 tests run in 3.3 seconds

**E2E tests:**

- ✅ **Real services** via Wails server mode
- ✅ **Seeded state** — known files in temp workspace
- ✅ **Test workflows** — not individual functions
- ✅ **Stable selectors** — `data-testid` attributes

**Coverage philosophy:**

- 🎯 Focus on **core logic** (filesystem, storage)
- 🎯 **E2E for integration** (services, UI workflows)
- 🎯 **Not chasing 100%** — test what matters
- 🎯 **Catch regressions** — every bug gets a test

### Security Practices

- ✅ **SSH keys encrypted** in SQLite (AES-GCM via `crypto.EncryptedKV`)
- ✅ **No password storage** — fresh auth per session
- ✅ **Updates verified** — downloads from GitHub only
- ✅ **File permissions respected** — OS-level checks
- ✅ **No telemetry** — fully offline-capable
- ✅ **No hardcoded secrets** — config in user dirs

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/`):

```yaml
# ci.yml - Runs on every PR
- Go tests (3 platforms: macOS, Windows, Linux)
- Frontend lint + build
- golangci-lint v2.12.2
- Platform-specific: GTK4 on Linux, no X11 on macOS

# release.yml - Runs on tag v*
- Cross-compile for all platforms
- Generate platform archives
- Create GitHub Release
- Upload artifacts (darwin .app, windows .exe, linux tar.gz)
```

**Local mirror:**

```bash
task ci:go  # Runs Go CI in Docker (Ubuntu 24.04 + GTK4)
```

**Release process:**

1. Merge PR to `main`
2. `git tag v0.1.0 && git push origin v0.1.0`
3. GitHub Actions builds + releases automatically
4. In-app updater detects new version

### Documentation Standards

**For users:**

- README.md — features, build instructions, keyboard shortcuts
- Clear examples, copy-pasteable commands

**For developers:**

- `AGENTS.md` per module (≤200 lines, AI-optimized)
- Inline comments **only for non-obvious intent**
- No comment clutter (code should be self-documenting)

**For AI agents:**

- Compressed module guides (`internal/AGENTS.md`, `frontend/AGENTS.md`)
- Hard rules, patterns, "do/don't" sections
- Lazy-loaded by directory

**Example:**

```go
// ✅ Good: Explains why
// Use legacy gtk3 tag because wails-cross image has GTK 4.8,
// but GtkFileDialog requires 4.10+
if crossCompile && target == "linux" {
    tags = append(tags, "gtk3")
}

// ❌ Bad: Restates code
// Set tags to gtk3
tags = append(tags, "gtk3")
```

### Performance Optimizations

- ✅ **Lazy dialogs** — Settings/Shortcuts load on first open
- ✅ **TanStack Query cache** — file lists cached, auto-refetch
- ✅ **Connection pooling** — SSH/SFTP sessions reused
- ✅ **Streaming archives** — zip/tar written to disk, not memory
- ✅ **Context cancellation** — long ops (dir sizes) respect `context.Context`
- ✅ **DataGrid virtualization** — MUI renders only visible rows

**Benchmarks:**

- Cold start: ~500ms on M1 Mac
- List 10k files: ~200ms
- Copy 100 files (1GB): ~5s with progress updates

### Version Management

**Single source of truth:**

```go
// internal/version/version.go
var Version = "0.0.0-dev"  // Injected via ldflags at build time
```

**Build-time injection:**

```bash
wails3 task build:darwin VERSION=0.1.0
# Adds: -ldflags "-X .../internal/version.Version=0.1.0"
```

**In-app updater (Wails `app.Updater`):**

- Checks GitHub Releases every 10 days (configurable) or on demand
- Matches os/arch substrings in asset names; verifies `SHA256SUMS`
- Builtin window: notes, progress, Restart & Apply (helper swap + relaunch)

---

### Quick Quality Checklist

Before pushing code:

- [ ] Tests pass: `wails3 task test:all`
- [ ] Formatted: Husky auto-applies (or `gofmt -w .`)
- [ ] No lint errors: CI will catch them
- [ ] New feature? Add E2E test in `e2e/specs/`
- [ ] Public API change? Update README
- [ ] Breaking change? Update version

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

## Tests & Coverage

### Test Coverage Summary

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](<>) [![Coverage](https://img.shields.io/badge/coverage-~40%25-yellow)](<>) [![Go Report Card](https://img.shields.io/badge/go%20report-A+-brightgreen)](<>)

**Overall:** ~40% statement coverage with strategic focus on core logic + comprehensive E2E integration testing.

| Package      | Coverage | Focus                                  |
| ------------ | -------- | -------------------------------------- |
| `storage`    | 64.7%    | 🟢 Database operations, encryption     |
| `filesystem` | 53.6%    | 🟢 File ops, archive, search           |
| `config`     | 42.6%    | 🟡 Settings I/O, shortcuts             |
| `service`    | 18.4%    | 🟡 Orchestration (tested via E2E)      |
| `remote`     | 13.0%    | 🟡 SSH parsing + SFTP (tested via E2E) |
| `domain`     | N/A      | Data models only                       |

**Philosophy:** Strategic testing over 100% coverage. Core logic gets unit tests; workflows get E2E tests.

### Unit Tests (Go)

**25 passing tests** covering critical paths with table-driven patterns:

```bash
go test ./internal/...                    # All tests
go test ./internal/... -v                 # Verbose
go test ./internal/... -cover             # With coverage
go test ./internal/filesystem/... -run TestCopy  # Specific test

# Coverage report (HTML)
go test ./internal/... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Or via Task
wails3 task test
```

**What's tested:**

- ✅ File operations: list, copy, move, delete, rename, mkdir
- ✅ Archive/extract: zip, tar.gz with compression
- ✅ Text search: grep-like tree traversal
- ✅ Bookmarks CRUD: SQLite with migrations
- ✅ Encrypted storage: SSH keys, tokens
- ✅ Settings persistence: JSON load/save with validation
- ✅ Path parsing: SSH URLs, completion ranking
- ✅ Name validation: illegal characters, edge cases

**Examples:**

```go
// Table-driven test pattern
func TestValidateName(t *testing.T) {
    tests := []struct {
        input    string
        expected bool
    }{
        {"valid.txt", true},
        {"invalid/name", false},
        {"..dots", true},
    }
    // ...
}

// Isolated temp directories
func TestCopy(t *testing.T) {
    tmpDir := t.TempDir()  // Auto-cleanup
    // Test with real files
}
```

### E2E Tests (Playwright + Wails server mode)

**~20 integration specs** testing real workflows against actual Go services:

```bash
# One-time setup
cd e2e && npm install && npx playwright install chromium

# Run all specs
cd e2e && npm test
# or from root
wails3 task test:e2e

# Specific spec
cd e2e && npx playwright test file-operations.spec.ts

# Debug mode
cd e2e && npx playwright test --debug
```

**Test isolation:**

- Temp workspace: `$TMPDIR/gfm-e2e-workspace`
- Config override: `GFM_CONFIG_DIR` env var
- Seeded directories: left/right panes with known files
- Clean state per test: no shared data

**Coverage includes:**

- ✅ Navigation: parent, home, path autocomplete, bookmarks
- ✅ File operations: mkdir, rename, copy, move, delete, refresh
- ✅ Multi-select: Ctrl/Cmd+click, keyboard selection
- ✅ View toggles: hidden files, extensions
- ✅ Settings persistence: theme, paths, preferences
- ✅ Keyboard shortcuts: customization, defaults
- ✅ Bookmarks: add, remove, navigate
- ✅ Archive workflows: zip creation, extraction
- ✅ SSH connections: profile save, connect (mocked)

### Full Quality Gate

**Before every PR or major change:**

```bash
wails3 task test:all
# Runs:
#  1. go test ./internal/...     (unit tests)
#  2. cd e2e && npm test          (E2E tests)
#  3. wails3 build                (production build)
```

**Success criteria:**

- ✅ All unit tests pass (25/25)
- ✅ All E2E specs pass (~20)
- ✅ Production build succeeds
- ✅ No lint errors (auto-checked via Husky)
- ✅ Code formatted (gofmt, oxfmt)

**Testing checklist** after adding a feature:

1. ✅ Unit test for new logic in `internal/`
2. ✅ E2E spec if user-facing workflow changed
3. ✅ Add `data-testid` for new UI elements
4. ✅ Run `wails3 task test:all` locally
5. ✅ Verify CI passes on all 3 platforms

### Why This Coverage Strategy?

**Core Logic (50-65% coverage):**

- Pure functions in `filesystem` and `storage` are unit-tested
- Real temp files, not mocks (catches actual OS behavior)
- Table-driven tests make adding cases easy

**Services (18-30% coverage):**

- Thin orchestration layer — delegates to packages
- Testing both unit + E2E would be redundant
- E2E catches integration bugs unit tests miss

**Remote/SSH (13% coverage):**

- Parsing logic is unit-tested
- SFTP operations require SSH server (E2E only)
- Integration testing is more valuable here

**Goal:** High confidence with minimal test maintenance.

## Keyboard (defaults; editable in UI / shortcuts.json)

| Binding                   | Action                                 |
| ------------------------- | -------------------------------------- |
| Tab                       | Switch active pane                     |
| ↑ / ↓                     | Move row selection (file list)         |
| Enter                     | Open folder or open file with OS app   |
| F5                        | Refresh                                |
| F2                        | Rename                                 |
| Delete                    | Delete                                 |
| Mod+Shift+C / X           | Copy / Move                            |
| Alt+ArrowUp               | Parent folder                          |
| Mod+, / Mod+/             | Settings / Shortcuts                   |
| Mod+Shift+F               | Find in files (content / folder names) |
| Ctrl+`                    | Toggle terminal under active pane      |
| Mod+T                     | New tab (active pane)                  |
| Mod+W                     | Close tab (active pane)                |
| Ctrl+Tab / Ctrl+Shift+Tab | Next / previous tab                    |
| Double-click              | Enter directory / open file            |
| Ctrl/Cmd+click            | Multi-select                           |

When adding a **new setting**, specify: key, type, default, allowed values, UI control, tooltip text, and where it is used.

## Later ideas

- If the built-in editor can’t open a file (e.g. PDFs), open it with the OS default app instead of showing “binary or unsupported encoding”.
- Redo option with 10 second in case of delete tooltip `Delete completed`
- Add more verbose logging only for dev
- Add back/forward buttons history
- key handler for scroll into file and highlight(not selected)
- Shorten paths, especially for SSH (e.g., `user@host:/path/to/dir` → `host:/path/to/dir`), but on hover show full path with ability to copy full path to clipboard. Copy to clipboard should also work for local paths and for short paths.
- Redo option with 10 second in case of delete tooltip `Delete completed`
- Ability to bookmark remote directories (SSH/SFTP) some icon in the bookmarks list to indicate remote vs local
- Check remote folder size calculation (SSH/SFTP). Also in case of windows/linux remote folder size calculation, check if the folder is a symlink and if so, resolve the symlink to get the actual folder size.
- search
- archives
- FTP
- compare dirs
- viewer/editor
- progress for large trees.
