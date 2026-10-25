/** Roving-focus arithmetic for radio groups (WAI-ARIA APG radio pattern). Null means "not a nav key". */
export function nextRadioIndex(current: number, key: string, length: number): number | null {
  if (length <= 0) return null
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % length
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + length) % length
    case 'Home':
      return 0
    case 'End':
      return length - 1
    default:
      return null
  }
}
