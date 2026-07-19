import { create } from 'zustand'

interface DialogState {
  settingsOpen: boolean
  shortcutsOpen: boolean
  openSettings: () => void
  openShortcuts: () => void
  closeSettings: () => void
  closeShortcuts: () => void
}

export const useDialogStore = create<DialogState>((set) => ({
  settingsOpen: false,
  shortcutsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  closeShortcuts: () => set({ shortcutsOpen: false }),
}))
