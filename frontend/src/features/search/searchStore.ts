import { create } from 'zustand';

type SearchState = {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

export const useSearchStore = create<SearchState>((set) => ({
  open: false,
  openSearch: () => set({ open: true }),
  closeSearch: () => set({ open: false }),
}));
