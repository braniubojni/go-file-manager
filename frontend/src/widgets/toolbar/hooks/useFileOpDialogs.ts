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
import { errMessage } from '../../../shared/lib/format'
import { useSnack } from '../../../shared/ui/SnackbarHost'
import { isPermissionError } from '../helpers'
import type { FileOpDialogsArgs } from '../types'

export const useFileOpDialogs = ({
  activePath,
  realSelection,
  destPath,
  clearSelection,
}: FileOpDialogsArgs) => {
  const ops = useFileOps()
  const show = useSnack((s) => s.show)
  const [mkdir, dispatchMkdir] = useReducer(nameDialogReducer, initialNameDialogState)
  const [mkfile, dispatchMkfile] = useReducer(nameDialogReducer, initialNameDialogState)
  const [rename, dispatchRename] = useReducer(nameDialogReducer, initialNameDialogState)
  const [del, dispatchDelete] = useReducer(deleteDialogReducer, initialDeleteDialogState)
  const deleteBtnRef = useRef<HTMLButtonElement | null>(null)

  const onOpError = useCallback(
    (e: unknown) => {
      const msg = errMessage(e)
      if (isPermissionError(msg)) {
        dispatchDelete({ type: 'open_permission', message: msg })
      } else {
        show(msg, 'error')
      }
    },
    [show],
  )

  const onOpSuccess = useCallback(
    (label: string) => {
      show(`${label} completed`, 'success')
      clearSelection()
    },
    [show, clearSelection],
  )

  const onCopy = () => {
    if (!realSelection.length) return show('Select files to copy', 'warning')
    ops.copy.mutate(
      { sources: realSelection, destDir: destPath },
      { onSuccess: () => onOpSuccess('Copy'), onError: onOpError },
    )
  }

  const onMove = () => {
    if (!realSelection.length) return show('Select files to move', 'warning')
    ops.move.mutate(
      { sources: realSelection, destDir: destPath },
      { onSuccess: () => onOpSuccess('Move'), onError: onOpError },
    )
  }

  const onDelete = () => {
    if (!realSelection.length) return show('Select files to delete', 'warning')
    dispatchDelete({ type: 'open_confirm', paths: realSelection })
  }

  const confirmDelete = () => {
    const paths = del.paths.length ? del.paths : realSelection
    dispatchDelete({ type: 'close_confirm' })
    ops.del.mutate(paths, {
      onSuccess: () => onOpSuccess('Delete'),
      onError: onOpError,
    })
  }

  const onMkdir = () => {
    if (activePath.startsWith('ssh://')) {
      return show('Not available on remote connections yet', 'warning')
    }
    dispatchMkdir({ type: 'open', name: 'New Folder' })
  }

  const confirmMkdir = () => {
    const name = mkdir.name.trim()
    dispatchMkdir({ type: 'close' })
    ops.mkdir.mutate(
      { parent: activePath, name },
      { onSuccess: () => onOpSuccess('Create folder'), onError: onOpError },
    )
  }

  const onMkfile = () => {
    if (activePath.startsWith('ssh://')) {
      return show('Not available on remote connections yet', 'warning')
    }
    dispatchMkfile({ type: 'open', name: 'untitled.txt' })
  }

  const confirmMkfile = () => {
    const name = mkfile.name.trim()
    dispatchMkfile({ type: 'close' })
    ops.mkfile.mutate(
      { parent: activePath, name },
      { onSuccess: () => onOpSuccess('Create file'), onError: onOpError },
    )
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
    ops.rename.mutate(
      { oldPath, newName },
      { onSuccess: () => onOpSuccess('Rename'), onError: onOpError },
    )
  }

  const onBookmark = () => {
    ops.addBookmark.mutate(
      { name: '', path: activePath },
      { onSuccess: () => onOpSuccess('Bookmark'), onError: onOpError },
    )
  }

  useEffect(() => {
    if (!del.confirmOpen) return
    const t = window.setTimeout(() => deleteBtnRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [del.confirmOpen])

  return {
    mkdir,
    mkfile,
    rename,
    del,
    deleteBtnRef,
    dispatchMkdir,
    dispatchMkfile,
    dispatchRename,
    dispatchDelete,
    onCopy,
    onMove,
    onDelete,
    onMkdir,
    onMkfile,
    onRename,
    onBookmark,
    confirmMkdir,
    confirmMkfile,
    confirmRename,
    confirmDelete,
  }
}
