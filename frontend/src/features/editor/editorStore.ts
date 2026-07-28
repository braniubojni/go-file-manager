import { create } from 'zustand';

export type EditorMode = 'edit' | 'diff';

export type EditorState = {
  open: boolean;
  mode: EditorMode;
  rootPath: string;
  filePath: string | null;
  dirty: boolean;
  openWorkspace: (rootPath: string, filePath: string) => void;
  openDiff: (rootPath: string, filePath: string) => void;
  /** Switch edit ↔ diff without closing (same file). */
  setMode: (mode: EditorMode) => void;
  setFilePath: (filePath: string) => void;
  setDirty: (dirty: boolean) => void;
  closeWorkspace: () => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  open: false,
  mode: 'edit',
  rootPath: '',
  filePath: null,
  dirty: false,
  openWorkspace: (rootPath, filePath) =>
    set({ open: true, mode: 'edit', rootPath, filePath, dirty: false }),
  openDiff: (rootPath, filePath) =>
    set({ open: true, mode: 'diff', rootPath, filePath, dirty: false }),
  setMode: (mode) => set((s) => ({ mode, dirty: mode === 'diff' ? false : s.dirty })),
  setFilePath: (filePath) => set({ filePath, dirty: false, mode: 'edit' }),
  setDirty: (dirty) => set({ dirty }),
  closeWorkspace: () =>
    set({ open: false, mode: 'edit', rootPath: '', filePath: null, dirty: false }),
}));

/** Parent directory of a file path (local). */
export const parentDirOf = (filePath: string): string => {
  const parent = filePath.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/';
  if (filePath.startsWith('/') && !parent.startsWith('/')) {
    return `/${parent}`.replace(/\/+/g, '/') || '/';
  }
  return parent || '/';
};
