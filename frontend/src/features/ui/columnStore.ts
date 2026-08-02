import { create } from 'zustand';

/** Shared DataGrid column widths for both panes. */
interface ColumnState {
  widths: Record<string, number>;
  setWidth: (field: string, width: number) => void;
}

const defaults: Record<string, number> = {
  icon: 44,
  displayName: 220,
  size: 90,
  modTime: 150,
  ext: 70,
  access: 90,
};

export const useColumnStore = create<ColumnState>((set) => ({
  widths: { ...defaults },
  setWidth: (field, width) =>
    set((s) => ({
      widths: { ...s.widths, [field]: Math.max(40, Math.round(width)) },
    })),
}));
