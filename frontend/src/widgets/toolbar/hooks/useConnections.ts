import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useReducer, useState } from 'react'
import {
  addConnectionReducer,
  initialAddConnectionState,
} from '../../../features/connections/addConnectionReducer'
import { isAuthErrorMessage } from '../../../features/connections/helpers'
import type { ActiveSession, ConnectionProfile } from '../../../features/connections/types'
import { usePaneStore } from '../../../features/pane/paneStore'
import { ConnectionService } from '../../../shared/api/bindings'
import { errMessage } from '../../../shared/lib/format'
import { useSnack } from '../../../shared/ui/SnackbarHost'

export const useConnections = () => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const [dialog, dispatch] = useReducer(addConnectionReducer, initialAddConnectionState)
  const show = useSnack((s) => s.show)
  const qc = useQueryClient()
  const navigate = usePaneStore((s) => s.navigate)
  const activePane = usePaneStore((s) => s.activePane)

  const profilesQ = useQuery({
    queryKey: ['connections', 'profiles'],
    queryFn: async () => ((await ConnectionService.ListProfiles()) ?? []) as ConnectionProfile[],
  })

  const sessionsQ = useQuery({
    queryKey: ['connections', 'sessions'],
    queryFn: async () => ((await ConnectionService.ListSessions()) ?? []) as ActiveSession[],
  })

  const profiles = profilesQ.data ?? []
  const sessions = sessionsQ.data ?? []
  const sessionKeys = new Set(sessions.map((s) => s.key))
  const sshProfiles = profiles.filter((p) => p.protocol === 'ssh' || !p.protocol)

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['connections'] })
    void qc.invalidateQueries({ queryKey: ['dir'] })
  }

  const applyConnect = (homePath: string) => {
    navigate(activePane, homePath)
    refresh()
    show('Connected', 'success')
    dispatch({ type: 'close' })
    setAnchor(null)
  }

  const connectProfile = async (id: string, password = '') => {
    try {
      const res = await ConnectionService.ConnectProfile(id, password)
      applyConnect(res.homePath || res.rootPath)
    } catch (e) {
      const msg = errMessage(e)
      if (isAuthErrorMessage(msg) && !password) {
        const p = profiles.find((x) => x.id === id)
        dispatch({ type: 'open_password', profileId: id, label: p?.label })
        return
      }
      show(msg, 'error')
      dispatch({ type: 'set_error', error: msg })
    }
  }

  const onMenuConnect = (p: ConnectionProfile) => {
    setAnchor(null)
    void connectProfile(p.id)
  }

  const onDisconnect = async (key: string) => {
    try {
      await ConnectionService.Disconnect(key)
      refresh()
      show('Disconnected', 'info')
      setAnchor(null)
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const onRemove = async (id: string) => {
    try {
      await ConnectionService.RemoveProfile(id)
      refresh()
    } catch (e) {
      show(errMessage(e), 'error')
    }
  }

  const submitDialog = async () => {
    dispatch({ type: 'set_busy', busy: true })
    try {
      if (dialog.mode === 'password' && dialog.profileId) {
        await connectProfile(dialog.profileId, dialog.password)
        return
      }
      const spec = dialog.spec.trim()
      if (!spec) {
        dispatch({ type: 'set_error', error: 'Enter a connection string, e.g. ssh user@host' })
        return
      }
      await ConnectionService.ParseSpec(spec)
      try {
        const res = await ConnectionService.ConnectSpec(spec, dialog.password, dialog.save)
        applyConnect(res.homePath || res.rootPath)
      } catch (e) {
        const msg = errMessage(e)
        if (isAuthErrorMessage(msg) && !dialog.password) {
          dispatch({ type: 'need_password' })
          return
        }
        throw e
      }
    } catch (e) {
      dispatch({ type: 'set_error', error: errMessage(e) })
    } finally {
      dispatch({ type: 'set_busy', busy: false })
    }
  }

  return {
    anchor,
    setAnchor,
    dialog,
    dispatch,
    sshProfiles,
    sessionKeys,
    onMenuConnect,
    onDisconnect,
    onRemove,
    submitDialog,
  }
}
