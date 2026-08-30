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

export const fileListSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.25,
  mt: 0.25,
  maxHeight: 160,
  overflowY: 'auto',
};

// Cancel icon stays invisible until the row is hovered/focused, so a job with
// many files doesn't turn into a wall of buttons.
export const fileRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 0.5,
  py: 0.25,
  borderRadius: 1,
  border: '1px solid transparent',
  '&:hover': {
    bgcolor: 'action.hover',
    borderColor: 'divider',
  },
  '&:hover .file-row-cancel, &:focus-within .file-row-cancel': {
    visibility: 'visible',
  },
};

export const fileRowCancelSx: SxProps<Theme> = {
  visibility: 'hidden',
  p: 0.25,
  ml: 'auto',
};
