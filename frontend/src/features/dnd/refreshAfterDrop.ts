import type { QueryClient } from '@tanstack/react-query';
import { parentOfPath } from '../../widgets/file-pane/helpers';

/** Refresh dest (and related parents) after copy/move so a cached folder listing updates. */
export const refreshAfterDrop = (qc: QueryClient, dest: string, sources: string[] = []): void => {
  const paths = new Set<string>();
  if (dest) {
    paths.add(dest);
    paths.add(parentOfPath(dest));
  }
  for (const s of sources) {
    const parent = parentOfPath(s);
    if (parent) paths.add(parent);
  }
  for (const p of paths) {
    if (!p) continue;
    void qc.invalidateQueries({ queryKey: ['dir', p] });
    void qc.invalidateQueries({ queryKey: ['gitStatus', p] });
  }
  if (!dest) return;
  // Dest may only exist as inactive cache (visited earlier). Force a refetch.
  void qc.refetchQueries({ queryKey: ['dir', dest] });
  void qc.refetchQueries({ queryKey: ['gitStatus', dest] });
};
