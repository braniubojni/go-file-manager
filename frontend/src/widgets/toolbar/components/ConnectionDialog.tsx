import type { FC } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { ConnectionDialogProps } from '../types'

const DIALOG_TITLES: Record<string, string> = {
  add: 'Add SSH connection',
  password: 'SSH password',
  ssh_config: 'Connect from SSH config',
  workdir: 'Choose working directory',
}

export const ConnectionDialog: FC<ConnectionDialogProps> = ({
  dialog,
  dispatch,
  onSubmit,
  onLoadSSHConfig,
  onConnectFromConfig,
}) => {
  return (
    <Dialog
      data-testid="dialog-connection"
      open={dialog.open}
      onClose={() => !dialog.busy && dispatch({ type: 'close' })}
      fullWidth
      disableRestoreFocus
      maxWidth="xs"
    >
      <DialogTitle>{DIALOG_TITLES[dialog.mode] ?? 'SSH'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        {/* ── mode: add ─────────────────────────────────────────────────── */}
        {dialog.mode === 'add' && (
          <>
            <TextField
              autoFocus
              label="Connection"
              placeholder="ssh user@host or config alias"
              helperText="Examples: ssh user@192.168.1.10 · user@host:2222 · pahestain (from ~/.ssh/config)"
              value={dialog.spec}
              onChange={(e) => dispatch({ type: 'set_spec', spec: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit()
              }}
              data-testid="input-conn-spec"
              fullWidth
              disabled={dialog.busy}
              sx={{ mt: 1 }}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
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

        {/* ── mode: ssh_config ──────────────────────────────────────────── */}
        {dialog.mode === 'ssh_config' && (
          <>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 1 }}>
              <TextField
                label="Config file"
                value={dialog.sshConfigPath}
                onChange={(e) => dispatch({ type: 'set_ssh_config_path', path: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onLoadSSHConfig(dialog.sshConfigPath)
                }}
                size="small"
                fullWidth
                disabled={dialog.busy || dialog.sshConfigLoading}
                data-testid="input-ssh-config-path"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => onLoadSSHConfig(dialog.sshConfigPath)}
                disabled={dialog.busy || dialog.sshConfigLoading}
                sx={{ mt: 0.25, whiteSpace: 'nowrap' }}
                data-testid="btn-load-ssh-config"
              >
                {dialog.sshConfigLoading ? 'Loading…' : 'Load'}
              </Button>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={dialog.save}
                  onChange={(e) => dispatch({ type: 'set_save', save: e.target.checked })}
                  disabled={dialog.busy}
                />
              }
              label="Save as profile"
            />
            {dialog.sshConfigHosts.length === 0 && !dialog.sshConfigLoading && (
              <Typography variant="body2" color="text.secondary">
                {dialog.sshConfigPath
                  ? 'Click Load to read hosts from the config file.'
                  : 'Enter a config file path above.'}
              </Typography>
            )}
            {dialog.sshConfigHosts.length > 0 && (
              <List
                dense
                disablePadding
                sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
              >
                {dialog.sshConfigHosts.map((h) => (
                  <ListItemButton
                    key={h.alias}
                    selected={dialog.selectedConfigHost?.alias === h.alias}
                    onClick={() => onConnectFromConfig(h)}
                    disabled={dialog.busy}
                    data-testid={`ssh-config-host-${h.alias}`}
                  >
                    <ListItemText
                      primary={h.alias}
                      secondary={`${h.user}@${h.hostName}:${h.port}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </>
        )}

        {/* ── mode: workdir ─────────────────────────────────────────────── */}
        {dialog.mode === 'workdir' && (
          <>
            <Typography variant="body2" color="text.secondary">
              Connected to {dialog.workdirSessionKey}. Choose a folder to open (not the whole tree).
            </Typography>
            <RadioGroup
              value={dialog.workdirChosen}
              onChange={(e) => dispatch({ type: 'set_workdir_chosen', path: e.target.value })}
            >
              <FormControlLabel
                value={dialog.workdirHome}
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2">Home</Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ wordBreak: 'break-all' }}
                    >
                      {dialog.workdirHome}
                    </Typography>
                  </Box>
                }
              />
              {dialog.workdirPaths
                .filter((r) => r.path !== dialog.workdirHome)
                .map((r) => (
                  <FormControlLabel
                    key={r.path}
                    value={r.path}
                    control={<Radio size="small" />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          {r.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Recent · {r.lastVisited}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              <FormControlLabel
                value="__custom__"
                control={<Radio size="small" />}
                label={<Typography variant="body2">Other path…</Typography>}
              />
            </RadioGroup>
            {(dialog.workdirChosen === '__custom__' || dialog.workdirCustom) && (
              <TextField
                autoFocus
                label="Remote path"
                placeholder="/home/user/project"
                helperText="Absolute path on the remote, or ssh://…"
                value={dialog.workdirCustom}
                onChange={(e) => dispatch({ type: 'set_workdir_custom', path: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmit()
                }}
                fullWidth
                size="small"
                data-testid="input-workdir-custom"
              />
            )}
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
        )}

        {/* ── password / key passphrase prompt ─────────────────────────── */}
        {(dialog.askPassword || dialog.mode === 'password') && dialog.mode !== 'workdir' && (
          <TextField
            autoFocus={dialog.mode === 'password' || dialog.askPassword}
            type="password"
            label="Password or key passphrase"
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
                ? `Auth for ${dialog.spec || 'SSH'} (server password or encrypted key passphrase)`
                : 'Public key auth failed — try passphrase, password, or set IdentityFile in ~/.ssh/config'
            }
            sx={{ mt: 1 }}
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
        {dialog.mode !== 'ssh_config' && (
          <Button
            data-testid="btn-conn-connect"
            variant="contained"
            disabled={dialog.busy}
            onClick={onSubmit}
          >
            {dialog.mode === 'workdir' ? 'Open' : dialog.busy ? 'Connecting…' : 'Connect'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
