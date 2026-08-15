import type { FC } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { handleDialogEnter, handleDialogFormSubmit } from '../../../shared/lib/dialogSubmit';
import type { ExtractDialogProps } from '../types';

export const ExtractDialog: FC<ExtractDialogProps> = ({
  extract,
  dispatch,
  selectionCount,
  onConfirm,
}) => {
  const submit = () => {
    if (extract.busy) return;
    onConfirm();
  };

  return (
    <Dialog
      data-testid="dialog-extract"
      open={extract.open}
      onClose={() => !extract.busy && dispatch({ type: 'close' })}
    >
      <form onSubmit={(e) => handleDialogFormSubmit(e, submit)}>
        <DialogTitle>Extract archive</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>
            Extract {extract.itemCount || selectionCount} archive(s) into subfolders under the
            active pane. Supports zip, rar, 7z, tar and compressed tar.
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
            onKeyDown={(e) => handleDialogEnter(e, submit)}
          />
          {extract.error && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {extract.error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button type="button" disabled={extract.busy} onClick={() => dispatch({ type: 'close' })}>
            Cancel
          </Button>
          <Button
            data-testid="btn-extract-confirm"
            type="submit"
            variant="contained"
            disabled={extract.busy}
          >
            Extract
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
