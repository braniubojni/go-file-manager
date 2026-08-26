import ArchiveIcon from '@mui/icons-material/Archive';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import EditIcon from '@mui/icons-material/Edit';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import type { FC, ReactNode } from 'react';
import { isRemotePath } from '../../features/connections/helpers';
import { useContextMenuStore } from '../../features/file-ops/contextMenuStore';
import { useFileOpsStore } from '../../features/file-ops/fileOpsStore';
import type { FileOpsAction } from '../../features/file-ops/types';
import { usePaneStore } from '../../features/pane/paneStore';
import { getPaneGrid } from '../../pages/file-manager/helpers';
import { SettingsService } from '../../shared/api/bindings';
import { isArchiveExt, isArchivePanePath, isBrowsableArchive } from '../../shared/lib/archives';
import { copyText } from '../../shared/lib/clipboard';
import { errMessage } from '../../shared/lib/format';
import { useSnack } from '../../shared/ui/SnackbarHost';
import { OpenWithMenu } from './OpenWithMenu';

type Item = {
  key: string;
  label: string;
  icon: ReactNode;
  run: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
};

/**
 * Right-click menu for the file panes. Every entry routes through the same
 * fileOpsStore fan-out the toolbar and shortcuts use, so there is one
 * implementation per action.
 */
export const FileContextMenu: FC = () => {
  const { open, x, y, paneId, entry, panePath, close } = useContextMenuStore();
  const trigger = useFileOpsStore((s) => s.trigger);
  const otherPane = usePaneStore((s) => s.otherPane);
  const show = useSnack((s) => s.show);

  const remote = isRemotePath(entry?.path ?? panePath);
  // The path heuristic alone can misfire on a real directory literally named
  // "*.zip" (backend's own SplitArchivePath deliberately excludes that case).
  // When we have an entry, confirm with its backend-reported access — real
  // archive members are always listed as "readonly", a real file/dir isn't.
  // No entry (empty-space right-click) has nothing to confirm with, so the
  // heuristic alone decides there.
  const inArchive =
    !remote && isArchivePanePath(panePath) && (!entry || entry.access === 'readonly');
  const isDir = entry?.isDir ?? false;
  const canBrowse =
    Boolean(entry) && !isDir && !remote && isBrowsableArchive(entry?.name ?? '', entry?.ext ?? '');

  const act = (fn: () => void) => () => {
    close();
    fn();
  };
  const op = (action: FileOpsAction) => act(() => trigger(action));

  const items: Item[] = [];

  if (entry) {
    items.push({
      key: 'open',
      label: isDir || canBrowse ? 'Open folder' : 'Open',
      icon:
        isDir || canBrowse ? (
          <FolderOpenIcon fontSize="small" />
        ) : (
          <OpenInNewIcon fontSize="small" />
        ),
      run: act(() => getPaneGrid(paneId)?.__gfmOpenFocused?.()),
    });
    if (!isDir && !canBrowse && !inArchive) {
      items.push({
        key: 'edit',
        label: 'Edit',
        icon: <EditIcon fontSize="small" />,
        run: op('editFile'),
      });
    }
    if (!inArchive) {
      items.push({
        key: 'rename',
        label: 'Rename…',
        icon: <DriveFileRenameOutlineIcon fontSize="small" />,
        run: op('rename'),
      });
    }
    items.push({
      key: 'copy',
      label: `Copy to ${otherPane(paneId)} pane`,
      icon: <ContentCopyIcon fontSize="small" />,
      run: op('copy'),
      dividerBefore: true,
    });
    if (!inArchive) {
      items.push({
        key: 'move',
        label: `Move to ${otherPane(paneId)} pane`,
        icon: <DriveFileMoveIcon fontSize="small" />,
        run: op('move'),
      });
    }

    // Archive/extract are local-only in the backend, and extracting something
    // that is not an archive just fails deep inside the walk.
    if (!remote && !inArchive) {
      items.push({
        key: 'archive',
        label: 'Archive…',
        icon: <ArchiveIcon fontSize="small" />,
        run: op('archive'),
        dividerBefore: true,
      });
      if (!isDir && isArchiveExt(entry.ext)) {
        items.push({
          key: 'extract',
          label: 'Extract here',
          icon: <UnarchiveIcon fontSize="small" />,
          run: op('extract'),
        });
      }
    }

    items.push({
      key: 'copy-path',
      label: 'Copy path',
      icon: <ContentCopyIcon fontSize="small" />,
      dividerBefore: true,
      run: act(() => {
        void copyText(entry.path)
          .then(() => show('Path copied', 'success'))
          .catch((e) => show(errMessage(e), 'error'));
      }),
    });
    if (!remote && !inArchive) {
      items.push({
        key: 'reveal',
        label: 'Reveal in file manager',
        icon: <FolderOpenIcon fontSize="small" />,
        run: act(() => {
          void SettingsService.RevealInOS(entry.path).catch((e) => show(errMessage(e), 'error'));
        }),
      });
    }
  }

  if (!inArchive) {
    items.push({
      key: 'mkdir',
      label: 'New folder',
      icon: <CreateNewFolderIcon fontSize="small" />,
      run: op('mkdir'),
      dividerBefore: items.length > 0,
    });
    items.push({
      key: 'mkfile',
      label: 'New file',
      icon: <NoteAddIcon fontSize="small" />,
      run: op('mkfile'),
    });
  }

  if (entry && !inArchive) {
    items.push({
      key: 'delete',
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" color="error" />,
      run: op('delete'),
      danger: true,
      dividerBefore: true,
    });
  }

  return (
    <Menu
      data-testid="file-context-menu"
      open={open}
      onClose={close}
      anchorReference="anchorPosition"
      anchorPosition={{ top: y, left: x }}
      slotProps={{ paper: { sx: { minWidth: 220 } } }}
    >
      {items.map((it) => [
        it.dividerBefore ? <Divider key={`${it.key}-div`} /> : null,
        <MenuItem key={it.key} dense data-testid={`ctx-${it.key}`} onClick={it.run}>
          <ListItemIcon>{it.icon}</ListItemIcon>
          <ListItemText
            primary={it.label}
            slotProps={it.danger ? { primary: { color: 'error' } } : undefined}
          />
        </MenuItem>,
        it.key === 'open' && entry && !isDir && !remote && !canBrowse && !inArchive ? (
          <OpenWithMenu key="open-with" path={entry.path} onDone={close} />
        ) : null,
      ])}
    </Menu>
  );
};
