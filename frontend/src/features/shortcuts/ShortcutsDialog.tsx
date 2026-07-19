import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useSaveShortcuts, useShortcutDefs } from '../../entities/file/queries'
import { SettingsService } from '../../shared/api/bindings'
import { errMessage } from '../../shared/lib/format'
import { useSnack } from '../../shared/ui/SnackbarHost'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ShortcutsDialog({ open, onClose }: Props) {
  const { data } = useShortcutDefs()
  const save = useSaveShortcuts()
  const show = useSnack((s) => s.show)
  const [bindings, setBindings] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && data) {
      const map: Record<string, string> = {}
      for (const d of data) map[d.id] = d.binding
      setBindings(map)
    }
  }, [open, data])

  const onSave = async () => {
    try {
      await save.mutateAsync(bindings)
      show('Shortcuts saved', 'success')
      onClose()
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const reveal = async () => {
    try {
      const p = await SettingsService.GetShortcutsPath()
      await SettingsService.RevealInOS(p)
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const openFile = async () => {
    try {
      const p = await SettingsService.GetShortcutsPath()
      await SettingsService.OpenInOS(p)
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Keyboard shortcuts</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Bindings use <code>Mod</code> for Cmd (macOS) / Ctrl (Windows/Linux). Examples:{' '}
            <code>F5</code>, <code>Mod+Shift+C</code>, <code>Alt+ArrowUp</code>.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell>Description</TableCell>
                <TableCell width={180}>Shortcut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {row.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      value={bindings[row.id] ?? ''}
                      onChange={(e) =>
                        setBindings((b) => ({ ...b, [row.id]: e.target.value }))
                      }
                      slotProps={{ htmlInput: { spellCheck: false } }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
