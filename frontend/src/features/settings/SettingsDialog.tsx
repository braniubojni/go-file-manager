import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useSaveSettings, useSettings } from '../../entities/file/queries'
import type { AppSettings, ThemePreference } from '../../entities/file/types'
import { SettingsService } from '../../shared/api/bindings'
import { errMessage } from '../../shared/lib/format'
import { useSnack } from '../../shared/ui/SnackbarHost'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsDialog({ open, onClose }: Props) {
  const { data } = useSettings()
  const save = useSaveSettings()
  const show = useSnack((s) => s.show)
  const [draft, setDraft] = useState<AppSettings | null>(null)

  useEffect(() => {
    if (open && data) setDraft({ ...data })
  }, [open, data])

  if (!draft) return null

  const onSave = async () => {
    try {
      await save.mutateAsync(draft)
      show('Settings saved', 'success')
      onClose()
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const reveal = async () => {
    try {
      const p = await SettingsService.GetSettingsPath()
      await SettingsService.RevealInOS(p)
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const openFile = async () => {
    try {
      const p = await SettingsService.GetSettingsPath()
      await SettingsService.OpenInOS(p)
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Tooltip title="Color scheme. System follows the OS appearance.">
            <FormControl fullWidth size="small">
              <InputLabel id="theme-label">Theme</InputLabel>
              <Select
                labelId="theme-label"
                label="Theme"
                value={draft.theme}
                onChange={(e) =>
                  setDraft({ ...draft, theme: e.target.value as ThemePreference })
                }
              >
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="light">Light</MenuItem>
              </Select>
            </FormControl>
          </Tooltip>

          <Tooltip title="When enabled, files and folders whose names start with a dot are shown.">
            <FormControlLabel
              control={
                <Switch
                  checked={draft.showHidden}
                  onChange={(_, v) => setDraft({ ...draft, showHidden: v })}
                />
              }
              label="Show hidden files"
            />
          </Tooltip>

          <Tooltip title="When enabled, file extensions are shown in the Name column.">
            <FormControlLabel
              control={
                <Switch
                  checked={draft.showExtensions}
                  onChange={(_, v) => setDraft({ ...draft, showExtensions: v })}
                />
              }
              label="Show file extensions"
            />
          </Tooltip>

          <Typography variant="caption" color="text.secondary">
            Pane paths are saved automatically when you navigate. Bookmarks use SQLite separately.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button startIcon={<FolderOpenIcon />} onClick={() => void reveal()}>
          Reveal file
        </Button>
        <Button startIcon={<OpenInNewIcon />} onClick={() => void openFile()}>
          Open file
        </Button>
        <span style={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void onSave()} disabled={save.isPending}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
