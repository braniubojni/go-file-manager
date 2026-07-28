export type AddConnectionState = {
  open: boolean;
  spec: string;
  password: string;
  askPassword: boolean;
  save: boolean;
  busy: boolean;
  error: string;
  /** When re-prompting password for an existing profile connect */
  profileId: string;
  mode: 'add' | 'password' | 'ssh_config' | 'workdir';
  // ssh_config mode
  sshConfigPath: string;
  sshConfigHosts: SSHConfigHost[];
  sshConfigLoading: boolean;
  selectedConfigHost: SSHConfigHost | null;
  // workdir mode
  workdirPaths: RemoteRecent[];
  workdirHome: string;
  workdirSessionKey: string;
  workdirChosen: string;
  workdirCustom: string;
  workdirRemember: boolean;
  workdirProfileId: string;
};

export type AddConnectionAction =
  | { type: 'open_add' }
  | { type: 'open_password'; profileId: string; label?: string }
  | { type: 'open_ssh_config' }
  | {
      type: 'open_workdir';
      paths: RemoteRecent[];
      home: string;
      sessionKey: string;
      chosen?: string;
      profileId?: string;
    }
  | { type: 'close' }
  | { type: 'set_spec'; spec: string }
  | { type: 'set_password'; password: string }
  | { type: 'set_save'; save: boolean }
  | { type: 'set_busy'; busy: boolean }
  | { type: 'set_error'; error: string }
  | { type: 'need_password' }
  | { type: 'set_ssh_config_path'; path: string }
  | { type: 'set_ssh_config_hosts'; hosts: SSHConfigHost[] }
  | { type: 'set_ssh_config_loading'; loading: boolean }
  | { type: 'select_config_host'; host: SSHConfigHost }
  | { type: 'set_workdir_chosen'; path: string }
  | { type: 'set_workdir_custom'; path: string }
  | { type: 'set_workdir_remember'; remember: boolean };

/** Saved remote connection profile (from backend). */
export type ConnectionProfile = {
  id: string;
  protocol: string;
  user: string;
  host: string;
  port: number;
  label: string;
  configAlias?: string;
  identityFiles?: string[];
  defaultWorkDir?: string;
};

/** Live remote session (from backend). */
export type ActiveSession = {
  key: string;
  protocol: string;
  user: string;
  host: string;
  port: number;
  rootPath: string;
};

/** SSH config file host entry (mirrors domain.SSHConfigHost). */
export type SSHConfigHost = {
  alias: string;
  hostName: string;
  user: string;
  port: number;
  identityFiles: string[];
};

/** Recently visited remote directory (mirrors domain.RemoteRecent). */
export type RemoteRecent = {
  sessionKey: string;
  path: string;
  label: string;
  lastVisited: string;
};
