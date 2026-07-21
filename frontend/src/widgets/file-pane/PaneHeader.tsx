import CancelIcon from '@mui/icons-material/Cancel'
import StorageIcon from '@mui/icons-material/Storage'
import TerminalIcon from '@mui/icons-material/Terminal'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { FC } from 'react'
import type { PaneId } from '../../entities/file/types'
import type { PaneJob } from '../../features/jobs/types'
import { jobKindIcon } from './helpers'
import {
  headerSpacerSx,
  jobCancelBtnSx,
  jobSpinnerIconSx,
  jobSpinnerWrapSx,
  jobTooltipBodySx,
  jobTooltipLabelSx,
  jobTooltipSlotSx,
  paneHeaderSx,
  paneHeaderTitleSx,
} from './styles'

type Props = {
  id: PaneId
  active: boolean
  path: string
  job: PaneJob | null | undefined
  terminalOpen: boolean
  onActivate: () => void
  onCancelJob: () => void
  onCalcSizes: () => void
  onToggleTerminal: () => void
}

export const PaneHeader: FC<Props> = ({
  id,
  active,
  path,
  job,
  terminalOpen,
  onActivate,
  onCancelJob,
  onCalcSizes,
  onToggleTerminal,
}) => (
  <Box onClick={onActivate} data-testid={`pane-header-${id}`} sx={paneHeaderSx(active)}>
    <Typography
      variant="caption"
      color={active ? 'primary' : 'text.secondary'}
      sx={paneHeaderTitleSx}
    >
      {id === 'left' ? 'Left' : 'Right'} pane
    </Typography>
    {job && (
      <Tooltip
        data-testid={`pane-job-tooltip-${id}`}
        placement="bottom-start"
        slotProps={{ tooltip: { sx: jobTooltipSlotSx } }}
        title={
          <Box sx={jobTooltipBodySx}>
            <Typography variant="body2" sx={jobTooltipLabelSx}>
              {job.label}
            </Typography>
            {job.cancelable && (
              <Button
                size="small"
                color="error"
                startIcon={<CancelIcon fontSize="small" />}
                data-testid={`btn-cancel-job-${id}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onCancelJob()
                }}
                sx={jobCancelBtnSx}
              >
                Cancel
              </Button>
            )}
          </Box>
        }
      >
        <Box
          sx={jobSpinnerWrapSx}
          data-testid={`pane-job-${id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <CircularProgress size={22} thickness={4} />
          <Box sx={jobSpinnerIconSx}>{jobKindIcon(job.kind)}</Box>
        </Box>
      </Tooltip>
    )}
    <Box sx={headerSpacerSx} />
    <Tooltip title="Calculate folder sizes">
      <IconButton
        data-testid={`btn-folder-sizes-${id}`}
        size="small"
        onClick={(e) => {
          e.stopPropagation()
          onCalcSizes()
        }}
      >
        <StorageIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip
      title={
        path.startsWith('ssh://') ? 'Terminal unavailable on remote' : 'Toggle terminal (Ctrl+`)'
      }
    >
      <span>
        <IconButton
          data-testid={`btn-terminal-toggle-${id}`}
          size="small"
          color={terminalOpen ? 'primary' : 'default'}
          disabled={path.startsWith('ssh://')}
          onClick={(e) => {
            e.stopPropagation()
            onToggleTerminal()
          }}
        >
          <TerminalIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  </Box>
)
