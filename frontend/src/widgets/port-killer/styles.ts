import type { SxProps, Theme } from '@mui/material/styles';

export const paperSx: SxProps<Theme> = {
  width: 360,
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 'min(560px, calc(100vh - 48px))',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  mt: 0.5,
  borderRadius: 1.5,
  boxShadow: 8,
};

export const contentSx: SxProps<Theme> = {
  p: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  flex: '1 1 auto',
  minHeight: 0,
};

export const searchRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1.5,
  pt: 1.5,
  pb: 1,
};

export const countBadgeSx: SxProps<Theme> = {
  minWidth: 22,
  height: 22,
  px: 0.75,
  borderRadius: '50%',
  bgcolor: 'action.selected',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 600,
  flex: '0 0 auto',
};

export const sectionHeaderSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  px: 1.5,
  py: 0.5,
  color: 'success.main',
  fontWeight: 600,
  fontSize: 13,
};

export const listSx: SxProps<Theme> = {
  flex: '1 1 auto',
  minHeight: 120,
  maxHeight: 280,
  overflow: 'auto',
};

export const emptyListSx: SxProps<Theme> = {
  flex: '1 1 auto',
  minHeight: 120,
  maxHeight: 280,
  overflow: 'auto',
  px: 1.5,
  py: 2,
};

export const rowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1.5,
  py: 0.75,
  cursor: 'pointer',
  minHeight: 36,
  '&:hover': { bgcolor: 'action.hover' },
};

export const indentRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1.5,
  pl: 4,
  py: 0.75,
  cursor: 'pointer',
  minHeight: 36,
  '&:hover': { bgcolor: 'action.hover' },
};

export const dotSx: SxProps<Theme> = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  bgcolor: 'success.main',
  flex: '0 0 auto',
};

export const pidSx: SxProps<Theme> = {
  ml: 'auto',
  color: 'text.secondary',
  fontSize: 12,
  flex: '0 0 auto',
};

export const actionsSx: SxProps<Theme> = {
  borderTop: 1,
  borderColor: 'divider',
  py: 0.5,
};

export const actionRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  width: '100%',
  px: 1.5,
  py: 0.75,
  justifyContent: 'flex-start',
  textTransform: 'none',
  color: 'text.primary',
  borderRadius: 0,
};

export const killAllConfirmSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  width: '100%',
  px: 1.5,
  py: 0.5,
};

export const killAllBtnSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  width: '100%',
  px: 1.5,
  py: 0.75,
  justifyContent: 'flex-start',
  textTransform: 'none',
  color: 'error.main',
  borderRadius: 0,
};

export const shortcutSx: SxProps<Theme> = {
  ml: 'auto',
  color: 'text.secondary',
  fontSize: 12,
};
