import type { FC } from 'react';
import { useCommandPaletteStore } from '../../features/command-palette/commandPaletteStore';
import { CommandPalette } from './CommandPalette';

export const CommandPaletteHost: FC = () => {
  const open = useCommandPaletteStore((s) => s.open);
  const closePalette = useCommandPaletteStore((s) => s.closePalette);
  return <CommandPalette open={open} onClose={closePalette} />;
};
