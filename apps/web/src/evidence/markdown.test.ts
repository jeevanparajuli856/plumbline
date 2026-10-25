import { describe, expect, it } from 'vitest'
import evidenceMd from '@docs/EVIDENCE.md?raw'
import {
  overallStatus,
  parseEvidence,
  parseInline,
  parseNumberedList,
  parseParagraphs,
  parseStatus,
  parseTable,
  section,
  splitRow,
} from './markdown'

const md = `# Title

## 1. Readiness table

| Item | Status | Evidence |
| ---- | :----: | -------- |
| Engine \`a\` | IN PROGRESS | \`uv run pytest\`; see https://example.org/x. |
| Voltages | scratch DONE, engine PENDING | file \`engine/tests/test_circuit.py\` |

## 2. Cited studies

Intro line.

1. First study, arXiv 2602.18623, February 2026.
2. Second study
   continues here.

Forum sources quoted.
More of the same paragraph.

## 3. Next
`

describe('section', () => {
  it('returns the body under a numbered heading up to the next h2', () => {
    const body = section(md, '1')
    expect(body).toContain('| Item |')
    expect(body).not.toContain('Cited studies')
    expect(section(md, '9')).toBe('')
  })
})

describe('parseTable', () => {
  it('reads header and rows and skips the separator line', () => {
    const table = parseTable(section(md, '1'))
    expect(table.header).toEqual(['Item', 'Status', 'Evidence'])
    expect(table.rows).toHaveLength(2)
    expect(table.rows[1]).toEqual([
      'Voltages',
      'scratch DONE, engine PENDING',
      'file `engine/tests/test_circuit.py`',
    ])
  })

  it('keeps escaped pipes inside a cell', () => {
    expect(splitRow('| a \\| b | c |')).toEqual(['a | b', 'c'])
  })

  it('returns an empty table when there is none', () => {
    expect(parseTable('no table here')).toEqual({ header: [], rows: [] })
  })
})

describe('parseStatus', () => {
  it('reads plain and qualified statuses', () => {
    expect(parseStatus('PENDING')).toEqual([{ qualifier: '', status: 'PENDING' }])
    expect(parseStatus('IN PROGRESS')).toEqual([{ qualifier: '', status: 'IN PROGRESS' }])
    expect(parseStatus('scratch DONE, engine PENDING')).toEqual([
      { qualifier: 'scratch', status: 'DONE' },
      { qualifier: 'engine', status: 'PENDING' },
    ])
    expect(parseStatus('SIMULATED')).toEqual([{ qualifier: '', status: 'SIMULATED' }])
  })

  it('treats unknown text as PENDING so nothing reads as done by accident', () => {
    expect(parseStatus('maybe')).toEqual([{ qualifier: 'maybe', status: 'PENDING' }])
  })

  it('overallStatus is the least finished part', () => {
    expect(overallStatus(parseStatus('scratch DONE, engine PENDING'))).toBe('PENDING')
    expect(overallStatus(parseStatus('DONE'))).toBe('DONE')
    expect(overallStatus(parseStatus('DONE, IN PROGRESS'))).toBe('IN PROGRESS')
  })
})

describe('parseInline', () => {
  it('splits code spans, URLs and text, trimming trailing punctuation from links', () => {
    expect(parseInline('`uv run pytest`; see https://example.org/x. Then **bold**')).toEqual([
      { kind: 'code', text: 'uv run pytest' },
      { kind: 'text', text: '; see ' },
      { kind: 'link', href: 'https://example.org/x', text: 'https://example.org/x' },
      { kind: 'text', text: '. Then bold' },
    ])
  })

  it('links arXiv identifiers to their abstract pages', () => {
    expect(parseInline('Stony Brook, arXiv 2602.18623, 2026')).toEqual([
      { kind: 'text', text: 'Stony Brook, ' },
      { kind: 'link', href: 'https://arxiv.org/abs/2602.18623', text: 'arXiv 2602.18623' },
      { kind: 'text', text: ', 2026' },
    ])
  })

  it('never links a URL inside code', () => {
    expect(parseInline('`https://x.org`')).toEqual([{ kind: 'code', text: 'https://x.org' }])
  })
})

describe('lists and paragraphs', () => {
  it('joins continuation lines into numbered items', () => {
    expect(parseNumberedList(section(md, '2'))).toEqual([
      'First study, arXiv 2602.18623, February 2026.',
      'Second study continues here.',
    ])
  })

  it('collects the paragraphs that are not list items', () => {
    expect(parseParagraphs(section(md, '2'))).toEqual([
      'Intro line.',
      'Forum sources quoted. More of the same paragraph.',
    ])
  })
})

describe('parseEvidence on the real docs/EVIDENCE.md', () => {
  const evidence = parseEvidence(evidenceMd)

  it('renders every readiness row and never drops a PENDING one', () => {
    const tableLines = section(evidenceMd, '1')
      .split('\n')
      .filter((l) => l.trim().startsWith('|'))
    expect(evidence.readiness.length).toBe(tableLines.length - 2)
    const pending = evidence.readiness.filter((r) => overallStatus(r.statuses) === 'PENDING')
    expect(pending.length).toBeGreaterThan(5)
  })

  it('finds the cited studies and the statistics table with links', () => {
    expect(evidence.studies.length).toBe(5)
    expect(evidence.statistics.length).toBeGreaterThan(0)
    expect(evidence.statistics.every((s) => s.source.some((part) => part.kind === 'link'))).toBe(
      true,
    )
  })
})

describe('summary', () => {
  it('counts rows by their least finished status and lists experiment commands once', async () => {
    const { experimentCommands, statusCounts } = await import('./summary')
    const ev = parseEvidence(evidenceMd)
    const counts = statusCounts(ev)
    expect(counts.DONE + counts['IN PROGRESS'] + counts.PENDING + counts.SIMULATED).toBe(
      ev.readiness.length,
    )
    const commands = experimentCommands(ev)
    expect(commands).toContain('python -m plumbline.experiments.stability')
    expect(new Set(commands).size).toBe(commands.length)
  })
})

describe('withholdBriefExpectations', () => {
  it('drops the brief expectation clauses the evidence file says never reach the UI', async () => {
    const { withholdBriefExpectations } = await import('./markdown')
    expect(
      withholdBriefExpectations('Scratch: R3 63.1%; brief expected 63.5 / 97.6 / 100.0'),
    ).toEqual({
      text: 'Scratch: R3 63.1%',
      withheld: true,
    })
    expect(
      withholdBriefExpectations(
        '`cmd`. Brief expectation: 99.0 +/- 0.4% correct, vs 78.7 / 21.2; warnings 176 of 178 correct. Not our numbers until this command has run here',
      ),
    ).toEqual({ text: '`cmd`.', withheld: true })
    expect(withholdBriefExpectations('plain evidence')).toEqual({
      text: 'plain evidence',
      withheld: false,
    })
  })

  it('leaves no brief figure in the parsed real file', () => {
    const text = JSON.stringify(parseEvidence(evidenceMd).readiness)
    for (const figure of ['99.0', '21.2', '176 of 178', '63.5', 'past 35%'])
      expect(text).not.toContain(figure)
    expect(text).toContain('63.1%')
  })
})

describe('DONE needs proof', () => {
  it('downgrades DONE to PENDING when the evidence has no command, file, link or date', async () => {
    const { parseEvidence: parse } = await import('./markdown')
    const md = `## 1. Readiness table

| Item | Status | Evidence |
| --- | --- | --- |
| Claimed | DONE | we think so |
| Proven by code | DONE | \`pytest -q\` |
| Proven by date | DONE | run on 2026-10-25 |
| Proven by link | DONE | https://example.org/run |
`
    const rows = parse(md).readiness
    expect(rows.map((r) => r.statuses[0]?.status)).toEqual(['PENDING', 'DONE', 'DONE', 'DONE'])
    expect(rows[0]?.unproven).toBe(true)
  })

  it('keeps the proven scratch DONE in the real file', () => {
    const row = parseEvidence(evidenceMd).readiness.find((r) =>
      r.statusText.includes('scratch DONE'),
    )
    expect(row?.statuses).toEqual([
      { qualifier: 'scratch', status: 'DONE' },
      { qualifier: 'engine', status: 'PENDING' },
    ])
    expect(row?.unproven).toBe(false)
  })
})
