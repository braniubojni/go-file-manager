import type { AIUsage } from '../../entities/file/types';

/** Short label for a row's collapsed chip. */
export const statusLabel = (row: AIUsage): string => {
  if (row.limits[0]) return `${row.limits[0].percent}%`;
  if (row.estimate) return 'estimate';
  switch (row.status) {
    case 'not-installed':
      return 'Not installed';
    case 'unsupported':
      return 'Not supported';
    case 'error':
      return 'Error';
    default:
      return '—';
  }
};

export const canExpand = (row: AIUsage): boolean => row.limits.length > 1 || row.details.length > 0;

/** "Updated 8m ago" style relative label for the footer chip. */
export const formatUpdatedAgo = (updatedAt: number): string => {
  if (!updatedAt) return '';
  const mins = Math.max(0, Math.round((Date.now() - updatedAt) / 60_000));
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  return `Updated ${Math.round(mins / 60)}h ago`;
};
