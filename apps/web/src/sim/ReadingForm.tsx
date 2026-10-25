import { useId, useState, type FormEvent, type Ref } from 'react'
import type { DomainSpec, Mode } from '@/state/types'
import { ariaKeysFor } from '@/a11y/keymap'
import { buttonClass } from '@/ui/button'
import { parseReadingInput, READING_LABELS } from './view'

interface ReadingFormProps {
  spec: DomainSpec
  mode: Mode
  canSubmit: boolean
  expectedReading: number | null
  onSubmit(value: number): void
  inputRef?: Ref<HTMLInputElement>
  formRef?: Ref<HTMLFormElement>
}

function hintFor(mode: Mode, spec: DomainSpec, expected: number | null): string {
  if (mode === 'simulate') return 'Simulate mode: the engine supplies the reading. Submit takes it.'
  if (mode === 'live') return `Read your meter and type the number in ${spec.unitSpoken}.`
  return expected === null
    ? 'This is a recording. Press Next to let it play.'
    : `This is a recording. Type ${expected.toFixed(spec.readingDecimals)}, or press Next to let it play.`
}

/** Typed reading. Always visible (voice is an enhancement). Validated here, and again by the store. */
export function ReadingForm({
  spec,
  mode,
  canSubmit,
  expectedReading,
  onSubmit,
  inputRef,
  formRef,
}: ReadingFormProps) {
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const simulated = mode === 'simulate'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    if (simulated) {
      onSubmit(0)
      return
    }
    const parsed = parseReadingInput(text, spec)
    if (!parsed.ok) {
      setMessage(parsed.message)
      return
    }
    setMessage(null)
    setText('')
    onSubmit(parsed.value)
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-3">
      <label htmlFor={inputId} className="label-caps">
        {READING_LABELS[spec.id]}
      </label>
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="relative flex min-w-0 flex-1 basis-56 items-center rounded-hard border-2 border-border-strong bg-surface-1 focus-within:border-text">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            readOnly={simulated}
            placeholder={simulated ? 'engine supplies it' : undefined}
            aria-keyshortcuts="T"
            aria-describedby={message ? `${errorId} ${hintId}` : hintId}
            aria-invalid={message ? true : undefined}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (message) setMessage(null)
            }}
            className="w-full min-w-0 bg-transparent px-4 py-3 font-mono text-reading tnum text-measured placeholder:text-base placeholder:text-muted focus:outline-none"
          />
          <span aria-hidden="true" className="pr-4 font-mono text-lg text-text-2">
            {spec.unit}
          </span>
        </div>
        <button
          type="submit"
          aria-keyshortcuts={ariaKeysFor('submit')}
          disabled={!canSubmit}
          className={buttonClass('primary', 'min-h-14 px-6 text-md')}
        >
          Submit reading
          <kbd aria-hidden="true" className="font-mono text-sm">
            Enter
          </kbd>
        </button>
      </div>
      {message ? (
        <p id={errorId} role="alert" className="font-medium text-text">
          {message}
        </p>
      ) : null}
      <p id={hintId} className="text-text-2">
        {hintFor(mode, spec, expectedReading)}{' '}
        <span className="whitespace-nowrap">Press T to come back here.</span>
      </p>
    </form>
  )
}
