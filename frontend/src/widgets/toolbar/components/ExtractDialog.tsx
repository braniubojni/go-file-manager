import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import type { ExtractDialogProps } from '../types'

export function ExtractDialog({ extract, dispatch, selectionCount, onConfirm }: ExtractDialogProps) {
  return (
    <Dialog
      data-testid="dialog-extract"
      open={extract.open}
      onClose={() => !extract.busy && dispatch({ type: 'close' })}
    >
      <DialogTitle>Extract archive</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1 }}>
          Extract {extract.itemCount || selectionCount} archive(s) into subfolders under the active
          pane. Supports zip, rar, 7z, tar and compressed tar.
        </DialogContentText>
        <TextField
          fullWidth
          type="password"
          margin="dense"
          label="Password (if encrypted)"
          data-testid="input-extract-password"
          value={extract.password}
          disabled={extract.busy}
          onChange={(e) => dispatch({ type: 'set_password', password: e.target.value })}
        />
        {extract.error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {extract.error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={extract.busy} onClick={() => dispatch({ type: 'close' })}>
          Cancel
        </Button>
        <Button
          data-testid="btn-extract-confirm"
          variant="contained"
          disabled={extract.busy}
          onClick={onConfirm}
        >
          Extract
        </Button>
      </DialogActions>
    </Dialog>
  )
}
