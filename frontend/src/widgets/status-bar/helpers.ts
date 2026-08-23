import type { FileEntry } from '../../entities/file/types';
import { formatSize } from '../../shared/lib/format';

const basename = (p: string): string => p.split(/[/\\]/).pop() ?? '';

/** Selection paths, or focus when selection is empty. Skips `..`. */
export const selectedEntryPaths = (selection: string[], focus: string): string[] => {
  const real = selection.filter((p) => basename(p) !== '..');
  if (real.length) return real;
  if (focus && basename(focus) !== '..') return [focus];
  return [];
};

/** `Selected: N` plus size and/or `N folders` when dir sizes are missing. */
export const formatSelectionCaption = (
  paths: string[],
  entries: FileEntry[] | undefined,
  folderSizes: Record<string, number>,
): string => {
  const head = `Selected: ${paths.length}`;
  if (!paths.length || !entries?.length) return head;

  const wanted = new Set(paths);
  let bytes = 0;
  let hasSized = false;
  let unknownFolders = 0;
  for (const e of entries) {
    if (e.name === '..' || !wanted.has(e.path)) continue;
    if (e.isDir) {
      const sz = folderSizes[e.path];
      if (sz != null) {
        bytes += sz;
        hasSized = true;
      } else {
        unknownFolders += 1;
      }
    } else {
      bytes += e.size;
      hasSized = true;
    }
  }

  const bits: string[] = [];
  if (hasSized) bits.push(formatSize(bytes, false));
  if (unknownFolders > 0) {
    bits.push(`${unknownFolders} folder${unknownFolders === 1 ? '' : 's'}`);
  }
  if (!bits.length) return head;
  return `${head} (${bits.join(', ')})`;
};
