import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSetTheme, useSettings } from '../../../entities/file/queries'
import type { ThemePreference } from '../../../entities/file/types'
import { parentDirOf, useEditorStore } from '../../../features/editor/editorStore'
import { useGoToStore } from '../../../features/go-to/goToStore'
import { usePaneStore } from '../../../features/pane/paneStore'
import { useDialogStore } from '../../../features/ui/dialogStore'
import { FileService } from '../../../shared/api/bindings'
import { errMessage } from '../../../shared/lib/format'
import { useSnack } from '../../../shared/ui/SnackbarHost'
import {
  createToolbarRequestHandlers,
  parentPath,
  resolveActionPaths,
  triggerCalcSizes,
} from '../helpers'
import { useArchiveExtract } from './useArchiveExtract'
import { useFileOpDialogs } from './useFileOpDialogs'
import { useFileOpsRequest } from './useFileOpsRequest'

export const useToolbarActions = () => {
  const activePane = usePaneStore((s) => s.activePane)
  const leftPath = usePaneStore((s) => s.leftPath)
  const rightPath = usePaneStore((s) => s.rightPath)
  const leftSelection = usePaneStore((s) => s.leftSelection)
  const rightSelection = usePaneStore((s) => s.rightSelection)
  const leftFocus = usePaneStore((s) => s.leftFocus)
  const rightFocus = usePaneStore((s) => s.rightFocus)
  const navigateStore = usePaneStore((s) => s.navigate)
  const goBack = usePaneStore((s) => s.goBack)
  const goForward = usePaneStore((s) => s.goForward)
  const leftBack = usePaneStore((s) => s.leftBack)
  const leftForward = usePaneStore((s) => s.leftForward)
  const rightBack = usePaneStore((s) => s.rightBack)
  const rightForward = usePaneStore((s) => s.rightForward)
  const clearSelection = usePaneStore((s) => s.clearSelection)
  const otherPane = usePaneStore((s) => s.otherPane)
  const openSettings = useDialogStore((s) => s.openSettings)
  const openWorkspace = useEditorStore((s) => s.openWorkspace)
  const openGoTo = useGoToStore((s) => s.openGoTo)
  const editorOpen = useEditorStore((s) => s.open)

  const canBack = activePane === 'left' ? leftBack.length > 0 : rightBack.length > 0
  const canForward = activePane === 'left' ? leftForward.length > 0 : rightForward.length > 0

  const { data: settings } = useSettings()
  const setTheme = useSetTheme()
  const show = useSnack((s) => s.show)
  const qc = useQueryClient()

  const activePath = activePane === 'left' ? leftPath : rightPath
  const destPath = activePane === 'left' ? rightPath : leftPath
  const realSelection = useMemo(
    () =>
      resolveActionPaths(
        activePane === 'left' ? leftSelection : rightSelection,
        activePane === 'left' ? leftFocus : rightFocus,
      ),
    [activePane, leftSelection, rightSelection, leftFocus, rightFocus],
  )

  const theme = settings?.theme ?? 'system'
  const cycleTheme = () => {
    const order: ThemePreference[] = ['system', 'dark', 'light']
    setTheme.mutate(order[(order.indexOf(theme) + 1) % order.length], {
      onError: (e) => show(errMessage(e), 'error'),
    })
  }
  const refreshAll = () => void qc.invalidateQueries({ queryKey: ['dir'] })

  const fileOps = useFileOpDialogs({ activePath, realSelection, destPath, clearSelection })
  const archiveOps = useArchiveExtract({ activePane, activePath, realSelection, clearSelection })

  const goParent = async () => {
    if (!activePath) return
    try {
      const next = parentPath(activePath)
      if (await FileService.Exists(next)) navigateStore(activePane, next)
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const goHome = async () => {
    try {
      navigateStore(activePane, await FileService.GetHomeDir())
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const onEditFile = () => {
    if (realSelection.length !== 1) {
      show('Select exactly one file to edit', 'warning')
      return
    }
    const path = realSelection[0]
    if (path.startsWith('ssh://')) {
      show('Built-in editor is not available on remote connections yet', 'warning')
      return
    }
    if (settings?.useBuiltInEditor === false) {
      void FileService.Open(path).catch((e) => show(errMessage(e), 'error'))
      return
    }
    openWorkspace(parentDirOf(path), path)
  }

  const onGoTo = () => {
    if (editorOpen) return
    if (activePath.startsWith('ssh://')) {
      show('Go-to is not available on remote connections yet', 'warning')
      return
    }
    openGoTo()
  }

  useFileOpsRequest(
    createToolbarRequestHandlers({
      copy: fileOps.onCopy,
      move: fileOps.onMove,
      delete: fileOps.onDelete,
      rename: fileOps.onRename,
      mkdir: fileOps.onMkdir,
      mkfile: fileOps.onMkfile,
      editFile: onEditFile,
      goTo: onGoTo,
      refresh: refreshAll,
      goParent: () => void goParent(),
      goHome: () => void goHome(),
      goBack: () => goBack(activePane),
      goForward: () => goForward(activePane),
      calcSizes: () => triggerCalcSizes(activePane),
      archive: () => void archiveOps.openArchiveDialog(),
      extract: archiveOps.openExtractDialog,
    }),
  )

  return {
    activePane,
    activePath,
    canBack,
    canForward,
    theme,
    realSelection,
    goBack,
    goForward,
    otherPane,
    openSettings,
    cycleTheme,
    refreshAll,
    onEditFile,
    onGoTo,
    ...fileOps,
    ...archiveOps,
  }
}
