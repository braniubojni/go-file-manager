import type { Dispatch, FC } from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import type { AddConnectionAction, AddConnectionState } from '../../../features/connections/types';
import { smbUserHelp, smbUserPlaceholder } from '../../../features/connections/smbCopy';
import { parseSMBForm, type SMBFieldErrors } from '../../../features/connections/smbValidate';
import { handleDialogEnter } from '../../../shared/lib/dialogSubmit';

type Props = {
  dialog: AddConnectionState;
  dispatch: Dispatch<AddConnectionAction>;
  onSubmit: () => void;
  errors: SMBFieldErrors;
};

export const smbFormFromDialog = (dialog: AddConnectionState) =>
  parseSMBForm({
    host: dialog.smbHost,
    user: dialog.smbUser,
    domain: dialog.smbDomain,
    port: dialog.smbPort,
  });

export const SMBConnectFields: FC<Props> = ({ dialog, dispatch, onSubmit, errors }) => {
  const show = (key: keyof SMBFieldErrors, value: string) => Boolean(errors[key] && value.trim());

  return (
    <>
      <TextField
        autoFocus
        label="Server"
        placeholder="nas.local, 192.168.1.10, or \\\\NAS\\share"
        value={dialog.smbHost}
        onChange={(e) => dispatch({ type: 'set_smb_host', host: e.target.value })}
        onKeyDown={(e) => handleDialogEnter(e, onSubmit)}
        data-testid="input-smb-host"
        fullWidth
        disabled={dialog.busy}
        error={show('host', dialog.smbHost)}
        helperText={show('host', dialog.smbHost) ? errors.host : 'Computer name or IP — not “smb”'}
        sx={{ mt: 1 }}
        spellCheck={false}
      />
      <TextField
        label="Username"
        placeholder={smbUserPlaceholder()}
        value={dialog.smbUser}
        onChange={(e) => dispatch({ type: 'set_smb_user', user: e.target.value })}
        onKeyDown={(e) => handleDialogEnter(e, onSubmit)}
        data-testid="input-smb-user"
        fullWidth
        disabled={dialog.busy}
        error={show('user', dialog.smbUser)}
        helperText={show('user', dialog.smbUser) ? errors.user : smbUserHelp()}
        spellCheck={false}
      />
      <TextField
        label="Password"
        type="password"
        value={dialog.password}
        onChange={(e) => dispatch({ type: 'set_password', password: e.target.value })}
        onKeyDown={(e) => handleDialogEnter(e, onSubmit)}
        data-testid="input-smb-password"
        fullWidth
        disabled={dialog.busy}
      />
      <TextField
        label="Domain"
        placeholder="optional (AD / workgroup)"
        value={dialog.smbDomain}
        onChange={(e) => dispatch({ type: 'set_smb_domain', domain: e.target.value })}
        onKeyDown={(e) => handleDialogEnter(e, onSubmit)}
        data-testid="input-smb-domain"
        fullWidth
        disabled={dialog.busy}
        error={show('domain', dialog.smbDomain)}
        helperText={show('domain', dialog.smbDomain) ? errors.domain : undefined}
        spellCheck={false}
      />
      <TextField
        label="Port"
        value={dialog.smbPort}
        onChange={(e) => dispatch({ type: 'set_smb_port', port: e.target.value })}
        onKeyDown={(e) => handleDialogEnter(e, onSubmit)}
        data-testid="input-smb-port"
        fullWidth
        disabled={dialog.busy}
        error={Boolean(errors.port)}
        helperText={errors.port ?? 'Default 445'}
        spellCheck={false}
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
};
