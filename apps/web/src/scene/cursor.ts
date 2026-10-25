/** Pointer cursor over clickable scene objects; restores whatever was there before. */
let previous: string | null = null

export function setPointerCursor(): void {
  if (typeof document === 'undefined') return
  if (previous === null) previous = document.body.style.cursor
  document.body.style.cursor = 'pointer'
}

export function restoreCursor(): void {
  if (typeof document === 'undefined' || previous === null) return
  document.body.style.cursor = previous
  previous = null
}
