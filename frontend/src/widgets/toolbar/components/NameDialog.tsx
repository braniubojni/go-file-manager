import type { FC } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
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
}) => {
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
  );
};
