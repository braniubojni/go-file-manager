import type { AddConnectionAction, AddConnectionState } from './types';

export type { AddConnectionAction, AddConnectionState } from './types';

export const initialAddConnectionState: AddConnectionState = {
  open: false,
  spec: '',
  password: '',
  askPassword: false,
  save: true,
  busy: false,
  error: '',
  profileId: '',
  mode: 'add',
  sshConfigPath: '',
  sshConfigHosts: [],
  sshConfigLoading: false,
  selectedConfigHost: null,
  workdirPaths: [],
  workdirHome: '',
  workdirSessionKey: '',
  workdirChosen: '',
  workdirCustom: '',
  workdirRemember: true,
  workdirProfileId: '',
};

export const addConnectionReducer = (
  state: AddConnectionState,
  action: AddConnectionAction,
): AddConnectionState => {
  switch (action.type) {
    case 'open_add':
      return {
        ...initialAddConnectionState,
        open: true,
        mode: 'add',
        save: true,
      };
    case 'open_password':
      return {
        ...initialAddConnectionState,
        open: true,
        mode: 'password',
        askPassword: true,
        profileId: action.profileId,
        spec: action.label ?? '',
      };
    case 'open_ssh_config':
      return {
        ...initialAddConnectionState,
        open: true,
        mode: 'ssh_config',
        save: true,
        // sshConfigPath is set via set_ssh_config_path after DefaultSSHConfigPaths() resolves
        sshConfigPath: '',
      };
    case 'open_workdir': {
      const chosen = action.chosen || action.home;
      return {
        ...state,
        open: true,
        mode: 'workdir',
        busy: false,
        error: '',
        workdirPaths: action.paths,
        workdirHome: action.home,
        workdirSessionKey: action.sessionKey,
        workdirChosen: chosen,
        workdirCustom: '',
        workdirRemember: Boolean(action.profileId),
        workdirProfileId: action.profileId ?? '',
      };
    }
    case 'close':
      return { ...initialAddConnectionState };
    case 'set_spec':
      return { ...state, spec: action.spec, error: '' };
    case 'set_password':
      return { ...state, password: action.password, error: '' };
    case 'set_save':
      return { ...state, save: action.save };
    case 'set_busy':
      return { ...state, busy: action.busy };
    case 'set_error':
      return { ...state, error: action.error, busy: false };
    case 'need_password':
      return { ...state, askPassword: true, busy: false, password: '' };
    case 'set_ssh_config_path':
      return { ...state, sshConfigPath: action.path, sshConfigHosts: [], error: '' };
    case 'set_ssh_config_hosts':
      return { ...state, sshConfigHosts: action.hosts, sshConfigLoading: false, error: '' };
    case 'set_ssh_config_loading':
      return { ...state, sshConfigLoading: action.loading };
    case 'select_config_host':
      return { ...state, selectedConfigHost: action.host };
    case 'set_workdir_chosen':
      return { ...state, workdirChosen: action.path, workdirCustom: '' };
    case 'set_workdir_custom':
      return { ...state, workdirCustom: action.path, workdirChosen: '__custom__' };
    case 'remove_workdir_path':
      return {
        ...state,
        workdirPaths: state.workdirPaths.filter((r) => r.path !== action.path),
        workdirChosen:
          state.workdirChosen === action.path ? state.workdirHome : state.workdirChosen,
      };
    case 'set_workdir_remember':
      return { ...state, workdirRemember: action.remember };
    default:
      return state;
  }
};
