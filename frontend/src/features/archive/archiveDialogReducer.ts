import type { ArchiveAction, ArchiveState } from './types'

export type { ArchiveAction, ArchiveState } from './types'

export const initialArchiveState: ArchiveState = {
  open: false,
  formats: ['zip', 'tar', 'tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst', 'tar.lz4', 'tar.sz'],
  format: 'zip',
  name: 'archive',
  encrypt: false,
  password: '',
  busy: false,
  error: null,
}

export const archiveDialogReducer = (state: ArchiveState, action: ArchiveAction): ArchiveState => {
  switch (action.type) {
    case 'open':
      return {
        ...initialArchiveState,
        open: true,
        name: action.defaultName || 'archive',
        formats: action.formats?.length ? action.formats : state.formats,
        format: 'zip',
      }
    case 'close':
      return { ...state, open: false, busy: false, error: null, password: '', encrypt: false }
    case 'set':
      return { ...state, ...action.patch, error: null }
    case 'submit_start':
      return { ...state, busy: true, error: null }
    case 'submit_ok':
      return { ...initialArchiveState, formats: state.formats }
    case 'submit_fail':
      return { ...state, busy: false, error: action.error }
    default:
      return state
  }
}
