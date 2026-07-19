import CheckIcon from '@mui/icons-material/Check'
import {
  AppBar,
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type MouseEvent } from 'react'
import { usePatchSettings, useSettings } from '../../entities/file/queries'
import { useDialogStore } from '../../features/ui/dialogStore'
import { errMessage } from '../../shared/lib/format'
import { useSnack } from '../../shared/ui/SnackbarHost'

interface Props {
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
}

export function AppMenuBar({ onNewFolder, onRename, onDelete }: Props) {
  const { data: settings } = useSettings()
  const patch = usePatchSettings()
  const show = useSnack((s) => s.show)
  const openSettings = useDialogStore((s) => s.openSettings)
  const openShortcuts = useDialogStore((s) => s.openShortcuts)
  const qc = useQueryClient()

  const [fileAnchor, setFileAnchor] = useState<null | HTMLElement>(null)
  const [viewAnchor, setViewAnchor] = useState<null | HTMLElement>(null)

  const closeAll = () => {
    setFileAnchor(null)
    setViewAnchor(null)
  }

  const toggle = async (key: 'showHidden' | 'showExtensions') => {
    try {
      await patch({ [key]: !settings?.[key] })
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['dir'] })
    closeAll()
  }

  const openMenu =
    (setter: (el: HTMLElement | null) => void) => (e: MouseEvent<HTMLElement>) => {
      setter(e.currentTarget)
    }

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar variant="dense" sx={{ minHeight: 36, gap: 0.5, px: 1 }}>
        <Button data-testid="menu-file" size="small" onClick={openMenu(setFileAnchor)}>
          File
        </Button>
        <Menu anchorEl={fileAnchor} open={Boolean(fileAnchor)} onClose={closeAll}>
          <MenuItem
            data-testid="menu-file-mkdir"
            onClick={() => {
              closeAll()
              onNewFolder()
            }}
          >
            New folder
          </MenuItem>
          <MenuItem
            data-testid="menu-file-rename"
            onClick={() => {
              closeAll()
              onRename()
            }}
          >
            Rename
          </MenuItem>
          <MenuItem
            data-testid="menu-file-delete"
            onClick={() => {
              closeAll()
              onDelete()
            }}
          >
            Delete
          </MenuItem>
          <Divider />
          <MenuItem
            data-testid="menu-file-settings"
            onClick={() => {
              closeAll()
              openSettings()
            }}
          >
            Settings…
          </MenuItem>
          <MenuItem
            data-testid="menu-file-shortcuts"
            onClick={() => {
              closeAll()
              openShortcuts()
            }}
          >
            Keyboard shortcuts…
          </MenuItem>
        </Menu>

        <Button data-testid="menu-view" size="small" onClick={openMenu(setViewAnchor)}>
          View
        </Button>
        <Menu anchorEl={viewAnchor} open={Boolean(viewAnchor)} onClose={closeAll}>
          <MenuItem
            data-testid="menu-view-hidden"
            onClick={() => {
              void toggle('showHidden')
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              {settings?.showHidden ? <CheckIcon fontSize="small" /> : <Box sx={{ width: 18 }} />}
            </ListItemIcon>
            <ListItemText>Show hidden files</ListItemText>
          </MenuItem>
          <MenuItem
            data-testid="menu-view-extensions"
            onClick={() => {
              void toggle('showExtensions')
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              {settings?.showExtensions ? <CheckIcon fontSize="small" /> : <Box sx={{ width: 18 }} />}
            </ListItemIcon>
            <ListItemText>Show file extensions</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem data-testid="menu-view-refresh" onClick={refresh}>
            Refresh
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
