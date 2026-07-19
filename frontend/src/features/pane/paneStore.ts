import { create } from 'zustand'
import type { PaneId } from '../../entities/file/types'

interface PaneState {
  activePane: PaneId
  leftPath: string
  rightPath: string
  leftSelection: string[]
  rightSelection: string[]
  ready: boolean
  setActivePane: (id: PaneId) => void
  setPath: (id: PaneId, path: string) => void
  setPaths: (left: string, right: string) => void
  setSelection: (id: PaneId, paths: string[]) => void
  clearSelection: (id?: PaneId) => void
  toggleSelect: (id: PaneId, path: string, multi: boolean) => void
  getPath: (id: PaneId) => string
  getSelection: (id: PaneId) => string[]
  otherPane: (id: PaneId) => PaneId
}

export const usePaneStore = create<PaneState>((set, get) => ({
  activePane: 'left',
  leftPath: '',
  rightPath: '',
  leftSelection: [],
  rightSelection: [],
  ready: false,

  setActivePane: (id) => set({ activePane: id }),

  setPath: (id, path) =>
    set((s) =>
      id === 'left'
        ? { leftPath: path, leftSelection: [] }
        : { rightPath: path, rightSelection: [] },
    ),

  setPaths: (left, right) =>
    set({ leftPath: left, rightPath: right, ready: true, leftSelection: [], rightSelection: [] }),

  setSelection: (id, paths) =>
    set(id === 'left' ? { leftSelection: paths } : { rightSelection: paths }),

  clearSelection: (id) => {
    if (!id) {
      set({ leftSelection: [], rightSelection: [] })
      return
    }
    set(id === 'left' ? { leftSelection: [] } : { rightSelection: [] })
  },

  toggleSelect: (id, path, multi) => {
    const key = id === 'left' ? 'leftSelection' : 'rightSelection'
    const current = get()[key]
    if (!multi) {
      set({ [key]: [path] })
      return
    }
    if (current.includes(path)) {
      set({ [key]: current.filter((p) => p !== path) })
    } else {
      set({ [key]: [...current, path] })
    }
  },

  getPath: (id) => (id === 'left' ? get().leftPath : get().rightPath),
  getSelection: (id) => (id === 'left' ? get().leftSelection : get().rightSelection),
  otherPane: (id) => (id === 'left' ? 'right' : 'left'),
}))
