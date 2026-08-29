import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { useState, type FC, type KeyboardEvent } from 'react';
import { useKillAllPorts, useKillPort, usePorts, useProcesses } from '../../entities/file/queries';
import { errMessage } from '../../shared/lib/format';
import { useSnack } from '../../shared/ui/SnackbarHost';
import { filterListeners, filterProcesses, uniquePids } from './helpers';
import { PortActions } from './PortActions';
import { PortList, type PortConfirm } from './PortList';
import { PortKillerTabs, type KillerTab } from './PortKillerTabs';
import { ProcessList } from './ProcessList';
import { contentSx, countBadgeSx, searchRowSx } from './styles';

type Props = { open: boolean };

export const PortKillerPanel: FC<Props> = ({ open }) => {
  const show = useSnack((s) => s.show);
  const [tab, setTab] = useState<KillerTab>('ports');
  const { data: ports, refetch: refetchPorts } = usePorts(open);
  const { data: processes, refetch: refetchProcs } = useProcesses(open && tab === 'processes');
  const kill = useKillPort();
  const killAll = useKillAllPorts();
  const [query, setQuery] = useState('');
  const [tree, setTree] = useState(false);
  const [confirm, setConfirm] = useState<PortConfirm | null>(null);
  const [killAllConfirm, setKillAllConfirm] = useState(false);

  const portRows = filterListeners(ports ?? [], query);
  const procRows = filterProcesses(processes ?? [], query);
  const rows = tab === 'ports' ? portRows : procRows;
  const fail = (e: unknown) => show(errMessage(e), 'error');

  const onKeyDown = (e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const k = e.key.toLowerCase();
    if (k !== 'r' && k !== 't' && k !== 'k') return;
    if (k === 't' && tab !== 'ports') return;
    e.preventDefault();
    e.stopPropagation();
    if (k === 'r') {
      void refetchPorts();
      if (tab === 'processes') void refetchProcs();
    }
    if (k === 't') setTree((v) => !v);
    if (k === 'k') setKillAllConfirm(true);
  };

  return (
    <Box sx={contentSx} onKeyDown={onKeyDown}>
      <Box sx={searchRowSx}>
        <TextField
          size="small"
          fullWidth
          autoFocus
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setConfirm(null);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box sx={countBadgeSx}>{rows.length}</Box>
      </Box>
      <PortKillerTabs
        tab={tab}
        onChange={(next) => {
          setTab(next);
          setConfirm(null);
          setKillAllConfirm(false);
        }}
      />
      {tab === 'ports' ? (
        <PortList
          rows={portRows}
          tree={tree}
          confirm={confirm}
          onSelect={setConfirm}
          onCancel={() => setConfirm(null)}
          onKill={(pid) =>
            kill.mutate(pid, {
              onSuccess: () => setConfirm(null),
              onError: fail,
            })
          }
        />
      ) : (
        <ProcessList
          rows={procRows}
          confirm={confirm}
          onSelect={setConfirm}
          onCancel={() => setConfirm(null)}
          onKill={(pid) =>
            kill.mutate(pid, {
              onSuccess: () => setConfirm(null),
              onError: fail,
            })
          }
        />
      )}
      <PortActions
        tree={tree}
        showTree={tab === 'ports'}
        killAllConfirm={killAllConfirm}
        onRefresh={() => {
          void refetchPorts();
          if (tab === 'processes') void refetchProcs();
        }}
        onToggleTree={() => setTree((v) => !v)}
        onKillAll={() => setKillAllConfirm(true)}
        onCancelKillAll={() => setKillAllConfirm(false)}
        onConfirmKillAll={() =>
          killAll.mutate(uniquePids(rows), {
            onSuccess: () => setKillAllConfirm(false),
            onError: fail,
          })
        }
      />
    </Box>
  );
};
