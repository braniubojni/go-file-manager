import type { FC } from 'react';
import AlbumIcon from '@mui/icons-material/Album';
import DnsIcon from '@mui/icons-material/Dns';
import EjectIcon from '@mui/icons-material/Eject';
import SdStorageIcon from '@mui/icons-material/SdStorage';
import StorageIcon from '@mui/icons-material/Storage';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Volume } from '../../../entities/file/types';
import { useDrives } from '../hooks/useDrives';

const kindIcon = (kind: string) => {
  if (kind === 'network') return <DnsIcon fontSize="small" />;
  if (kind === 'disk-image') return <AlbumIcon fontSize="small" />;
  if (kind === 'external') return <SdStorageIcon fontSize="small" />;
  return <StorageIcon fontSize="small" />;
};

export const DrivesMenu: FC = () => {
  const { anchor, setAnchor, volumes, openVolume, unmount } = useDrives();

  return (
    <>
      <Tooltip title="Mounted drives">
        <IconButton
          data-testid="btn-drives"
          onClick={(e) => setAnchor(e.currentTarget)}
          color={volumes.length ? 'primary' : 'default'}
        >
          <StorageIcon />
        </IconButton>
      </Tooltip>
      <Menu
        data-testid="menu-drives"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 260 } } }}
      >
        <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'background.paper' }}>
          Mounted drives
        </ListSubheader>
        {volumes.length === 0 && (
          <MenuItem disabled dense>
            <Typography variant="body2" color="text.secondary">
              No volumes
            </Typography>
          </MenuItem>
        )}
        {volumes.map((v: Volume) => (
          <MenuItem
            key={v.path}
            data-testid={`drive-${v.name}`}
            dense
            onClick={() => openVolume(v)}
            sx={{ display: 'flex', gap: 1, pr: 0.5 }}
          >
            {kindIcon(v.kind)}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {v.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {v.kind}
              </Typography>
            </Box>
            {v.unmountable && (
              <IconButton
                size="small"
                aria-label="Unmount"
                data-testid={`btn-unmount-${v.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  unmount(v);
                }}
              >
                <EjectIcon fontSize="small" />
              </IconButton>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
