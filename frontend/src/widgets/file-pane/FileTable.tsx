import FolderIcon from '@mui/icons-material/Folder'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LinkIcon from '@mui/icons-material/Link'
import { Box, CircularProgress, Typography } from '@mui/material'
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
  type GridRowSelectionModel,
} from '@mui/x-data-grid'
import { useMemo } from 'react'
import type { FileEntry } from '../../entities/file/types'
import { formatModTime, formatSize } from '../../shared/lib/format'

interface Props {
  entries: FileEntry[] | undefined
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  selected: string[]
  active: boolean
  showExtensions: boolean
  onSelect: (paths: string[]) => void
  onActivate: () => void
  onOpen: (entry: FileEntry) => void
}

function displayName(e: FileEntry, showExtensions: boolean): string {
  if (e.isDir || showExtensions || e.name === '..') return e.name
  const i = e.name.lastIndexOf('.')
  if (i <= 0) return e.name
  return e.name.slice(0, i)
}

export function FileTable({
  entries,
  isLoading,
  isError,
  errorMessage,
  selected,
  active,
  showExtensions,
  onSelect,
  onActivate,
  onOpen,
}: Props) {
  const rows = useMemo(
    () =>
      (entries ?? []).map((e) => ({
        ...e,
        id: e.path,
        displayName: displayName(e, showExtensions),
      })),
    [entries, showExtensions],
  )

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'icon',
        headerName: '',
        width: 44,
        sortable: false,
        resizable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const e = params.row as FileEntry
          if (e.isDir) return <FolderIcon fontSize="small" color="warning" />
          if (e.isSymlink) return <LinkIcon fontSize="small" color="info" />
          return <InsertDriveFileIcon fontSize="small" color="action" />
        },
      },
      {
        field: 'displayName',
        headerName: 'Name',
        flex: 1,
        minWidth: 140,
        renderCell: (params) => {
          const e = params.row as FileEntry & { displayName: string }
          return (
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: e.isDir ? 600 : 400 }}
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
        width: 100,
        valueGetter: (_v, row) => (row as FileEntry).size,
        valueFormatter: (value, row) =>
          formatSize(Number(value) || 0, (row as FileEntry).isDir),
      },
      {
        field: 'modTime',
        headerName: 'Modified',
        width: 160,
        valueFormatter: (value) => formatModTime(Number(value) || 0),
      },
      {
        field: 'ext',
        headerName: 'Type',
        width: 80,
        valueGetter: (_v, row) => {
          const e = row as FileEntry
          return e.isDir ? 'dir' : e.ext || 'file'
        },
      },
    ],
    [],
  )

  if (isLoading && !entries) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (isError) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error" variant="body2">
          {errorMessage || 'Failed to load directory'}
        </Typography>
      </Box>
    )
  }

  const selectionModel: GridRowSelectionModel = {
    type: 'include',
    ids: new Set(selected),
  }

  return (
    <Box
      onClick={onActivate}
      sx={{
        flex: 1,
        minHeight: 0,
        outline: active ? '2px solid' : '1px solid',
        outlineColor: active ? 'primary.main' : 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        '& .MuiDataGrid-root': { border: 'none' },
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        density="compact"
        disableColumnMenu
        hideFooter
        checkboxSelection={false}
        disableRowSelectionOnClick
        rowSelectionModel={selectionModel}
        onRowClick={(params, event) => {
          onActivate()
          const path = String(params.id)
          if (event.metaKey || event.ctrlKey) {
            if (selected.includes(path)) {
              onSelect(selected.filter((p) => p !== path))
            } else {
              onSelect([...selected, path])
            }
          } else {
            onSelect([path])
          }
        }}
        onRowDoubleClick={(params: GridRowParams) => {
          onOpen(params.row as FileEntry)
        }}
        getRowId={(row) => row.path}
        sx={{
          height: '100%',
          '& .MuiDataGrid-cell': { py: 0 },
          '& .MuiDataGrid-columnHeader': { fontWeight: 700 },
        }}
      />
    </Box>
  )
}
