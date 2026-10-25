import { formatPct } from '@/lib/format'
import { NO_READING, placementRoles, placementSentence, type PlacementItem } from './view'

/** Digits 1 to 9 aim at the first nine sites (a11y/keymap.ts). */
const DIGIT_SITES = 9

interface PlacementStripProps {
  items: readonly PlacementItem[]
  siteNoun: string
  onAim(site: number): void
}

/**
 * Where the probe landed: told row dashed cyan, likely row filled amber, landed row only after the
 * reveal. Each cell is also the button twin of its digit key, so aiming works by pointer and keyboard.
 */
export function PlacementStrip({ items, siteNoun, onAim }: PlacementStripProps) {
  const hasReading = items.some((i) => i.p !== null)
  return (
    <div>
      <p className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="label-caps">Where the probe landed</span>
        {hasReading ? null : <span className="text-text-2">{NO_READING}.</span>}
      </p>
      <ul
        aria-label="Where the probe landed"
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <li key={item.site} className="min-w-0" aria-current={item.isAimed ? 'true' : undefined}>
            <span className="sr-only">{placementSentence(item)}</span>
            {/* The button's visible text (the row label) is part of its name (WCAG 2.5.3). */}
            <button
              type="button"
              onClick={() => onAim(item.site)}
              aria-keyshortcuts={item.site < DIGIT_SITES ? String(item.site + 1) : undefined}
              className="block min-h-11 w-full rounded-hard text-center font-mono text-sm text-text-2 hover:text-text"
            >
              <span className="sr-only">Aim at</span> {item.label}
            </button>
            <PlacementCell item={item} />
          </li>
        ))}
      </ul>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-text-2">
        <Legend swatch="border-2 border-dashed border-inferred" text={`told ${siteNoun}`} />
        <Legend
          swatch="bg-measured-fill border-2 border-measured-fill"
          text={`likely ${siteNoun}`}
        />
        <Legend swatch="border-2 border-text" text="landed, shown after the reading" />
      </p>
    </div>
  )
}

function PlacementCell({ item }: { item: PlacementItem }) {
  const box = item.isLikely
    ? 'bg-measured-fill text-on-measured border-measured-fill'
    : item.isTold
      ? 'border-dashed border-inferred bg-surface-1'
      : 'border-hairline bg-surface-1 group-hover:border-border-strong'
  return (
    <span aria-hidden="true" className="grid gap-1">
      <span
        className={`relative grid min-h-14 place-items-center rounded-hard border-2 font-mono tnum text-md font-semibold ${box} ${item.isLanded ? 'outline-2 outline-offset-2 outline-text' : ''}`}
      >
        {item.p === null ? (
          <span className="block h-0.5 w-4 bg-border-strong" />
        ) : (
          formatPct(item.p, 0)
        )}
      </span>
      <span className="min-h-6 font-mono text-sm leading-tight">
        {placementRoles(item).join(' ')}
      </span>
    </span>
  )
}

function Legend({ swatch, text }: { swatch: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={`inline-block h-4 w-6 rounded-hard ${swatch}`} />
      {text}
    </span>
  )
}
