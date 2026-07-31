# frontend — agent memory

Parent: root `AGENTS.md`. React UI for Wails (Vite 8).

## Tree

```
src/
  main.tsx, App.tsx
  app/           # Providers, MUI theme (system/dark/light)
  pages/file-manager/   # Shell: panes, keyboard, path persist
  widgets/       # file-pane, toolbar, editor, terminal, menu, go-to, status-bar
  features/      # Zustand stores + small dialogs (settings, shortcuts, updates…)
  entities/file/ # TanStack Query hooks + domain TS types
  shared/        # api/bindings re-export, format, shortcuts, ErrorBoundary
bindings/        # GENERATED Wails TS — do not edit
public/          # usually empty; no brand icons here
```

## Patterns

| Do                                  | Don’t                  |
| ----------------------------------- | ---------------------- |
| MUI path imports                    | `@mui/material` barrel |
| `mutate` + onSuccess/onError        | `mutateAsync` chains   |
| `FC` components                     | class components       |
| Colocate `styles.ts` / `helpers.ts` | Dump into global utils |
| Keep files ~100–150 lines           | Mega-components        |
| CodeMirror 6 editor                 | Monaco / workers       |

## Data flow

- **Server state:** TanStack Query in `entities/file/queries.ts` → `FileService` / settings / bookmarks via `shared/api/bindings`.
- **UI state:** Zustand — `features/pane`, `editor`, `terminal`, `file-ops`, `jobs`, `updates`, `ui/*`.
- **Jobs:** pane-level busy (copy/archive/sizes) → `features/jobs/paneJobStore` + toolbar `runPaneJob`.

## Editor

- Workspace: `widgets/editor/EditorWorkspace.tsx` + tree + CodeMirror pane.
- Lang extensions: `widgets/editor/helpers.ts` (`languageExtensionForPath`).
- Go-to file: `widgets/go-to` + `features/go-to/goToStore` (Cmd/Ctrl+P style).

## Updates UI

- `features/updates/*` + Settings `UpdatesSection`.
- Check / auto-check → `UpdateService.CheckAndInstall` (Wails builtin update window).

## Tooling

```bash
cd frontend
npm run lint          # eslint src
npm run knip          # knip.json ignores bindings/**
npm run format        # oxfmt src
npm run build
```

- Vite: production minify default (do **not** force esbuild — not installed by default).
- Alias: `@` → `src/`.
- Bindings regen: Wails build/dev (`wails3 generate bindings` via Task).

## Don’t reintroduce

- Template assets: `wails.png`, `react.svg`, Inter font in public, bg-desktop/mobile.
- Empty feature folders without exports.
- Unused exports (knip + prefer unexported helpers).
