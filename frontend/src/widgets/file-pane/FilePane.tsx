import ArchiveIcon from '@mui/icons-material/Archive'
import CancelIcon from '@mui/icons-material/Cancel'
import StorageIcon from '@mui/icons-material/Storage'
import TerminalIcon from '@mui/icons-material/Terminal'
import UnarchiveIcon from '@mui/icons-material/Unarchive'
import { Box, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useDirListing, useHomeDir, useSettings } from '../../entities/file/queries'
import type { FileEntry, PaneId } from '../../entities/file/types'
import { useFolderSizeStore } from '../../features/folder-size/folderSizeStore'
import { newJobId, usePaneJobStore } from '../../features/jobs/paneJobStore'
import type { PaneJobKind } from '../../features/jobs/types'
import { usePaneStore } from '../../features/pane/paneStore'
import { useTerminalStore } from '../../features/terminal/terminalStore'
import { FileService } from '../../shared/api/bindings'
import { errMessage } from '../../shared/lib/format'
import { useSnack } from '../../shared/ui/SnackbarHost'
import { PaneTerminal } from '../terminal/PaneTerminal'
import { FileTable } from './FileTable'
import { PathBar } from './PathBar'
import type { FilePaneProps } from './types'

function jobKindIcon(kind: PaneJobKind) {
  switch (kind) {
    case 'archive':
      return <ArchiveIcon sx={{ fontSize: 12 }} />
    case 'extract':
      return <UnarchiveIcon sx={{ fontSize: 12 }} />
    case 'sizes':
      return <StorageIcon sx={{ fontSize: 12 }} />
    default:
      return <StorageIcon sx={{ fontSize: 12 }} />
  }
}

export function FilePane({ id }: FilePaneProps) {
  const path = usePaneStore((s) => (id === 'left' ? s.leftPath : s.rightPath))
  const selection = usePaneStore((s) => (id === 'left' ? s.leftSelection : s.rightSelection))
  const focused = usePaneStore((s) => (id === 'left' ? s.leftFocus : s.rightFocus))
  const active = usePaneStore((s) => s.activePane === id)
  const navigateStore = usePaneStore((s) => s.navigate)
  const setActivePane = usePaneStore((s) => s.setActivePane)
  const setSelection = usePaneStore((s) => s.setSelection)
  const setFocus = usePaneStore((s) => s.setFocus)
  const toggleMultiSelect = usePaneStore((s) => s.toggleMultiSelect)
  const selectRange = usePaneStore((s) => s.selectRange)
  const clearSelection = usePaneStore((s) => s.clearSelection)
  const { data: home } = useHomeDir()
  const { data: settings } = useSettings()
  const showHidden = settings?.showHidden ?? false
  const showExtensions = settings?.showExtensions ?? true
  const listing = useDirListing(path || undefined, showHidden)
  const show = useSnack((s) => s.show)
  const qc = useQueryClient()

  const terminalOpen = useTerminalStore((s) => s.isOpen(id))
  const terminalHeight = useTerminalStore((s) => s.height)
  const toggleTerminal = useTerminalStore((s) => s.toggle)

  const folderSizes = useFolderSizeStore((s) => s.getSizes(id))
  const clearSizes = useFolderSizeStore((s) => s.clear)
  const beginSizes = useFolderSizeStore((s) => s.begin)
  const finishSizes = useFolderSizeStore((s) => s.finish)
  const failSizes = useFolderSizeStore((s) => s.fail)

  const job = usePaneJobStore((s) => s.getJob(id))
  const startJob = usePaneJobStore((s) => s.start)
  const finishJob = usePaneJobStore((s) => s.finish)
  const clearJob = usePaneJobStore((s) => s.clear)

  const navigate = async (next: string) => {
    try {
      const ok = await FileService.Exists(next)
      if (!ok) {
        show(`Path not found: ${next}`, 'error')
        return
      }
      clearSizes(id)
      // Local terminal cannot use remote cwd
      if (next.startsWith('ssh://') && terminalOpen) {
        toggleTerminal(id)
      }
      navigateStore(id, next)
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const goUp = () => {
    if (!path) return
    // Remote ssh:// paths
    if (path.startsWith('ssh://')) {
      const m = path.match(/^(ssh:\/\/[^/]+)(\/.*)?$/)
      if (m) {
        const base = m[1]
        const p = m[2] || '/'
        const parent = p.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/'
        void navigate(`${base}${parent === '/' ? '/' : parent}`)
        return
      }
    }
    const parent = path.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/'
    const fixed =
      path.startsWith('/') && !parent.startsWith('/') ? `/${parent}`.replace(/\/+/g, '/') : parent
    void navigate(fixed || '/')
  }

  const goHome = () => {
    if (home) void navigate(home)
  }

  const openEntry = async (entry: FileEntry) => {
    if (entry.isDir) {
      void navigate(entry.path)
      return
    }
    try {
      await FileService.Open(entry.path)
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const onDropPaths = async (paths: string[], destDir: string, sourcePane: PaneId) => {
    const dest = destDir || path
    if (!dest || !paths.length) return
    if (paths.some((p) => p === dest || dest.startsWith(p + '/') || dest.startsWith(p + '\\'))) {
      show('Cannot move a folder into itself', 'warning')
      return
    }
    const sameParent = paths.every((p) => {
      const parent = p.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/'
      return parent === dest || parent === dest.replace(/\/+$/, '')
    })
    if (sameParent && sourcePane === id) {
      return
    }
    try {
      await FileService.Move(paths, dest)
      show(`Moved ${paths.length} item(s)`, 'success')
      clearSelection()
      void qc.invalidateQueries({ queryKey: ['dir'] })
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const cancelJob = async () => {
    if (!job) return
    if (job.backendJobId) {
      try {
        await FileService.CancelJob(job.backendJobId)
      } catch {
        /* ignore */
      }
    }
    clearJob(id, job.id)
    show('Cancelled', 'info')
  }

  const onCalcSizes = async () => {
    if (!path) return
    if (path.startsWith('ssh://')) {
      show('Folder sizes not available on remote connections yet', 'warning')
      return
    }
    setActivePane(id)
    const gen = beginSizes(id)
    const uiJobId = newJobId('sizes')
    let backendJobId = ''
    try {
      backendJobId = await FileService.NewJobID()
    } catch {
      /* soft cancel only */
    }
    startJob(id, {
      id: uiJobId,
      kind: 'sizes',
      label: 'Calculating folder sizes…',
      cancelable: true,
      backendJobId: backendJobId || undefined,
    })
    try {
      const map = await FileService.DirChildSizes(backendJobId, path)
      const sizes: Record<string, number> = {}
      if (map) {
        for (const [k, v] of Object.entries(map)) {
          if (typeof v === 'number') sizes[k] = v
        }
      }
      finishSizes(id, gen, sizes)
      finishJob(id, uiJobId)
      show('Folder sizes calculated', 'success')
    } catch (e) {
      failSizes(id, gen)
      finishJob(id, uiJobId)
      const msg = errMessage(e)
      if (msg.toLowerCase().includes('cancel') || msg.includes('context canceled')) {
        show('Cancelled', 'info')
        return
      }
      show(msg, 'error')
    }
  }

  const activatePane = () => setActivePane(id)

  return (
    <Box
      data-testid={`pane-${id}`}
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={activatePane}
        data-testid={`pane-header-${id}`}
        sx={{
          px: 1,
          py: 0.5,
          bgcolor: active ? 'action.selected' : 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Typography
          variant="caption"
          color={active ? 'primary' : 'text.secondary'}
          sx={{ fontWeight: 700 }}
        >
          {id === 'left' ? 'Left' : 'Right'} pane
        </Typography>
        {job && (
          <Tooltip
            data-testid={`pane-job-tooltip-${id}`}
            placement="bottom-start"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 3,
                  maxWidth: 280,
                  p: 1.25,
                  fontSize: 13,
                },
              },
            }}
            title={
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 160 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                  {job.label}
                </Typography>
                {job.cancelable && (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<CancelIcon fontSize="small" />}
                    data-testid={`btn-cancel-job-${id}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      void cancelJob()
                    }}
                    sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            }
          >
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                ml: 0.5,
              }}
              data-testid={`pane-job-${id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <CircularProgress size={22} thickness={4} />
              <Box
                sx={{
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                {jobKindIcon(job.kind)}
              </Box>
            </Box>
          </Tooltip>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Calculate folder sizes">
          <IconButton
            data-testid={`btn-folder-sizes-${id}`}
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              void onCalcSizes()
            }}
          >
            <StorageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={path.startsWith('ssh://') ? 'Terminal unavailable on remote' : 'Toggle terminal (Ctrl+`)'}>
          <span>
            <IconButton
              data-testid={`btn-terminal-toggle-${id}`}
              size="small"
              color={terminalOpen ? 'primary' : 'default'}
              disabled={path.startsWith('ssh://')}
              onClick={(e) => {
                e.stopPropagation()
                setActivePane(id)
                toggleTerminal(id)
              }}
            >
              <TerminalIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <PathBar
        paneId={id}
        path={path}
        onNavigate={(p) => void navigate(p)}
        onUp={goUp}
        onHome={goHome}
        onFocusPane={activatePane}
      />
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <FileTable
          paneId={id}
          panePath={path}
          entries={listing.data}
          isLoading={listing.isLoading || listing.isFetching}
          isError={listing.isError}
          errorMessage={listing.error ? errMessage(listing.error) : undefined}
          selected={selection}
          focused={focused}
          active={active}
          showExtensions={showExtensions}
          folderSizes={folderSizes}
          onSelect={(paths) => setSelection(id, paths)}
          onFocus={(p, opts) => setFocus(id, p, opts)}
          onToggleMulti={(p) => toggleMultiSelect(id, p)}
          onSelectRange={(ordered, to) => selectRange(id, ordered, to)}
          onActivate={activatePane}
          onOpen={(e) => void openEntry(e)}
          onDropPaths={(paths, dest, src) => void onDropPaths(paths, dest, src)}
        />
      </Box>
      {terminalOpen && <PaneTerminal paneId={id} cwd={path} height={terminalHeight} />}
    </Box>
  )
}
