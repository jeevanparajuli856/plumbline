import type { Theme } from '@/state/prefs'
import type { RadioOption } from './RadioGroup'

/** The four Theme radios, in contract order (UI_CONTRACT section 1). */
export const THEMES: readonly RadioOption<Theme>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'hc', label: 'High contrast' },
]
