import { Box, useTheme } from '@mui/material'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal, type ITheme } from '@xterm/xterm'
import { Events } from '@wailsio/runtime'
import { useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import type { PaneId } from '../../entities/file/types'
import {
  TERMINAL_MAX_HEIGHT,
  TERMINAL_MIN_HEIGHT,
  useTerminalStore,
} from '../../features/terminal/terminalStore'
import { TerminalService } from '../../shared/api/bindings'
import '@xterm/xterm/css/xterm.css'

interface Props {
  paneId: PaneId
  cwd: string
  height: number
}

type TermPayload = { paneId?: string; data?: string; code?: number }

const darkTheme: ITheme = {
  background: '#0d1117',
  foreground: '#e6edf3',
  cursor: '#e6edf3',
  selectionBackground: '#264f78',
}

const lightTheme: ITheme = {
  background: '#f6f8fa',
  foreground: '#1f2328',
  cursor: '#1f2328',
  selectionBackground: '#b6d0ff',
}

export function PaneTerminal({ paneId, cwd, height }: Props) {
  const muiTheme = useTheme()
  const mode = muiTheme.palette.mode
  const xtermTheme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode])
  const bg = xtermTheme.background || '#0d1117'

  const hostRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const startedRef = useRef(false)
  const cwdRef = useRef(cwd)
  cwdRef.current = cwd
  const setHeight = useTerminalStore((s) => s.setHeight)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  useEffect(() => {
    if (!hostRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      theme: xtermTheme,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(hostRef.current)
    try {
      fit.fit()
    } catch {
      /* ignore */
    }

    termRef.current = term
    fitRef.current = fit

    const onData = term.onData((data) => {
      void TerminalService.Write(paneId, data)
    })

    const unsubData = Events.On('terminal:data', (ev: { data?: TermPayload }) => {
      const payload = (ev?.data ?? ev) as TermPayload
      if (payload?.paneId === paneId && typeof payload.data === 'string') {
        term.write(payload.data)
      }
    })

    const unsubExit = Events.On('terminal:exit', (ev: { data?: TermPayload }) => {
      const payload = (ev?.data ?? ev) as TermPayload
      if (payload?.paneId === paneId) {
        term.writeln('\r\n[process exited]')
        startedRef.current = false
      }
    })

    const start = async () => {
      try {
        await TerminalService.Start(paneId, cwdRef.current)
        startedRef.current = true
        try {
          fit.fit()
          const dims = fit.proposeDimensions()
          if (dims) {
            await TerminalService.Resize(paneId, dims.cols, dims.rows)
          }
        } catch {
          /* ignore */
        }
      } catch (e) {
        term.writeln(`\r\nFailed to start terminal: ${String(e)}`)
      }
    }
    void start()

    const ro = new ResizeObserver(() => {
      try {
        fit.fit()
        const dims = fit.proposeDimensions()
        if (dims && startedRef.current) {
          void TerminalService.Resize(paneId, dims.cols, dims.rows)
        }
      } catch {
        /* ignore */
      }
    })
    ro.observe(hostRef.current)

    return () => {
      onData.dispose()
      if (typeof unsubData === 'function') unsubData()
      if (typeof unsubExit === 'function') unsubExit()
      ro.disconnect()
      term.dispose()
      termRef.current = null
      void TerminalService.Stop(paneId)
      startedRef.current = false
    }
    // Re-create only when pane changes; theme updates handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId])

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = xtermTheme
    }
  }, [xtermTheme])

  useEffect(() => {
    if (!startedRef.current || !cwd) return
    void TerminalService.SetCwd(paneId, cwd)
  }, [cwd, paneId])

  useEffect(() => {
    try {
      fitRef.current?.fit()
      const dims = fitRef.current?.proposeDimensions()
      if (dims && startedRef.current) {
        void TerminalService.Resize(paneId, dims.cols, dims.rows)
      }
    } catch {
      /* ignore */
    }
  }, [height, paneId])

  const onResizeStart = (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { startY: e.clientY, startH: height }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - ev.clientY
      const next = Math.min(
        TERMINAL_MAX_HEIGHT,
        Math.max(TERMINAL_MIN_HEIGHT, dragRef.current.startH + delta),
      )
      setHeight(next)
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <Box
      data-testid={`terminal-${paneId}`}
      sx={{
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
      }}
    >
      <Box
        data-testid={`terminal-resize-${paneId}`}
        onMouseDown={onResizeStart}
        title="Drag to resize terminal"
        sx={{
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
        }}
      />
      <Box ref={hostRef} sx={{ flex: 1, minHeight: 0, width: '100%' }} />
    </Box>
  )
}
