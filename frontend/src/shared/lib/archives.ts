/**
 * One list of archive extensions for the whole app. Previously three copies
 * drifted apart: the extract stem regex, the file-type icon switch, and the
 * create-format defaults.
 */

/** Single-token extensions (what a FileEntry.ext holds). */
const ARCHIVE_EXTS = new Set([
  'zip',
  'rar',
  '7z',
  'tar',
  'tgz',
  'tbz',
  'tbz2',
  'txz',
  'gz',
  'bz2',
  'xz',
  'zst',
  'lz4',
  'sz',
]);

/** Matches a full archive suffix, including the two-part `.tar.*` forms. */
const ARCHIVE_SUFFIX_RE =
  /\.(tar\.(gz|bz2|xz|zst|lz4|sz)|tgz|tbz2?|txz|zip|rar|7z|tar|gz|bz2|xz|zst)$/i;

export const isArchiveExt = (ext: string): boolean => ARCHIVE_EXTS.has(ext.toLowerCase());

/** Base name with the archive suffix removed, for naming an extract target. */
export const archiveStem = (basename: string): string => basename.replace(ARCHIVE_SUFFIX_RE, '');
