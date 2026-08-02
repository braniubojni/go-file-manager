import type { SxProps, Theme } from '@mui/material/styles';

export const paneRootSx = (active: boolean): SxProps<Theme> => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid',
  borderColor: active ? 'primary.main' : 'divider',
  borderRadius: 1,
  overflow: 'hidden',
});

export const paneHeaderSx = (active: boolean): SxProps<Theme> => ({
  px: 1,
  py: 0.5,
  bgcolor: active ? 'action.selected' : 'action.hover',
  borderBottom: '1px solid',
  borderColor: 'divider',
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  cursor: 'pointer',
  userSelect: 'none',
});

export const paneHeaderTitleSx: SxProps<Theme> = { fontWeight: 700 };

export const jobTooltipSlotSx: SxProps<Theme> = {
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 3,
  maxWidth: 280,
  p: 1.25,
  fontSize: 13,
};

export const jobTooltipBodySx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.75,
  minWidth: 160,
};

export const jobTooltipLabelSx: SxProps<Theme> = { fontWeight: 600, fontSize: 13 };

export const jobCancelBtnSx: SxProps<Theme> = {
  alignSelf: 'flex-start',
  textTransform: 'none',
  fontWeight: 700,
};

export const jobSpinnerWrapSx: SxProps<Theme> = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  ml: 0.5,
};

export const jobSpinnerIconSx: SxProps<Theme> = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'text.secondary',
};

export const jobKindIconSx: SxProps<Theme> = { fontSize: 12 };

export const paneBodySx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

export const headerSpacerSx: SxProps<Theme> = { flex: 1 };

export const tabsRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid',
  borderColor: 'divider',
  minHeight: 32,
};

export const tabsSx: SxProps<Theme> = {
  flex: 1,
  minHeight: 32,
  '& .MuiTabs-indicator': { height: 2 },
};

export const tabSx = (active: boolean): SxProps<Theme> => ({
  minHeight: 32,
  py: 0,
  px: 1,
  textTransform: 'none',
  fontSize: 12,
  fontWeight: active ? 700 : 400,
  gap: 0.5,
  flexDirection: 'row',
});

export const tabLabelRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  maxWidth: 160,
};

export const tabCloudIconSx: SxProps<Theme> = { fontSize: 14 };

export const tabCloseBtnSx: SxProps<Theme> = { p: 0, ml: 0.5 };

export const addTabBtnSx: SxProps<Theme> = { mx: 0.5 };
export const getBoxWrapperSx = (active: boolean, dropActive: boolean): SxProps<Theme> => ({
  flex: 1,
  minHeight: 0,
  outline: active || dropActive ? '2px solid' : '1px solid',
  outlineColor: dropActive ? 'success.main' : active ? 'primary.main' : 'divider',
  borderRadius: 1,
  bgcolor: 'background.paper',
  position: 'relative',
  '& .MuiDataGrid-root': { border: 'none' },
  '& .no-select-cell': { userSelect: 'none' },
  '& .name-cell': { userSelect: 'text' },
  '& .MuiDataGrid-cell': {
    display: 'flex',
    alignItems: 'center',
  },
  '& .MuiDataGrid-row': {
    cursor: 'grab',
  },
  '& .MuiDataGrid-row.row-dragging': {
    cursor: 'grabbing',
    opacity: 0.55,
  },
  // Suppress focus ring while dragging so it doesn't paint a blue border on neighbors
  ...(dropActive
    ? {
        '& .MuiDataGrid-row.row-focused': {
          outline: 'none',
        },
      }
    : {
        '& .MuiDataGrid-row.row-focused': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: -2,
        },
      }),
  '& .MuiDataGrid-row.row-selected': {
    bgcolor: (t) =>
      t.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(21, 101, 192, 0.12)',
  },
  '& .MuiDataGrid-row.row-selected .MuiDataGrid-cell': {
    color: 'error.main',
  },
  // Internal react-dnd hover + Wails OS file-drop hover (file-drop-target-active)
  '& .MuiDataGrid-row.row-drop-target, & .MuiDataGrid-row.file-drop-target-active': {
    // Inset shadow only — avoid outline that can bleed as a line on adjacent rows
    outline: 'none',
    bgcolor: (t) =>
      t.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.22)' : 'rgba(46, 125, 50, 0.14)',
    boxShadow: (t) => `inset 0 0 0 3px ${t.palette.success.main}`,
    zIndex: 1,
  },
  '&.file-drop-target-active': {
    outline: '2px solid',
    outlineColor: 'success.main',
  },
  '& .MuiDataGrid-row:hover': dropActive ? { bgcolor: 'transparent' } : undefined,
  '&:focus': {
    outlineColor: dropActive ? 'success.main' : active ? 'primary.main' : 'divider',
  },
});

/**
 * The path input always holds the full path — swapping in a shortened value
 * fights the controlled input and eats keystrokes typed in the same tick.
 * Shortening is instead an overlay (pathOverlaySx) that CSS hides on focus, so
 * editing always sees, and types into, the real value.
 */
export const pathFieldWrapSx = (shortened: boolean): SxProps<Theme> => ({
  position: 'relative',
  flex: 1,
  minWidth: 0,
  // Blank the input's own text ONLY while an overlay is actually covering it —
  // a path that needs no shortening renders no overlay, and hiding the input
  // text there would leave the field looking empty.
  ...(shortened
    ? {
        '&:not(:focus-within) input': { color: 'transparent' },
        '&:focus-within .gfm-path-overlay': { display: 'none' },
      }
    : {}),
});

export const pathOverlaySx: SxProps<Theme> = {
  position: 'absolute',
  left: 14,
  right: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
  color: 'text.primary',
};

export const pathTooltipSlotSx: SxProps<Theme> = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 13,
  maxWidth: 'none',
  px: 1.5,
  py: 1,
  wordBreak: 'break-all',
};

export const pathInputSx: SxProps<Theme> = {
  '& input': {
    fontFamily: 'ui-monospace, monospace',
    fontSize: 12,
  },
};

export const reconnectNoticeSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  p: 4,
};

export const dataGridSx: SxProps<Theme> = {
  height: '100%',
  '& .MuiDataGrid-cell': { py: 0 },
  '& .MuiDataGrid-columnHeader': { fontWeight: 700 },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
    outline: 'none',
  },
  // Git status: subtle name color + left inset (selection/focus still win).
  '& .MuiDataGrid-row.git-M .MuiDataGrid-cell[data-field="displayName"]': {
    color: 'warning.main',
    boxShadow: (t) => `inset 3px 0 0 ${t.palette.warning.main}`,
  },
  '& .MuiDataGrid-row.git-A .MuiDataGrid-cell[data-field="displayName"]': {
    color: 'info.main',
    boxShadow: (t) => `inset 3px 0 0 ${t.palette.info.main}`,
  },
  '& .MuiDataGrid-row.git-untracked .MuiDataGrid-cell[data-field="displayName"]': {
    color: 'success.main',
    boxShadow: (t) => `inset 3px 0 0 ${t.palette.success.main}`,
  },
  '& .MuiDataGrid-row.git-D .MuiDataGrid-cell[data-field="displayName"]': {
    color: 'error.main',
    boxShadow: (t) => `inset 3px 0 0 ${t.palette.error.main}`,
    textDecoration: 'line-through',
  },
  '& .MuiDataGrid-row.git-U .MuiDataGrid-cell[data-field="displayName"]': {
    color: 'error.main',
    fontWeight: 700,
    boxShadow: (t) => `inset 3px 0 0 ${t.palette.error.dark}`,
  },
};
