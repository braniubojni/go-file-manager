import { useCallback, useEffect, useReducer, useRef } from 'react'
import { useFileOps } from '../../../entities/file/queries'
import {
  deleteDialogReducer,
  initialDeleteDialogState,
} from '../../../features/file-ops/deleteDialogReducer'
import {
  initialNameDialogState,
  nameDialogReducer,
} from '../../../features/file-ops/nameDialogReducer'
import { useSnack } from '../../../shared/ui/SnackbarHost'
import { errMessage } from '../../../shared/lib/format'
import { isPermissionError } from '../helpers'
import type { FileOpDialogsArgs } from '../types'

export function useFileOpDialogs({
  activePath,
  realSelection,
  destPath,
  clearSelection,
}: FileOpDialogsArgs) {
  const ops = useFileOps()
  const show = useSnack((s) => s.show)
  const [mkdir, dispatchMkdir] = useReducer(nameDialogReducer, initialNameDialogState)
  const [rename, dispatchRename] = useReducer(nameDialogReducer, initialNameDialogState)
  const [del, dispatchDelete] = useReducer(deleteDialogReducer, initialDeleteDialogState)
  const deleteBtnRef = useRef<HTMLButtonElement | null>(null)

  const run = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      try {
        await fn()
        show(`${label} completed`, 'success')
        clearSelection()
      } catch (e) {
        const msg = errMessage(e)
        if (isPermissionError(msg)) {
          dispatchDelete({ type: 'open_permission', message: msg })
        } else {
          show(msg, 'error')
        }
      }
    },
    [show, clearSelection],
  )

  const onCopy = () => {
    if (!realSelection.length) return show('Select files to copy', 'warning')
    void run('Copy', () => ops.copy.mutateAsync({ sources: realSelection, destDir: destPath }))
  }

  const onMove = () => {
    if (!realSelection.length) return show('Select files to move', 'warning')
    void run('Move', () => ops.move.mutateAsync({ sources: realSelection, destDir: destPath }))
  }

  const onDelete = () => {
    if (!realSelection.length) return show('Select files to delete', 'warning')
    dispatchDelete({ type: 'open_confirm', paths: realSelection })
  }

  const confirmDelete = () => {
    const paths = del.paths.length ? del.paths : realSelection
    dispatchDelete({ type: 'close_confirm' })
    void run('Delete', () => ops.del.mutateAsync(paths))
  }

  const onMkdir = () => dispatchMkdir({ type: 'open', name: 'New Folder' })

  const confirmMkdir = () => {
    const name = mkdir.name.trim()
    dispatchMkdir({ type: 'close' })
    void run('Create folder', () => ops.mkdir.mutateAsync({ parent: activePath, name }))
  }

  const onRename = () => {
    if (realSelection.length !== 1) return show('Select exactly one item to rename', 'warning')
    const base = realSelection[0].split(/[/\\]/).pop() || ''
    dispatchRename({ type: 'open', name: base })
  }

  const confirmRename = () => {
    const newName = rename.name.trim()
    const oldPath = realSelection[0]
    dispatchRename({ type: 'close' })
    void run('Rename', () => ops.rename.mutateAsync({ oldPath, newName }))
  }

  const onBookmark = () => {
    void run('Bookmark', () => ops.addBookmark.mutateAsync({ name: '', path: activePath }))
  }

  useEffect(() => {
    if (!del.confirmOpen) return
    const t = window.setTimeout(() => deleteBtnRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [del.confirmOpen])

  return {
    mkdir,
    rename,
    del,
    deleteBtnRef,
    dispatchMkdir,
    dispatchRename,
    dispatchDelete,
    onCopy,
    onMove,
    onDelete,
    onMkdir,
    onRename,
    onBookmark,
    confirmMkdir,
    confirmRename,
    confirmDelete,
  }
}
