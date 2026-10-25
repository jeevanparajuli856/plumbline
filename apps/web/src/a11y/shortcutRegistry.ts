import type { ShortcutAction, ShortcutType } from './keymap'

export type ShortcutHandler = (action: ShortcutAction) => void | boolean

const registry = new Map<ShortcutType, ShortcutHandler>()

/**
 * Lets a feature outside the simulator claim a shortcut without editing it. The voice lane
 * registers `listen` (key M) here at integration; until then M is a no-op. Returns an unregister.
 */
export function registerShortcut(type: ShortcutType, handler: ShortcutHandler): () => void {
  registry.set(type, handler)
  return () => {
    if (registry.get(type) === handler) registry.delete(type)
  }
}

export function registeredShortcut(type: ShortcutType): ShortcutHandler | undefined {
  return registry.get(type)
}
