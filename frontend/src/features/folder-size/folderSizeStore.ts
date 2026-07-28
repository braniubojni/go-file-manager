import { create } from 'zustand';
import type { PaneId } from '../../entities/file/types';

interface PaneSizeState {
  loading: boolean;
  /** path -> recursive size in bytes */
  sizes: Record<string, number>;
  generation: number;
}

interface FolderSizeState {
  left: PaneSizeState;
  right: PaneSizeState;
  isLoading: (id: PaneId) => boolean;
  getSizes: (id: PaneId) => Record<string, number>;
  begin: (id: PaneId) => number;
  finish: (id: PaneId, generation: number, sizes: Record<string, number>) => void;
  fail: (id: PaneId, generation: number) => void;
  clear: (id: PaneId) => void;
}

const empty = (): PaneSizeState => ({ loading: false, sizes: {}, generation: 0 });

export const useFolderSizeStore = create<FolderSizeState>((set, get) => ({
  left: empty(),
  right: empty(),

  isLoading: (id) => (id === 'left' ? get().left : get().right).loading,
  getSizes: (id) => (id === 'left' ? get().left : get().right).sizes,

  begin: (id) => {
    const key = id === 'left' ? 'left' : 'right';
    const gen = get()[key].generation + 1;
    set({ [key]: { loading: true, sizes: {}, generation: gen } });
    return gen;
  },

  finish: (id, generation, sizes) => {
    const key = id === 'left' ? 'left' : 'right';
    const cur = get()[key];
    if (cur.generation !== generation) return;
    set({ [key]: { loading: false, sizes, generation } });
  },

  fail: (id, generation) => {
    const key = id === 'left' ? 'left' : 'right';
    const cur = get()[key];
    if (cur.generation !== generation) return;
    set({ [key]: { loading: false, sizes: {}, generation } });
  },

  clear: (id) => {
    const key = id === 'left' ? 'left' : 'right';
    set({ [key]: empty() });
  },
}));
