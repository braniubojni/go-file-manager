import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { type SxProps, type Theme } from '@mui/material/styles';
import { memo, type FC } from 'react';
import { highlightLine } from './helpers';
import { matchHighlightSx, rowActiveSx, rowBaseSx } from './styles';
import type { SearchResult } from './types';

type Props = {
  result: SearchResult;
  index: number;
  active: boolean;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
};

const rowSx = (active: boolean): SxProps<Theme> =>
  (active ? [rowBaseSx, rowActiveSx] : rowBaseSx) as SxProps<Theme>;

const SearchResultRowInner: FC<Props> = ({ result, index, active, onHover, onSelect }) => {
  if (result.kind === 'folder') {
    return (
      <Box
        sx={rowSx(active)}
        onClick={() => onSelect(index)}
        onMouseEnter={() => onHover(index)}
        data-testid={`search-row-folder-${result.hit.name}`}
      >
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {result.hit.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {result.hit.relPath}
        </Typography>
      </Box>
    );
  }

  const { before, mid, after } = highlightLine(
    result.hit.lineText,
    result.hit.matchStart,
    result.hit.matchEnd,
  );

  return (
    <Box
      sx={rowSx(active)}
      onClick={() => onSelect(index)}
      onMouseEnter={() => onHover(index)}
      data-testid={`search-row-content-${result.hit.line}`}
    >
      <Typography variant="caption" color="text.secondary" noWrap>
        {result.hit.relPath}:{result.hit.line}
      </Typography>
      <Typography variant="body2" noWrap component="div">
        <Box component="span">{before}</Box>
        <Box component="span" sx={matchHighlightSx}>
          {mid}
        </Box>
        <Box component="span">{after}</Box>
      </Typography>
    </Box>
  );
};

export const SearchResultRow = memo(SearchResultRowInner);
