import { create } from 'zustand';

type CommandPaletteState = {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
};

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  openPalette: () => set({ open: true }),
  closePalette: () => set({ open: false }),
}));
