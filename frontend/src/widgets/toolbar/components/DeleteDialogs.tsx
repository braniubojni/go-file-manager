import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import type { FC, RefObject } from 'react';
import { handleDialogEnter, handleDialogFormSubmit } from '../../../shared/lib/dialogSubmit';
import type { DeleteDialogsProps } from '../types';

export const DeleteDialogs: FC<DeleteDialogsProps> = ({
  del,
  dispatch,
  paths,
  deleteBtnRef,
  onConfirm,
}) => {
  const listed = del.paths.length ? del.paths : paths;
  const closePermission = () => dispatch({ type: 'close_permission' });

  return (
    <>
      <Dialog
        data-testid="dialog-delete"
        open={del.confirmOpen}
        onClose={() => dispatch({ type: 'close_confirm' })}
        onKeyDown={(e) => handleDialogEnter(e, onConfirm)}
      >
        <form onSubmit={(e) => handleDialogFormSubmit(e, onConfirm)}>
          <DialogTitle>Delete {listed.length} item(s)?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              This cannot be undone.
            </Typography>
            <Box component="ul" sx={{ pl: 2, maxHeight: 160, overflow: 'auto' }}>
              {listed.map((p) => (
                <li key={p}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {p}
                  </Typography>
                </li>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => dispatch({ type: 'close_confirm' })}>
              Cancel
            </Button>
            <Button
              ref={deleteBtnRef as RefObject<HTMLButtonElement>}
              data-testid="btn-delete-confirm"
              type="submit"
              color="error"
              variant="contained"
              autoFocus
            >
              Delete
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        data-testid="dialog-permission"
        open={del.permissionOpen}
        onClose={closePermission}
        onKeyDown={(e) => handleDialogEnter(e, closePermission)}
      >
        <form onSubmit={(e) => handleDialogFormSubmit(e, closePermission)}>
          <DialogTitle>Permission denied</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 1 }}>{del.permissionMessage}</DialogContentText>
            <DialogContentText variant="body2">
              The system blocked this delete. On macOS, grant the app access under System Settings →
              Privacy &amp; Security → Files and Folders (or Full Disk Access), then try again.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button data-testid="btn-permission-ok" type="submit" variant="outlined" autoFocus>
              OK
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};
