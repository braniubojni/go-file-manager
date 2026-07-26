import { useQueryClient } from '@tanstack/react-query'
import { useDirListing, useHomeDir, useSettings } from '../../../entities/file/queries'
import type { FileEntry, PaneId } from '../../../entities/file/types'
import { parentDirOf, useEditorStore } from '../../../features/editor/editorStore'
import { useFolderSizeStore } from '../../../features/folder-size/folderSizeStore'
import { newJobId, usePaneJobStore } from '../../../features/jobs/paneJobStore'
import { usePaneStore } from '../../../features/pane/paneStore'
import { useTerminalStore } from '../../../features/terminal/terminalStore'
import { FileService } from '../../../shared/api/bindings'
import { errMessage } from '../../../shared/lib/format'
import { useSnack } from '../../../shared/ui/SnackbarHost'
import { allSameParentAsDest, isNestedInSelf, mapChildSizes, parentOfPath } from '../helpers'

export const useFilePane = (id: PaneId) => {
  const path = usePaneStore((s) => (id === 'left' ? s.leftPath : s.rightPath))
  const selection = usePaneStore((s) => (id === 'left' ? s.leftSelection : s.rightSelection))
  const focused = usePaneStore((s) => (id === 'left' ? s.leftFocus : s.rightFocus))
  const active = usePaneStore((s) => s.activePane === id)
  const navigateStore = usePaneStore((s) => s.navigate)
  const setActivePane = usePaneStore((s) => s.setActivePane)
  const setSelection = usePaneStore((s) => s.setSelection)
  const setFocus = usePaneStore((s) => s.setFocus)
  const toggleMultiSelect = usePaneStore((s) => s.toggleMultiSelect)
  const selectRange = usePaneStore((s) => s.selectRange)
  const clearSelection = usePaneStore((s) => s.clearSelection)
  const { data: home } = useHomeDir()
  const { data: settings } = useSettings()
  const showHidden = settings?.showHidden ?? false
  const showExtensions = settings?.showExtensions ?? true
  const listing = useDirListing(path || undefined, showHidden)
  const show = useSnack((s) => s.show)
  const qc = useQueryClient()

  const terminalOpen = useTerminalStore((s) => s.isOpen(id))
  const terminalHeight = useTerminalStore((s) => s.height)
  const toggleTerminal = useTerminalStore((s) => s.toggle)

  const folderSizes = useFolderSizeStore((s) => s.getSizes(id))
  const clearSizes = useFolderSizeStore((s) => s.clear)
  const beginSizes = useFolderSizeStore((s) => s.begin)
  const finishSizes = useFolderSizeStore((s) => s.finish)
  const failSizes = useFolderSizeStore((s) => s.fail)

  const job = usePaneJobStore((s) => s.getJob(id))
  const startJob = usePaneJobStore((s) => s.start)
  const finishJob = usePaneJobStore((s) => s.finish)
  const clearJob = usePaneJobStore((s) => s.clear)

  const navigate = (next: string) => {
    void FileService.Exists(next)
      .then((ok) => {
        if (!ok) {
          show(`Path not found: ${next}`, 'error')
          return
        }
        clearSizes(id)
        if (next.startsWith('ssh://') && terminalOpen) {
          toggleTerminal(id)
        }
        navigateStore(id, next)
      })
      .catch((e) => show(errMessage(e), 'error'))
  }

  const goUp = () => {
    if (!path) return
    navigate(parentOfPath(path))
  }

  const goHome = () => {
    if (home) navigate(home)
  }

  const openWorkspace = useEditorStore((s) => s.openWorkspace)

  const openEntry = (entry: FileEntry) => {
    if (entry.isDir) {
      navigate(entry.path)
      return
    }
    if (entry.path.startsWith('ssh://')) {
      show('Built-in editor is not available on remote connections yet', 'warning')
      return
    }
    if (settings?.useBuiltInEditor !== false) {
      openWorkspace(parentDirOf(entry.path), entry.path)
      return
    }
    void FileService.Open(entry.path).catch((e) => show(errMessage(e), 'error'))
  }

  const onDropPaths = (
    paths: string[],
    destDir: string,
    sourcePane: PaneId,
    mode: 'copy' | 'move',
  ) => {
    const dest = destDir || path
    if (!dest || !paths.length) return
    if (isNestedInSelf(paths, dest)) {
      show(`Cannot ${mode} a folder into itself`, 'warning')
      return
    }
    // Move into same folder is a no-op; copy may create "name (1)" duplicates.
    if (mode === 'move' && allSameParentAsDest(paths, dest) && sourcePane === id) return
    const op = mode === 'move' ? FileService.Move : FileService.Copy
    const verb = mode === 'move' ? 'Moved' : 'Copied'
    void op(paths, dest)
      .then(() => {
        show(`${verb} ${paths.length} item(s)`, 'success')
        clearSelection()
        void qc.invalidateQueries({ queryKey: ['dir'] })
      })
      .catch((e) => show(errMessage(e), 'error'))
  }

  const cancelJob = () => {
    if (!job) return
    if (job.backendJobId) {
      void FileService.CancelJob(job.backendJobId).catch(() => undefined)
    }
    clearJob(id, job.id)
    show('Cancelled', 'info')
  }

  const onCalcSizes = () => {
    if (!path) return
    setActivePane(id)
    const gen = beginSizes(id)
    const uiJobId = newJobId('sizes')
    void FileService.NewJobID()
      .catch(() => '')
      .then((backendJobId) => {
        startJob(id, {
          id: uiJobId,
          kind: 'sizes',
          label: 'Calculating folder sizes…',
          cancelable: true,
          backendJobId: backendJobId || undefined,
        })
        return FileService.DirChildSizes(backendJobId || '', path)
          .then((map) => {
            finishSizes(id, gen, mapChildSizes(map))
            finishJob(id, uiJobId)
            show('Folder sizes calculated', 'success')
          })
          .catch((e) => {
            failSizes(id, gen)
            finishJob(id, uiJobId)
            const msg = errMessage(e)
            if (msg.toLowerCase().includes('cancel') || msg.includes('context canceled')) {
              show('Cancelled', 'info')
              return
            }
            show(msg, 'error')
          })
      })
  }

  const activatePane = () => setActivePane(id)

  return {
    path,
    selection,
    focused,
    active,
    showExtensions,
    listing,
    terminalOpen,
    terminalHeight,
    folderSizes,
    job,
    navigate,
    goUp,
    goHome,
    openEntry,
    onDropPaths,
    cancelJob,
    onCalcSizes,
    activatePane,
    setSelection,
    setFocus,
    toggleMultiSelect,
    selectRange,
    setActivePane,
    toggleTerminal,
  }
}
