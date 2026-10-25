import { useMotionPref } from '@/a11y/motionPref'
import { usePrefs, type Theme } from '@/state/prefs'
import { RadioGroup, type RadioOption } from './RadioGroup'
import { SmallScreenDisclosure } from './SmallScreenDisclosure'
import { Switch } from './Switch'

const THEMES: readonly RadioOption<Theme>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'hc', label: 'High contrast' },
]

/** Display controls, first in the tab order after the skip link (DESIGN_REFERENCES F16). */
export function PrefsBar() {
  const theme = usePrefs((s) => s.theme)
  const setTheme = usePrefs((s) => s.setTheme)
  const textOnly = usePrefs((s) => s.textOnly)
  const setTextOnly = usePrefs((s) => s.setTextOnly)
  const reduceMotion = useMotionPref((s) => s.reduceMotion)
  const setReduceMotion = useMotionPref((s) => s.setReduceMotion)
  return (
    <section aria-label="Display" className="border-b border-hairline bg-surface-2">
      <div className="mx-auto max-w-[90rem] px-4 py-1.5 sm:px-8 lg:px-16">
        <SmallScreenDisclosure
          label="Display settings"
          className="flex-wrap items-center gap-x-6 gap-y-2 pb-2 sm:pb-0"
        >
          <RadioGroup label="Theme" value={theme} options={THEMES} onChange={setTheme} />
          <Switch
            label="Text only"
            checked={textOnly}
            onChange={setTextOnly}
            description="Hides the 3D view. Everything is in the text."
          />
          <Switch label="Reduce motion" checked={reduceMotion} onChange={setReduceMotion} />
        </SmallScreenDisclosure>
      </div>
    </section>
  )
}
