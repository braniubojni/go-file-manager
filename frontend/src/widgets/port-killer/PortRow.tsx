import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { FC, MouseEvent, ReactNode } from 'react';
import { dotSx, indentRowSx, pidSx, rowSx } from './styles';

type Props = {
  process: string;
  pid: number;
  confirming: boolean;
  indent?: boolean;
  showPid?: boolean;
  leading?: ReactNode;
  onSelect: () => void;
  onKill: () => void;
  onCancel: () => void;
};

export const PortRow: FC<Props> = ({
  process,
  pid,
  confirming,
  indent,
  showPid = true,
  leading,
  onSelect,
  onKill,
  onCancel,
}) => {
  const stop = (e: MouseEvent, fn: () => void) => {
    e.stopPropagation();
    fn();
  };

  return (
    <Box
      sx={indent ? indentRowSx : rowSx}
      onClick={confirming ? undefined : onSelect}
      data-testid={`port-row-${pid}`}
    >
      <Box sx={dotSx} />
      {confirming ? (
        <>
          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
            Kill {process || `PID ${pid}`}?
          </Typography>
          <Button size="small" color="error" variant="contained" onClick={(e) => stop(e, onKill)}>
            Kill
          </Button>
          <Button size="small" onClick={(e) => stop(e, onCancel)}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          {leading}
          {showPid ? (
            <Typography variant="body2" color="text.secondary" sx={pidSx}>
              PID {pid}
            </Typography>
          ) : null}
        </>
      )}
    </Box>
  );
};
