import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
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
  /**
   * "follow" (default): arrows select at once. "explicit": arrows move a pending choice and
   * click, Enter, Space or leaving the group commits it. Use it when a change is expensive,
   * such as restarting a session.
   */
  commit?: 'follow' | 'explicit'
}

/** Segmented radio group with roving tabindex: Tab enters once, arrows move. */
export function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel,
  commit = 'follow',
}: RadioGroupProps<T>) {
  const labelId = useId()
  const hintId = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const [pending, setPending] = useState<T | null>(null)
  const shown = pending ?? value
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === shown),
  )
  const explicit = commit === 'explicit'

  const choose = (next: T) => {
    setPending(null)
    if (next !== value) onChange(next)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (explicit && event.key === 'Escape' && pending !== null) {
      // Drop the pending choice; focus and aria-checked return to the committed option.
      event.preventDefault()
      setPending(null)
      refs.current[options.findIndex((o) => o.value === value)]?.focus()
      return
    }
    const next = nextRadioIndex(selected, event.key, options.length)
    if (next === null) return
    event.preventDefault()
    const option = options[next]
    if (!option) return
    if (explicit) setPending(option.value)
    else onChange(option.value)
    refs.current[next]?.focus()
  }

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!explicit || pending === null) return
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    choose(pending)
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span id={labelId} className={hideLabel ? 'sr-only' : 'font-medium text-text-2'}>
        {label}
      </span>
      {explicit ? (
        <span id={hintId} className="sr-only">
          Arrow keys move, Enter or Space chooses, Escape cancels.
        </span>
      ) : null}
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={explicit ? hintId : undefined}
        onBlur={onBlur}
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
              onClick={() => choose(option.value)}
              onKeyDown={onKeyDown}
              className="min-h-10 rounded-hard px-3 font-medium text-text-2 transition-colors duration-[var(--motion-fast)] hover:bg-surface-2 hover:text-text aria-checked:bg-text aria-checked:font-semibold aria-checked:text-bench aria-checked:hover:bg-text forced-colors:aria-checked:underline forced-colors:aria-checked:decoration-2 forced-colors:aria-checked:underline-offset-4"
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
