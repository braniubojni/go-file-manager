import type { FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { handleDialogEnter, handleDialogFormSubmit } from '../../../shared/lib/dialogSubmit';
import type { ArchiveDialogProps } from '../types';

export const ArchiveDialog: FC<ArchiveDialogProps> = ({
  archive,
  dispatch,
  selectionCount,
  activePath,
  onConfirm,
}) => {
  const submit = () => {
    if (archive.busy) return;
    onConfirm();
  };

  return (
    <Dialog
      data-testid="dialog-archive"
      open={archive.open}
      onClose={() => !archive.busy && dispatch({ type: 'close' })}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={(e) => handleDialogFormSubmit(e, submit)}>
        <DialogTitle>Create archive</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Archive name (without extension)"
            data-testid="input-archive-name"
            value={archive.name}
            disabled={archive.busy}
            onChange={(e) => dispatch({ type: 'set', patch: { name: e.target.value } })}
            onKeyDown={(e) => handleDialogEnter(e, submit)}
          />
          <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }} disabled={archive.busy}>
            <FormLabel component="legend">Format</FormLabel>
            <RadioGroup
              data-testid="archive-format-group"
              value={archive.format}
              onChange={(e) => dispatch({ type: 'set', patch: { format: e.target.value } })}
            >
              {archive.formats.map((f) => (
                <FormControlLabel key={f} value={f} control={<Radio size="small" />} label={f} />
              ))}
            </RadioGroup>
          </FormControl>
          {archive.format === 'zip' && (
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={archive.encrypt}
                    disabled={archive.busy}
                    onChange={(e) =>
                      dispatch({ type: 'set', patch: { encrypt: e.target.checked } })
                    }
                    data-testid="archive-encrypt-toggle"
                    size="small"
                  />
                }
                label="Encrypt ZIP with password"
              />
              {archive.encrypt && (
                <TextField
                  fullWidth
                  type="password"
                  margin="dense"
                  label="Password"
                  data-testid="input-archive-password"
                  value={archive.password}
                  disabled={archive.busy}
                  onChange={(e) => dispatch({ type: 'set', patch: { password: e.target.value } })}
                  onKeyDown={(e) => handleDialogEnter(e, submit)}
                />
              )}
            </Box>
          )}
          {archive.error && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {archive.error}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {selectionCount} item(s) → {activePath}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button type="button" disabled={archive.busy} onClick={() => dispatch({ type: 'close' })}>
            Cancel
          </Button>
          <Button
            data-testid="btn-archive-confirm"
            type="submit"
            variant="contained"
            disabled={archive.busy}
          >
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
