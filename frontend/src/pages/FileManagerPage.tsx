import { Box, CircularProgress } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useHomeDir, usePanePaths, useSavePanePaths } from '../entities/file/queries'
import { usePaneStore } from '../features/pane/paneStore'
import { FileService } from '../shared/api/bindings'
import { StatusBar } from '../widgets/status-bar/StatusBar'
import { FilePane } from '../widgets/file-pane/FilePane'
import { Toolbar } from '../widgets/toolbar/Toolbar'

export function FileManagerPage() {
  const ready = usePaneStore((s) => s.ready)
  const setPaths = usePaneStore((s) => s.setPaths)
  const leftPath = usePaneStore((s) => s.leftPath)
  const rightPath = usePaneStore((s) => s.rightPath)
  const setActivePane = usePaneStore((s) => s.setActivePane)
  const qc = useQueryClient()

  const { data: home, isLoading: homeLoading } = useHomeDir()
  const { data: saved, isLoading: pathsLoading } = usePanePaths()
  const savePaths = useSavePanePaths()

  useEffect(() => {
    if (ready || homeLoading || pathsLoading || !home) return

    const init = async () => {
      let left = saved?.left || home
      let right = saved?.right || home
      try {
        if (left && !(await FileService.Exists(left))) left = home
        if (right && !(await FileService.Exists(right))) right = home
      } catch {
        left = home
        right = home
      }
      setPaths(left, right)
    }
    void init()
  }, [ready, home, saved, homeLoading, pathsLoading, setPaths])

  // Persist pane paths when they change
  useEffect(() => {
    if (!ready || !leftPath || !rightPath) return
    const t = setTimeout(() => {
      void savePaths.mutateAsync({ left: leftPath, right: rightPath })
    }, 400)
    return () => clearTimeout(t)
  }, [leftPath, rightPath, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setActivePane(usePaneStore.getState().activePane === 'left' ? 'right' : 'left')
      }
      if (e.key === 'F5') {
        e.preventDefault()
        void qc.invalidateQueries({ queryKey: ['dir'] })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setActivePane, qc])

  if (!ready) {
    return (
      <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar />
      <Box sx={{ flex: 1, display: 'flex', gap: 1, p: 1, minHeight: 0 }}>
        <FilePane id="left" />
        <FilePane id="right" />
      </Box>
      <StatusBar />
    </Box>
  )
}
