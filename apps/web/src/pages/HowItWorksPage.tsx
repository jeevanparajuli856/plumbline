import { HOW_IT_WORKS_SCENE_KEYS } from '@/landing/choreography'
import { cx } from '@/landing/cx'
import s from '@/landing/landing.module.css'
import { MarketingPage } from '@/landing/MarketingPage'
import { Caption, Eyebrow, Section } from '@/landing/parts'
import { Domains } from '@/landing/sections/Domains'
import { Play } from '@/landing/sections/Play'
import { Refusal } from '@/landing/sections/Refusal'
import { useWorkedReplay } from '@/landing/useWorkedReplay'

/** How it works: the experience, not the method. The only page with the 3D scene behind it. */
export function HowItWorksPage() {
  const { load, play, replay } = useWorkedReplay()
  const fixture = load.status === 'ready' ? load.fixture : null
  return (
    <MarketingPage hasEdgeColumn hasScene>
      <Section
        id="intro"
        sceneKey={HOW_IT_WORKS_SCENE_KEYS.intro}
        className={cx(s.section, s.sceneSection, s.introSection)}
      >
        <div className={cx(s.frame, s.grid, 'w-full')}>
          <div className={cx('col-span-4 md:col-span-6', s.phonePaper)}>
            <Eyebrow>How it works</Eyebrow>
            <h1 id="intro-title" tabIndex={-1} className={cx(s.display, 'mt-8')}>
              You hold the probe. Truehand checks where it went.
            </h1>
            <p className={cx(s.lead, 'mt-8')}>
              It tells you which row to touch, listens to each reading, and works out where the
              probe actually landed. When the readings agree, it names the fault. Below is one real
              recorded session, step by step.
            </p>
            <Caption className="mt-10">
              Scene: a breadboard circuit on a lab bench, the red probe above it. Everything the
              scene shows is also in the text on this page.
            </Caption>
          </div>
        </div>
      </Section>
      <Play fixture={fixture} onPlay={() => void play()} onReplay={() => void replay()} />
      <Refusal fixture={fixture} />
      <Domains />
      {load.status === 'missing' && (
        <p role="status" className={cx(s.frame, s.body, 'pb-16')}>
          {load.sentence}
        </p>
      )}
    </MarketingPage>
  )
}
