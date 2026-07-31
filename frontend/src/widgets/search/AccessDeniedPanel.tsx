import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { type FC } from 'react';
import { FileService } from '../../shared/api/bindings';
import { errMessage } from '../../shared/lib/format';
import { useSnack } from '../../shared/ui/SnackbarHost';

type Props = {
  paths: string[];
  onDismiss: () => void;
};

export const AccessDeniedPanel: FC<Props> = ({ paths, onDismiss }) => {
  const show = useSnack((s) => s.show);
  if (paths.length === 0) return null;

  const openPrivacy = () => {
    void FileService.OpenPrivacySettings().catch((e) => show(errMessage(e), 'error'));
  };

  const shown = paths.slice(0, 8);

  return (
    <Alert
      severity="warning"
      data-testid="search-access-denied"
      sx={{ mx: 1.5, mb: 1 }}
      action={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Button
            color="inherit"
            size="small"
            onClick={openPrivacy}
            data-testid="search-open-privacy"
          >
            Privacy settings
          </Button>
          <Button color="inherit" size="small" onClick={onDismiss}>
            Dismiss
          </Button>
        </Box>
      }
    >
      <AlertTitle>Some folders could not be searched</AlertTitle>
      <Typography variant="body2" component="div">
        Permission was denied for {paths.length} path{paths.length === 1 ? '' : 's'}. On macOS,
        grant <strong>Files and Folders</strong> or <strong>Full Disk Access</strong> for this app
        in System Settings → Privacy &amp; Security, then run the search again. Skipped paths:
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 120, overflow: 'auto' }}>
        {shown.map((p) => (
          <li key={p}>
            <Typography variant="caption" component="span" sx={{ wordBreak: 'break-all' }}>
              {p}
            </Typography>
          </li>
        ))}
        {paths.length > shown.length ? (
          <li>
            <Typography variant="caption">…and {paths.length - shown.length} more</Typography>
          </li>
        ) : null}
      </Box>
    </Alert>
  );
};
