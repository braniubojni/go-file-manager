import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useState, type FC } from 'react';
import { useEditorStore } from '../../features/editor/editorStore';
import { EditorHeader } from './EditorHeader';
import { FolderTree } from './FolderTree';
import { CodeMirrorPane } from './CodeMirrorPane';
import { useEditorFile } from './hooks/useEditorFile';
import { useFolderTree } from './hooks/useFolderTree';
import { bodySx, workspaceRootSx } from './styles';

export const EditorWorkspace: FC = () => {
  const rootPath = useEditorStore((s) => s.rootPath);
  const filePath = useEditorStore((s) => s.filePath);
  const dirty = useEditorStore((s) => s.dirty);
  const setFilePath = useEditorStore((s) => s.setFilePath);
  const closeWorkspace = useEditorStore((s) => s.closeWorkspace);
  const { content, loading, loadError, onChange, save } = useEditorFile();
  const { children, expanded, toggle } = useFolderTree(rootPath);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const requestClose = () => {
    if (dirty) setConfirmClose(true);
    else closeWorkspace();
  };

  const openFile = (path: string) => {
    if (path === filePath) return;
    if (dirty) {
      setPendingPath(path);
      setConfirmClose(true);
      return;
    }
    setFilePath(path);
  };

  const discardAndContinue = () => {
    setConfirmClose(false);
    if (pendingPath) {
      setFilePath(pendingPath);
      setPendingPath(null);
    } else {
      closeWorkspace();
    }
  };

  const cancelConfirm = () => {
    setConfirmClose(false);
    setPendingPath(null);
  };

  return (
    <Box sx={workspaceRootSx} data-testid="editor-workspace">
      <EditorHeader filePath={filePath} dirty={dirty} onSave={save} onClose={requestClose} />
      <Box sx={bodySx}>
        <FolderTree
          rootPath={rootPath}
          selectedPath={filePath}
          childrenMap={children}
          expanded={expanded}
          onToggle={toggle}
          onOpenFile={openFile}
        />
        <CodeMirrorPane
          filePath={filePath}
          content={content}
          loading={loading}
          loadError={loadError}
          onChange={onChange}
          onSave={save}
        />
      </Box>

      <Dialog open={confirmClose} onClose={cancelConfirm} data-testid="dialog-editor-discard">
        <DialogTitle>Unsaved changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Discard unsaved changes{pendingPath ? ' and open another file' : ''}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelConfirm}>Cancel</Button>
          <Button color="error" onClick={discardAndContinue} data-testid="btn-editor-discard">
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
