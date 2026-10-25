import { useEffect } from 'react'
import { Link } from 'react-router'
import { useLanding } from '@/state/landing'

/** Sprint 0 placeholder. The landing lane replaces this with the sections in docs/POSITIONING.md. */
export function LandingPage() {
  const setSceneMode = useLanding((s) => s.setSceneMode)
  useEffect(() => {
    setSceneMode('landing')
    return () => setSceneMode('hidden')
  }, [setSceneMode])
  return (
    <main id="main" className="relative mx-auto max-w-6xl px-4 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.08em] text-text-2">
        Research preview. Trustworthy measurement for hands that cannot see the tool
      </p>
      <h1 className="mt-5 max-w-3xl text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[1.05] tracking-tight">
        Measurement you can trust without looking.
      </h1>
      <p className="mt-6 max-w-2xl text-xl leading-relaxed text-text-2">
        When a blind person measures a circuit, nothing checks whether the probe landed where it
        was told. Plumbline infers the fault and the probe's true position from each reading, and it
        refuses to guess when the physics cannot tell two faults apart.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/sim?demo=worked-example"
          className="rounded-hard bg-inferred-fill px-5 py-3 font-semibold text-on-inferred"
        >
          Play the 20-second example
        </Link>
        <Link
          to="/sim"
          className="rounded-hard border border-border-strong px-5 py-3 font-medium"
        >
          Open the simulator
        </Link>
      </div>
      <p className="mt-6 font-mono text-sm text-muted">
        Scene: lab bench, breadboard, nothing measured yet. The plumb line swings freely.
      </p>
    </main>
  )
}
