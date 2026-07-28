import type { SxProps, Theme } from '@mui/material/styles';

export const appBarSx: SxProps<Theme> = {
  borderBottom: 1,
  borderColor: 'divider',
};

export const toolbarSx: SxProps<Theme> = {
  minHeight: 36,
  gap: 0.5,
  px: 1,
};

export const listItemIconSx: SxProps<Theme> = { minWidth: 28 };

export const checkPlaceholderSx: SxProps<Theme> = { width: 18 };
