const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]'

/**
 * Tab wrap for a non-modal popover. Returns the index to focus when Tab leaves an edge (or
 * focus is not inside yet, -1); null means the browser's own Tab order is already right.
 */
export function nextTrapIndex(current: number, length: number, backward: boolean): number | null {
  if (length <= 0) return null
  if (current === -1) return backward ? length - 1 : 0
  if (backward && current === 0) return length - 1
  if (!backward && current === length - 1) return 0
  return null
}

/** Elements Tab can reach inside root, in DOM order. Roving radios contribute only their checked one. */
export function tabbables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.closest('[hidden]'),
  )
}
