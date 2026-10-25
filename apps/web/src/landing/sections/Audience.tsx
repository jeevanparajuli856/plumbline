import { USE_CASES } from '../content'
import s from '../landing.module.css'
import { Eyebrow, Section } from '../parts'
import { cx } from '../cx'

/** Who it is for and who buys it: three use cases as ruled rows, roles only. */
export function Audience() {
  return (
    <Section id="audience" className={cx(s.section, s.sectionTight, s.sheet)}>
      <div className={cx(s.frame, s.grid, 'gap-y-10')}>
        <header className="col-span-4 md:col-span-4">
          <Eyebrow>Who it is for</Eyebrow>
          <h2 id="audience-title" className={cx(s.h2, 'mt-6')}>
            Wherever a blind hand holds the probe.
          </h2>
        </header>
        <ul
          data-motion="reveal"
          data-motion-reveal="stagger"
          className={cx(s.outcomes, 'col-span-4 md:col-span-8')}
        >
          {USE_CASES.map((u) => (
            <li key={u.name} data-motion-item className={s.outcome}>
              <h3 className={s.rungTitle}>{u.name}</h3>
              <div>
                <p className={s.body}>{u.sentence}</p>
                <p className={cx(s.buyer, 'mt-2')}>{u.buyer}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
