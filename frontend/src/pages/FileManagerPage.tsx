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
import { useDialogStore } from '../features/ui/dialogStore'
import { FileService } from '../shared/api/bindings'
import { findMatchingAction } from '../shared/lib/shortcuts'
import { FilePane } from '../widgets/file-pane/FilePane'
import { AppMenuBar } from '../widgets/menu/AppMenuBar'
import { StatusBar } from '../widgets/status-bar/StatusBar'
import { Toolbar } from '../widgets/toolbar/Toolbar'

const SettingsDialog = lazy(() => import('../features/settings/SettingsDialog'))
const ShortcutsDialog = lazy(() => import('../features/shortcuts/ShortcutsDialog'))

export function FileManagerPage() {
  const ready = usePaneStore((s) => s.ready)
  const setPaths = usePaneStore((s) => s.setPaths)
  const leftPath = usePaneStore((s) => s.leftPath)
  const rightPath = usePaneStore((s) => s.rightPath)
  const setActivePane = usePaneStore((s) => s.setActivePane)

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

  useEffect(() => {
    const map: Record<string, string> = {}
    for (const d of shortcutDefs ?? []) map[d.id] = d.binding

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        // still allow F5 etc. only outside inputs for most; skip all when typing
        return
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
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcutDefs, setActivePane, trigger, openSettings, openShortcuts, patchSettings, settings])

  if (!ready) {
    return (
      <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
