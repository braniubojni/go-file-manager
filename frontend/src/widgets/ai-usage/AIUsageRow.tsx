import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type { AIUsage, AIUsageDetail, AIUsageLimit } from '../../entities/file/types';
import { canExpand, statusLabel } from './helpers';
import {
  detailSx,
  headerRowDisabledSx,
  headerRowSx,
  limitBlockSx,
  limitHeaderRowSx,
  limitLabelSx,
  limitValueSx,
  progressSx,
  resetCaptionSx,
  rowMainSx,
} from './styles';

type Props = {
  row: AIUsage;
  expanded: boolean;
  onToggle: () => void;
};

const LimitBar: FC<{ limit: AIUsageLimit }> = ({ limit }) => (
  <Box sx={limitBlockSx}>
    <Box sx={limitHeaderRowSx}>
      <Typography sx={limitLabelSx}>{limit.label}</Typography>
      <Typography sx={limitValueSx}>
        {limit.percent}%{limit.resetAt ? ` · resets ${limit.resetAt}` : ''}
      </Typography>
    </Box>
    <LinearProgress
      variant="determinate"
      value={Math.min(100, Math.max(0, limit.percent))}
      sx={progressSx}
    />
  </Box>
);

export const AIUsageRow: FC<Props> = ({ row, expanded, onToggle }) => {
  const [primary, ...rest] = row.limits;
  const expandable = canExpand(row);

  return (
    <Box data-testid={`ai-usage-row-${row.id}`}>
      <Box
        sx={expandable ? headerRowSx : headerRowDisabledSx}
        onClick={expandable ? onToggle : undefined}
      >
        <Box sx={rowMainSx}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.name}
          </Typography>
        </Box>
        {!primary && <Chip size="small" label={statusLabel(row)} variant="outlined" />}
        {expandable &&
          (expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />)}
      </Box>
      {row.error && <Typography sx={resetCaptionSx}>{row.error}</Typography>}
      {primary && <LimitBar limit={primary} />}
      {expandable && (
        <Collapse in={expanded}>
          {rest.map((l: AIUsageLimit) => (
            <LimitBar key={l.label} limit={l} />
          ))}
          {row.details.map((d: AIUsageDetail, i) => (
            <Typography key={`${d.label}-${i}`} sx={{ ...detailSx, pl: 1.5 + d.depth * 1.5 }}>
              {d.label}
              {d.value ? `: ${d.value}` : ''}
            </Typography>
          ))}
        </Collapse>
      )}
    </Box>
  );
};
