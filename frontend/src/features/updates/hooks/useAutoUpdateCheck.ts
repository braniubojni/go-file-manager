import { useEffect, useRef } from 'react'
import { useSettings } from '../../../entities/file/queries'
import { useSnack } from '../../../shared/ui/SnackbarHost'
import { isUpdateCheckDue, shouldNotifyUpdate } from '../helpers'
import { useUpdateActions } from './useUpdateActions'

/** Background update check after app is ready (every N days when enabled). */
export const useAutoUpdateCheck = (ready: boolean) => {
  const { data: settings } = useSettings()
  const { check } = useUpdateActions()
  const show = useSnack((s) => s.show)
  const ran = useRef(false)

  useEffect(() => {
    if (!ready || !settings || ran.current) return
    if (!isUpdateCheckDue(settings)) return
    ran.current = true

    const t = window.setTimeout(() => {
      void check().then((info) => {
        if (!info) return
        // check() already patches lastUpdateCheckAt via markChecked
        if (shouldNotifyUpdate(info, settings.skippedUpdateVersion)) {
          show(`Update available: v${info.latestVersion}`, 'info')
        }
      })
    }, 2500)

    return () => window.clearTimeout(t)
  }, [ready, settings, check, show])
}
