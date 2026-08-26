# internal — agent memory (Go)

Parent: root `AGENTS.md`. All app logic lives here; `main.go` only wires Wails + services.

## Packages

| Package      | Role                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| `domain`     | Shared models (settings, files, bookmarks)                       |
| `filesystem` | Local FS: list/copy/move/delete (clonefile/FICLONE then byte copy; 1 stream for large files, ≤4 workers for small files; cancel deletes copy dests), archive/extract, zip/tar virtual folders, search, text R/W, dir sizes, `DiskUsage` |
| `volumes`    | OS mounts list/unmount, DMG attach (darwin), poll watcher                       |
| `ports`      | Local TCP LISTEN sockets (`lsof`/`netstat`) + force-kill by PID                 |
| `gitstatus`  | Upward-only repo root + one scoped `git status` (no disk-wide `.git` walk)   |
| `remote`     | SSH/SFTP + SMB (`path.go`, `ssh.go`, `smb.go`)                                |
| `storage`    | SQLite bookmarks + crypto helpers                                             |
| `config`     | Config dir, OS open, Open-with (`openwith_*.go`)                              |
| `service`    | Wails-bound services (thin orchestration over packages above)                 |
| `version`    | `Version` string; set via `-ldflags` / Task `VERSION`                         |

## Services (Wails)

Registered in `main.go`:

- `FileService` — FS + remote + jobs cancel; `DiskUsage`, `ListOpenWithApps` / `OpenWith` / `OpenWithPicker`
- `SettingsService` — JSON settings/shortcuts + pane paths + `GetGridPrefs` / `SaveGridPrefs` + `GetWindowState` / `SaveWindowState` KV
- `BookmarkService` — SQLite
- `ConnectionService` — SSH/SMB profiles/sessions
- `TerminalService` — PTY per pane (`_unix` / `_windows`); holds `*application.App` for events
- `UpdateService` — thin façade over `app.Updater` (CheckAndInstall / GetVersion / OpenReleases)
- `GitService` — `StatusForDir` (cached root + porcelain; local only)
- `PortService` — list local TCP listeners; `Kill` / `KillAll` by PID

## Remote paths

- Virtual paths: `ssh://user@host:port/remote/path` or `smb://user@host:port/Share/path` (see `remote.ParseLocation`).
- Archive browse: pane path is the zip/tar file plus inner members (`/path/to/a.zip/docs`); writes inside archives are rejected (`ErrArchiveReadOnly`).
- `Location` **embeds** `Spec` → use `loc.JoinPath(...)`, not `loc.Spec.JoinPath` (staticcheck QF1008).

## Lint / style

- `gofmt` required (husky + CI).
- **errcheck:** prefer `defer func() { _ = f.Close() }()`; return explicit `Close()` error when it matters.
- golangci config: root `.golangci.yml` (errcheck, govet, staticcheck, ineffassign, unused).
- `build/` excluded from golangci (platform scaffolding).

## Tests

```bash
go test ./internal/...
```

Package tests next to code (`*_test.go`). Prefer table-driven tests for path/parse helpers.

## Linux / CGO note

`TerminalService` (and main) import `wails/v3/pkg/application` → on Linux, **`go vet`/`go test` of those packages need GTK4 + WebKitGTK 6.0**. See `.github/AGENTS.md`. Pure packages (`filesystem`, `remote` parse, `storage`, `config`, `version`) are lighter.

## Do

- Keep FS logic in `filesystem`, not in services.
- Propagate `context.Context` for long ops (sizes, archive) when already patterned.
- Match existing error wrapping `fmt.Errorf("…: %w", err)`.

## Don’t

- Hand-edit generated frontend bindings.
- Add heavy deps without need (prefer stdlib).
- Break dual-pane path model (left/right independent).
