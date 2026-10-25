// Imported first by the motion tests: ScrollTrigger reads matchMedia when it registers, so the
// stub must exist before `../scroll` is evaluated.

export interface MediaStub {
  reduce: boolean
  wide: boolean
  finePointer: boolean
}

const DEFAULT_MEDIA: MediaStub = { reduce: false, wide: true, finePointer: false }
const media: MediaStub = { ...DEFAULT_MEDIA }

function matches(query: string): boolean {
  return query.split(' and ').every((part) => {
    if (part.includes('prefers-reduced-motion: reduce')) return media.reduce
    if (part.includes('prefers-reduced-motion: no-preference')) return !media.reduce
    if (part.includes('min-width')) return media.wide
    if (part.includes('max-width')) return !media.wide
    if (part.includes('pointer: fine')) return media.finePointer
    return false
  })
}

window.matchMedia = (query: string) =>
  ({
    matches: matches(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList

export function stubMatchMedia(stub: Partial<MediaStub>): void {
  Object.assign(media, stub)
}

export function resetMatchMedia(): void {
  Object.assign(media, DEFAULT_MEDIA)
}
