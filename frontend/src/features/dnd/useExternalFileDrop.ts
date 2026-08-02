import { useQueryClient } from '@tanstack/react-query';
import { Events } from '@wailsio/runtime';
import { useEffect } from 'react';
import type { PaneId } from '../../entities/file/types';
import { usePaneStore } from '../pane/paneStore';
import { FileService } from '../../shared/api/bindings';
import { errMessage } from '../../shared/lib/format';
import { useSnack } from '../../shared/ui/SnackbarHost';
import { allSameParentAsDest, isNestedInSelf } from '../../widgets/file-pane/helpers';

type DropTargetPayload = {
  id?: string;
  classList?: string[];
  attributes?: Record<string, string>;
  x?: number;
  y?: number;
};

type FilesDroppedPayload = {
  files?: string[];
  target?: DropTargetPayload;
};

const isPaneId = (v: string | undefined): v is PaneId => v === 'left' || v === 'right';

/** Resolve destination directory from Wails DropTargetDetails attributes. */
const resolveExternalDropDest = (
  attrs: Record<string, string> | undefined,
  getPanePath: (id: PaneId) => string,
): string | null => {
  if (!attrs) return null;
  const kind = attrs['data-drop-kind'];
  if (kind === 'folder') {
    const path = attrs['data-drop-path'];
    return path || null;
  }
  if (kind === 'pane') {
    const paneId = attrs['data-pane-id'];
    if (!isPaneId(paneId)) return null;
    return getPanePath(paneId) || null;
  }
  return null;
};

/**
 * OS file manager → app drops (Wails EnableFileDrop + WindowFilesDropped).
 * Always **copy** (no +/− badge for OS drops). Destination = pane cwd or folder row.
 */
export const useExternalFileDrop = (enabled: boolean): void => {
  const qc = useQueryClient();
  const show = useSnack((s) => s.show);

  useEffect(() => {
    if (!enabled) return;

    const unsub = Events.On('files-dropped', (ev: { data?: FilesDroppedPayload }) => {
      const payload = (ev?.data ?? ev) as FilesDroppedPayload;
      const files = payload?.files?.filter(Boolean) ?? [];
      if (!files.length) return;

      const dest = resolveExternalDropDest(payload.target?.attributes, (id) =>
        usePaneStore.getState().getPath(id),
      );
      if (!dest) {
        show('Drop on a pane or folder to copy files', 'info');
        return;
      }
      // Same parent = user brought items back; treat as cancel.
      if (allSameParentAsDest(files, dest)) return;
      if (isNestedInSelf(files, dest)) {
        show('Cannot drop a folder into itself', 'warning');
        return;
      }

      void FileService.Copy(files, dest)
        .then(() => {
          show(`Copied ${files.length} item(s)`, 'success');
          void qc.invalidateQueries({ queryKey: ['dir'] });
          void qc.invalidateQueries({ queryKey: ['gitStatus'] });
        })
        .catch((e) => show(errMessage(e), 'error'));
    });

    return () => {
      unsub();
    };
  }, [enabled, qc, show]);
};
