import { Link } from 'react-router'
import { PROMISE, SAFETY_SCOPE } from '../content'
import s from '../landing.module.css'
import { Caption, Section } from '../parts'
import { cx } from '../cx'

export function Close() {
  return (
    <Section id="close" className={cx(s.section, s.close)}>
      <div className={cx(s.frame, s.grid, 'w-full gap-y-10')}>
        <div className={cx('col-span-4 md:col-span-8', s.phonePaper)}>
          <h2 id="close-title" className={s.display}>
            {PROMISE}
          </h2>
          <ul className="mt-10 flex flex-wrap gap-4" aria-label="Next steps">
            <li>
              <Link to="/sim?demo=worked-example" className={cx(s.button, s.primary)}>
                Run the worked example in the simulator
              </Link>
            </li>
            <li>
              <Link to="/about#pilot" className={s.button}>
                Join the pilot
              </Link>
            </li>
            <li>
              <Link to="/about#partner" className={s.button}>
                Partner with us
              </Link>
            </li>
            <li>
              <a href="#how" className={s.button}>
                Read the method
              </a>
            </li>
          </ul>
          <p className={cx(s.body, 'mt-10 text-text-2')}>
            Join the pilot is for blindness organizations and instructors. Partner with us is for
            instrument makers and rehabilitation agencies.
          </p>
          <Caption className="mt-8">Scene: the plumb line at rest. {SAFETY_SCOPE}</Caption>
        </div>
      </div>
    </Section>
  )
}
