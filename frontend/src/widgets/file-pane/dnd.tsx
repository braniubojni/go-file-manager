import { GridRow } from '@mui/x-data-grid/components';
import type { GridSlotProps } from '@mui/x-data-grid/models';
import { createContext, useContext, type RefCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { PaneId } from '../../entities/file/types';
import type { DragPayload, FileTableProps, FileTableRow } from './types';

/** react-dnd item type shared by every FileTable row (drag source + drop target). */
export const FILE_ROW_ITEM = 'FILE_ROWS';

/** Ctrl-drop = move, plain drop = copy — same rule the old native dragover/drop
 * handlers used (`e.ctrlKey`). react-dnd's monitor doesn't expose keyboard
 * modifiers, so track it with one module-level listener pair instead of one
 * per FileTable instance (there are always exactly two: left + right pane). */
const ctrlHeld = { current: false };
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Control') ctrlHeld.current = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Control') ctrlHeld.current = false;
  });
  // Don't get stuck in "move" if Ctrl was released while the window was unfocused.
  window.addEventListener('blur', () => {
    ctrlHeld.current = false;
  });
}
export const dropModeForDrag = (): 'copy' | 'move' => (ctrlHeld.current ? 'move' : 'copy');

interface FileRowContextValue {
  paneId: PaneId;
  selected: string[];
  onDropPaths: FileTableProps['onDropPaths'];
}

const FileRowContext = createContext<FileRowContextValue | null>(null);
export const FileRowProvider = FileRowContext.Provider;

const isParentRow = (name: string): boolean => name === '..';

/** DataGrid `slots.row` override — makes each row a react-dnd drag source, and
 * (for directories) a drop target. Replaces the old native-DataTransfer +
 * MutationObserver approach; wraps MUI's own `GridRow` (which forwards its
 * ref to the row's root element) so no extra wrapper div is introduced. */
export const FileGridRow = (props: GridSlotProps['row']) => {
  const ctx = useContext(FileRowContext);
  const row = props.row as FileTableRow;

  const [, dragRef] = useDrag(
    () => ({
      type: FILE_ROW_ITEM,
      item: (): DragPayload => ({
        sourcePane: ctx!.paneId,
        paths:
          ctx!.selected.includes(row.path) && ctx!.selected.length ? ctx!.selected : [row.path],
      }),
      canDrag: !isParentRow(row.name),
    }),
    [ctx, row],
  );

  const [{ isOver }, dropRef] = useDrop<DragPayload, void, { isOver: boolean }>(
    () => ({
      accept: FILE_ROW_ITEM,
      canDrop: () => row.isDir && !isParentRow(row.name),
      drop: (item) => ctx!.onDropPaths(item.paths, row.path, item.sourcePane, dropModeForDrag()),
      collect: (monitor) => ({ isOver: monitor.isOver() && monitor.canDrop() }),
    }),
    [ctx, row],
  );

  const setRefs: RefCallback<HTMLDivElement> = (el) => {
    dragRef(el);
    dropRef(el);
  };

  return (
    <GridRow
      {...props}
      ref={setRefs}
      className={[props.className, isOver ? 'row-drop-target' : ''].filter(Boolean).join(' ')}
    />
  );
};
