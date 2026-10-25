import { buttonClass, KEYCAP } from '@/ui/button'
import { formatBits } from '@/lib/format'
import type { Heading } from './flow'
import { uncertaintyFraction } from './view'

/** Distance the bob travels from "nothing known" (top) to the datum (bottom), in px. */
const BOB_TRAVEL_PX = 132

interface InstructionPanelProps {
  heading: Heading
  entropyBits: number
  maxEntropyBits: number
  settled: boolean
  /** The R key's button twin; omitted when there is nothing to repeat. */
  onRepeat?: () => void
}

/**
 * The dominant element. The plumb line in the left gutter is driven by the engine's entropy:
 * the bob hangs high while every fault is possible and comes to rest on the datum as belief converges.
 */
export function InstructionPanel({
  heading,
  entropyBits,
  maxEntropyBits,
  settled,
  onRepeat,
}: InstructionPanelProps) {
  const u = uncertaintyFraction(entropyBits, maxEntropyBits)
  const hasEntropy = maxEntropyBits > 0
  return (
    <div className="grid grid-cols-[2.5rem_1fr] gap-x-5 sm:grid-cols-[3rem_1fr] sm:gap-x-6">
      <PlumbLine offset={(1 - u) * BOB_TRAVEL_PX} settled={settled} />
      <div className="min-w-0 py-1">
        <p className="label-caps">
          {heading.isInstruction ? 'Instruction' : settled ? 'Result' : 'Status'}
        </p>
        <h1
          tabIndex={-1}
          data-testid={heading.isInstruction ? 'instruction' : undefined}
          className="mt-2 text-xl font-semibold tracking-tight text-text outline-offset-4"
        >
          {heading.title}
        </h1>
        {heading.sub ? <p className="mt-2 text-lg text-text-2">{heading.sub}</p> : null}
        {onRepeat ? (
          <button
            type="button"
            onClick={onRepeat}
            aria-keyshortcuts="R"
            className={buttonClass('quiet', 'mt-2 -ml-1 px-1')}
          >
            Repeat instruction
            <kbd aria-hidden="true" className={KEYCAP}>
              R
            </kbd>
          </button>
        ) : null}
        {hasEntropy ? (
          <p className="mt-5 flex flex-wrap items-baseline gap-x-3">
            <span className="label-caps">Uncertainty left</span>
            <span className="font-mono tnum text-md text-text">
              {formatBits(entropyBits)}{' '}
              <span className="text-text-2">of {formatBits(maxEntropyBits)}</span>
            </span>
          </p>
        ) : null}
      </div>
    </div>
  )
}

function PlumbLine({ offset, settled }: { offset: number; settled: boolean }) {
  return (
    <div aria-hidden="true" className="relative h-[11rem] justify-self-center">
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-hairline" />
      <span
        className="absolute left-1/2 top-0 w-px origin-top -translate-x-1/2 bg-text transition-transform duration-[var(--motion-pendulum-settle)] ease-[var(--ease-smooth)]"
        style={{ height: 1, transform: `translateX(-50%) scaleY(${offset + 8})` }}
      />
      <span
        className="absolute left-1/2 top-0 block transition-transform duration-[var(--motion-pendulum-settle)] ease-[var(--ease-smooth)]"
        style={{ transform: `translate(-50%, ${offset}px)` }}
      >
        <svg width="22" height="30" viewBox="0 0 22 30" className="block">
          <path
            d="M11 2 L19 12 L11 28 L3 12 Z"
            fill={settled ? 'var(--measured-fill)' : 'var(--surface-1)'}
            stroke="var(--text)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="absolute -left-3 -right-3 bottom-0 h-0.5 bg-text" />
    </div>
  )
}
