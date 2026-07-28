# internal — agent memory (Go)

Parent: root `AGENTS.md`. All app logic lives here; `main.go` only wires Wails + services.

## Packages

| Package      | Role                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| `domain`     | Shared models (settings, files, bookmarks)                       |
| `filesystem` | Local FS: list/copy/move/delete, archive/extract, search, text R/W, dir sizes |
| `gitstatus`  | Upward-only repo root + one scoped `git status` (no disk-wide `.git` walk)   |
| `remote`     | SSH location parse + sftp ops (`path.go`, `ssh.go`)                           |
| `storage`    | SQLite bookmarks + crypto helpers                                             |
| `config`     | Config dir, open files in OS (`open_unix` / `open_windows`)                   |
| `service`    | Wails-bound services (thin orchestration over packages above)                 |
| `version`    | `Version` string; set via `-ldflags` / Task `VERSION`                         |

## Services (Wails)

Registered in `main.go`:

- `FileService` — FS + remote + jobs cancel
- `SettingsService` — JSON settings/shortcuts + pane paths
- `BookmarkService` — SQLite
- `ConnectionService` — SSH profiles/sessions
- `TerminalService` — PTY per pane (`_unix` / `_windows`); holds `*application.App` for events
- `UpdateService` — thin façade over `app.Updater` (CheckAndInstall / GetVersion / OpenReleases)
- `GitService` — `StatusForDir` (cached root + porcelain; local only)

## Remote paths

- Virtual paths: `ssh://user@host:port/remote/path` (see `remote.ParseLocation`).
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
