import type { FormEvent, KeyboardEvent } from 'react';

const isConfirmEnter = (e: KeyboardEvent): boolean => {
  if (e.nativeEvent.isComposing || e.repeat || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) {
    return false;
  }
  return e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter';
};

/** Enter in a dialog field confirms the action (WKWebView-safe). */
export const handleDialogEnter = (e: KeyboardEvent, submit: () => void): void => {
  if (!isConfirmEnter(e)) return;
  const t = e.target as HTMLElement | null;
  if (!t) return;
  if (t.closest('textarea, [contenteditable="true"]')) return;
  if (t.getAttribute('aria-expanded') === 'true') return;
  e.preventDefault();
  e.stopPropagation();
  submit();
};

export const handleDialogFormSubmit = (e: FormEvent, submit: () => void): void => {
  e.preventDefault();
  submit();
};
