export type PaletteCommand = {
  id: string;
  label: string;
  description: string;
  binding: string;
};

export const filterCommands = (commands: PaletteCommand[], query: string): PaletteCommand[] => {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((c) =>
    [c.label, c.description, c.id, c.binding].some((v) => v.toLowerCase().includes(q)),
  );
};
