import type { NameDialogAction, NameDialogState } from './types'

export type { NameDialogAction, NameDialogState } from './types'

export const initialNameDialogState: NameDialogState = {
  open: false,
  name: '',
}

export const nameDialogReducer = (
  state: NameDialogState,
  action: NameDialogAction,
): NameDialogState => {
  switch (action.type) {
    case 'open':
      return { open: true, name: action.name }
    case 'close':
      return { open: false, name: '' }
    case 'set_name':
      return { ...state, name: action.name }
    default:
      return state
  }
}
