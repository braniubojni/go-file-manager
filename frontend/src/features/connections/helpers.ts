export const isAuthErrorMessage = (msg: string): boolean => {
  const m = msg.toLowerCase();
  return (
    m.includes('authentication required') ||
    m.includes('unable to authenticate') ||
    m.includes('no authentication methods') ||
    m.includes('public key auth failed') ||
    m.includes('passphrase') ||
    m.includes('permission denied')
  );
};

/** Build ssh:// virtual path from session home base + absolute or relative remote path. */
export const resolveRemoteWorkdirInput = (homePath: string, input: string): string | null => {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.startsWith('ssh://')) return raw;
  // homePath is ssh://user@host:port/abs
  const m = homePath.match(/^(ssh:\/\/[^/]+)(\/.*)?$/i);
  if (!m) return null;
  const origin = m[1];
  if (raw.startsWith('/')) return `${origin}${raw}`;
  const homeAbs = (m[2] || '/').replace(/\/$/, '') || '';
  return `${origin}${homeAbs}/${raw}`.replace(/([^:]\/)\/+/g, '$1');
};
