import { create } from 'zustand'
import type { PaneId } from '../../entities/file/types'

const MIN_HEIGHT = 100
const MAX_HEIGHT = 600
const DEFAULT_HEIGHT = 200

interface TerminalState {
  leftOpen: boolean
  rightOpen: boolean
  height: number
  isOpen: (id: PaneId) => boolean
  setOpen: (id: PaneId, open: boolean) => void
  toggle: (id: PaneId) => void
  toggleActive: (active: PaneId) => void
  setHeight: (height: number) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  leftOpen: false,
  rightOpen: false,
  height: DEFAULT_HEIGHT,

  isOpen: (id) => (id === 'left' ? get().leftOpen : get().rightOpen),

  setOpen: (id, open) => set(id === 'left' ? { leftOpen: open } : { rightOpen: open }),

  toggle: (id) => {
    if (id === 'left') set((s) => ({ leftOpen: !s.leftOpen }))
    else set((s) => ({ rightOpen: !s.rightOpen }))
  },

  toggleActive: (active) => get().toggle(active),

  setHeight: (height) =>
    set({
      height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(height))),
    }),
}))

export const TERMINAL_MIN_HEIGHT = MIN_HEIGHT
export const TERMINAL_MAX_HEIGHT = MAX_HEIGHT
