import { Box, Typography } from '@mui/material'
import { useDirListing } from '../../entities/file/queries'
import { usePaneStore } from '../../features/pane/paneStore'

export function StatusBar() {
  const activePane = usePaneStore((s) => s.activePane)
  const path = usePaneStore((s) => (s.activePane === 'left' ? s.leftPath : s.rightPath))
  const selection = usePaneStore((s) =>
    s.activePane === 'left' ? s.leftSelection : s.rightSelection,
  )
  const listing = useDirListing(path || undefined)
  const count = listing.data?.filter((e) => e.name !== '..').length ?? 0

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        px: 1.5,
        py: 0.5,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        alignItems: 'center',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Active: <strong>{activePane}</strong>
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, fontFamily: 'monospace' }}>
        {path}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Items: {count}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Selected: {selection.filter((p) => !p.endsWith('/..') && !p.endsWith('\\..')).length}
      </Typography>
    </Box>
  )
}
