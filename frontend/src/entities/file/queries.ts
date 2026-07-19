import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookmarkService, FileService, SettingsService } from '../../shared/api/bindings'
import type { Bookmark, FileEntry, PanePaths } from './types'

export const queryKeys = {
  dir: (path: string) => ['dir', path] as const,
  home: ['home'] as const,
  panePaths: ['panePaths'] as const,
  theme: ['theme'] as const,
  bookmarks: ['bookmarks'] as const,
}

export function useHomeDir() {
  return useQuery({
    queryKey: queryKeys.home,
    queryFn: () => FileService.GetHomeDir() as Promise<string>,
    staleTime: Infinity,
  })
}

export function useDirListing(path: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dir(path ?? ''),
    queryFn: async () => {
      const rows = await FileService.ListDir(path!)
      return rows as FileEntry[]
    },
    enabled: Boolean(path),
  })
}

export function usePanePaths() {
  return useQuery({
    queryKey: queryKeys.panePaths,
    queryFn: async () => {
      const paths = await SettingsService.GetPanePaths()
      return paths as PanePaths
    },
  })
}

export function useThemeSetting() {
  return useQuery({
    queryKey: queryKeys.theme,
    queryFn: async () => {
      const theme = await SettingsService.GetTheme()
      return (theme === 'light' ? 'light' : 'dark') as 'light' | 'dark'
    },
  })
}

export function useBookmarks() {
  return useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: async () => {
      const list = await BookmarkService.List()
      return list as Bookmark[]
    },
  })
}

export function useSavePanePaths() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ left, right }: PanePaths) => SettingsService.SavePanePaths(left, right),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.panePaths }),
  })
}

export function useSetTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (theme: 'light' | 'dark') => SettingsService.SetTheme(theme),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.theme }),
  })
}

export function useInvalidateDirs() {
  const qc = useQueryClient()
  return (...paths: string[]) => {
    for (const p of paths) {
      if (p) void qc.invalidateQueries({ queryKey: queryKeys.dir(p) })
    }
  }
}

export function useFileOps() {
  const invalidate = useInvalidateDirs()
  const qc = useQueryClient()

  const copy = useMutation({
    mutationFn: ({ sources, destDir }: { sources: string[]; destDir: string }) =>
      FileService.Copy(sources, destDir),
    onSuccess: (_d, v) => invalidate(...parentDirs(v.sources), v.destDir),
  })

  const move = useMutation({
    mutationFn: ({ sources, destDir }: { sources: string[]; destDir: string }) =>
      FileService.Move(sources, destDir),
    onSuccess: (_d, v) => invalidate(...parentDirs(v.sources), v.destDir),
  })

  const del = useMutation({
    mutationFn: (paths: string[]) => FileService.Delete(paths),
    onSuccess: (_d, paths) => invalidate(...parentDirs(paths)),
  })

  const rename = useMutation({
    mutationFn: ({ oldPath, newName }: { oldPath: string; newName: string }) =>
      FileService.Rename(oldPath, newName),
    onSuccess: (_d, v) => invalidate(...parentDirs([v.oldPath])),
  })

  const mkdir = useMutation({
    mutationFn: ({ parent, name }: { parent: string; name: string }) =>
      FileService.Mkdir(parent, name),
    onSuccess: (_d, v) => invalidate(v.parent),
  })

  const addBookmark = useMutation({
    mutationFn: ({ name, path }: { name: string; path: string }) =>
      BookmarkService.Add(name, path),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.bookmarks }),
  })

  const removeBookmark = useMutation({
    mutationFn: (id: number) => BookmarkService.Remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.bookmarks }),
  })

  return { copy, move, del, rename, mkdir, addBookmark, removeBookmark }
}

function parentDirs(paths: string[]): string[] {
  const set = new Set<string>()
  for (const p of paths) {
    const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
    if (idx > 0) set.add(p.slice(0, idx))
  }
  return [...set]
}
