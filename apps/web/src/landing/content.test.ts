import evidenceMd from '@docs/EVIDENCE.md?raw'
import positioningMd from '@docs/POSITIONING.md?raw'
import stabilityMd from '@docs/results/stability_2026-10-25.md?raw'
import mismatchMd from '@docs/results/mismatch_2026-10-25.md?raw'
import { TROPES } from '@/test/copyGuards'
import * as content from './content'

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

  it('takes the forum quote from POSITIONING and the safety line from the footer copy', () => {
    expect(positioningMd).toContain(content.FORUM_QUOTE.text)
    expect(positioningMd).toContain('Not a safety device.')
    expect(content.SAFETY_SCOPE.startsWith('Not a safety device.')).toBe(true)
  })

  it('has no roadmap: no phase list survives in the copy (ADR-0014)', () => {
    expect('PHASES' in content).toBe(false)
    expect('PRIOR_ART' in content).toBe(false)
    expect('DIFFERENCE' in content).toBe(false)
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
      `${publishedWrong}% for a conventional assistant`,
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
    expect(byId.stress!.label).toContain('the lowest score in that run')
  })

  it('leaves the value empty, never invented, when the run file is missing', () => {
    const stats = content.buildValidationStats({})
    for (const st of stats.filter((x) => x.isSimulated)) {
      expect(st.value).toBeNull()
      expect(st.source).toBe('Simulated. Run not recorded yet.')
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

  it('labels every simulated cell briefly: runs and month, never a path or command', () => {
    for (const st of content.VALIDATION_STATS.filter((x) => x.isSimulated)) {
      expect(st.source).toMatch(/^Simulated, [\d,]+ runs, [A-Z][a-z]+ \d{4}$/)
      expect(st.path).toMatch(/^docs\/results\/(stability|mismatch)_\d{4}-\d{2}-\d{2}\.md$/)
    }
    expect(byId.correct!.source).toBe('Simulated, 1,500 runs, October 2026')
    expect(byId.stress!.source).toBe('Simulated, 300 runs, October 2026')
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
