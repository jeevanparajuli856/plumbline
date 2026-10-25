import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react'
import { API_URL } from '@/lib/env'
import { buttonClass } from '@/ui/button'
import { CONTACT_EMAIL } from '@/landing/content'
import { cx } from '@/landing/cx'
import s from '@/landing/landing.module.css'
import { MarketingPage } from '@/landing/MarketingPage'
import { Eyebrow, Section } from '@/landing/parts'
import c from './contact.module.css'
import {
  FIELD_LABELS,
  LIMITS,
  REASONS,
  rateLimitSentence,
  sendContact,
  validate,
  type FieldErrors,
  type FieldName,
  type SendResult,
} from './contactForm'

type Outcome = SendResult | { kind: 'errors'; errors: FieldErrors } | null

function fieldList(fields: readonly FieldName[]): string {
  return fields.map((f) => FIELD_LABELS[f]).join(', ')
}

interface FieldProps {
  name: FieldName
  error: string | undefined
  children: (props: {
    id: string
    'aria-invalid'?: true
    'aria-describedby'?: string
  }) => ReactElement
}

/** Label, control and its error sentence, wired together. */
function Field({ name, error, children }: FieldProps) {
  const id = `contact-${name}`
  const errorId = `${id}-error`
  return (
    <div className={c.field}>
      <label htmlFor={id} className={c.label}>
        {FIELD_LABELS[name]}
      </label>
      {children({
        id,
        ...(error ? { 'aria-invalid': true as const, 'aria-describedby': errorId } : {}),
      })}
      {error && (
        <p id={errorId} className={c.error}>
          {error}
        </p>
      )}
    </div>
  )
}

function Result({ outcome }: { outcome: Exclude<Outcome, null> }) {
  if (outcome.kind === 'sent') return <>Thanks. We will reply from {CONTACT_EMAIL}.</>
  if (outcome.kind === 'rate_limited') return <>{rateLimitSentence(outcome.retryAfterS)}</>
  if (outcome.kind === 'too_large')
    return <>That message is too long to send. Please shorten it and try again.</>
  if (outcome.kind === 'send_failed')
    return (
      <>
        The message did not go through. Press Send message to try again, or{' '}
        <a href={outcome.mailto} className={s.link}>
          send it by email instead
        </a>
        .
      </>
    )
  if (outcome.kind === 'unavailable')
    return (
      <>
        We could not send the message from here.{' '}
        <a href={outcome.mailto} className={s.link}>
          Send it by email instead
        </a>
        .
      </>
    )
  const fields =
    outcome.kind === 'errors' ? (Object.keys(outcome.errors) as FieldName[]) : outcome.fields
  return fields.length > 0 ? (
    <>Please check: {fieldList(fields)}.</>
  ) : (
    <>The message could not be accepted. Please check the fields and try again.</>
  )
}

/** Contact: one form, validated in the browser, sent to the API, with an email fallback. */
export function ContactPage() {
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [isSending, setSending] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const errors = outcome?.kind === 'errors' ? outcome.errors : {}

  useEffect(() => {
    if (outcome) resultRef.current?.focus()
  }, [outcome])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSending) return
    const form = e.currentTarget
    const raw = Object.fromEntries(
      Array.from(new FormData(form).entries()).map(([k, v]) => [k, String(v)]),
    )
    const checked = validate(raw)
    if (!checked.ok) {
      setOutcome({ kind: 'errors', errors: checked.errors })
      return
    }
    setSending(true)
    const result = await sendContact(checked.value, API_URL)
    setSending(false)
    if (result.kind === 'sent') form.reset()
    setOutcome(result)
  }

  const isPolite = outcome?.kind === 'sent' || outcome?.kind === 'unavailable'

  return (
    <MarketingPage>
      <Section id="contact" className={cx(s.section, s.sheet)}>
        <div className={cx(s.frame, s.grid, 'gap-y-10')}>
          <div className="col-span-4 md:col-span-5">
            <Eyebrow>Contact</Eyebrow>
            <h1 id="contact-title" tabIndex={-1} className={cx(s.h2, 'mt-6')}>
              Talk to us about a pilot, a partnership or support.
            </h1>
            <p className={cx(s.lead, 'mt-6')}>
              We read every message and reply from {CONTACT_EMAIL}. You can also write there
              directly.
            </p>
          </div>
          <form
            aria-label="Contact Truehand"
            noValidate
            onSubmit={(e) => void onSubmit(e)}
            className={cx(c.form, 'col-span-4 md:col-span-6 md:col-start-7')}
          >
            {outcome && (
              <div
                ref={resultRef}
                tabIndex={-1}
                role={isPolite ? 'status' : 'alert'}
                className={cx(c.result, !isPolite && c.resultError)}
              >
                <Result outcome={outcome} />
              </div>
            )}
            <Field name="name" error={errors.name}>
              {(p) => (
                <input
                  {...p}
                  name="name"
                  autoComplete="name"
                  maxLength={LIMITS.name}
                  className={c.input}
                />
              )}
            </Field>
            <Field name="email" error={errors.email}>
              {(p) => (
                <input {...p} name="email" type="email" autoComplete="email" className={c.input} />
              )}
            </Field>
            <Field name="organization" error={errors.organization}>
              {(p) => (
                <input
                  {...p}
                  name="organization"
                  autoComplete="organization"
                  maxLength={LIMITS.organization}
                  className={c.input}
                />
              )}
            </Field>
            <Field name="phone" error={errors.phone}>
              {(p) => (
                <input
                  {...p}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={LIMITS.phone}
                  className={c.input}
                />
              )}
            </Field>
            <Field name="reason" error={errors.reason}>
              {(p) => (
                <select {...p} name="reason" defaultValue="Pilot" className={c.input}>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field name="message" error={errors.message}>
              {(p) => (
                <textarea
                  {...p}
                  name="message"
                  rows={6}
                  maxLength={LIMITS.messageMax}
                  className={c.input}
                />
              )}
            </Field>
            {/* Honeypot: off screen and out of the accessibility tree; people never fill it. */}
            <div aria-hidden="true" className={c.honeypot}>
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>
            <div>
              <button
                type="submit"
                className={buttonClass('primary')}
                aria-disabled={isSending || undefined}
              >
                Send message
              </button>
            </div>
          </form>
        </div>
      </Section>
    </MarketingPage>
  )
}
