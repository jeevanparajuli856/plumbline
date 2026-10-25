import { useEffect, useState } from 'react'
import evidenceMd from '@docs/EVIDENCE.md?raw'
import { InlineText } from '@/evidence/InlineText'
import { parseEvidence, parseInline } from '@/evidence/markdown'
import { loadFixture } from '@/state/replay'
import { confusionBand, type ConfusionBand } from './confusionBand'

const evidence = parseEvidence(evidenceMd)

/** Purpose-split contact (DESIGN_REFERENCES E4): one address, a subject per purpose. */
const CONTACT_EMAIL = 'support@truehand.tech'
const CONTACT_PLACE = 'Monroe, Louisiana'

function contactHref(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

/** Notes under the citations, minus the file's own intro line and internal pitch bookkeeping. */
const publicNotes = evidence.studyNotes.slice(1).filter((note) => !/used in the pitch/i.test(note))

const REPRODUCE: readonly { command: string; does: string }[] = [
  { command: 'pnpm install', does: 'Install the web workspace.' },
  { command: 'uv sync --project engine', does: 'Install the Python engine.' },
  { command: 'uv run --project engine pytest', does: 'Run the engine tests.' },
  { command: 'pnpm verify', does: 'Typecheck, lint, unit tests and Python checks.' },
  {
    command: 'pnpm dev',
    does: 'Open the simulator locally; the worked example replays without the engine.',
  },
]

/** The assumed hand model, read from the worked-example recording so the numbers are never typed here. */
function useAssumedConfusion(): ConfusionBand | null {
  const [confusion, setConfusion] = useState<ConfusionBand | null>(null)
  useEffect(() => {
    let alive = true
    loadFixture('worked_example')
      .then((fx) => {
        const band = confusionBand(fx.config.confusion)
        if (alive && band) setConfusion(band)
      })
      .catch(() => {
        /* the sentence below reads without the numbers */
      })
    return () => {
      alive = false
    }
  }, [])
  return confusion
}

/** /about: team, honesty note, sources, how to reproduce. */
export function AboutPage() {
  const confusion = useAssumedConfusion()
  return (
    <main id="main" className="mx-auto max-w-[90rem] px-4 pb-16 pt-10 sm:px-8 lg:px-16 lg:pt-16">
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="label-caps">About</p>
          <h1 tabIndex={-1} className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            Trustworthy measurement for hands that cannot see the tool.
          </h1>
          <p className="mt-5 max-w-[60ch] text-md text-text-2">
            Truehand infers the circuit fault and where the probe actually landed from each
            reading. When a number came from the wrong row, it says so. When the physics cannot tell
            two faults apart, it refuses to guess. Web simulator open now. iOS app next.
          </p>
        </div>

        <section
          aria-labelledby="team-heading"
          className="self-end border-l-2 border-text pl-6 lg:col-span-5"
        >
          <h2 id="team-heading" className="label-caps">
            Team
          </h2>
          <ul className="mt-3 grid gap-1 text-lg">
            <li>Jeevan Parajuli</li>
            <li>Pankaj Bhatta</li>
          </ul>
          <p className="mt-2 text-text-2">University of Louisiana Monroe</p>
        </section>
      </div>

      <section
        aria-labelledby="honesty-heading"
        className="mt-16 grid gap-x-12 gap-y-4 lg:grid-cols-12"
      >
        <h2 id="honesty-heading" className="text-lg font-semibold lg:col-span-4">
          What this is, and what it is not yet
        </h2>
        <div className="grid gap-4 text-md lg:col-span-8">
          <p className="font-semibold">Simulation validated. User validation in progress.</p>
          <p>
            Results on this site come from simulated faults and a simulated hand. We have not yet
            measured how real hands miss. That measurement is being scheduled with the Louisiana
            Center for the Blind.
          </p>
          <p>
            The confusion model uses three assumed numbers
            {confusion ? (
              <>
                :{' '}
                <span className="font-mono tnum">
                  {confusion.p_same}, {confusion.p_pm1} and {confusion.p_pm2}
                </span>
              </>
            ) : null}
            . They will be replaced by a measured matrix, and every experiment re-run.
          </p>
          <p>
            When two faults produce the same voltages at every row, Truehand says it cannot tell
            them apart and asks for a different measurement. It does not pick one.
          </p>
          <p>
            Thermometer: SIMULATED. The engine is the same; the instrument model is a textbook heat
            equation, not a real probe.
          </p>
          <p className="border-l-4 border-text pl-4 font-medium">
            Research preview. Not a safety device. Do not use it to work on mains voltage or
            anything that can hurt you.
          </p>
        </div>
      </section>

      <section
        id="pilot"
        aria-labelledby="pilot-heading"
        className="mt-16 grid scroll-mt-24 gap-x-12 gap-y-4 lg:grid-cols-12"
      >
        <h2 id="pilot-heading" className="text-lg font-semibold lg:col-span-4">
          Join the pilot
        </h2>
        <div className="grid gap-4 text-md lg:col-span-8">
          <p>
            For blindness organizations and instructors who teach electronics. A pilot is a short
            session where students try the simulator and, with permission, help us measure how a
            hand actually misses a breadboard row. That measurement replaces our assumed numbers.
          </p>
          <p>
            <a className="underline underline-offset-4" href={contactHref('Truehand pilot')}>
              Email us about the pilot
            </a>{' '}
            at <span className="font-mono">{CONTACT_EMAIL}</span>. {CONTACT_PLACE}.
          </p>
        </div>
      </section>

      <section
        id="partner"
        aria-labelledby="partner-heading"
        className="mt-16 grid scroll-mt-24 gap-x-12 gap-y-4 lg:grid-cols-12"
      >
        <h2 id="partner-heading" className="text-lg font-semibold lg:col-span-4">
          Partner with us
        </h2>
        <div className="grid gap-4 text-md lg:col-span-8">
          <p>
            For instrument makers and rehabilitation agencies. The engine is domain-agnostic: a new
            instrument needs a model of what each reading should be at each place the probe can
            land.
          </p>
          <p>
            <a className="underline underline-offset-4" href={contactHref('Truehand partnership')}>
              Email us about a partnership
            </a>{' '}
            at <span className="font-mono">{CONTACT_EMAIL}</span>. {CONTACT_PLACE}.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="sources-heading"
        className="mt-16 grid gap-x-12 gap-y-4 lg:grid-cols-12"
      >
        <div className="lg:col-span-4">
          <h2 id="sources-heading" className="text-lg font-semibold">
            Sources
          </h2>
          <p className="mt-1 text-text-2">
            As cited in our evidence file. DOIs are added once verified.
          </p>
        </div>
        <div className="lg:col-span-8">
          <ol className="grid list-decimal gap-4 pl-6 marker:font-mono marker:text-text-2">
            {evidence.studies.map((study, i) => (
              <li key={i} className="pl-2">
                <InlineText parts={parseInline(study)} />
              </li>
            ))}
          </ol>
          <div className="mt-6 grid gap-3 text-text-2">
            {publicNotes.map((note, i) => (
              <p key={i}>
                <InlineText parts={parseInline(note)} />
              </p>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="reproduce-heading"
        className="mt-16 grid gap-x-12 gap-y-4 lg:grid-cols-12"
      >
        <div className="lg:col-span-4">
          <h2 id="reproduce-heading" className="text-lg font-semibold">
            Reproduce it
          </h2>
          <p className="mt-1 text-text-2">
            From a clone of the repository, Node 22 and Python 3.13.
          </p>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-hard border-2 border-border-strong bg-hairline lg:col-span-8">
          {REPRODUCE.map((r) => (
            <li
              key={r.command}
              className="grid gap-1 bg-surface-1 px-4 py-3 sm:grid-cols-[minmax(0,22rem)_1fr] sm:gap-6"
            >
              <code className="font-mono text-text">{r.command}</code>
              <span className="text-text-2">{r.does}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
