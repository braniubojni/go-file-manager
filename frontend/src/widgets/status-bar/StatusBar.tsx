import type { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useDirListing, useSettings } from '../../entities/file/queries';
import { usePaneStore } from '../../features/pane/paneStore';

export const StatusBar: FC = () => {
  const activePane = usePaneStore((s) => s.activePane);
  const path = usePaneStore((s) => s.getPath(s.activePane));
  const selection = usePaneStore((s) =>
    s.activePane === 'left' ? s.leftSelection : s.rightSelection,
  );
  const focus = usePaneStore((s) => (s.activePane === 'left' ? s.leftFocus : s.rightFocus));
  const { data: settings } = useSettings();
  const listing = useDirListing(path || undefined, settings?.showHidden ?? false);
  const count = listing.data?.filter((e) => e.name !== '..').length ?? 0;

  const selectedCount = (() => {
    const real = selection.filter((p) => {
      const base = p.split(/[/\\]/).pop();
      return base !== '..';
    });
    if (real.length) return real.length;
    if (focus && focus.split(/[/\\]/).pop() !== '..') return 1;
    return 0;
  })();

  return (
    <Box
      data-testid="status-bar"
      sx={{
        display: 'flex',
        gap: 2,
        px: 1.5,
        py: 0.5,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        alignItems: 'center',
      }}
    >
      <Typography data-testid="status-active-pane" variant="caption" color="text.secondary">
        Active: <strong>{activePane}</strong>
      </Typography>
      <Typography
        data-testid="status-path"
        variant="caption"
        color="text.secondary"
        noWrap
        sx={{ flex: 1, fontFamily: 'monospace' }}
      >
        {path}
      </Typography>
      <Typography data-testid="status-items" variant="caption" color="text.secondary">
        Items: {count}
      </Typography>
      <Typography data-testid="status-selected" variant="caption" color="text.secondary">
        Selected: {selectedCount}
      </Typography>
    </Box>
  );
};
