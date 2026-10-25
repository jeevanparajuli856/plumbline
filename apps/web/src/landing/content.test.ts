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

  it('names the prior art the way POSITIONING lists it', () => {
    expect(positioningMd).toContain('Gao 2014')
    expect(positioningMd).toContain('IEEE 2019 sequential diagnosis')
    expect(positioningMd).toContain('de Kleer and Williams 1987')
  })

  it('takes the forum quote, kill result and scope sentences from the docs', () => {
    expect(positioningMd).toContain(content.FORUM_QUOTE.text)
    expect(flat(evidenceMd)).toContain(content.KILL_RESULT)
    expect(designMd).toContain(content.SIMULATION_SCOPE)
    expect(designMd).toContain(content.SAFETY_SCOPE)
  })

  it('dates phases from BUILD_PLAN, or says the date is not set', () => {
    expect(buildPlanMd).toContain('Oct 26 to Nov 1')
    expect(buildPlanMd).toContain('Nov 2 to 8')
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
  })

  it('contains no em-dashes, exclamation marks or banned phrases', () => {
    const all = JSON.stringify(content)
    expect(all).not.toMatch(/—|!|first ever|Get Started|Nexus/i)
  })
})
