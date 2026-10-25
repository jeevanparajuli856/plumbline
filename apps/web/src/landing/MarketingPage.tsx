import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from '@/a11y/useReducedMotion'
import { useLanding } from '@/state/landing'
import { EdgeColumn } from './EdgeColumn'
import s from './landing.module.css'
import { useScrollProgress } from './useScrollProgress'

const LandingMotion = lazy(() => import('@/landing/motion'))

interface MarketingPageProps {
  /** The edge cell column (Home, How it works, The app). */
  hasEdgeColumn?: boolean
  /** Mount the 3D scene behind this page (How it works only, ADR-0014). */
  hasScene?: boolean
  children: ReactNode
}

/**
 * One marketing page: `main#main` with the reduced-motion gate, the lazy motion module scoped to it,
 * the scene mode and the scroll progress the scene and the edge column read.
 */
export function MarketingPage({
  hasEdgeColumn = false,
  hasScene = false,
  children,
}: MarketingPageProps) {
  const mainRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const setSceneMode = useLanding((st) => st.setSceneMode)

  useEffect(() => {
    setSceneMode(hasScene ? 'landing' : 'hidden')
    return () => setSceneMode('hidden')
  }, [hasScene, setSceneMode])
  useScrollProgress(mainRef, reduced)

  return (
    <main id="main" ref={mainRef} className={s.root} data-reduced={reduced ? 'true' : 'false'}>
      {children}
      {hasEdgeColumn && <EdgeColumn />}
      <Suspense fallback={null}>
        <LandingMotion rootRef={mainRef} />
      </Suspense>
    </main>
  )
}
