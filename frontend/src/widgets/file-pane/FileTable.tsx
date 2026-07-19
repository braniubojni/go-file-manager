import { Box, CircularProgress, Typography } from '@mui/material'
import {
  DataGrid,
  useGridApiRef,
  type GridColDef,
  type GridRowClassNameParams,
  type GridRowParams,
  type GridSortModel,
} from '@mui/x-data-grid'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import type { FileEntry } from '../../entities/file/types'
import { useColumnStore } from '../../features/ui/columnStore'
import { formatModTime, formatSize } from '../../shared/lib/format'
import { FileTypeIcon } from '../../shared/ui/FileTypeIcon'
import type { DragPayload, FileTableProps, FileTableRow } from './types'

export type { DragPayload } from './types'

const DND_MIME = 'application/x-gfm-paths'

function displayName(e: FileEntry, showExtensions: boolean): string {
  if (e.isDir || showExtensions || e.name === '..') return e.name
  const i = e.name.lastIndexOf('.')
  if (i <= 0) return e.name
  return e.name.slice(0, i)
}

function isParentPath(path: string): boolean {
  return path.split(/[/\\]/).pop() === '..'
}

function sizeValue(e: FileEntry, folderSizes?: Record<string, number>): number {
  if (e.isDir && folderSizes && folderSizes[e.path] != null) return folderSizes[e.path]
  return e.size
}

function typeValue(e: FileEntry): string {
  return e.isDir ? 'dir' : e.ext || 'file'
}

function compareRows(
  a: FileTableRow,
  b: FileTableRow,
  field: string,
  folderSizes?: Record<string, number>,
): number {
  switch (field) {
    case 'displayName': {
      const an = a.displayName.toLowerCase()
      const bn = b.displayName.toLowerCase()
      if (an < bn) return -1
      if (an > bn) return 1
      return 0
    }
    case 'size':
      return sizeValue(a, folderSizes) - sizeValue(b, folderSizes)
    case 'modTime':
      return a.modTime - b.modTime
    case 'ext':
      return typeValue(a).localeCompare(typeValue(b))
    default:
      return a.displayName.localeCompare(b.displayName)
  }
}

/**
 * Sort rows with fixed hierarchy:
 * 1. `..` always first
 * 2. folders (sorted by active column)
 * 3. files (sorted by active column)
 */
export function sortRowsPinParent(
  rows: FileTableRow[],
  sortModel: GridSortModel,
  folderSizes?: Record<string, number>,
): FileTableRow[] {
  const parent = rows.find((r) => r.name === '..')
  const rest = rows.filter((r) => r.name !== '..')
  const dirs = rest.filter((r) => r.isDir)
  const files = rest.filter((r) => !r.isDir)
  const sort = sortModel[0]
  if (sort?.field) {
    const dir = sort.sort === 'desc' ? -1 : 1
    const cmp = (a: FileTableRow, b: FileTableRow) =>
      dir * compareRows(a, b, sort.field, folderSizes)
    dirs.sort(cmp)
    files.sort(cmp)
  } else {
    // Stable default: name asc within each group
    const byName = (a: FileTableRow, b: FileTableRow) =>
      compareRows(a, b, 'displayName', folderSizes)
    dirs.sort(byName)
    files.sort(byName)
  }
  return parent ? [parent, ...dirs, ...files] : [...dirs, ...files]
}

export function FileTable({
  paneId,
  panePath,
  entries,
  isLoading,
  isError,
  errorMessage,
  selected,
  focused,
  active,
  showExtensions,
  folderSizes,
  onSelect,
  onFocus,
  onToggleMulti,
  onSelectRange,
  onActivate,
  onOpen,
  onDropPaths,
  onSortedPathsChange,
}: FileTableProps) {
  const apiRef = useGridApiRef()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const widths = useColumnStore((s) => s.widths)
  const setWidth = useColumnStore((s) => s.setWidth)
  const [dropActive, setDropActive] = useState(false)
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null)
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'displayName', sort: 'asc' }])

  const baseRows = useMemo(
    () =>
      (entries ?? []).map((e) => ({
        ...e,
        id: e.path,
        displayName: displayName(e, showExtensions),
      })),
    [entries, showExtensions],
  )

  const rows = useMemo(
    () => sortRowsPinParent(baseRows, sortModel, folderSizes),
    [baseRows, sortModel, folderSizes],
  )

  const orderedPaths = useMemo(() => rows.map((r) => r.path), [rows])

  useEffect(() => {
    onSortedPathsChange?.(orderedPaths)
  }, [orderedPaths, onSortedPathsChange])

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'icon',
        headerName: '',
        width: widths.icon ?? 44,
        sortable: false,
        resizable: false,
        disableColumnMenu: true,
        cellClassName: 'no-select-cell',
        renderCell: (params) => <FileTypeIcon entry={params.row as FileEntry} />,
      },
      {
        field: 'displayName',
        headerName: 'Name',
        width: widths.displayName ?? 220,
        flex: widths.displayName ? undefined : 1,
        minWidth: 120,
        cellClassName: 'name-cell',
        renderCell: (params) => {
          const e = params.row as FileEntry & { displayName: string }
          const isSelected = selected.includes(e.path)
          return (
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontWeight: e.isDir ? 600 : 400,
                userSelect: 'text',
                lineHeight: 1.2,
                width: '100%',
                color: isSelected ? 'error.main' : 'inherit',
              }}
            >
              {e.displayName}
              {e.isSymlink ? ' ↗' : ''}
            </Typography>
          )
        },
      },
      {
        field: 'size',
        headerName: 'Size',
        width: widths.size ?? 100,
        cellClassName: 'no-select-cell',
        valueGetter: (_v, row) => sizeValue(row as FileEntry, folderSizes),
        valueFormatter: (value, row) => {
          const e = row as FileEntry
          if (e.isDir) {
            if (folderSizes && folderSizes[e.path] != null) {
              return formatSize(folderSizes[e.path], false)
            }
            return '<DIR>'
          }
          return formatSize(Number(value) || 0, false)
        },
      },
      {
        field: 'modTime',
        headerName: 'Modified',
        width: widths.modTime ?? 160,
        cellClassName: 'no-select-cell',
        valueFormatter: (value) => formatModTime(Number(value) || 0),
      },
      {
        field: 'ext',
        headerName: 'Type',
        width: widths.ext ?? 80,
        cellClassName: 'no-select-cell',
        valueGetter: (_v, row) => typeValue(row as FileEntry),
      },
    ],
    [widths, folderSizes, selected],
  )

  const moveFocus = useCallback(
    (delta: number, extend = false) => {
      if (!rows.length) return
      const ids = rows.map((r) => r.path)
      let idx = focused ? ids.indexOf(focused) : -1
      if (idx < 0) {
        idx = delta > 0 ? 0 : ids.length - 1
      } else {
        idx = Math.max(0, Math.min(ids.length - 1, idx + delta))
      }
      const next = ids[idx]
      if (extend) {
        onFocus(next, { keepAnchor: true })
        onSelectRange(ids, next)
      } else {
        onFocus(next)
      }
      try {
        apiRef.current?.scrollToIndexes?.({ rowIndex: idx })
      } catch {
        /* ignore */
      }
    },
    [rows, focused, onFocus, onSelectRange, apiRef],
  )

  const openFocused = useCallback(() => {
    if (!focused) return
    const entry = rows.find((r) => r.path === focused)
    if (entry) onOpen(entry)
  }, [focused, rows, onOpen])

  const openFocusedDirOnly = useCallback(() => {
    if (!focused) return
    const entry = rows.find((r) => r.path === focused)
    if (entry?.isDir) onOpen(entry)
  }, [focused, rows, onOpen])

  const shouldStealFocus = useCallback(() => {
    const ae = document.activeElement as HTMLElement | null
    if (!ae) return true
    // Never steal from path bar, dialogs, menus, or any editable field
    if (ae.closest?.(`[data-testid="path-input-${paneId}"]`)) return false
    if (ae.closest?.('[role="dialog"]')) return false
    if (ae.closest?.('[role="menu"]')) return false
    if (ae.closest?.('.xterm')) return false
    const tag = ae.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false
    if (ae.isContentEditable) return false
    return true
  }, [paneId])

  const focusGrid = useCallback(() => {
    if (!shouldStealFocus()) return
    const el = wrapRef.current
    if (!el) return
    const activeEl = document.activeElement as HTMLElement | null
    if (activeEl && el.contains(activeEl) && activeEl !== el) {
      activeEl.blur()
    }
    el.focus({ preventScroll: true })
  }, [shouldStealFocus])

  // Focus grid when this pane becomes active — but never while typing in path/dialogs
  useEffect(() => {
    if (!active) return
    if (!shouldStealFocus()) return
    focusGrid()
  }, [active, focusGrid, shouldStealFocus])

  // After listing loads, restore grid focus only if nothing editable is focused
  useEffect(() => {
    if (!active || isLoading || !entries) return
    if (!shouldStealFocus()) return
    let cancelled = false
    const run = () => {
      if (!cancelled && shouldStealFocus()) focusGrid()
    }
    run()
    const t1 = window.setTimeout(run, 0)
    return () => {
      cancelled = true
      window.clearTimeout(t1)
    }
  }, [active, isLoading, entries, focusGrid, shouldStealFocus])

  // Expose keyboard helpers on the wrapper for window-level nav
  useEffect(() => {
    const el = wrapRef.current as
      | (HTMLDivElement & {
          __gfmMoveFocus?: (d: number, extend?: boolean) => void
          __gfmOpenFocused?: () => void
          __gfmOpenDir?: () => void
          __gfmToggleMulti?: () => void
          __gfmFocusHome?: () => void
          __gfmFocusEnd?: () => void
        })
      | null
    if (!el) return
    el.__gfmMoveFocus = moveFocus
    el.__gfmOpenFocused = openFocused
    el.__gfmOpenDir = openFocusedDirOnly
    el.__gfmToggleMulti = () => {
      if (focused) onToggleMulti(focused)
    }
    el.__gfmFocusHome = () => {
      if (rows.length) onFocus(rows[0].path)
    }
    el.__gfmFocusEnd = () => {
      if (rows.length) onFocus(rows[rows.length - 1].path)
    }
  }, [moveFocus, openFocused, openFocusedDirOnly, focused, onToggleMulti, rows, onFocus])

  // Native drag: mark rows draggable and set payload
  useEffect(() => {
    const root = wrapRef.current
    if (!root) return

    const mark = () => {
      root.querySelectorAll('.MuiDataGrid-row').forEach((row) => {
        const id = row.getAttribute('data-id') || ''
        if (id && !isParentPath(id)) {
          row.setAttribute('draggable', 'true')
        }
      })
    }
    mark()
    const mo = new MutationObserver(mark)
    mo.observe(root, { childList: true, subtree: true })

    const onDragStart = (e: Event) => {
      const de = e as unknown as DragEvent
      const row = (de.target as HTMLElement).closest('.MuiDataGrid-row') as HTMLElement | null
      if (!row) return
      const id = row.getAttribute('data-id') || ''
      if (!id || isParentPath(id)) {
        de.preventDefault()
        return
      }
      const paths = selected.includes(id) && selected.length > 0 ? selected : [id]
      const payload: DragPayload = { sourcePane: paneId, paths }
      de.dataTransfer?.setData(DND_MIME, JSON.stringify(payload))
      de.dataTransfer?.setData('text/plain', JSON.stringify(payload))
      if (de.dataTransfer) de.dataTransfer.effectAllowed = 'move'
    }

    const onDragEnd = () => {
      setDropActive(false)
      setDropTargetPath(null)
    }

    root.addEventListener('dragstart', onDragStart)
    root.addEventListener('dragend', onDragEnd)
    return () => {
      mo.disconnect()
      root.removeEventListener('dragstart', onDragStart)
      root.removeEventListener('dragend', onDragEnd)
    }
  }, [paneId, selected, rows])

  const handleKeys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      onActivate()
      moveFocus(1, e.shiftKey)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      onActivate()
      moveFocus(-1, e.shiftKey)
    } else if (e.key === 'ArrowLeft') {
      // Handled at window level for history back; prevent scroll
      e.preventDefault()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      onActivate()
      openFocusedDirOnly()
    } else if (e.key === 'Home') {
      e.preventDefault()
      if (rows.length) onFocus(rows[0].path)
    } else if (e.key === 'End') {
      e.preventDefault()
      if (rows.length) onFocus(rows[rows.length - 1].path)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      openFocused()
    } else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      e.stopPropagation()
      if (focused) onToggleMulti(focused)
    }
  }

  const parseDrag = (dt: DataTransfer): DragPayload | null => {
    try {
      const raw = dt.getData(DND_MIME) || dt.getData('text/plain')
      if (!raw) return null
      return JSON.parse(raw) as DragPayload
    } catch {
      return null
    }
  }

  const resolveDropDest = (target: EventTarget | null): string => {
    const el = target as HTMLElement | null
    const row = el?.closest?.('.MuiDataGrid-row') as HTMLElement | null
    if (row) {
      const id = row.getAttribute('data-id') || ''
      const entry = rows.find((r) => r.path === id)
      if (entry?.isDir && entry.name !== '..') return entry.path
    }
    return panePath
  }

  const updateDropTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null
    const row = el?.closest?.('.MuiDataGrid-row') as HTMLElement | null
    if (row) {
      const id = row.getAttribute('data-id') || ''
      const entry = rows.find((r) => r.path === id)
      if (entry?.isDir && entry.name !== '..') {
        setDropTargetPath(entry.path)
        return
      }
    }
    setDropTargetPath(null)
  }

  return (
    <Box
      ref={wrapRef}
      tabIndex={0}
      data-testid={`file-grid-${paneId}`}
      data-pane-grid={paneId}
      onClick={onActivate}
      onKeyDown={handleKeys}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDropActive(true)
        updateDropTarget(e.target)
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the pane wrapper
        const related = e.relatedTarget as Node | null
        if (related && wrapRef.current?.contains(related)) return
        setDropActive(false)
        setDropTargetPath(null)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDropActive(false)
        setDropTargetPath(null)
        const payload = parseDrag(e.dataTransfer)
        if (!payload?.paths?.length) return
        const dest = resolveDropDest(e.target)
        onDropPaths(payload.paths, dest, payload.sourcePane)
      }}
      sx={{
        flex: 1,
        minHeight: 0,
        outline: active || dropActive ? '2px solid' : '1px solid',
        outlineColor: dropActive ? 'success.main' : active ? 'primary.main' : 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        position: 'relative',
        '& .MuiDataGrid-root': { border: 'none' },
        '& .no-select-cell': { userSelect: 'none' },
        '& .name-cell': { userSelect: 'text' },
        '& .MuiDataGrid-cell': {
          display: 'flex',
          alignItems: 'center',
        },
        '& .MuiDataGrid-row': {
          cursor: 'grab',
        },
        // Suppress focus ring while dragging so it doesn't paint a blue border on neighbors
        ...(dropActive
          ? {
              '& .MuiDataGrid-row.row-focused': {
                outline: 'none',
              },
            }
          : {
              '& .MuiDataGrid-row.row-focused': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: -2,
              },
            }),
        '& .MuiDataGrid-row.row-selected': {
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(21, 101, 192, 0.12)',
        },
        '& .MuiDataGrid-row.row-selected .MuiDataGrid-cell': {
          color: 'error.main',
        },
        '& .MuiDataGrid-row.row-drop-target': {
          // Inset shadow only — avoid outline that can bleed as a line on adjacent rows
          outline: 'none',
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.22)' : 'rgba(46, 125, 50, 0.14)',
          boxShadow: (t) => `inset 0 0 0 3px ${t.palette.success.main}`,
          zIndex: 1,
        },
        '& .MuiDataGrid-row:hover': dropActive
          ? { bgcolor: 'transparent' }
          : undefined,
        '&:focus': { outlineColor: dropActive ? 'success.main' : active ? 'primary.main' : 'divider' },
      }}
    >
      {isLoading && !entries ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : isError ? (
        <Box sx={{ p: 2 }}>
          <Typography color="error" variant="body2">
            {errorMessage || 'Failed to load directory'}
          </Typography>
        </Box>
      ) : (
        <DataGrid
          apiRef={apiRef}
          rows={rows}
          columns={columns}
          density="compact"
          disableColumnMenu
          hideFooter
          checkboxSelection={false}
          disableRowSelectionOnClick
          // Free DataGrid only allows single selection — multi-select is custom (CSS + Zustand)
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={(model) => setSortModel(model)}
          getRowClassName={(params: GridRowClassNameParams) => {
            const classes: string[] = []
            if (params.id === focused) classes.push('row-focused')
            if (selected.includes(String(params.id))) classes.push('row-selected')
            if (dropTargetPath && params.id === dropTargetPath) classes.push('row-drop-target')
            return classes.join(' ')
          }}
          onColumnWidthChange={(params) => {
            if (params.colDef.field) setWidth(params.colDef.field, params.width)
          }}
          onCellKeyDown={(_params, event) => {
            if (
              event.key === 'ArrowDown' ||
              event.key === 'ArrowUp' ||
              event.key === 'ArrowLeft' ||
              event.key === 'ArrowRight' ||
              event.key === 'Enter' ||
              event.key === 'Home' ||
              event.key === 'End' ||
              event.key === ' ' ||
              event.code === 'Space'
            ) {
              event.defaultMuiPrevented = true
              event.preventDefault()
              event.stopPropagation()
              if (event.key === 'ArrowDown') moveFocus(1, event.shiftKey)
              else if (event.key === 'ArrowUp') moveFocus(-1, event.shiftKey)
              else if (event.key === 'ArrowRight') openFocusedDirOnly()
              else if (event.key === 'Enter') openFocused()
              else if (event.key === 'Home' && rows.length) onFocus(rows[0].path)
              else if (event.key === 'End' && rows.length) onFocus(rows[rows.length - 1].path)
              else if (event.key === ' ' || event.code === 'Space') {
                if (focused) onToggleMulti(focused)
              }
              // ArrowLeft: let window handler do history back
              focusGrid()
            }
          }}
          onRowClick={(params, event) => {
            onActivate()
            const path = String(params.id)
            if (event.shiftKey) {
              onFocus(path, { keepAnchor: true })
              onSelectRange(orderedPaths, path)
              return
            }
            if (event.metaKey || event.ctrlKey) {
              onFocus(path)
              onToggleMulti(path)
              return
            }
            onFocus(path)
            onSelect([path])
          }}
          onRowDoubleClick={(params: GridRowParams) => {
            onOpen(params.row as FileEntry)
            window.getSelection()?.removeAllRanges()
          }}
          getRowId={(row) => row.path}
          loading={isLoading}
          sx={{
            height: '100%',
            '& .MuiDataGrid-cell': { py: 0 },
            '& .MuiDataGrid-columnHeader': { fontWeight: 700 },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
              outline: 'none',
            },
          }}
        />
      )}
    </Box>
  )
}
