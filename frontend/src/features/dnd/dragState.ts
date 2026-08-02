/**
 * Module-level signals for the in-app file drag (react-dnd TouchBackend).
 * Plain listener sets, not Zustand: state is read directly off DOM events
 * (modifier keys) or react-dnd monitors, and only `FileDragLayer` needs to
 * re-render on change.
 */

// --- copy/move modifier -----------------------------------------------

const moveModHeld = { current: false };
const modeListeners = new Set<() => void>();

const isApplePlatform = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

const setMoveMode = (next: boolean): void => {
  if (moveModHeld.current === next) return;
  moveModHeld.current = next;
  modeListeners.forEach((fn) => fn());
};

/** Read the move modifier straight off any UI event that carries modifier flags. */
const syncMoveModifier = (e: { metaKey?: boolean; ctrlKey?: boolean }): void => {
  setMoveMode(Boolean(isApplePlatform() ? e.metaKey : e.ctrlKey));
};

export const subscribeDropMode = (fn: () => void): (() => void) => {
  modeListeners.add(fn);
  return () => {
    modeListeners.delete(fn);
  };
};

export const dropModeForDrag = (): 'copy' | 'move' => (moveModHeld.current ? 'move' : 'copy');

if (
  typeof window !== 'undefined' &&
  !(window as unknown as { __gfmMoveModListeners?: boolean }).__gfmMoveModListeners
) {
  (window as unknown as { __gfmMoveModListeners?: boolean }).__gfmMoveModListeners = true;
  // keydown/keyup carry the *current* modifier state, including for the modifier
  // key itself — no sticky bookkeeping needed.
  window.addEventListener('keydown', syncMoveModifier, true);
  window.addEventListener('keyup', syncMoveModifier, true);
  window.addEventListener('mousedown', syncMoveModifier, true);
  window.addEventListener('mousemove', syncMoveModifier, true);
  window.addEventListener('blur', () => setMoveMode(false));
}

// --- drop validity (hover feedback) ------------------------------------

let dropIsValid = true;
const validityListeners = new Set<() => void>();

export const setDropValidity = (valid: boolean): void => {
  if (dropIsValid === valid) return;
  dropIsValid = valid;
  validityListeners.forEach((fn) => fn());
};

export const dropValidity = (): boolean => dropIsValid;

export const subscribeDropValidity = (fn: () => void): (() => void) => {
  validityListeners.add(fn);
  return () => {
    validityListeners.delete(fn);
  };
};
