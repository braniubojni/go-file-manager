export type HostOS = 'darwin' | 'windows' | 'linux';

/** Best-effort OS of the Wails host (not a remote server). */
export const hostOS = (): HostOS => {
  const p = (navigator.platform ?? '').toLowerCase();
  const ua = (navigator.userAgent ?? '').toLowerCase();
  if (p.includes('mac') || ua.includes('mac os')) return 'darwin';
  if (p.includes('win') || ua.includes('windows')) return 'windows';
  return 'linux';
};
