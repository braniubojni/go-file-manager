import type { FC } from 'react'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { ConnectionDialogProps } from '../types'

export const ConnectionDialog: FC<ConnectionDialogProps> = ({ dialog, dispatch, onSubmit }) => {
  return (
    <Dialog
      data-testid="dialog-connection"
      open={dialog.open}
      onClose={() => !dialog.busy && dispatch({ type: 'close' })}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>
        {dialog.mode === 'password' ? 'SSH password' : 'Add SSH connection'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        {dialog.mode === 'add' && (
          <>
            <TextField
              autoFocus
              label="Connection"
              placeholder="ssh username@ip"
              helperText="Examples: ssh user@192.168.1.10 · user@host:2222"
              value={dialog.spec}
              onChange={(e) => dispatch({ type: 'set_spec', spec: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit()
              }}
              data-testid="input-conn-spec"
              fullWidth
              disabled={dialog.busy}
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
        )}
        {(dialog.askPassword || dialog.mode === 'password') && (
          <TextField
            autoFocus={dialog.mode === 'password' || dialog.askPassword}
            type="password"
            label="Password"
            value={dialog.password}
            onChange={(e) => dispatch({ type: 'set_password', password: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit()
            }}
            data-testid="input-conn-password"
            fullWidth
            disabled={dialog.busy}
            helperText={
              dialog.mode === 'password'
                ? `Password for ${dialog.spec || 'SSH'}`
                : 'Server requested a password'
            }
          />
        )}
        {dialog.error && (
          <Typography color="error" variant="body2" data-testid="conn-error">
            {dialog.error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={dialog.busy} onClick={() => dispatch({ type: 'close' })}>
          Cancel
        </Button>
        <Button
          data-testid="btn-conn-connect"
          variant="contained"
          disabled={dialog.busy}
          onClick={onSubmit}
        >
          {dialog.busy ? 'Connecting…' : 'Connect'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
