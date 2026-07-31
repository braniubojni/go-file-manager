import { type SxProps, type Theme } from '@mui/material/styles';

/** Pin dialog paper under the top of the viewport; growth expands downward only. */
export const dialogRootSx: SxProps<Theme> = {
  '& .MuiDialog-container': {
    alignItems: 'flex-start',
  },
};

export const paperSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: 720,
  mt: 3,
  mb: 2,
  maxHeight: 'calc(100vh - 48px)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export const contentSx: SxProps<Theme> = {
  p: 0,
  pb: 1.5,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  flex: '1 1 auto',
  minHeight: 0,
};

export const formSectionSx: SxProps<Theme> = {
  flex: '0 0 auto',
};

export const headerRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1.5,
  pt: 1.5,
};

export const replaceRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1.5,
  pt: 1,
  pl: 5.5,
};

export const fieldRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1.5,
  pt: 1,
};

/** Results scroll inside a fixed region so the form above does not jump. */
export const listSx: SxProps<Theme> = {
  flex: '1 1 auto',
  minHeight: 200,
  maxHeight: 380,
  overflow: 'auto',
  py: 0.5,
  borderTop: 1,
  borderColor: 'divider',
  mt: 1,
};

export const rowBaseSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.25,
  px: 1.5,
  py: 0.75,
  cursor: 'pointer',
  bgcolor: 'transparent',
  '&:hover': { bgcolor: 'action.hover' },
};

export const rowActiveSx: SxProps<Theme> = {
  bgcolor: 'action.selected',
  '&:hover': { bgcolor: 'action.selected' },
};

export const matchHighlightSx: SxProps<Theme> = {
  bgcolor: 'warning.light',
  color: 'warning.contrastText',
  borderRadius: 0.5,
  px: 0.25,
};
