import { create } from 'zustand'

type FileOpsRequest =
  | 'copy'
  | 'move'
  | 'delete'
  | 'rename'
  | 'mkdir'
  | 'refresh'
  | 'goParent'
  | 'goHome'
  | null

interface FileOpsState {
  request: FileOpsRequest
  nonce: number
  trigger: (request: Exclude<FileOpsRequest, null>) => void
  consume: () => void
}

export const useFileOpsStore = create<FileOpsState>((set) => ({
  request: null,
  nonce: 0,
  trigger: (request) => set((s) => ({ request, nonce: s.nonce + 1 })),
  consume: () => set({ request: null }),
}))
