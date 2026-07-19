import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import type { NameDialogProps } from '../types'

export function NameDialog({
  testId,
  title,
  label,
  inputTestId,
  confirmTestId,
  confirmLabel,
  state,
  dispatch,
  onConfirm,
}: NameDialogProps) {
  return (
    <Dialog data-testid={testId} open={state.open} onClose={() => dispatch({ type: 'close' })}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label={label}
          data-testid={inputTestId}
          value={state.name}
          onChange={(e) => dispatch({ type: 'set_name', name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => dispatch({ type: 'close' })}>Cancel</Button>
        <Button data-testid={confirmTestId} variant="contained" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
