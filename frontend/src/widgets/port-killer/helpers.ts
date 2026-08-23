import type { PortListener } from '../../entities/file/types';
import { hostOS } from '../../shared/lib/hostOS';

export const filterListeners = (rows: PortListener[], q: string): PortListener[] => {
  const n = q.trim().toLowerCase();
  if (!n) return rows;
  return rows.filter(
    (r) =>
      String(r.port).includes(n) ||
      (r.process ?? '').toLowerCase().includes(n) ||
      String(r.pid).includes(n),
  );
};

export type PortGroup = { pid: number; process: string; ports: number[] };

export const groupByPid = (rows: PortListener[]): PortGroup[] => {
  const map = new Map<number, PortGroup>();
  for (const r of rows) {
    let g = map.get(r.pid);
    if (!g) {
      g = { pid: r.pid, process: r.process, ports: [] };
      map.set(r.pid, g);
    }
    g.ports.push(r.port);
  }
  return [...map.values()];
};

export const uniquePids = (rows: PortListener[]): number[] => {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const r of rows) {
    if (seen.has(r.pid)) continue;
    seen.add(r.pid);
    out.push(r.pid);
  }
  return out;
};

export const modShortcut = (key: string): string =>
  hostOS() === 'darwin' ? `⌘${key}` : `Ctrl+${key}`;
