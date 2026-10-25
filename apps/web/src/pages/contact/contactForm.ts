/**
 * The contact form's validation and its one request (ADR-0014). Pure, with fetch injected, so every
 * response branch is unit-tested. The API sends one email to support@truehand.tech and stores nothing.
 */
import { z } from 'zod'
import { CONTACT_EMAIL } from '@/landing/content'

export const REASONS = ['Pilot', 'Partnership', 'Support', 'Press'] as const
export type Reason = (typeof REASONS)[number]

export const LIMITS = {
  name: 100,
  organization: 120,
  phone: 40,
  messageMin: 10,
  messageMax: 4000,
} as const

/** API rule 13.1: single-line fields refuse control characters and U+2028/U+2029. */
// eslint-disable-next-line no-control-regex -- refusing control characters is the point of this rule
const SINGLE_LINE = /^[^\u0000-\u001f\u007f\u2028\u2029]*$/
/** API rule 13.1: phone allows digits, space and + - ( ) . only. */
const PHONE_CHARS = /^[\d +\-().]*$/

const optionalText = (
  max: number,
  label: string,
  pattern = SINGLE_LINE,
  patternMessage = `${label} must be one line.`,
) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be up to ${max} characters.`)
    .regex(pattern, patternMessage)
    .transform((v) => (v === '' ? undefined : v))

export const ContactInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name.')
    .max(LIMITS.name, `Name can be up to ${LIMITS.name} characters.`)
    .regex(SINGLE_LINE, 'Name must be one line.'),
  email: z.string().trim().email('Enter an email address such as name@example.org.'),
  organization: optionalText(LIMITS.organization, 'Organization'),
  phone: optionalText(
    LIMITS.phone,
    'Phone',
    PHONE_CHARS,
    'Phone can use digits, spaces and + - ( ) . only.',
  ),
  reason: z.enum(REASONS, { message: 'Choose a reason.' }),
  message: z
    .string()
    .trim()
    .min(LIMITS.messageMin, `Write at least ${LIMITS.messageMin} characters.`)
    .max(LIMITS.messageMax, `Message can be up to ${LIMITS.messageMax} characters.`),
  /** Honeypot: people never see it; a filled value is sent as is and the API drops the message. */
  website: z.string(),
})
export type ContactInputT = z.infer<typeof ContactInput>

export type FieldName = 'name' | 'email' | 'organization' | 'phone' | 'reason' | 'message'

export const FIELD_LABELS: Record<FieldName, string> = {
  name: 'Name',
  email: 'Email',
  organization: 'Organization (optional)',
  phone: 'Phone (optional)',
  reason: 'Reason',
  message: 'Message',
}

export type FieldErrors = Partial<Record<FieldName, string>>

export function validate(
  raw: Record<string, string>,
): { ok: true; value: ContactInputT } | { ok: false; errors: FieldErrors } {
  const parsed = ContactInput.safeParse(raw)
  if (parsed.success) return { ok: true, value: parsed.data }
  const errors: FieldErrors = {}
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as FieldName
    if (field in FIELD_LABELS && !errors[field]) errors[field] = issue.message
  }
  return { ok: false, errors }
}

export type SendResult =
  | { kind: 'sent' }
  | { kind: 'invalid'; fields: FieldName[] }
  | { kind: 'too_large' }
  | { kind: 'rate_limited'; retryAfterS: number | null }
  | { kind: 'unavailable'; mailto: string }
  | { kind: 'send_failed'; mailto: string }

/** The API's wire value for a reason (API_CONTRACT 13.1): lowercase. */
export function wireReason(reason: Reason): string {
  return reason.toLowerCase()
}

interface ErrorEnvelope {
  error?: {
    code?: string
    details?: { errors?: Array<{ loc?: unknown[] }>; retry_after_s?: unknown }
  }
}

/** A prefilled email to support, for when the form cannot send (503 or no network). */
export function mailtoFor(input: ContactInputT): string {
  const subject = encodeURIComponent(`${input.reason}: ${input.name}`)
  const body = encodeURIComponent(input.message)
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
}

function invalidFields(body: ErrorEnvelope | null): FieldName[] {
  const errors = body?.error?.details?.errors
  if (!Array.isArray(errors)) return []
  const names = errors
    .map((e) => e.loc?.at(-1))
    .filter((n): n is FieldName => typeof n === 'string' && n in FIELD_LABELS)
  return [...new Set(names)]
}

async function envelope(response: Response): Promise<ErrorEnvelope | null> {
  return (await response.json().catch(() => null)) as ErrorEnvelope | null
}

/** POSTs the message and maps every response in API_CONTRACT 13.2 to one result. Network errors are "unavailable". */
export async function sendContact(
  input: ContactInputT,
  apiUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<SendResult> {
  const unavailable: SendResult = { kind: 'unavailable', mailto: mailtoFor(input) }
  let response: Response
  try {
    response = await fetchFn(`${apiUrl}/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        organization: input.organization ?? '',
        phone: input.phone ?? '',
        reason: wireReason(input.reason),
        message: input.message,
        website: input.website,
      }),
    })
  } catch {
    return unavailable
  }
  if (response.status === 202) return { kind: 'sent' }
  if (response.status === 413) return { kind: 'too_large' }
  if (response.status === 422)
    return { kind: 'invalid', fields: invalidFields(await envelope(response)) }
  if (response.status === 429) {
    const retry = (await envelope(response))?.error?.details?.retry_after_s
    return { kind: 'rate_limited', retryAfterS: typeof retry === 'number' ? retry : null }
  }
  if (response.status === 502) return { kind: 'send_failed', mailto: unavailable.mailto }
  return unavailable
}

/** Minutes to wait, rounded up, from the API's retry_after_s; a few minutes when it is not given. */
export function rateLimitSentence(retryAfterS: number | null): string {
  if (retryAfterS === null || retryAfterS <= 0)
    return 'Too many messages from here. Please try again in a few minutes.'
  const minutes = Math.max(1, Math.ceil(retryAfterS / 60))
  return `Too many messages from here. Please try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
}
