import type { PortListener, ProcessInfo } from '../../entities/file/types';
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

export const filterProcesses = (rows: ProcessInfo[], q: string): ProcessInfo[] => {
  const n = q.trim().toLowerCase();
  if (!n) return rows;
  return rows.filter(
    (r) =>
      (r.name ?? '').toLowerCase().includes(n) ||
      (r.cmd ?? '').toLowerCase().includes(n) ||
      (r.cwd ?? '').toLowerCase().includes(n) ||
      String(r.pid).includes(n),
  );
};

/** Second line: cwd and args (name stripped), for telling identical node/npm PIDs apart. */
export const processDetail = (r: ProcessInfo): string => {
  let cmd = (r.cmd ?? '').trim();
  const name = r.name ?? '';
  if (name && (cmd === name || cmd.startsWith(name + ' '))) {
    cmd = cmd.slice(name.length).trim();
  }
  const cwd = (r.cwd ?? '').trim();
  if (cwd && cmd) return `${cwd} · ${cmd}`;
  return cwd || cmd;
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

export const uniquePids = (rows: { pid: number }[]): number[] => {
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

const PORT_TAGS: Record<number, string> = {
  5432: 'PostgreSQL',
  6379: 'Redis',
  3306: 'MySQL',
  27017: 'MongoDB',
  5672: 'RabbitMQ',
  9200: 'Elasticsearch',
  11211: 'Memcached',
  11434: 'Ollama',
};

const NAME_TAGS: [string, string][] = [
  ['postgres', 'PostgreSQL'],
  ['redis', 'Redis'],
  ['mysqld', 'MySQL'],
  ['mariadbd', 'MariaDB'],
  ['nginx', 'Nginx'],
  ['httpd', 'Apache'],
  ['apache', 'Apache'],
  ['caddy', 'Caddy'],
  ['dockerd', 'Docker'],
  ['com.docker', 'Docker'],
  ['docker', 'Docker'],
  ['mongod', 'MongoDB'],
  ['elasticsearch', 'Elasticsearch'],
  ['rabbitmq', 'RabbitMQ'],
  ['memcached', 'Memcached'],
  ['ollama', 'Ollama'],
  ['node', 'Node'],
  ['npm', 'npm'],
];

const HTTP_NAMES = /nginx|httpd|apache|caddy/i;

/** Chip label only when the process or well-known port is an explicit match. */
export const knownServiceTag = (process: string, port?: number): string | undefined => {
  if (port != null) {
    if (PORT_TAGS[port]) return PORT_TAGS[port];
    if ((port === 80 || port === 443) && HTTP_NAMES.test(process)) {
      return port === 443 ? 'HTTPS' : 'HTTP';
    }
  }
  const n = (process ?? '').toLowerCase();
  if (!n) return undefined;
  for (const [needle, tag] of NAME_TAGS) {
    if (n.includes(needle)) return tag;
  }
  return undefined;
};
