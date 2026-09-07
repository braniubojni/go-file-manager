import type { FC, SubmitEvent } from 'react';
import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FileService } from '../../shared/api/bindings';
import { errMessage } from '../../shared/lib/format';
import { useArchivePasswordStore } from './archivePasswordStore';

/** Prompts for a password against an encrypted archive (opening a text file
 * inside it in the editor, or dragging a member out) and caches it on the
 * backend via SetArchivePassword before letting the caller retry. */
export const ArchivePasswordDialog: FC = () => {
  const open = useArchivePasswordStore((s) => s.open);
  const path = useArchivePasswordStore((s) => s.path);
  const onSuccess = useArchivePasswordStore((s) => s.onSuccess);
  const close = useArchivePasswordStore((s) => s.close);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const name = path.split(/[/\\]/).pop() || path;

  const reset = () => {
    setPassword('');
    setError('');
    setBusy(false);
  };

  const submit = async (e?: SubmitEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await FileService.SetArchivePassword(path, password);
    } catch (err) {
      setBusy(false);
      setError(errMessage(err));
      return;
    }
    const cb = onSuccess;
    reset();
    close();
    cb?.();
  };

  return (
    <Dialog
      data-testid="dialog-archive-password"
      open={open}
      onClose={() => {
        reset();
        close();
      }}
    >
      <form onSubmit={submit}>
        <DialogTitle>Password-protected archive</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>Enter the password for {name}.</DialogContentText>
          <TextField
            autoFocus
            fullWidth
            type="password"
            margin="dense"
            label="Password"
            data-testid="input-archive-password"
            value={password}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              reset();
              close();
            }}
          >
            Cancel
          </Button>
          <Button
            data-testid="btn-archive-password-confirm"
            type="submit"
            variant="contained"
            disabled={busy}
          >
            Unlock
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
