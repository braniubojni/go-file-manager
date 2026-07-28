import { create } from 'zustand';

export type EditorState = {
  open: boolean;
  rootPath: string;
  filePath: string | null;
  dirty: boolean;
  openWorkspace: (rootPath: string, filePath: string) => void;
  setFilePath: (filePath: string) => void;
  setDirty: (dirty: boolean) => void;
  closeWorkspace: () => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  open: false,
  rootPath: '',
  filePath: null,
  dirty: false,
  openWorkspace: (rootPath, filePath) => set({ open: true, rootPath, filePath, dirty: false }),
  setFilePath: (filePath) => set({ filePath, dirty: false }),
  setDirty: (dirty) => set({ dirty }),
  closeWorkspace: () => set({ open: false, rootPath: '', filePath: null, dirty: false }),
}));

/** Parent directory of a file path (local). */
export const parentDirOf = (filePath: string): string => {
  const parent = filePath.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/';
  if (filePath.startsWith('/') && !parent.startsWith('/')) {
    return `/${parent}`.replace(/\/+/g, '/') || '/';
  }
  return parent || '/';
};
