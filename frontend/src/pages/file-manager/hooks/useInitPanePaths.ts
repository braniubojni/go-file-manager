import { useEffect } from 'react'
import { useHomeDir, useSettings } from '../../../entities/file/queries'
import { usePaneStore } from '../../../features/pane/paneStore'
import { FileService } from '../../../shared/api/bindings'

/** Load home + saved pane paths once, then mark store ready. */
export const useInitPanePaths = () => {
  const ready = usePaneStore((s) => s.ready)
  const setPaths = usePaneStore((s) => s.setPaths)
  const { data: home, isLoading: homeLoading } = useHomeDir()
  const { data: settings, isLoading: settingsLoading } = useSettings()

  useEffect(() => {
    if (ready || homeLoading || settingsLoading || !home) return

    const init = async () => {
      let left = settings?.leftPath || home
      let right = settings?.rightPath || home
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
  }, [ready, home, settings, homeLoading, settingsLoading, setPaths])

  return ready
}
