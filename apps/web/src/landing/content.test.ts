import evidenceMd from '@docs/EVIDENCE.md?raw'
import positioningMd from '@docs/POSITIONING.md?raw'
import buildPlanMd from '@docs/BUILD_PLAN.md?raw'
import designMd from '@docs/DESIGN_REFERENCES.md?raw'
import stabilityMd from '@docs/results/stability_2026-10-25.md?raw'
import mismatchMd from '@docs/results/mismatch_2026-10-25.md?raw'
import { act, render } from '@testing-library/react'
import { createElement } from 'react'
import { MemoryRouter } from 'react-router'
import * as content from './content'
import { LandingPage } from './LandingPage'

vi.mock('@/lib/webgl', () => ({ webglSupported: () => false }))

const flat = (s: string) => s.replace(/\s+/g, ' ')

describe('landing copy is backed by the docs', () => {
  it('uses the status and product lines verbatim from POSITIONING', () => {
    expect(positioningMd).toContain(content.STATUS_LINE)
    expect(positioningMd).toContain(content.PRODUCT_LINE)
    expect(positioningMd).toContain(content.PROMISE)
  })

  it('takes the brand idea, the found line and the contact address from POSITIONING', () => {
    const plain = flat(positioningMd).replace(/\*\*/g, '')
    const idea = content.BRAND_IDEA.charAt(0).toLowerCase() + content.BRAND_IDEA.slice(1)
    expect(plain).toContain(idea)
    expect(positioningMd).toContain(content.FOUND_LINE)
    expect(positioningMd).toContain(content.CONTACT_EMAIL)
    expect(content.FOUND_LINE).not.toMatch(/knows/)
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
    expect(content.SIMULATION_SCOPE).not.toMatch(
      /Louisiana Rehabilitation|American Printing House|APH\b|Street|Ruston/,
    )
  })

  it('contains no em-dashes, exclamation marks or banned phrases', () => {
    const all = JSON.stringify(content)
    expect(all).not.toMatch(/—|!|first ever|Get Started|Nexus/i)
  })
})

describe('validation stats are read from docs/results', () => {
  const byId = Object.fromEntries(content.VALIDATION_STATS.map((st) => [st.id, st]))

  it('has four cells, exactly one of them waiting on user validation, and every simulated cell has its number', () => {
    expect(content.VALIDATION_STATS).toHaveLength(4)
    const pending = content.VALIDATION_STATS.filter((st) => !st.isSimulated)
    expect(pending.map((st) => st.id)).toEqual(['real-hands'])
    expect(pending[0]!.label).toContain('No participant results yet.')
    for (const st of content.VALIDATION_STATS.filter((x) => x.isSimulated)) {
      expect(st.value).not.toBeNull()
    }
  })

  it('takes the stability numbers from the truehand and published-method rows of the newest run', () => {
    const cells = (method: string) =>
      stabilityMd
        .split('\n')
        .find((l) => l.startsWith(`| ${method} |`))!
        .split('|')
        .map((c) => c.trim())
    // Columns: Method, Faults, Correct, Resolved correct, Confidently wrong, ...
    const ours = cells('truehand')
    const published = cells('entropy_exact')
    expect(ours[3]).toMatch(new RegExp(`^${byId.correct!.value!.toFixed(1)} ±`))
    expect(ours[5]).toMatch(new RegExp(`^${byId['confidently-wrong']!.value!.toFixed(1)} ±`))
    const publishedWrong = published[5]!.split(' ')[0]
    expect(byId['confidently-wrong']!.label).toContain(
      `${publishedWrong}% for the published method`,
    )
  })

  it('takes the stress cell from the lowest-scoring scenario of the newest mismatch run', () => {
    const scores = mismatchMd
      .split('\n## ')
      .slice(1)
      .map((sec) => {
        const row = sec.split('\n').find((l) => l.startsWith('| truehand |'))!
        return { name: sec.split('\n')[0]!.trim(), correct: Number(row.split('|')[3]!.trim()) }
      })
    const worst = scores.reduce((a, b) => (a.correct <= b.correct ? a : b))
    expect(byId.stress!.value).toBe(worst.correct)
    expect(byId.stress!.source).toContain(`${worst.name.replace(/_/g, ' ')} scenario`)
    expect(byId.stress!.label).toContain('the lowest score in that run')
  })

  it('leaves the value empty, never invented, when the run file is missing', () => {
    const stats = content.buildValidationStats({})
    for (const st of stats.filter((x) => x.isSimulated)) {
      expect(st.value).toBeNull()
      expect(st.source).toBe('Run file missing.')
      expect(st.path).toMatch(/^docs\/results\//)
    }
  })

  it('leaves the value empty and drops the stray percent when a row is missing', () => {
    const noRows = stabilityMd
      .split('\n')
      .filter((l) => !l.startsWith('| truehand |') && !l.startsWith('| entropy_exact |'))
      .join('\n')
    const stats = content.buildValidationStats({ '/x/results/stability_2026-10-25.md': noRows })
    const wrong = stats.find((st) => st.id === 'confidently-wrong')!
    expect(wrong.value).toBeNull()
    expect(wrong.label).not.toMatch(/\s%|undefined|null/)
    expect(wrong.label).toContain('not recorded')
  })

  it('names the file, the run date and the seeds and faults on every simulated cell', () => {
    for (const st of content.VALIDATION_STATS.filter((x) => x.isSimulated)) {
      expect(st.source).toMatch(
        /^docs\/results\/(stability|mismatch)_\d{4}-\d{2}-\d{2}\.md, run \d{4}-\d{2}-\d{2}, /,
      )
      expect(st.source).toMatch(/\d+ seeds? x \d+ faults\. Simulated\.$/)
    }
    expect(byId.correct!.source).toContain('5 seeds x 300 faults')
    expect(byId.stress!.source).toContain('1 seed x 300 faults')
  })

  it('picks the newest dated file and parses leading numbers', () => {
    const files = {
      '/x/results/stability_2026-10-01.md': 'old',
      '/x/results/stability_2026-11-02.md': '- Generated: 2026-11-02T00:00\n',
    }
    expect(content.latestResult(files, 'stability')).toEqual({
      path: 'docs/results/stability_2026-11-02.md',
      markdown: files['/x/results/stability_2026-11-02.md'],
      generated: '2026-11-02',
    })
    expect(content.latestResult(files, 'sweep')).toBeNull()
    expect(content.leadingNumber('99.5 ± 0.4')).toBe(99.5)
    expect(content.leadingNumber('n/a')).toBeNull()
  })
})

/** Copy tropes from docs/POSITIONING.md section 4.3, checked on our strings and the rendered page. */
const TROPES: ReadonlyArray<readonly [string, RegExp]> = [
  ['em-dash', /\u2014/],
  ['emoji', /\p{Extended_Pictographic}/u],
  ['exclamation mark', /!/],
  ["it's not X, it's Y", /\bit(?:'|\u2019)?s not\b[^.]{0,60}[,;]\s*it(?:'|\u2019)?s\b/i],
  ['not just', /\bnot just\b/i],
  [
    'buzzword',
    /\b(revolutionary|game-changing|seamless(?:ly)?|cutting-edge|next-gen|unlock|empower|supercharge|leverage|synergy|world-class|effortless(?:ly)?)\b/i,
  ],
]

function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(stringsIn)
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsIn)
  return []
}

describe('copy tropes', () => {
  it('none appears in any content.ts string', () => {
    const all = stringsIn({ ...content })
    expect(all.length).toBeGreaterThan(20)
    for (const text of all) {
      for (const [name, re] of TROPES)
        expect({ name, text, hit: re.test(text) }).toMatchObject({ hit: false })
    }
  })

  it('none appears in the rendered landing text', async () => {
    const { container } = render(createElement(MemoryRouter, null, createElement(LandingPage)))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    const text = container.textContent ?? ''
    expect(text.length).toBeGreaterThan(2000)
    for (const [name, re] of TROPES)
      expect({ name, hit: re.exec(text)?.[0] ?? null }).toEqual({ name, hit: null })
  })

  it('the trope patterns catch what they are meant to catch', () => {
    const samples = [
      'a \u2014 b',
      'ok \u{1F680}',
      'Wow!',
      "It's not a meter, it's a partner",
      'not just a tool',
      'Unlock insight',
    ]
    samples.forEach((sample, i) => expect(TROPES[i]![1].test(sample)).toBe(true))
  })
})
