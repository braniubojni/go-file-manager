import LockIcon from '@mui/icons-material/Lock';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import type { FC } from 'react';
import { FileService } from '../../shared/api/bindings';
import { errMessage } from '../../shared/lib/format';
import { useSnack } from '../../shared/ui/SnackbarHost';
import { reconnectNoticeSx } from './styles';

/**
 * Shown when macOS TCC blocks a local folder (e.g. a Google Drive /
 * OneDrive File Provider folder without Full Disk Access) instead of the
 * raw "operation not permitted" backend error.
 */
export const PermissionDeniedNotice: FC<{ paneId: string }> = ({ paneId }) => {
  const show = useSnack((s) => s.show);
  const queryClient = useQueryClient();

  const openPrivacy = () => {
    void FileService.OpenPrivacySettings().catch((e) => show(errMessage(e), 'error'));
  };

  // Granting FDA happens outside the app; retry the listing once the user is
  // back, since nothing else invalidates this query for them.
  const retry = () => void queryClient.invalidateQueries({ queryKey: ['dir'] });

  return (
    <Box sx={reconnectNoticeSx} data-testid={`permission-denied-${paneId}`}>
      <LockIcon color="disabled" />
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        macOS blocked access to this folder. Grant <strong>Full Disk Access</strong> in System
        Settings → Privacy &amp; Security, then retry.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          data-testid={`btn-open-privacy-${paneId}`}
          onClick={openPrivacy}
        >
          Privacy settings
        </Button>
        <Button
          variant="outlined"
          size="small"
          data-testid={`btn-retry-permission-${paneId}`}
          onClick={retry}
        >
          Retry
        </Button>
      </Box>
    </Box>
  );
};
