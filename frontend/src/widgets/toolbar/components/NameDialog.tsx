import { useRef, type FC } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { handleDialogEnter, handleDialogFormSubmit } from '../../../shared/lib/dialogSubmit';
import type { NameDialogProps } from '../types';

const selectStemRange = (el: HTMLInputElement | null, selectStem: boolean | undefined) => {
  if (!el || !selectStem) return;
  el.focus();
  const v = el.value;
  const i = v.lastIndexOf('.');
  el.setSelectionRange(0, i > 0 ? i : v.length);
};

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
  selectStem,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      data-testid={testId}
      open={state.open}
      onClose={() => dispatch({ type: 'close' })}
      slotProps={{
        transition: {
          onEntered: () => selectStemRange(inputRef.current, selectStem),
        },
      }}
    >
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
            inputRef={inputRef}
            onChange={(e) => dispatch({ type: 'set_name', name: e.target.value })}
            onKeyDown={(e) => handleDialogEnter(e, onConfirm)}
            slotProps={{
              htmlInput: {
                onFocus: () => {
                  // Dialog autoFocus can land before Transition onEntered.
                  window.setTimeout(() => selectStemRange(inputRef.current, selectStem), 0);
                },
              },
            }}
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
};
