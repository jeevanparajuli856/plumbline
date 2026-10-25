/** First focusable element on every page. */
export function SkipLinks() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-hard focus:border-2 focus:border-border-strong focus:bg-surface-1 focus:px-4 focus:py-3 focus:font-semibold focus:text-text"
    >
      Skip to main content
    </a>
  )
}
