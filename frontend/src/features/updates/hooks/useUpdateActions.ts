import { useCallback } from 'react'
import { usePatchSettings } from '../../../entities/file/queries'
import type { UpdateInfo } from '../../../entities/file/types'
import { UpdateService } from '../../../shared/api/bindings'
import { errMessage } from '../../../shared/lib/format'
import { useSnack } from '../../../shared/ui/SnackbarHost'
import { useUpdateStore } from '../updateStore'

export const useUpdateActions = () => {
  const patch = usePatchSettings()
  const show = useSnack((s) => s.show)
  const setPhase = useUpdateStore((s) => s.setPhase)
  const setInfo = useUpdateStore((s) => s.setInfo)
  const setError = useUpdateStore((s) => s.setError)

  const markChecked = useCallback(() => {
    patch.mutate({ lastUpdateCheckAt: new Date().toISOString() })
  }, [patch])

  const check = useCallback(async (): Promise<UpdateInfo | null> => {
    setPhase('checking')
    setInfo(null)
    try {
      const raw = await UpdateService.CheckForUpdate()
      const info = raw as UpdateInfo
      setInfo(info)
      markChecked()
      if (info.available) setPhase('available')
      else setPhase('upToDate')
      return info
    } catch (e) {
      setError(errMessage(e))
      return null
    }
  }, [setPhase, setInfo, setError, markChecked])

  const downloadAndApply = useCallback(async () => {
    const info = useUpdateStore.getState().info
    if (!info?.available) return
    if (!info.assetUrl) {
      void UpdateService.OpenReleasesPage().catch((e) => show(errMessage(e), 'error'))
      return
    }
    setPhase('downloading')
    try {
      const path = await UpdateService.DownloadUpdate(info.assetUrl)
      await UpdateService.ApplyUpdate(path)
      show('Opened the update package. Quit the app to finish installing.', 'success')
      setPhase('available')
    } catch (e) {
      setError(errMessage(e))
    }
  }, [setPhase, setError, show])

  const skip = useCallback(() => {
    const info = useUpdateStore.getState().info
    if (!info?.latestVersion) return
    patch.mutate({ skippedUpdateVersion: info.latestVersion })
    setPhase('idle')
    show(`Skipped v${info.latestVersion}`, 'info')
  }, [patch, setPhase, show])

  const openReleases = useCallback(() => {
    void UpdateService.OpenReleasesPage().catch((e) => show(errMessage(e), 'error'))
  }, [show])

  return { check, downloadAndApply, skip, openReleases }
}
