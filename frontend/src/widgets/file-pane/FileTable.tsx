import FolderIcon from '@mui/icons-material/Folder'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LinkIcon from '@mui/icons-material/Link'
import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import type { FileEntry } from '../../entities/file/types'
import { formatModTime, formatSize } from '../../shared/lib/format'

interface Props {
  entries: FileEntry[] | undefined
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  selected: string[]
  active: boolean
  onSelect: (path: string, multi: boolean) => void
  onActivate: () => void
  onOpen: (entry: FileEntry) => void
}

export function FileTable({
  entries,
  isLoading,
  isError,
  errorMessage,
  selected,
  active,
  onSelect,
  onActivate,
  onOpen,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo<ColumnDef<FileEntry>[]>(
    () => [
      {
        id: 'icon',
        header: '',
        size: 36,
        cell: ({ row }) => {
          const e = row.original
          if (e.isDir) return <FolderIcon fontSize="small" color="warning" />
          if (e.isSymlink) return <LinkIcon fontSize="small" color="info" />
          return <InsertDriveFileIcon fontSize="small" color="action" />
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <Typography
            variant="body2"
            noWrap
            sx={{ fontWeight: row.original.isDir ? 600 : 400, maxWidth: 320 }}
          >
            {row.original.name}
            {row.original.isSymlink ? ' ↗' : ''}
          </Typography>
        ),
      },
      {
        accessorKey: 'size',
        header: 'Size',
        size: 100,
        cell: ({ row }) => formatSize(row.original.size, row.original.isDir),
      },
      {
        accessorKey: 'modTime',
        header: 'Modified',
        size: 160,
        cell: ({ row }) => formatModTime(row.original.modTime),
      },
      {
        accessorKey: 'ext',
        header: 'Type',
        size: 70,
        cell: ({ row }) => (row.original.isDir ? 'dir' : row.original.ext || 'file'),
      },
    ],
    [],
  )

  const data = entries ?? []

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
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

  return (
    <TableContainer
      onClick={onActivate}
      sx={{
        flex: 1,
        overflow: 'auto',
        outline: active ? '2px solid' : '1px solid',
        outlineColor: active ? 'primary.main' : 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableCell
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  sx={{
                    cursor: h.column.getCanSort() ? 'pointer' : 'default',
                    width: h.getSize(),
                    py: 0.75,
                    fontWeight: 700,
                    bgcolor: 'background.paper',
                  }}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const e = row.original
            const isSelected = selected.includes(e.path)
            return (
              <TableRow
                key={e.path}
                hover
                selected={isSelected}
                onClick={(ev) => {
                  onActivate()
                  onSelect(e.path, ev.metaKey || ev.ctrlKey)
                }}
                onDoubleClick={() => onOpen(e)}
                sx={{ cursor: 'default', userSelect: 'none' }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} sx={{ py: 0.35, overflow: 'hidden' }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  Empty folder
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
