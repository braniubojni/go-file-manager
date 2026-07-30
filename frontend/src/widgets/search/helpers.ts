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

export const highlightLine = (
  text: string,
  start: number,
  end: number,
): { before: string; mid: string; after: string } => {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  return {
    before: text.slice(0, s),
    mid: text.slice(s, e),
    after: text.slice(e),
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
