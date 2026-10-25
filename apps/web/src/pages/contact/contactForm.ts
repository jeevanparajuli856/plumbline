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

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be up to ${max} characters.`)
    .transform((v) => (v === '' ? undefined : v))

export const ContactInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name.')
    .max(LIMITS.name, `Name can be up to ${LIMITS.name} characters.`),
  email: z.string().trim().email('Enter an email address such as name@example.org.'),
  organization: optionalText(LIMITS.organization, 'Organization'),
  phone: optionalText(LIMITS.phone, 'Phone'),
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
  | { kind: 'rate_limited' }
  | { kind: 'unavailable'; mailto: string }

/** A prefilled email to support, for when the form cannot send (503 or no network). */
export function mailtoFor(input: ContactInputT): string {
  const subject = encodeURIComponent(`${input.reason}: ${input.name}`)
  const body = encodeURIComponent(input.message)
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
}

function invalidFields(body: unknown): FieldName[] {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (!Array.isArray(detail)) return []
  const names = detail
    .map((d) => (d as { loc?: unknown[] }).loc?.at(-1))
    .filter((n): n is FieldName => typeof n === 'string' && n in FIELD_LABELS)
  return [...new Set(names)]
}

/** POSTs the message and maps every documented response to one result. Network errors are "unavailable". */
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
      body: JSON.stringify(input),
    })
  } catch {
    return unavailable
  }
  if (response.status === 202) return { kind: 'sent' }
  if (response.status === 429) return { kind: 'rate_limited' }
  if (response.status === 422) {
    const body: unknown = await response.json().catch(() => null)
    return { kind: 'invalid', fields: invalidFields(body) }
  }
  return unavailable
}
