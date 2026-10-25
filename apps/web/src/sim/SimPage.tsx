import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'
import { DOMAINS } from '@/state/domains'
import { formatReading, formatPct } from '@/lib/format'

/** Sprint 0 placeholder wiring the store end to end. The web-shell lane replaces the panels. */
export function SimPage() {
  const [params] = useSearchParams()
  const setSceneMode = useLanding((s) => s.setSceneMode)
  const s = useSession()
  const demo = params.get('demo')
  const fixture = params.get('fixture') ?? (demo === 'worked-example' ? 'worked_example' : undefined)
  const mode = (params.get('mode') as 'simulate' | 'live' | 'replay' | null) ?? 'replay'
  const domain = (params.get('domain') as 'circuit' | 'thermometer' | null) ?? 'circuit'

  useEffect(() => {
    setSceneMode('sim')
    void useSession.getState().start({ mode, domain, ...(fixture ? { fixture } : {}) })
    return () => setSceneMode('hidden')
  }, [setSceneMode, mode, domain, fixture])

  const spec = DOMAINS[s.domain]
  const told = s.instruction && s.catalog ? s.catalog.sites[s.instruction.site] : undefined
  return (
    <main id="main" className="relative mx-auto max-w-5xl px-4 py-10">
      <p className="font-mono text-sm text-muted">
        Simulator. {s.mode} mode. {s.replay?.provisional ? 'PROVISIONAL FIXTURE.' : ''}
      </p>
      {s.warning && (
        <div
          role="alert"
          className="mt-4 border-l-[6px] border-warning bg-warning-surface p-4 text-lg text-warning-text"
        >
          {s.warning.text}
        </div>
      )}
      <h1 className="mt-6 text-[2.125rem] font-semibold leading-tight">
        {s.phase === 'resolved' && s.diagnosis
          ? `${s.diagnosis.label}. Confidence ${formatPct(s.diagnosis.confidence, 0)}.`
          : s.phase === 'unresolved'
            ? s.unresolved?.text ?? 'Unresolved.'
            : told
              ? spec.phrases.instruction(told)
              : 'Starting...'}
      </h1>
      {s.error && (
        <p role="alert" className="mt-4 text-warning-text">
          {s.error.sentence}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-hard bg-inferred px-4 py-3 font-semibold text-white disabled:opacity-50"
          disabled={s.phase !== 'awaiting_reading' || s.mode !== 'replay'}
          onClick={() => void s.replayNext()}
        >
          Next recorded reading
        </button>
        <button
          type="button"
          className="rounded-hard border border-border-strong px-4 py-3 font-medium"
          onClick={() => void s.reset()}
        >
          Reset
        </button>
      </div>
      <table className="mt-8 w-full border-collapse text-left" aria-label="Reading log">
        <thead>
          <tr className="text-text-2">
            <th className="border-b border-hairline py-2">Step</th>
            <th className="border-b border-hairline py-2">Told</th>
            <th className="border-b border-hairline py-2">Reading</th>
            <th className="border-b border-hairline py-2">Landed</th>
            <th className="border-b border-hairline py-2">Warning</th>
          </tr>
        </thead>
        <tbody>
          {s.readings.map((r) => (
            <tr key={r.step}>
              <td className="border-b border-hairline py-2 font-mono tnum">{r.step + 1}</td>
              <td className="border-b border-hairline py-2">{s.catalog?.sites[r.toldSite]?.label}</td>
              <td className="border-b border-hairline py-2 font-mono tnum text-measured">
                {formatReading(r.value, spec)}
              </td>
              <td className="border-b border-hairline py-2">
                {r.landedSite !== undefined ? s.catalog?.sites[r.landedSite]?.label : 'hidden'}
              </td>
              <td className="border-b border-hairline py-2">{r.warning ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
