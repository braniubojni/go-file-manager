import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import HomeIcon from '@mui/icons-material/Home'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Box, IconButton, TextField, Tooltip } from '@mui/material'
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'

interface Props {
  path: string
  onNavigate: (path: string) => void
  onUp: () => void
  onHome: () => void
  onRefresh: () => void
  onFocusPane: () => void
}

export function PathBar({ path, onNavigate, onUp, onHome, onRefresh, onFocusPane }: Props) {
  const [draft, setDraft] = useState(path)

  useEffect(() => {
    setDraft(path)
  }, [path])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const next = draft.trim()
    if (next) onNavigate(next)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setDraft(path)
  }

  return (
    <Box
      component="form"
      onSubmit={submit}
      onClick={onFocusPane}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5, py: 0.5 }}
    >
      <Tooltip title="Parent folder">
        <IconButton onClick={onUp} size="small">
          <ArrowUpwardIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Home">
        <IconButton onClick={onHome} size="small">
          <HomeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <TextField
        size="small"
        fullWidth
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setDraft(path)}
        slotProps={{
          htmlInput: {
            spellCheck: false,
            style: { fontFamily: 'ui-monospace, monospace', fontSize: 12 },
          },
        }}
      />
      <Tooltip title="Refresh (F5)">
        <IconButton onClick={onRefresh} size="small">
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
