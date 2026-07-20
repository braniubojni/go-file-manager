import type { FC } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import type { RefObject } from 'react'
import type { DeleteDialogsProps } from '../types'

export const DeleteDialogs: FC<DeleteDialogsProps> = ({ del, dispatch, paths, deleteBtnRef, onConfirm }) => {
  const listed = del.paths.length ? del.paths : paths

  return (
    <>
      <Dialog
        data-testid="dialog-delete"
        open={del.confirmOpen}
        onClose={() => dispatch({ type: 'close_confirm' })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onConfirm()
          }
        }}
      >
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
          <Button onClick={() => dispatch({ type: 'close_confirm' })}>Cancel</Button>
          <Button
            ref={deleteBtnRef as RefObject<HTMLButtonElement>}
            data-testid="btn-delete-confirm"
            color="error"
            variant="contained"
            autoFocus
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        data-testid="dialog-permission"
        open={del.permissionOpen}
        onClose={() => dispatch({ type: 'close_permission' })}
      >
        <DialogTitle>Permission denied</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>{del.permissionMessage}</DialogContentText>
          <DialogContentText variant="body2">
            The system blocked this delete. On macOS, grant the app access under System Settings → Privacy
            &amp; Security → Files and Folders (or Full Disk Access), then try again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            data-testid="btn-permission-ok"
            variant="outlined"
            onClick={() => dispatch({ type: 'close_permission' })}
            autoFocus
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
