import type { PaneId } from '../../entities/file/types';
import { ConnectionService } from '../../shared/api/bindings';
import { queryClient } from '../../shared/api/queryClient';
import { errMessage } from '../../shared/lib/format';
import { useSnack } from '../../shared/ui/SnackbarHost';
import { enterPaneTab } from '../../widgets/file-pane/helpers';
import { usePaneStore } from '../pane/paneStore';
import { useConnectRequestStore } from './connectRequestStore';
import { isAuthErrorMessage, sessionKeyFromPath } from './helpers';
import type { ActiveSession, ConnectionProfile } from './types';

const land = (paneId: PaneId, path: string): void => {
  enterPaneTab(paneId, path);
  // navigate() is a no-op when the pane already sits on this path (a restored
  // dormant tab), so refetch explicitly — that is the whole point of a reconnect.
  usePaneStore.getState().navigate(paneId, path);
  void queryClient.invalidateQueries({ queryKey: ['dir', path] });
};

/**
 * Navigate a pane to `path`, dialling the SSH session first when the path is
 * remote and no live session exists. Password-protected hosts are handed to the
 * existing password dialog via `connectRequestStore` instead of a second dialog.
 */
export const ensureSessionThenNavigate = async (paneId: PaneId, path: string): Promise<void> => {
  if (!path) return;
  if (!path.startsWith('ssh://')) {
    land(paneId, path);
    return;
  }

  const key = sessionKeyFromPath(path);
  const show = useSnack.getState().show;
  if (!key) {
    show(`Cannot parse remote path: ${path}`, 'error');
    return;
  }

  const cr = useConnectRequestStore.getState();
  cr.setConnecting(paneId, true);
  try {
    const sessions = ((await ConnectionService.ListSessions()) ?? []) as ActiveSession[];
    if (!sessions.some((s) => s.key === key)) {
      const profiles = ((await ConnectionService.ListProfiles()) ?? []) as ConnectionProfile[];
      const profile = profiles.find((p) => `${p.user}@${p.host}:${p.port}` === key);
      try {
        if (profile) await ConnectionService.ConnectProfile(profile.id, '');
        else await ConnectionService.ConnectSpec(key, '', false);
      } catch (e) {
        const msg = errMessage(e);
        if (isAuthErrorMessage(msg)) {
          cr.askPassword({
            paneId,
            targetPath: path,
            profileId: profile?.id,
            spec: profile ? undefined : key,
            label: profile?.label ?? key,
          });
          return;
        }
        throw e;
      }
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
    }
    land(paneId, path);
  } catch (e) {
    show(errMessage(e), 'error');
  } finally {
    useConnectRequestStore.getState().setConnecting(paneId, false);
  }
};
