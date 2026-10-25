import { useMotionPref } from '@/a11y/motionPref'
import { usePrefs } from '@/state/prefs'
import { RadioGroup } from './RadioGroup'
import { Switch } from './Switch'
import { THEMES } from './themes'

/** Theme, text only and reduce motion: the per-viewer display controls inside the Display popover. */
export function DisplaySettings() {
  const theme = usePrefs((s) => s.theme)
  const setTheme = usePrefs((s) => s.setTheme)
  const textOnly = usePrefs((s) => s.textOnly)
  const setTextOnly = usePrefs((s) => s.setTextOnly)
  const reduceMotion = useMotionPref((s) => s.reduceMotion)
  const setReduceMotion = useMotionPref((s) => s.setReduceMotion)
  return (
    <div className="grid gap-4">
      <RadioGroup
        label="Theme"
        value={theme}
        options={THEMES}
        onChange={setTheme}
        layout="stacked"
      />
      <div className="grid justify-items-start gap-1 border-t border-hairline pt-3 [&>*]:-ml-2">
        <Switch
          label="Text only"
          checked={textOnly}
          onChange={setTextOnly}
          description="Hides the 3D view. Everything is in the text."
        />
        <Switch label="Reduce motion" checked={reduceMotion} onChange={setReduceMotion} />
      </div>
    </div>
  )
}
