import { Link } from 'react-router'
import { CONTACT_EMAIL, PROMISE, SAFETY_SCOPE } from '../content'
import s from '../landing.module.css'
import { Caption, PhotoFigure, Section } from '../parts'
import { cx } from '../cx'
import { PHOTOS } from '../photos'

/** Ink CTA band, 7:5: the promise and the exits beside an empty breadboard. */
export function Close() {
  return (
    <Section id="close" className={cx(s.section, s.ink)}>
      <div className={cx(s.frame, s.grid, 'w-full items-center gap-y-12')}>
        <div className="col-span-4 md:col-span-7">
          <h2 id="close-title" className={s.display}>
            {PROMISE}
          </h2>
          <ul className="mt-12 flex flex-wrap gap-4" aria-label="Next steps">
            <li>
              <Link to="/sim?demo=worked-example" className={s.inkPrimary}>
                Run the worked example in the simulator
              </Link>
            </li>
            <li>
              <Link to="/about#pilot" className={s.inkButton}>
                Join the pilot
              </Link>
            </li>
            <li>
              <Link to="/about#partner" className={s.inkButton}>
                Partner with us
              </Link>
            </li>
            <li>
              <a href="#how" className={s.inkButton}>
                Read the method
              </a>
            </li>
          </ul>
          <p className={cx(s.body, 'mt-10 text-on-ink-muted')}>
            Join the pilot is for blindness organizations and instructors. Partner with us is for
            instrument makers and rehabilitation agencies. Pilots, partnerships and support:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={s.link}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <Caption className="mt-8">{SAFETY_SCOPE}</Caption>
        </div>
        <div className="col-span-4 md:col-span-4 md:col-start-9">
          <PhotoFigure
            photo={PHOTOS.breadboardEmpty}
            sizes="(min-width: 768px) 30vw, 100vw"
            className={s.ratioPortrait}
          />
        </div>
      </div>
    </Section>
  )
}
