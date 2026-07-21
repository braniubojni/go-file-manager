import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookmarkService, FileService, SettingsService } from '../../shared/api/bindings'
import type {
  AppSettings,
  Bookmark,
  FileEntry,
  PanePaths,
  SearchHit,
  ShortcutDef,
  ThemePreference,
} from './types'
import { defaultSettings } from './types'

export const queryKeys = {
  dir: (path: string, showHidden: boolean) => ['dir', path, showHidden] as const,
  home: ['home'] as const,
  settings: ['settings'] as const,
  shortcuts: ['shortcuts'] as const,
  shortcutDefs: ['shortcutDefs'] as const,
  bookmarks: ['bookmarks'] as const,
  pathCompletions: (partial: string) => ['pathCompletions', partial] as const,
}

export const useHomeDir = () => {
  return useQuery({
    queryKey: queryKeys.home,
    queryFn: () => FileService.GetHomeDir() as Promise<string>,
    staleTime: Infinity,
  })
}

export const useSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      // Bindings type theme as string; normalize to our ThemePreference union.
      const s = await SettingsService.GetSettings()
      return normalizeSettings(s)
    },
  })
}

/** Accept loose binding payloads (generated types use string theme, etc.). */
const normalizeSettings = (
  s:
    | {
        theme?: string
        showHidden?: boolean
        showExtensions?: boolean
        useBuiltInEditor?: boolean
        autoCheckUpdates?: boolean
        updateCheckIntervalDays?: number
        lastUpdateCheckAt?: string
        skippedUpdateVersion?: string
        leftPath?: string
        rightPath?: string
      }
    | null
    | undefined,
): AppSettings => {
  const theme = s?.theme
  const interval = s?.updateCheckIntervalDays
  return {
    theme:
      theme === 'dark' || theme === 'light' || theme === 'system' ? theme : defaultSettings.theme,
    showHidden: Boolean(s?.showHidden),
    showExtensions: s?.showExtensions !== false,
    useBuiltInEditor: s?.useBuiltInEditor !== false,
    autoCheckUpdates: s?.autoCheckUpdates !== false,
    updateCheckIntervalDays:
      typeof interval === 'number' && interval > 0
        ? interval
        : defaultSettings.updateCheckIntervalDays,
    lastUpdateCheckAt: s?.lastUpdateCheckAt ?? '',
    skippedUpdateVersion: s?.skippedUpdateVersion ?? '',
    leftPath: s?.leftPath ?? '',
    rightPath: s?.rightPath ?? '',
  }
}

const settingsPayload = (settings: AppSettings) => ({
  theme: settings.theme,
  showHidden: settings.showHidden,
  showExtensions: settings.showExtensions,
  useBuiltInEditor: settings.useBuiltInEditor,
  autoCheckUpdates: settings.autoCheckUpdates,
  updateCheckIntervalDays: settings.updateCheckIntervalDays,
  lastUpdateCheckAt: settings.lastUpdateCheckAt,
  skippedUpdateVersion: settings.skippedUpdateVersion,
  leftPath: settings.leftPath,
  rightPath: settings.rightPath,
})

export const useSaveSettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: AppSettings) => SettingsService.SaveSettings(settingsPayload(settings)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.settings })
    },
  })
}

export const usePatchSettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<AppSettings>) => {
      const current =
        (qc.getQueryData<AppSettings>(queryKeys.settings) as AppSettings | undefined) ??
        normalizeSettings(await SettingsService.GetSettings())
      const next = { ...current, ...patch }
      await SettingsService.SaveSettings(settingsPayload(next))
      return next
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.settings })
    },
  })
}

export const useSearchTree = (
  root: string | undefined,
  query: string,
  showHidden: boolean,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: ['searchTree', root ?? '', query, showHidden] as const,
    queryFn: async () => {
      const rows = await FileService.SearchTree(root!, query, showHidden, 80)
      return (rows ?? []) as SearchHit[]
    },
    enabled: Boolean(enabled && root && !root.startsWith('ssh://')),
    staleTime: 2_000,
  })
}

export const useDirListing = (path: string | undefined, showHidden: boolean) => {
  return useQuery({
    queryKey: queryKeys.dir(path ?? '', showHidden),
    queryFn: async () => {
      const rows = await FileService.ListDir(path!, showHidden)
      return (rows ?? []) as FileEntry[]
    },
    enabled: Boolean(path),
  })
}

export const usePathCompletions = (partial: string, enabled: boolean) => {
  return useQuery({
    queryKey: queryKeys.pathCompletions(partial),
    queryFn: async () => {
      const rows = await FileService.ListPathCompletions(partial)
      return (rows ?? []) as string[]
    },
    enabled: enabled && partial.length > 0,
    staleTime: 5_000,
  })
}

export const useBookmarks = () => {
  return useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: async () => {
      const list = await BookmarkService.List()
      return (list ?? []) as Bookmark[]
    },
  })
}

export const useShortcutDefs = () => {
  return useQuery({
    queryKey: queryKeys.shortcutDefs,
    queryFn: async () => {
      const list = await SettingsService.ListShortcutDefs()
      return (list ?? []) as ShortcutDef[]
    },
  })
}

export const useSaveShortcuts = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (map: Record<string, string>) => SettingsService.SaveShortcuts(map),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.shortcutDefs })
      void qc.invalidateQueries({ queryKey: queryKeys.shortcuts })
    },
  })
}

export const useSavePanePaths = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ left, right }: PanePaths) => {
      await SettingsService.SavePanePaths(left, right)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.settings })
    },
  })
}

/** Theme-only settings patch — use mutate / onSuccess / onError. */
export const useSetTheme = () => {
  const patch = usePatchSettings()
  return {
    mutate: (
      theme: ThemePreference,
      options?: {
        onSuccess?: () => void
        onError?: (e: unknown) => void
      },
    ) => {
      patch.mutate({ theme }, options)
    },
    isPending: patch.isPending,
  }
}

export const useInvalidateDirs = () => {
  const qc = useQueryClient()
  return (...paths: string[]) => {
    for (const p of paths) {
      if (p) void qc.invalidateQueries({ queryKey: ['dir', p] })
    }
  }
}

export const useFileOps = () => {
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

  const mkfile = useMutation({
    mutationFn: ({ parent, name }: { parent: string; name: string }) =>
      FileService.CreateFile(parent, name),
    onSuccess: (_d, v) => invalidate(v.parent),
  })

  const addBookmark = useMutation({
    mutationFn: ({ name, path }: { name: string; path: string }) => BookmarkService.Add(name, path),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.bookmarks })
    },
  })

  const removeBookmark = useMutation({
    mutationFn: (id: number) => BookmarkService.Remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.bookmarks })
    },
  })

  return { copy, move, del, rename, mkdir, mkfile, addBookmark, removeBookmark }
}

const parentDirs = (paths: string[]): string[] => {
  const set = new Set<string>()
  for (const p of paths) {
    const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
    if (idx > 0) set.add(p.slice(0, idx))
  }
  return [...set]
}
