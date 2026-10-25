import { useId, useRef, type KeyboardEvent } from 'react'
import { nextRadioIndex } from './radioNav'

export interface RadioOption<T extends string> {
  value: T
  label: string
}

interface RadioGroupProps<T extends string> {
  label: string
  value: T
  options: readonly RadioOption<T>[]
  onChange(value: T): void
  /** Hide the visible group label (the name stays). */
  hideLabel?: boolean
}

/** Segmented radio group with roving tabindex: Tab enters once, arrows move and select. */
export function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel,
}: RadioGroupProps<T>) {
  const labelId = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextRadioIndex(selected, event.key, options.length)
    if (next === null) return
    event.preventDefault()
    const option = options[next]
    if (!option) return
    onChange(option.value)
    refs.current[next]?.focus()
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span id={labelId} className={hideLabel ? 'sr-only' : 'font-medium text-text-2'}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="inline-flex flex-wrap rounded-hard border-2 border-border-strong bg-surface-1 p-0.5"
      >
        {options.map((option, i) => {
          const checked = i === selected
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={onKeyDown}
              className="min-h-10 rounded-hard px-3 font-medium text-text-2 transition-colors duration-[var(--motion-fast)] hover:bg-surface-2 hover:text-text aria-checked:bg-text aria-checked:font-semibold aria-checked:text-bench aria-checked:hover:bg-text"
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
