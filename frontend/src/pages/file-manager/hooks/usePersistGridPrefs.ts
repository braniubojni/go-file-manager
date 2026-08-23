import { useEffect } from 'react';
import { useGridPrefsStore } from '../../../features/ui/gridPrefsStore';
import { SettingsService } from '../../../shared/api/bindings';

/** Debounced save of both panes' grid prefs when they change. */
export const usePersistGridPrefs = (ready: boolean) => {
  const left = useGridPrefsStore((s) => s.left);
  const right = useGridPrefsStore((s) => s.right);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      void SettingsService.SaveGridPrefs({ left, right });
    }, 300);
    return () => clearTimeout(t);
  }, [left, right, ready]);
};
