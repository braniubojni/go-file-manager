import { create } from 'zustand';
import type { TransferKind, TransferOp, TransferState } from './types';

const kindFromPayload = (kind: string | undefined, prev?: TransferKind): TransferKind => {
  if (kind === 'move' || kind === 'copy' || kind === 'attach') return kind;
  return prev ?? 'copy';
};

const labelForKind = (kind: TransferKind): string => {
  if (kind === 'move') return 'Move';
  if (kind === 'attach') return 'Attach';
  return 'Copy';
};

const percentOf = (done: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
};

export const useTransferStore = create<TransferState>((set, get) => ({
  byId: {},

  upsert: (op) => {
    set((s) => ({ byId: { ...s.byId, [op.jobId]: op } }));
  },

  updateProgress: (payload) => {
    const jobId = payload.jobId;
    if (!jobId) return;
    set((s) => {
      const prev = s.byId[jobId];
      const bytesDone = Number(payload.bytesDone ?? prev?.bytesDone ?? 0);
      const bytesTotal = Number(payload.bytesTotal ?? prev?.bytesTotal ?? 0);
      const next: TransferOp = {
        jobId,
        kind: kindFromPayload(payload.kind, prev?.kind),
        label:
          payload.label || prev?.label || labelForKind(kindFromPayload(payload.kind, prev?.kind)),
        destDir: payload.destDir || prev?.destDir || '',
        bytesDone,
        bytesTotal,
        currentPath: payload.currentPath ?? prev?.currentPath ?? '',
        destPath: payload.destPath || prev?.destPath || '',
        destSize: Number(payload.destSize ?? prev?.destSize ?? 0),
        destIsDir: payload.destPath ? Boolean(payload.destIsDir) : Boolean(prev?.destIsDir),
        percent: percentOf(bytesDone, bytesTotal),
      };
      return { byId: { ...s.byId, [jobId]: next } };
    });
  },

  remove: (jobId) => {
    set((s) => {
      if (!s.byId[jobId]) return s;
      const { [jobId]: _, ...rest } = s.byId;
      return { byId: rest };
    });
  },

  list: () => Object.values(get().byId),
}));

// Averages only ops with known size — an 'attach' op sits at bytesTotal:0/
// percent:0 for its whole life and would otherwise drag the average down.
export const averageTransferPercent = (ops: TransferOp[]): number => {
  const sized = ops.filter((o) => o.bytesTotal > 0);
  if (!sized.length) return 0;
  const sum = sized.reduce((acc, op) => acc + op.percent, 0);
  return Math.round(sum / sized.length);
};
