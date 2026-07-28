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
  useBuiltInEditor: boolean;
  autoCheckUpdates: boolean;
  updateCheckIntervalDays: number;
  lastUpdateCheckAt: string;
  skippedUpdateVersion: string;
  leftPath: string;
  rightPath: string;
}

export interface SearchHit {
  name: string;
  path: string;
  isDir: boolean;
  relPath: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  notes: string;
  htmlUrl: string;
  assetName: string;
  assetUrl: string;
  assetSize: number;
  available: boolean;
}

export const defaultSettings: AppSettings = {
  theme: 'system',
  showHidden: false,
  showExtensions: true,
  useBuiltInEditor: true,
  autoCheckUpdates: true,
  updateCheckIntervalDays: 10,
  lastUpdateCheckAt: '',
  skippedUpdateVersion: '',
  leftPath: '',
  rightPath: '',
};
