export type PaneId = 'left' | 'right';

export type ThemePreference = 'system' | 'dark' | 'light';

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: number;
  ext: string;
  isSymlink: boolean;
  /** 'full' | 'readonly' | 'partial' | 'none', or '' when unknown (remote). */
  access: string;
}

export interface Volume {
  path: string;
  name: string;
  kind: string;
  unmountable: boolean;
  sourcePath?: string;
  device?: string;
}

interface TabState {
  path: string;
}

export interface PaneTabsState {
  left: TabState[];
  leftActive: number;
  right: TabState[];
  rightActive: number;
}

export interface AppSettings {
  theme: ThemePreference;
  showHidden: boolean;
  showExtensions: boolean;
  showGitStatus: boolean;
  useBuiltInEditor: boolean;
  autoCheckUpdates: boolean;
  updateCheckIntervalDays: number;
  lastUpdateCheckAt: string;
  skippedUpdateVersion: string;
  leftPath: string;
  rightPath: string;
}

export interface GitDirStatus {
  repoRoot: string;
  entries: { name: string; status: string }[];
}

export interface SearchHit {
  name: string;
  path: string;
  isDir: boolean;
  relPath: string;
}

export const defaultSettings: AppSettings = {
  theme: 'system',
  showHidden: false,
  showExtensions: true,
  showGitStatus: true,
  useBuiltInEditor: true,
  autoCheckUpdates: true,
  updateCheckIntervalDays: 10,
  lastUpdateCheckAt: '',
  skippedUpdateVersion: '',
  leftPath: '',
  rightPath: '',
};
