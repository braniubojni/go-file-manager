import { type SxProps, type Theme } from '@mui/material/styles';

export const paperSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: 560,
  mt: 8,
  overflow: 'hidden',
};

export const listSx: SxProps<Theme> = {
  maxHeight: 360,
  overflow: 'auto',
  py: 0.5,
};

export const rowSx = (active: boolean): SxProps<Theme> => ({
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1.5,
  py: 0.75,
  cursor: 'pointer',
  bgcolor: active ? 'action.selected' : 'transparent',
  '&:hover': { bgcolor: active ? 'action.selected' : 'action.hover' },
});
