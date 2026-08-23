import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type { PortListener } from '../../entities/file/types';
import { groupByPid } from './helpers';
import { PortRow } from './PortRow';
import { emptyListSx, listSx } from './styles';

export type PortConfirm = { pid: number; port?: number };

type Props = {
  rows: PortListener[];
  tree: boolean;
  confirm: PortConfirm | null;
  onSelect: (c: PortConfirm) => void;
  onKill: (pid: number) => void;
  onCancel: () => void;
};

const isConfirm = (confirm: PortConfirm | null, pid: number, port?: number): boolean => {
  if (!confirm || confirm.pid !== pid) return false;
  if (port === undefined) return confirm.port === undefined;
  return confirm.port === port;
};

export const PortList: FC<Props> = ({ rows, tree, confirm, onSelect, onKill, onCancel }) => {
  if (rows.length === 0) {
    return (
      <Box sx={emptyListSx}>
        <Typography variant="body2" color="text.secondary">
          No listening ports
        </Typography>
      </Box>
    );
  }

  if (tree) {
    const groups = groupByPid(rows);
    return (
      <Box sx={listSx}>
        {groups.map((g) => (
          <Box key={g.pid}>
            <PortRow
              process={g.process}
              pid={g.pid}
              confirming={isConfirm(confirm, g.pid)}
              leading={
                <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: 600 }}>
                  {g.process || `PID ${g.pid}`}
                </Typography>
              }
              onSelect={() => onSelect({ pid: g.pid })}
              onKill={() => onKill(g.pid)}
              onCancel={onCancel}
            />
            {g.ports.map((port) => (
              <PortRow
                key={`${g.pid}:${port}`}
                process={g.process}
                pid={g.pid}
                confirming={isConfirm(confirm, g.pid, port)}
                indent
                showPid={false}
                leading={
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', flex: 1 }}>
                    :{port}
                  </Typography>
                }
                onSelect={() => onSelect({ pid: g.pid, port })}
                onKill={() => onKill(g.pid)}
                onCancel={onCancel}
              />
            ))}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={listSx}>
      {rows.map((r) => (
        <PortRow
          key={`${r.pid}:${r.port}`}
          process={r.process}
          pid={r.pid}
          confirming={isConfirm(confirm, r.pid, r.port)}
          leading={
            <>
              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 56 }}>
                :{r.port}
              </Typography>
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                {r.process}
              </Typography>
            </>
          }
          onSelect={() => onSelect({ pid: r.pid, port: r.port })}
          onKill={() => onKill(r.pid)}
          onCancel={onCancel}
        />
      ))}
    </Box>
  );
};
