import type { PaneId } from '../../entities/file/types'

export type PaneTerminalProps = {
  paneId: PaneId
  cwd: string
  height: number
}

export type TermPayload = { paneId?: string; data?: string; code?: number }
