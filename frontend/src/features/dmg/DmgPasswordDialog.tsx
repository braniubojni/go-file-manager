import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { usePaneStore } from '../pane/paneStore';
import { enterPaneTab } from '../../widgets/file-pane/helpers';
import { useSnack } from '../../shared/ui/SnackbarHost';
import { useDmgPasswordStore } from './dmgPasswordStore';
import { startAttachDmg } from './startAttach';

export const DmgPasswordDialog: FC = () => {
  const open = useDmgPasswordStore((s) => s.open);
  const path = useDmgPasswordStore((s) => s.path);
  const paneId = useDmgPasswordStore((s) => s.paneId);
  const error = useDmgPasswordStore((s) => s.error);
  const prompt = useDmgPasswordStore((s) => s.prompt);
  const close = useDmgPasswordStore((s) => s.close);
  const navigate = usePaneStore((s) => s.navigate);
  const show = useSnack((s) => s.show);
  const [password, setPassword] = useState('');

  const name = path.split(/[/\\]/).pop() || path;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const pw = password;
    const dmgPath = path;
    const pane = paneId;
    setPassword('');
    close();
    startAttachDmg({
      path: dmgPath,
      password: pw,
      show,
      onMounted: (mp) => {
        enterPaneTab(pane, mp);
        navigate(pane, mp);
      },
      onNeedPassword: (p, err) => prompt(p, pane, err || 'Incorrect password'),
    });
  };

  return (
    <Dialog
      data-testid="dialog-dmg-password"
      open={open}
      onClose={() => {
        setPassword('');
        close();
      }}
    >
      <form onSubmit={submit}>
        <DialogTitle>Encrypted disk image</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>Enter the password to attach {name}.</DialogContentText>
          <TextField
            autoFocus
            fullWidth
            type="password"
            margin="dense"
            label="Password"
            data-testid="input-dmg-password"
            value={password}
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
            onClick={() => {
              setPassword('');
              close();
            }}
          >
            Cancel
          </Button>
          <Button data-testid="btn-dmg-password-confirm" type="submit" variant="contained">
            Attach
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
