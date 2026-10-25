import { useRef } from 'react'
import LandingMotion from '../index'
import { HEADLINE, QUOTE } from './content'

interface FixtureProps {
  stages?: string | undefined
  withMotion?: boolean
}

/** Every hook from UI_CONTRACT 5.3. The edge cell column sits outside <main>, fixed to the page edge as on the page. */
export function Fixture({ stages = '0.031,1,0.42', withMotion = true }: FixtureProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  return (
    <>
      <main ref={rootRef}>
        <h1 data-motion="headline">{HEADLINE}</h1>
        <blockquote data-motion="quote">{QUOTE}</blockquote>
        <section id="play">
          <div data-motion="bars">
            <span
              data-motion-bar="published"
              data-motion-stages="0.031,1,1"
              style={{ transform: 'scaleX(1)' }}
            />
            <span
              data-motion-bar="ours"
              data-motion-stages={stages}
              style={{ transform: 'scaleX(0.42)' }}
            />
            <span data-motion-stage-label="0" style={{ opacity: 0 }}>
              Before any reading
            </span>
            <span data-motion-stage-label="2">After reading 2</span>
          </div>
        </section>
        <ul data-motion="rows">
          <li>Circuit</li>
          <li>Thermometer</li>
        </ul>
        <p>
          <span
            data-motion="stat"
            aria-hidden="true"
            data-motion-value="94.2"
            data-motion-decimals="1"
            data-motion-suffix="%"
          >
            94.2%
          </span>
          <span className="sr-only">94.2%</span>
        </p>
        <section data-motion="reveal">
          <p>
            Up block with <a href="#play">a link</a>
          </p>
        </section>
        <div data-motion="reveal" data-motion-reveal="mask">
          Mask block
        </div>
        <ul data-motion="reveal" data-motion-reveal="stagger">
          <li data-motion-item>First</li>
          <li data-motion-item>Second</li>
          <li data-motion-item>Third</li>
        </ul>
        <section id="app">
          <div data-testid="device-parent">
            <div data-motion="device">
              <div data-testid="screen">Screen</div>
            </div>
          </div>
        </section>
        <div data-motion="parallax" data-motion-depth="0.2" data-testid="layer" />
        <div data-motion="parallax" data-motion-depth="nope" data-testid="flat-layer" />
        <img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width={1} height={1} />
      </main>
      <div data-motion="plumb" aria-hidden="true">
        <span data-motion-string>
          <span />
          <span />
          <span />
          <span />
        </span>
        <span data-motion-bob />
      </div>
      {withMotion && <LandingMotion rootRef={rootRef} />}
    </>
  )
}
