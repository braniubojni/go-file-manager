import type { ContentHit, SearchResult } from './types';

/** Strip absolute search-root path tokens from include so they act as scope UI only. */
export const includePatternsForSearch = (include: string, root: string): string => {
  const rootNorm = root.replace(/\/+$/, '');
  return include
    .split(',')
    .map((p) => p.trim())
    .filter((p) => {
      if (!p) return false;
      const n = p.replace(/\/+$/, '');
      return n !== rootNorm && n !== root;
    })
    .join(', ');
};

/** True if include is empty or only the search-root path (no real globs). */
export const includeIsOnlyRoot = (include: string, root: string): boolean => {
  const trimmed = include.trim();
  if (!trimmed) return true;
  const rootNorm = root.replace(/\/+$/, '');
  return include
    .split(',')
    .map((p) => p.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .every((p) => p === rootNorm || p === root);
};

/**
 * Split lineText for match highlighting.
 * start/end are 0-based UTF-8 byte offsets into LineText (see ContentSearchHit),
 * not JS string (UTF-16 code unit) indices.
 */
export const highlightLine = (
  text: string,
  start: number,
  end: number,
): { before: string; mid: string; after: string } => {
  const bytes = new TextEncoder().encode(text);
  const s = Math.max(0, Math.min(start, bytes.length));
  const e = Math.max(s, Math.min(end, bytes.length));
  const decoder = new TextDecoder();
  return {
    before: decoder.decode(bytes.subarray(0, s)),
    mid: decoder.decode(bytes.subarray(s, e)),
    after: decoder.decode(bytes.subarray(e)),
  };
};

export const uniquePathsFromResults = (results: SearchResult[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of results) {
    if (r.kind !== 'content') continue;
    if (seen.has(r.hit.path)) continue;
    seen.add(r.hit.path);
    out.push(r.hit.path);
  }
  return out;
};

export const contentHitKey = (h: ContentHit): string =>
  `${h.path}:${h.line}:${h.column}:${h.matchStart}:${h.matchEnd}`;
