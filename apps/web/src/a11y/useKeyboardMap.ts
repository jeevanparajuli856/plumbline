import { useEffect, useRef } from 'react'
import { resolveKey, type ShortcutAction, type ShortcutType } from './keymap'
import { registeredShortcut } from './shortcutRegistry'
import { useShortcutPref } from './shortcutPref'

/** A handler may return false to say it did not consume the key (then the default is not prevented). */
export type ShortcutHandlers = Partial<{
  [K in ShortcutType]: (action: Extract<ShortcutAction, { type: K }>) => void | boolean
}>

/** Dispatch a resolved action to the page handlers first, then to the shared registry. Returns whether it was consumed. */
export function dispatchShortcut(action: ShortcutAction, handlers: ShortcutHandlers): boolean {
  const local = handlers[action.type] as ((a: ShortcutAction) => void | boolean) | undefined
  const handler = local ?? registeredShortcut(action.type)
  if (!handler) return false
  return handler(action) !== false
}

/** Window-level keyboard map. Guarded against editable targets and modifiers by `resolveKey`. */
export function useKeyboardMap(handlers: ShortcutHandlers, enabled = true): void {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      const action = resolveKey(event, { singleKeys: useShortcutPref.getState().singleKeys })
      if (action && dispatchShortcut(action, ref.current)) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
