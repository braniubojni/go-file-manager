import { create } from 'zustand'
import type { PaneId } from '../../entities/file/types'

const MAX_HISTORY = 100

function isParentEntry(path: string): boolean {
  const base = path.split(/[/\\]/).pop()
  return base === '..'
}

function pushCapped(stack: string[], path: string): string[] {
  const next = [...stack, path]
  if (next.length > MAX_HISTORY) return next.slice(next.length - MAX_HISTORY)
  return next
}

interface PaneState {
  activePane: PaneId
  leftPath: string
  rightPath: string
  /** Multi-select targets for actions */
  leftSelection: string[]
  rightSelection: string[]
  /** Keyboard/mouse cursor (focus) — independent of multi-select */
  leftFocus: string
  rightFocus: string
  /** Anchor for Shift+click range */
  leftAnchor: string
  rightAnchor: string
  leftBack: string[]
  leftForward: string[]
  rightBack: string[]
  rightForward: string[]
  ready: boolean
  setActivePane: (id: PaneId) => void
  setPath: (id: PaneId, path: string) => void
  navigate: (id: PaneId, path: string) => void
  goBack: (id: PaneId) => boolean
  goForward: (id: PaneId) => boolean
  canGoBack: (id: PaneId) => boolean
  canGoForward: (id: PaneId) => boolean
  setPaths: (left: string, right: string) => void
  setSelection: (id: PaneId, paths: string[]) => void
  /** Set keyboard cursor. Pass keepAnchor for Shift+arrow / Shift+click range. */
  setFocus: (id: PaneId, path: string, opts?: { keepAnchor?: boolean }) => void
  /** Space: toggle focus path in multi-select */
  toggleMultiSelect: (id: PaneId, path: string) => void
  /** Shift range from anchor to path using ordered row paths */
  selectRange: (id: PaneId, orderedPaths: string[], toPath: string) => void
  clearSelection: (id?: PaneId) => void
  getPath: (id: PaneId) => string
  getSelection: (id: PaneId) => string[]
  getFocus: (id: PaneId) => string
  /** Paths for copy/move/delete/archive — multi-select if any, else focus */
  getActionPaths: (id: PaneId) => string[]
  otherPane: (id: PaneId) => PaneId
}

export const usePaneStore = create<PaneState>((set, get) => ({
  activePane: 'left',
  leftPath: '',
  rightPath: '',
  leftSelection: [],
  rightSelection: [],
  leftFocus: '',
  rightFocus: '',
  leftAnchor: '',
  rightAnchor: '',
  leftBack: [],
  leftForward: [],
  rightBack: [],
  rightForward: [],
  ready: false,

  setActivePane: (id) => set({ activePane: id }),

  setPath: (id, path) =>
    set((s) =>
      id === 'left'
        ? { leftPath: path, leftSelection: [], leftFocus: '', leftAnchor: '' }
        : { rightPath: path, rightSelection: [], rightFocus: '', rightAnchor: '' },
    ),

  navigate: (id, path) => {
    const current = get().getPath(id)
    if (!path || path === current) return
    set((s) => {
      if (id === 'left') {
        return {
          leftPath: path,
          leftSelection: [],
          leftFocus: '',
          leftAnchor: '',
          leftBack: current ? pushCapped(s.leftBack, current) : s.leftBack,
          leftForward: [],
        }
      }
      return {
        rightPath: path,
        rightSelection: [],
        rightFocus: '',
        rightAnchor: '',
        rightBack: current ? pushCapped(s.rightBack, current) : s.rightBack,
        rightForward: [],
      }
    })
  },

  goBack: (id) => {
    const s = get()
    const back = id === 'left' ? s.leftBack : s.rightBack
    if (!back.length) return false
    const current = s.getPath(id)
    const prev = back[back.length - 1]
    set(() => {
      if (id === 'left') {
        return {
          leftPath: prev,
          leftSelection: [],
          leftFocus: '',
          leftAnchor: '',
          leftBack: back.slice(0, -1),
          leftForward: current ? pushCapped(s.leftForward, current) : s.leftForward,
        }
      }
      return {
        rightPath: prev,
        rightSelection: [],
        rightFocus: '',
        rightAnchor: '',
        rightBack: back.slice(0, -1),
        rightForward: current ? pushCapped(s.rightForward, current) : s.rightForward,
      }
    })
    return true
  },

  goForward: (id) => {
    const s = get()
    const forward = id === 'left' ? s.leftForward : s.rightForward
    if (!forward.length) return false
    const current = s.getPath(id)
    const next = forward[forward.length - 1]
    set(() => {
      if (id === 'left') {
        return {
          leftPath: next,
          leftSelection: [],
          leftFocus: '',
          leftAnchor: '',
          leftForward: forward.slice(0, -1),
          leftBack: current ? pushCapped(s.leftBack, current) : s.leftBack,
        }
      }
      return {
        rightPath: next,
        rightSelection: [],
        rightFocus: '',
        rightAnchor: '',
        rightForward: forward.slice(0, -1),
        rightBack: current ? pushCapped(s.rightBack, current) : s.rightBack,
      }
    })
    return true
  },

  canGoBack: (id) => (id === 'left' ? get().leftBack : get().rightBack).length > 0,
  canGoForward: (id) => (id === 'left' ? get().leftForward : get().rightForward).length > 0,

  setPaths: (left, right) =>
    set({
      leftPath: left,
      rightPath: right,
      ready: true,
      leftSelection: [],
      rightSelection: [],
      leftFocus: '',
      rightFocus: '',
      leftAnchor: '',
      rightAnchor: '',
      leftBack: [],
      leftForward: [],
      rightBack: [],
      rightForward: [],
    }),

  setSelection: (id, paths) =>
    set(
      id === 'left'
        ? { leftSelection: paths.filter((p) => !isParentEntry(p)) }
        : { rightSelection: paths.filter((p) => !isParentEntry(p)) },
    ),

  setFocus: (id, path, opts) =>
    set((s) => {
      if (opts?.keepAnchor) {
        return id === 'left' ? { leftFocus: path } : { rightFocus: path }
      }
      // When starting a new focus, keep prior anchor if empty path (no-op edge)
      return id === 'left'
        ? { leftFocus: path, leftAnchor: path || s.leftAnchor }
        : { rightFocus: path, rightAnchor: path || s.rightAnchor }
    }),

  toggleMultiSelect: (id, path) => {
    if (isParentEntry(path)) return
    const key = id === 'left' ? 'leftSelection' : 'rightSelection'
    const current = get()[key]
    if (current.includes(path)) {
      set({ [key]: current.filter((p) => p !== path) })
    } else {
      set({ [key]: [...current, path] })
    }
  },

  selectRange: (id, orderedPaths, toPath) => {
    const anchor = id === 'left' ? get().leftAnchor : get().rightAnchor
    const startPath = anchor || toPath
    let i = orderedPaths.indexOf(startPath)
    let j = orderedPaths.indexOf(toPath)
    if (i < 0) i = j
    if (j < 0) j = i
    if (i < 0 || j < 0) return
    const [a, b] = i <= j ? [i, j] : [j, i]
    const range = orderedPaths.slice(a, b + 1).filter((p) => !isParentEntry(p))
    if (id === 'left') {
      set({ leftSelection: range, leftFocus: toPath })
    } else {
      set({ rightSelection: range, rightFocus: toPath })
    }
  },

  clearSelection: (id) => {
    if (!id) {
      set({ leftSelection: [], rightSelection: [] })
      return
    }
    set(id === 'left' ? { leftSelection: [] } : { rightSelection: [] })
  },

  getPath: (id) => (id === 'left' ? get().leftPath : get().rightPath),
  getSelection: (id) => (id === 'left' ? get().leftSelection : get().rightSelection),
  getFocus: (id) => (id === 'left' ? get().leftFocus : get().rightFocus),

  getActionPaths: (id) => {
    const sel = get().getSelection(id).filter((p) => !isParentEntry(p))
    if (sel.length) return sel
    const focus = get().getFocus(id)
    if (focus && !isParentEntry(focus)) return [focus]
    return []
  },

  otherPane: (id) => (id === 'left' ? 'right' : 'left'),
}))
