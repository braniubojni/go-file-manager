import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type { ProcessInfo } from '../../entities/file/types';
import { knownServiceTag, processDetail } from './helpers';
import { PortRow } from './PortRow';
import type { PortConfirm } from './PortList';
import { emptyListSx, listSx } from './styles';

type Props = {
  rows: ProcessInfo[];
  confirm: PortConfirm | null;
  onSelect: (c: PortConfirm) => void;
  onKill: (pid: number) => void;
  onCancel: () => void;
};

export const ProcessList: FC<Props> = ({ rows, confirm, onSelect, onKill, onCancel }) => {
  if (rows.length === 0) {
    return (
      <Box sx={emptyListSx}>
        <Typography variant="body2" color="text.secondary">
          No processes
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={listSx}>
      {rows.map((r) => (
        <PortRow
          key={r.pid}
          process={r.name}
          pid={r.pid}
          confirming={confirm?.pid === r.pid}
          tag={knownServiceTag(r.name)}
          detail={processDetail(r)}
          onSelect={() => onSelect({ pid: r.pid })}
          onKill={() => onKill(r.pid)}
          onCancel={onCancel}
        />
      ))}
    </Box>
  );
};
