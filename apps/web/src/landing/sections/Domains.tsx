import s from '../landing.module.css'
import { Badge } from '@/ui/Badge'
import { Caption, Eyebrow, Section } from '../parts'
import { HOW_IT_WORKS_SCENE_KEYS } from '../choreography'
import { cx } from '../cx'
import { ProvenanceLine } from '../ProvenanceLine'
import { useFixture } from '../useFixture'
import { transcript } from '../workedExample'

/**
 * Same engine, second instrument. SIMULATED is the first thing in the section, before any motion.
 * The recorded steps sit below the pinned scene so the badge and heading always fit the viewport.
 * Without the recording the story is told in words, including that one reading cannot catch this slip.
 */
export function Domains() {
  const demo = useFixture('thermometer_demo')
  return (
    <Section id="domains" sceneKey={HOW_IT_WORKS_SCENE_KEYS.domains}>
      <div data-sticky-track className={cx(s.track, s.trackGeneralize)}>
        <div data-sticky-pin className={s.pin}>
          <div className={cx(s.frame, s.grid, 'w-full py-16 md:py-0')}>
            <div className={cx('col-span-4 md:col-span-6', s.phonePaper)}>
              <Badge kind="SIMULATED" />
              <div className="mt-4">
                <Eyebrow>Beyond circuits</Eyebrow>
              </div>
              <h2 id="domains-title" className={cx(s.h2, 'mt-4')}>
                Same engine, different instrument.
              </h2>
              <p className={cx(s.lead, 'mt-6')}>
                A probe thermometer in a simulated roast: how done the meat is, and how deep the tip
                really went.
              </p>
              <Caption className="mt-6">
                SIMULATED. Scene: a sliced roast with a temperature gradient. The tip depth is
                uncertain and drawn as a band, not a point.
                {demo.status === 'ready'
                  ? ''
                  : ' Recorded numbers appear in the steps below once this run is recorded.'}
              </Caption>
            </div>
          </div>
        </div>
      </div>
      <div className={cx(s.section, s.sheet, s.ruleTop)}>
        <div className={cx(s.frame, s.grid)}>
          <div className="col-span-4 md:col-span-7">
            <h3 className={s.h3}>Step by step</h3>
            <ol className={cx(s.steps, 'mt-6')} aria-label="Thermometer example, step by step">
              {demo.status === 'ready' ? (
                transcript(demo.fixture).map((item) => (
                  <li
                    key={item.key}
                    className={cx(s.step, item.kind === 'warning' && s.stepWarning)}
                  >
                    <span>{item.text}</span>
                  </li>
                ))
              ) : (
                <>
                  <li className={s.step}>
                    <span>
                      Told to push the tip to the center, the hand stops short, in the outer layer.
                    </span>
                  </li>
                  <li className={s.step}>
                    <span>
                      One reading cannot reveal that slip: the temperature profile looks the same
                      shifted a little deeper or shallower. So there is no warning at step 1, and we
                      do not fake one.
                    </span>
                  </li>
                  <li className={s.step}>
                    <span>
                      The second reading disagrees with the shallow story. Truehand recovers, and
                      then says where the first reading really came from.
                    </span>
                  </li>
                </>
              )}
            </ol>
            {demo.status === 'ready' && <ProvenanceLine fixture={demo.fixture} className="mt-4" />}
          </div>
        </div>
      </div>
    </Section>
  )
}
