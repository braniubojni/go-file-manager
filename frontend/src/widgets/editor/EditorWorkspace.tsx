import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useState, type FC } from 'react';
import { useEditorStore } from '../../features/editor/editorStore';
import { CodeMirrorPane } from './CodeMirrorPane';
import { DiffMergePane } from './DiffMergePane';
import { EditorHeader } from './EditorHeader';
import { FolderTree } from './FolderTree';
import { useEditorFile } from './hooks/useEditorFile';
import { useFolderTree } from './hooks/useFolderTree';
import { useGitFileDiff } from './hooks/useGitFileDiff';
import { bodySx, workspaceRootSx } from './styles';

export const EditorWorkspace: FC = () => {
  const rootPath = useEditorStore((s) => s.rootPath);
  const filePath = useEditorStore((s) => s.filePath);
  const mode = useEditorStore((s) => s.mode);
  const dirty = useEditorStore((s) => s.dirty);
  const setFilePath = useEditorStore((s) => s.setFilePath);
  const setMode = useEditorStore((s) => s.setMode);
  const closeWorkspace = useEditorStore((s) => s.closeWorkspace);
  const { content, loading, loadError, onChange, save } = useEditorFile();
  const { children, expanded, toggle } = useFolderTree(rootPath);
  const diffQ = useGitFileDiff(filePath, mode === 'diff');
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<'diff' | null>(null);

  const remote = Boolean(filePath?.startsWith('ssh://'));

  const requestClose = () => {
    if (mode === 'edit' && dirty) {
      setPendingMode(null);
      setPendingPath(null);
      setConfirmClose(true);
    } else closeWorkspace();
  };

  const openFile = (path: string) => {
    if (path === filePath && mode === 'edit') return;
    if (mode === 'edit' && dirty) {
      setPendingPath(path);
      setPendingMode(null);
      setConfirmClose(true);
      return;
    }
    setFilePath(path);
  };

  const onShowDiff = () => {
    if (!filePath || remote) return;
    if (mode === 'edit' && dirty) {
      setPendingPath(null);
      setPendingMode('diff');
      setConfirmClose(true);
      return;
    }
    setMode('diff');
  };

  const onShowEdit = () => setMode('edit');

  const discardAndContinue = () => {
    setConfirmClose(false);
    if (pendingPath) {
      setFilePath(pendingPath);
      setPendingPath(null);
      setPendingMode(null);
      return;
    }
    if (pendingMode === 'diff') {
      setPendingMode(null);
      setMode('diff');
      return;
    }
    closeWorkspace();
  };

  const cancelConfirm = () => {
    setConfirmClose(false);
    setPendingPath(null);
    setPendingMode(null);
  };

  const diffError = diffQ.isError
    ? 'Failed to load git diff'
    : diffQ.data?.binary
      ? diffQ.data.message || 'Binary file'
      : diffQ.data?.message && !diffQ.data.oldText && !diffQ.data.newText
        ? diffQ.data.message
        : null;

  return (
    <Box sx={workspaceRootSx} data-testid="editor-workspace">
      <EditorHeader
        filePath={filePath}
        dirty={dirty}
        mode={mode}
        gitStatus={diffQ.data?.status}
        remote={remote}
        onSave={save}
        onClose={requestClose}
        onShowDiff={onShowDiff}
        onShowEdit={onShowEdit}
      />
      <Box sx={bodySx}>
        {mode === 'edit' && (
          <FolderTree
            rootPath={rootPath}
            selectedPath={filePath}
            childrenMap={children}
            expanded={expanded}
            onToggle={toggle}
            onOpenFile={openFile}
          />
        )}
        {mode === 'diff' ? (
          <DiffMergePane
            filePath={filePath}
            oldText={diffQ.data?.oldText ?? ''}
            newText={diffQ.data?.newText ?? ''}
            loading={diffQ.isLoading || diffQ.isFetching}
            error={diffError}
            truncated={Boolean(diffQ.data?.truncated)}
            status={diffQ.data?.status ?? ''}
          />
        ) : (
          <CodeMirrorPane
            filePath={filePath}
            content={content}
            loading={loading}
            loadError={loadError}
            onChange={onChange}
            onSave={save}
          />
        )}
      </Box>

      <Dialog open={confirmClose} onClose={cancelConfirm} data-testid="dialog-editor-discard">
        <DialogTitle>Unsaved changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingMode === 'diff'
              ? 'Discard unsaved changes and open git diff?'
              : pendingPath
                ? 'Discard unsaved changes and open another file?'
                : 'Discard unsaved changes?'}
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
