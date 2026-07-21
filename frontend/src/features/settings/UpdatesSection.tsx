import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type FC } from 'react'
import type { AppSettings } from '../../entities/file/types'
import { formatBytes } from '../updates/helpers'
import { useUpdateActions } from '../updates/hooks/useUpdateActions'
import { useUpdateStore } from '../updates/updateStore'
import { UpdateService } from '../../shared/api/bindings'

type Props = {
  draft: AppSettings
  onChange: (next: AppSettings) => void
}

export const UpdatesSection: FC<Props> = ({ draft, onChange }) => {
  const [version, setVersion] = useState('…')
  const phase = useUpdateStore((s) => s.phase)
  const info = useUpdateStore((s) => s.info)
  const error = useUpdateStore((s) => s.error)
  const { check, downloadAndApply, skip, openReleases } = useUpdateActions()

  useEffect(() => {
    void UpdateService.GetVersion()
      .then(setVersion)
      .catch(() => setVersion('unknown'))
  }, [])

  const busy = phase === 'checking' || phase === 'downloading'

  return (
    <Stack spacing={1.5} data-testid="settings-updates">
      <Typography variant="subtitle2">Updates</Typography>
      <Typography variant="body2" color="text.secondary">
        Version: <strong data-testid="app-version">{version}</strong>
      </Typography>

      <FormControlLabel
        control={
          <Switch
            data-testid="settings-auto-check-updates"
            checked={draft.autoCheckUpdates}
            onChange={(_, v) => onChange({ ...draft, autoCheckUpdates: v })}
          />
        }
        label="Check for updates automatically (every 10 days)"
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Button
          size="small"
          variant="outlined"
          data-testid="btn-check-updates"
          disabled={busy}
          onClick={() => void check()}
          startIcon={phase === 'checking' ? <CircularProgress size={14} /> : undefined}
        >
          Check for updates
        </Button>
        <Button size="small" onClick={openReleases}>
          Open releases page
        </Button>
      </Box>

      {phase === 'upToDate' && (
        <Typography variant="body2" color="success.main" data-testid="update-status-ok">
          You’re on the latest version (v{info?.currentVersion ?? version}).
        </Typography>
      )}
      {phase === 'error' && (
        <Typography variant="body2" color="error" data-testid="update-status-error">
          {error || 'Update check failed'}
        </Typography>
      )}
      {phase === 'downloading' && (
        <Typography variant="body2" data-testid="update-status-download">
          Downloading… <CircularProgress size={14} sx={{ ml: 1 }} />
        </Typography>
      )}
      {phase === 'available' && info && (
        <Box
          sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          data-testid="update-available"
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            v{info.latestVersion} available
          </Typography>
          {info.assetName ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {info.assetName}
              {info.assetSize ? ` · ${formatBytes(info.assetSize)}` : ''}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              No package for this platform in the release — open the releases page to download.
            </Typography>
          )}
          {info.notes ? (
            <Typography
              variant="caption"
              component="pre"
              sx={{
                mt: 1,
                maxHeight: 120,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
              }}
            >
              {info.notes}
            </Typography>
          ) : null}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            <Button
              size="small"
              variant="contained"
              data-testid="btn-update-now"
              disabled={busy}
              onClick={() => void downloadAndApply()}
            >
              {info.assetUrl ? 'Update now' : 'Open release'}
            </Button>
            <Button size="small" onClick={skip}>
              Skip this version
            </Button>
          </Box>
        </Box>
      )}
    </Stack>
  )
}
