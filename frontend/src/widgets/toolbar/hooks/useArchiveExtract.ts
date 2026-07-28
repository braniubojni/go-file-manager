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
import { FileService } from '../../../shared/api/bindings';
import { useSnack } from '../../../shared/ui/SnackbarHost';
import { runPaneJob } from '../helpers';
import type { ArchiveExtractArgs } from '../types';

export const useArchiveExtract = ({
  activePane,
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
    if (!realSelection.length || !activePath) return;
    const sources = [...realSelection];
    const { format, encrypt, password: pwd } = archive;
    const name = archive.name.trim() || 'archive';
    const password = format === 'zip' && encrypt ? pwd : '';
    dispatchArchive({ type: 'close' });
    await runPaneJob({
      pane: activePane,
      kind: 'archive',
      label: `Archiving ${sources.length} item(s)…`,
      show,
      onSuccess: () => afterOk('Archive created'),
      work: async (backendJobId) => {
        const ext = await FileService.ArchiveExtension(format);
        const dest = `${activePath.replace(/\/+$/, '')}/${name}${ext.startsWith('.') ? ext : `.${ext}`}`;
        await FileService.Archive(backendJobId, sources, dest, format, password);
      },
    });
  };

  const openExtractDialog = () => {
    if (!realSelection.length) return show('Select archive(s) to extract', 'warning');
    dispatchExtract({ type: 'open', itemCount: realSelection.length });
  };

  const confirmExtract = async () => {
    if (!realSelection.length || !activePath) return;
    const sources = [...realSelection];
    const password = extract.password;
    dispatchExtract({ type: 'close' });
    await runPaneJob({
      pane: activePane,
      kind: 'extract',
      label: `Extracting ${sources.length} archive(s)…`,
      show,
      finishBackendJob: true,
      onSuccess: () => afterOk('Extract completed'),
      work: async (backendJobId) => {
        for (const src of sources) {
          const base = src.split(/[/\\]/).pop() || 'extracted';
          const stem = base.replace(/\.(tar\.(gz|bz2|xz|zst|lz4|sz)|tgz|zip|rar|7z|tar)$/i, '');
          const dest = `${activePath.replace(/\/+$/, '')}/${stem || 'extracted'}`;
          await FileService.Extract(backendJobId, src, dest, password);
        }
      },
    });
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
