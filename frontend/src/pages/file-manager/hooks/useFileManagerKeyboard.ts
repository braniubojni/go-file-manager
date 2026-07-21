import { useEffect } from 'react'
import { usePatchSettings, useSettings, useShortcutDefs } from '../../../entities/file/queries'
import { useEditorStore } from '../../../features/editor/editorStore'
import { useFileOpsStore } from '../../../features/file-ops/fileOpsStore'
import { useGoToStore } from '../../../features/go-to/goToStore'
import { usePaneStore } from '../../../features/pane/paneStore'
import { useTerminalStore } from '../../../features/terminal/terminalStore'
import { useDialogStore } from '../../../features/ui/dialogStore'
import { findMatchingAction, isCtrlBackquote } from '../../../shared/lib/shortcuts'
import { buildShortcutMap, getPaneGrid, isEditableTarget } from '../helpers'

export const useFileManagerKeyboard = () => {
  const setActivePane = usePaneStore((s) => s.setActivePane)
  const goBack = usePaneStore((s) => s.goBack)
  const goForward = usePaneStore((s) => s.goForward)
  const patchSettings = usePatchSettings()
  const { data: settings } = useSettings()
  const { data: shortcutDefs } = useShortcutDefs()
  const openSettings = useDialogStore((s) => s.openSettings)
  const openShortcuts = useDialogStore((s) => s.openShortcuts)
  const trigger = useFileOpsStore((s) => s.trigger)
  const toggleTerminal = useTerminalStore((s) => s.toggleActive)
  const openGoTo = useGoToStore((s) => s.openGoTo)

  useEffect(() => {
    const map = buildShortcutMap(shortcutDefs)

    const onKey = (e: KeyboardEvent) => {
      const editorOpen = useEditorStore.getState().open

      // Go-to: Mod+P — disabled while Monaco workspace is open
      if (!editorOpen && findMatchingAction(e, map) === 'goTo') {
        e.preventDefault()
        const path = usePaneStore.getState().getPath(usePaneStore.getState().activePane)
        if (path.startsWith('ssh://')) return
        openGoTo()
        return
      }

      if (isCtrlBackquote(e) || findMatchingAction(e, map) === 'toggleTerminal') {
        if (editorOpen) return
        if (isCtrlBackquote(e) || map.toggleTerminal) {
          const action = findMatchingAction(e, map)
          if (action === 'toggleTerminal' || isCtrlBackquote(e)) {
            e.preventDefault()
            toggleTerminal(usePaneStore.getState().activePane)
            return
          }
        }
      }

      // While editor open, only allow a few globals (settings/shortcuts)
      if (editorOpen) {
        if (isEditableTarget(e.target)) return
        const action = findMatchingAction(e, map)
        if (action === 'openSettings') {
          e.preventDefault()
          openSettings()
        } else if (action === 'openShortcuts') {
          e.preventDefault()
          openShortcuts()
        }
        return
      }

      if (isEditableTarget(e.target)) return

      if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const pane = usePaneStore.getState().activePane
        const sel = usePaneStore.getState().getSelection(pane)
        if (sel.length > 0) {
          e.preventDefault()
          usePaneStore.getState().clearSelection(pane)
          return
        }
      }

      if (e.key === 'Backspace' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        goBack(usePaneStore.getState().activePane)
        return
      }

      if (e.altKey && !e.metaKey && !e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack(usePaneStore.getState().activePane)
        return
      }
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault()
        goForward(usePaneStore.getState().activePane)
        return
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const pane = usePaneStore.getState().activePane
        const grid = getPaneGrid(pane)

        if (e.key === 'ArrowDown') {
          e.preventDefault()
          grid?.__gfmMoveFocus?.(1, e.shiftKey)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          grid?.__gfmMoveFocus?.(-1, e.shiftKey)
          return
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          goBack(pane)
          return
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          grid?.__gfmOpenDir?.()
          return
        }
        if (e.key === 'Home') {
          e.preventDefault()
          grid?.__gfmFocusHome?.()
          return
        }
        if (e.key === 'End') {
          e.preventDefault()
          grid?.__gfmFocusEnd?.()
          return
        }
        if (e.key === 'Enter') {
          const tag = (e.target as HTMLElement | null)?.tagName
          if (tag !== 'BUTTON' && tag !== 'A') {
            e.preventDefault()
            grid?.__gfmOpenFocused?.()
            return
          }
        }
        if (e.key === ' ' || e.code === 'Space') {
          const tag = (e.target as HTMLElement | null)?.tagName
          if (tag !== 'BUTTON' && tag !== 'A') {
            e.preventDefault()
            grid?.__gfmToggleMulti?.()
            return
          }
        }
      }

      const action = findMatchingAction(e, map)
      if (!action) return
      e.preventDefault()

      switch (action) {
        case 'refresh':
          trigger('refresh')
          break
        case 'switchPane':
          setActivePane(usePaneStore.getState().activePane === 'left' ? 'right' : 'left')
          break
        case 'copy':
          trigger('copy')
          break
        case 'move':
          trigger('move')
          break
        case 'delete':
          trigger('delete')
          break
        case 'rename':
          trigger('rename')
          break
        case 'mkdir':
          trigger('mkdir')
          break
        case 'mkfile':
          trigger('mkfile')
          break
        case 'editFile':
          trigger('editFile')
          break
        case 'goTo':
          openGoTo()
          break
        case 'goParent':
          trigger('goParent')
          break
        case 'goHome':
          trigger('goHome')
          break
        case 'goBack':
          goBack(usePaneStore.getState().activePane)
          break
        case 'goForward':
          goForward(usePaneStore.getState().activePane)
          break
        case 'openSettings':
          openSettings()
          break
        case 'openShortcuts':
          openShortcuts()
          break
        case 'toggleHidden':
          patchSettings.mutate({ showHidden: !settings?.showHidden })
          break
        case 'toggleExtensions':
          patchSettings.mutate({ showExtensions: !settings?.showExtensions })
          break
        case 'toggleTerminal':
          toggleTerminal(usePaneStore.getState().activePane)
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    shortcutDefs,
    setActivePane,
    trigger,
    openSettings,
    openShortcuts,
    patchSettings,
    settings,
    toggleTerminal,
    goBack,
    goForward,
    openGoTo,
  ])
}
