import { FileEntry } from '../../entities/file/types';
import { FileTypeIcon } from '../../shared/ui/FileTypeIcon';
import Typography from '@mui/material/Typography';
import { formatModTime, formatSize } from '../../shared/lib/format';
import { sizeValue, typeValue } from './helpers';

export const getColumns = (
  widths: Record<string, number>,
  selected: string[],
  folderSizes: Record<string, number> | undefined,
) => [
  {
    field: 'icon',
    headerName: '',
    width: widths.icon ?? 44,
    sortable: false,
    resizable: false,
    disableColumnMenu: true,
    cellClassName: 'no-select-cell',
    renderCell: (params) => <FileTypeIcon entry={params.row as FileEntry} />,
  },
  {
    field: 'displayName',
    headerName: 'Name',
    width: widths.displayName ?? 220,
    flex: widths.displayName ? undefined : 1,
    minWidth: 120,
    cellClassName: 'name-cell',
    renderCell: (params) => {
      const e = params.row as FileEntry & { displayName: string };
      const isSelected = selected.includes(e.path);
      return (
        <Typography
          variant="body2"
          noWrap
          sx={{
            fontWeight: e.isDir ? 600 : 400,
            userSelect: 'text',
            lineHeight: 1.2,
            width: '100%',
            color: isSelected ? 'error.main' : 'inherit',
          }}
        >
          {e.displayName}
          {e.isSymlink ? ' ↗' : ''}
        </Typography>
      );
    },
  },
  {
    field: 'size',
    headerName: 'Size',
    width: widths.size ?? 100,
    cellClassName: 'no-select-cell',
    valueGetter: (_v, row) => sizeValue(row as FileEntry, folderSizes),
    valueFormatter: (value, row) => {
      const e = row as FileEntry;
      if (e.isDir) {
        if (folderSizes && folderSizes[e.path] != null) {
          return formatSize(folderSizes[e.path], false);
        }
        return '<DIR>';
      }
      return formatSize(Number(value) || 0, false);
    },
  },
  {
    field: 'modTime',
    headerName: 'Modified',
    width: widths.modTime ?? 160,
    cellClassName: 'no-select-cell',
    valueFormatter: (value) => formatModTime(Number(value) || 0),
  },
  {
    field: 'ext',
    headerName: 'Type',
    width: widths.ext ?? 80,
    cellClassName: 'no-select-cell',
    valueGetter: (_v, row) => typeValue(row as FileEntry),
  },
];
