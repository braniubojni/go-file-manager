import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { useMemo, useRef, type FC, type MouseEvent as ReactMouseEvent } from 'react';
import {
  TERMINAL_MAX_HEIGHT,
  TERMINAL_MIN_HEIGHT,
  useTerminalStore,
} from '../../features/terminal/terminalStore';
import { useXterm } from './hooks/useXterm';
import { hostSx, resizeHandleSx, terminalRootSx } from './styles';
import { darkTheme, lightTheme } from './themes';
import type { PaneTerminalProps } from './types';
import '@xterm/xterm/css/xterm.css';

export const PaneTerminal: FC<PaneTerminalProps> = ({ paneId, cwd, height, onActivate }) => {
  const muiTheme = useTheme();
  const mode = muiTheme.palette.mode;
  const xtermTheme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);
  const bg = xtermTheme.background || '#0d1117';
  const setHeight = useTerminalStore((s) => s.setHeight);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const { hostRef } = useXterm(paneId, cwd, height, xtermTheme);

  const onResizeStart = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onActivate();
    dragRef.current = { startY: e.clientY, startH: height };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - ev.clientY;
      const next = Math.min(
        TERMINAL_MAX_HEIGHT,
        Math.max(TERMINAL_MIN_HEIGHT, dragRef.current.startH + delta),
      );
      setHeight(next);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <Box
      data-testid={`terminal-${paneId}`}
      sx={terminalRootSx(height, bg)}
      onMouseDownCapture={onActivate}
      onFocusCapture={onActivate}
    >
      <Box
        data-testid={`terminal-resize-${paneId}`}
        onMouseDown={onResizeStart}
        title="Drag to resize terminal"
        sx={resizeHandleSx}
      />
      <Box ref={hostRef} sx={hostSx} />
    </Box>
  );
};
