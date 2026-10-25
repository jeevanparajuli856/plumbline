import evidenceMd from '@docs/EVIDENCE.md?raw'
import { InlineText } from './InlineText'
import { EvidenceTable } from './EvidenceTable'
import { parseEvidence, type Evidence } from './markdown'
import { experimentCommands, statusCounts } from './summary'
import { ScrollRegion } from '@/ui/ScrollRegion'

const evidence: Evidence = parseEvidence(evidenceMd)

/** /evidence: the readiness table rendered at runtime from docs/EVIDENCE.md. */
export function EvidencePage() {
  const counts = statusCounts(evidence)
  const commands = experimentCommands(evidence)
  return (
    <main id="main" className="mx-auto max-w-[90rem] px-4 pb-16 pt-10 sm:px-8 lg:px-16 lg:pt-16">
      <div className="grid gap-x-12 gap-y-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="label-caps">Validation status</p>
          <h1 tabIndex={-1} className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            Simulation validated. User validation in progress.
          </h1>
          <p className="mt-5 max-w-[62ch] text-md text-text-2">
            Every row below is read from{' '}
            <code className="font-mono text-text">docs/EVIDENCE.md</code> in our repository each
            time this page loads. A row is done only when a command, a file, a link or a date proves
            it. Results here come from simulated faults and a simulated hand. We have not yet
            measured how real hands miss.
          </p>
        </div>
        <dl className="grid content-end gap-px self-end overflow-hidden rounded-hard border-2 border-border-strong bg-border-strong sm:grid-cols-3 lg:col-span-4">
          {(['DONE', 'IN PROGRESS', 'PENDING'] as const).map((k) => (
            <div key={k} className="bg-surface-1 px-4 py-3">
              <dt className="label-caps">
                {k === 'IN PROGRESS' ? 'In progress' : k === 'DONE' ? 'Done' : 'Pending'}
              </dt>
              <dd className="m-0 mt-1 font-mono tnum text-2xl leading-none">{counts[k]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section aria-labelledby="readiness-heading" className="mt-14">
        <h2 id="readiness-heading" className="text-lg font-semibold">
          Readiness, {evidence.readiness.length} items
        </h2>
        <p className="mt-1 text-text-2">Preliminary. Not peer reviewed.</p>
        <div className="mt-5">
          <EvidenceTable rows={evidence.readiness} />
        </div>
      </section>

      <section
        aria-labelledby="figures-heading"
        className="mt-14 grid gap-x-12 gap-y-4 lg:grid-cols-12"
      >
        <div className="lg:col-span-4">
          <h2 id="figures-heading" className="text-lg font-semibold">
            Figures
          </h2>
          <p className="mt-1 text-text-2">
            Not yet run. Each figure appears here once its command has written a result file.
          </p>
        </div>
        <ul className="grid gap-2 lg:col-span-8">
          {commands.map((c) => (
            <li
              key={c}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline py-2"
            >
              <span className="label-caps">Not yet run</span>
              <code className="font-mono">{c}</code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stats-heading" className="mt-14">
        <h2 id="stats-heading" className="text-lg font-semibold">
          Employment and prevalence
        </h2>
        <ScrollRegion label="Employment and prevalence table" className="mt-4">
          <table
            aria-label="Employment and prevalence"
            className="w-full min-w-[40rem] border-collapse text-left"
          >
            <thead>
              <tr className="text-text-2">
                <th scope="col" className="w-1/2 border-b-2 border-text py-2 pr-6 font-medium">
                  Statistic
                </th>
                <th scope="col" className="border-b-2 border-text py-2 font-medium">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {evidence.statistics.map((s, i) => (
                <tr key={i} className="align-top">
                  <td className="border-b border-hairline py-3 pr-6">
                    <InlineText parts={s.statistic} />
                  </td>
                  <td className="border-b border-hairline py-3">
                    <InlineText parts={s.source} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      </section>
    </main>
  )
}
