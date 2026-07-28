import type { FileEntry, PaneId } from '../../entities/file/types';

export type DragPayload = {
  sourcePane: PaneId;
  paths: string[];
};

export type FileTableRow = FileEntry & { id: string; displayName: string };

export type FilePaneProps = {
  id: PaneId;
};

export type PathBarProps = {
  paneId: PaneId;
  path: string;
  onNavigate: (path: string) => void;
  onUp: () => void;
  onHome: () => void;
  onFocusPane: () => void;
};

export type FileTableProps = {
  paneId: PaneId;
  /** Current directory of this pane (drop target default). */
  panePath: string;
  entries: FileEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  selected: string[];
  focused: string;
  active: boolean;
  showExtensions: boolean;
  /** Basename → git status code (M/A/D/U/?). Empty when disabled or not a repo. */
  gitByName?: Map<string, string>;
  folderSizes?: Record<string, number>;
  /** @deprecated overlay removed — sizes use pane header job spinner */
  sizesLoading?: boolean;
  onSelect: (paths: string[]) => void;
  onFocus: (path: string, opts?: { keepAnchor?: boolean }) => void;
  onToggleMulti: (path: string) => void;
  onSelectRange: (orderedPaths: string[], toPath: string) => void;
  onActivate: () => void;
  onOpen: (entry: FileEntry) => void;
  /** mode: default drop is copy; Ctrl-drop is move. */
  onDropPaths: (
    paths: string[],
    destDir: string,
    sourcePane: PaneId,
    mode: 'copy' | 'move',
  ) => void;
  /** Optional: notify parent of sorted row paths for range select / keyboard */
  onSortedPathsChange?: (paths: string[]) => void;
};
