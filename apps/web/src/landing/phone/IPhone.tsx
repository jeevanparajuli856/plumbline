import type { CSSProperties } from 'react'
import { formatPct } from '@/lib/format'
import { WarningGlyph } from '../parts'
import { cx } from '../cx'
import type { AppScreenView } from './appScreen'
import p from './iphone.module.css'

/** Signal, wifi and battery, drawn small. Decorative device chrome. */
function StatusIcons() {
  return (
    <svg viewBox="0 0 66 12" className={p.statusIcons} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="0.8" />
        <rect x="4.5" y="6" width="3" height="6" rx="0.8" />
        <rect x="9" y="3.5" width="3" height="8.5" rx="0.8" />
        <rect x="13.5" y="1" width="3" height="11" rx="0.8" />
      </g>
      <path
        d="M24 4.2a8.5 8.5 0 0 1 12 0M26.4 6.7a5 5 0 0 1 7.2 0M28.8 9.2a1.6 1.6 0 0 1 2.4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect
        x="42"
        y="1.5"
        width="20"
        height="9"
        rx="2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        opacity="0.5"
      />
      <rect x="43.8" y="3.3" width="14" height="5.4" rx="1.4" fill="currentColor" />
      <path d="M63.4 4.6v2.8a1.4 1.4 0 0 0 0-2.8Z" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

function MicGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={p.actionGlyph} aria-hidden="true" focusable="false">
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" fill="currentColor" />
      <path
        d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Verdict({ view }: { view: AppScreenView }) {
  if (view.verdict?.kind === 'resolved') {
    return (
      <section className={cx(p.card, p.cardAnswer)}>
        <p className={p.cardLabel}>Answer</p>
        <p className={p.instruction}>{view.verdict.label}.</p>
        <p className={p.cardMeta}>
          Confidence <span className={p.mono}>{formatPct(view.verdict.p)}</span>
        </p>
      </section>
    )
  }
  if (view.verdict?.kind === 'unresolved') {
    return (
      <section className={cx(p.card, p.cardRefusal)}>
        <p className={p.cardLabel}>Cannot tell yet</p>
        <p className={p.refusalText}>{view.verdict.text}</p>
      </section>
    )
  }
  return (
    <section className={p.card}>
      <p className={p.cardLabel}>Next step</p>
      <p className={p.instruction}>{view.instruction}</p>
    </section>
  )
}

interface IPhoneProps {
  view: AppScreenView
  /** Changes when the recording advances, so the reading digits tick in once. */
  frameKey: string
}

/**
 * A believable iPhone running the Truehand app. Device chrome is decorative (aria-hidden); the
 * screen's text is real DOM. The two app buttons inside are pictures of controls, not controls.
 */
export function IPhone({ view, frameKey }: IPhoneProps) {
  return (
    <div className={p.device}>
      <div className={p.screen}>
        <div className={p.statusBar} aria-hidden="true">
          <span className={p.clock}>9:41</span>
          <span className={p.island} />
          <StatusIcons />
        </div>

        <header className={p.navBar}>
          <p className={p.largeTitle}>Truehand</p>
          <span className={p.chip}>{view.mode}</span>
        </header>
        <p className={p.step}>{view.step}</p>

        <Verdict view={view} />

        <div className={p.readingBlock}>
          <p className={p.cardLabel}>Last reading</p>
          {view.reading ? (
            <p className={p.reading}>
              <span className="sr-only">
                {view.reading.digits} {view.reading.unit}
              </span>
              <span aria-hidden="true">
                {view.reading.digits.split('').map((ch, i) => (
                  <span
                    key={`${frameKey}-${i}`}
                    className={p.digit}
                    style={{ '--i': i } as CSSProperties}
                  >
                    {ch}
                  </span>
                ))}
                <span className={p.unit}>{view.reading.unit}</span>
              </span>
            </p>
          ) : (
            <p className={cx(p.reading, p.readingEmpty)}>Waiting for your reading</p>
          )}
        </div>

        {view.warning && (
          <p key={frameKey} className={p.warning}>
            <WarningGlyph className={p.glyph} />
            <span className={p.warningWord}>Warning.</span> {view.warning}
          </p>
        )}

        <div className={p.belief}>
          <p className={p.cardLabel}>Most likely</p>
          <ul className={p.beliefList}>
            {view.belief.map((h, i) => (
              <li key={i}>
                <span className={p.beliefLabel}>{h.label}</span>
                <span className={p.mono}>{formatPct(h.p, 0)}</span>
                <span className={p.beliefTrack} aria-hidden="true">
                  <span
                    className={p.beliefFill}
                    style={{ transform: `scaleX(${Math.max(0, Math.min(1, h.p))})` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={p.actions} aria-hidden="true">
          <span className={cx(p.action, p.actionPrimary)}>
            <MicGlyph />
            Say reading
          </span>
          <span className={p.action}>Type reading</span>
        </div>
        <span className={p.homeIndicator} aria-hidden="true" />
      </div>
    </div>
  )
}
