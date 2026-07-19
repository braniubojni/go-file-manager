import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import type { ArchiveDialogProps } from '../types'

export function ArchiveDialog({
  archive,
  dispatch,
  selectionCount,
  activePath,
  onConfirm,
}: ArchiveDialogProps) {
  return (
    <Dialog
      data-testid="dialog-archive"
      open={archive.open}
      onClose={() => !archive.busy && dispatch({ type: 'close' })}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Create archive</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Archive name (without extension)"
          data-testid="input-archive-name"
          value={archive.name}
          disabled={archive.busy}
          onChange={(e) => dispatch({ type: 'set', patch: { name: e.target.value } })}
        />
        <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }} disabled={archive.busy}>
          <FormLabel component="legend">Format</FormLabel>
          <RadioGroup
            data-testid="archive-format-group"
            value={archive.format}
            onChange={(e) => dispatch({ type: 'set', patch: { format: e.target.value } })}
          >
            {archive.formats.map((f) => (
              <FormControlLabel key={f} value={f} control={<Radio size="small" />} label={f} />
            ))}
          </RadioGroup>
        </FormControl>
        {archive.format === 'zip' && (
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={archive.encrypt}
                  disabled={archive.busy}
                  onChange={(e) =>
                    dispatch({ type: 'set', patch: { encrypt: e.target.checked } })
                  }
                  data-testid="archive-encrypt-toggle"
                  size="small"
                />
              }
              label="Encrypt ZIP with password"
            />
            {archive.encrypt && (
              <TextField
                fullWidth
                type="password"
                margin="dense"
                label="Password"
                data-testid="input-archive-password"
                value={archive.password}
                disabled={archive.busy}
                onChange={(e) =>
                  dispatch({ type: 'set', patch: { password: e.target.value } })
                }
              />
            )}
          </Box>
        )}
        {archive.error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {archive.error}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {selectionCount} item(s) → {activePath}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={archive.busy} onClick={() => dispatch({ type: 'close' })}>
          Cancel
        </Button>
        <Button
          data-testid="btn-archive-confirm"
          variant="contained"
          disabled={archive.busy}
          onClick={onConfirm}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
