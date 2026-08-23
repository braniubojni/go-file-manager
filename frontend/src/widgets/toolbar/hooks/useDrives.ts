import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useHomeDir, useVolumes } from '../../../entities/file/queries';
import type { Volume } from '../../../entities/file/types';
import { usePaneStore } from '../../../features/pane/paneStore';
import { FileService } from '../../../shared/api/bindings';
import { errMessage } from '../../../shared/lib/format';
import { useSnack } from '../../../shared/ui/SnackbarHost';
import { enterPaneTab } from '../../file-pane/helpers';

const underVolume = (path: string, vol: string): boolean => {
  const p = path.replace(/[/\\]+$/, '');
  const v = vol.replace(/[/\\]+$/, '');
  return p === v || p.startsWith(v + '/') || p.startsWith(v + '\\');
};

export const useDrives = () => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const volumesQ = useVolumes();
  const volumes = volumesQ.data ?? [];
  const { data: home } = useHomeDir();
  const show = useSnack((s) => s.show);
  const qc = useQueryClient();
  const activePane = usePaneStore((s) => s.activePane);
  const navigate = usePaneStore((s) => s.navigate);

  const openVolume = (v: Volume) => {
    enterPaneTab(activePane, v.path);
    navigate(activePane, v.path);
    setAnchor(null);
  };

  const unmount = (v: Volume) => {
    void FileService.UnmountVolume(v.path)
      .then(() => {
        const dest = home || '';
        const store = usePaneStore.getState();
        for (const id of ['left', 'right'] as const) {
          if (!underVolume(store.getPath(id), v.path)) continue;
          if (dest) {
            enterPaneTab(id, dest);
            store.navigate(id, dest);
          }
        }
        void qc.invalidateQueries({ queryKey: ['volumes'] });
        void qc.invalidateQueries({ queryKey: ['dir'] });
        show(`Unmounted ${v.name}`, 'info');
      })
      .catch((e) => show(errMessage(e), 'error'));
  };

  return { anchor, setAnchor, volumes, openVolume, unmount };
};
