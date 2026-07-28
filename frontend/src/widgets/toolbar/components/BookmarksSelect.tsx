import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { useBookmarks, useFileOps } from '../../../entities/file/queries';
import { usePaneStore } from '../../../features/pane/paneStore';
import { errMessage } from '../../../shared/lib/format';
import { useSnack } from '../../../shared/ui/SnackbarHost';
import { enterPaneTab } from '../../file-pane/helpers';
import type { BookmarksSelectProps } from '../types';

export const BookmarksSelect: FC<BookmarksSelectProps> = ({ activePane }) => {
  const { data: bookmarks = [] } = useBookmarks();
  const ops = useFileOps();
  const navigateStore = usePaneStore((s) => s.navigate);
  const show = useSnack((s) => s.show);

  return (
    <Select
      data-testid="select-bookmarks"
      size="small"
      displayEmpty
      value=""
      sx={{ minWidth: 160, ml: 0.5 }}
      renderValue={() => 'Bookmarks'}
      onChange={(e) => {
        const p = String(e.target.value);
        if (!p) return;
        enterPaneTab(activePane, p);
        navigateStore(activePane, p);
      }}
    >
      {bookmarks.length === 0 && (
        <MenuItem disabled value="">
          No bookmarks
        </MenuItem>
      )}
      {bookmarks.map((b) => (
        <MenuItem key={b.id} value={b.path}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
            <span>{b.name}</span>
            <Typography
              component="span"
              variant="caption"
              color="error"
              onClick={(ev) => {
                ev.stopPropagation();
                ops.removeBookmark.mutate(b.id, {
                  onError: (e) => show(errMessage(e), 'error'),
                });
              }}
            >
              remove
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
};
