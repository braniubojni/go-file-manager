import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import { useState, type FC } from 'react';
import { AIUsagePanel } from './AIUsagePanel';
import { paperSx } from './styles';

export const AIUsageMenu: FC = () => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  return (
    <>
      <Tooltip title="AI usage" disableHoverListener={open}>
        <IconButton
          data-testid="btn-ai-usage"
          color={open ? 'primary' : 'default'}
          onClick={(e) => setAnchor(open ? null : e.currentTarget)}
        >
          <AutoAwesomeIcon />
        </IconButton>
      </Tooltip>
      <Popover
        data-testid="popover-ai-usage"
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableScrollLock
        slotProps={{ paper: { sx: paperSx } }}
      >
        <AIUsagePanel open={open} />
      </Popover>
    </>
  );
};
