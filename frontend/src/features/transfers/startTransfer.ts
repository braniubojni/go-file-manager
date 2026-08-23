import { FileService } from '../../shared/api/bindings';
import { errMessage } from '../../shared/lib/format';
import { useTransferStore } from './transferStore';
import type { TransferKind } from './types';

type StartTransferOpts = {
  kind: TransferKind;
  sources: string[];
  destDir: string;
  show: (msg: string, severity?: 'success' | 'error' | 'info' | 'warning') => void;
  onSuccess?: () => void;
  /** Runs on success and cancel so dest listings drop leftover/partial rows. */
  onSettled?: () => void;
};

const labelFor = (kind: TransferKind, sources: string[], destDir: string): string => {
  const verb = kind === 'move' ? 'Move' : 'Copy';
  if (sources.length === 1) {
    const base = sources[0].split(/[/\\]/).pop() || sources[0];
    return `${verb} ${base} → ${destDir}`;
  }
  return `${verb} ${sources.length} items → ${destDir}`;
};

/**
 * Allocates a backend job, registers UI progress, and runs Copy/Move.
 * Progress events update the store; snackbars mirror previous fire-and-forget UX.
 */
export const startTransfer = (opts: StartTransferOpts): void => {
  const { kind, sources, destDir, show, onSuccess, onSettled } = opts;
  if (!sources.length || !destDir) return;

  const upsert = useTransferStore.getState().upsert;
  const remove = useTransferStore.getState().remove;
  const label = labelFor(kind, sources, destDir);
  const verb = kind === 'move' ? 'Moved' : 'Copied';

  void FileService.NewJobID()
    .catch(() => '')
    .then((jobId: string) => {
      if (jobId) {
        upsert({
          jobId,
          kind,
          label,
          destDir,
          bytesDone: 0,
          bytesTotal: 0,
          currentPath: '',
          destPath: '',
          destSize: 0,
          destIsDir: false,
          percent: 0,
        });
      }
      const op = kind === 'move' ? FileService.Move : FileService.Copy;
      return op(jobId || '', sources, destDir)
        .then(() => {
          if (jobId) remove(jobId);
          show(`${verb} ${sources.length} item(s)`, 'success');
          onSuccess?.();
          onSettled?.();
        })
        .catch((e) => {
          if (jobId) remove(jobId);
          const msg = errMessage(e);
          if (msg.toLowerCase().includes('cancel') || msg.includes('context canceled')) {
            show('Cancelled', 'info');
            onSettled?.();
            return;
          }
          show(msg, 'error');
          onSettled?.();
        });
    });
};
