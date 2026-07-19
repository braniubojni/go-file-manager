import ArchiveIcon from '@mui/icons-material/Archive'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import DeleteIcon from '@mui/icons-material/Delete'
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import LightModeIcon from '@mui/icons-material/LightMode'
import RefreshIcon from '@mui/icons-material/Refresh'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import SettingsIcon from '@mui/icons-material/Settings'
import UnarchiveIcon from '@mui/icons-material/Unarchive'
import { AppBar, Box, Button, Divider, IconButton, Toolbar as MuiToolbar, Tooltip } from '@mui/material'
import type { ThemePreference } from '../../../entities/file/types'
import type { ToolbarBarProps } from '../types'
import { BookmarksSelect } from './BookmarksSelect'
import { ConnectionsMenu } from './ConnectionsMenu'

export type { ToolbarBarProps } from '../types'

function themeIcon(theme: ThemePreference) {
  if (theme === 'system') return <SettingsBrightnessIcon />
  if (theme === 'dark') return <DarkModeIcon />
  return <LightModeIcon />
}

export function ToolbarBar(p: ToolbarBarProps) {
  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <MuiToolbar variant="dense" sx={{ gap: 0.5, minHeight: 48 }}>
        <Tooltip title="Back (Backspace)">
          <span>
            <IconButton data-testid="btn-back" disabled={!p.canBack} onClick={p.onBack}>
              <ArrowBackIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Forward">
          <span>
            <IconButton data-testid="btn-forward" disabled={!p.canForward} onClick={p.onForward}>
              <ArrowForwardIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title={`Copy to ${p.otherPaneLabel} pane`}>
          <Button data-testid="btn-copy" startIcon={<ContentCopyIcon />} onClick={p.onCopy}>
            Copy
          </Button>
        </Tooltip>
        <Tooltip title={`Move to ${p.otherPaneLabel} pane`}>
          <Button data-testid="btn-move" startIcon={<DriveFileMoveIcon />} onClick={p.onMove}>
            Move
          </Button>
        </Tooltip>
        <Button data-testid="btn-mkdir" startIcon={<CreateNewFolderIcon />} onClick={p.onMkdir}>
          New folder
        </Button>
        <Button data-testid="btn-rename" startIcon={<DriveFileRenameOutlineIcon />} onClick={p.onRename}>
          Rename
        </Button>
        <Button data-testid="btn-delete" color="error" startIcon={<DeleteIcon />} onClick={p.onDelete}>
          Delete
        </Button>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title="Create archive from selection">
          <IconButton data-testid="btn-archive" onClick={p.onArchive}>
            <ArchiveIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Extract selected archive(s)">
          <IconButton data-testid="btn-extract" onClick={p.onExtract}>
            <UnarchiveIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <ConnectionsMenu />

        <Tooltip title="Bookmark current path">
          <IconButton data-testid="btn-bookmark" onClick={p.onBookmark}>
            <BookmarkAddIcon />
          </IconButton>
        </Tooltip>
        <BookmarksSelect activePane={p.activePane} />
        <Box sx={{ flex: 1 }} />

        <Tooltip title="Refresh both panes (F5)">
          <IconButton data-testid="btn-refresh" onClick={p.onRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={`Theme: ${p.theme} (click to cycle)`}>
          <IconButton data-testid="btn-theme" onClick={p.onCycleTheme}>
            {themeIcon(p.theme)}
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton data-testid="btn-settings" onClick={p.onSettings}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </MuiToolbar>
    </AppBar>
  )
}
