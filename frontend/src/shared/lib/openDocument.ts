import { isRemotePath } from '../../features/connections/helpers';
import { parentDirOf } from '../../features/editor/editorStore';
import { FileService } from '../api/bindings';
import { isArchivePanePath } from './archives';
import { errMessage } from './format';

/** Extension → MIME. Only types we treat as not-for-the-built-in-editor. */
const BINARY_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  raw: 'image/x-raw',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  m4v: 'video/x-m4v',
  wmv: 'video/x-ms-wmv',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  wma: 'audio/x-ms-wma',
  mpga: 'audio/mpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  pages: 'application/vnd.apple.pages',
  numbers: 'application/vnd.apple.numbers',
  key: 'application/vnd.apple.keynote',
  rtf: 'application/rtf',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  bz2: 'application/x-bzip2',
  xz: 'application/x-xz',
  zst: 'application/zstd',
  lz4: 'application/x-lz4',
  tgz: 'application/gzip',
  tbz: 'application/x-bzip2',
  tbz2: 'application/x-bzip2',
  txz: 'application/x-xz',
  dmg: 'application/x-apple-diskimage',
  iso: 'application/x-iso9660-image',
  img: 'application/octet-stream',
  pkg: 'application/octet-stream',
  deb: 'application/vnd.debian.binary-package',
  rpm: 'application/x-rpm',
  exe: 'application/vnd.microsoft.portable-executable',
  dll: 'application/vnd.microsoft.portable-executable',
  so: 'application/x-sharedlib',
  dylib: 'application/x-sharedlib',
  wasm: 'application/wasm',
  class: 'application/java-vm',
  jar: 'application/java-archive',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  psd: 'image/vnd.adobe.photoshop',
  ai: 'application/postscript',
};

const isBinaryMime = (mime: string): boolean => {
  if (mime === 'image/svg+xml') return false;
  if (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/')) {
    return true;
  }
  if (mime.startsWith('font/')) return true;
  if (mime === 'application/pdf' || mime === 'application/rtf' || mime === 'application/wasm') {
    return true;
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed') ||
    mime.includes('opendocument') ||
    mime.includes('officedocument') ||
    mime.includes('msword') ||
    mime.includes('ms-excel') ||
    mime.includes('ms-powerpoint') ||
    mime.includes('portable-executable')
  ) {
    return true;
  }
  return mime === 'application/octet-stream';
};

const basename = (path: string): string => path.split(/[/\\]/).pop() || path;

const extOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
};

/** True when the built-in editor can open this path (text / code). */
const isBuiltInEditable = (nameOrPath: string, ext = ''): boolean => {
  const name = basename(nameOrPath);
  const e = (ext || extOf(name)).toLowerCase();
  if (!e) return true;
  const mime = BINARY_MIME[e];
  return !mime || !isBinaryMime(mime);
};

type Show = (message: string, severity?: 'success' | 'error' | 'info' | 'warning') => void;

export const openDocument = (opts: {
  path: string;
  name?: string;
  ext?: string;
  useBuiltInEditor: boolean;
  openWorkspace: (root: string, file: string) => void;
  show: Show;
}): void => {
  const { path, useBuiltInEditor, openWorkspace, show } = opts;
  const remote = isRemotePath(path);
  const inArchive = !remote && isArchivePanePath(path);
  const name = opts.name || basename(path);
  const editable = isBuiltInEditable(name, opts.ext);
  if (editable && (useBuiltInEditor !== false || remote || inArchive)) {
    openWorkspace(parentDirOf(path), path);
    return;
  }
  if (remote) {
    show('This file type cannot be opened in the built-in editor on remote connections', 'warning');
    return;
  }
  if (inArchive) {
    show('Extract this file first to open it outside the built-in editor', 'warning');
    return;
  }
  void FileService.Open(path).catch((e) => show(errMessage(e), 'error'));
};
