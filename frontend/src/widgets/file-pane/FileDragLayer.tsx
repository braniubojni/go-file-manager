import Box from '@mui/material/Box';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useDragLayer } from 'react-dnd';
import {
  dropModeForDrag,
  dropValidity,
  setDropValidity,
  subscribeDropMode,
  subscribeDropValidity,
} from '../../features/dnd/dragState';
import type { FileEntry } from '../../entities/file/types';
import { FileTypeIcon } from '../../shared/ui/FileTypeIcon';
import { FILE_ROW_ITEM } from './dnd';
import type { DragPayload } from './types';

/**
 * In-app only (ghost card + badge). OS/Finder drops intentionally have no
 * preview — Wails/the OS already draws its own.
 *
 * Badge: `+` copy (default), `−` move while ⌘ (macOS) / Ctrl (Win/Linux) is
 * held, `⊘` when hovering an invalid target (not a folder, self, or already
 * the item's parent).
 *
 * Also owns the `gfm-file-dragging` / `gfm-drop-invalid` body classes (see
 * theme.tsx) — driven by `useDragLayer`, which stays mounted for the whole
 * drag regardless of DataGrid row virtualization, unlike the dragged row
 * itself.
 */
export const FileDragLayer: FC = () => {
  const { isDragging, item, clientOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging() && monitor.getItemType() === FILE_ROW_ITEM,
    item: monitor.getItem() as DragPayload | null,
    clientOffset: monitor.getClientOffset(),
  }));

  const [mode, setMode] = useState<'copy' | 'move'>(dropModeForDrag);
  const [valid, setValid] = useState(dropValidity);

  useEffect(() => subscribeDropMode(() => setMode(dropModeForDrag())), []);
  useEffect(() => subscribeDropValidity(() => setValid(dropValidity())), []);

  useEffect(() => {
    if (!isDragging) {
      setDropValidity(true);
      return;
    }
    // Require an explicit valid target under the cursor (folder / pane).
    setDropValidity(false);
    document.body.classList.add('gfm-file-dragging');
    // The first few px before the drag threshold can already have painted a
    // native text selection; drop it (CSS only blocks new selection).
    window.getSelection()?.removeAllRanges();
    return () => {
      document.body.classList.remove('gfm-file-dragging', 'gfm-drop-invalid');
      window.getSelection()?.removeAllRanges();
      setDropValidity(true);
    };
  }, [isDragging]);

  useEffect(() => {
    document.body.classList.toggle('gfm-drop-invalid', isDragging && !valid);
  }, [isDragging, valid]);

  if (!isDragging || !clientOffset || !item) return null;

  const count = item.paths.length;
  const badge = !valid ? '⊘' : mode === 'move' ? '−' : '+';
  const badgeColor = !valid ? 'error.main' : mode === 'move' ? 'warning.main' : 'success.main';
  const { x, y } = clientOffset;

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        left: x + 10,
        top: y + 10,
        zIndex: 10000,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 0.6,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          py: 0.4,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          boxShadow: 3,
          opacity: 0.92,
          maxWidth: 220,
        }}
      >
        {/* FileTypeIcon only reads isDir/isSymlink/name/ext; the drag payload
            doesn't carry the rest of FileEntry, so a partial cast is fine here. */}
        <FileTypeIcon
          entry={{ isDir: item.primary.isDir, name: item.primary.name } as FileEntry}
          fontSize="small"
        />
        <Box
          component="span"
          sx={{
            fontSize: 12,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.primary.name}
        </Box>
        {count > 1 && (
          <Box
            sx={{
              minWidth: 16,
              height: 16,
              px: 0.4,
              borderRadius: 0.75,
              bgcolor: 'action.selected',
              color: 'text.primary',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {count}
          </Box>
        )}
      </Box>
      <Box
        sx={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 13,
          lineHeight: 1,
          color: '#fff',
          bgcolor: badgeColor,
          boxShadow: 2,
          userSelect: 'none',
        }}
      >
        {badge}
      </Box>
    </Box>
  );
};
