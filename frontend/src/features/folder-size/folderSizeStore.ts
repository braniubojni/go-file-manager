import { create } from 'zustand';
import type { PaneId } from '../../entities/file/types';

interface PaneSizeState {
  loading: boolean;
  /** path -> recursive size in bytes */
  sizes: Record<string, number>;
  /** Children the walk could not fully read — rendered as "No access". */
  denied: Set<string>;
  generation: number;
}

interface FolderSizeState {
  left: PaneSizeState;
  right: PaneSizeState;
  isLoading: (id: PaneId) => boolean;
  getSizes: (id: PaneId) => Record<string, number>;
  getDenied: (id: PaneId) => Set<string>;
  begin: (id: PaneId) => number;
  finish: (id: PaneId, generation: number, sizes: Record<string, number>, denied: string[]) => void;
  fail: (id: PaneId, generation: number) => void;
  clear: (id: PaneId) => void;
  swap: () => void;
}

const empty = (): PaneSizeState => ({
  loading: false,
  sizes: {},
  denied: new Set(),
  generation: 0,
});

export const useFolderSizeStore = create<FolderSizeState>((set, get) => ({
  left: empty(),
  right: empty(),

  isLoading: (id) => (id === 'left' ? get().left : get().right).loading,
  getSizes: (id) => (id === 'left' ? get().left : get().right).sizes,
  getDenied: (id) => (id === 'left' ? get().left : get().right).denied,

  begin: (id) => {
    const key = id === 'left' ? 'left' : 'right';
    const gen = get()[key].generation + 1;
    set({ [key]: { loading: true, sizes: {}, denied: new Set(), generation: gen } });
    return gen;
  },

  finish: (id, generation, sizes, denied) => {
    const key = id === 'left' ? 'left' : 'right';
    const cur = get()[key];
    if (cur.generation !== generation) return;
    set({ [key]: { loading: false, sizes, denied: new Set(denied), generation } });
  },

  fail: (id, generation) => {
    const key = id === 'left' ? 'left' : 'right';
    const cur = get()[key];
    if (cur.generation !== generation) return;
    set({ [key]: { loading: false, sizes: {}, denied: new Set(), generation } });
  },

  clear: (id) => {
    const key = id === 'left' ? 'left' : 'right';
    set({ [key]: empty() });
  },

  // Sizes are keyed by path, so they must follow the directory to the other pane.
  swap: () => set((s) => ({ left: s.right, right: s.left })),
}));
