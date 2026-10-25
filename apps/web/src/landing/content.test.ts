import evidenceMd from '@docs/EVIDENCE.md?raw'
import positioningMd from '@docs/POSITIONING.md?raw'
import buildPlanMd from '@docs/BUILD_PLAN.md?raw'
import designMd from '@docs/DESIGN_REFERENCES.md?raw'
import * as content from './content'

const flat = (s: string) => s.replace(/\s+/g, ' ')

describe('landing copy is backed by the docs', () => {
  it('uses the status and product lines verbatim from POSITIONING', () => {
    expect(positioningMd).toContain(content.STATUS_LINE)
    expect(positioningMd).toContain(content.PRODUCT_LINE)
    expect(positioningMd).toContain(content.PROMISE)
  })

  it('quotes each study, its venue and its participant count exactly as EVIDENCE states them', () => {
    for (const s of content.STUDIES) {
      expect(evidenceMd).toContain(s.quote)
      expect(evidenceMd).toContain(s.venue)
      expect(evidenceMd).toContain(s.participantPhrase)
      expect(s.participantPhrase.startsWith(String(s.participants))).toBe(true)
    }
  })

  it('adds the participants up to the total EVIDENCE uses', () => {
    expect(evidenceMd).toContain(`= ${content.TOTAL_PARTICIPANTS} blind participants`)
  })


  it('takes the forum quote, kill result and safety scope from the docs', () => {
    expect(positioningMd).toContain(content.FORUM_QUOTE.text)
    expect(flat(evidenceMd)).toContain(content.KILL_RESULT)
    expect(designMd).toContain(content.SAFETY_SCOPE)
  })

  it('dates phases from BUILD_PLAN, or says the date is not set', () => {
    expect(buildPlanMd).toContain('Oct 26 to Nov 1')
    expect(buildPlanMd).toContain('Oct 26 to Nov 8')
    expect(buildPlanMd).toContain('Nov 23 to Dec 6')
    expect(content.PHASES.map((p) => p.name)).toEqual([
      'Research',
      'Engine',
      'Simulation',
      'User validation',
      'Pilot',
      'Product',
    ])
    expect(content.PHASES.filter((p) => p.state === 'now')).toHaveLength(1)
    const state = Object.fromEntries(content.PHASES.map((p) => [p.name, p.state]))
    expect(state).toMatchObject({
      Research: 'done',
      Engine: 'done',
      Simulation: 'done',
      'User validation': 'now',
    })
  })

  it('names only the partner with permission on file in the simulation scope (rule F21)', () => {
    // Permission to name the Louisiana Center for the Blind is on file (2026-10-25); no address.
    expect(content.SIMULATION_SCOPE).toContain('Louisiana Center for the Blind')
    expect(content.SIMULATION_SCOPE).not.toMatch(/Louisiana Rehabilitation|American Printing House|APH\b|Street|Ruston/)
  })

  it('contains no em-dashes, exclamation marks or banned phrases', () => {
    const all = JSON.stringify(content)
    expect(all).not.toMatch(/—|!|first ever|Get Started|Nexus/i)
  })
})
