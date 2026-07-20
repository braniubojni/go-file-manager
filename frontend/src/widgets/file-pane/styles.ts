import type { SxProps, Theme } from '@mui/material/styles'

export const paneRootSx = (active: boolean): SxProps<Theme> => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid',
  borderColor: active ? 'primary.main' : 'divider',
  borderRadius: 1,
  overflow: 'hidden',
})

export const paneHeaderSx = (active: boolean): SxProps<Theme> => ({
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
})

export const paneHeaderTitleSx: SxProps<Theme> = { fontWeight: 700 }

export const jobTooltipSlotSx: SxProps<Theme> = {
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 3,
  maxWidth: 280,
  p: 1.25,
  fontSize: 13,
}

export const jobTooltipBodySx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.75,
  minWidth: 160,
}

export const jobTooltipLabelSx: SxProps<Theme> = { fontWeight: 600, fontSize: 13 }

export const jobCancelBtnSx: SxProps<Theme> = {
  alignSelf: 'flex-start',
  textTransform: 'none',
  fontWeight: 700,
}

export const jobSpinnerWrapSx: SxProps<Theme> = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  ml: 0.5,
}

export const jobSpinnerIconSx: SxProps<Theme> = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'text.secondary',
}

export const jobKindIconSx: SxProps<Theme> = { fontSize: 12 }

export const paneBodySx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
}

export const headerSpacerSx: SxProps<Theme> = { flex: 1 }
