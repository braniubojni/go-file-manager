import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import type { FC } from 'react';
import { FileGridRow, FileRowProvider } from './dnd';
import { useFileTable } from './hooks';
import { dataGridSx, getBoxWrapperSx } from './styles';
import type { FileTableProps } from './types';

export const FileTable: FC<FileTableProps> = (props) => {
  const t = useFileTable(props);

  return (
    <Box
      ref={t.setWrapRef}
      tabIndex={0}
      data-testid={`file-grid-${t.paneId}`}
      data-pane-grid={t.paneId}
      onClick={t.onActivate}
      onKeyDown={t.handleKeys}
      sx={getBoxWrapperSx(t.active, t.dropActive)}
    >
      {t.isLoading && !t.entries ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : t.isError ? (
        <Box sx={{ p: 2 }}>
          <Typography color="error" variant="body2">
            {t.errorMessage || 'Failed to load directory'}
          </Typography>
        </Box>
      ) : (
        <FileRowProvider
          value={{ paneId: t.paneId, selected: t.selected, onDropPaths: t.onDropPaths }}
        >
          <DataGrid
            apiRef={t.apiRef}
            rows={t.rows}
            columns={t.columns}
            density="compact"
            disableColumnMenu
            hideFooter
            checkboxSelection={false}
            disableRowSelectionOnClick
            // Row drag/drop lives in FileGridRow (dnd.tsx), backed by react-dnd.
            slots={{ row: FileGridRow }}
            // Free DataGrid only allows single selection — multi-select is custom (CSS + Zustand)
            sortingMode="server"
            sortModel={t.sortModel}
            onSortModelChange={t.setSortModel}
            getRowClassName={t.getRowClassName}
            onColumnWidthChange={t.onColumnWidthChange}
            onCellKeyDown={t.onCellKeyDown}
            onRowClick={t.onRowClick}
            onRowDoubleClick={t.onRowDoubleClick}
            getRowId={(row) => row.path}
            loading={t.isLoading}
            sx={dataGridSx}
          />
        </FileRowProvider>
      )}
    </Box>
  );
};
