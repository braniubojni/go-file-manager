import { FitAddon } from '@xterm/addon-fit';
import { Terminal, type ITheme } from '@xterm/xterm';
import { Events } from '@wailsio/runtime';
import { useEffect, useRef } from 'react';
import type { PaneId } from '../../../entities/file/types';
import { TerminalService } from '../../../shared/api/bindings';
import type { TermPayload } from '../types';

/** Fit host → xterm cells; only push PTY resize when cols/rows actually change. */
const fitAndMaybeResize = (
  host: HTMLElement,
  term: Terminal,
  fit: FitAddon,
  paneId: PaneId,
  started: boolean,
  last: { cols: number; rows: number },
): void => {
  if (host.clientWidth < 4 || host.clientHeight < 4) return;
  try {
    fit.fit();
  } catch {
    return;
  }
  const cols = term.cols;
  const rows = term.rows;
  if (cols < 2 || rows < 1) return;
  if (cols === last.cols && rows === last.rows) return;
  last.cols = cols;
  last.rows = rows;
  if (started) {
    void TerminalService.Resize(paneId, cols, rows);
  }
};

export const useXterm = (paneId: PaneId, cwd: string, height: number, xtermTheme: ITheme) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const startedRef = useRef(false);
  const lastSizeRef = useRef({ cols: 0, rows: 0 });
  const cwdRef = useRef(cwd);
  cwdRef.current = cwd;

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    const lastSize = { cols: 0, rows: 0 };
    lastSizeRef.current = lastSize;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      theme: xtermTheme,
      // Avoid convertEol issues; PTY already sends CR/LF as the shell intends.
      allowProposedApi: false,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    try {
      fit.fit();
    } catch {
      /* ignore */
    }
    // Focus so typing works immediately after toggle (no click required).
    term.focus();

    termRef.current = term;
    fitRef.current = fit;

    const onData = term.onData((data) => {
      void TerminalService.Write(paneId, data);
    });

    const unsubData = Events.On('terminal:data', (ev: { data?: TermPayload }) => {
      const payload = (ev?.data ?? ev) as TermPayload;
      if (payload?.paneId === paneId && typeof payload.data === 'string') {
        term.write(payload.data);
      }
    });

    const unsubExit = Events.On('terminal:exit', (ev: { data?: TermPayload }) => {
      const payload = (ev?.data ?? ev) as TermPayload;
      if (payload?.paneId === paneId) {
        term.writeln('\r\n[process exited]');
        startedRef.current = false;
      }
    });

    // Fit before start so the first Resize after spawn matches the real host size
    // (zsh/p10k need a correct WINCH early; avoid 0×0 default from openpty).
    fitAndMaybeResize(host, term, fit, paneId, false, lastSize);

    void TerminalService.Start(paneId, cwdRef.current)
      .then(async () => {
        startedRef.current = true;
        // Force one PTY resize even if lastSize was set only on the xterm side.
        try {
          fit.fit();
          const cols = term.cols;
          const rows = term.rows;
          if (cols >= 2 && rows >= 1) {
            lastSize.cols = cols;
            lastSize.rows = rows;
            await TerminalService.Resize(paneId, cols, rows);
          }
        } catch {
          /* ignore */
        }
        // Re-focus after layout/start; fit/async start can steal focus.
        term.focus();
      })
      .catch((e) => {
        term.writeln(`\r\nFailed to start terminal: ${String(e)}`);
      });

    // Debounce RO → rAF so scrollbar show/hide can’t WINCH-spam zsh.
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        fitAndMaybeResize(host, term, fit, paneId, startedRef.current, lastSize);
      });
    });
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      onData.dispose();
      if (typeof unsubData === 'function') unsubData();
      if (typeof unsubExit === 'function') unsubExit();
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      void TerminalService.Stop(paneId);
      startedRef.current = false;
    };
    // Re-create only when pane changes; theme updates handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = xtermTheme;
    }
  }, [xtermTheme]);

  useEffect(() => {
    if (!startedRef.current || !cwd) return;
    void TerminalService.SetCwd(paneId, cwd);
  }, [cwd, paneId]);

  useEffect(() => {
    const host = hostRef.current;
    const term = termRef.current;
    const fit = fitRef.current;
    if (!host || !term || !fit) return;
    fitAndMaybeResize(host, term, fit, paneId, startedRef.current, lastSizeRef.current);
  }, [height, paneId]);

  return { hostRef };
};
