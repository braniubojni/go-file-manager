import ArchiveIcon from '@mui/icons-material/Archive'
import StorageIcon from '@mui/icons-material/Storage'
import UnarchiveIcon from '@mui/icons-material/Unarchive'
import type { ReactElement } from 'react'
import { createElement } from 'react'
import type { PaneJobKind } from '../../features/jobs/types'
import { jobKindIconSx } from './styles'

export const jobKindIcon = (kind: PaneJobKind): ReactElement => {
  const props = { sx: jobKindIconSx }
  switch (kind) {
    case 'archive':
      return createElement(ArchiveIcon, props)
    case 'extract':
      return createElement(UnarchiveIcon, props)
    case 'sizes':
    default:
      return createElement(StorageIcon, props)
  }
}

/** Parent directory for local or ssh:// paths. */
export const parentOfPath = (path: string): string => {
  if (path.startsWith('ssh://')) {
    const m = path.match(/^(ssh:\/\/[^/]+)(\/.*)?$/)
    if (m) {
      const base = m[1]
      const p = m[2] || '/'
      const parent = p.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/'
      return `${base}${parent === '/' ? '/' : parent}`
    }
  }
  const parent = path.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/'
  const fixed =
    path.startsWith('/') && !parent.startsWith('/') ? `/${parent}`.replace(/\/+/g, '/') : parent
  return fixed || '/'
}

export const isNestedInSelf = (paths: string[], dest: string): boolean =>
  paths.some((p) => p === dest || dest.startsWith(p + '/') || dest.startsWith(p + '\\'))

export const allSameParentAsDest = (paths: string[], dest: string): boolean => {
  const destNorm = dest.replace(/\/+$/, '')
  return paths.every((p) => {
    const parent = p.replace(/\/+$/, '').split(/[/\\]/).slice(0, -1).join('/') || '/'
    return parent === dest || parent === destNorm
  })
}

export const mapChildSizes = (
  map: { [key: string]: number | undefined } | null | undefined,
): Record<string, number> => {
  const sizes: Record<string, number> = {}
  if (map) {
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === 'number') sizes[k] = v
    }
  }
  return sizes
}
