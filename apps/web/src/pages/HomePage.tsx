import { useReducedMotion } from '@/a11y/useReducedMotion'
import { MarketingPage } from '@/landing/MarketingPage'
import { Audience } from '@/landing/sections/Audience'
import { Hero } from '@/landing/sections/Hero'
import { HomeCta, Outcomes, Proof } from '@/landing/sections/HomeSections'
import { Problem } from '@/landing/sections/Problem'

/** Home `/`: promise, proof, one action. Under four screens at 1440 (POSITIONING section 2). */
export function HomePage() {
  const reduced = useReducedMotion()
  return (
    <MarketingPage hasEdgeColumn>
      <Hero reduced={reduced} />
      <Problem />
      <Outcomes />
      <Proof />
      <Audience />
      <HomeCta />
    </MarketingPage>
  )
}
