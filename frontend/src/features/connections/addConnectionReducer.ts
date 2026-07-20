import type { AddConnectionAction, AddConnectionState } from './types'

export type { AddConnectionAction, AddConnectionMode, AddConnectionState } from './types'

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
}

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
      }
    case 'open_password':
      return {
        ...initialAddConnectionState,
        open: true,
        mode: 'password',
        askPassword: true,
        profileId: action.profileId,
        spec: action.label ?? '',
      }
    case 'close':
      return { ...initialAddConnectionState }
    case 'set_spec':
      return { ...state, spec: action.spec, error: '' }
    case 'set_password':
      return { ...state, password: action.password, error: '' }
    case 'set_save':
      return { ...state, save: action.save }
    case 'set_busy':
      return { ...state, busy: action.busy }
    case 'set_error':
      return { ...state, error: action.error, busy: false }
    case 'need_password':
      return { ...state, askPassword: true, busy: false, password: '' }
    default:
      return state
  }
}
