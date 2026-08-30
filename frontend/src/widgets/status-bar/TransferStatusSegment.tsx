import type { FC, MouseEvent } from 'react';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { averageTransferPercent, useTransferStore } from '../../features/transfers/transferStore';
import type { TransferFile, TransferOp } from '../../features/transfers/types';
import { FileService } from '../../shared/api/bindings';
import { formatSize } from '../../shared/lib/format';
import {
  fileListSx,
  fileRowCancelSx,
  fileRowSx,
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

const fileStatusColor = (status: TransferFile['status']): 'grey.400' | 'success.main' =>
  status === 'done' ? 'success.main' : 'grey.400';

const FileRow: FC<{ jobId: string; file: TransferFile }> = ({ jobId, file }) => {
  const onCancelFile = (e: MouseEvent) => {
    e.stopPropagation();
    void FileService.CancelTransferFile(jobId, file.path).catch(() => undefined);
  };

  return (
    <Box sx={fileRowSx} data-testid={`transfer-file-row-${file.path}`}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          noWrap
          color={file.status === 'canceled' ? 'grey.600' : 'text.primary'}
          sx={{
            display: 'block',
            ...(file.status === 'canceled' ? { textDecoration: 'line-through' } : null),
          }}
        >
          {basename(file.path)}
        </Typography>
        <LinearProgress
          variant={file.total > 0 ? 'determinate' : 'indeterminate'}
          value={file.percent}
          sx={{ height: 3, borderRadius: 1 }}
        />
      </Box>
      <Typography
        variant="caption"
        color={fileStatusColor(file.status)}
        noWrap
        sx={{ flexShrink: 0 }}
      >
        {file.status === 'canceled'
          ? 'Cancelled'
          : file.total > 0
            ? `${formatSize(file.done, false)} / ${formatSize(file.total, false)} · ${file.percent}%`
            : 'Working…'}
      </Typography>
      {file.status === 'active' ? (
        <IconButton
          className="file-row-cancel"
          size="small"
          color="error"
          sx={fileRowCancelSx}
          data-testid={`btn-cancel-file-${file.path}`}
          onClick={onCancelFile}
        >
          <CancelIcon fontSize="inherit" />
        </IconButton>
      ) : null}
    </Box>
  );
};

const TransferTooltipBody: FC<{ ops: TransferOp[] }> = ({ ops }) => {
  const remove = useTransferStore((s) => s.remove);
  // Per-job file list — collapsed by default, toggled by clicking the job's
  // header row. Local-only: resets each time the tooltip reopens.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const onCancel = (jobId: string) => {
    void FileService.CancelJob(jobId).catch(() => undefined);
    remove(jobId);
  };

  const onCancelAll = () => {
    ops.forEach((op) => onCancel(op.jobId));
  };

  const toggleExpanded = (jobId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  return (
    <Box sx={tooltipListSx} data-testid="transfer-tooltip">
      {ops.length > 1 ? (
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<CancelIcon fontSize="small" />}
          data-testid="btn-cancel-all-transfers"
          onClick={onCancelAll}
          sx={{ alignSelf: 'flex-start', minWidth: 0, py: 0, px: 0.5 }}
        >
          Cancel All
        </Button>
      ) : null}
      {ops.map((op) => {
        const canExpand = op.files.length > 1;
        const isExpanded = canExpand && expanded.has(op.jobId);
        return (
          <Box key={op.jobId} sx={tooltipRowSx} data-testid={`transfer-row-${op.jobId}`}>
            <Box
              sx={{ ...tooltipHeaderSx, cursor: canExpand ? 'pointer' : 'default' }}
              onClick={() => canExpand && toggleExpanded(op.jobId)}
              data-testid={`btn-toggle-transfer-${op.jobId}`}
            >
              {canExpand ? (
                <ExpandMoreIcon
                  fontSize="small"
                  sx={{
                    flexShrink: 0,
                    transition: 'transform 0.15s',
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                  }}
                />
              ) : null}
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
            {!isExpanded && op.currentPath ? (
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
            {isExpanded ? (
              <Box sx={fileListSx}>
                {op.files.map((f) => (
                  <FileRow key={f.path} jobId={op.jobId} file={f} />
                ))}
              </Box>
            ) : null}
          </Box>
        );
      })}
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
