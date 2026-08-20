import { hostOS } from '../../shared/lib/hostOS';

export const smbUserPlaceholder = (): string => {
  switch (hostOS()) {
    case 'windows':
      return 'same account as File Explorer (Windows login if empty)';
    case 'linux':
      return 'same account as Files / SMB (Linux login if empty)';
    default:
      return 'same account as Finder (Mac login if empty)';
  }
};

export const smbUserHelp = (): string =>
  'Share account on the server. Type Guest only for anonymous shares.';

export const smbAuthFailMessage = (): string => {
  switch (hostOS()) {
    case 'windows':
      return 'Logon failed. Use the same username, password, and domain as File Explorer → Map network drive (empty user = your Windows login).';
    case 'linux':
      return 'Logon failed. Use the same username, password, and domain as Files / smb:// (empty user = your Linux login).';
    default:
      return 'Logon failed. Use the same username, password, and domain as Finder (empty user = your Mac login).';
  }
};

export const smbNetworkSettingsLabel = (): string => {
  switch (hostOS()) {
    case 'windows':
      return 'Open Windows network / firewall settings';
    case 'linux':
      return 'Open network / firewall settings';
    default:
      return 'Open Local Network settings';
  }
};
