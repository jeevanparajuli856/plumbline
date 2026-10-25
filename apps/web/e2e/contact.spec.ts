import { expect, test } from './helpers/test'

// ADR-0014 decision 7, API_CONTRACT 13: without a mail key the API answers 503
// contact_unavailable and the page offers the same message as a prefilled email.
test('the contact form falls back to a prefilled email when the API cannot send', async ({
  page,
}) => {
  await page.route('**/v1/contact', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'contact_unavailable',
          message:
            'The contact form is not available right now; please write to support@truehand.tech instead.',
          details: {},
        },
      }),
    }),
  )
  await page.goto('/contact')
  const form = page.getByRole('form', { name: 'Contact Truehand' })
  await form.getByLabel('Name').fill('Ada Lovelace')
  await form.getByLabel('Email').fill('ada@example.org')
  await form.getByLabel('Reason').selectOption('Partnership')
  await form.getByLabel('Message').fill('We would like to talk about a partnership.')
  await form.getByRole('button', { name: 'Send message' }).click()

  const status = form.getByRole('status')
  await expect(status).toContainText('We could not send the message from here.')
  await expect(status).toBeFocused()
  const link = status.getByRole('link', { name: 'Send it by email instead' })
  await expect(link).toHaveAttribute(
    'href',
    /^mailto:support@truehand\.tech\?subject=Partnership%3A%20Ada%20Lovelace&body=We%20would%20like/,
  )
})
