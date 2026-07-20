/** Parse "Mod+Shift+C" style bindings against a KeyboardEvent. */

export const eventMatchesBinding = (e: KeyboardEvent, binding: string): boolean => {
  if (!binding) return false
  const parts = binding.split('+').map((p) => p.trim())
  if (!parts.length) return false

  let needMod = false // Cmd or Ctrl
  let needCtrlOnly = false
  let needMetaOnly = false
  let needShift = false
  let needAlt = false
  let keyPart = ''

  for (const p of parts) {
    const lower = p.toLowerCase()
    if (lower === 'mod') {
      needMod = true
    } else if (lower === 'ctrl' || lower === 'control') {
      needCtrlOnly = true
    } else if (lower === 'cmd' || lower === 'meta') {
      needMetaOnly = true
    } else if (lower === 'shift') {
      needShift = true
    } else if (lower === 'alt' || lower === 'option') {
      needAlt = true
    } else {
      keyPart = p
    }
  }

  if (needCtrlOnly && !e.ctrlKey) return false
  if (needMetaOnly && !e.metaKey) return false
  if (needMod && !(e.metaKey || e.ctrlKey)) return false
  // If binding says Ctrl only, reject pure Cmd
  if (needCtrlOnly && e.metaKey && !e.ctrlKey) return false
  if (needShift !== e.shiftKey) return false
  if (needAlt !== e.altKey) return false

  const key = keyPart
  if (!key) return false

  if (/^F\d{1,2}$/i.test(key)) {
    return e.key.toLowerCase() === key.toLowerCase()
  }

  const lowerKey = key.toLowerCase()
  if (lowerKey === 'backquote' || lowerKey === '`' || lowerKey === '~') {
    return e.code === 'Backquote' || e.key === '`' || e.key === '~'
  }

  const map: Record<string, string> = {
    tab: 'Tab',
    delete: 'Delete',
    backspace: 'Backspace',
    escape: 'Escape',
    enter: 'Enter',
    home: 'Home',
    end: 'End',
    arrowup: 'ArrowUp',
    arrowdown: 'ArrowDown',
    arrowleft: 'ArrowLeft',
    arrowright: 'ArrowRight',
    ',': ',',
    '/': '/',
  }

  const expected = map[lowerKey] ?? key
  if (expected.length === 1) {
    return e.key.toLowerCase() === expected.toLowerCase()
  }
  return e.key === expected
}

export const findMatchingAction = (
  e: KeyboardEvent,
  shortcuts: Record<string, string>,
): string | null => {
  for (const [action, binding] of Object.entries(shortcuts)) {
    if (eventMatchesBinding(e, binding)) return action
  }
  return null
}

/** Match Ctrl+` specifically (not Cmd). */
export const isCtrlBackquote = (e: KeyboardEvent): boolean => {
  return (
    e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    (e.code === 'Backquote' || e.key === '`' || e.key === '~')
  )
}
