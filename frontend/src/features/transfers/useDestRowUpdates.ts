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
          if (!op.destPath || !sameDir(op.destDir, panePath)) continue;
          const before = prev[op.jobId];
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
