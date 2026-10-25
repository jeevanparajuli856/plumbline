import { useEffect } from 'react'

const BRAND = 'Truehand'

const TITLES: Readonly<Record<string, string>> = {
  '/': `${BRAND}: measurement you can trust without looking`,
  '/sim': `Demo | ${BRAND}`,
  '/how-it-works': `How it works | ${BRAND}`,
  '/evidence': `Evidence | ${BRAND}`,
  '/app': `The app | ${BRAND}`,
  '/accessibility': `Accessibility | ${BRAND}`,
  '/docs': `Docs | ${BRAND}`,
  '/contact': `Contact | ${BRAND}`,
  '/about': `About | ${BRAND}`,
}

/** The document title for a path; unknown paths are the not-found page. */
export function pageTitle(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return TITLES[path] ?? `Page not found | ${BRAND}`
}

export function usePageTitle(pathname: string): void {
  useEffect(() => {
    document.title = pageTitle(pathname)
  }, [pathname])
}
