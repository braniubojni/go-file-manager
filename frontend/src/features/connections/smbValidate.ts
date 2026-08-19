import { normalizeSMBHost } from './helpers';

const PROTOCOL_TOKENS = new Set(['smb', 'ssh', 'sftp', 'ftp', 'http', 'https', 'file']);

const HOST_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,61}[A-Za-z0-9])?$/;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const USER_OK = /^[^@/\\:*?"<>|\s]+$/;
const DOMAIN_OK = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9])?$/;
const SHARE_OK = /^[^/\\:*?"<>|]+$/;

export type SMBFormInput = {
  host: string;
  user: string;
  domain: string;
  port: string;
};

export type SMBFieldErrors = {
  host?: string;
  user?: string;
  domain?: string;
  port?: string;
};

export type SMBParsedForm = {
  ok: boolean;
  host: string;
  user: string;
  domain: string;
  port: number;
  errors: SMBFieldErrors;
};

/** Split `host`, `host:port`, or `[v6]:port` after stripping a pasted smb:// URL. */
const splitSMBHostPort = (raw: string): { host: string; port?: string } => {
  const h = normalizeSMBHost(raw);
  const bracket = h.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (bracket) return { host: bracket[1], port: bracket[2] };
  const colon = h.lastIndexOf(':');
  if (colon > 0 && h.indexOf(':') === colon && /^\d+$/.test(h.slice(colon + 1))) {
    return { host: h.slice(0, colon), port: h.slice(colon + 1) };
  }
  return { host: h };
};

const smbHostError = (host: string): string | undefined => {
  const h = host.trim();
  if (!h) return 'Enter a computer name or IP (e.g. 192.168.0.10)';
  if (PROTOCOL_TOKENS.has(h.toLowerCase())) {
    return 'Enter the computer name or IP, not the protocol (e.g. 192.168.0.10)';
  }
  if (h.includes('://') || h.includes(' ')) {
    return 'Host cannot contain a URL scheme or spaces';
  }
  if (h.includes('@')) return 'Put the username in the Username field';
  if (IPV4.test(h)) {
    const ok = h.split('.').every((p) => {
      const n = Number(p);
      return n >= 0 && n <= 255 && String(n) === String(Number(p));
    });
    return ok ? undefined : 'Invalid IPv4 address';
  }
  if ((h.match(/:/g) ?? []).length >= 2 && /^[0-9A-Fa-f:]+$/.test(h)) return undefined;
  if (h.includes(':')) return 'Use [IPv6] or put the port in the Port field';
  if (h.startsWith('.') || h.endsWith('.') || h.includes('..')) return 'Invalid host name';
  const labels = h.split('.');
  if (labels.some((l) => !HOST_LABEL.test(l))) return 'Invalid host name';
  if (h.length > 253) return 'Host name is too long';
  return undefined;
};

const smbPortError = (port: string): string | undefined => {
  const raw = port.trim();
  if (!raw) return undefined;
  if (!/^\d+$/.test(raw)) return 'Port must be a number';
  const n = Number(raw);
  if (n < 1 || n > 65535) return 'Port must be between 1 and 65535';
  return undefined;
};

const smbUserError = (user: string): string | undefined => {
  const u = user.trim();
  if (!u) return undefined;
  if (u.includes('\\')) {
    const [dom, name] = u.split('\\');
    if (!dom || !name || name.includes('\\')) return 'Use DOMAIN\\user or the Domain field';
    return smbUserError(name) ?? smbDomainError(dom);
  }
  if (u.includes('@')) {
    const i = u.lastIndexOf('@');
    const name = u.slice(0, i);
    const dom = u.slice(i + 1);
    if (!name || !dom) return 'Use user@DOMAIN or the Domain field';
    return smbUserError(name) ?? smbDomainError(dom);
  }
  if (!USER_OK.test(u)) return 'Username cannot contain spaces or @ / \\ : * ? " < > |';
  return undefined;
};

const smbDomainError = (domain: string): string | undefined => {
  const d = domain.trim();
  if (!d) return undefined;
  if (!DOMAIN_OK.test(d)) return 'Invalid domain / workgroup name';
  return undefined;
};

export const smbShareError = (name: string): string | undefined => {
  const n = name.trim();
  if (!n) return 'Choose or enter a share name';
  if (n === '.' || n === '..') return 'Invalid share name';
  if (!SHARE_OK.test(n)) return 'Share name cannot contain / \\ : * ? " < > |';
  return undefined;
};

export const parseSMBForm = (input: SMBFormInput): SMBParsedForm => {
  const split = splitSMBHostPort(input.host);
  const host = split.host;
  const portRaw = input.port.trim() || split.port || '445';
  const userRaw = input.user.trim();
  let user = userRaw;
  let domain = input.domain.trim();
  if (userRaw.includes('\\') && !domain) {
    const i = userRaw.indexOf('\\');
    domain = userRaw.slice(0, i);
    user = userRaw.slice(i + 1);
  } else if (userRaw.includes('@') && !domain) {
    const i = userRaw.lastIndexOf('@');
    user = userRaw.slice(0, i);
    domain = userRaw.slice(i + 1);
  }
  const errors: SMBFieldErrors = {
    host: smbHostError(host),
    port: smbPortError(portRaw),
    user: smbUserError(userRaw),
    domain: smbDomainError(domain),
  };
  const ok = !errors.host && !errors.port && !errors.user && !errors.domain;
  return {
    ok,
    host,
    user,
    domain,
    port: Number(portRaw) || 445,
    errors,
  };
};
