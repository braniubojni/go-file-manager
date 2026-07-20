import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { Suspense, lazy, type FC } from 'react'
import { useFileOpsStore } from '../../features/file-ops/fileOpsStore'
import { useDialogStore } from '../../features/ui/dialogStore'
import { FilePane } from '../../widgets/file-pane/FilePane'
import { AppMenuBar } from '../../widgets/menu/AppMenuBar'
import { StatusBar } from '../../widgets/status-bar/StatusBar'
import { Toolbar } from '../../widgets/toolbar/Toolbar'
import { useFileManagerKeyboard } from './hooks/useFileManagerKeyboard'
import { useInitPanePaths } from './hooks/useInitPanePaths'
import { useMouseNavButtons } from './hooks/useMouseNavButtons'
import { usePersistPanePaths } from './hooks/usePersistPanePaths'
import { loadingSx, pageRootSx, panesRowSx } from './styles'

const SettingsDialog = lazy(() => import('../../features/settings/SettingsDialog'))
const ShortcutsDialog = lazy(() => import('../../features/shortcuts/ShortcutsDialog'))

export const FileManagerPage: FC = () => {
  const ready = useInitPanePaths()
  usePersistPanePaths(ready)
  useFileManagerKeyboard()
  useMouseNavButtons()

  const settingsOpen = useDialogStore((s) => s.settingsOpen)
  const shortcutsOpen = useDialogStore((s) => s.shortcutsOpen)
  const closeSettings = useDialogStore((s) => s.closeSettings)
  const closeShortcuts = useDialogStore((s) => s.closeShortcuts)
  const trigger = useFileOpsStore((s) => s.trigger)

  if (!ready) {
    return (
      <Box sx={loadingSx}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box data-testid="app-ready" sx={pageRootSx}>
      <AppMenuBar
        onNewFolder={() => trigger('mkdir')}
        onRename={() => trigger('rename')}
        onDelete={() => trigger('delete')}
      />
      <Toolbar />
      <Box sx={panesRowSx}>
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
