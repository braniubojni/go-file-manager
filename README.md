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
wails3 build
```

Output is under `bin/`.

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
