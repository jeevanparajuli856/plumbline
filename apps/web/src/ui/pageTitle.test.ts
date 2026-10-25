import { SPA_ROUTES } from '../../spaRoutes'
import { pageTitle } from './pageTitle'

describe('pageTitle', () => {
  it('gives home the brand line and every routed page its own name', () => {
    expect(pageTitle('/')).toBe('Truehand: measurement you can trust without looking')
    expect(pageTitle('/docs')).toBe('Docs | Truehand')
    expect(pageTitle('/how-it-works/')).toBe('How it works | Truehand')
  })

  it('has a title for every top-level route, and a not-found title otherwise', () => {
    for (const route of SPA_ROUTES) expect(pageTitle(`/${route}`)).not.toMatch(/not found/)
    expect(pageTitle('/nope')).toBe('Page not found | Truehand')
  })
})
