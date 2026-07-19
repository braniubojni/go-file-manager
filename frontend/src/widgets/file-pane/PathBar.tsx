import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import HomeIcon from '@mui/icons-material/Home'
import { Autocomplete, Box, IconButton, TextField, Tooltip } from '@mui/material'
import { useEffect, useState } from 'react'
import { usePathCompletions } from '../../entities/file/queries'

interface Props {
  path: string
  onNavigate: (path: string) => void
  onUp: () => void
  onHome: () => void
  onFocusPane: () => void
}

export function PathBar({ path, onNavigate, onUp, onHome, onFocusPane }: Props) {
  const [draft, setDraft] = useState(path)
  const [open, setOpen] = useState(false)
  const completions = usePathCompletions(draft, open || draft !== path)

  useEffect(() => {
    setDraft(path)
  }, [path])

  const submit = (value: string) => {
    const next = value.trim().replace(/\/+$/, '') || '/'
    if (next) onNavigate(next)
  }

  return (
    <Box
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
      <Autocomplete
        freeSolo
        fullWidth
        size="small"
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={completions.data ?? []}
        inputValue={draft}
        onInputChange={(_, v) => setDraft(v)}
        onChange={(_, v) => {
          if (typeof v === 'string' && v) submit(v)
        }}
        filterOptions={(x) => x}
        renderInput={(params) => (
          <TextField
            {...params}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit(draft)
              }
              if (e.key === 'Escape') setDraft(path)
            }}
            sx={{
              '& input': {
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
              },
            }}
          />
        )}
      />
    </Box>
  )
}
