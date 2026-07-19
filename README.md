# Go File Manager

Dual-pane desktop file manager (Double Commander style) built with **Wails v3**, **Go**, **React + TypeScript**, **MUI**, and **TanStack Query/Table**.

> Wails v3 is currently **alpha** (`v3.0.0-alpha2.x`).

## Features (MVP)

- Independent left / right panes
- Directory listing (name, size, modified, type)
- Navigate: enter folder, parent, path bar, home
- Multi-select (Ctrl/Cmd+click)
- Copy / Move to opposite pane
- Delete, rename, create folder
- Bookmarks
- Dark / light theme
- Last pane paths persisted in **SQLite**

## Stack

| Layer | Choice |
|-------|--------|
| Shell | Wails v3 |
| Backend | Go (`internal/` standard layout) |
| DB | SQLite via `modernc.org/sqlite` (pure Go, no CGO) |
| UI | React TS, MUI, Feature-Sliced Design (lite) |
| Data | TanStack Query + TanStack Table |
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

- `FileService` — list, copy, move, delete, rename, mkdir
- `SettingsService` — pane paths, theme
- `BookmarkService` — add / list / remove

SQLite DB path: `~/Library/Application Support/go-file-manager/app.db` (macOS).

## Tests

```bash
go test ./internal/...
```

## Keyboard

| Key | Action |
|-----|--------|
| Tab | Switch active pane |
| Double-click | Enter directory |
| Ctrl/Cmd+click | Multi-select |

## Later ideas

Tabs, search, archives, FTP, compare dirs, viewer/editor, progress for large trees.
