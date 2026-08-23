import type { SxProps, Theme } from '@mui/material/styles';

export const transferSegmentSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  minWidth: 140,
  maxWidth: 280,
  cursor: 'default',
};

export const transferBarSx: SxProps<Theme> = {
  flex: 1,
  height: 6,
  borderRadius: 1,
};

export const tooltipListSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  minWidth: 260,
  maxWidth: 360,
  py: 0.5,
};

export const tooltipRowSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
};

export const tooltipHeaderSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  justifyContent: 'space-between',
};

export const tooltipSlotSx: SxProps<Theme> = {
  maxWidth: 400,
};
