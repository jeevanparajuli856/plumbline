import { Link } from 'react-router'
import type { FixtureT } from '@/engine/schemas'
import { PRODUCT_LINE, STATUS_LINE, UNIVERSITY } from '../content'
import s from '../landing.module.css'
import { Caption, Section } from '../parts'
import { cx } from '../cx'
import { PlumbFigure } from '../PlumbFigure'
import { maxEntropy } from '../workedExample'

interface MastProps {
  fixture: FixtureT | null
  hasScene: boolean
  onPlay(): void
}

export function Mast({ fixture, hasScene, onPlay }: MastProps) {
  const hMax = fixture ? maxEntropy(fixture) : 0
  return (
    <Section id="mast" className={cx(s.section, s.mast)}>
      <div className={cx(s.frame, s.grid, 'w-full items-center')}>
        <div className="col-span-4 md:col-span-7">
          <p className={s.eyebrow}>
            Research preview. Trustworthy measurement for hands that cannot see the tool
          </p>
          <h1 id="mast-title" className={cx(s.display, 'mt-6')}>
            Measurement you can trust without looking.
          </h1>
          <p className={cx(s.lead, 'mt-6')}>
            When a blind person measures a circuit, nothing checks whether the probe landed where it
            was told. Plumbline infers the fault and the probe&apos;s true position from each
            reading, and it refuses to guess when the physics cannot tell two faults apart.
          </p>
          <dl className="mt-8 grid gap-x-6 gap-y-3 border-t border-hairline pt-4 sm:grid-cols-[auto_1fr]">
            <dt className={s.label}>Status</dt>
            <dd className="text-lg">{STATUS_LINE}</dd>
            <dt className={s.label}>Product</dt>
            <dd className="text-lg">{PRODUCT_LINE}</dd>
            <dt className={s.label}>Built at</dt>
            <dd className="text-lg">{UNIVERSITY}</dd>
          </dl>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#play"
              className={cx(s.button, s.primary)}
              onClick={(e) => {
                e.preventDefault()
                onPlay()
              }}
            >
              Play the 20-second example
            </a>
            <Link to="/sim" className={s.button}>
              Open the simulator
            </Link>
          </div>
          <Caption className="mt-12">
            Scene: lab bench, breadboard, nothing measured yet.
            {fixture
              ? ` ${fixture.catalog.hypothesis_ids.length} possible faults, uncertainty ${hMax.toFixed(2)} bits.`
              : ''}{' '}
            Uncertainty: high. The line hangs still only when the evidence agrees.
          </Caption>
        </div>
        {!hasScene && fixture && (
          <div className="col-span-4 hidden justify-center md:col-span-4 md:col-start-9 md:flex">
            <PlumbFigure entropyBits={hMax} maxEntropyBits={hMax} />
          </div>
        )}
      </div>
    </Section>
  )
}
