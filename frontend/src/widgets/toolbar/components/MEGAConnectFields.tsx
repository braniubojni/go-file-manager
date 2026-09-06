import type { Dispatch, FC } from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import type { AddConnectionAction, AddConnectionState } from '../../../features/connections/types';
import { handleDialogEnter } from '../../../shared/lib/dialogSubmit';

type Props = {
  dialog: AddConnectionState;
  dispatch: Dispatch<AddConnectionAction>;
  onSubmit: () => void;
};

export const megaEmailOk = (email: string): boolean => {
  const i = email.trim().lastIndexOf('@');
  return i > 0 && i < email.trim().length - 1 && !email.includes(' ');
};

export const MEGAConnectFields: FC<Props> = ({ dialog, dispatch, onSubmit }) => (
  <>
    <TextField
      autoFocus
      label="Email"
      placeholder="you@example.com"
      value={dialog.spec}
      onChange={(e) => dispatch({ type: 'set_spec', spec: e.target.value })}
      onKeyDown={(e) => handleDialogEnter(e, onSubmit)}
      data-testid="input-mega-email"
      fullWidth
      disabled={dialog.busy}
      sx={{ mt: 1 }}
      spellCheck={false}
      autoComplete="username"
    />
    <TextField
      type="password"
      label="Password"
      value={dialog.password}
      onChange={(e) => dispatch({ type: 'set_password', password: e.target.value })}
      onKeyDown={(e) => handleDialogEnter(e, onSubmit)}
      data-testid="input-mega-password"
      fullWidth
      disabled={dialog.busy}
      autoComplete="current-password"
    />
    <TextField
      label="2FA code"
      placeholder="optional"
      value={dialog.totp}
      onChange={(e) => dispatch({ type: 'set_totp', totp: e.target.value })}
      onKeyDown={(e) => handleDialogEnter(e, onSubmit)}
      data-testid="input-mega-totp"
      fullWidth
      disabled={dialog.busy}
      helperText="Leave empty if two-factor is off"
      spellCheck={false}
      autoComplete="one-time-code"
    />
    <FormControlLabel
      control={
        <Checkbox
          checked={dialog.save}
          onChange={(e) => dispatch({ type: 'set_save', save: e.target.checked })}
          disabled={dialog.busy}
        />
      }
      label="Save connection"
    />
  </>
);
