import { Box, MenuItem, Select, Typography } from '@mui/material'
import { useBookmarks, useFileOps } from '../../../entities/file/queries'
import { usePaneStore } from '../../../features/pane/paneStore'
import type { BookmarksSelectProps } from '../types'

export function BookmarksSelect({ activePane }: BookmarksSelectProps) {
  const { data: bookmarks = [] } = useBookmarks()
  const ops = useFileOps()
  const navigateStore = usePaneStore((s) => s.navigate)

  return (
    <Select
      data-testid="select-bookmarks"
      size="small"
      displayEmpty
      value=""
      sx={{ minWidth: 160, ml: 0.5 }}
      renderValue={() => 'Bookmarks'}
      onChange={(e) => {
        const p = String(e.target.value)
        if (p) navigateStore(activePane, p)
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
  )
}
