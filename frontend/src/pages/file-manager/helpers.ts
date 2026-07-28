import type { PaneId } from '../../entities/file/types';

export type PaneGridApi = HTMLElement & {
  __gfmMoveFocus?: (d: number, extend?: boolean) => void;
  __gfmOpenFocused?: () => void;
  __gfmOpenDir?: () => void;
  __gfmToggleMulti?: () => void;
  __gfmFocusHome?: () => void;
  __gfmFocusEnd?: () => void;
};

export const isEditableTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    el.isContentEditable ||
    Boolean(el.closest?.('.xterm')) ||
    Boolean(el.closest?.('[role="dialog"]'))
  );
};

export const getPaneGrid = (pane: PaneId): PaneGridApi | null =>
  document.querySelector(`[data-pane-grid="${pane}"]`);

export const buildShortcutMap = (
  defs: { id: string; binding: string }[] | undefined,
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const d of defs ?? []) map[d.id] = d.binding;
  return map;
};
