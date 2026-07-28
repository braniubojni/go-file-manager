import type { SxProps, Theme } from '@mui/material/styles';

export const workspaceRootSx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  overflow: 'hidden',
  m: 1,
};

export const headerSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1,
  py: 0.5,
  borderBottom: '1px solid',
  borderColor: 'divider',
  bgcolor: 'action.hover',
  minHeight: 40,
};

export const bodySx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
};

export const treePaneSx: SxProps<Theme> = {
  width: 280,
  minWidth: 200,
  maxWidth: 360,
  borderRight: '1px solid',
  borderColor: 'divider',
  overflow: 'auto',
  bgcolor: 'background.paper',
};

export const editorPaneSx: SxProps<Theme> = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

export const mergeColsHeaderSx: SxProps<Theme> = {
  display: 'flex',
  borderBottom: '1px solid',
  borderColor: 'divider',
  bgcolor: 'action.hover',
  flexShrink: 0,
};

export const mergeColLabelSx: SxProps<Theme> = {
  flex: 1,
  px: 1.5,
  py: 0.5,
  fontWeight: 700,
  color: 'text.secondary',
  borderRight: '1px solid',
  borderColor: 'divider',
  '&:last-of-type': { borderRight: 'none' },
};

export const mergeHostSx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  // MergeView defaults to height:auto; pin it so both panes fill the workspace.
  '& .cm-mergeView': {
    flex: 1,
    minHeight: 0,
    height: '100% !important',
    overflow: 'auto',
  },
  '& .cm-mergeViewEditors': {
    display: 'flex',
    alignItems: 'stretch',
    minHeight: '100%',
  },
  '& .cm-mergeViewEditor': {
    flex: '1 1 0',
    minWidth: 0,
    overflow: 'hidden',
  },
};

export const treeRowSx = (selected: boolean, depth: number): SxProps<Theme> => ({
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  pl: 1 + depth * 1.5,
  pr: 1,
  py: 0.35,
  cursor: 'pointer',
  userSelect: 'none',
  bgcolor: selected ? 'action.selected' : 'transparent',
  '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
});
