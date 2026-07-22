# build — agent memory

Parent: root `AGENTS.md`. Wails packaging assets + platform Taskfiles.

## Icon (single source)

| File | Role |
|------|------|
| **`build/appicon.png`** | **Only** brand source (1024²) |
| `windows/icon.ico` | Generated |
| `darwin/icons.icns` | Generated |
| `ios/icon.png` | Keep in sync with appicon when branding |

```bash
# from build/
wails3 generate icons -input appicon.png \
  -macfilename darwin/icons.icns -windowsfilename windows/icon.ico
```

- Task `common:generate:icons` in `build/Taskfile.yml` (sources: `appicon.png` only).
- **Do not** keep product icons under `frontend/public`.
- No `appicon.icon` composer package required for desktop (Assets.car optional/stale OK if icns present).

## Linux cross-compile (macOS/Windows hosts)

- Image: `wails-cross` (`task setup:docker` / `wails3 task setup:docker`).
- Image has **GTK 4.8**; Wails default needs **GtkFileDialog (GTK 4.10+)**.
- **Fix:** Docker Linux builds use **`EXTRA_TAGS=gtk3`** (Taskfile default for docker path).
- **Native Ubuntu 24.04 CI/release:** full **GTK4** (no gtk3 tag).

```bash
wails3 build GOOS=linux GOARCH=arm64   # uses docker + gtk3 on Apple Silicon
task build:linux ARCH=arm64 VERSION=0.1.0
```

## Layout

```
build/Taskfile.yml          # common: frontend, icons, bindings
build/config.yml            # Wails app metadata
build/darwin|linux|windows/ # platform package tasks
build/docker/               # Dockerfile.cross, Dockerfile.server
build/ios|android/          # mobile scaffolding (golangci-excluded)
```

## Version

- Pass `VERSION` into Task/build for ldflags → `internal/version.Version`.
- Keep `config.yml` version in sync on release tags (release workflow).

## Don’t

- “Fix” Linux docker by forcing GTK4 APIs without upgrading the cross image.
- Commit machine-local mobile overlays (`build/ios/xcode/`, `build/android/gen/` — gitignored).
