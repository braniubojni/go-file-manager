import { create } from 'zustand';
import type { FileEntry, PaneId } from '../../entities/file/types';

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  paneId: PaneId;
  /** Null when the click landed on empty pane space rather than a row. */
  entry: FileEntry | null;
  /** Directory the pane is showing (used for the empty-space actions). */
  panePath: string;
  show: (args: {
    x: number;
    y: number;
    paneId: PaneId;
    panePath: string;
    entry: FileEntry | null;
  }) => void;
  close: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  open: false,
  x: 0,
  y: 0,
  paneId: 'left',
  entry: null,
  panePath: '',
  show: ({ x, y, paneId, panePath, entry }) => set({ open: true, x, y, paneId, panePath, entry }),
  close: () => set({ open: false, entry: null }),
}));
