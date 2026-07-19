import type { Dispatch, RefObject } from 'react'
import type { PaneId, ThemePreference } from '../../entities/file/types'
import type { ArchiveAction, ArchiveState, ExtractAction, ExtractState } from '../../features/archive/types'
import type { AddConnectionAction, AddConnectionState } from '../../features/connections/types'
import type {
  DeleteDialogAction,
  DeleteDialogState,
  FileOpsAction,
  NameDialogAction,
  NameDialogState,
} from '../../features/file-ops/types'
import type { PaneJobKind } from '../../features/jobs/types'

/** Snackbar show callback used by toolbar helpers. */
export type SnackShow = (msg: string, severity?: 'success' | 'error' | 'info' | 'warning') => void

/** One handler per file-ops store action (shortcuts, menu triggers). */
export type ToolbarRequestHandlers = Record<FileOpsAction, () => void>

export type ToolbarBarProps = {
  activePane: PaneId
  canBack: boolean
  canForward: boolean
  theme: ThemePreference
  otherPaneLabel: PaneId
  onBack: () => void
  onForward: () => void
  onCopy: () => void
  onMove: () => void
  onMkdir: () => void
  onRename: () => void
  onDelete: () => void
  onArchive: () => void
  onExtract: () => void
  onBookmark: () => void
  onRefresh: () => void
  onCycleTheme: () => void
  onSettings: () => void
}

export type BookmarksSelectProps = {
  activePane: PaneId
}

export type NameDialogProps = {
  testId: string
  title: string
  label: string
  inputTestId: string
  confirmTestId: string
  confirmLabel: string
  state: NameDialogState
  dispatch: Dispatch<NameDialogAction>
  onConfirm: () => void
}

export type DeleteDialogsProps = {
  del: DeleteDialogState
  dispatch: Dispatch<DeleteDialogAction>
  paths: string[]
  deleteBtnRef: RefObject<HTMLButtonElement | null>
  onConfirm: () => void
}

export type ArchiveDialogProps = {
  archive: ArchiveState
  dispatch: Dispatch<ArchiveAction>
  selectionCount: number
  activePath: string
  onConfirm: () => void
}

export type ExtractDialogProps = {
  extract: ExtractState
  dispatch: Dispatch<ExtractAction>
  selectionCount: number
  onConfirm: () => void
}

export type ConnectionDialogProps = {
  dialog: AddConnectionState
  dispatch: Dispatch<AddConnectionAction>
  onSubmit: () => void
}

export type FileOpDialogsArgs = {
  activePath: string
  realSelection: string[]
  destPath: string
  clearSelection: () => void
}

export type ArchiveExtractArgs = {
  activePane: PaneId
  activePath: string
  realSelection: string[]
  clearSelection: () => void
}

export type RunPaneJobOptions = {
  pane: PaneId
  kind: PaneJobKind
  label: string
  show: SnackShow
  work: (backendJobId: string) => Promise<void>
  onSuccess: () => void
  finishBackendJob?: boolean
}
