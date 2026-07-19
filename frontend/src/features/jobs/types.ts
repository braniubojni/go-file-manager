import type { PaneId } from '../../entities/file/types'

export type PaneJobKind = 'archive' | 'extract' | 'sizes' | 'copy' | 'move' | 'other'

export type PaneJob = {
  id: string
  kind: PaneJobKind
  label: string
  cancelable: boolean
  /** Backend job id for CancelJob when set */
  backendJobId?: string
}

export type PaneJobState = {
  left: PaneJob | null
  right: PaneJob | null
  getJob: (id: PaneId) => PaneJob | null
  start: (pane: PaneId, job: PaneJob) => void
  clear: (pane: PaneId, jobId?: string) => void
  /** Clears only if the job id still matches (ignore stale completions). */
  finish: (pane: PaneId, jobId: string) => void
}
