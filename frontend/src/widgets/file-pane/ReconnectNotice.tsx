import CloudOffIcon from '@mui/icons-material/CloudOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type { PaneId } from '../../entities/file/types';
import { useConnectRequestStore } from '../../features/connections/connectRequestStore';
import { sessionKeyFromPath } from '../../features/connections/helpers';
import { ensureSessionThenNavigate } from '../../features/connections/navigate';
import { reconnectNoticeSx } from './styles';

/**
 * Shown in place of the raw "not connected …" backend error. Covers both a
 * remote tab restored dormant at startup and a session lost to hibernation —
 * in-pane, so the other pane keeps working.
 */
export const ReconnectNotice: FC<{ paneId: PaneId; path: string }> = ({ paneId, path }) => {
  const connecting = useConnectRequestStore((s) => s.connecting[paneId]);
  const host = sessionKeyFromPath(path) ?? path;

  return (
    <Box sx={reconnectNoticeSx} data-testid={`reconnect-${paneId}`}>
      <CloudOffIcon color="disabled" />
      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
        Not connected to {host}
      </Typography>
      <Button
        variant="outlined"
        size="small"
        data-testid={`btn-reconnect-${paneId}`}
        loading={connecting}
        onClick={() => void ensureSessionThenNavigate(paneId, path)}
      >
        Reconnect
      </Button>
    </Box>
  );
};
