import type { SxProps, Theme } from '@mui/material/styles';
import { TERMINAL_MIN_HEIGHT } from '../../features/terminal/terminalStore';

export const terminalRootSx = (height: number, bg: string): SxProps<Theme> => ({
  height,
  minHeight: TERMINAL_MIN_HEIGHT,
  bgcolor: bg,
  px: 0.5,
  pb: 0.5,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  '& .xterm': { height: '100%' },
  '& .xterm-viewport': { overflowY: 'auto !important' },
});

export const resizeHandleSx: SxProps<Theme> = {
  height: 6,
  flexShrink: 0,
  cursor: 'row-resize',
  mx: -0.5,
  mb: 0.25,
  bgcolor: 'transparent',
  borderTop: '2px solid',
  borderColor: 'divider',
  transition: 'background-color 0.15s, border-color 0.15s',
  '&:hover': {
    bgcolor: 'primary.main',
    borderColor: 'primary.main',
    opacity: 0.85,
  },
  '&:active': {
    bgcolor: 'primary.main',
    borderColor: 'primary.main',
  },
};

export const hostSx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  width: '100%',
};
