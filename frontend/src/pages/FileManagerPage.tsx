import { Box, CircularProgress } from '@mui/material'
import { Suspense, lazy, useEffect } from 'react'
import {
  useHomeDir,
  usePatchSettings,
  useSavePanePaths,
  useSettings,
  useShortcutDefs,
} from '../entities/file/queries'
import { useFileOpsStore } from '../features/file-ops/fileOpsStore'
import { usePaneStore } from '../features/pane/paneStore'
import { useTerminalStore } from '../features/terminal/terminalStore'
import { useDialogStore } from '../features/ui/dialogStore'
import { FileService } from '../shared/api/bindings'
import { findMatchingAction, isCtrlBackquote } from '../shared/lib/shortcuts'
import { FilePane } from '../widgets/file-pane/FilePane'
import { AppMenuBar } from '../widgets/menu/AppMenuBar'
import { StatusBar } from '../widgets/status-bar/StatusBar'
import { Toolbar } from '../widgets/toolbar/Toolbar'

const SettingsDialog = lazy(() => import('../features/settings/SettingsDialog'))
const ShortcutsDialog = lazy(() => import('../features/shortcuts/ShortcutsDialog'))

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    el.isContentEditable ||
    Boolean(el.closest?.('.xterm')) ||
    Boolean(el.closest?.('[role="dialog"]'))
  )
}

export function FileManagerPage() {
  const ready = usePaneStore((s) => s.ready)
  const setPaths = usePaneStore((s) => s.setPaths)
  const leftPath = usePaneStore((s) => s.leftPath)
  const rightPath = usePaneStore((s) => s.rightPath)
  const setActivePane = usePaneStore((s) => s.setActivePane)
  const goBack = usePaneStore((s) => s.goBack)
  const goForward = usePaneStore((s) => s.goForward)

  const { data: home, isLoading: homeLoading } = useHomeDir()
  const { data: settings, isLoading: settingsLoading } = useSettings()
  const savePaths = useSavePanePaths()
  const patchSettings = usePatchSettings()
  const { data: shortcutDefs } = useShortcutDefs()

  const settingsOpen = useDialogStore((s) => s.settingsOpen)
  const shortcutsOpen = useDialogStore((s) => s.shortcutsOpen)
  const closeSettings = useDialogStore((s) => s.closeSettings)
  const closeShortcuts = useDialogStore((s) => s.closeShortcuts)
  const openSettings = useDialogStore((s) => s.openSettings)
  const openShortcuts = useDialogStore((s) => s.openShortcuts)
  const trigger = useFileOpsStore((s) => s.trigger)
  const toggleTerminal = useTerminalStore((s) => s.toggleActive)

  useEffect(() => {
    if (ready || homeLoading || settingsLoading || !home) return

    const init = async () => {
      let left = settings?.leftPath || home
      let right = settings?.rightPath || home
      try {
        if (left && !(await FileService.Exists(left))) left = home
        if (right && !(await FileService.Exists(right))) right = home
      } catch {
        left = home
        right = home
      }
      setPaths(left, right)
    }
    void init()
  }, [ready, home, settings, homeLoading, settingsLoading, setPaths])

  useEffect(() => {
    if (!ready || !leftPath || !rightPath) return
    const t = setTimeout(() => {
      void savePaths.mutateAsync({ left: leftPath, right: rightPath })
    }, 400)
    return () => clearTimeout(t)
  }, [leftPath, rightPath, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts (incl. Backspace → back)
  useEffect(() => {
    const map: Record<string, string> = {}
    for (const d of shortcutDefs ?? []) map[d.id] = d.binding

    const onKey = (e: KeyboardEvent) => {
      // Terminal toggle works even when focus is in xterm/input
      if (isCtrlBackquote(e) || findMatchingAction(e, map) === 'toggleTerminal') {
        if (isCtrlBackquote(e) || map.toggleTerminal) {
          const action = findMatchingAction(e, map)
          if (action === 'toggleTerminal' || isCtrlBackquote(e)) {
            e.preventDefault()
            toggleTerminal(usePaneStore.getState().activePane)
            return
          }
        }
      }

      if (isEditableTarget(e.target)) {
        return
      }

      // Backspace → history back (when not typing)
      if (e.key === 'Backspace' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        goBack(usePaneStore.getState().activePane)
        return
      }

      // Alt+Left / Alt+Right also map to history (browser-like)
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

      // Pane keyboard nav works even when focus is on toolbar/status (logical active pane)
      // Shift+↑/↓ extend multi-select; plain arrows only move focus
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const pane = usePaneStore.getState().activePane
        const grid = document.querySelector(
          `[data-pane-grid="${pane}"]`,
        ) as (HTMLElement & {
          __gfmMoveFocus?: (d: number, extend?: boolean) => void
          __gfmOpenFocused?: () => void
          __gfmOpenDir?: () => void
          __gfmToggleMulti?: () => void
          __gfmFocusHome?: () => void
          __gfmFocusEnd?: () => void
        }) | null

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
          // Don't steal Enter from buttons/dialogs (already guarded); open focused entry
          const tag = (e.target as HTMLElement | null)?.tagName
          if (tag === 'BUTTON' || tag === 'A') {
            /* let button work */
          } else {
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
          void patchSettings({ showHidden: !settings?.showHidden })
          break
        case 'toggleExtensions':
          void patchSettings({ showExtensions: !settings?.showExtensions })
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
  ])

  // Mouse back/forward buttons (button 3 / 4)
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      // 3 = browser Back, 4 = browser Forward
      if (e.button !== 3 && e.button !== 4) return
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      const pane = usePaneStore.getState().activePane
      if (e.button === 3) goBack(pane)
      else goForward(pane)
    }
    // mousedown captures side buttons more reliably than click
    window.addEventListener('mousedown', onMouse)
    // Some environments only fire auxclick
    window.addEventListener('auxclick', onMouse)
    return () => {
      window.removeEventListener('mousedown', onMouse)
      window.removeEventListener('auxclick', onMouse)
    }
  }, [goBack, goForward])

  if (!ready) {
    return (
      <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      data-testid="app-ready"
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <AppMenuBar
        onNewFolder={() => trigger('mkdir')}
        onRename={() => trigger('rename')}
        onDelete={() => trigger('delete')}
      />
      <Toolbar />
      <Box sx={{ flex: 1, display: 'flex', gap: 1, p: 1, minHeight: 0 }}>
        <FilePane id="left" />
        <FilePane id="right" />
      </Box>
      <StatusBar />

      <Suspense fallback={null}>
        {settingsOpen && <SettingsDialog open={settingsOpen} onClose={closeSettings} />}
        {shortcutsOpen && <ShortcutsDialog open={shortcutsOpen} onClose={closeShortcuts} />}
      </Suspense>
    </Box>
  )
}
