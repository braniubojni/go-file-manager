import { useEffect } from 'react';
import { defaultPaneGridPrefs, useGridPrefsStore } from '../../../features/ui/gridPrefsStore';
import { SettingsService } from '../../../shared/api/bindings';

/** Load persisted grid prefs once, then mark the store ready. */
export const useInitGridPrefs = () => {
  const loaded = useGridPrefsStore((s) => s.loaded);
  const hydrate = useGridPrefsStore((s) => s.hydrate);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    void SettingsService.GetGridPrefs()
      .then((p) => {
        if (!cancelled) hydrate(p);
      })
      .catch(() => {
        if (!cancelled) hydrate({ left: defaultPaneGridPrefs(), right: defaultPaneGridPrefs() });
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, hydrate]);

  return loaded;
};
