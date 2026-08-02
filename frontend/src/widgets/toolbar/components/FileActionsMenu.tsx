import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState, type FC, type ReactNode } from 'react';
import type { FileActionsMenuProps } from '../types';

type Item = {
  testId: string;
  label: string;
  icon: ReactNode;
  run: () => void;
  danger?: boolean;
};

export const FileActionsMenu: FC<FileActionsMenuProps> = (p) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const items: Item[] = [
    {
      testId: 'btn-copy',
      label: `Copy to ${p.otherPaneLabel} pane`,
      icon: <ContentCopyIcon fontSize="small" />,
      run: p.onCopy,
    },
    {
      testId: 'btn-move',
      label: `Move to ${p.otherPaneLabel} pane`,
      icon: <DriveFileMoveIcon fontSize="small" />,
      run: p.onMove,
    },
    {
      testId: 'btn-rename',
      label: 'Rename',
      icon: <DriveFileRenameOutlineIcon fontSize="small" />,
      run: p.onRename,
    },
    {
      testId: 'btn-delete',
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" color="error" />,
      run: p.onDelete,
      danger: true,
    },
  ];

  return (
    <>
      <Button
        data-testid="btn-file-actions"
        startIcon={<TuneIcon />}
        endIcon={<ExpandMoreIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Actions
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {items.map((it) => (
          <MenuItem
            key={it.testId}
            data-testid={it.testId}
            onClick={() => {
              setAnchor(null);
              it.run();
            }}
          >
            <ListItemIcon>{it.icon}</ListItemIcon>
            <ListItemText
              primary={it.label}
              slotProps={it.danger ? { primary: { color: 'error' } } : undefined}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
