/**
 * Session key (`user@host:port`) for an `ssh://` virtual path — mirrors
 * `remote.Spec.SessionKey` in internal/remote/path.go. Null for local paths.
 */
export const sessionKeyFromPath = (path: string): string | null => {
  const m = path.match(/^ssh:\/\/([^@/]+)@([^/:]+)(?::(\d+))?(?:\/|$)/i);
  if (!m) return null;
  return `${m[1]}@${m[2]}:${m[3] || '22'}`;
};

/** True when the pane error means the SSH session is gone / never dialled. */
export const isNotConnectedMessage = (msg: string): boolean =>
  /not connected to .*connect first/i.test(msg);

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
