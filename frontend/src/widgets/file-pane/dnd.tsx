import { GridRow } from '@mui/x-data-grid/components';
import type { GridSlotProps } from '@mui/x-data-grid/models';
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefCallback,
} from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { dropModeForDrag, setDropValidity } from '../../features/dnd/dragState';
import type { PaneId } from '../../entities/file/types';
import { allSameParentAsDest, isNestedInSelf } from './helpers';
import type { DragPayload, FileTableProps, FileTableRow } from './types';

// Drop-mode (copy/move) and drop-validity signals live in features/dnd/dragState
// (shared with FileDragLayer); re-exported here since dnd.tsx is the historical
// import path hooks.ts uses.
export { dropModeForDrag } from '../../features/dnd/dragState';

/** react-dnd item type shared by every FileTable row (drag source + drop target). */
export const FILE_ROW_ITEM = 'FILE_ROWS';

interface FileRowContextValue {
  paneId: PaneId;
  selected: string[];
  onDropPaths: FileTableProps['onDropPaths'];
}

const FileRowContext = createContext<FileRowContextValue | null>(null);
export const FileRowProvider = FileRowContext.Provider;

const isParentRow = (name: string): boolean => name === '..';

/** Wails OS file-drop targets (no badge — drop handling only). */
const applyOsDropAttrs = (
  el: HTMLElement | null,
  opts: { enabled: boolean; paneId: PaneId; path: string },
): void => {
  if (!el) return;
  if (!opts.enabled) {
    el.removeAttribute('data-file-drop-target');
    el.removeAttribute('data-drop-kind');
    el.removeAttribute('data-drop-path');
    el.removeAttribute('data-pane-id');
    return;
  }
  el.setAttribute('data-file-drop-target', '');
  el.setAttribute('data-drop-kind', 'folder');
  el.setAttribute('data-drop-path', opts.path);
  el.setAttribute('data-pane-id', opts.paneId);
};

/** DataGrid `slots.row` — react-dnd drag source + directory drop target. */
export const FileGridRow = (props: GridSlotProps['row']) => {
  const ctx = useContext(FileRowContext);
  const row = props.row as FileTableRow;
  const elRef = useRef<HTMLDivElement | null>(null);
  const isFolderDrop = Boolean(row.isDir && !isParentRow(row.name));

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: FILE_ROW_ITEM,
      item: (): DragPayload => {
        const paths =
          ctx!.selected.includes(row.path) && ctx!.selected.length ? ctx!.selected : [row.path];
        return {
          sourcePane: ctx!.paneId,
          paths,
          primary: { name: row.name, isDir: row.isDir },
        };
      },
      canDrag: !isParentRow(row.name),
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [ctx, row],
  );

  const [{ hovered, canDrop }, dropRef] = useDrop<
    DragPayload,
    void,
    { hovered: boolean; canDrop: boolean }
  >(
    () => ({
      accept: FILE_ROW_ITEM,
      canDrop: (item) =>
        isFolderDrop &&
        !isNestedInSelf(item.paths, row.path) &&
        !allSameParentAsDest(item.paths, row.path),
      drop: (item) => ctx!.onDropPaths(item.paths, row.path, item.sourcePane, dropModeForDrag()),
      collect: (monitor) => ({
        hovered: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [ctx, row, isFolderDrop],
  );
  const isOver = hovered && canDrop;

  useEffect(() => {
    if (hovered) setDropValidity(canDrop);
  }, [hovered, canDrop]);

  useLayoutEffect(() => {
    applyOsDropAttrs(elRef.current, {
      enabled: isFolderDrop && Boolean(ctx),
      paneId: ctx?.paneId ?? 'left',
      path: row.path,
    });
  }, [isFolderDrop, ctx, row.path]);

  const setRefs: RefCallback<HTMLDivElement> = (el) => {
    elRef.current = el;
    dragRef(el);
    dropRef(el);
    applyOsDropAttrs(el, {
      enabled: isFolderDrop && Boolean(ctx),
      paneId: ctx?.paneId ?? 'left',
      path: row.path,
    });
  };

  return (
    <GridRow
      {...props}
      ref={setRefs}
      className={[
        props.className,
        isOver ? 'row-drop-target' : '',
        isDragging ? 'row-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
};
