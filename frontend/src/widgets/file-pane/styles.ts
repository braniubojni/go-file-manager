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
  '& .MuiDataGrid-row.row-drop-target': {
    // Inset shadow only — avoid outline that can bleed as a line on adjacent rows
    outline: 'none',
    bgcolor: (t) =>
      t.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.22)' : 'rgba(46, 125, 50, 0.14)',
    boxShadow: (t) => `inset 0 0 0 3px ${t.palette.success.main}`,
    zIndex: 1,
  },
  '& .MuiDataGrid-row:hover': dropActive ? { bgcolor: 'transparent' } : undefined,
  '&:focus': {
    outlineColor: dropActive ? 'success.main' : active ? 'primary.main' : 'divider',
  },
});

export const dataGridSx: SxProps<Theme> = {
  height: '100%',
  '& .MuiDataGrid-cell': { py: 0 },
  '& .MuiDataGrid-columnHeader': { fontWeight: 700 },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
    outline: 'none',
  },
};
