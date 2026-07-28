import { FitAddon } from '@xterm/addon-fit';
import { Terminal, type ITheme } from '@xterm/xterm';
import { Events } from '@wailsio/runtime';
import { useEffect, useRef } from 'react';
import type { PaneId } from '../../../entities/file/types';
import { TerminalService } from '../../../shared/api/bindings';
import type { TermPayload } from '../types';

export const useXterm = (paneId: PaneId, cwd: string, height: number, xtermTheme: ITheme) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const startedRef = useRef(false);
  const cwdRef = useRef(cwd);
  cwdRef.current = cwd;

  useEffect(() => {
    if (!hostRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      theme: xtermTheme,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    try {
      fit.fit();
    } catch {
      /* ignore */
    }

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

    void TerminalService.Start(paneId, cwdRef.current)
      .then(async () => {
        startedRef.current = true;
        try {
          fit.fit();
          const dims = fit.proposeDimensions();
          if (dims) await TerminalService.Resize(paneId, dims.cols, dims.rows);
        } catch {
          /* ignore */
        }
      })
      .catch((e) => {
        term.writeln(`\r\nFailed to start terminal: ${String(e)}`);
      });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        const dims = fit.proposeDimensions();
        if (dims && startedRef.current) {
          void TerminalService.Resize(paneId, dims.cols, dims.rows);
        }
      } catch {
        /* ignore */
      }
    });
    ro.observe(hostRef.current);

    return () => {
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
    try {
      fitRef.current?.fit();
      const dims = fitRef.current?.proposeDimensions();
      if (dims && startedRef.current) {
        void TerminalService.Resize(paneId, dims.cols, dims.rows);
      }
    } catch {
      /* ignore */
    }
  }, [height, paneId]);

  return { hostRef };
};
