import { useMotionPref } from '@/a11y/motionPref'
import { usePrefs } from '@/state/prefs'
import { RadioGroup } from './RadioGroup'
import { Switch } from './Switch'
import { THEMES } from './themes'

interface DisplaySettingsProps {
  /**
   * "stacked" (default): a settings block with the theme grid above the switches, for a page
   * such as /accessibility. "inline": the three controls as siblings, for a toolbar row.
   */
  layout?: 'stacked' | 'inline'
}

/** Theme, Text only and Reduce motion: the per-viewer display controls. */
export function DisplaySettings({ layout = 'stacked' }: DisplaySettingsProps) {
  const theme = usePrefs((s) => s.theme)
  const setTheme = usePrefs((s) => s.setTheme)
  const textOnly = usePrefs((s) => s.textOnly)
  const setTextOnly = usePrefs((s) => s.setTextOnly)
  const reduceMotion = useMotionPref((s) => s.reduceMotion)
  const setReduceMotion = useMotionPref((s) => s.setReduceMotion)
  const inline = layout === 'inline'

  const themeGroup = (
    <RadioGroup
      label="Theme"
      value={theme}
      options={THEMES}
      onChange={setTheme}
      layout={inline ? 'inline' : 'stacked'}
    />
  )
  const switches = (
    <>
      <Switch
        label="Text only"
        checked={textOnly}
        onChange={setTextOnly}
        description="Hides the 3D view. Everything is in the text."
      />
      <Switch label="Reduce motion" checked={reduceMotion} onChange={setReduceMotion} />
    </>
  )

  if (inline) {
    return (
      <>
        {themeGroup}
        {switches}
      </>
    )
  }
  return (
    <div className="grid max-w-sm gap-4">
      {themeGroup}
      <div className="grid justify-items-start gap-1 border-t border-hairline pt-3 [&>*]:-ml-2">
        {switches}
      </div>
    </div>
  )
}
