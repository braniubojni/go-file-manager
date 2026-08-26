import type { FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CancelIcon from '@mui/icons-material/Cancel';
import { averageTransferPercent, useTransferStore } from '../../features/transfers/transferStore';
import type { TransferOp } from '../../features/transfers/types';
import { FileService } from '../../shared/api/bindings';
import { formatSize } from '../../shared/lib/format';
import {
  tooltipHeaderSx,
  tooltipListSx,
  tooltipRowSx,
  tooltipSlotSx,
  transferBarSx,
  transferSegmentSx,
} from './styles';

const basename = (p: string): string => p.split(/[/\\]/).pop() || p;

const kindCaption = (kind: TransferOp['kind']): string => {
  if (kind === 'move') return 'Moving';
  if (kind === 'attach') return 'Attaching';
  return 'Copying';
};

const determinateLabel = (determinate: boolean, avg: number): string =>
  determinate ? ` · ${avg}%` : '';

const TransferTooltipBody: FC<{ ops: TransferOp[] }> = ({ ops }) => {
  const remove = useTransferStore((s) => s.remove);

  const onCancel = (jobId: string) => {
    void FileService.CancelJob(jobId).catch(() => undefined);
    remove(jobId);
  };

  return (
    <Box sx={tooltipListSx} data-testid="transfer-tooltip">
      {ops.map((op) => (
        <Box key={op.jobId} sx={tooltipRowSx} data-testid={`transfer-row-${op.jobId}`}>
          <Box sx={tooltipHeaderSx}>
            <Typography variant="caption" noWrap sx={{ flex: 1, fontWeight: 600 }}>
              {op.label}
            </Typography>
            <Button
              size="small"
              color="error"
              startIcon={<CancelIcon fontSize="small" />}
              data-testid={`btn-cancel-transfer-${op.jobId}`}
              onClick={(e) => {
                e.stopPropagation();
                onCancel(op.jobId);
              }}
              sx={{ minWidth: 0, py: 0, px: 0.5 }}
            >
              Cancel
            </Button>
          </Box>
          {op.currentPath ? (
            <Typography variant="caption" color="grey.400" noWrap>
              {basename(op.currentPath)}
            </Typography>
          ) : null}
          <LinearProgress
            variant={op.bytesTotal > 0 ? 'determinate' : 'indeterminate'}
            value={op.percent}
            sx={{ height: 4, borderRadius: 1 }}
          />
          <Typography variant="caption" color="grey.400">
            {op.bytesTotal > 0
              ? `${formatSize(op.bytesDone, false)} / ${formatSize(op.bytesTotal, false)} · ${op.percent}%`
              : 'Working…'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export const TransferStatusSegment: FC = () => {
  const byId = useTransferStore((s) => s.byId);
  const ops = Object.values(byId);
  if (!ops.length) return null;

  const avg = averageTransferPercent(ops);
  const determinate = ops.every((o) => o.bytesTotal > 0);
  const caption =
    ops.length === 1
      ? `${kindCaption(ops[0].kind)}${determinateLabel(determinate, avg)}`
      : `${ops.length} transfers · ${avg}%`;

  return (
    <Tooltip
      placement="top"
      slotProps={{ tooltip: { sx: tooltipSlotSx } }}
      title={<TransferTooltipBody ops={ops} />}
    >
      <Box sx={transferSegmentSx} data-testid="transfer-status">
        <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
          {caption}
        </Typography>
        <LinearProgress
          variant={determinate ? 'determinate' : 'indeterminate'}
          value={avg}
          sx={transferBarSx}
          data-testid="transfer-status-bar"
        />
      </Box>
    </Tooltip>
  );
};
