import LanIcon from '@mui/icons-material/Lan';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import { useState, type FC } from 'react';
import { PortKillerPanel } from './PortKillerPanel';
import { paperSx } from './styles';

export const PortKillerMenu: FC = () => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  return (
    <>
      <Tooltip title="Port killer" disableHoverListener={open}>
        <IconButton
          data-testid="btn-ports"
          color={open ? 'primary' : 'default'}
          onClick={(e) => setAnchor(open ? null : e.currentTarget)}
        >
          <LanIcon />
        </IconButton>
      </Tooltip>
      <Popover
        data-testid="popover-ports"
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableScrollLock
        slotProps={{ paper: { sx: paperSx } }}
      >
        <PortKillerPanel open={open} />
      </Popover>
    </>
  );
};
