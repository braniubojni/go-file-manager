import { create } from 'zustand';
import type { UpdateInfo } from '../../entities/file/types';

type UpdatePhase = 'idle' | 'checking' | 'upToDate' | 'available' | 'downloading' | 'error';

type UpdateState = {
  phase: UpdatePhase;
  info: UpdateInfo | null;
  error: string;
  setPhase: (phase: UpdatePhase) => void;
  setInfo: (info: UpdateInfo | null) => void;
  setError: (error: string) => void;
  reset: () => void;
};

export const useUpdateStore = create<UpdateState>((set) => ({
  phase: 'idle',
  info: null,
  error: '',
  setPhase: (phase) => set({ phase }),
  setInfo: (info) => set({ info }),
  setError: (error) => set({ error, phase: 'error' }),
  reset: () => set({ phase: 'idle', info: null, error: '' }),
}));
