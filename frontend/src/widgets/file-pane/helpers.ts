import ArchiveIcon from '@mui/icons-material/Archive';
import StorageIcon from '@mui/icons-material/Storage';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import type { GridSortModel } from '@mui/x-data-grid';
import type { KeyboardEvent, ReactElement } from 'react';
import { createElement } from 'react';
import type { FileEntry, PaneId } from '../../entities/file/types';
import { useFolderSizeStore } from '../../features/folder-size/folderSizeStore';
import type { PaneJobKind } from '../../features/jobs/types';
import { usePaneStore } from '../../features/pane/paneStore';
import { useTerminalStore } from '../../features/terminal/terminalStore';
import { jobKindIconSx } from './styles';
import { FileTableRow } from './types';

/** Side effects that must run whenever a pane's active tab lands on a new
 * directory, from any entry point (in-tab navigate, history, tab switch,
 * new/close tab, go-to, keyboard). Kept as one function so they can't drift. */
export const enterPaneTab = (id: PaneId, path: string): void => {
  useFolderSizeStore.getState().clear(id);
  if (path.startsWith('ssh://') && useTerminalStore.getState().isOpen(id)) {
    useTerminalStore.getState().toggle(id);
  }
};

/** History back/forward + enterPaneTab side effects. Returns false if stack empty. */
export const historyNav = (id: PaneId, dir: 'back' | 'forward'): boolean => {
  const store = usePaneStore.getState();
  const ok = dir === 'back' ? store.goBack(id) : store.goForward(id);
  if (ok) enterPaneTab(id, store.getPath(id));
  return ok;
};

export const jobKindIcon = (kind: PaneJobKind): ReactElement => {
  const props = { sx: jobKindIconSx };
  switch (kind) {
    case 'archive':
      return createElement(ArchiveIcon, props);
    case 'extract':
      return createElement(UnarchiveIcon, props);
    case 'sizes':
    default:
      return createElement(StorageIcon, props);
  }
};

/** Parent directory for local or ssh:// paths. */
export const parentOfPath = (path: string): string => {
  if (path.startsWith('ssh://')) {
    const m = path.match(/^(ssh:\/\/[^/]+)(\/.*)?$/);
    if (m) {
      const base = m[1];
      const p = m[2] || '/';
      const parent = p.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/';
      return `${base}${parent === '/' ? '/' : parent}`;
    }
  }
  const parent = path.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/';
  const fixed =
    path.startsWith('/') && !parent.startsWith('/') ? `/${parent}`.replace(/\/+/g, '/') : parent;
  return fixed || '/';
};

export const isNestedInSelf = (paths: string[], dest: string): boolean =>
  paths.some((p) => p === dest || dest.startsWith(p + '/') || dest.startsWith(p + '\\'));

export const allSameParentAsDest = (paths: string[], dest: string): boolean => {
  const destNorm = dest.replace(/\/+$/, '');
  return paths.every((p) => {
    const parent = p.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/';
    return parent === dest || parent === destNorm;
  });
};

/** Short tab label: basename, "host:/basename" for ssh://, or "/" for a root. */
export const tabLabel = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('ssh://')) {
    const m = path.match(/^ssh:\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?(\/.*)?$/);
    const host = m?.[1] ?? 'ssh';
    const rest = (m?.[2] ?? '/').replace(/\/+$/, '');
    const base = rest.split('/').filter(Boolean).pop();
    return `${host}:/${base ?? ''}`;
  }
  const trimmed = path.replace(/[/\\]+$/, '');
  const base = trimmed.split(/[/\\]/).pop();
  return base || '/';
};

export const mapChildSizes = (
  map: { [key: string]: number | undefined } | null | undefined,
): Record<string, number> => {
  const sizes: Record<string, number> = {};
  if (map) {
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === 'number') sizes[k] = v;
    }
  }
  return sizes;
};

export const displayName = (e: FileEntry, showExtensions: boolean): string => {
  if (e.isDir || showExtensions || e.name === '..') return e.name;
  const i = e.name.lastIndexOf('.');
  if (i <= 0) return e.name;
  return e.name.slice(0, i);
};

export const sizeValue = (e: FileEntry, folderSizes?: Record<string, number>): number => {
  if (e.isDir && folderSizes && folderSizes[e.path] != null) return folderSizes[e.path];
  return e.size;
};

export const typeValue = (e: FileEntry): string => {
  return e.isDir ? 'dir' : e.ext || 'file';
};

const compareRows = (
  a: FileTableRow,
  b: FileTableRow,
  field: string,
  folderSizes?: Record<string, number>,
): number => {
  switch (field) {
    case 'displayName': {
      const an = a.displayName.toLowerCase();
      const bn = b.displayName.toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    }
    case 'size':
      return sizeValue(a, folderSizes) - sizeValue(b, folderSizes);
    case 'modTime':
      return a.modTime - b.modTime;
    case 'ext':
      return typeValue(a).localeCompare(typeValue(b));
    default:
      return a.displayName.localeCompare(b.displayName);
  }
};

/**
 * Sort rows with fixed hierarchy:
 * 1. `..` always first
 * 2. folders (sorted by active column)
 * 3. files (sorted by active column)
 */
export const sortRowsPinParent = (
  rows: FileTableRow[],
  sortModel: GridSortModel,
  folderSizes?: Record<string, number>,
): FileTableRow[] => {
  const parent = rows.find((r) => r.name === '..');
  const rest = rows.filter((r) => r.name !== '..');
  const dirs = rest.filter((r) => r.isDir);
  const files = rest.filter((r) => !r.isDir);
  const sort = sortModel[0];
  if (sort?.field) {
    const dir = sort.sort === 'desc' ? -1 : 1;
    const cmp = (a: FileTableRow, b: FileTableRow) =>
      dir * compareRows(a, b, sort.field, folderSizes);
    dirs.sort(cmp);
    files.sort(cmp);
  } else {
    // Stable default: name asc within each group
    const byName = (a: FileTableRow, b: FileTableRow) =>
      compareRows(a, b, 'displayName', folderSizes);
    dirs.sort(byName);
    files.sort(byName);
  }
  return parent ? [parent, ...dirs, ...files] : [...dirs, ...files];
};

export const isCellKeyboardEvent = (key: KeyboardEvent['key'], code: KeyboardEvent['code']) =>
  key === 'ArrowDown' ||
  key === 'ArrowUp' ||
  key === 'ArrowLeft' ||
  key === 'ArrowRight' ||
  key === 'Enter' ||
  key === 'Home' ||
  key === 'End' ||
  key === ' ' ||
  code === 'Space';
