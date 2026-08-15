import type { FC } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { handleDialogEnter, handleDialogFormSubmit } from '../../../shared/lib/dialogSubmit';
import type { NameDialogProps } from '../types';

export const NameDialog: FC<NameDialogProps> = ({
  testId,
  title,
  label,
  inputTestId,
  confirmTestId,
  confirmLabel,
  state,
  dispatch,
  onConfirm,
}) => (
  <Dialog data-testid={testId} open={state.open} onClose={() => dispatch({ type: 'close' })}>
    <form onSubmit={(e) => handleDialogFormSubmit(e, onConfirm)}>
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
          onKeyDown={(e) => handleDialogEnter(e, onConfirm)}
        />
      </DialogContent>
      <DialogActions>
        <Button type="button" onClick={() => dispatch({ type: 'close' })}>
          Cancel
        </Button>
        <Button data-testid={confirmTestId} type="submit" variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </form>
  </Dialog>
);
