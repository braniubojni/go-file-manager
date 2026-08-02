import { create } from 'zustand';
import type { PaneId } from '../../entities/file/types';

/** A connect attempt that stalled on authentication and needs the password dialog. */
export type ConnectRequest = {
  paneId: PaneId;
  targetPath: string;
  /** Saved profile to retry, when the host is already known. */
  profileId?: string;
  /** Raw `user@host:port` spec, when there is no saved profile. */
  spec?: string;
  label?: string;
};

interface ConnectRequestState {
  request: ConnectRequest | null;
  nonce: number;
  connecting: Record<PaneId, boolean>;
  /** Hand the request to whoever owns the password dialog (ConnectionsMenu). */
  askPassword: (request: ConnectRequest) => void;
  consume: () => void;
  setConnecting: (id: PaneId, value: boolean) => void;
  isConnecting: (id: PaneId) => boolean;
}

export const useConnectRequestStore = create<ConnectRequestState>((set, get) => ({
  request: null,
  nonce: 0,
  connecting: { left: false, right: false },

  askPassword: (request) => set((s) => ({ request, nonce: s.nonce + 1 })),
  consume: () => set({ request: null }),

  setConnecting: (id, value) => set((s) => ({ connecting: { ...s.connecting, [id]: value } })),
  isConnecting: (id) => get().connecting[id],
}));
