import type { ExtractAction, ExtractState } from './types'

export type { ExtractAction, ExtractState } from './types'

export const initialExtractState: ExtractState = {
  open: false,
  password: '',
  busy: false,
  error: null,
  itemCount: 0,
}

export function extractDialogReducer(state: ExtractState, action: ExtractAction): ExtractState {
  switch (action.type) {
    case 'open':
      return { ...initialExtractState, open: true, itemCount: action.itemCount }
    case 'close':
      return { ...initialExtractState }
    case 'set_password':
      return { ...state, password: action.password, error: null }
    case 'submit_start':
      return { ...state, busy: true, error: null }
    case 'submit_ok':
      return { ...initialExtractState }
    case 'submit_fail':
      return { ...state, busy: false, error: action.error }
    default:
      return state
  }
}
