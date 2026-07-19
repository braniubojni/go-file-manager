import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import DeleteIcon from '@mui/icons-material/Delete'
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import LightModeIcon from '@mui/icons-material/LightMode'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Toolbar as MuiToolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  queryKeys,
  useBookmarks,
  useFileOps,
  useSetTheme,
  useThemeSetting,
} from '../../entities/file/queries'
import { usePaneStore } from '../../features/pane/paneStore'
import { errMessage } from '../../shared/lib/format'
import { useSnack } from '../../shared/ui/SnackbarHost'

export function Toolbar() {
  const activePane = usePaneStore((s) => s.activePane)
  const leftPath = usePaneStore((s) => s.leftPath)
  const rightPath = usePaneStore((s) => s.rightPath)
  const leftSelection = usePaneStore((s) => s.leftSelection)
  const rightSelection = usePaneStore((s) => s.rightSelection)
  const setPath = usePaneStore((s) => s.setPath)
  const clearSelection = usePaneStore((s) => s.clearSelection)
  const otherPane = usePaneStore((s) => s.otherPane)

  const ops = useFileOps()
  const { data: theme = 'dark' } = useThemeSetting()
  const setTheme = useSetTheme()
  const { data: bookmarks = [] } = useBookmarks()
  const show = useSnack((s) => s.show)
  const qc = useQueryClient()

  const [mkdirOpen, setMkdirOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [newName, setNewName] = useState('')

  const activePath = activePane === 'left' ? leftPath : rightPath
  const selection = activePane === 'left' ? leftSelection : rightSelection
  const destPath = activePane === 'left' ? rightPath : leftPath
  const realSelection = selection.filter((p) => {
    const name = p.split(/[/\\]/).pop()
    return name !== '..'
  })

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ['dir'] })
  }

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
      show(`${label} completed`, 'success')
      clearSelection()
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const onCopy = () => {
    if (!realSelection.length) return show('Select files to copy', 'warning')
    void run('Copy', () => ops.copy.mutateAsync({ sources: realSelection, destDir: destPath }))
  }

  const onMove = () => {
    if (!realSelection.length) return show('Select files to move', 'warning')
    void run('Move', () => ops.move.mutateAsync({ sources: realSelection, destDir: destPath }))
  }

  const onDelete = () => {
    if (!realSelection.length) return show('Select files to delete', 'warning')
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    setDeleteOpen(false)
    void run('Delete', () => ops.del.mutateAsync(realSelection))
  }

  const onMkdir = () => {
    setFolderName('New Folder')
    setMkdirOpen(true)
  }

  const confirmMkdir = () => {
    setMkdirOpen(false)
    void run('Create folder', () => ops.mkdir.mutateAsync({ parent: activePath, name: folderName.trim() }))
  }

  const onRename = () => {
    if (realSelection.length !== 1) return show('Select exactly one item to rename', 'warning')
    const base = realSelection[0].split(/[/\\]/).pop() || ''
    setNewName(base)
    setRenameOpen(true)
  }

  const confirmRename = () => {
    setRenameOpen(false)
    void run('Rename', () =>
      ops.rename.mutateAsync({ oldPath: realSelection[0], newName: newName.trim() }),
    )
  }

  const onBookmark = () => {
    void run('Bookmark', () => ops.addBookmark.mutateAsync({ name: '', path: activePath }))
  }

  return (
    <>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <MuiToolbar variant="dense" sx={{ gap: 0.5, minHeight: 48 }}>
          <Typography variant="subtitle2" sx={{ mr: 1, fontWeight: 700 }}>
            Go File Manager
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Tooltip title={`Copy to ${otherPane(activePane)} pane`}>
            <Button startIcon={<ContentCopyIcon />} onClick={onCopy}>
              Copy
            </Button>
          </Tooltip>
          <Tooltip title={`Move to ${otherPane(activePane)} pane`}>
            <Button startIcon={<DriveFileMoveIcon />} onClick={onMove}>
              Move
            </Button>
          </Tooltip>
          <Button startIcon={<CreateNewFolderIcon />} onClick={onMkdir}>
            New folder
          </Button>
          <Button startIcon={<DriveFileRenameOutlineIcon />} onClick={onRename}>
            Rename
          </Button>
          <Button color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
            Delete
          </Button>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Tooltip title="Bookmark current path">
            <IconButton onClick={onBookmark}>
              <BookmarkAddIcon />
            </IconButton>
          </Tooltip>

          <Select
            size="small"
            displayEmpty
            value=""
            sx={{ minWidth: 160, ml: 0.5 }}
            renderValue={() => 'Bookmarks'}
            onChange={(e) => {
              const p = String(e.target.value)
              if (p) setPath(activePane, p)
            }}
          >
            {bookmarks.length === 0 && (
              <MenuItem disabled value="">
                No bookmarks
              </MenuItem>
            )}
            {bookmarks.map((b) => (
              <MenuItem key={b.id} value={b.path}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                  <span>{b.name}</span>
                  <Typography
                    component="span"
                    variant="caption"
                    color="error"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      void ops.removeBookmark.mutateAsync(b.id)
                    }}
                  >
                    remove
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Refresh both panes">
            <IconButton onClick={refreshAll}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle theme">
            <IconButton
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark'
                void setTheme.mutateAsync(next)
                void qc.invalidateQueries({ queryKey: queryKeys.theme })
              }}
            >
              {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </MuiToolbar>
      </AppBar>

      <Dialog open={mkdirOpen} onClose={() => setMkdirOpen(false)}>
        <DialogTitle>Create folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmMkdir()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMkdirOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmMkdir}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)}>
        <DialogTitle>Rename</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="New name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmRename}>
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete {realSelection.length} item(s)?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This cannot be undone.
          </Typography>
          <Box component="ul" sx={{ pl: 2, maxHeight: 160, overflow: 'auto' }}>
            {realSelection.map((p) => (
              <li key={p}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  {p}
                </Typography>
              </li>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
