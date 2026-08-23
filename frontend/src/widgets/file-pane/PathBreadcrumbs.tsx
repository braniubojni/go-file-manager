import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { FC, MouseEvent } from 'react';
import type { PaneId } from '../../entities/file/types';
import { pathCrumbs } from './pathSegments';
import { pathCrumbLastSx, pathCrumbsSx } from './styles';

type Props = {
  paneId: PaneId;
  path: string;
  onNavigate: (path: string) => void;
  onEdit: () => void;
};

export const PathBreadcrumbs: FC<Props> = ({ paneId, path, onNavigate, onEdit }) => {
  const crumbs = pathCrumbs(path);
  const last = crumbs.length - 1;

  const go = (e: MouseEvent, next: string) => {
    e.preventDefault();
    e.stopPropagation();
    onNavigate(next);
  };

  return (
    <Box data-testid={`path-crumbs-${paneId}`} sx={pathCrumbsSx}>
      <Breadcrumbs
        maxItems={4}
        itemsBeforeCollapse={1}
        itemsAfterCollapse={2}
        sx={{ font: 'inherit' }}
      >
        {crumbs.map((c, i) =>
          i === last ? (
            <Box
              key={c.path}
              component="span"
              data-testid={`path-crumb-${paneId}-${i}`}
              sx={pathCrumbLastSx}
            >
              <Typography component="span" color="text.primary" sx={{ font: 'inherit' }}>
                {c.label}
              </Typography>
              <IconButton
                size="small"
                aria-label="Edit path"
                data-testid={`btn-edit-path-${paneId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                sx={{ p: 0.25 }}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ) : (
            <Link
              key={c.path}
              underline="hover"
              color="inherit"
              href={c.path}
              data-testid={`path-crumb-${paneId}-${i}`}
              onClick={(e) => go(e, c.path)}
              sx={{ font: 'inherit' }}
            >
              {c.label}
            </Link>
          ),
        )}
      </Breadcrumbs>
    </Box>
  );
};
