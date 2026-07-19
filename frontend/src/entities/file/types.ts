export type PaneId = 'left' | 'right'

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
