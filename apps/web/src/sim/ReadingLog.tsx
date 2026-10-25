import type { LogRow } from './view'

interface ReadingLogProps {
  rows: readonly LogRow[]
  open: boolean
  onToggle(): void
}

/** Every accepted reading as a real table. Landed reads "hidden" until the reveal finishes. */
export function ReadingLog({ rows, open, onToggle }: ReadingLogProps) {
  return (
    <section aria-labelledby="reading-log-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-text pb-2">
        <h2 id="reading-log-heading" className="text-lg font-semibold">
          Reading log
        </h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="reading-log-table"
          aria-keyshortcuts="L"
          onClick={onToggle}
          className="inline-flex min-h-11 items-center gap-2 rounded-hard px-2 font-medium text-text-2 hover:bg-surface-2 hover:text-text"
        >
          {open ? 'Hide reading log' : 'Show reading log'}
          <kbd
            aria-hidden="true"
            className="rounded-hard border border-border-strong bg-surface-2 px-1.5 font-mono text-sm leading-tight"
          >
            L
          </kbd>
        </button>
      </div>
      <div
        id="reading-log-table"
        hidden={!open}
        role="region"
        aria-label="Reading log table"
        // A scrollable region must be keyboard-focusable (axe scrollable-region-focusable, WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="overflow-x-auto rounded-hard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <table aria-label="Reading log" className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr className="text-text-2">
              {['Step', 'Told', 'Reading', 'Landed', 'Warning'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="border-b border-border-strong py-2 pr-4 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr data-testid="log-empty">
                <td colSpan={5} className="py-4 text-text-2">
                  No readings yet. Each accepted reading appears here with the row it most likely
                  came from.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.key}
                  className={
                    i === rows.length - 1
                      ? 'animate-[reading-accepted_var(--motion-crawl)_var(--ease-smooth)_both]'
                      : ''
                  }
                >
                  <td className="border-b border-hairline py-2.5 pr-4 font-mono tnum">{r.step}</td>
                  <td className="border-b border-hairline py-2.5 pr-4 font-mono">{r.told}</td>
                  <td className="border-b border-hairline py-2.5 pr-4 font-mono tnum font-semibold text-measured">
                    {r.reading}
                  </td>
                  <td
                    className={`border-b border-hairline py-2.5 pr-4 font-mono ${r.landed === 'hidden' ? 'text-text-2 italic' : ''}`}
                  >
                    {r.landed}
                  </td>
                  <td
                    className={`border-b border-hairline py-2.5 pr-4 ${r.hasWarning ? 'font-medium text-warning-text' : 'text-text-2'}`}
                  >
                    {r.warning}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
