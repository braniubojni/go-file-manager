import { useEffect } from 'react'
import { useSavePanePaths } from '../../../entities/file/queries'
import { usePaneStore } from '../../../features/pane/paneStore'

/** Debounced save of left/right paths when they change. */
export const usePersistPanePaths = (ready: boolean) => {
  const leftPath = usePaneStore((s) => s.leftPath)
  const rightPath = usePaneStore((s) => s.rightPath)
  const savePaths = useSavePanePaths()

  useEffect(() => {
    if (!ready || !leftPath || !rightPath) return
    const t = setTimeout(() => {
      savePaths.mutate({ left: leftPath, right: rightPath })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only persist on path/ready change
  }, [leftPath, rightPath, ready])
}
