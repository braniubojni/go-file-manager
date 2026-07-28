import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import { basename } from './helpers';
import { headerSx } from './styles';

type Props = {
  filePath: string | null;
  dirty: boolean;
  onSave: () => void;
  onClose: () => void;
};

export const EditorHeader: FC<Props> = ({ filePath, dirty, onSave, onClose }) => (
  <Box sx={headerSx} data-testid="editor-header">
    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={filePath ?? undefined}>
      {filePath ? basename(filePath) : 'No file'}
      {dirty ? ' •' : ''}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
      {filePath}
    </Typography>
    <Button
      size="small"
      startIcon={<SaveIcon />}
      disabled={!dirty || !filePath}
      onClick={onSave}
      data-testid="btn-editor-save"
    >
      Save
    </Button>
    <Tooltip title="Close editor">
      <IconButton size="small" onClick={onClose} data-testid="btn-editor-close">
        <CloseIcon />
      </IconButton>
    </Tooltip>
  </Box>
);
