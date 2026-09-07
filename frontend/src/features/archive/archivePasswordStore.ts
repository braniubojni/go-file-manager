import { create } from 'zustand';

type ArchivePasswordState = {
  open: boolean;
  path: string;
  onSuccess: (() => void) | null;
  /** Opens the dialog for path; onSuccess runs once FileService.SetArchivePassword
   * validates the password, so the caller can retry whatever needed it. */
  prompt: (path: string, onSuccess: () => void) => void;
  close: () => void;
};

export const useArchivePasswordStore = create<ArchivePasswordState>((set) => ({
  open: false,
  path: '',
  onSuccess: null,
  prompt: (path, onSuccess) => set({ open: true, path, onSuccess }),
  close: () => set({ open: false, path: '', onSuccess: null }),
}));
