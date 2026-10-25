import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { SHORTCUTS } from '@/a11y/keymap'
import { CONTACT_EMAIL, MODES, SAFETY_SCOPE } from '@/landing/content'
import { cx } from '@/landing/cx'
import d from '@/landing/docs.module.css'
import s from '@/landing/landing.module.css'
import { MarketingPage } from '@/landing/MarketingPage'
import { Eyebrow } from '@/landing/parts'

const TOC = [
  { id: 'start', label: 'Getting started' },
  { id: 'modes', label: 'Modes' },
  { id: 'voice', label: 'Voice and keyboard' },
  { id: 'install', label: 'Install on your phone' },
  { id: 'pictures', label: 'What the pictures show' },
  { id: 'comparison', label: 'The comparison' },
  { id: 'safety', label: 'Safety' },
  { id: 'privacy', label: 'Privacy' },
] as const

function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={d.section}>
      <h2 id={`${id}-title`} className={d.h2}>
        {title}
      </h2>
      <div className={d.prose}>{children}</div>
    </section>
  )
}

/** Docs: the detail that the product pages leave out, in one place, plain and scannable. */
export function DocsPage() {
  return (
    <MarketingPage>
      <div className={cx(s.frame, d.layout)}>
        <aside className={d.aside}>
          <nav aria-label="On this page" className={d.toc}>
            <p className={d.tocTitle}>On this page</p>
            <ul>
              {TOC.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`}>{t.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className={d.article}>
          <header className={d.header}>
            <Eyebrow>Docs</Eyebrow>
            <h1 id="docs-title" tabIndex={-1} className={cx(s.h2, 'mt-6')}>
              Using Truehand
            </h1>
            <p className={cx(s.lead, 'mt-4')}>
              Everything you need to run it at the bench, in short sections.
            </p>
          </header>

          <DocSection id="start" title="Getting started">
            <ol>
              <li>
                Open <Link to="/sim">the demo</Link> and choose <strong>Live meter</strong> to use
                your own talking meter, or <strong>Replay</strong> to hear a recorded run.
              </li>
              <li>Truehand names one row. Touch the red probe there.</li>
              <li>Say the number your meter reads, or type it and press Enter.</li>
              <li>
                If the number fits another row better, you hear that the probe slipped and which row
                it most likely found. Measure again.
              </li>
              <li>
                When the readings agree, Truehand names the fault. When two faults read the same
                everywhere, it says so and asks for another measurement.
              </li>
            </ol>
          </DocSection>

          <DocSection id="modes" title="Modes">
            <dl className={d.defs}>
              {MODES.map((m) => (
                <div key={m.name}>
                  <dt>
                    {m.name} <span className={d.tag}>{m.tag}</span>
                  </dt>
                  <dd>{m.sentence}</dd>
                </div>
              ))}
            </dl>
          </DocSection>

          <DocSection id="voice" title="Voice and keyboard">
            <p>
              Speech is off until you turn it on with the Speech switch or the V key. Screen-reader
              text is always on, so nothing depends on sound. Say a reading the way the meter speaks
              it, for example &ldquo;three point six seven one&rdquo;.
            </p>
            <p>Single keys work anywhere in the demo except while you are typing in a field.</p>
            <table className={d.table}>
              <thead>
                <tr>
                  <th scope="col">Key</th>
                  <th scope="col">What it does</th>
                </tr>
              </thead>
              <tbody>
                {SHORTCUTS.map((k) => (
                  <tr key={k.action}>
                    <td>
                      <kbd>{k.keys}</kbd>
                    </td>
                    <td>{k.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Theme, text size and motion settings live on the{' '}
              <Link to="/accessibility">Accessibility</Link> page.
            </p>
          </DocSection>

          <DocSection id="install" title="Install on your phone">
            <p>
              <strong>iPhone:</strong> open this site in Safari, tap Share, then Add to Home Screen.
            </p>
            <p>
              <strong>Android:</strong> open it in Chrome, open the menu, then Install app.
            </p>
            <p>
              Installed, Truehand opens full screen with its own icon, and the recorded runs keep
              working without a connection.
            </p>
          </DocSection>

          <DocSection id="pictures" title="What the pictures show">
            <p>
              The 3D bench is for sighted viewers. It shows a breadboard circuit with the red probe
              above it: the told row is outlined, and the row the probe most likely landed on fills
              in after each reading. Everything it shows is also spoken and written in the page
              text.
            </p>
            <p>
              The phones on the home page play recorded runs with a simulated hand. They are labeled
              &ldquo;Simulated run&rdquo; on screen.
            </p>
          </DocSection>

          <DocSection id="comparison" title="The comparison">
            <p>
              Beside Truehand, the demo runs a conventional assistant on the same readings: the
              published test-selection method that assumes the probe is exactly where you were told
              (Gao et al., 2014). It sees the same numbers and never learns where the hand really
              went, so a slipped probe can send it to the wrong fault.
            </p>
            <p>
              Results and how they were produced are on the{' '}
              <Link to="/evidence">Evidence</Link> page.
            </p>
          </DocSection>

          <DocSection id="safety" title="Safety">
            <p>{SAFETY_SCOPE}</p>
          </DocSection>

          <DocSection id="privacy" title="Privacy">
            <ul>
              <li>No accounts, no sign-in, no tracking and no analytics.</li>
              <li>Your settings are saved in this browser only.</li>
              <li>
                Readings go to the Truehand engine only to work out the next step. Sessions are held
                in memory, never written to a database, and expire once they sit idle.
              </li>
              <li>
                Speech recognition is provided by your browser. Some browsers send audio to their
                own speech service; typing a reading avoids that.
              </li>
            </ul>
            <p>
              Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </DocSection>
        </article>
      </div>
    </MarketingPage>
  )
}
