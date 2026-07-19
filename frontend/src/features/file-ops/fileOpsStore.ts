import { create } from 'zustand'
import type { FileOpsAction, FileOpsRequest, FileOpsState } from './types'

export type { FileOpsAction, FileOpsRequest } from './types'

export const useFileOpsStore = create<FileOpsState>((set) => ({
  request: null as FileOpsRequest,
  nonce: 0,
  trigger: (request: FileOpsAction) => set((s) => ({ request, nonce: s.nonce + 1 })),
  consume: () => set({ request: null }),
}))
