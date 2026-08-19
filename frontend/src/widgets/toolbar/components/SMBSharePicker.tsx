import type { Dispatch, FC } from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { smbShareError } from '../../../features/connections/smbValidate';
import type { AddConnectionAction, AddConnectionState } from '../../../features/connections/types';

type Props = {
  dialog: AddConnectionState;
  dispatch: Dispatch<AddConnectionAction>;
};

export const SMBSharePicker: FC<Props> = ({ dialog, dispatch }) => {
  const shares = dialog.showHiddenShares ? dialog.shares : dialog.shares.filter((s) => !s.hidden);
  const shareErr = dialog.shareChosen.trim() ? smbShareError(dialog.shareChosen) : undefined;

  return (
    <>
      <Typography variant="body2" color="text.secondary">
        Connected to {dialog.workdirSessionKey}. Choose a share to open.
      </Typography>
      {shares.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No shares found. Check credentials or enable hidden shares.
        </Typography>
      ) : (
        <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {shares.map((s) => (
            <ListItemButton
              key={s.name}
              selected={dialog.shareChosen === s.name}
              onClick={() => dispatch({ type: 'set_share_chosen', name: s.name })}
              disabled={dialog.busy}
              data-testid={`smb-share-${s.name}`}
            >
              <ListItemText primary={s.name} secondary={s.hidden ? 'Hidden share' : undefined} />
            </ListItemButton>
          ))}
        </List>
      )}
      <TextField
        label="Share name"
        placeholder="Documents"
        value={dialog.shareChosen}
        onChange={(e) => dispatch({ type: 'set_share_chosen', name: e.target.value })}
        data-testid="input-smb-share"
        fullWidth
        size="small"
        disabled={dialog.busy}
        error={Boolean(shareErr)}
        helperText={shareErr}
        spellCheck={false}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={dialog.showHiddenShares}
            onChange={(e) => dispatch({ type: 'set_show_hidden_shares', show: e.target.checked })}
          />
        }
        label="Show hidden shares"
      />
      {dialog.workdirProfileId && (
        <FormControlLabel
          control={
            <Checkbox
              checked={dialog.workdirRemember}
              onChange={(e) =>
                dispatch({ type: 'set_workdir_remember', remember: e.target.checked })
              }
            />
          }
          label="Remember as default for this connection"
        />
      )}
    </>
  );
};
