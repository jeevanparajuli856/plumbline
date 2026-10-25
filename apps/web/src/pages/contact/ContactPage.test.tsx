import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ContactPage } from './ContactPage'
import { LIMITS, mailtoFor, rateLimitSentence, sendContact, validate } from './contactForm'

vi.mock('@/lib/webgl', () => ({ webglSupported: () => false }))
// GSAP motion has its own tests (landing/motion); pages render without it here.
vi.mock('@/landing/motion', () => ({ default: () => null }))

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.org',
  organization: '',
  phone: '',
  reason: 'Pilot',
  message: 'We would like to try Truehand with our class.',
  website: '',
}

function respond(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

function renderForm() {
  render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>,
  )
  return screen.getByRole('form', { name: 'Contact Truehand' })
}

function fill(form: HTMLElement, values: Partial<typeof VALID> = {}) {
  const v = { ...VALID, ...values }
  const f = within(form)
  fireEvent.change(f.getByLabelText('Name'), { target: { value: v.name } })
  fireEvent.change(f.getByLabelText('Email'), { target: { value: v.email } })
  fireEvent.change(f.getByLabelText('Organization (optional)'), {
    target: { value: v.organization },
  })
  fireEvent.change(f.getByLabelText('Phone (optional)'), { target: { value: v.phone } })
  fireEvent.change(f.getByLabelText('Reason'), { target: { value: v.reason } })
  fireEvent.change(f.getByLabelText('Message'), { target: { value: v.message } })
}

afterEach(() => vi.unstubAllGlobals())

describe('contact form validation', () => {
  it('accepts a valid message and drops empty optional fields', () => {
    const result = validate(VALID)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toMatchObject({ organization: undefined, phone: undefined })
  })

  it('names every field that fails, with the length limits from the contract', () => {
    const result = validate({
      ...VALID,
      name: 'x'.repeat(LIMITS.name + 1),
      email: 'not-an-email',
      organization: 'x'.repeat(LIMITS.organization + 1),
      phone: 'x'.repeat(LIMITS.phone + 1),
      reason: 'Spam',
      message: 'short',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ['email', 'message', 'name', 'organization', 'phone', 'reason'].sort(),
      )
    }
    expect(validate({ ...VALID, message: 'x'.repeat(LIMITS.messageMax + 1) }).ok).toBe(false)
    expect(LIMITS).toEqual({
      name: 100,
      organization: 120,
      phone: 40,
      messageMin: 10,
      messageMax: 4000,
    })
  })
})

describe('sendContact', () => {
  const input = validate(VALID)
  if (!input.ok) throw new Error('fixture invalid')

  it('posts JSON with the honeypot to /v1/contact', async () => {
    const fetchFn = respond(202, { status: 'sent' })
    expect(await sendContact(input.value, 'https://api.example', fetchFn)).toEqual({ kind: 'sent' })
    const [url, init] = fetchFn.mock.calls[0]!
    expect(url).toBe('https://api.example/v1/contact')
    expect(init.method).toBe('POST')
    // API_CONTRACT 13.1: lowercase reason, empty optional fields as "", the honeypot as "".
    expect(JSON.parse(init.body)).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      organization: '',
      phone: '',
      reason: 'pilot',
      message: VALID.message,
      website: '',
    })
  })

  it('maps every response in API_CONTRACT 13.2 and a network error', async () => {
    const errors = (locs: string[]) => ({
      error: {
        code: 'validation_error',
        details: { errors: locs.map((l) => ({ loc: ['body', l] })) },
      },
    })
    expect(await sendContact(input.value, '', respond(422, errors(['email', 'message'])))).toEqual({
      kind: 'invalid',
      fields: ['email', 'message'],
    })
    expect(await sendContact(input.value, '', respond(413))).toEqual({ kind: 'too_large' })
    const limited = { error: { code: 'rate_limited', details: { retry_after_s: 125 } } }
    expect(await sendContact(input.value, '', respond(429, limited))).toEqual({
      kind: 'rate_limited',
      retryAfterS: 125,
    })
    const mailto = mailtoFor(input.value)
    const unavailable = { error: { code: 'contact_unavailable', details: {} } }
    expect(await sendContact(input.value, '', respond(503, unavailable))).toEqual({
      kind: 'unavailable',
      mailto,
    })
    expect(await sendContact(input.value, '', respond(502))).toEqual({
      kind: 'send_failed',
      mailto,
    })
    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await sendContact(input.value, '', offline)).toEqual({ kind: 'unavailable', mailto })
    expect(mailto).toBe(
      `mailto:support@truehand.tech?subject=${encodeURIComponent('Pilot: Ada Lovelace')}&body=${encodeURIComponent(VALID.message)}`,
    )
  })

  it('turns retry_after_s into whole minutes, or a few minutes when absent', () => {
    expect(rateLimitSentence(125)).toBe(
      'Too many messages from here. Please try again in 3 minutes.',
    )
    expect(rateLimitSentence(30)).toBe('Too many messages from here. Please try again in 1 minute.')
    expect(rateLimitSentence(null)).toBe(
      'Too many messages from here. Please try again in a few minutes.',
    )
  })

  it('refuses multi-line names and phone letters the API would refuse', () => {
    expect(validate({ ...VALID, name: 'Ada\nLovelace' }).ok).toBe(false)
    expect(validate({ ...VALID, phone: 'call me' }).ok).toBe(false)
    expect(validate({ ...VALID, phone: '+1 (318) 555-0100' }).ok).toBe(true)
  })
})

describe('ContactPage', () => {
  it('has the labelled fields, a hidden honeypot and the send button', () => {
    const form = renderForm()
    for (const label of [
      'Name',
      'Email',
      'Organization (optional)',
      'Phone (optional)',
      'Reason',
      'Message',
    ]) {
      expect(within(form).getByLabelText(label)).toBeInTheDocument()
    }
    expect(
      within(form)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Pilot', 'Partnership', 'Support', 'Press'])
    const honeypot = form.querySelector<HTMLInputElement>('input[name="website"]')!
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    expect(honeypot).toHaveAttribute('autocomplete', 'off')
    expect(within(form).queryByRole('textbox', { name: 'Website' })).toBeNull()
    expect(within(form).getByRole('button', { name: 'Send message' })).toBeInTheDocument()
  })

  it('stops invalid input in the browser, names the fields in an alert and focuses it', async () => {
    const fetchFn = vi.fn()
    vi.stubGlobal('fetch', fetchFn)
    const form = renderForm()
    fill(form, { email: 'nope', message: 'hi' })
    fireEvent.click(within(form).getByRole('button', { name: 'Send message' }))
    const alert = await within(form).findByRole('alert')
    expect(alert).toHaveTextContent('Please check: Email, Message.')
    expect(alert).toHaveFocus()
    expect(within(form).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('thanks the sender in a status on 202 and moves focus there', async () => {
    vi.stubGlobal('fetch', respond(202, { status: 'sent' }))
    const form = renderForm()
    fill(form)
    fireEvent.click(within(form).getByRole('button', { name: 'Send message' }))
    const status = await within(form).findByRole('status')
    expect(status).toHaveTextContent('Thanks. We will reply from support@truehand.tech.')
    await waitFor(() => expect(status).toHaveFocus())
  })

  it('says to try later on 429', async () => {
    vi.stubGlobal('fetch', respond(429, { error: { code: 'rate_limited', details: {} } }))
    const form = renderForm()
    fill(form)
    fireEvent.click(within(form).getByRole('button', { name: 'Send message' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Too many messages from here. Please try again in a few minutes.',
    )
  })

  it('names the fields the server rejected on 422', async () => {
    vi.stubGlobal(
      'fetch',
      respond(422, {
        error: { code: 'validation_error', details: { errors: [{ loc: ['body', 'phone'] }] } },
      }),
    )
    const form = renderForm()
    fill(form)
    fireEvent.click(within(form).getByRole('button', { name: 'Send message' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Please check: Phone (optional).',
    )
  })

  it('asks for a shorter message on 413 and offers retry or email on 502', async () => {
    vi.stubGlobal('fetch', respond(413))
    let form = renderForm()
    fill(form)
    fireEvent.click(within(form).getByRole('button', { name: 'Send message' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('too long to send')
    document.body.innerHTML = ''
    vi.stubGlobal('fetch', respond(502))
    form = renderForm()
    fill(form)
    fireEvent.click(within(form).getByRole('button', { name: 'Send message' }))
    const alert = await within(form).findByRole('alert')
    expect(alert).toHaveTextContent('did not go through')
    expect(within(alert).getByRole('link', { name: 'send it by email instead' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:support@truehand\.tech\?/),
    )
  })

  it('offers a prefilled email on 503 and when the network fails', async () => {
    for (const fetchFn of [
      respond(503, { code: 'contact_unavailable' }),
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    ]) {
      vi.stubGlobal('fetch', fetchFn)
      const form = renderForm()
      fill(form)
      fireEvent.click(within(form).getByRole('button', { name: 'Send message' }))
      const status = await within(form).findByRole('status')
      const link = within(status).getByRole('link', { name: 'Send it by email instead' })
      expect(link.getAttribute('href')).toMatch(
        /^mailto:support@truehand\.tech\?subject=Pilot%3A%20Ada%20Lovelace&body=/,
      )
      document.body.innerHTML = ''
    }
  })
})
