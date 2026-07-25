import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useReducer, useState } from 'react'
import {
  addConnectionReducer,
  initialAddConnectionState,
} from '../../../features/connections/addConnectionReducer'
import {
  isAuthErrorMessage,
  resolveRemoteWorkdirInput,
} from '../../../features/connections/helpers'
import type {
  ActiveSession,
  ConnectionProfile,
  RemoteRecent,
  SSHConfigHost,
} from '../../../features/connections/types'
import { usePaneStore } from '../../../features/pane/paneStore'
import { ConnectionService } from '../../../shared/api/bindings'
import { errMessage } from '../../../shared/lib/format'
import { useSnack } from '../../../shared/ui/SnackbarHost'

type ConnectRes = {
  rootPath: string
  homePath: string
  key: string
  profileId?: string
  defaultWorkDir?: string
}

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

  /** Always offer workdir picker after connect (home + recents + saved default). */
  const afterConnect = async (res: ConnectRes) => {
    const homePath = res.homePath || res.rootPath
    const recents = ((await ConnectionService.GetRecentPaths(res.key).catch(() => null)) ??
      []) as RemoteRecent[]
    const chosen = res.defaultWorkDir || homePath
    dispatch({
      type: 'open_workdir',
      paths: recents,
      home: homePath,
      sessionKey: res.key,
      chosen,
      profileId: res.profileId,
    })
  }

  const confirmWorkdir = async () => {
    let path = dialog.workdirChosen
    if (path === '__custom__' || dialog.workdirCustom.trim()) {
      const resolved = resolveRemoteWorkdirInput(dialog.workdirHome, dialog.workdirCustom)
      if (!resolved) {
        dispatch({ type: 'set_error', error: 'Enter a remote path (e.g. /home/user/project)' })
        return
      }
      path = resolved
    }
    if (!path) path = dialog.workdirHome
    void ConnectionService.AddRecentPath(path)
    if (dialog.workdirRemember && dialog.workdirProfileId) {
      try {
        await ConnectionService.SetProfileDefaultWorkDir(dialog.workdirProfileId, path)
        void qc.invalidateQueries({ queryKey: ['connections', 'profiles'] })
      } catch {
        // non-fatal
      }
    }
    navigate(activePane, path)
    refresh()
    show('Connected', 'success')
    dispatch({ type: 'close' })
    setAnchor(null)
  }

  const connectProfile = async (id: string, password = '') => {
    try {
      const res = (await ConnectionService.ConnectProfile(id, password)) as ConnectRes
      await afterConnect(res)
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

  const connectFromConfig = async (host: SSHConfigHost, password = '') => {
    try {
      const res = (await ConnectionService.ConnectFromConfig(
        host,
        password,
        dialog.save,
      )) as ConnectRes
      dispatch({ type: 'select_config_host', host })
      await afterConnect(res)
    } catch (e) {
      const msg = errMessage(e)
      if (isAuthErrorMessage(msg) && !password) {
        dispatch({ type: 'select_config_host', host })
        dispatch({ type: 'need_password' })
        return
      }
      throw e
    }
  }

  const openSSHConfigMode = async () => {
    dispatch({ type: 'open_ssh_config' })
    try {
      const paths = await ConnectionService.DefaultSSHConfigPaths()
      const first = paths?.[0] ?? ''
      if (first) dispatch({ type: 'set_ssh_config_path', path: first })
    } catch {
      // non-fatal — user can type the path manually
    }
  }

  const loadSSHConfig = async (configPath: string) => {
    dispatch({ type: 'set_ssh_config_loading', loading: true })
    try {
      const hosts = await ConnectionService.ListSSHConfigHosts(configPath)
      dispatch({ type: 'set_ssh_config_hosts', hosts: (hosts ?? []) as SSHConfigHost[] })
    } catch (e) {
      dispatch({ type: 'set_error', error: errMessage(e) })
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
    if (dialog.mode === 'workdir') {
      await confirmWorkdir()
      return
    }
    dispatch({ type: 'set_busy', busy: true })
    try {
      if (dialog.mode === 'ssh_config') {
        if (dialog.selectedConfigHost) {
          await connectFromConfig(dialog.selectedConfigHost, dialog.password)
        }
        return
      }
      if (dialog.mode === 'password' && dialog.profileId) {
        await connectProfile(dialog.profileId, dialog.password)
        return
      }
      // mode === 'add'
      const spec = dialog.spec.trim()
      if (!spec) {
        dispatch({
          type: 'set_error',
          error: 'Enter ssh user@host, or an SSH config Host alias (e.g. pahestain)',
        })
        return
      }
      await ConnectionService.ParseSpec(spec)
      try {
        const res = (await ConnectionService.ConnectSpec(
          spec,
          dialog.password,
          dialog.save,
        )) as ConnectRes
        await afterConnect(res)
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
    openSSHConfigMode,
    loadSSHConfig,
    connectFromConfig,
  }
}
