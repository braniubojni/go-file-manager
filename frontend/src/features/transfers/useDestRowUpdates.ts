import { useEffect } from 'react';
import { useTransferStore } from './transferStore';
import type { TransferOp } from './types';

type GridApiLike = {
  current: { updateRows?: (rows: Record<string, unknown>[]) => void } | null;
};

const sameDir = (a: string, b: string): boolean =>
  a.replace(/[/\\]+$/, '') === b.replace(/[/\\]+$/, '');

const basename = (p: string): string => p.split(/[/\\]/).pop() || p;

const extOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  if (i <= 0) return '';
  return name.slice(i + 1).toLowerCase();
};

const rowFromOp = (op: TransferOp): Record<string, unknown> => {
  const name = basename(op.destPath);
  const row: Record<string, unknown> = {
    id: op.destPath,
    path: op.destPath,
    name,
    displayName: name,
    isDir: op.destIsDir,
    size: op.destSize,
    ext: extOf(name),
    isSymlink: false,
    access: '',
    modTime: Date.now(),
  };
  if (op.destIsDir) row.folderSizeBytes = op.destSize;
  return row;
};

const applyDestOps = (apiRef: GridApiLike, panePath: string, ops: TransferOp[]): void => {
  const api = apiRef.current;
  if (!api || typeof api.updateRows !== 'function' || !panePath) return;
  for (const op of ops) {
    if (!op.destPath || !sameDir(op.destDir, panePath)) continue;
    api.updateRows([rowFromOp(op)]);
  }
};

// Removes an optimistically-added dest row once its file is known cancelled
// (backend deletes the partial file on cancel — see FileCancelRegistry) so it
// doesn't linger as a ghost row until the next full directory refetch.
const removeCanceledFileRows = (
  apiRef: GridApiLike,
  panePath: string,
  op: TransferOp,
  prevOp: TransferOp | undefined,
): void => {
  const api = apiRef.current;
  if (!api || typeof api.updateRows !== 'function' || !sameDir(op.destDir, panePath)) return;
  const prevStatus = new Map(prevOp?.files.map((f) => [f.path, f.status]));
  for (const f of op.files) {
    if (f.dest && f.status === 'canceled' && prevStatus.get(f.path) !== 'canceled') {
      // FileTable's getRowId reads `path`, not `id` — a delete update needs
      // whatever getRowId resolves to, or DataGrid rejects it as id-less.
      api.updateRows([{ id: f.dest, path: f.dest, _action: 'delete' }]);
    }
  }
};

/** Patch only the dest row via DataGrid updateRows — no listing refetch. */
export const useDestRowUpdates = (
  apiRef: GridApiLike,
  panePath: string,
  /** Re-apply after controlled `rows` reset (selection/sort re-renders). */
  rowsEpoch: number,
): void => {
  useEffect(() => {
    applyDestOps(apiRef, panePath, Object.values(useTransferStore.getState().byId));
    let prev = useTransferStore.getState().byId;
    return useTransferStore.subscribe((s) => {
      const next = s.byId;
      const api = apiRef.current;
      if (api && typeof api.updateRows === 'function' && panePath) {
        for (const op of Object.values(next)) {
          const before = prev[op.jobId];
          removeCanceledFileRows(apiRef, panePath, op, before);
          if (!op.destPath || !sameDir(op.destDir, panePath)) continue;
          if (
            before &&
            before.destPath === op.destPath &&
            before.destSize === op.destSize &&
            before.destIsDir === op.destIsDir
          ) {
            continue;
          }
          api.updateRows([rowFromOp(op)]);
        }
      }
      prev = next;
    });
  }, [apiRef, panePath, rowsEpoch]);
};
