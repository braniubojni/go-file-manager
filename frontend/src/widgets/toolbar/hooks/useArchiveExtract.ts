import { useQueryClient } from '@tanstack/react-query';
import { useReducer } from 'react';
import {
  archiveDialogReducer,
  initialArchiveState,
} from '../../../features/archive/archiveDialogReducer';
import {
  extractDialogReducer,
  initialExtractState,
} from '../../../features/archive/extractDialogReducer';
import { useTransferStore } from '../../../features/transfers/transferStore';
import { FileService } from '../../../shared/api/bindings';
import { archiveStem } from '../../../shared/lib/archives';
import { errMessage } from '../../../shared/lib/format';
import { useSnack } from '../../../shared/ui/SnackbarHost';
import type { ArchiveExtractArgs } from '../types';

/** Registers a transfer-bar row around work(jobId), removing it on settle —
 * archive/extract share this with copy/move (features/transfers/startTransfer.ts)
 * instead of the indeterminate pane spinner, since the backend now reports
 * real byte progress for these jobs too. */
const runTransferJob = async (
  kind: 'archive' | 'extract',
  label: string,
  work: (jobId: string) => Promise<void>,
): Promise<void> => {
  const upsert = useTransferStore.getState().upsert;
  const remove = useTransferStore.getState().remove;
  const jobId = await FileService.NewJobID().catch(() => '');
  if (jobId) {
    upsert({
      jobId,
      kind,
      label,
      destDir: '',
      bytesDone: 0,
      bytesTotal: 0,
      currentPath: '',
      destPath: '',
      destSize: 0,
      destIsDir: false,
      percent: 0,
      files: [],
    });
  }
  try {
    await work(jobId);
  } finally {
    if (jobId) {
      try {
        await FileService.FinishJob(jobId);
      } catch {
        /* ignore */
      }
      remove(jobId);
    }
  }
};

export const useArchiveExtract = ({
  activePath,
  realSelection,
  clearSelection,
}: ArchiveExtractArgs) => {
  const show = useSnack((s) => s.show);
  const qc = useQueryClient();
  const [archive, dispatchArchive] = useReducer(archiveDialogReducer, initialArchiveState);
  const [extract, dispatchExtract] = useReducer(extractDialogReducer, initialExtractState);

  const afterOk = (msg: string) => {
    show(msg, 'success');
    clearSelection();
    void qc.invalidateQueries({ queryKey: ['dir'] });
    void qc.invalidateQueries({ queryKey: ['gitStatus'] });
  };

  const openArchiveDialog = async () => {
    if (!realSelection.length) return show('Select files to archive', 'warning');
    let formats: string[] | undefined;
    try {
      const list = await FileService.ListArchiveCreateFormats();
      if (list?.length) formats = list;
    } catch {
      /* defaults */
    }
    const base =
      realSelection.length === 1
        ? realSelection[0]
            .split(/[/\\]/)
            .pop()
            ?.replace(/\.[^.]+$/, '') || 'archive'
        : 'archive';
    dispatchArchive({ type: 'open', defaultName: base, formats });
  };

  const confirmArchive = async () => {
    if (!archive.open || archive.busy) return;
    if (!realSelection.length || !activePath) return;
    const sources = [...realSelection];
    const { format, encrypt, password: pwd } = archive;
    const name = archive.name.trim() || 'archive';
    const password = format === 'zip' && encrypt ? pwd : '';
    dispatchArchive({ type: 'close' });
    try {
      await runTransferJob('archive', `Archiving ${sources.length} item(s)…`, async (jobId) => {
        const ext = await FileService.ArchiveExtension(format);
        const dest = `${activePath.replace(/\/+$/, '')}/${name}${ext.startsWith('.') ? ext : `.${ext}`}`;
        await FileService.Archive(jobId, sources, dest, format, password);
      });
      afterOk('Archive created');
    } catch (e) {
      const msg = errMessage(e);
      show(
        msg.toLowerCase().includes('cancel') ? 'Cancelled' : msg,
        msg.toLowerCase().includes('cancel') ? 'info' : 'error',
      );
    }
  };

  const openExtractDialog = () => {
    if (!realSelection.length) return show('Select archive(s) to extract', 'warning');
    dispatchExtract({ type: 'open', itemCount: realSelection.length });
  };

  const confirmExtract = async () => {
    if (!extract.open || extract.busy) return;
    if (!realSelection.length || !activePath) return;
    const sources = [...realSelection];
    const password = extract.password;
    dispatchExtract({ type: 'close' });
    try {
      await runTransferJob('extract', `Extracting ${sources.length} archive(s)…`, async (jobId) => {
        const dests = sources.map((src) => {
          const base = src.split(/[/\\]/).pop() || 'extracted';
          const stem = archiveStem(base);
          return `${activePath.replace(/\/+$/, '')}/${stem || 'extracted'}`;
        });
        await FileService.ExtractBatch(jobId, sources, dests, password);
      });
      afterOk('Extract completed');
    } catch (e) {
      const msg = errMessage(e);
      show(
        msg.toLowerCase().includes('cancel') ? 'Cancelled' : msg,
        msg.toLowerCase().includes('cancel') ? 'info' : 'error',
      );
    }
  };

  return {
    archive,
    extract,
    dispatchArchive,
    dispatchExtract,
    openArchiveDialog,
    openExtractDialog,
    confirmArchive,
    confirmExtract,
  };
};
