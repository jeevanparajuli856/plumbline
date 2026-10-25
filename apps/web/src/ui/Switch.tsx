import { useId } from 'react'

interface SwitchProps {
  label: string
  checked: boolean
  onChange(next: boolean): void
  keyshortcut?: string
  /** Visible key cap after the label. */
  keyHint?: string
  description?: string
}

/** role="switch" button. The accessible name is the label only; On/Off is visual and aria-checked carries state. */
export function Switch({
  label,
  checked,
  onChange,
  keyshortcut,
  keyHint,
  description,
}: SwitchProps) {
  const labelId = useId()
  const descId = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={description ? descId : undefined}
      aria-keyshortcuts={keyshortcut}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-11 items-center gap-2.5 rounded-button px-2 text-text transition-colors duration-[var(--motion-fast)] hover:bg-surface-2"
    >
      <span id={labelId} className="font-medium">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="relative inline-block h-7 w-12 shrink-0 rounded-full border-[1.5px] border-border-strong bg-surface-2 transition-colors duration-[var(--motion-normal)] ease-[var(--ease-smooth)] group-aria-checked:bg-text"
      >
        <span className="absolute left-[3px] top-[3px] size-[19px] rounded-full bg-border-strong shadow-sm transition-[translate,background-color,width] duration-[var(--motion-normal)] ease-[var(--ease-smooth)] group-active:w-[23px] group-aria-checked:translate-x-5 group-aria-checked:bg-bench group-aria-checked:group-active:translate-x-4" />
      </span>
      <span aria-hidden="true" className="w-7 font-mono text-caption text-text-2 tnum">
        {checked ? 'On' : 'Off'}
      </span>
      {keyHint ? (
        <kbd
          aria-hidden="true"
          className="rounded-hard border border-border-strong bg-surface-2 px-1.5 font-mono text-sm leading-tight text-text-2"
        >
          {keyHint}
        </kbd>
      ) : null}
      {description ? (
        <span id={descId} className="sr-only">
          {description}
        </span>
      ) : null}
    </button>
  )
}
