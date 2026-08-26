import type { PaneId } from '../../entities/file/types';
import { useFolderSizeStore } from '../../features/folder-size/folderSizeStore';
import { usePaneJobStore } from '../../features/jobs/paneJobStore';
import { usePaneStore } from '../../features/pane/paneStore';

export type PaneGridApi = HTMLElement & {
  __gfmMoveFocus?: (d: number, extend?: boolean) => void;
  __gfmOpenFocused?: () => void;
  __gfmOpenDir?: () => void;
  __gfmToggleMulti?: () => void;
  __gfmSelectAll?: () => void;
  __gfmFocusHome?: () => void;
  __gfmFocusEnd?: () => void;
  __gfmStartRename?: (path?: string) => void;
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
    Boolean(el.closest?.('[role="dialog"]')) ||
    // MUI Popover/Menu (AI usage, bookmarks, connections, …) render no
    // role="dialog", so global shortcuts would otherwise leak into them.
    Boolean(el.closest?.('.MuiPopover-root, .MuiMenu-root'))
  );
};

export const getPaneGrid = (pane: PaneId): PaneGridApi | null =>
  document.querySelector(`[data-pane-grid="${pane}"]`);

/**
 * Exchange the two panes. Everything keyed by path (tabs, selection, folder
 * sizes, running jobs) follows its directory; the terminals stay put because
 * their PTY cwd is driven by the pane path effect, not by this store.
 */
export const swapPanes = (): void => {
  usePaneStore.getState().swapPanes();
  useFolderSizeStore.getState().swap();
  usePaneJobStore.getState().swap();
};

export const buildShortcutMap = (
  defs: { id: string; binding: string }[] | undefined,
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const d of defs ?? []) map[d.id] = d.binding;
  return map;
};
