export type AddConnectionState = {
  open: boolean
  spec: string
  password: string
  askPassword: boolean
  save: boolean
  busy: boolean
  error: string
  /** When re-prompting password for an existing profile connect */
  profileId: string
  mode: 'add' | 'password'
}

export type AddConnectionAction =
  | { type: 'open_add' }
  | { type: 'open_password'; profileId: string; label?: string }
  | { type: 'close' }
  | { type: 'set_spec'; spec: string }
  | { type: 'set_password'; password: string }
  | { type: 'set_save'; save: boolean }
  | { type: 'set_busy'; busy: boolean }
  | { type: 'set_error'; error: string }
  | { type: 'need_password' }

/** Saved remote connection profile (from backend). */
export type ConnectionProfile = {
  id: string
  protocol: string
  user: string
  host: string
  port: number
  label: string
}

/** Live remote session (from backend). */
export type ActiveSession = {
  key: string
  protocol: string
  user: string
  host: string
  port: number
  rootPath: string
}
