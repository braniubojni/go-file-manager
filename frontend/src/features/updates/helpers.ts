import type { AppSettings } from '../../entities/file/types';

/** Whether an auto-check is due given last check time and interval days. */
export const isUpdateCheckDue = (settings: AppSettings, now = Date.now()): boolean => {
  if (!settings.autoCheckUpdates) return false;
  const days = settings.updateCheckIntervalDays > 0 ? settings.updateCheckIntervalDays : 10;
  const last = settings.lastUpdateCheckAt;
  if (!last) return true;
  const t = Date.parse(last);
  if (Number.isNaN(t)) return true;
  const ms = days * 24 * 60 * 60 * 1000;
  return now - t >= ms;
};
