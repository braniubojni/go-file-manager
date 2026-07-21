import { create } from 'zustand'

type GoToState = {
  open: boolean
  openGoTo: () => void
  closeGoTo: () => void
}

export const useGoToStore = create<GoToState>((set) => ({
  open: false,
  openGoTo: () => set({ open: true }),
  closeGoTo: () => set({ open: false }),
}))
