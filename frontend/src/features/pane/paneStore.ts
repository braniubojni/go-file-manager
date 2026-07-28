import { create } from 'zustand';
import type { PaneId } from '../../entities/file/types';

const MAX_HISTORY = 100;

const isParentEntry = (path: string): boolean => {
  const base = path.split(/[/\\]/).pop();
  return base === '..';
};

const pushCapped = (stack: string[], path: string): string[] => {
  const next = [...stack, path];
  if (next.length > MAX_HISTORY) return next.slice(next.length - MAX_HISTORY);
  return next;
};

let seq = 0;
const newTabId = (): string => `t${++seq}`;

export interface PaneTab {
  id: string;
  path: string;
  back: string[];
  forward: string[];
}

const newTab = (path: string): PaneTab => ({ id: newTabId(), path, back: [], forward: [] });

interface PaneState {
  activePane: PaneId;
  leftTabs: PaneTab[];
  leftIndex: number;
  rightTabs: PaneTab[];
  rightIndex: number;
  /** Multi-select targets for actions */
  leftSelection: string[];
  rightSelection: string[];
  /** Keyboard/mouse cursor (focus) — independent of multi-select */
  leftFocus: string;
  rightFocus: string;
  /** Anchor for Shift+click range */
  leftAnchor: string;
  rightAnchor: string;
  ready: boolean;
  setActivePane: (id: PaneId) => void;
  setPath: (id: PaneId, path: string) => void;
  navigate: (id: PaneId, path: string) => void;
  goBack: (id: PaneId) => boolean;
  goForward: (id: PaneId) => boolean;
  canGoBack: (id: PaneId) => boolean;
  canGoForward: (id: PaneId) => boolean;
  hydrateTabs: (
    leftTabs: PaneTab[],
    leftIndex: number,
    rightTabs: PaneTab[],
    rightIndex: number,
  ) => void;
  addTab: (id: PaneId, path: string) => void;
  closeTab: (id: PaneId, tabId: string) => void;
  selectTab: (id: PaneId, tabId: string) => void;
  getTabs: (id: PaneId) => PaneTab[];
  getTabIndex: (id: PaneId) => number;
  setSelection: (id: PaneId, paths: string[]) => void;
  /** Set keyboard cursor. Pass keepAnchor for Shift+arrow / Shift+click range. */
  setFocus: (id: PaneId, path: string, opts?: { keepAnchor?: boolean }) => void;
  /** Space: toggle focus path in multi-select */
  toggleMultiSelect: (id: PaneId, path: string) => void;
  /** Shift range from anchor to path using ordered row paths */
  selectRange: (id: PaneId, orderedPaths: string[], toPath: string) => void;
  clearSelection: (id?: PaneId) => void;
  getPath: (id: PaneId) => string;
  getSelection: (id: PaneId) => string[];
  getFocus: (id: PaneId) => string;
  /** Paths for copy/move/delete/archive — multi-select if any, else focus */
  getActionPaths: (id: PaneId) => string[];
  otherPane: (id: PaneId) => PaneId;
}

/** Patch the active tab of pane `id` via `fn`, returning a partial state update. */
const patchActiveTab = (
  s: PaneState,
  id: PaneId,
  fn: (t: PaneTab) => PaneTab,
): Partial<PaneState> =>
  id === 'left'
    ? { leftTabs: s.leftTabs.map((t, i) => (i === s.leftIndex ? fn(t) : t)) }
    : { rightTabs: s.rightTabs.map((t, i) => (i === s.rightIndex ? fn(t) : t)) };

const clearSel = (id: PaneId): Partial<PaneState> =>
  id === 'left'
    ? { leftSelection: [], leftFocus: '', leftAnchor: '' }
    : { rightSelection: [], rightFocus: '', rightAnchor: '' };

export const usePaneStore = create<PaneState>((set, get) => ({
  activePane: 'left',
  leftTabs: [newTab('')],
  leftIndex: 0,
  rightTabs: [newTab('')],
  rightIndex: 0,
  leftSelection: [],
  rightSelection: [],
  leftFocus: '',
  rightFocus: '',
  leftAnchor: '',
  rightAnchor: '',
  ready: false,

  setActivePane: (id) => set({ activePane: id }),

  setPath: (id, path) =>
    set((s) => ({
      ...patchActiveTab(s, id, (t) => ({ ...t, path })),
      ...clearSel(id),
    })),

  navigate: (id, path) => {
    const current = get().getPath(id);
    if (!path || path === current) return;
    set((s) => ({
      ...patchActiveTab(s, id, (t) => ({
        ...t,
        path,
        back: current ? pushCapped(t.back, current) : t.back,
        forward: [],
      })),
      ...clearSel(id),
    }));
  },

  goBack: (id) => {
    const s = get();
    const tabs = s.getTabs(id);
    const idx = s.getTabIndex(id);
    const tab = tabs[idx];
    if (!tab || !tab.back.length) return false;
    const current = tab.path;
    const prev = tab.back[tab.back.length - 1];
    set((st) => ({
      ...patchActiveTab(st, id, (t) => ({
        ...t,
        path: prev,
        back: t.back.slice(0, -1),
        forward: current ? pushCapped(t.forward, current) : t.forward,
      })),
      ...clearSel(id),
    }));
    return true;
  },

  goForward: (id) => {
    const s = get();
    const tabs = s.getTabs(id);
    const idx = s.getTabIndex(id);
    const tab = tabs[idx];
    if (!tab || !tab.forward.length) return false;
    const current = tab.path;
    const next = tab.forward[tab.forward.length - 1];
    set((st) => ({
      ...patchActiveTab(st, id, (t) => ({
        ...t,
        path: next,
        forward: t.forward.slice(0, -1),
        back: current ? pushCapped(t.back, current) : t.back,
      })),
      ...clearSel(id),
    }));
    return true;
  },

  canGoBack: (id) => {
    const tabs = get().getTabs(id);
    const tab = tabs[get().getTabIndex(id)];
    return !!tab && tab.back.length > 0;
  },
  canGoForward: (id) => {
    const tabs = get().getTabs(id);
    const tab = tabs[get().getTabIndex(id)];
    return !!tab && tab.forward.length > 0;
  },

  hydrateTabs: (leftTabs, leftIndex, rightTabs, rightIndex) =>
    set({
      leftTabs,
      leftIndex,
      rightTabs,
      rightIndex,
      ready: true,
      leftSelection: [],
      rightSelection: [],
      leftFocus: '',
      rightFocus: '',
      leftAnchor: '',
      rightAnchor: '',
    }),

  addTab: (id, path) =>
    set((s) => {
      const tabs = id === 'left' ? s.leftTabs : s.rightTabs;
      const idx = id === 'left' ? s.leftIndex : s.rightIndex;
      const nextTabs = [...tabs.slice(0, idx + 1), newTab(path), ...tabs.slice(idx + 1)];
      return {
        ...(id === 'left'
          ? { leftTabs: nextTabs, leftIndex: idx + 1 }
          : { rightTabs: nextTabs, rightIndex: idx + 1 }),
        ...clearSel(id),
        activePane: id,
      };
    }),

  closeTab: (id, tabId) =>
    set((s) => {
      const tabs = id === 'left' ? s.leftTabs : s.rightTabs;
      const idx = id === 'left' ? s.leftIndex : s.rightIndex;
      if (tabs.length <= 1) return {};
      const closedIdx = tabs.findIndex((t) => t.id === tabId);
      if (closedIdx < 0) return {};
      const nextTabs = tabs.filter((t) => t.id !== tabId);
      let nextIdx = idx;
      if (closedIdx === idx) {
        nextIdx = Math.max(0, closedIdx - 1);
      } else if (closedIdx < idx) {
        nextIdx = idx - 1;
      }
      nextIdx = Math.min(nextIdx, nextTabs.length - 1);
      // Always clear selection: action paths are per-pane, not per-tab.
      // Closing the active tab would otherwise leave paths from the old dir.
      return {
        ...(id === 'left'
          ? { leftTabs: nextTabs, leftIndex: nextIdx }
          : { rightTabs: nextTabs, rightIndex: nextIdx }),
        ...clearSel(id),
      };
    }),

  selectTab: (id, tabId) =>
    set((s) => {
      const tabs = id === 'left' ? s.leftTabs : s.rightTabs;
      const idx = tabs.findIndex((t) => t.id === tabId);
      if (idx < 0) return {};
      return {
        ...(id === 'left' ? { leftIndex: idx } : { rightIndex: idx }),
        ...clearSel(id),
        activePane: id,
      };
    }),

  getTabs: (id) => (id === 'left' ? get().leftTabs : get().rightTabs),
  getTabIndex: (id) => (id === 'left' ? get().leftIndex : get().rightIndex),

  setSelection: (id, paths) =>
    set(
      id === 'left'
        ? { leftSelection: paths.filter((p) => !isParentEntry(p)) }
        : { rightSelection: paths.filter((p) => !isParentEntry(p)) },
    ),

  setFocus: (id, path, opts) =>
    set((s) => {
      if (opts?.keepAnchor) {
        return id === 'left' ? { leftFocus: path } : { rightFocus: path };
      }
      // When starting a new focus, keep prior anchor if empty path (no-op edge)
      return id === 'left'
        ? { leftFocus: path, leftAnchor: path || s.leftAnchor }
        : { rightFocus: path, rightAnchor: path || s.rightAnchor };
    }),

  toggleMultiSelect: (id, path) => {
    if (isParentEntry(path)) return;
    const key = id === 'left' ? 'leftSelection' : 'rightSelection';
    const current = get()[key];
    if (current.includes(path)) {
      set({ [key]: current.filter((p) => p !== path) });
    } else {
      set({ [key]: [...current, path] });
    }
  },

  selectRange: (id, orderedPaths, toPath) => {
    const anchor = id === 'left' ? get().leftAnchor : get().rightAnchor;
    const startPath = anchor || toPath;
    let i = orderedPaths.indexOf(startPath);
    let j = orderedPaths.indexOf(toPath);
    if (i < 0) i = j;
    if (j < 0) j = i;
    if (i < 0 || j < 0) return;
    const [a, b] = i <= j ? [i, j] : [j, i];
    const range = orderedPaths.slice(a, b + 1).filter((p) => !isParentEntry(p));
    if (id === 'left') {
      set({ leftSelection: range, leftFocus: toPath });
    } else {
      set({ rightSelection: range, rightFocus: toPath });
    }
  },

  clearSelection: (id) => {
    if (!id) {
      set({ leftSelection: [], rightSelection: [] });
      return;
    }
    set(id === 'left' ? { leftSelection: [] } : { rightSelection: [] });
  },

  getPath: (id) => {
    const tabs = get().getTabs(id);
    const tab = tabs[get().getTabIndex(id)];
    return tab?.path ?? '';
  },
  getSelection: (id) => (id === 'left' ? get().leftSelection : get().rightSelection),
  getFocus: (id) => (id === 'left' ? get().leftFocus : get().rightFocus),

  getActionPaths: (id) => {
    const sel = get()
      .getSelection(id)
      .filter((p) => !isParentEntry(p));
    if (sel.length) return sel;
    const focus = get().getFocus(id);
    if (focus && !isParentEntry(focus)) return [focus];
    return [];
  },

  otherPane: (id) => (id === 'left' ? 'right' : 'left'),
}));
