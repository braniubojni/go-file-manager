/** Parse "Mod+Shift+C" style bindings against a KeyboardEvent. */

function isMod(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey
}

export function eventMatchesBinding(e: KeyboardEvent, binding: string): boolean {
  if (!binding) return false
  const parts = binding.split('+').map((p) => p.trim())
  if (!parts.length) return false

  let needMod = false
  let needShift = false
  let needAlt = false
  let keyPart = ''

  for (const p of parts) {
    const lower = p.toLowerCase()
    if (lower === 'mod' || lower === 'cmd' || lower === 'ctrl' || lower === 'control' || lower === 'meta') {
      needMod = true
    } else if (lower === 'shift') {
      needShift = true
    } else if (lower === 'alt' || lower === 'option') {
      needAlt = true
    } else {
      keyPart = p
    }
  }

  if (needMod !== isMod(e)) return false
  if (needShift !== e.shiftKey) return false
  if (needAlt !== e.altKey) return false

  const key = keyPart
  if (!key) return false

  // Function keys
  if (/^F\d{1,2}$/i.test(key)) {
    return e.key.toLowerCase() === key.toLowerCase()
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

  const expected = map[key.toLowerCase()] ?? key
  if (expected.length === 1) {
    return e.key.toLowerCase() === expected.toLowerCase()
  }
  return e.key === expected
}

export function findMatchingAction(
  e: KeyboardEvent,
  shortcuts: Record<string, string>,
): string | null {
  for (const [action, binding] of Object.entries(shortcuts)) {
    if (eventMatchesBinding(e, binding)) return action
  }
  return null
}
