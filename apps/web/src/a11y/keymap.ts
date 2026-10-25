/**
 * Pure key resolution for the simulator keyboard map (docs/ARCHITECTURE.md section 10).
 * No DOM listeners here; `useKeyboardMap` attaches them and dispatches the resolved action.
 */
export type ShortcutAction =
  | { type: 'aim'; site: number }
  | { type: 'submit' }
  | { type: 'focusInput' }
  | { type: 'listen' }
  | { type: 'speech' }
  | { type: 'repeat' }
  | { type: 'log' }
  | { type: 'playPause' }
  | { type: 'previous' }
  | { type: 'next' }
  | { type: 'help' }
  | { type: 'escape' }

export type ShortcutType = ShortcutAction['type']

export interface KeyInput {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  target: EventTarget | null
}

export interface ShortcutDoc {
  action: ShortcutType
  keys: string
  aria: string
  label: string
}

/** The keyboard map, in the order the dialog lists it. `aria` feeds aria-keyshortcuts on the twin button. */
export const SHORTCUTS: readonly ShortcutDoc[] = [
  { action: 'aim', keys: '1 to 9', aria: '1 2 3 4 5 6 7 8 9', label: 'Aim the probe at that row' },
  { action: 'submit', keys: 'Enter', aria: 'Enter', label: 'Submit the reading' },
  { action: 'focusInput', keys: 'T', aria: 'T', label: 'Go to the typed reading' },
  { action: 'listen', keys: 'M', aria: 'M', label: 'Start or stop the microphone' },
  { action: 'speech', keys: 'V', aria: 'V', label: 'Turn speech on or off' },
  { action: 'repeat', keys: 'R', aria: 'R', label: 'Repeat the instruction' },
  { action: 'log', keys: 'L', aria: 'L', label: 'Show or hide the reading log' },
  { action: 'playPause', keys: 'P', aria: 'P', label: 'Play or pause the recording' },
  { action: 'previous', keys: '[', aria: '[', label: 'Previous recorded step' },
  { action: 'next', keys: ']', aria: ']', label: 'Next recorded reading' },
  { action: 'help', keys: '?', aria: '?', label: 'Open this list' },
  { action: 'escape', keys: 'Esc', aria: 'Escape', label: 'Close dialogs, cancel listening' },
]

export function ariaKeysFor(action: ShortcutType): string {
  return SHORTCUTS.find((s) => s.action === action)?.aria ?? ''
}

const LETTERS: Record<string, ShortcutType> = {
  t: 'focusInput',
  m: 'listen',
  v: 'speech',
  r: 'repeat',
  l: 'log',
  p: 'playPause',
}

const SYMBOLS: Record<string, ShortcutType> = { '[': 'previous', ']': 'next', '?': 'help' }

const ACTIVATABLE_ROLES = new Set([
  'button',
  'link',
  'switch',
  'radio',
  'checkbox',
  'tab',
  'menuitem',
  'option',
])

function asElement(target: EventTarget | null): Element | null {
  return typeof Element !== 'undefined' && target instanceof Element ? target : null
}

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = asElement(target)
  if (!el) return false
  if (el.closest('input, textarea, select')) return true
  return el.closest('[contenteditable=""], [contenteditable="true"]') !== null
}

/** Elements where Enter already does something native; the global Enter must not double-fire. */
export function isActivatableTarget(target: EventTarget | null): boolean {
  const el = asElement(target)
  if (!el) return false
  if (el.closest('button, a[href], summary')) return true
  const role = el.closest('[role]')?.getAttribute('role')
  return role !== undefined && role !== null && ACTIVATABLE_ROLES.has(role)
}

export function resolveKey(input: KeyInput): ShortcutAction | null {
  if (input.ctrlKey || input.metaKey || input.altKey) return null
  if (isEditableTarget(input.target)) return null
  const { key } = input
  if (key === 'Escape') return { type: 'escape' }
  if (key === 'Enter') return isActivatableTarget(input.target) ? null : { type: 'submit' }
  if (/^[1-9]$/.test(key)) return { type: 'aim', site: Number(key) - 1 }
  const letter = LETTERS[key.toLowerCase()]
  if (key.length === 1 && letter) return { type: letter } as ShortcutAction
  const symbol = SYMBOLS[key]
  return symbol ? ({ type: symbol } as ShortcutAction) : null
}
