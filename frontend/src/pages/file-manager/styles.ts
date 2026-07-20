import type { SxProps, Theme } from '@mui/material/styles'

export const loadingSx: SxProps<Theme> = {
  height: '100%',
  display: 'grid',
  placeItems: 'center',
}

export const pageRootSx: SxProps<Theme> = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}

export const panesRowSx: SxProps<Theme> = {
  flex: 1,
  display: 'flex',
  gap: 1,
  p: 1,
  minHeight: 0,
}
