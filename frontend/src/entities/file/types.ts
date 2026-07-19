export type PaneId = 'left' | 'right'

export type ThemePreference = 'system' | 'dark' | 'light'

export interface FileEntry {
  name: string
  path: string
  isDir: boolean
  size: number
  modTime: number
  ext: string
  isSymlink: boolean
}

export interface Bookmark {
  id: number
  name: string
  path: string
  sortOrder: number
  createdAt: string
}

export interface PanePaths {
  left: string
  right: string
}

export interface AppSettings {
  theme: ThemePreference
  showHidden: boolean
  showExtensions: boolean
  leftPath: string
  rightPath: string
}

export interface ShortcutDef {
  id: string
  label: string
  description: string
  binding: string
}

export const defaultSettings: AppSettings = {
  theme: 'system',
  showHidden: false,
  showExtensions: true,
  leftPath: '',
  rightPath: '',
}
