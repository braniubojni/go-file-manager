import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { modShortcut } from './helpers';
import { actionRowSx, actionsSx, killAllBtnSx, killAllConfirmSx, shortcutSx } from './styles';

type Props = {
  tree: boolean;
  showTree?: boolean;
  killAllConfirm: boolean;
  onRefresh: () => void;
  onToggleTree: () => void;
  onKillAll: () => void;
  onConfirmKillAll: () => void;
  onCancelKillAll: () => void;
};

export const PortActions: FC<Props> = ({
  tree,
  showTree = true,
  killAllConfirm,
  onRefresh,
  onToggleTree,
  onKillAll,
  onConfirmKillAll,
  onCancelKillAll,
}) => {
  return (
    <Box sx={actionsSx}>
      <Button startIcon={<RefreshIcon />} sx={actionRowSx} onClick={onRefresh}>
        Refresh
        <Typography component="span" sx={shortcutSx}>
          {modShortcut('R')}
        </Typography>
      </Button>
      {showTree ? (
        <Button startIcon={<FormatListBulletedIcon />} sx={actionRowSx} onClick={onToggleTree}>
          {tree ? 'List View' : 'Tree View'}
          <Typography component="span" sx={shortcutSx}>
            {modShortcut('T')}
          </Typography>
        </Button>
      ) : null}
      {killAllConfirm ? (
        <Box sx={killAllConfirmSx}>
          <Typography variant="body2" sx={{ flex: 1 }}>
            Kill all?
          </Typography>
          <Button size="small" color="error" variant="contained" onClick={onConfirmKillAll}>
            Kill
          </Button>
          <Button size="small" onClick={onCancelKillAll}>
            Cancel
          </Button>
        </Box>
      ) : (
        <Button startIcon={<CancelOutlinedIcon />} sx={killAllBtnSx} onClick={onKillAll}>
          Kill All
          <Typography component="span" sx={shortcutSx}>
            {modShortcut('K')}
          </Typography>
        </Button>
      )}
    </Box>
  );
};
