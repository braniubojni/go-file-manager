import type { FC } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CloudIcon from '@mui/icons-material/Cloud';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useConnections } from '../hooks/useConnections';
import { ConnectionDialog } from './ConnectionDialog';

export const ConnectionsMenu: FC = () => {
  const {
    anchor,
    setAnchor,
    dialog,
    dispatch,
    sshProfiles,
    sessionKeys,
    onMenuConnect,
    onDisconnect,
    onRemove,
    submitDialog,
    openSSHConfigMode,
    loadSSHConfig,
    connectFromConfig,
  } = useConnections();

  return (
    <>
      <Tooltip title="Remote connections (SSH)">
        <IconButton
          data-testid="btn-connections"
          onClick={(e) => setAnchor(e.currentTarget)}
          color={sessionKeys.size ? 'primary' : 'default'}
        >
          <CloudIcon />
        </IconButton>
      </Tooltip>

      <Menu
        data-testid="menu-connections"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 260 } } }}
      >
        <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'background.paper' }}>SSH</ListSubheader>
        {sshProfiles.length === 0 && (
          <MenuItem disabled dense>
            <Typography variant="body2" color="text.secondary">
              No saved SSH connections
            </Typography>
          </MenuItem>
        )}
        {sshProfiles.map((p) => {
          const key = `${p.user}@${p.host}:${p.port || 22}`;
          const live = sessionKeys.has(key);
          return (
            <MenuItem
              key={p.id}
              data-testid={`conn-profile-${p.id}`}
              dense
              onClick={() => onMenuConnect(p)}
              sx={{ display: 'flex', gap: 1, pr: 0.5 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: live ? 700 : 400 }}>
                  {p.label || key}
                </Typography>
                {live && (
                  <Typography variant="caption" color="success.main">
                    connected
                  </Typography>
                )}
              </Box>
              {live && (
                <IconButton
                  size="small"
                  aria-label="Disconnect"
                  data-testid={`btn-disconnect-${p.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onDisconnect(key);
                  }}
                >
                  <LinkOffIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton
                size="small"
                aria-label="Remove"
                data-testid={`btn-remove-conn-${p.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void onRemove(p.id);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          );
        })}
        <MenuItem
          data-testid="menu-conn-add"
          dense
          onClick={() => {
            setAnchor(null);
            dispatch({ type: 'open_add' });
          }}
        >
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          Add new…
        </MenuItem>
        <MenuItem
          data-testid="menu-conn-ssh-config"
          dense
          onClick={() => {
            setAnchor(null);
            void openSSHConfigMode();
          }}
        >
          <FolderOpenIcon fontSize="small" sx={{ mr: 1 }} />
          From SSH config…
        </MenuItem>

        <Divider />
        <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'background.paper' }}>FTP</ListSubheader>
        <MenuItem disabled dense>
          <Typography variant="body2" color="text.secondary">
            Coming soon
          </Typography>
        </MenuItem>
        <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'background.paper' }}>SFTP</ListSubheader>
        <MenuItem disabled dense>
          <Typography variant="body2" color="text.secondary">
            Coming soon
          </Typography>
        </MenuItem>
      </Menu>

      <ConnectionDialog
        dialog={dialog}
        dispatch={dispatch}
        onSubmit={() => void submitDialog()}
        onLoadSSHConfig={(path) => void loadSSHConfig(path)}
        onConnectFromConfig={(host) => void connectFromConfig(host)}
      />
    </>
  );
};
