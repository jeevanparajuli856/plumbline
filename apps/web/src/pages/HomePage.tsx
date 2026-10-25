import { useReducedMotion } from '@/a11y/useReducedMotion'
import { MarketingPage } from '@/landing/MarketingPage'
import { Audience } from '@/landing/sections/Audience'
import { Hero } from '@/landing/sections/Hero'
import { HomeCta, Proof } from '@/landing/sections/HomeSections'
import { Problem } from '@/landing/sections/Problem'
import { Steps } from '@/landing/sections/Steps'

/** Home `/`: promise, how it works, proof, one action (POSITIONING section 2). */
export function HomePage() {
  const reduced = useReducedMotion()
  return (
    <MarketingPage hasEdgeColumn hasScene>
      <Hero reduced={reduced} />
      <Problem />
      <Steps />
      <Proof />
      <Audience />
      <HomeCta />
    </MarketingPage>
  )
}
