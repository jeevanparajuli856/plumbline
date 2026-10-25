export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

/** Optional private-preview gate for the product area. Off by default; set VITE_PREVIEW_GATE=1 and VITE_PREVIEW_CODE. */
export const PREVIEW_GATE_ENABLED = import.meta.env.VITE_PREVIEW_GATE === '1'
export const PREVIEW_CODE = import.meta.env.VITE_PREVIEW_CODE ?? ''

export function isPresentation(search = window.location.search): boolean {
  return new URLSearchParams(search).get('present') === '1'
}
