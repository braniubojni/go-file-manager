import CloseIcon from '@mui/icons-material/Close';
import DifferenceIcon from '@mui/icons-material/Difference';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { FC } from 'react';
import type { EditorMode } from '../../features/editor/editorStore';
import { basename } from './helpers';
import { headerSx } from './styles';

type Props = {
  filePath: string | null;
  dirty: boolean;
  mode: EditorMode;
  gitStatus?: string;
  remote: boolean;
  onSave: () => void;
  onClose: () => void;
  onShowDiff: () => void;
  onShowEdit: () => void;
};

export const EditorHeader: FC<Props> = ({
  filePath,
  dirty,
  mode,
  gitStatus,
  remote,
  onSave,
  onClose,
  onShowDiff,
  onShowEdit,
}) => (
  <Box sx={headerSx} data-testid="editor-header">
    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={filePath ?? undefined}>
      {filePath ? basename(filePath) : 'No file'}
      {mode === 'edit' && dirty ? ' •' : ''}
    </Typography>
    {mode === 'diff' && (
      <Chip
        size="small"
        label={gitStatus ? `Diff · ${gitStatus}` : 'Diff · HEAD vs working tree'}
        color="primary"
        variant="outlined"
        data-testid="chip-editor-diff"
      />
    )}
    <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
      {mode === 'diff' ? 'Left: HEAD · Right: working tree' : (filePath ?? '')}
    </Typography>
    {mode === 'edit' && (
      <Button
        size="small"
        startIcon={<SaveIcon />}
        disabled={!dirty || !filePath}
        onClick={onSave}
        data-testid="btn-editor-save"
      >
        Save
      </Button>
    )}
    {!remote && filePath && mode === 'edit' && (
      <Tooltip title="Side-by-side git diff (HEAD vs working tree)">
        <Button
          size="small"
          startIcon={<DifferenceIcon />}
          onClick={onShowDiff}
          data-testid="btn-editor-show-diff"
        >
          Diff
        </Button>
      </Tooltip>
    )}
    {!remote && filePath && mode === 'diff' && (
      <Tooltip title="Open file in editor">
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={onShowEdit}
          data-testid="btn-editor-show-edit"
        >
          Edit
        </Button>
      </Tooltip>
    )}
    <Tooltip title={mode === 'diff' ? 'Close diff' : 'Close editor'}>
      <IconButton size="small" onClick={onClose} data-testid="btn-editor-close">
        <CloseIcon />
      </IconButton>
    </Tooltip>
  </Box>
);
