import { Box, Typography } from '@mui/material'
import { useDirListing, useHomeDir, useSettings } from '../../entities/file/queries'
import type { FileEntry, PaneId } from '../../entities/file/types'
import { usePaneStore } from '../../features/pane/paneStore'
import { FileService } from '../../shared/api/bindings'
import { errMessage } from '../../shared/lib/format'
import { useSnack } from '../../shared/ui/SnackbarHost'
import { FileTable } from './FileTable'
import { PathBar } from './PathBar'

interface Props {
  id: PaneId
}

export function FilePane({ id }: Props) {
  const path = usePaneStore((s) => (id === 'left' ? s.leftPath : s.rightPath))
  const selection = usePaneStore((s) => (id === 'left' ? s.leftSelection : s.rightSelection))
  const active = usePaneStore((s) => s.activePane === id)
  const setPath = usePaneStore((s) => s.setPath)
  const setActivePane = usePaneStore((s) => s.setActivePane)
  const setSelection = usePaneStore((s) => s.setSelection)
  const { data: home } = useHomeDir()
  const { data: settings } = useSettings()
  const showHidden = settings?.showHidden ?? false
  const showExtensions = settings?.showExtensions ?? true
  const listing = useDirListing(path || undefined, showHidden)
  const show = useSnack((s) => s.show)

  const navigate = async (next: string) => {
    try {
      // If user picked a file path, open parent if not a dir — Exists ok; ListDir fails for files
      const ok = await FileService.Exists(next)
      if (!ok) {
        show(`Path not found: ${next}`, 'error')
        return
      }
      setPath(id, next)
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const goUp = () => {
    if (!path) return
    const parent = path.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/'
    const fixed =
      path.startsWith('/') && !parent.startsWith('/') ? `/${parent}`.replace(/\/+/g, '/') : parent
    void navigate(fixed || '/')
  }

  const goHome = () => {
    if (home) void navigate(home)
  }

  const openEntry = (entry: FileEntry) => {
    if (entry.isDir) void navigate(entry.path)
  }

  return (
    <Box
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
        sx={{
          px: 1,
          py: 0.5,
          bgcolor: active ? 'action.selected' : 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          color={active ? 'primary' : 'text.secondary'}
          sx={{ fontWeight: 700 }}
        >
          {id === 'left' ? 'Left' : 'Right'} pane
        </Typography>
      </Box>
      <PathBar
        path={path}
        onNavigate={(p) => void navigate(p)}
        onUp={goUp}
        onHome={goHome}
        onFocusPane={() => setActivePane(id)}
      />
      <FileTable
        entries={listing.data}
        isLoading={listing.isLoading || listing.isFetching}
        isError={listing.isError}
        errorMessage={listing.error ? errMessage(listing.error) : undefined}
        selected={selection}
        active={active}
        showExtensions={showExtensions}
        onSelect={(paths) => setSelection(id, paths)}
        onActivate={() => setActivePane(id)}
        onOpen={openEntry}
      />
    </Box>
  )
}
