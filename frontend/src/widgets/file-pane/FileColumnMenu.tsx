import MenuItem from '@mui/material/MenuItem';
import {
  GridColumnMenu,
  type GridColumnMenuItemProps,
  type GridColumnMenuProps,
} from '@mui/x-data-grid';
import { createContext, useContext, type FC } from 'react';
import type { PaneId } from '../../entities/file/types';
import { columnVisualOrder, useGridPrefsStore } from '../../features/ui/gridPrefsStore';

type Props = GridColumnMenuProps & { paneId: PaneId };

const PaneCtx = createContext<PaneId>('left');

const MoveItem: FC<GridColumnMenuItemProps & { dir: -1 | 1; label: string }> = ({
  colDef,
  onClick,
  dir,
  label,
}) => {
  const paneId = useContext(PaneCtx);
  const order = useGridPrefsStore((s) => s[paneId].order);
  const moveColumn = useGridPrefsStore((s) => s.moveColumn);
  const fields = columnVisualOrder(order);
  const i = fields.indexOf(colDef.field);
  const disabled = i < 0 || i + dir < 0 || i + dir >= fields.length;

  return (
    <MenuItem
      disabled={disabled}
      data-testid={dir < 0 ? 'col-menu-move-left' : 'col-menu-move-right'}
      onClick={(e) => {
        if (!disabled) moveColumn(paneId, colDef.field, dir);
        onClick(e);
      }}
    >
      {label}
    </MenuItem>
  );
};

const MoveLeftItem: FC<GridColumnMenuItemProps> = (props) => (
  <MoveItem {...props} dir={-1} label="Move left" />
);
const MoveRightItem: FC<GridColumnMenuItemProps> = (props) => (
  <MoveItem {...props} dir={1} label="Move right" />
);

export const FileColumnMenu: FC<Props> = ({ paneId, ...props }) => (
  <PaneCtx.Provider value={paneId}>
    <GridColumnMenu
      {...props}
      slots={{
        ...props.slots,
        columnMenuMoveLeft: MoveLeftItem,
        columnMenuMoveRight: MoveRightItem,
      }}
      slotProps={{
        ...props.slotProps,
        columnMenuMoveLeft: { displayOrder: 25 },
        columnMenuMoveRight: { displayOrder: 26 },
      }}
    />
  </PaneCtx.Provider>
);
