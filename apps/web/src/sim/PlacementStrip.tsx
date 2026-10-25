import { formatPct } from '@/lib/format'
import { placementSentence, type PlacementItem } from './view'

interface PlacementStripProps {
  items: readonly PlacementItem[]
  siteNoun: string
}

/** Where the probe landed: told row dashed cyan, likely row filled amber, landed row only after the reveal. */
export function PlacementStrip({ items, siteNoun }: PlacementStripProps) {
  return (
    <div>
      <p className="label-caps" id="placement-label">
        Where the probe landed
      </p>
      <ul
        aria-label="Where the probe landed"
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <li key={item.site} className="min-w-0">
            <span className="sr-only">{placementSentence(item)}</span>
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
      : 'border-hairline bg-surface-1'
  return (
    <div aria-hidden="true" className="grid gap-1 text-center">
      <span className="font-mono text-sm text-text-2">{item.label}</span>
      <span
        className={`relative grid min-h-14 place-items-center rounded-hard border-2 font-mono tnum text-md font-semibold ${box} ${item.isLanded ? 'outline-2 outline-offset-2 outline-text' : ''}`}
      >
        {formatPct(item.p, 0)}
      </span>
      <span className="min-h-6 font-mono text-sm leading-tight">
        {[
          item.isTold && 'told',
          item.isLikely && 'likely',
          item.isLanded && 'landed',
          item.isAimed && !item.isTold && 'aimed',
        ]
          .filter(Boolean)
          .join(' ')}
      </span>
    </div>
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
