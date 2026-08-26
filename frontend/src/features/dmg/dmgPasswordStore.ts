import { create } from 'zustand';
import type { PaneId } from '../../entities/file/types';

type DmgPasswordState = {
  open: boolean;
  path: string;
  paneId: PaneId;
  error: string;
  prompt: (path: string, paneId: PaneId, error?: string) => void;
  close: () => void;
};

export const useDmgPasswordStore = create<DmgPasswordState>((set) => ({
  open: false,
  path: '',
  paneId: 'left',
  error: '',
  prompt: (path, paneId, error = '') => set({ open: true, path, paneId, error }),
  close: () => set({ open: false, path: '', error: '' }),
}));
