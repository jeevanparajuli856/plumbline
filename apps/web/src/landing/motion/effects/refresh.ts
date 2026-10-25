import { ScrollTrigger } from '../scroll'
import type { Cleanup } from './types'

/** Trigger positions are measured once; late fonts and images move them, so measure again. */
export function refreshOnLoad(root: HTMLElement): Cleanup {
  let isActive = true
  const refresh = () => {
    if (isActive) ScrollTrigger.refresh()
  }
  document.fonts?.ready.then(refresh, () => {})

  const pending = Array.from(root.querySelectorAll('img')).filter((img) => !img.complete)
  pending.forEach((img) => img.addEventListener('load', refresh, { once: true }))
  return () => {
    isActive = false
    pending.forEach((img) => img.removeEventListener('load', refresh))
  }
}
